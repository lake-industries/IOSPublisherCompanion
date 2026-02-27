import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class AgentDecisionEngine {
  constructor(sharedMemory, scheduler) {
    this.memory = sharedMemory;
    this.scheduler = scheduler;
    
    // Task whitelist: only these can be executed
    this.allowedTasks = new Set([
      'database-cleanup',
      'index-optimization',
      'cache-warming',
      'log-rotation',
      'metrics-aggregation',
      'backup-verification',
      'report-generation'
    ]);

    // Permission constraints
    this.permissions = {
      canRead: true,
      canWrite: true,
      canDelete: false,
      canModifyConfig: false,
      canAccessNetwork: false,
      maxTaskDuration: 3600000, // 1 hour
      maxMemoryUsage: 500 // MB
    };
  }

  // Main decision logic: should this task execute?
  async makeDecision(taskId, taskName, taskData) {
    const decisionId = uuidv4();
    const reasoning = [];

    try {
      // 1. Check whitelist
      if (!this.allowedTasks.has(taskName)) {
        const decision = {
          allowed: false,
          reason: 'Task not in execution whitelist'
        };
        reasoning.push('❌ Not whitelisted');
        await this.recordDecision(decisionId, taskId, 'DENIED', reasoning, decision);
        return decision;
      }
      reasoning.push('✓ Whitelisted');

      // 2. Check feedback history for similar tasks
      const similarFeedback = await this.getSimilarTaskFeedback(taskName);
      if (similarFeedback && similarFeedback.necessaryCount < similarFeedback.avoidableCount) {
        reasoning.push(`⚠ User marked similar tasks as avoidable (${similarFeedback.avoidableCount}x)`);
      } else if (similarFeedback && similarFeedback.necessaryCount > 0) {
        reasoning.push(`✓ User confirmed similar tasks necessary (${similarFeedback.necessaryCount}x)`);
      }

      // 3. Check system capacity
      const canExecute = await this.scheduler.canExecuteTask();
      if (!canExecute) {
        reasoning.push('⏱ Deferring: system load too high - scheduling for off-peak');
        const optimalTime = await this.scheduler.findOptimalWindow('normal');
        return {
          allowed: true,
          deferred: true,
          scheduledFor: optimalTime,
          reason: 'System capacity constraint - optimal window identified'
        };
      }
      reasoning.push('✓ System has capacity');

      // 4. Estimate power cost
      const estimatedCost = this.estimatePowerCost(taskName, taskData);
      reasoning.push(`⚡ Estimated cost: ${estimatedCost}W`);

      // 5. Check urgency
      const urgency = taskData.urgency || 'normal';
      const isOffPeak = this.scheduler.isOffPeak();
      
      if (!isOffPeak && urgency === 'low') {
        reasoning.push('📅 Low urgency + peak hours - deferring');
        const optimalTime = await this.scheduler.findOptimalWindow('low');
        return {
          allowed: true,
          deferred: true,
          scheduledFor: optimalTime,
          reason: 'Low priority - deferred to optimal window'
        };
      }

      reasoning.push('✓ Urgency acceptable');

      // 6. Final approval
      const decision = {
        allowed: true,
        deferred: false,
        estimatedPowerCost: estimatedCost,
        reason: 'All checks passed'
      };

      reasoning.push('✅ APPROVED FOR EXECUTION');
      await this.recordDecision(decisionId, taskId, 'APPROVED', reasoning, decision);

      return decision;

    } catch (error) {
      logger.error(`Decision engine error: ${error.message}`);
      return {
        allowed: false,
        reason: `Decision engine error: ${error.message}`
      };
    }
  }

  // Get feedback history for similar tasks
  async getSimilarTaskFeedback(taskName) {
    try {
      const feedback = await this.memory.all(
        `SELECT feedback_type, COUNT(*) as count 
         FROM feedback f
         JOIN tasks t ON f.task_id = t.id
         WHERE t.name = ? AND f.feedback_type IN ('necessary', 'avoidable', 'optimizable')
         GROUP BY f.feedback_type`,
        [taskName]
      );

      if (!feedback || feedback.length === 0) return null;

      const result = {
        necessaryCount: 0,
        avoidableCount: 0,
        optimizableCount: 0
      };

      feedback.forEach(row => {
        if (row.feedback_type === 'necessary') result.necessaryCount = row.count;
        if (row.feedback_type === 'avoidable') result.avoidableCount = row.count;
        if (row.feedback_type === 'optimizable') result.optimizableCount = row.count;
      });

      return result;
    } catch (error) {
      logger.warn(`Failed to retrieve feedback: ${error.message}`);
      return null;
    }
  }

  // Estimate power consumption for task
  estimatePowerCost(taskName, taskData) {
    const baseCosts = {
      'database-cleanup': 50,      // Watts
      'index-optimization': 100,
      'cache-warming': 30,
      'log-rotation': 20,
      'metrics-aggregation': 40,
      'backup-verification': 120,
      'report-generation': 60
    };

    let cost = baseCosts[taskName] || 50;

    // Adjust based on data size
    if (taskData.dataSize) {
      cost *= (1 + (taskData.dataSize / 1000)); // Scale with MB
    }

    return Math.round(cost);
  }

  // Record decision in memory for audit
  async recordDecision(decisionId, taskId, decision, reasoning, details) {
    try {
      await this.memory.run(
        `INSERT INTO execution_history 
        (id, task_id, decision, reasoning, system_state) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          decisionId,
          taskId,
          decision,
          reasoning.join(' → '),
          JSON.stringify(details)
        ]
      );
    } catch (error) {
      logger.error(`Failed to record decision: ${error.message}`);
    }
  }

  // Enforce sandbox constraints on task execution
  async enforceConstraints(task) {
    return {
      timeout: this.permissions.maxTaskDuration,
      memoryLimit: this.permissions.maxMemoryUsage,
      allowedOperations: ['read', 'write'],
      blockedOperations: ['delete', 'config_modify', 'network']
    };
  }

  // Add task to whitelist (requires explicit user action)
  addToWhitelist(taskName) {
    this.allowedTasks.add(taskName);
    logger.info(`Task added to whitelist: ${taskName}`);
  }

  // Remove task from whitelist
  removeFromWhitelist(taskName) {
    this.allowedTasks.delete(taskName);
    logger.info(`Task removed from whitelist: ${taskName}`);
  }

  getWhitelist() {
    return Array.from(this.allowedTasks);
  }
}

export default AgentDecisionEngine;
