import pino from 'pino';
import { TaskQueue } from './queue/taskQueue.js';
import { SharedMemory } from './memory/sharedMemory.js';
import { EcoScheduler } from './scheduler/ecoScheduler.js';
import { AgentDecisionEngine } from './engine/decisionEngine.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: false,
      timestamp: true
    }
  }
});

class EcoAgent {
  constructor() {
    this.taskQueue = null;
    this.sharedMemory = null;
    this.scheduler = null;
    this.decisionEngine = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing Eco Agent...');

      // Initialize components
      this.sharedMemory = new SharedMemory();
      
      // Note: TaskQueue requires Redis. If Redis is not available,
      // we'll use a fallback in-memory queue
      try {
        this.taskQueue = new TaskQueue();
      } catch (error) {
        logger.warn('Redis not available, using fallback queue');
        this.taskQueue = new FallbackQueue();
      }

      this.scheduler = new EcoScheduler(this.taskQueue, this.sharedMemory);
      this.decisionEngine = new AgentDecisionEngine(this.sharedMemory, this.scheduler);

      // Register task processors
      await this.registerTaskProcessors();

      logger.info('✅ Eco Agent initialized successfully');
      this.isRunning = true;
      return true;

    } catch (error) {
      logger.error(`❌ Initialization failed: ${error.message}`);
      process.exit(1);
    }
  }

  async registerTaskProcessors() {
    // Example task processors
    const tasks = [
      'database-cleanup',
      'index-optimization',
      'cache-warming',
      'log-rotation',
      'metrics-aggregation',
      'backup-verification',
      'report-generation'
    ];

    for (const taskName of tasks) {
      await this.taskQueue.process(taskName, async (job) => {
        logger.info(`▶️  Processing: ${taskName}`, { jobId: job.id });

        try {
          // Make decision
          const decision = await this.decisionEngine.makeDecision(
            job.id,
            taskName,
            job.data
          );

          if (!decision.allowed) {
            logger.warn(`⛔ Task denied: ${decision.reason}`);
            return { status: 'denied', reason: decision.reason };
          }

          if (decision.deferred) {
            logger.info(`⏱ Task deferred until ${decision.scheduledFor}`);
            return { status: 'deferred', scheduledFor: decision.scheduledFor };
          }

          // Get execution constraints
          const constraints = await this.decisionEngine.enforceConstraints(job.data);

          // Execute task (simplified example)
          const result = await this.executeTask(taskName, job.data, constraints);

          // Update task record
          await this.sharedMemory.run(
            `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
            ['completed', new Date().toISOString(), job.id]
          );

          logger.info(`✨ Task completed: ${taskName}`, { result });
          return result;

        } catch (error) {
          logger.error(`❌ Task failed: ${taskName} - ${error.message}`);
          throw error;
        }
      });
    }

    logger.info(`📋 Registered ${tasks.length} task processors`);
  }

  async executeTask(taskName, taskData, constraints) {
    // Simulated task execution
    // In production, this would call actual task implementations
    return {
      status: 'success',
      taskName,
      executedAt: new Date().toISOString(),
      duration: Math.floor(Math.random() * 30000),
      message: `${taskName} executed within constraints`
    };
  }

  // API: User submits task for deferred execution
  async submitTask(taskName, taskData, urgencyLevel = 'normal') {
    if (!this.isRunning) {
      throw new Error('Agent not running');
    }

    try {
      // Insert into memory
      const taskId = require('uuid').v4();
      const optimalTime = await this.scheduler.findOptimalWindow(urgencyLevel);

      await this.sharedMemory.run(
        `INSERT INTO tasks 
        (id, name, description, priority, scheduled_for, status) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          taskName,
          taskData.description || '',
          { critical: 3, high: 2, normal: 1, low: 0 }[urgencyLevel] || 1,
          optimalTime.toISOString(),
          'pending'
        ]
      );

      // Add to queue
      const queueResult = await this.taskQueue.addTask(taskName, taskData, {
        priority: { critical: 3, high: 2, normal: 1, low: 0 }[urgencyLevel] || 1,
        scheduledFor: optimalTime.toISOString(),
        delay: Math.max(0, optimalTime - Date.now())
      });

      logger.info(`📝 Task submitted: ${taskName}`, {
        taskId,
        urgency: urgencyLevel,
        scheduledFor: optimalTime
      });

      return {
        taskId,
        status: 'queued',
        scheduledFor: optimalTime,
        estimatedPowerCost: this.decisionEngine.estimatePowerCost(taskName, taskData)
      };

    } catch (error) {
      logger.error(`Failed to submit task: ${error.message}`);
      throw error;
    }
  }

  // API: User provides feedback on task
  async recordFeedback(taskId, feedbackType, notes = '') {
    try {
      await this.sharedMemory.run(
        `INSERT INTO feedback (id, task_id, feedback_type, value, notes) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          require('uuid').v4(),
          taskId,
          feedbackType, // 'necessary', 'avoidable', 'optimizable'
          feedbackType,
          notes
        ]
      );

      logger.info(`📊 Feedback recorded: ${feedbackType}`, { taskId });
      return { status: 'recorded', taskId, feedbackType };

    } catch (error) {
      logger.error(`Failed to record feedback: ${error.message}`);
      throw error;
    }
  }

  // Get queue statistics
  async getStatus() {
    const stats = await this.taskQueue.getStats();
    return {
      isRunning: this.isRunning,
      queue: stats,
      whitelistedTasks: this.decisionEngine.getWhitelist(),
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    logger.info('🛑 Shutting down Eco Agent...');
    try {
      await this.scheduler.shutdown();
      await this.taskQueue.close();
      await this.sharedMemory.close();
      this.isRunning = false;
      logger.info('✅ Eco Agent shut down successfully');
    } catch (error) {
      logger.error(`Shutdown error: ${error.message}`);
    }
  }
}

// Fallback in-memory queue (if Redis unavailable)
class FallbackQueue {
  constructor() {
    this.jobs = [];
    this.processors = new Map();
  }

  async addTask(name, data, options = {}) {
    const job = { name, data, options, id: require('uuid').v4() };
    this.jobs.push(job);
    return { id: job.id };
  }

  async process(name, handler) {
    this.processors.set(name, handler);
  }

  async getStats() {
    return { pending: this.jobs.length, active: 0, completed: 0, failed: 0 };
  }

  async close() {}
}

// Main execution
async function main() {
  const agent = new EcoAgent();
  await agent.initialize();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agent.shutdown();
    process.exit(0);
  });

  logger.info('🌱 Eco Agent running - ready to accept tasks');
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

export default EcoAgent;
