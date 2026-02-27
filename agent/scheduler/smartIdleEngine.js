/**
 * Smart Idle Engine
 * 
 * Coordinates between:
 * - Task queue status
 * - Thermal conditions
 * - Device sleep capability
 * - User preferences
 * 
 * Makes intelligent decisions about:
 * ACCEPT → Execute task immediately
 * DEFER → Wait for better conditions
 * SLEEP → Put device in sleep mode
 * IDLE → Keep system running but not accepting tasks
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class SmartIdleEngine {
  constructor(sharedMemory, thermalMonitor, sleepManager, ecoScheduler) {
    this.memory = sharedMemory;
    this.thermal = thermalMonitor;
    this.sleep = sleepManager;
    this.scheduler = ecoScheduler;

    this.config = {
      prioritizeEnergySavings: true,
      enableSmartSleep: true,
      enableThermalManagement: true
    };

    this.decisionHistory = [];
  }

  /**
   * Make decision on task execution
   * Returns: { action, reason, timestamp, metadata }
   * 
   * action = 'ACCEPT' | 'DEFER' | 'SLEEP' | 'IDLE'
   */
  async makeDecision(task, userId) {
    const decision = {
      taskId: task.id,
      userId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // 1. Check thermal conditions
      const thermalCheck = await this.checkThermalConditions(task);
      decision.checks.thermal = thermalCheck;

      if (thermalCheck.action === 'SLEEP') {
        return {
          action: 'SLEEP',
          reason: `Critical temperature: ${thermalCheck.reason}`,
          metadata: thermalCheck
        };
      }

      if (thermalCheck.action === 'DEFER') {
        return {
          action: 'DEFER',
          reason: `Thermal condition: ${thermalCheck.reason}`,
          metadata: thermalCheck,
          retryAfter: thermalCheck.minutesUntilReady
        };
      }

      // 2. Check user preferences
      const userCheck = await this.checkUserPreferences(userId);
      decision.checks.userPreferences = userCheck;

      if (userCheck.action === 'DEFER' && task.urgency !== 'critical') {
        return {
          action: 'DEFER',
          reason: `User preference: ${userCheck.reason}`,
          metadata: userCheck
        };
      }

      // 3. Check energy conditions
      const energyCheck = await this.checkEnergyConditions(task);
      decision.checks.energy = energyCheck;

      if (energyCheck.action === 'DEFER' && task.urgency !== 'high') {
        return {
          action: 'DEFER',
          reason: `Energy condition: ${energyCheck.reason}`,
          metadata: energyCheck,
          nextCleanWindow: energyCheck.nextCleanWindow
        };
      }

      // 4. Check queue status
      const queueCheck = await this.checkQueueStatus();
      decision.checks.queue = queueCheck;

      // 5. Make final decision
      return await this.makeFinalDecision(task, userId, decision.checks);

    } catch (error) {
      logger.error(`Decision engine error: ${error.message}`);
      return {
        action: 'ACCEPT',
        reason: 'Error in decision logic, defaulting to accept',
        error: error.message
      };
    }
  }

  /**
   * Check if thermal conditions allow task execution
   */
  async checkThermalConditions(task) {
    if (!this.config.enableThermalManagement || !this.thermal) {
      return { action: 'ALLOW', reason: 'Thermal management disabled' };
    }

    try {
      const thermalRec = await this.thermal.getThermalRecommendation();

      if (thermalRec.status === 'critical') {
        return {
          action: 'SLEEP',
          reason: `CPU at ${thermalRec.currentTemp}°C (critical)`,
          currentTemp: thermalRec.currentTemp,
          minutesUntilReady: thermalRec.minutesUntilReady
        };
      }

      if (thermalRec.status === 'warning') {
        return {
          action: 'DEFER',
          reason: `CPU at ${thermalRec.currentTemp}°C (warning)`,
          currentTemp: thermalRec.currentTemp,
          minutesUntilReady: thermalRec.minutesUntilReady
        };
      }

      if (thermalRec.status === 'elevated' && task.estimatedPowerWatts > 50) {
        // Don't run power-hungry tasks when warm
        return {
          action: 'DEFER',
          reason: `CPU elevated (${thermalRec.currentTemp}°C), task is power-intensive (${task.estimatedPowerWatts}W)`,
          currentTemp: thermalRec.currentTemp,
          minutesUntilReady: thermalRec.minutesUntilReady
        };
      }

      return { action: 'ALLOW', reason: 'Temperature OK', temp: thermalRec.currentTemp };

    } catch (error) {
      logger.debug(`Thermal check failed: ${error.message}`);
      return { action: 'ALLOW', reason: 'Thermal check unavailable' };
    }
  }

  /**
   * Check user preferences and constraints
   */
  async checkUserPreferences(userId) {
    try {
      // Check delegation hours
      const delegationCheck = await this.scheduler.isWithinDelegationHours(userId);
      if (!delegationCheck.allowed) {
        return {
          action: 'DEFER',
          reason: delegationCheck.reason,
          nextWindowStart: delegationCheck.nextWindowStart
        };
      }

      // Check idle period
      const idleOk = await this.scheduler.isWithinIdlePeriod(userId);
      if (!idleOk) {
        return {
          action: 'DEFER',
          reason: 'System idle period active',
          idleUntil: await this.getIdleUntilTime(userId)
        };
      }

      return { action: 'ALLOW', reason: 'User preferences OK' };

    } catch (error) {
      logger.debug(`User preference check failed: ${error.message}`);
      return { action: 'ALLOW', reason: 'User check unavailable' };
    }
  }

  /**
   * Check energy conditions
   */
  async checkEnergyConditions(task) {
    try {
      if (!this.scheduler.renewable) {
        return { action: 'ALLOW', reason: 'Energy check unavailable' };
      }

      const energyScore = await this.scheduler.renewable.getEnergyScore();

      if (energyScore.isClean) {
        return {
          action: 'ALLOW',
          reason: `Energy clean (${energyScore.renewablePercent}% renewable)`,
          renewablePercent: energyScore.renewablePercent
        };
      }

      // If grid is dirty, only run high-priority tasks
      if (task.urgency === 'normal' || task.urgency === 'low') {
        return {
          action: 'DEFER',
          reason: `Grid dirty (${energyScore.carbonIntensity} gCO2/kWh)`,
          carbonIntensity: energyScore.carbonIntensity,
          nextCleanWindow: await this.getNextCleanEnergyWindow()
        };
      }

      return { action: 'ALLOW', reason: 'High-priority task on dirty grid (allowed)' };

    } catch (error) {
      logger.debug(`Energy check failed: ${error.message}`);
      return { action: 'ALLOW', reason: 'Energy check unavailable' };
    }
  }

  /**
   * Check task queue status
   */
  async checkQueueStatus() {
    try {
      const queuedCount = await this.sleep.getQueuedTaskCount();

      return {
        queuedTasks: queuedCount,
        canSleep: queuedCount === 0,
        reason: queuedCount > 0 ? `${queuedCount} tasks queued` : 'No queued tasks'
      };
    } catch (error) {
      logger.debug(`Queue check failed: ${error.message}`);
      return { queuedTasks: 0, canSleep: true, reason: 'Queue check unavailable' };
    }
  }

  /**
   * Make final decision based on all checks
   */
  async makeFinalDecision(task, userId, checks) {
    const { thermal, energy, queue } = checks;

    // If all checks pass, accept
    if (thermal?.action !== 'DEFER' &&
        energy?.action !== 'DEFER') {
      return {
        action: 'ACCEPT',
        reason: 'All checks passed',
        metadata: { thermal, energy, queue }
      };
    }

    // If nothing can run and no queued tasks, sleep
    if (queue.canSleep && this.config.enableSmartSleep && this.sleep) {
      return {
        action: 'SLEEP',
        reason: 'No tasks queued, can sleep',
        metadata: { queue }
      };
    }

    // Otherwise, defer
    const reasons = [];
    if (thermal?.action === 'DEFER') reasons.push(`thermal: ${thermal.reason}`);
    if (energy?.action === 'DEFER') reasons.push(`energy: ${energy.reason}`);

    return {
      action: 'DEFER',
      reason: reasons.join('; '),
      retryAfter: Math.min(
        thermal?.minutesUntilReady || 60,
        energy?.minutesUntilReady || 60
      ),
      metadata: { thermal, energy, queue }
    };
  }

  /**
   * Get idle until time
   */
  async getIdleUntilTime(userId) {
    try {
      const cooldown = await this.memory.get(
        `SELECT idle_until FROM task_cooldown WHERE user_id = ?`,
        [userId]
      );
      return cooldown?.idle_until || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get next clean energy window (estimated)
   */
  async getNextCleanEnergyWindow() {
    // This would query grid carbon data and find next clean window
    // For now, return next off-peak time (usually cleaner)
    const now = new Date();
    const nextOffPeak = new Date(now);

    if (now.getHours() < 2) {
      // Already in off-peak (2-5 AM)
      nextOffPeak.setHours(2, 0, 0, 0);
    } else if (now.getHours() < 5) {
      // Later in off-peak
      nextOffPeak.setDate(nextOffPeak.getDate() + 1);
      nextOffPeak.setHours(2, 0, 0, 0);
    } else {
      // Wait until next off-peak
      nextOffPeak.setDate(nextOffPeak.getDate() + 1);
      nextOffPeak.setHours(2, 0, 0, 0);
    }

    return nextOffPeak.toISOString();
  }

  /**
   * Log decision for audit trail
   */
  async logDecision(decision) {
    try {
      await this.memory.run(
        `INSERT INTO execution_history 
        (id, task_id, decision, reasoning, timestamp, system_state)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          decision.taskId,
          decision.action,
          decision.reason,
          decision.timestamp,
          JSON.stringify(decision.metadata || {})
        ]
      );
    } catch (error) {
      logger.debug(`Failed to log decision: ${error.message}`);
    }
  }

  /**
   * Get decision statistics
   */
  async getDecisionStats(hours = 24) {
    try {
      const stats = await this.memory.all(
        `SELECT decision, COUNT(*) as count
         FROM execution_history
         WHERE timestamp > datetime('now', '-' || ? || ' hours')
         GROUP BY decision
         ORDER BY count DESC`,
        [hours]
      );

      return stats || [];
    } catch (error) {
      logger.warn(`Failed to get decision stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Configure engine settings
   */
  configureSettings(newSettings) {
    this.config = { ...this.config, ...newSettings };
    logger.info('Smart idle engine configured', { config: this.config });
  }
}

export default SmartIdleEngine;
