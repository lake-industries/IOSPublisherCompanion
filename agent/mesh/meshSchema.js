/**
 * Add Mesh Network Tables to SQLite
 * Run this to extend sharedMemory.js schema
 */

export function addMeshNetworkSchema(db) {
  db.serialize(() => {
    // Peer devices in network
    db.run(`
      CREATE TABLE IF NOT EXISTS peers (
        id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        location TEXT,
        current_energy TEXT,           -- JSON: {type, percentClean, source}
        capacity TEXT,                 -- JSON: {cpu, memory, disk}
        available TEXT,                -- JSON: {cpu, memory, disk}
        permissions TEXT,              -- CSV: allowed tasks
        max_task_duration_ms INTEGER,
        timezone TEXT,
        last_seen DATETIME,
        status TEXT DEFAULT 'online'   -- online | offline | maintenance
      )
    `);

    // Voting on task importance
    db.run(`
      CREATE TABLE IF NOT EXISTS importance_votes (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        task_name TEXT,
        task_description TEXT,
        status TEXT DEFAULT 'voting',  -- voting | closed | consensus
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        final_consensus TEXT,          -- critical|high|normal|low|non-critical
        confidence REAL DEFAULT 0.5,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      )
    `);

    // Individual votes
    db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        vote_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        importance_level TEXT,         -- critical|high|normal|low|non-critical
        reasoning TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vote_id) REFERENCES importance_votes(id)
      )
    `);

    // User tiers & quotas
    db.run(`
      CREATE TABLE IF NOT EXISTS user_tiers (
        user_id TEXT PRIMARY KEY,
        tier TEXT DEFAULT 'free',      -- free|supporter|contributor
        total_contributions INTEGER DEFAULT 0,
        tasks_executed_today INTEGER DEFAULT 0,
        last_renewal DATETIME,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Task delegations between peers
    db.run(`
      CREATE TABLE IF NOT EXISTS task_delegations (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        from_peer_id TEXT,
        to_peer_id TEXT,
        from_user_id TEXT,
        status TEXT DEFAULT 'pending',   -- pending|accepted|executing|completed|failed|retracted
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        completed_at DATETIME,
        urgency TEXT DEFAULT 'normal',   -- urgent|high|normal|eco|solar_only
        energy_used_wh REAL,            -- Watt-hours used
        carbon_saved_kg REAL,           -- CO2 avoided by choosing clean energy
        FOREIGN KEY(task_id) REFERENCES tasks(id),
        FOREIGN KEY(from_peer_id) REFERENCES peers(id),
        FOREIGN KEY(to_peer_id) REFERENCES peers(id)
      )
    `);

    // Mesh network events log
    db.run(`
      CREATE TABLE IF NOT EXISTS mesh_events (
        id TEXT PRIMARY KEY,
        event_type TEXT,                -- peer_online|peer_offline|task_delegated|consensus_reached
        peer_id TEXT,
        task_id TEXT,
        event_data TEXT,                -- JSON details
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User permissions & trust
    db.run(`
      CREATE TABLE IF NOT EXISTS peer_permissions (
        id TEXT PRIMARY KEY,
        peer_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        can_execute_task TEXT,         -- task name or * for all
        can_delegate_to_peer BOOLEAN DEFAULT 1,
        can_vote_importance BOOLEAN DEFAULT 1,
        expires_at DATETIME,
        FOREIGN KEY(peer_id) REFERENCES peers(id)
      )
    `);

    // Carbon impact tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS carbon_impact (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        executed_peer_id TEXT,
        grid_carbon_intensity INTEGER,      -- kg CO2/MWh at execution time
        renewable_percent INTEGER,          -- % renewable at execution
        energy_used_wh REAL,               -- Watt-hours consumed
        carbon_emitted_kg REAL,            -- Direct CO2
        carbon_avoided_kg REAL,            -- CO2 saved vs worst-case timing
        executed_at DATETIME,
        FOREIGN KEY(task_id) REFERENCES tasks(id),
        FOREIGN KEY(executed_peer_id) REFERENCES peers(id)
      )
    `);

    console.log('✅ Mesh network schema initialized');
  });
}

export default addMeshNetworkSchema;
