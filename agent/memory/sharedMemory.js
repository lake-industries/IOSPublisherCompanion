import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'agent.db');

export class SharedMemory {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('Connected to shared memory database');
    });
    this.initializeSchema();
  }

  initializeSchema() {
    this.db.serialize(() => {
      // Tasks table: tracks all submitted jobs
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          priority INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          scheduled_for DATETIME,
          executed_at DATETIME,
          completed_at DATETIME,
          status TEXT DEFAULT 'pending',
          estimated_power_cost REAL,
          actual_power_cost REAL,
          result_summary TEXT,
          error_log TEXT
        )
      `);

      // Feedback table: user annotations on task necessity/timing
      this.db.run(`
        CREATE TABLE IF NOT EXISTS feedback (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          feedback_type TEXT NOT NULL,
          value TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      // Metrics table: system resource snapshots
      this.db.run(`
        CREATE TABLE IF NOT EXISTS metrics (
          id TEXT PRIMARY KEY,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          cpu_usage_percent REAL,
          memory_usage_mb REAL,
          disk_io_percent REAL,
          estimated_power_draw_watts REAL,
          system_load REAL,
          is_off_peak BOOLEAN DEFAULT 0
        )
      `);

      // Execution history: decisions made by agent
      this.db.run(`
        CREATE TABLE IF NOT EXISTS execution_history (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          decision TEXT NOT NULL,
          reasoning TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          system_state TEXT,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      // Agent learning patterns: aggregated insights
      this.db.run(`
        CREATE TABLE IF NOT EXISTS learning_patterns (
          id TEXT PRIMARY KEY,
          pattern_type TEXT NOT NULL,
          pattern_data TEXT NOT NULL,
          confidence REAL DEFAULT 0.5,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0
        )
      `);

      // Configuration table: agent settings (read-only to agent)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS configuration (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          is_locked BOOLEAN DEFAULT 1,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          modified_by TEXT
        )
      `);

      // User preferences table: per-user scheduling preferences
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT PRIMARY KEY,
          min_idle_between_tasks_minutes INTEGER DEFAULT 5,
          timezone TEXT DEFAULT 'UTC',
          preferred_energy_source TEXT DEFAULT 'any',
          max_concurrent_tasks INTEGER DEFAULT 1,
          allow_off_peak_only BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User delegation hours: when each user allows task execution
      this.db.run(`
        CREATE TABLE IF NOT EXISTS delegation_hours (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          day_of_week INTEGER,
          start_hour INTEGER,
          start_minute INTEGER,
          end_hour INTEGER,
          end_minute INTEGER,
          is_active BOOLEAN DEFAULT 1,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES user_preferences(user_id)
        )
      `);

      // Ethical moderation rules: per-user constraints on task types
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ethical_rules (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          rule_type TEXT NOT NULL,
          rule_value TEXT NOT NULL,
          enforcement_level TEXT DEFAULT 'strict',
          is_active BOOLEAN DEFAULT 1,
          reasoning TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES user_preferences(user_id)
        )
      `);

      // Task execution cooldown: tracks last task execution for idle enforcement
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_cooldown (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          last_task_id TEXT,
          last_executed_at DATETIME,
          idle_until DATETIME,
          reason TEXT,
          FOREIGN KEY(user_id) REFERENCES user_preferences(user_id),
          FOREIGN KEY(last_task_id) REFERENCES tasks(id)
        )
      `);

      // Thermal history: tracks system temperature over time
      this.db.run(`
        CREATE TABLE IF NOT EXISTS thermal_history (
          id TEXT PRIMARY KEY,
          cpu_temp REAL,
          gpu_temp REAL,
          average_temp REAL,
          system_load REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'safe'
        )
      `);

      // Sleep schedule: tracks device sleep/wake events
      this.db.run(`
        CREATE TABLE IF NOT EXISTS sleep_schedule (
          id TEXT PRIMARY KEY,
          sleep_start DATETIME NOT NULL,
          scheduled_wake DATETIME,
          actual_wake DATETIME,
          reason TEXT,
          duration_target INTEGER,
          actual_sleep_duration INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Device status: current device state (sleeping, awake, etc.)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS device_status (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Device profiles: thermal capabilities per device type
      this.db.run(`
        CREATE TABLE IF NOT EXISTS device_profiles (
          id TEXT PRIMARY KEY,
          device_id TEXT UNIQUE NOT NULL,
          config TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Task checkpoints: save task state for pause/resume
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_checkpoints (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          checkpoint_number INTEGER DEFAULT 1,
          progress_percent INTEGER,
          state_data TEXT,
          output_data TEXT,
          reason TEXT DEFAULT 'manual',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      // Task thermal history: temperature during task execution
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_thermal_history (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          temperature REAL NOT NULL,
          elapsed_seconds INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      // Task abort history: record of aborted tasks and reasons
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_abort_history (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          temperature REAL,
          execution_duration_seconds INTEGER,
          peak_temperature REAL,
          thermal_alerts INTEGER DEFAULT 0,
          power_alerts INTEGER DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      // Task resumption queue: tasks waiting to resume after abort
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_resumption_queue (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          abort_reason TEXT,
          status TEXT DEFAULT 'PENDING',
          retry_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
      `);

      console.log('Database schema initialized');
    });
  }

  // Async query helper
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default new SharedMemory();
