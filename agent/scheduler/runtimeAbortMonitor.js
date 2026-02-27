/**
 * Runtime Abort Monitor
 * 
 * Watches running tasks for thermal/power emergencies.
 * If device reaches critical conditions mid-execution:
 * 1. Triggers emergency checkpoint
 * 2. Pauses task execution
 * 3. Initiates device sleep/cooling
 * 4. Queues task for resumption later
 * 
 * Prevents damage and wasted energy.
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class RuntimeAbortMonitor {
  constructor(sharedMemory, thermalMonitor, checkpointManager, sleepManager) {
    this.memory = sharedMemory;
    this.thermal = thermalMonitor;
    this.checkpoints = checkpointManager;
    this.sleep = sleepManager;

    // Active task monitoring
    this.monitoredTasks = new Map(); // taskId → monitoring data
    this.abortCallbacks = new Map();   // taskId → abort function
    this.monitoringIntervals = new Map(); // taskId → interval ID

    this.config = {
      monitoringIntervalMs: 5000,    // Check every 5 seconds
      thermalAlertThreshold: 75,     // Alert at 75°C
      thermalAbortThreshold: 85,     // Abort at 85°C
      powerAlertThreshold: 90,       // Alert at 90% power usage
      enableThermalAbort: true,
      enablePowerAbort: true
    };
  }

  /**
   * Start monitoring a running task for thermal/power emergencies
   * 
   * abortCallback: async function() that pauses task execution
   * Returns: { monitoringId, startTime }
   */
  async startMonitoring(taskId, task, abortCallback) {
    try {
      if (typeof abortCallback !== 'function') {
        throw new Error('Abort callback must be a function');
      }

      // Store monitoring data
      const monitorId = uuidv4();
      const startTime = Date.now();

      this.monitoredTasks.set(taskId, {
        monitorId,
        taskId,
        task,
        startTime,
        startTemp: null,
        peakTemp: 0,
        thermalAlerts: 0,
        powerAlerts: 0,
        aborted: false
      });

      this.abortCallbacks.set(taskId, abortCallback);

      // Get starting temperature
      const currentTemp = await this.thermal.getSystemTemperature();
      const monitored = this.monitoredTasks.get(taskId);
      monitored.startTemp = currentTemp.average || currentTemp.cpu || 30;

      // Start monitoring interval
      const interval = setInterval(async () => {
        await this.checkTaskHealth(taskId);
      }, this.config.monitoringIntervalMs);

      this.monitoringIntervals.set(taskId, interval);

      logger.info(`🔍 Monitoring started for task ${taskId}`);

      return {
        monitoringId,
        startTime,
        initialTemp: monitored.startTemp
      };

    } catch (error) {
      logger.error(`Failed to start monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check task health during execution
   * Main monitoring loop
   */
  async checkTaskHealth(taskId) {
    try {
      const monitored = this.monitoredTasks.get(taskId);
      if (!monitored || monitored.aborted) return;

      // Get current thermal condition
      const currentTemp = await this.thermal.getSystemTemperature();
      const temp = currentTemp.average || currentTemp.cpu || 30;
      const status = currentTemp.status || 'safe';

      // Track peak temperature
      if (temp > monitored.peakTemp) {
        monitored.peakTemp = temp;
      }

      // Record temperature point
      await this.recordTemperaturePoint(taskId, temp);

      // Check thermal abort threshold
      if (this.config.enableThermalAbort) {
        const abort = await this.checkThermalAbort(taskId, temp, status);
        if (abort) {
          await this.abortTask(taskId, 'THERMAL_CRITICAL', temp);
          return;
        }

        // Check thermal alert threshold
        const alert = await this.checkThermalAlert(taskId, temp);
        if (alert) {
          monitored.thermalAlerts++;
          logger.warn(`⚠️  Thermal alert for task ${taskId}: ${temp.toFixed(1)}°C (alert: ${this.config.thermalAlertThreshold}°C)`);
        }
      }

      // Check power abort threshold
      if (this.config.enablePowerAbort) {
        const powerAbort = await this.checkPowerAbort(taskId);
        if (powerAbort) {
          await this.abortTask(taskId, 'POWER_CRITICAL', null);
          return;
        }
      }

    } catch (error) {
      logger.error(`Health check error for task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Check if thermal condition is critical
   */
  async checkThermalAbort(taskId, currentTemp, status) {
    if (!this.config.enableThermalAbort) return false;

    const abortThreshold = this.config.thermalAbortThreshold;

    // Abort if critical
    if (status === 'critical' || currentTemp >= abortThreshold) {
      return true;
    }

    // Abort if trending toward critical (rising fast)
    const monitored = this.monitoredTasks.get(taskId);
    if (monitored && currentTemp > abortThreshold - 5) {
      // Temperature within 5°C of abort threshold - check trend
      const tempHistory = await this.getRecentTemperatures(taskId, 30000); // Last 30 seconds
      if (tempHistory.length >= 3) {
        const trend = tempHistory[tempHistory.length - 1] - tempHistory[0];
        const riseRate = trend / (tempHistory.length - 1);

        // If rising more than 1°C per check cycle, trending bad
        if (riseRate > 1.0) {
          logger.warn(`🔥 Thermal abort: Temperature rising rapidly (+${riseRate.toFixed(2)}°C per cycle)`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if thermal is in alert zone
   */
  async checkThermalAlert(taskId, currentTemp) {
    if (!this.config.enableThermalAbort) return false;

    const alertThreshold = this.config.thermalAlertThreshold;
    return currentTemp >= alertThreshold && currentTemp < this.config.thermalAbortThreshold;
  }

  /**
   * Check if power is critically low
   */
  async checkPowerAbort(taskId) {
    if (!this.config.enablePowerAbort) return false;

    try {
      // Check device battery or power supply status
      const powerStatus = await this.getPowerStatus();

      if (powerStatus.onBattery && powerStatus.batteryPercent < 10) {
        logger.warn(`🔌 Power abort: Battery critical (${powerStatus.batteryPercent}%)`);
        return true;
      }

      if (powerStatus.powerDraw && powerStatus.powerDraw > this.config.powerAlertThreshold) {
        logger.warn(`⚡ Power alert: Heavy draw (${powerStatus.powerDraw.toFixed(1)}% of capacity)`);
      }

      return false;

    } catch (error) {
      logger.warn(`Could not check power status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current power status
   */
  async getPowerStatus() {
    // Platform-specific power checking
    // This is a stub - implement based on OS

    return {
      onBattery: false,
      batteryPercent: 100,
      powerDraw: 50 // Percentage of capacity
    };
  }

  /**
   * Abort a task in flight
   * Saves checkpoint, pauses execution, queues for resumption
   */
  async abortTask(taskId, reason, temperature) {
    try {
      const monitored = this.monitoredTasks.get(taskId);
      if (!monitored) {
        logger.warn(`Task ${taskId} not being monitored`);
        return null;
      }

      if (monitored.aborted) {
        return; // Already aborted
      }

      monitored.aborted = true;

      logger.warn(`🛑 ABORTING TASK ${taskId}: ${reason}${temperature ? ` (${temperature.toFixed(1)}°C)` : ''}`);

      // 1. Trigger emergency checkpoint
      const checkpointData = {
        progress: 75, // Estimate 75% complete when aborted
        reason: `ABORT_${reason}`,
        emergencyCheckpoint: true,
        abortTemperature: temperature,
        executionTimeSeconds: Math.floor((Date.now() - monitored.startTime) / 1000),
        peakTemperature: monitored.peakTemp
      };

      await this.checkpoints.saveCheckpoint(taskId, checkpointData);

      // 2. Call abort callback to pause execution
      const callback = this.abortCallbacks.get(taskId);
      if (callback) {
        try {
          await callback();
        } catch (error) {
          logger.error(`Abort callback failed: ${error.message}`);
        }
      }

      // 3. Record abort event
      await this.recordAbortEvent(taskId, reason, temperature, monitored);

      // 4. Stop monitoring
      await this.stopMonitoring(taskId);

      // 5. Queue task for resumption
      await this.queueForResumption(taskId, reason);

      // 6. Initiate sleep if thermal
      if (reason === 'THERMAL_CRITICAL' && this.sleep) {
        logger.info(`Initiating device sleep due to thermal abort`);
        await this.sleep.initiateDeviceSleep('thermal_abort');
      }

      return {
        success: true,
        taskId,
        reason,
        checkpointSaved: true,
        resumeAvailable: true
      };

    } catch (error) {
      logger.error(`Failed to abort task: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop monitoring a task
   */
  async stopMonitoring(taskId) {
    try {
      // Clear interval
      const interval = this.monitoringIntervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(taskId);
      }

      // Clean up callbacks
      this.abortCallbacks.delete(taskId);

      logger.debug(`Monitoring stopped for task ${taskId}`);

    } catch (error) {
      logger.error(`Failed to stop monitoring: ${error.message}`);
    }
  }

  /**
   * Record temperature point during task execution
   */
  async recordTemperaturePoint(taskId, temperature) {
    try {
      const id = uuidv4();
      const monitored = this.monitoredTasks.get(taskId);

      await this.memory.run(
        `INSERT INTO task_thermal_history 
         (id, task_id, temperature, elapsed_seconds, timestamp)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          id,
          taskId,
          temperature,
          Math.floor((Date.now() - monitored.startTime) / 1000)
        ]
      );
    } catch (error) {
      logger.debug(`Could not record temperature point: ${error.message}`);
    }
  }

  /**
   * Get recent temperature readings for a task
   */
  async getRecentTemperatures(taskId, windowMs) {
    try {
      const monitored = this.monitoredTasks.get(taskId);
      if (!monitored) return [];

      const cutoffTime = Date.now() - windowMs;
      const cutoffSeconds = Math.floor(windowMs / 1000);

      const readings = await this.memory.queryAll(
        `SELECT temperature FROM task_thermal_history 
         WHERE task_id = ? AND elapsed_seconds >= ?
         ORDER BY elapsed_seconds ASC`,
        [taskId, monitored.startTime + cutoffSeconds]
      );

      return readings.map(r => r.temperature);

    } catch (error) {
      logger.debug(`Could not retrieve temperature history: ${error.message}`);
      return [];
    }
  }

  /**
   * Record abort event for analysis
   */
  async recordAbortEvent(taskId, reason, temperature, monitored) {
    try {
      const id = uuidv4();
      const executionDuration = Math.floor((Date.now() - monitored.startTime) / 1000);

      await this.memory.run(
        `INSERT INTO task_abort_history 
         (id, task_id, reason, temperature, execution_duration_seconds, 
          peak_temperature, thermal_alerts, power_alerts, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          id,
          taskId,
          reason,
          temperature || null,
          executionDuration,
          monitored.peakTemp,
          monitored.thermalAlerts,
          monitored.powerAlerts
        ]
      );

      logger.info(`Abort event recorded: task ${taskId}, reason ${reason}`);

    } catch (error) {
      logger.error(`Failed to record abort event: ${error.message}`);
    }
  }

  /**
   * Queue task for resumption after conditions improve
   */
  async queueForResumption(taskId, abortReason) {
    try {
      const id = uuidv4();

      await this.memory.run(
        `INSERT INTO task_resumption_queue 
         (id, task_id, abort_reason, status, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, taskId, abortReason, 'PENDING']
      );

      logger.info(`Task ${taskId} queued for resumption`);

    } catch (error) {
      logger.error(`Failed to queue for resumption: ${error.message}`);
    }
  }

  /**
   * Get monitoring statistics for a task
   */
  async getMonitoringStats(taskId) {
    try {
      const monitored = this.monitoredTasks.get(taskId);
      if (!monitored) return null;

      const temps = await this.getRecentTemperatures(taskId, Infinity);

      return {
        taskId,
        startTemp: monitored.startTemp,
        peakTemp: monitored.peakTemp,
        tempRange: {
          min: Math.min(...temps),
          max: Math.max(...temps)
        },
        thermalAlerts: monitored.thermalAlerts,
        powerAlerts: monitored.powerAlerts,
        executionDuration: Math.floor((Date.now() - monitored.startTime) / 1000),
        aborted: monitored.aborted
      };

    } catch (error) {
      logger.error(`Failed to get monitoring stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Configure monitoring thresholds
   */
  configureThresholds(config) {
    this.config = { ...this.config, ...config };
    logger.info('Runtime abort thresholds updated', this.config);
  }

  /**
   * Get currently monitored tasks
   */
  getMonitoredTasks() {
    const tasks = [];
    for (const [taskId, data] of this.monitoredTasks.entries()) {
      tasks.push({
        taskId,
        running: !data.aborted,
        peakTemp: data.peakTemp,
        alerts: data.thermalAlerts + data.powerAlerts
      });
    }
    return tasks;
  }
}
