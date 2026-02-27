/**
 * Renewable Energy & Grid Carbon Intensity Module
 * 
 * Provides real-time data on:
 * - Grid carbon intensity (kg CO2 per kWh)
 * - Renewable energy percentage
 * - Solar/wind generation availability
 * - Direct solar connection status
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class RenewableEnergyModule {
  constructor(sharedMemory) {
    this.memory = sharedMemory;
    this.providers = new Map();
    this.config = {
      maxGridCarbonIntensity: 500, // kg CO2/MWh - defer if above this
      minRenewablePercent: 40, // Execute if >=40% renewable
      solarPeakHours: [9, 10, 11, 12, 13, 14, 15], // 9 AM - 3 PM
      windPeakHours: [0, 1, 2, 3, 4, 5, 6], // Night (wind often peaks)
      directSolarWatts: 0 // 0 = no direct solar, >0 = connected capacity
    };

    this.registerProviders();
  }

  registerProviders() {
    // Register data providers (can mix multiple sources)
    this.providers.set('carbonintensity', new CarbonIntensityProvider());
    this.providers.set('solar', new SolarForecastProvider());
    this.providers.set('local', new LocalEnergyProvider());
  }

  /**
   * Get current grid status - the main decision point
   * Returns: { score, reasoning, shouldExecuteNow, optimalWindows }
   */
  async getGridStatus(taskUrgency = 'normal') {
    try {
      const gridData = await this.getGridCarbonIntensity();
      const renewableStatus = await this.getRenewableStatus();
      const solarStatus = await this.getSolarStatus();
      const directSolarActive = this.isDirectSolarActive();

      // Score: higher = better for execution (0-100)
      let score = 50; // Baseline

      // Carbon intensity factor (most important)
      if (gridData.carbonIntensity < 200) {
        score += 30; // Very clean grid (hydro, nuclear, wind)
      } else if (gridData.carbonIntensity < 400) {
        score += 15; // Moderate (some coal/gas mix)
      } else if (gridData.carbonIntensity > 600) {
        score -= 30; // Very dirty (coal-heavy)
      }

      // Renewable percentage
      if (renewableStatus.renewablePercent >= 60) {
        score += 25;
      } else if (renewableStatus.renewablePercent >= 40) {
        score += 12;
      } else if (renewableStatus.renewablePercent < 20) {
        score -= 20;
      }

      // Solar availability (if not using direct solar)
      if (!directSolarActive && solarStatus.isSolarPeak) {
        score += 15;
      }

      // Wind availability (especially at night)
      if (renewableStatus.windPercent > 20) {
        score += 10;
      }

      // Direct solar connection (highest priority)
      if (directSolarActive) {
        score += 40; // Massive boost - zero grid impact
      }

      const reasoning = this.buildReasoning(gridData, renewableStatus, solarStatus, directSolarActive, score);

      return {
        score: Math.min(100, Math.max(0, score)),
        reasoning,
        gridData,
        renewableStatus,
        solarStatus,
        directSolarActive,
        shouldExecuteNow: this.shouldExecuteNow(score, taskUrgency),
        optimalWindows: await this.findOptimalWindows(taskUrgency)
      };
    } catch (error) {
      logger.warn(`Grid status error: ${error.message} - using fallback`);
      return this.getFallbackStatus();
    }
  }

  /**
   * Get current grid carbon intensity
   * Sources: Electricity Maps, WattTime, national grid operators
   */
  async getGridCarbonIntensity() {
    try {
      // Try multiple providers
      const providers = ['carbonintensity', 'local'];

      for (const providerName of providers) {
        const provider = this.providers.get(providerName);
        if (provider) {
          const data = await provider.getCarbonIntensity();
          if (data) {
            await this.storeGridMetrics(data);
            return data;
          }
        }
      }

      // Fallback to historical average
      return {
        carbonIntensity: 400, // kg CO2/MWh (conservative estimate)
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Carbon intensity fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get renewable energy percentage
   */
  async getRenewableStatus() {
    try {
      const provider = this.providers.get('carbonintensity');
      const data = await provider.getRenewableStatus();

      return {
        renewablePercent: data.renewablePercent || 35,
        solarPercent: data.solarPercent || 10,
        windPercent: data.windPercent || 15,
        hydroPercent: data.hydroPercent || 10,
        source: data.source || 'fallback',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn(`Renewable status fetch failed: ${error.message}`);
      return {
        renewablePercent: 35,
        solarPercent: 10,
        windPercent: 15,
        hydroPercent: 10,
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get solar forecast
   */
  async getSolarStatus() {
    const hour = new Date().getHours();
    const isSolarPeak = this.config.solarPeakHours.includes(hour);

    try {
      const provider = this.providers.get('solar');
      const forecast = await provider.getSolarForecast();

      return {
        isSolarPeak,
        solarForecastPercent: forecast.percentOfNormal || 50,
        cloudCover: forecast.cloudCover || 50,
        sunsetHour: forecast.sunsetHour || 17,
        sunriseHour: forecast.sunriseHour || 7,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn(`Solar forecast fetch failed: ${error.message}`);
      return {
        isSolarPeak,
        solarForecastPercent: 50,
        cloudCover: 50,
        sunsetHour: 17,
        sunriseHour: 7,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if device is connected to direct solar
   * Requires user configuration in .env: DIRECT_SOLAR_WATTS=5000 (for 5kW system)
   */
  isDirectSolarActive() {
    const solarCapacity = this.config.directSolarWatts || 0;

    if (solarCapacity === 0) {
      return false;
    }

    // Check if it's solar generation hours (rough estimate)
    const hour = new Date().getHours();
    const isSolarHours = hour >= 7 && hour <= 19;

    if (!isSolarHours) {
      return false;
    }

    // Check solar forecast
    const today = new Date();
    const cloudCover = this.getApproximateCloudCover(today);

    // Only active if cloud cover <50% during solar hours
    return cloudCover < 50;
  }

  /**
   * Decide if task should execute now
   */
  shouldExecuteNow(score, urgency = 'normal') {
    const urgencyThresholds = {
      critical: 20, // Execute even if grid dirty
      high: 50,
      normal: 65,
      low: 80 // Only execute if grid very clean
    };

    const threshold = urgencyThresholds[urgency] || 65;
    return score >= threshold;
  }

  /**
   * Find optimal windows for execution
   * Looks ahead at grid forecasts
   */
  async findOptimalWindows(urgency = 'normal', daysAhead = 7) {
    const windows = [];
    const now = new Date();

    for (let day = 0; day < daysAhead; day++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + day);

      // Check solar peak
      if (this.isDirectSolarActive()) {
        // Prefer solar peak hours
        candidate.setHours(12, 0, 0, 0); // Noon
        windows.push({
          time: new Date(candidate),
          reason: 'Direct solar peak generation',
          priority: 1 // Highest priority
        });
      }

      // Check for clean grid windows (historically low carbon)
      const hour = this.getOptimalGridHour(day);
      if (hour) {
        candidate.setHours(hour, 0, 0, 0);
        windows.push({
          time: new Date(candidate),
          reason: 'Historically clean grid hour',
          priority: 2
        });
      }

      // Fallback: off-peak hours
      candidate.setHours(3, 0, 0, 0);
      windows.push({
        time: new Date(candidate),
        reason: 'Traditional off-peak hour',
        priority: 3
      });
    }

    return windows.slice(0, 5); // Return top 5 options
  }

  /**
   * Get historically optimal grid hour for given day
   */
  getOptimalGridHour(dayOffset = 0) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + dayOffset);
    const dayOfWeek = candidate.getDay();

    // Heuristic: Solar peaks 12-2 PM, Wind peaks early morning/evening
    // Hydro-heavy regions: night hours
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 13; // Weekend noon (solar)
    }

    return 3; // Weekday 3 AM (traditionally low demand)
  }

  /**
   * Store grid metrics in database for learning
   */
  async storeGridMetrics(data) {
    try {
      await this.memory.run(
        `INSERT INTO grid_metrics 
        (id, timestamp, carbon_intensity, renewable_percent, source, data) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          new Date().toISOString(),
          data.carbonIntensity || 0,
          data.renewablePercent || 0,
          data.source,
          JSON.stringify(data)
        ]
      );
    } catch (error) {
      logger.debug(`Failed to store grid metrics: ${error.message}`);
    }
  }

  /**
   * Build human-readable reasoning
   */
  buildReasoning(gridData, renewableStatus, solarStatus, directSolar, score) {
    const reasons = [];

    if (directSolar) {
      reasons.push('✨ Direct solar connection active');
    }

    if (renewableStatus.renewablePercent > 50) {
      reasons.push(`🌬️ ${renewableStatus.renewablePercent}% renewable energy`);
    } else if (renewableStatus.renewablePercent < 30) {
      reasons.push(`⚠️ Only ${renewableStatus.renewablePercent}% renewable`);
    }

    if (gridData.carbonIntensity < 300) {
      reasons.push(`✅ Clean grid (${gridData.carbonIntensity} kg CO2/MWh)`);
    } else if (gridData.carbonIntensity > 500) {
      reasons.push(`❌ Dirty grid (${gridData.carbonIntensity} kg CO2/MWh) - consider deferring`);
    }

    if (solarStatus.isSolarPeak && !directSolar) {
      reasons.push('☀️ Solar generation peak hours');
    }

    if (renewableStatus.windPercent > 25) {
      reasons.push(`💨 Strong wind generation (${renewableStatus.windPercent}%)`);
    }

    return reasons.join(' → ');
  }

  /**
   * Approximate cloud cover (fallback)
   */
  getApproximateCloudCover(date) {
    // Simplified: assume ~30% cloud cover on average
    // In production, use weather API
    return 30 + Math.random() * 40; // 30-70%
  }

  /**
   * Fallback if APIs unavailable
   */
  getFallbackStatus() {
    return {
      score: 50,
      reasoning: '⚠️ Grid data unavailable - using fallback conservative estimate',
      gridData: { carbonIntensity: 400, source: 'fallback' },
      renewableStatus: { renewablePercent: 35, source: 'fallback' },
      solarStatus: { isSolarPeak: false },
      directSolarActive: false,
      shouldExecuteNow: false,
      optimalWindows: [
        {
          time: new Date(Date.now() + 24 * 3600000),
          reason: 'Next 3 AM (off-peak fallback)',
          priority: 3
        }
      ]
    };
  }

  /**
   * Configure energy source preferences
   * Can be called to adjust scheduling based on user's renewable setup
   */
  configureEnergySource(config) {
    this.config = { ...this.config, ...config };
    logger.info('Energy source configured', {
      directSolarWatts: this.config.directSolarWatts,
      maxGridCarbonIntensity: this.config.maxGridCarbonIntensity,
      minRenewablePercent: this.config.minRenewablePercent
    });
  }

  /**
   * Get statistics on grid carbon over time
   */
  async getGridStatistics(days = 30) {
    try {
      const stats = await this.memory.all(
        `SELECT 
          AVG(carbon_intensity) as avg_carbon,
          MIN(carbon_intensity) as min_carbon,
          MAX(carbon_intensity) as max_carbon,
          AVG(renewable_percent) as avg_renewable,
          COUNT(*) as samples
        FROM grid_metrics
        WHERE timestamp > datetime('now', ? || ' days')`,
        [`-${days}`]
      );

      return stats[0] || {
        avg_carbon: 400,
        min_carbon: 200,
        max_carbon: 600,
        avg_renewable: 35
      };
    } catch (error) {
      logger.warn(`Failed to get grid statistics: ${error.message}`);
      return null;
    }
  }
}

/**
 * Carbon Intensity Data Provider
 * Integrates with Electricity Maps, WattTime, etc.
 */
class CarbonIntensityProvider {
  async getCarbonIntensity() {
    // In production: Call Electricity Maps API
    // GET https://api.electricitymap.org/v3/carbon-intensity/latest?zone=US-CA
    // Requires API key in .env: ELECTRICITY_MAPS_API_KEY

    // For now, return mock data (replace with real API)
    return {
      carbonIntensity: 350 + Math.random() * 200, // 350-550 kg CO2/MWh
      source: 'carbonintensity',
      timestamp: new Date().toISOString()
    };
  }

  async getRenewableStatus() {
    // In production: Use grid operator data
    return {
      renewablePercent: 30 + Math.random() * 40, // 30-70%
      solarPercent: 5 + Math.random() * 20,
      windPercent: 10 + Math.random() * 30,
      hydroPercent: 5 + Math.random() * 15,
      source: 'grid-operator'
    };
  }
}

/**
 * Solar Forecast Provider
 */
class SolarForecastProvider {
  async getSolarForecast() {
    // In production: Call PVGIS, Solar.com, or local weather API
    const hour = new Date().getHours();
    const solarPercent = hour >= 7 && hour <= 19 ? 50 + Math.random() * 50 : 0;

    return {
      percentOfNormal: solarPercent,
      cloudCover: 30 + Math.random() * 40,
      sunsetHour: 17,
      sunriseHour: 7,
      source: 'solar-forecast'
    };
  }
}

/**
 * Local Energy Provider
 * Reads from local smart meter, solar inverter, battery system
 */
class LocalEnergyProvider {
  async getCarbonIntensity() {
    // In production: Read from:
    // - Smart meter (real-time grid carbon factor)
    // - Solar inverter (current generation)
    // - Battery system (charge/discharge status)

    // For now, return null to fall back to other providers
    return null;
  }
}

export default RenewableEnergyModule;
