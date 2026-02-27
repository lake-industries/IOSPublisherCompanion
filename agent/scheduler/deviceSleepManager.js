/**
 * Device Sleep Manager
 * 
 * Manages OS-level sleep/wake scheduling for maximum energy efficiency.
 * 
 * Features:
 * - Automatically sleep when no tasks are queued
 * - Auto-wake during delegation hours
 * - Track sleep/wake schedule
 * - Monitor task queue before sleeping
 * - Graceful wake-up transitions
 */

import pino from 'pino';
import { execSync, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class DeviceSleepManager {
  constructor(sharedMemory, taskQueue) {
    this.memory = sharedMemory;
    this.taskQueue = taskQueue;

    this.config = {
      enableAutoSleep: true,
      sleepAfterIdleMinutes: 15, // Sleep if idle for 15+ minutes with no queued tasks
      wakeUpBuffer: 10, // Wake up 10 minutes before next delegation window
      allowWakefulInterrupts: true, // Wake if critical task arrives
      enableTemperatureSleep: true, // Sleep to cool device
      criticalTempThreshold: 75 // Sleep if > 75°C
    };

    this.state = {
      isSleeping: false,
      lastActivityTime: Date.now(),
      lastWakeTime: null,
      sleepStart: null,
      scheduledWakeTime: null
    };

    this.platform = process.platform; // 'win32', 'darwin', 'linux'
    this.wakeTimers = [];
  }

  /**
   * Check if device should sleep
   * Returns: { shouldSleep, reason, optimalWakeTime }
   */
  async shouldDeviceSleep() {
    if (!this.config.enableAutoSleep) {
      return { shouldSleep: false, reason: 'Auto-sleep disabled' };
    }

    // 1. Check if tasks are queued
    const queuedTasks = await this.getQueuedTaskCount();
    if (queuedTasks > 0) {
      return { shouldSleep: false, reason: `${queuedTasks} tasks queued` };
    }

    // 2. Check if system was recently active
    const idleMinutes = (Date.now() - this.state.lastActivityTime) / 60000;
    if (idleMinutes < this.config.sleepAfterIdleMinutes) {
      return {
        shouldSleep: false,
        reason: `System recently active (${Math.round(idleMinutes)} min idle)`,
        minutesUntilSleep: this.config.sleepAfterIdleMinutes - idleMinutes
      };
    }

    // 3. Check if delegation hours approaching (don't sleep if wake soon)
    const nextDelegationWindow = await this.getNextDelegationWindow();
    if (nextDelegationWindow) {
      const minutesUntilWindow = nextDelegationWindow.minutesUntil;
      if (minutesUntilWindow < this.config.wakeUpBuffer) {
        return {
          shouldSleep: false,
          reason: `Next delegation window soon (${Math.round(minutesUntilWindow)} min)`,
          nextWindow: nextDelegationWindow
        };
      }
    }

    return {
      shouldSleep: true,
      reason: 'No queued tasks, idle long enough, no near-term delegation windows',
      optimalWakeTime: nextDelegationWindow?.startTime
    };
  }

  /**
   * Initiate device sleep
   * Schedules automatic wake-up for next delegation window
   */
  async initiateDeviceSleep(reason = 'idle') {
    if (this.state.isSleeping) {
      logger.info('Already sleeping, ignoring sleep request');
      return;
    }

    try {
      // 1. Get next delegation window
      const nextWindow = await this.getNextDelegationWindow();
      const wakeTime = nextWindow
        ? new Date(nextWindow.startTime.getTime() - this.config.wakeUpBuffer * 60000)
        : null;

      // 2. Record sleep event
      await this.memory.run(
        `INSERT INTO sleep_schedule (id, sleep_start, scheduled_wake, reason, duration_target)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          new Date().toISOString(),
          wakeTime ? wakeTime.toISOString() : null,
          reason,
          wakeTime ? Math.round((wakeTime.getTime() - Date.now()) / 60000) : null
        ]
      );

      // 3. Update device status
      await this.updateDeviceStatus('sleeping', { reason, wakeTime });

      // 4. Schedule wake-up
      if (wakeTime) {
        this.scheduleAutoWake(wakeTime);
        logger.info(`💤 Device sleeping until ${wakeTime.toLocaleTimeString()}`, {
          reason,
          nextDelegationWindow: nextWindow?.description
        });
      } else {
        logger.info(`💤 Device sleeping (no wake scheduled)`, { reason });
      }

      // 5. Initiate OS-level sleep
      await this.triggerOSSleep();

      this.state.isSleeping = true;
      this.state.sleepStart = Date.now();

    } catch (error) {
      logger.error(`Failed to initiate sleep: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger OS-level sleep command
   */
  async triggerOSSleep() {
    try {
      if (this.platform === 'win32') {
        // Windows: powercfg /sleep or rundll32 powrprof.dll,SetSuspendState
        execSync('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', {
          stdio: 'ignore'
        });
        logger.info('OS sleep: Windows sleep initiated');
      } else if (this.platform === 'darwin') {
        // macOS: pmset sleepnow
        execSync('pmset sleepnow', { stdio: 'ignore' });
        logger.info('OS sleep: macOS sleep initiated');
      } else if (this.platform === 'linux') {
        // Linux: systemctl suspend or pm-suspend
        try {
          execSync('systemctl suspend', { stdio: 'ignore' });
          logger.info('OS sleep: Linux systemctl suspend');
        } catch (e) {
          execSync('pm-suspend', { stdio: 'ignore' });
          logger.info('OS sleep: Linux pm-suspend');
        }
      }
    } catch (error) {
      logger.warn(`OS sleep command failed: ${error.message}`);
      // Not critical - system might not support sleep
    }
  }

  /**
   * Wake device from sleep
   */
  async wakeDevice(reason = 'scheduled') {
    if (!this.state.isSleeping) {
      return;
    }

    try {
      const sleepDuration = Date.now() - this.state.sleepStart;

      // Update database
      await this.memory.run(
        `UPDATE sleep_schedule 
         SET actual_wake = ?, actual_sleep_duration = ?
         WHERE sleep_start = ?`,
        [
          new Date().toISOString(),
          Math.round(sleepDuration / 60000), // minutes
          new Date(this.state.sleepStart).toISOString()
        ]
      );

      // Update status
      await this.updateDeviceStatus('awake', { reason });

      this.state.isSleeping = false;
      this.state.lastWakeTime = Date.now();
      this.state.lastActivityTime = Date.now();

      logger.info(`⏰ Device awakened`, {
        reason,
        sleptFor: `${Math.round(sleepDuration / 60000)} minutes`
      });

      return {
        wakeReason: reason,
        sleptFor: Math.round(sleepDuration / 60000),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to wake device: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule automatic wake-up
   */
  scheduleAutoWake(wakeTime) {
    // Clear existing timers
    this.wakeTimers.forEach(timer => clearTimeout(timer));
    this.wakeTimers = [];

    const timeUntilWake = wakeTime.getTime() - Date.now();

    if (timeUntilWake <= 0) {
      logger.warn('Wake time is in the past, waking immediately');
      this.wakeDevice('scheduled').catch(err =>
        logger.error(`Auto-wake failed: ${err.message}`)
      );
      return;
    }

    // Schedule wake
    const wakeTimer = setTimeout(() => {
      logger.info(`🔔 Auto-wake timer triggered for ${wakeTime.toLocaleTimeString()}`);
      this.wakeDevice('scheduled').catch(err =>
        logger.error(`Auto-wake failed: ${err.message}`)
      );
    }, timeUntilWake);

    this.wakeTimers.push(wakeTimer);
    this.state.scheduledWakeTime = wakeTime;

    logger.debug(`Auto-wake scheduled for ${wakeTime.toLocaleTimeString()}`);
  }

  /**
   * Handle task arrival (might wake device)
   */
  async handleTaskArrival(task) {
    // If sleeping and task is critical, wake immediately
    if (this.state.isSleeping) {
      if (task.urgency === 'critical' || task.urgency === 'high') {
        logger.info(`⚡ Critical/high task arrived, waking device`, {
          taskId: task.id,
          urgency: task.urgency
        });
        await this.wakeDevice('critical_task_arrival');
        this.state.lastActivityTime = Date.now(); // Reset idle timer
      } else if (this.config.allowWakefulInterrupts) {
        // Normal priority task can also wake
        logger.info(`📩 Task arrived, waking device`, {
          taskId: task.id,
          urgency: task.urgency
        });
        await this.wakeDevice('task_arrival');
        this.state.lastActivityTime = Date.now();
      }
    }

    // Update activity time
    this.recordActivity('task_arrival');
  }

  /**
   * Record device activity (resets idle timer)
   */
  recordActivity(activityType = 'user_activity') {
    this.state.lastActivityTime = Date.now();
    logger.debug(`Activity recorded: ${activityType}`);
  }

  /**
   * Get count of queued tasks (implementation depends on task queue)
   */
  async getQueuedTaskCount() {
    try {
      // This depends on your task queue implementation
      // If using Bull + Redis:
      if (this.taskQueue && typeof this.taskQueue.getQueueStatus === 'function') {
        const status = await this.taskQueue.getQueueStatus();
        return status.pending || 0;
      }

      // Fallback: query database
      const result = await this.memory.get(
        `SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'queued')`
      );

      return result?.count || 0;
    } catch (error) {
      logger.debug(`Failed to get queue count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get next delegation window
   */
  async getNextDelegationWindow() {
    try {
      // This would query user's delegation_hours and find next valid window
      // For now, return null (would be implemented in scheduler integration)
      return null;
    } catch (error) {
      logger.debug(`Failed to get next delegation window: ${error.message}`);
      return null;
    }
  }

  /**
   * Update device status in database
   */
  async updateDeviceStatus(status, metadata = {}) {
    try {
      await this.memory.run(
        `INSERT OR REPLACE INTO device_status (id, status, timestamp, metadata)
         VALUES (?, ?, ?, ?)`,
        [
          'device-main', // Single status record per device
          status,
          new Date().toISOString(),
          JSON.stringify(metadata)
        ]
      );
    } catch (error) {
      logger.debug(`Failed to update device status: ${error.message}`);
    }
  }

  /**
   * Get current device status
   */
  async getDeviceStatus() {
    try {
      const status = await this.memory.get(
        `SELECT status, timestamp, metadata FROM device_status WHERE id = 'device-main'`
      );
      return status || {
        status: 'unknown',
        timestamp: null,
        isSleeping: this.state.isSleeping
      };
    } catch (error) {
      logger.debug(`Failed to get device status: ${error.message}`);
      return { status: 'unknown', isSleeping: this.state.isSleeping };
    }
  }

  /**
   * Get sleep history
   */
  async getSleepHistory(days = 7) {
    try {
      const history = await this.memory.all(
        `SELECT * FROM sleep_schedule 
         WHERE sleep_start > datetime('now', '-' || ? || ' days')
         ORDER BY sleep_start DESC`,
        [days]
      );
      return history || [];
    } catch (error) {
      logger.warn(`Failed to retrieve sleep history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get sleep statistics
   */
  async getSleepStats(days = 7) {
    try {
      const stats = await this.memory.get(
        `SELECT 
          COUNT(*) as total_sleep_events,
          SUM(actual_sleep_duration) as total_sleep_minutes,
          AVG(actual_sleep_duration) as avg_sleep_minutes,
          MAX(actual_sleep_duration) as max_sleep_minutes,
          MIN(actual_sleep_duration) as min_sleep_minutes
         FROM sleep_schedule 
         WHERE sleep_start > datetime('now', '-' || ? || ' days')`,
        [days]
      );

      return stats || {
        total_sleep_events: 0,
        total_sleep_minutes: 0,
        avg_sleep_minutes: 0,
        max_sleep_minutes: 0,
        min_sleep_minutes: 0
      };
    } catch (error) {
      logger.warn(`Failed to calculate sleep stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Configure sleep settings
   */
  configureSettings(newSettings) {
    this.config = { ...this.config, ...newSettings };
    logger.info('Sleep manager settings updated', { config: this.config });
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    this.wakeTimers.forEach(timer => clearTimeout(timer));
    this.wakeTimers = [];
    logger.info('Sleep manager shutdown');
  }
}

export default DeviceSleepManager;
