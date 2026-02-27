/**
 * Task Routing Service
 * Bridge between browser app and eco-agent with thermal prediction & segmentation
 * 
 * Provides:
 * - Task submission with thermal prediction
 * - Job status monitoring
 * - Real-time thermal monitoring
 * - Project action mode integration
 */

export class TaskRoutingService {
  constructor(agentUrl = 'http://localhost:3001') {
    this.agentUrl = agentUrl;
    this.statusCache = null;
    this.lastStatusUpdate = 0;
    this.statusCacheDuration = 5000; // 5 seconds
  }

  /**
   * Submit a project as a task with thermal prediction
   * 
   * @param {object} project - Project object { id, name, code, estimatedPowerWatts, estimatedDurationSeconds }
   * @param {object} options - { urgency, deviceProfile, autoSegment }
   * @returns {Promise<{taskId, prediction, recommendation, scheduledFor}>}
   */
  async submitProjectAsTask(project, options = {}) {
    try {
      const {
        urgency = 'normal',
        deviceProfile = 'auto',
        autoSegment = true
      } = options;

      const response = await fetch(`${this.agentUrl}/api/tasks/submit-with-prediction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          taskData: {
            code: project.code,
            estimatedPowerWatts: project.estimatedPowerWatts || 100,
            estimatedDurationSeconds: project.estimatedDurationSeconds || 3600,
            segmentable: project.segmentable !== false
          },
          urgency,
          deviceProfile,
          autoSegment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Task submission failed: ${response.statusText}`);
      }

      return await response.json();
      // Returns: {
      //   taskId,
      //   prediction: { peakTempEstimate, recommendation, safetyMargin },
      //   decision: { action: 'ACCEPT' | 'SEGMENT' | 'DEFER' | 'SKIP' },
      //   segments: [...] if SEGMENT,
      //   scheduledFor,
      //   estimatedPowerCost
      // }
    } catch (error) {
      console.error('Failed to submit project as task:', error);
      throw error;
    }
  }

  /**
   * Submit multiple projects as a batch
   * 
   * @param {array} projects - Array of project objects
   * @param {object} options - { urgency, deviceProfile, autoSegment }
   * @returns {Promise<array>} Array of submission results
   */
  async submitProjectBatch(projects, options = {}) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: projects.map(p => ({
            projectId: p.id,
            projectName: p.name,
            taskData: {
              code: p.code,
              estimatedPowerWatts: p.estimatedPowerWatts || 100,
              estimatedDurationSeconds: p.estimatedDurationSeconds || 3600
            }
          })),
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Batch submission failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit batch:', error);
      throw error;
    }
  }

  /**
   * Get thermal prediction for a project WITHOUT submitting it
   * 
   * @param {object} project - Project object
   * @param {string} deviceProfile - Device profile name
   * @returns {Promise<{peakTempEstimate, recommendation, segments, safetyMargin}>}
   */
  async getThermalPrediction(project, deviceProfile = 'auto') {
    try {
      const response = await fetch(`${this.agentUrl}/api/predict/thermal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          taskData: {
            estimatedPowerWatts: project.estimatedPowerWatts || 100,
            estimatedDurationSeconds: project.estimatedDurationSeconds || 3600,
            type: project.taskType || 'generic'
          },
          deviceProfile
        })
      });

      if (!response.ok) {
        throw new Error(`Thermal prediction failed: ${response.statusText}`);
      }

      return await response.json();
      // Returns: {
      //   peakTempEstimate: 72,
      //   recommendation: 'PROCEED' | 'SEGMENT' | 'WAIT' | 'SKIP',
      //   segmentsRecommended: 2,
      //   segments: [...],
      //   safetyMargin: -8,
      //   reason: "Peak exceeds safe threshold..."
      // }
    } catch (error) {
      console.error('Failed to get thermal prediction:', error);
      throw error;
    }
  }

  /**
   * Get status of agent and tasks
   * 
   * @returns {Promise<{isRunning, queue, thermalStatus, currentDevice}>}
   */
  async getAgentStatus() {
    try {
      // Use cache if fresh
      const now = Date.now();
      if (this.statusCache && (now - this.lastStatusUpdate) < this.statusCacheDuration) {
        return this.statusCache;
      }

      const response = await fetch(`${this.agentUrl}/api/status`);

      if (!response.ok) {
        throw new Error(`Status request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.statusCache = data;
      this.lastStatusUpdate = now;

      return data;
      // Returns: {
      //   isRunning: true,
      //   queue: { pending: 5, active: 2, completed: 42 },
      //   thermalStatus: { currentTemp: 45, status: 'safe' },
      //   currentDevice: { name: 'Fanless laptop', thermalMass: 0.6 },
      //   delegationHours: { active: true, nextWindow: '09:00' }
      // }
    } catch (error) {
      console.error('Failed to get agent status:', error);
      throw error;
    }
  }

  /**
   * Get task execution status
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<{status, progress, thermalData, checkpoint, estimatedCompletion}>}
   */
  async getTaskStatus(taskId) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`Task status request failed: ${response.statusText}`);
      }

      return await response.json();
      // Returns: {
      //   taskId,
      //   status: 'pending' | 'active' | 'completed' | 'failed' | 'aborted',
      //   progress: 75,
      //   thermalData: { currentTemp: 72, peakTemp: 75, alerts: 2 },
      //   checkpoint: { number: 3, savedAt: '2026-01-20T10:30:00Z' },
      //   estimatedCompletion: '2026-01-20T11:45:00Z'
      // }
    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }

  /**
   * Cancel/abort a running task
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<{taskId, status, reason}>}
   */
  async abortTask(taskId) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/${taskId}/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Abort request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to abort task:', error);
      throw error;
    }
  }

  /**
   * Pause a running task (saves checkpoint)
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<{taskId, status, checkpoint}>}
   */
  async pauseTask(taskId) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/${taskId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Pause request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to pause task:', error);
      throw error;
    }
  }

  /**
   * Resume a paused task from checkpoint
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<{taskId, status, resumedFrom}>}
   */
  async resumeTask(taskId) {
    try {
      const response = await fetch(`${this.agentUrl}/api/tasks/${taskId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Resume request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to resume task:', error);
      throw error;
    }
  }

  /**
   * Get list of available device profiles
   * 
   * @returns {Promise<array>} Array of device profile configurations
   */
  async getDeviceProfiles() {
    try {
      const response = await fetch(`${this.agentUrl}/api/device-profiles`);

      if (!response.ok) {
        throw new Error(`Device profiles request failed: ${response.statusText}`);
      }

      return await response.json();
      // Returns: [
      //   { id: 'fanless-laptop', name: 'Fanless ultrabook', thermalMass: 0.6, ... },
      //   { id: 'laptop-fan', name: 'MacBook with fan', thermalMass: 1.0, ... },
      //   { id: 'workstation', name: 'Desktop workstation', thermalMass: 2.5, ... }
      // ]
    } catch (error) {
      console.error('Failed to get device profiles:', error);
      throw error;
    }
  }

  /**
   * Get real-time thermal data
   * 
   * @returns {Promise<{currentTemp, peakTemp, status, coolingRate, timeUntilSafe}>}
   */
  async getThermalData() {
    try {
      const response = await fetch(`${this.agentUrl}/api/thermal/current`);

      if (!response.ok) {
        throw new Error(`Thermal data request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get thermal data:', error);
      throw error;
    }
  }

  /**
   * WebSocket stream for real-time updates
   * 
   * @param {function} onMessage - Callback for messages
   * @param {function} onError - Callback for errors
   * @returns {WebSocket}
   */
  createLiveStream(onMessage, onError) {
    try {
      const wsUrl = this.agentUrl.replace('http', 'ws') + '/ws/live';
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket stream:', error);
      throw error;
    }
  }

  /**
   * Get task execution history
   * 
   * @param {object} options - { limit, status, projectId, dateRange }
   * @returns {Promise<array>}
   */
  async getTaskHistory(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);
      if (options.projectId) params.append('projectId', options.projectId);

      const response = await fetch(`${this.agentUrl}/api/tasks/history?${params}`);

      if (!response.ok) {
        throw new Error(`History request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get task history:', error);
      throw error;
    }
  }
}

export default TaskRoutingService;
