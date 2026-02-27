import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino();

export class TaskQueue {
  constructor(redisUrl = 'redis://127.0.0.1:6379') {
    this.queue = new Queue('eco-tasks', redisUrl, {
      settings: {
        lockDuration: 30000,
        lockRenewTime: 15000,
        maxStalledCount: 2,
        stalledInterval: 5000,
        maxRetriesPerJob: 3,
        retryProcessDelay: 60000
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`, { jobName: job.name });
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed: ${err.message}`, { jobName: job.name });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`, { jobName: job.name });
    });
  }

  // Enqueue a task for deferred execution
  async addTask(taskName, data, options = {}) {
    const taskId = uuidv4();
    const jobOptions = {
      jobId: taskId,
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      ...options
    };

    try {
      const job = await this.queue.add(
        taskName,
        {
          taskId,
          ...data
        },
        jobOptions
      );

      logger.info(`Task enqueued: ${taskName}`, {
        taskId,
        priority: options.priority || 0,
        scheduledFor: options.scheduledFor || 'ASAP'
      });

      return { taskId, jobId: job.id, status: 'queued' };
    } catch (error) {
      logger.error(`Failed to enqueue task: ${error.message}`);
      throw error;
    }
  }

  // Register job processor
  async process(jobName, handler) {
    this.queue.process(jobName, async (job) => {
      logger.info(`Processing job: ${jobName}`, { jobId: job.id });
      return await handler(job);
    });
  }

  // Get queue stats
  async getStats() {
    const counts = await this.queue.getJobCounts();
    return {
      pending: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed
    };
  }

  // Pause queue (during high load)
  async pause() {
    await this.queue.pause(true, true);
    logger.info('Queue paused due to high system load');
  }

  // Resume queue
  async resume() {
    await this.queue.resume(true);
    logger.info('Queue resumed');
  }

  async close() {
    await this.queue.close();
  }
}

export default TaskQueue;
