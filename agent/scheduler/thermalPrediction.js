/**
 * Thermal Prediction Module
 * 
 * Predicts if a task will thermally damage the device BEFORE execution.
 * Uses task power rating, device cooling capacity, current temperature,
 * and execution time to forecast peak temperature.
 * 
 * Goals:
 * - Prevent wasting energy on tasks that will overheat
 * - Segment heavy tasks before they cause damage
 * - Guide task scheduling to optimal windows
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class ThermalPrediction {
  constructor(sharedMemory, thermalMonitor) {
    this.memory = sharedMemory;
    this.thermal = thermalMonitor;

    // Pre-flight check cache (task → prediction result)
    this.predictionCache = new Map();
    this.cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Pre-flight thermal check: Will this task overheat the device?
   * 
   * Returns: {
   *   safeToRun: boolean,
   *   peakTempEstimate: number,      // Predicted peak temperature
   *   peakTempTime: number,          // Minutes until peak
   *   safetyMargin: number,          // °C below critical threshold
   *   reason: string,
   *   recommendation: 'PROCEED' | 'WAIT_FOR_COOLING' | 'BREAK_INTO_SEGMENTS' | 'SKIP'
   * }
   */
  async preFlightThermalCheck(task, deviceProfile) {
    try {
      // Check cache first
      const cached = this.predictionCache.get(task.id);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
        return cached.result;
      }

      // Get current conditions
      const currentTemp = await this.thermal.getSystemTemperature();
      const avgTemp = currentTemp.average || currentTemp.cpu || 30;

      // Get device capabilities
      const profile = deviceProfile || await this.getDefaultProfile();

      // Estimate task heat generation
      const taskHeat = this.estimateTaskHeatGeneration(task, profile);

      // Predict temperature trajectory
      const prediction = this.predictTemperatureTrajectory(
        avgTemp,
        taskHeat,
        task.estimatedDurationSeconds || 3600, // Default 1 hour
        profile
      );

      // Determine safety
      const result = this.assessThermalSafety(prediction, task, profile);

      // Cache result
      this.predictionCache.set(task.id, {
        timestamp: Date.now(),
        result
      });

      return result;

    } catch (error) {
      logger.error(`Pre-flight thermal check failed: ${error.message}`);
      return {
        safeToRun: true,
        peakTempEstimate: 0,
        reason: 'Unable to predict, defaulting to safe',
        recommendation: 'PROCEED',
        error: error.message
      };
    }
  }

  /**
   * Estimate how much heat a task will generate
   * 
   * Returns: {
   *   baselinePowerWatts: number,
   *   heatGeneratedWatts: number,   // Portion that becomes heat (typically 70-90%)
   *   variability: 'stable' | 'fluctuating' | 'spiky'
   *   hotspots: ['GPU' | 'CPU' | 'SSD'] // Which components generate most heat
   * }
   */
  estimateTaskHeatGeneration(task, deviceProfile) {
    // Start with task power rating
    let baselinePower = task.estimatedPowerWatts || 50; // Default 50W

    // Adjust for task type
    const typeMultipliers = {
      'ml-training': 1.8,        // Very power-hungry
      'video-encoding': 1.6,     // High sustained power
      'rendering': 1.5,          // High power
      'database-query': 0.6,     // Lower power
      'data-processing': 1.2,    // Moderate power
      'download': 0.3,           // Network, low heat
      'archive-backup': 0.8,     // I/O intensive
      'cleanup': 0.4,            // Low intensity
      default: 1.0
    };

    const multiplier = typeMultipliers[task.type] || typeMultipliers['default'];
    baselinePower *= multiplier;

    // Device thermal efficiency (some devices waste more as heat)
    // Fanless laptops: ~90% becomes heat
    // Workstations with cooling: ~70% becomes heat
    const thermalEfficiency = deviceProfile.thermalEfficiency || 0.8;
    const heatGenerated = baselinePower * thermalEfficiency;

    // Determine variability
    let variability = 'stable';
    if (task.type === 'rendering' || task.type === 'ml-training') {
      variability = 'fluctuating';
    }
    if (task.type === 'video-encoding') {
      variability = 'spiky';
    }

    // Identify hotspots
    const hotspots = [];
    if (baselinePower > 100) hotspots.push('GPU', 'CPU');
    else if (baselinePower > 50) hotspots.push('CPU');

    if (task.type === 'archive-backup' || task.type === 'database-query') {
      hotspots.push('SSD');
    }

    return {
      baselinePowerWatts: baselinePower,
      heatGeneratedWatts: heatGenerated,
      variability,
      hotspots: hotspots.length > 0 ? hotspots : ['CPU']
    };
  }

  /**
   * Predict temperature trajectory during task execution
   * 
   * Returns: {
   *   startTemp: number,
   *   peakTemp: number,
   *   peakTempTime: number,        // Minutes into execution when peak reached
   *   endTemp: number,             // Temperature when task completes
   *   trajectory: 'linear' | 'exponential' | 'asymptotic'
   * }
   */
  predictTemperatureTrajectory(startTemp, taskHeat, durationSeconds, deviceProfile) {
    const duration = durationSeconds / 60; // Convert to minutes

    // Heat accumulation rate (°C per minute)
    // Depends on: power / (device thermal mass * cooling effectiveness)
    const coolingRate = deviceProfile.coolingRate || 1.5; // °C/min
    const thermalMass = deviceProfile.thermalMass || 1.0; // Relative capacity to absorb heat
    const coolingEffectiveness = deviceProfile.coolingEffectiveness || 0.8; // 0-1

    // During load: heating rate vs cooling rate determines net change
    const heatingRate = (taskHeat.heatGeneratedWatts / 100) * (1 / thermalMass); // Rough estimate: °C/min

    // Peak occurs when heating = cooling (asymptotic approach)
    const steadyStateTemp = startTemp + (heatingRate / coolingEffectiveness);

    let peakTemp, peakTempTime, trajectory;

    // Model 1: Linear rise (simple devices)
    if (thermalMass < 0.5) {
      peakTemp = startTemp + (heatingRate * Math.min(duration, 30)); // Rise for up to 30 min
      peakTempTime = Math.min(duration, 30);
      trajectory = 'linear';
    }
    // Model 2: Asymptotic (most devices)
    else if (thermalMass < 2.0) {
      // Temperature rises exponentially then levels off
      peakTemp = steadyStateTemp * (1 - Math.exp(-duration / (thermalMass * 10))); // Approach asymptote
      peakTempTime = duration * 0.6; // Peak usually around 60% into task
      trajectory = 'asymptotic';
    }
    // Model 3: Exponential then plateau (heavy cooling systems)
    else {
      peakTemp = steadyStateTemp * (1 - Math.exp(-duration / (thermalMass * 20)));
      peakTempTime = duration * 0.7;
      trajectory = 'exponential';
    }

    // Cooling after task completes
    const coolingDuration = 5; // 5 minutes of cooling after task
    const endTemp = peakTemp - (coolingRate * coolingEffectiveness * Math.min(coolingDuration, duration * 0.1));

    return {
      startTemp,
      peakTemp: Math.min(peakTemp, 120), // Cap at physical limit
      peakTempTime,
      endTemp: Math.max(endTemp, startTemp - 5), // Can't go below start - 5°C
      trajectory
    };
  }

  /**
   * Assess if predicted temperature is safe
   */
  assessThermalSafety(prediction, task, deviceProfile) {
    const criticalTemp = deviceProfile.criticalThreshold || 80;
    const warningTemp = deviceProfile.warningThreshold || 70;
    const safeTemp = deviceProfile.safeThreshold || 60;

    const peakTemp = prediction.peakTemp;
    const margin = criticalTemp - peakTemp;

    // Determine recommendation
    let recommendation, reason, safeToRun;

    if (peakTemp > criticalTemp) {
      safeToRun = false;
      recommendation = 'SKIP';
      reason = `UNSAFE: Peak temperature ${peakTemp.toFixed(1)}°C exceeds critical threshold (${criticalTemp}°C)`;
    } else if (peakTemp > warningTemp) {
      // Check if task can be segmented
      if (task.segmentable) {
        safeToRun = true;
        recommendation = 'BREAK_INTO_SEGMENTS';
        reason = `Near warning: Peak ${peakTemp.toFixed(1)}°C. Task can be split into segments to reduce peak load.`;
      } else {
        safeToRun = false;
        recommendation = 'WAIT_FOR_COOLING';
        reason = `Task would reach warning temperature (${peakTemp.toFixed(1)}°C > ${warningTemp}°C) and cannot be segmented. Wait for device cooling.`;
      }
    } else if (peakTemp > safeTemp) {
      safeToRun = true;
      recommendation = 'PROCEED';
      reason = `Acceptable: Peak temperature ${peakTemp.toFixed(1)}°C is in safe range`;
    } else {
      safeToRun = true;
      recommendation = 'PROCEED';
      reason = `Optimal: Peak temperature ${peakTemp.toFixed(1)}°C is well within safe range`;
    }

    return {
      safeToRun,
      peakTempEstimate: peakTemp,
      peakTempTime: prediction.peakTempTime,
      safetyMargin: margin,
      reason,
      recommendation,
      trajectory: prediction.trajectory,
      timeline: prediction
    };
  }

  /**
   * Get default device profile (used if not specified)
   */
  async getDefaultProfile() {
    // Try to load from database
    try {
      const deviceId = process.env.DEVICE_ID || 'default';
      const profile = await this.memory.queryOne(
        `SELECT * FROM device_profiles WHERE device_id = ?`,
        [deviceId]
      );

      if (profile) {
        return JSON.parse(profile.config);
      }
    } catch (error) {
      logger.warn(`Could not load device profile: ${error.message}`);
    }

    // Return generic profile
    return {
      name: 'Generic Device',
      thermalMass: 1.0,
      coolingRate: 1.5,        // °C per minute
      coolingEffectiveness: 0.8, // 0-1 scale
      thermalEfficiency: 0.8,  // % of power becoming heat
      criticalThreshold: 80,   // Stop everything
      warningThreshold: 70,    // Avoid power-hungry tasks
      safeThreshold: 60,       // OK for most tasks
      optimalMaxTemp: 45
    };
  }

  /**
   * Save device profile to database
   */
  async saveDeviceProfile(deviceId, profileConfig) {
    try {
      const id = uuidv4();
      await this.memory.run(
        `INSERT OR REPLACE INTO device_profiles (id, device_id, config, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, deviceId, JSON.stringify(profileConfig)]
      );
      logger.info(`Device profile saved: ${deviceId}`);
    } catch (error) {
      logger.error(`Failed to save device profile: ${error.message}`);
    }
  }

  /**
   * Get predicted wait time until task is safe to run
   * Useful for WAIT_FOR_COOLING recommendation
   */
  async getWaitTimeUntilSafe(task, deviceProfile) {
    try {
      const currentTemp = await this.thermal.getSystemTemperature();
      const avgTemp = currentTemp.average || currentTemp.cpu || 30;
      const profile = deviceProfile || await this.getDefaultProfile();

      // How much cooling is needed?
      let checkTemp = avgTemp;
      let minutesUntilSafe = 0;
      const safeTemp = profile.safeThreshold || 60;

      while (checkTemp > safeTemp && minutesUntilSafe < 60) {
        checkTemp -= profile.coolingRate;
        minutesUntilSafe++;
      }

      return {
        minutesUntilSafe,
        currentTemp: avgTemp,
        targetTemp: safeTemp,
        coolingRate: profile.coolingRate
      };
    } catch (error) {
      logger.error(`Error calculating wait time: ${error.message}`);
      return { minutesUntilSafe: 10, error: error.message };
    }
  }

  /**
   * Recommend task segmentation strategy
   * 
   * For tasks that will overheat but CAN be segmented,
   * suggest how to break them up.
   */
  recommendSegmentation(task, prediction, deviceProfile) {
    const profile = deviceProfile || { safeThreshold: 60 };
    const safeTemp = profile.safeThreshold;
    const peakTemp = prediction.peakTemp;
    const tempOverage = peakTemp - safeTemp;

    // Each segment can run cooler since peak is lower per segment
    // Rough estimate: segmenting into N pieces reduces peak by ~sqrt(N)
    const segmentsNeeded = Math.ceil((tempOverage / 10) ** 2);

    return {
      segmentsRecommended: Math.max(2, segmentsNeeded),
      rationale: `Peak exceeds safe temp by ${tempOverage.toFixed(1)}°C. Recommend ${segmentsNeeded} segments.`,
      strategy: 'PAUSE_AND_RESUME',
      segments: this.createSegmentPlan(task, Math.max(2, segmentsNeeded))
    };
  }

  /**
   * Create a segment plan for a task
   */
  createSegmentPlan(task, numSegments) {
    const totalDuration = task.estimatedDurationSeconds || 3600;
    const segmentDuration = totalDuration / numSegments;
    const segments = [];

    for (let i = 0; i < numSegments; i++) {
      segments.push({
        segmentId: i + 1,
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
        durationSeconds: segmentDuration,
        checkpointRequired: i < numSegments - 1, // Save state between segments
        coolingBreakAfterSeconds: 300 // 5 min cooling between segments
      });
    }

    return segments;
  }

  /**
   * Clear prediction cache for a task (when conditions change)
   */
  clearPredictionCache(taskId) {
    this.predictionCache.delete(taskId);
  }

  /**
   * Clear all cached predictions
   */
  clearAllPredictions() {
    this.predictionCache.clear();
  }
}
