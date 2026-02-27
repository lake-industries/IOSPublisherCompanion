/**
 * Task Checkpoint System
 * 
 * Enables mid-execution pausing and resuming of tasks.
 * Saves task state at checkpoints to recover if:
 * - Device reaches critical temperature
 * - Power unexpected runs out
 * - Device needs to sleep
 * 
 * Prevents wasted energy by avoiding restart from scratch.
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class TaskCheckpointManager {
  constructor(sharedMemory) {
    this.memory = sharedMemory;

    // In-memory checkpoint tracking
    this.activeCheckpoints = new Map(); // taskId → checkpoint data
    this.checkpointCallbacks = new Map(); // taskId → callback function
  }

  /**
   * Register a checkpoint function for a task
   * 
   * The callback will be called when checkpoint needed:
   * - callback() → Promise<checkpointData>
   * 
   * checkpointData should contain:
   * {
   *   progress: 0-100,           // Percent complete
   *   state: { ... },            // Task-specific state to restore
   *   output: { ... },           // Intermediate output (if any)
   *   metadata: { ... }
   * }
   */
  registerCheckpointFunction(taskId, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Checkpoint callback must be a function');
    }
    this.checkpointCallbacks.set(taskId, callback);
    logger.debug(`Checkpoint function registered for task ${taskId}`);
  }

  /**
   * Trigger an emergency checkpoint (thermal, power, manual)
   * Saves current state and pauses task execution
   */
  async emergencyCheckpoint(taskId, reason) {
    try {
      const callback = this.checkpointCallbacks.get(taskId);
      if (!callback) {
        logger.warn(`No checkpoint callback for task ${taskId}`);
        return null;
      }

      // Get current state from task
      const checkpointData = await callback();

      // Save to database
      const checkpoint = await this.saveCheckpoint(taskId, {
        reason,
        emergencyCheckpoint: true,
        ...checkpointData
      });

      logger.info(`Emergency checkpoint saved for task ${taskId}: ${reason}`);
      return checkpoint;

    } catch (error) {
      logger.error(`Emergency checkpoint failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Save checkpoint to database
   */
  async saveCheckpoint(taskId, checkpointData) {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      await this.memory.run(
        `INSERT INTO task_checkpoints 
         (id, task_id, checkpoint_number, progress_percent, 
          state_data, output_data, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          taskId,
          checkpointData.checkpointNumber || 1,
          checkpointData.progress || 0,
          JSON.stringify(checkpointData.state || {}),
          JSON.stringify(checkpointData.output || {}),
          checkpointData.reason || 'manual',
          timestamp
        ]
      );

      // Cache it
      this.activeCheckpoints.set(taskId, {
        id,
        taskId,
        timestamp,
        progress: checkpointData.progress,
        reason: checkpointData.reason,
        data: checkpointData
      });

      return { id, timestamp, progress: checkpointData.progress };

    } catch (error) {
      logger.error(`Failed to save checkpoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest checkpoint for a task
   */
  async getLatestCheckpoint(taskId) {
    try {
      const checkpoint = await this.memory.queryOne(
        `SELECT * FROM task_checkpoints 
         WHERE task_id = ? 
         ORDER BY checkpoint_number DESC 
         LIMIT 1`,
        [taskId]
      );

      if (checkpoint) {
        return {
          id: checkpoint.id,
          taskId: checkpoint.task_id,
          checkpointNumber: checkpoint.checkpoint_number,
          progress: checkpoint.progress_percent,
          state: JSON.parse(checkpoint.state_data || '{}'),
          output: JSON.parse(checkpoint.output_data || '{}'),
          reason: checkpoint.reason,
          timestamp: checkpoint.timestamp
        };
      }

      return null;

    } catch (error) {
      logger.error(`Failed to retrieve checkpoint: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all checkpoints for a task (for debugging/analysis)
   */
  async getAllCheckpoints(taskId) {
    try {
      const checkpoints = await this.memory.queryAll(
        `SELECT * FROM task_checkpoints 
         WHERE task_id = ? 
         ORDER BY checkpoint_number ASC`,
        [taskId]
      );

      return checkpoints.map(cp => ({
        id: cp.id,
        checkpointNumber: cp.checkpoint_number,
        progress: cp.progress_percent,
        reason: cp.reason,
        timestamp: cp.timestamp
      }));

    } catch (error) {
      logger.error(`Failed to retrieve checkpoints: ${error.message}`);
      return [];
    }
  }

  /**
   * Resume task from checkpoint
   * Returns the saved state for task to restore
   */
  async resumeFromCheckpoint(taskId) {
    try {
      const checkpoint = await this.getLatestCheckpoint(taskId);

      if (!checkpoint) {
        logger.warn(`No checkpoint found for task ${taskId}`);
        return null;
      }

      logger.info(`Resuming task ${taskId} from checkpoint (${checkpoint.progress}% complete)`);

      return {
        checkpoint,
        state: checkpoint.state,
        output: checkpoint.output,
        progress: checkpoint.progress,
        instructions: {
          resumeFrom: checkpoint.progress,
          skipToCheckpoint: checkpoint.checkpointNumber,
          restoreState: checkpoint.state
        }
      };

    } catch (error) {
      logger.error(`Failed to resume from checkpoint: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean up checkpoints for completed tasks
   */
  async cleanupCheckpoints(taskId) {
    try {
      await this.memory.run(
        `DELETE FROM task_checkpoints WHERE task_id = ?`,
        [taskId]
      );

      this.activeCheckpoints.delete(taskId);
      this.checkpointCallbacks.delete(taskId);

      logger.debug(`Checkpoints cleaned up for task ${taskId}`);

    } catch (error) {
      logger.error(`Failed to cleanup checkpoints: ${error.message}`);
    }
  }

  /**
   * Get checkpoint statistics for analysis
   */
  async getCheckpointStats(taskId) {
    try {
      const checkpoints = await this.getAllCheckpoints(taskId);

      if (checkpoints.length === 0) {
        return { totalCheckpoints: 0 };
      }

      const reasons = {};
      checkpoints.forEach(cp => {
        reasons[cp.reason] = (reasons[cp.reason] || 0) + 1;
      });

      return {
        totalCheckpoints: checkpoints.length,
        progressRange: {
          min: Math.min(...checkpoints.map(c => c.progress)),
          max: Math.max(...checkpoints.map(c => c.progress))
        },
        reasonBreakdown: reasons,
        timeSpan: {
          first: checkpoints[0].timestamp,
          last: checkpoints[checkpoints.length - 1].timestamp
        }
      };

    } catch (error) {
      logger.error(`Failed to get checkpoint stats: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Estimate progress toward completion
   * Useful for ETA calculations
   */
  async estimateCompletion(taskId, totalEstimatedDuration) {
    try {
      const checkpoint = await this.getLatestCheckpoint(taskId);

      if (!checkpoint) {
        return {
          progressPercent: 0,
          estimatedTimeRemaining: totalEstimatedDuration
        };
      }

      const progress = checkpoint.progress;
      const timeRemaining = totalEstimatedDuration * ((100 - progress) / 100);

      return {
        progressPercent: progress,
        estimatedTimeRemaining: timeRemaining,
        lastCheckpoint: checkpoint.timestamp
      };

    } catch (error) {
      logger.error(`Failed to estimate completion: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Batch operations: save multiple checkpoints efficiently
   */
  async batchSaveCheckpoints(taskCheckpoints) {
    const results = [];

    for (const { taskId, checkpointData } of taskCheckpoints) {
      try {
        const result = await this.saveCheckpoint(taskId, checkpointData);
        results.push({ taskId, success: true, result });
      } catch (error) {
        results.push({ taskId, success: false, error: error.message });
      }
    }

    return results;
  }
}
