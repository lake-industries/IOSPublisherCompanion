import schedule from 'node-schedule';
import os from 'os';
import pino from 'pino';
import { RenewableEnergyModule } from './renewableEnergyModule.js';

const logger = pino();

export class EcoScheduler {
  constructor(taskQueue, sharedMemory) {
    this.queue = taskQueue;
    this.memory = sharedMemory;
    this.renewableModule = new RenewableEnergyModule(sharedMemory);
    
    this.config = {
      offPeakHours: [2, 3, 4, 5], // 2-5 AM (fallback)
      cpuThreshold: 60, // %
      memoryThreshold: 70, // %
      diskIOThreshold: 50, // %
      maxConcurrentTasks: 2,
      
      // Energy-aware configuration
      schedulingMode: 'hybrid', // 'renewable' | 'grid-aware' | 'hybrid' | 'off-peak'
      preferRenewableEnergy: true,
      considerGridCarbon: true
    };
  }

  // Detect if current time is off-peak
  isOffPeak() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Weekends: 8-10 AM, 12-2 PM are good
    // Weekdays: 2-5 AM is best
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [8, 9, 12, 13] .includes(hour);
    }
    return this.config.offPeakHours.includes(hour);
  }

  // Get current system resource usage
  async getSystemLoad() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const cpuUsage = 100 - (os.freemem() / os.totalmem() * 100); // rough estimate
    const memoryPercent = (usedMemory / totalMemory) * 100;
    const loadAverage = os.loadavg()[0]; // 1-min load average
    
    return {
      cpuUsagePercent: cpuUsage,
      memoryUsageMb: usedMemory / (1024 * 1024),
      memoryPercent,
      loadAverage,
      isOffPeak: this.isOffPeak(),
      timestamp: new Date()
    };
  }

  // Check if system can accept new task (hybrid approach)
  async canExecuteTask() {
    const load = await this.getSystemLoad();
    
    // Always check system resources first
    const conditions = {
      cpuOk: load.cpuUsagePercent < this.config.cpuThreshold,
      memoryOk: load.memoryPercent < this.config.memoryThreshold,
      offPeakBonus: load.isOffPeak ? 1.2 : 0.8
    };

    const systemOk = conditions.cpuOk && conditions.memoryOk;

    // If system OK, also check renewable energy
    let energyOk = true;
    let energyReasoning = '⚠️ Energy data unavailable';

    if (this.config.preferRenewableEnergy || this.config.considerGridCarbon) {
      try {
        const gridStatus = await this.renewableModule.getGridStatus('normal');
        energyOk = gridStatus.shouldExecuteNow;
        energyReasoning = gridStatus.reasoning;

        // Store for audit
        logger.debug('Grid status', { gridStatus });
      } catch (error) {
        logger.warn(`Grid status check failed: ${error.message}`);
        // Fall back to time-based decision
        energyOk = load.isOffPeak;
      }
    }

    const canExecute = systemOk && energyOk;

    // Store metrics
    try {
      await this.memory.run(
        `INSERT INTO metrics 
        (id, cpu_usage_percent, memory_usage_mb, system_load, is_off_peak) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          require('uuid').v4(),
          load.cpuUsagePercent,
          load.memoryUsageMb,
          load.loadAverage,
          load.isOffPeak ? 1 : 0
        ]
      );
    } catch (error) {
      logger.warn(`Failed to store metrics: ${error.message}`);
    }

    logger.debug('Capacity check', {
      canExecute,
      systemOk,
      energyOk,
      energyReasoning,
      load,
      conditions
    });

    return canExecute;
  }

  // Schedule recurring tasks
  scheduleRecurringTask(taskName, cronExpression, taskData) {
    return schedule.scheduleJob(cronExpression, async () => {
      const canExecute = await this.canExecuteTask();
      
      if (canExecute) {
        logger.info(`Executing scheduled task: ${taskName}`);
        await this.queue.addTask(taskName, taskData, {
          priority: 1,
          scheduledFor: new Date().toISOString()
        });
      } else {
        logger.info(`Deferring task ${taskName} - system load too high`);
      }
    });
  }

  // Schedule one-off task for optimal time
  async scheduleOptimal(taskName, taskData, urgencyLevel = 'normal') {
    const urgencyMap = {
      critical: 3,  // Execute ASAP
      high: 2,      // Execute within 24h
      normal: 1,    // Execute within 48h
      low: 0        // Execute whenever convenient
    };

    const priority = urgencyMap[urgencyLevel] || 1;

    // Find next optimal window
    let scheduledTime = await this.findOptimalWindow(urgencyLevel);

    logger.info(`Scheduling ${taskName} for optimal execution`, {
      urgencyLevel,
      scheduledFor: scheduledTime
    });

    return await this.queue.addTask(taskName, taskData, {
      priority,
      scheduledFor: scheduledTime.toISOString(),
      delay: Math.max(0, scheduledTime - Date.now())
    });
  }

  // Find best time to execute based on urgency AND energy source
  async findOptimalWindow(urgencyLevel) {
    const now = new Date();
    let candidate = new Date(now);

    // If renewable energy enabled, find best renewable window
    if (this.config.preferRenewableEnergy) {
      try {
        const windows = await this.renewableModule.findOptimalWindows(urgencyLevel, 7);
        if (windows && windows.length > 0) {
          const bestWindow = windows[0];
          logger.info(`Renewable energy optimal window found: ${bestWindow.reason}`, {
            time: bestWindow.time,
            priority: bestWindow.priority
          });
          return bestWindow.time;
        }
      } catch (error) {
        logger.warn(`Failed to find renewable energy window: ${error.message}`);
      }
    }

    // Fallback to traditional time-based scheduling
    if (urgencyLevel === 'critical') {
      // Execute in next 30 mins if possible
      return new Date(now.getTime() + 30 * 60000);
    } else if (urgencyLevel === 'high') {
      // Target next off-peak window (tonight)
      candidate.setHours(3, 0, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1);
      }
    } else if (urgencyLevel === 'normal') {
      // Target within 48 hours
      candidate.setHours(3, 0, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1);
      }
    } else {
      // Low priority: weekend early morning
      const daysUntilWeekend = (5 - now.getDay() + 7) % 7;
      candidate.setDate(now.getDate() + (daysUntilWeekend || 7));
      candidate.setHours(8, 0, 0, 0);
    }

    return candidate;
  }

  // Configure renewable energy source (direct solar, grid API, etc)
  configureRenewableEnergy(config) {
    /**
     * config = {
     *   directSolarWatts: 5000,        // Your solar system capacity in watts
     *   schedulingMode: 'hybrid',      // 'renewable' | 'grid-aware' | 'hybrid' | 'off-peak'
     *   maxGridCarbonIntensity: 500,   // kg CO2/MWh - defer if above
     *   minRenewablePercent: 40,       // Execute if >= 40% renewable
     *   gridApiKey: 'abc123',          // For Electricity Maps API
     *   gridApiZone: 'US-CA'           // Region code
     * }
     */
    this.config = { ...this.config, ...config };
    this.renewableModule.configureEnergySource(config);
    
    logger.info('Renewable energy configuration updated', {
      directSolarWatts: config.directSolarWatts,
      schedulingMode: config.schedulingMode,
      maxGridCarbonIntensity: config.maxGridCarbonIntensity
    });
  }

  // Get current grid status and scheduling recommendation
  async getEnergyStatus() {
    try {
      const gridStatus = await this.renewableModule.getGridStatus('normal');
      const stats = await this.renewableModule.getGridStatistics(7);
      
      return {
        currentScore: gridStatus.score,
        shouldExecuteNow: gridStatus.shouldExecuteNow,
        reasoning: gridStatus.reasoning,
        gridData: gridStatus.gridData,
        renewableStatus: gridStatus.renewableStatus,
        solarStatus: gridStatus.solarStatus,
        directSolarActive: gridStatus.directSolarActive,
        weeklyStats: stats
      };
    } catch (error) {
      logger.error(`Failed to get energy status: ${error.message}`);
      return null;
    }
  }

  // Check if system is within required idle period
  async isWithinIdlePeriod(userId) {
    try {
      const cooldown = await this.memory.get(
        `SELECT idle_until FROM task_cooldown WHERE user_id = ?`,
        [userId]
      );

      if (!cooldown) return true; // No cooldown set, OK to execute

      const now = new Date();
      const idleUntil = new Date(cooldown.idle_until);

      if (now < idleUntil) {
        const minutesRemaining = Math.ceil((idleUntil - now) / 60000);
        logger.info(`Idle period active for ${userId}: ${minutesRemaining} min remaining`);
        return false;
      }

      // Cooldown expired, can execute
      await this.memory.run(
        `DELETE FROM task_cooldown WHERE user_id = ?`,
        [userId]
      );
      return true;
    } catch (error) {
      logger.warn(`Failed to check idle period: ${error.message}`);
      return true; // Allow execution if check fails
    }
  }

  // Set idle period after task execution
  async enforceIdlePeriod(userId, taskId) {
    try {
      const prefs = await this.memory.get(
        `SELECT min_idle_between_tasks_minutes FROM user_preferences WHERE user_id = ?`,
        [userId]
      );

      const idleMinutes = prefs?.min_idle_between_tasks_minutes || 5;
      const idleUntil = new Date(Date.now() + idleMinutes * 60000);

      await this.memory.run(
        `INSERT OR REPLACE INTO task_cooldown (id, user_id, last_task_id, last_executed_at, idle_until, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `cooldown-${userId}-${Date.now()}`,
          userId,
          taskId,
          new Date().toISOString(),
          idleUntil.toISOString(),
          `System idle period: ${idleMinutes} minutes`
        ]
      );

      logger.info(`Idle period enforced for ${userId}: ${idleMinutes} minutes`);
    } catch (error) {
      logger.warn(`Failed to enforce idle period: ${error.message}`);
    }
  }

  // Check if current time is within user's delegation hours
  async isWithinDelegationHours(userId) {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // NULL or undefined day_of_week means any day
      const delegationHours = await this.memory.all(
        `SELECT * FROM delegation_hours 
         WHERE user_id = ? AND is_active = 1 
         AND (day_of_week IS NULL OR day_of_week = ?)
         ORDER BY start_hour ASC`,
        [userId, dayOfWeek]
      );

      if (delegationHours.length === 0) {
        // No specific hours set, allow anytime
        return { allowed: true, reason: 'No delegation hours configured' };
      }

      // Check if current time falls within any of the delegation hours
      for (const window of delegationHours) {
        const startMinutes = window.start_hour * 60 + window.start_minute;
        const endMinutes = window.end_hour * 60 + window.end_minute;
        const currentMinutes = currentHour * 60 + currentMinute;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return {
            allowed: true,
            reason: `Within delegation window: ${window.start_hour}:${String(window.start_minute).padStart(2, '0')}-${window.end_hour}:${String(window.end_minute).padStart(2, '0')}`,
            description: window.description
          };
        }
      }

      // Not within any delegation window
      const nextWindow = delegationHours[0];
      return {
        allowed: false,
        reason: `Outside delegation hours. Next window: ${nextWindow.start_hour}:${String(nextWindow.start_minute).padStart(2, '0')}`,
        nextWindowStart: `${nextWindow.start_hour}:${String(nextWindow.start_minute).padStart(2, '0')}`
      };
    } catch (error) {
      logger.warn(`Failed to check delegation hours: ${error.message}`);
      return { allowed: true, reason: 'Delegation hour check failed, allowing execution' };
    }
  }

  // Check if task complies with user's ethical rules
  async compliesWithEthicalRules(userId, taskName, estimatedPowerWatts) {
    try {
      const rules = await this.memory.all(
        `SELECT * FROM ethical_rules WHERE user_id = ? AND is_active = 1`,
        [userId]
      );

      const violations = [];

      for (const rule of rules) {
        let ruleViolated = false;

        switch (rule.rule_type) {
          case 'max_power_watts':
            if (estimatedPowerWatts > parseFloat(rule.rule_value)) {
              ruleViolated = true;
            }
            break;

          case 'task_type_blacklist':
            if (taskName.toLowerCase().includes(rule.rule_value.toLowerCase())) {
              ruleViolated = true;
            }
            break;

          case 'task_type_whitelist':
            if (!taskName.toLowerCase().includes(rule.rule_value.toLowerCase())) {
              ruleViolated = true;
            }
            break;

          case 'no_heavy_computation':
            if (taskName.toLowerCase().includes('ml') || 
                taskName.toLowerCase().includes('render') ||
                taskName.toLowerCase().includes('analysis')) {
              ruleViolated = true;
            }
            break;

          case 'no_data_intensive':
            if (taskName.toLowerCase().includes('backup') || 
                taskName.toLowerCase().includes('sync') ||
                taskName.toLowerCase().includes('transfer')) {
              ruleViolated = true;
            }
            break;
        }

        if (ruleViolated) {
          violations.push({
            rule_id: rule.id,
            rule_type: rule.rule_type,
            enforcement_level: rule.enforcement_level,
            reasoning: rule.reasoning
          });
        }
      }

      if (violations.length === 0) {
        return { complies: true, violations: [] };
      }

      const hardViolations = violations.filter(v => v.enforcement_level === 'strict');
      const softViolations = violations.filter(v => v.enforcement_level === 'warn');

      return {
        complies: hardViolations.length === 0,
        violations,
        hardViolations,
        softViolations,
        reason: hardViolations.length > 0 
          ? `Hard violation: ${hardViolations[0].rule_type}`
          : `Warning: ${softViolations.map(v => v.rule_type).join(', ')}`
      };
    } catch (error) {
      logger.warn(`Failed to check ethical rules: ${error.message}`);
      return { complies: true, violations: [] };
    }
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Scheduler shutting down...');
    schedule.gracefulShutdown();
  }
}

export default EcoScheduler;
