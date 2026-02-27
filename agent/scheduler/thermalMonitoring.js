/**
 * Thermal Monitoring Module
 * 
 * Tracks system temperature and provides thermal-aware scheduling decisions.
 * Instead of fixed idle periods, uses actual temperature data to determine
 * if system needs cooling time.
 * 
 * Supports:
 * - CPU temperature monitoring
 * - GPU temperature (if available)
 * - Temperature thresholds (critical/warning/safe/optimal)
 * - Thermal history tracking
 * - Predictive cooling estimation
 */

import pino from 'pino';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

export class ThermalMonitor {
  constructor(sharedMemory) {
    this.memory = sharedMemory;

    // Default temperature thresholds (Celsius)
    this.thresholds = {
      optimal: { min: 20, max: 40 },      // Ideal operating range
      safe: { min: 15, max: 55 },         // OK to run tasks
      warning: { min: 10, max: 70 },      // Tasks slowed, monitor closely
      critical: 80                         // Stop accepting new tasks
    };

    // Temperature data sources
    this.sensors = {
      cpu: null,
      gpu: null,
      ssd: null,
      motherboard: null
    };

    // Estimated cooling rate (°C per minute) - varies by device
    this.coolingRate = 1.5; // Default: drops ~1.5°C per minute when idle

    this.updateInterval = 30000; // Check temperature every 30 seconds
    this.monitoringActive = false;
  }

  /**
   * Start continuous thermal monitoring
   */
  async startMonitoring() {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    logger.info('🌡️ Thermal monitoring started');

    // Check temperature every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.recordTemperature().catch(err =>
        logger.warn(`Temperature recording failed: ${err.message}`)
      );
    }, this.updateInterval);
  }

  /**
   * Stop thermal monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitoringActive = false;
      logger.info('🌡️ Thermal monitoring stopped');
    }
  }

  /**
   * Configure temperature thresholds
   * thresholds = {
   *   optimal: { min: 20, max: 40 },
   *   safe: { min: 15, max: 55 },
   *   warning: { min: 10, max: 70 },
   *   critical: 80
   * }
   */
  configureThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Temperature thresholds updated', { thresholds: this.thresholds });
  }

  /**
   * Configure cooling rate (affects prediction)
   * coolingRate = 1.5 means device cools at ~1.5°C per minute when idle
   */
  configureCoolingRate(coolingRate) {
    this.coolingRate = coolingRate;
    logger.info(`Cooling rate set to ${coolingRate}°C/min`);
  }

  /**
   * Read current system temperature
   * Returns: { cpu, gpu, ssd, motherboard, average, timestamp }
   */
  async getSystemTemperature() {
    try {
      const temps = {};
      const now = new Date();

      // CPU Temperature
      // Note: Implementation varies by OS
      // Windows: via WMI, PowerShell
      // Linux: via /sys/class/thermal, lm-sensors
      // macOS: via pmset, smc (System Management Controller)

      try {
        temps.cpu = await this.readCPUTemperature();
      } catch (error) {
        logger.debug(`CPU temperature unavailable: ${error.message}`);
        temps.cpu = null;
      }

      // GPU Temperature (if available)
      try {
        temps.gpu = await this.readGPUTemperature();
      } catch (error) {
        logger.debug(`GPU temperature unavailable: ${error.message}`);
        temps.gpu = null;
      }

      // Estimate based on system load if sensors unavailable
      if (!temps.cpu) {
        temps.cpu = this.estimateTemperatureFromLoad();
      }

      // Calculate average
      const validTemps = Object.values(temps).filter(t => t !== null);
      const average = validTemps.length > 0
        ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
        : 40; // Safe default

      return {
        cpu: temps.cpu,
        gpu: temps.gpu,
        ssd: temps.ssd,
        motherboard: temps.motherboard,
        average,
        timestamp: now.toISOString(),
        source: 'system_sensors'
      };
    } catch (error) {
      logger.error(`Failed to read temperature: ${error.message}`);
      // Return estimated safe default
      return {
        cpu: null,
        gpu: null,
        average: 40,
        timestamp: new Date().toISOString(),
        source: 'estimation',
        error: error.message
      };
    }
  }

  /**
   * Estimate CPU temperature from system load
   * Formula: baseTemp + (loadPercent * 0.5)
   */
  estimateTemperatureFromLoad() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg()[0]; // 1-minute load average
    const maxLoad = cpus.length;

    // Rough estimation: idle is ~40°C, fully loaded is ~80°C
    const loadPercent = Math.min(loadAverage / maxLoad, 1.0) * 100;
    const estimatedTemp = 40 + (loadPercent * 0.4);

    logger.debug(`Temperature estimated from load`, {
      loadAverage,
      maxLoad,
      loadPercent: Math.round(loadPercent),
      estimatedTemp: Math.round(estimatedTemp)
    });

    return estimatedTemp;
  }

  /**
   * Read CPU temperature (platform-specific)
   * Windows: PowerShell WMI query
   * Linux: Read from /sys/class/thermal
   * macOS: Use pmset -g batt or smc
   */
  async readCPUTemperature() {
    const platform = process.platform;

    if (platform === 'win32') {
      return await this.readWindowsCPUTemp();
    } else if (platform === 'linux') {
      return await this.readLinuxCPUTemp();
    } else if (platform === 'darwin') {
      return await this.readMacOSCPUTemp();
    }

    // Fallback to estimation
    return this.estimateTemperatureFromLoad();
  }

  /**
   * Windows CPU temperature via WMI
   */
  async readWindowsCPUTemp() {
    try {
      const { execSync } = await import('child_process');
      const cmd = `powershell -Command "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace 'root/wmi' | Measure-Object -Property CurrentTemperature -Average | Select -ExpandProperty Average" 2>nul`;

      const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const rawTemp = parseInt(output.trim());

      // WMI returns temperature in 1/10 Kelvin, convert to Celsius
      if (!isNaN(rawTemp)) {
        return (rawTemp / 10) - 273.15;
      }
    } catch (error) {
      logger.debug(`Windows WMI temp read failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Linux CPU temperature via thermal zone
   */
  async readLinuxCPUTemp() {
    try {
      const fs = await import('fs').then(m => m.promises);
      const tempFile = '/sys/class/thermal/thermal_zone0/temp';

      // Most Linux systems expose temperature in millidegrees Celsius
      const data = await fs.readFile(tempFile, 'utf8');
      const milliDegrees = parseInt(data.trim());

      if (!isNaN(milliDegrees)) {
        return milliDegrees / 1000;
      }
    } catch (error) {
      logger.debug(`Linux thermal zone read failed: ${error.message}`);
    }

    return null;
  }

  /**
   * macOS CPU temperature via smc or pmset
   */
  async readMacOSCPUTemp() {
    try {
      const { execSync } = await import('child_process');

      // Try system_profiler first (macOS Big Sur+)
      try {
        const output = execSync(
          'system_profiler SPPowerDataType 2>/dev/null | grep "CPU Temperature"',
          { encoding: 'utf8' }
        );
        const match = output.match(/(\d+)\s*°C/);
        if (match) return parseInt(match[1]);
      } catch (e) {
        // Fallback to istats or other tools
        logger.debug('system_profiler temperature read failed');
      }
    } catch (error) {
      logger.debug(`macOS temp read failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Read GPU temperature (if available)
   */
  async readGPUTemperature() {
    // Implementation depends on GPU vendor and driver
    // NVIDIA: nvidia-smi
    // AMD: rocm-smi
    // Intel: intel_gpu_top
    // For now, return null if not explicitly configured

    try {
      const { execSync } = await import('child_process');
      const platform = process.platform;

      if (platform === 'win32' || platform === 'linux') {
        // Try NVIDIA
        try {
          const output = execSync(
            'nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader',
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          );
          return parseInt(output.trim());
        } catch (e) {
          logger.debug('NVIDIA GPU temp unavailable');
        }

        // Try AMD
        try {
          const output = execSync(
            'rocm-smi --showtemp 2>/dev/null | grep -i temperature',
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          );
          const match = output.match(/(\d+)/);
          if (match) return parseInt(match[1]);
        } catch (e) {
          logger.debug('AMD GPU temp unavailable');
        }
      }
    } catch (error) {
      logger.debug(`GPU temperature unavailable: ${error.message}`);
    }

    return null;
  }

  /**
   * Record temperature to history
   */
  async recordTemperature() {
    try {
      const temps = await this.getSystemTemperature();

      await this.memory.run(
        `INSERT INTO thermal_history 
        (id, cpu_temp, gpu_temp, average_temp, system_load, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          temps.cpu,
          temps.gpu,
          temps.average,
          os.loadavg()[0],
          temps.timestamp,
          this.getThermalStatus(temps.average)
        ]
      );
    } catch (error) {
      logger.debug(`Failed to record temperature: ${error.message}`);
    }
  }

  /**
   * Get thermal status based on thresholds
   */
  getThermalStatus(temperature) {
    if (temperature > this.thresholds.critical) return 'critical';
    if (temperature > this.thresholds.warning.max) return 'warning';
    if (temperature > this.thresholds.safe.max) return 'elevated';
    if (temperature >= this.thresholds.optimal.min && temperature <= this.thresholds.optimal.max)
      return 'optimal';
    if (temperature >= this.thresholds.safe.min) return 'safe';
    return 'cold';
  }

  /**
   * Check if temperature allows task execution
   */
  async canExecuteTask(urgencyLevel = 'normal') {
    const temps = await this.getSystemTemperature();

    if (temps.average > this.thresholds.critical) {
      return {
        canExecute: false,
        reason: `Critical temperature: ${Math.round(temps.average)}°C (threshold: ${this.thresholds.critical}°C)`,
        temperature: temps.average,
        status: 'critical',
        recommendedDelay: this.estimateCoolingTime(temps.average, this.thresholds.safe.max)
      };
    }

    // For normal priority, respect warning threshold
    if (urgencyLevel !== 'critical' && temps.average > this.thresholds.warning.max) {
      return {
        canExecute: false,
        reason: `Warning temperature: ${Math.round(temps.average)}°C (threshold: ${this.thresholds.warning.max}°C)`,
        temperature: temps.average,
        status: 'warning',
        recommendedDelay: this.estimateCoolingTime(temps.average, this.thresholds.safe.max)
      };
    }

    // Critical tasks can execute even in elevated state
    if (temps.average > this.thresholds.safe.max && urgencyLevel !== 'critical') {
      return {
        canExecute: false,
        reason: `Elevated temperature: ${Math.round(temps.average)}°C (safe: ${this.thresholds.safe.max}°C)`,
        temperature: temps.average,
        status: 'elevated',
        recommendedDelay: this.estimateCoolingTime(temps.average, this.thresholds.safe.max)
      };
    }

    // Temperature OK
    return {
      canExecute: true,
      temperature: temps.average,
      status: this.getThermalStatus(temps.average),
      message: `Temperature optimal: ${Math.round(temps.average)}°C`
    };
  }

  /**
   * Estimate how long until temperature drops to target
   * Returns estimated minutes
   */
  estimateCoolingTime(currentTemp, targetTemp) {
    if (currentTemp <= targetTemp) return 0;

    const tempDrop = currentTemp - targetTemp;
    const minutesNeeded = Math.ceil(tempDrop / this.coolingRate);

    return minutesNeeded;
  }

  /**
   * Get recent thermal history
   */
  async getThermalHistory(minutes = 60) {
    try {
      const history = await this.memory.all(
        `SELECT * FROM thermal_history 
         WHERE timestamp > datetime('now', '-' || ? || ' minutes')
         ORDER BY timestamp DESC`,
        [minutes]
      );

      return history || [];
    } catch (error) {
      logger.warn(`Failed to retrieve thermal history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get thermal statistics for time period
   */
  async getThermalStats(minutes = 60) {
    try {
      const stats = await this.memory.get(
        `SELECT 
          MIN(average_temp) as min_temp,
          MAX(average_temp) as max_temp,
          AVG(average_temp) as avg_temp,
          COUNT(*) as sample_count
         FROM thermal_history 
         WHERE timestamp > datetime('now', '-' || ? || ' minutes')`,
        [minutes]
      );

      return stats || {
        min_temp: null,
        max_temp: null,
        avg_temp: null,
        sample_count: 0
      };
    } catch (error) {
      logger.warn(`Failed to calculate thermal stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Get thermal recommendation for next task
   */
  async getThermalRecommendation() {
    const temps = await this.getSystemTemperature();
    const status = this.getThermalStatus(temps.average);
    const stats = await this.getThermalStats(120); // Last 2 hours

    const recommendation = {
      status,
      currentTemp: Math.round(temps.average),
      recentMin: stats?.min_temp ? Math.round(stats.min_temp) : null,
      recentMax: stats?.max_temp ? Math.round(stats.max_temp) : null,
      recentAvg: stats?.avg_temp ? Math.round(stats.avg_temp) : null
    };

    if (status === 'optimal') {
      recommendation.action = 'EXECUTE';
      recommendation.reason = 'Temperature in optimal range';
    } else if (status === 'safe') {
      recommendation.action = 'EXECUTE';
      recommendation.reason = 'Temperature safe but elevated';
    } else if (status === 'elevated') {
      recommendation.action = 'DEFER';
      recommendation.reason = `Cool to ${this.thresholds.safe.max}°C before next task`;
      recommendation.minutesUntilReady = this.estimateCoolingTime(
        temps.average,
        this.thresholds.safe.max
      );
    } else if (status === 'warning') {
      recommendation.action = 'DEFER';
      recommendation.reason = `Cool to ${this.thresholds.safe.max}°C (currently ${Math.round(temps.average)}°C)`;
      recommendation.minutesUntilReady = this.estimateCoolingTime(
        temps.average,
        this.thresholds.safe.max
      );
    } else if (status === 'critical') {
      recommendation.action = 'SLEEP';
      recommendation.reason = 'CRITICAL: Initiate device sleep mode immediately';
      recommendation.minutesUntilReady = this.estimateCoolingTime(
        temps.average,
        this.thresholds.safe.max
      );
    }

    return recommendation;
  }
}

export default ThermalMonitor;
