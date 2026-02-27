/**
 * Eco Agent Client Library
 * Use this from your web app to submit tasks to the agent
 * 
 * Usage:
 * import { AgentClient } from './agentClient.js';
 * const client = new AgentClient('http://localhost:3001');
 * await client.submitTask('database-cleanup', {}, 'low');
 */

export class AgentClient {
  constructor(agentUrl = 'http://localhost:3001') {
    this.agentUrl = agentUrl;
  }

  /**
   * Submit a task for deferred execution
   * @param {string} taskName - Name of task (must be whitelisted)
   * @param {object} taskData - Task parameters
   * @param {string} urgency - 'critical' | 'high' | 'normal' | 'low'
   * @returns {Promise<{taskId, status, scheduledFor, estimatedPowerCost}>}
   */
  async submitTask(taskName, taskData = {}, urgency = 'normal') {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName,
          taskData,
          urgency
        })
      });

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit task:', error);
      throw error;
    }
  }

  /**
   * Record user feedback on a task
   * @param {string} taskId - Task ID returned from submitTask
   * @param {string} feedbackType - 'necessary' | 'avoidable' | 'optimizable'
   * @param {string} notes - Optional user notes
   */
  async recordFeedback(taskId, feedbackType, notes = '') {
    try {
      const response = await fetch(`${this.agentUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          feedbackType,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to record feedback:', error);
      throw error;
    }
  }

  /**
   * Get agent status
   * @returns {Promise<{isRunning, queue, whitelistedTasks, timestamp}>}
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.agentUrl}/api/status`);

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get agent status:', error);
      throw error;
    }
  }

  /**
   * Get task details
   * @param {string} taskId - Task ID
   * @returns {Promise<Task object>}
   */
  async getTask(taskId) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get task:', error);
      throw error;
    }
  }

  /**
   * Get task history
   * @param {number} limit - Number of recent tasks
   * @returns {Promise<Array<Task>>}
   */
  async getTaskHistory(limit = 10) {
    try {
      const response = await fetch(
        `${this.agentUrl}/api/tasks/history?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get task history:', error);
      throw error;
    }
  }
}

/**
 * React Hook for using Agent Client
 * 
 * Usage in component:
 * const { submitTask, feedback, status } = useAgent();
 * 
 * // Submit task
 * const result = await submitTask('database-cleanup', {}, 'low');
 * 
 * // After user confirms task worked well
 * await feedback(result.taskId, 'necessary');
 */
export function useAgent(agentUrl = 'http://localhost:3001') {
  const client = new AgentClient(agentUrl);

  return {
    // Submit task
    submitTask: async (name, data, urgency) => {
      return await client.submitTask(name, data, urgency);
    },

    // Record feedback
    recordFeedback: async (taskId, type, notes) => {
      return await client.recordFeedback(taskId, type, notes);
    },

    // Get status
    getStatus: async () => {
      return await client.getStatus();
    },

    // Get task
    getTask: async (taskId) => {
      return await client.getTask(taskId);
    },

    // Get history
    getTaskHistory: async (limit) => {
      return await client.getTaskHistory(limit);
    }
  };
}

export default AgentClient;
