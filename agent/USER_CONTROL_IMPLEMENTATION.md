# User Control Layer - Implementation Summary

## What Was Added

Three new layers of **user-driven moderation and control** have been integrated into the eco-friendly task system:

### 1. System Idle Periods (`isWithinIdlePeriod`, `enforceIdlePeriod`)

- **Location**: `scheduler/ecoScheduler.js`
- **Purpose**: Enforce cooling/rest time between consecutive task executions
- **Database**: `task_cooldown` table tracks per-user idle periods
- **Default**: 5 minutes between tasks (configurable per user)
- **Enforcement**: Any task delegated within idle period returns `status: 'deferred'`

### 2. Delegation Hours (`isWithinDelegationHours`)

- **Location**: `scheduler/ecoScheduler.js`
- **Purpose**: Allow users to specify when tasks are permitted to run
- **Database**: `delegation_hours` table (by day-of-week, hour ranges)
- **Default**: No restrictions (all times allowed)
- **Enforcement**: Tasks outside delegation window are deferred (unless critical urgency)
- **Supports**:
  - Multiple time windows per day
  - Per-day-of-week scheduling
  - Free-form text descriptions

### 3. Ethical Rules (`compliesWithEthicalRules`)

- **Location**: `scheduler/ecoScheduler.js`
- **Purpose**: Set constraints on task types and resource consumption
- **Database**: `ethical_rules` table with 5 rule types
- **Rule Types**:
  - `max_power_watts` - Reject tasks exceeding power threshold
  - `task_type_blacklist` - Block specific task names
  - `task_type_whitelist` - Allow only specific tasks
  - `no_heavy_computation` - Block ML/rendering/analysis tasks
  - `no_data_intensive` - Block backup/sync/transfer operations
- **Enforcement Levels**:
  - `strict` - Hard block (task rejected)
  - `warn` - Warning only (task allowed but logged)

---

## Database Schema Changes

### Added 4 New Tables to `memory/sharedMemory.js`

#### `user_preferences`

```sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  min_idle_between_tasks_minutes INTEGER DEFAULT 5,
  timezone TEXT DEFAULT 'UTC',
  preferred_energy_source TEXT DEFAULT 'any',
  max_concurrent_tasks INTEGER DEFAULT 1,
  allow_off_peak_only BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `delegation_hours`

```sql
CREATE TABLE delegation_hours (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  day_of_week INTEGER,        -- 0-6 (NULL = any day)
  start_hour INTEGER,          -- 0-23
  start_minute INTEGER,        -- 0-59
  end_hour INTEGER,            -- 0-23
  end_minute INTEGER,          -- 0-59
  is_active BOOLEAN DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES user_preferences(user_id)
);
```

#### `ethical_rules`

```sql
CREATE TABLE ethical_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,        -- max_power_watts, task_type_blacklist, etc.
  rule_value TEXT NOT NULL,       -- depends on rule_type
  enforcement_level TEXT DEFAULT 'strict',  -- 'strict' or 'warn'
  is_active BOOLEAN DEFAULT 1,
  reasoning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES user_preferences(user_id)
);
```

#### `task_cooldown`

```sql
CREATE TABLE task_cooldown (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  last_task_id TEXT,
  last_executed_at DATETIME,
  idle_until DATETIME,
  reason TEXT,
  FOREIGN KEY(user_id) REFERENCES user_preferences(user_id),
  FOREIGN KEY(last_task_id) REFERENCES tasks(id)
);
```

---

## Updated Files

### 1. `memory/sharedMemory.js`

- Added 4 new table schemas
- Tables auto-initialize on first startup
- No breaking changes to existing tables

### 2. `scheduler/ecoScheduler.js`

Added 5 new methods:

```javascript
// Check if user is currently in idle period
async isWithinIdlePeriod(userId)

// Set idle period after task execution
async enforceIdlePeriod(userId, taskId)

// Check if current time is in user's delegation window
async isWithinDelegationHours(userId)

// Verify task complies with user's ethical rules
async compliesWithEthicalRules(userId, taskName, estimatedPowerWatts)
```

### 3. `mesh/taskDelegationNetwork.js`

- Updated `delegateTask()` method to include 3 new checks
- Added scheduler reference to constructor
- Decision flow now:
  1. Check idle period
  2. Check delegation hours
  3. Check ethical rules
  4. Check peer permissions
  5. Execute or defer

---

## Integration Points

### When a Task is Delegated

The `delegateTask()` method now performs these checks in order:

```javascript
async delegateTask(taskId, taskName, peerId, userId, urgency, estimatedPowerWatts) {
  // 1. Idle period check
  const idleOk = await this.scheduler.isWithinIdlePeriod(userId);
  if (!idleOk) return { status: 'deferred', reason: '...' };

  // 2. Delegation hours check (bypass if critical)
  const delegationCheck = await this.scheduler.isWithinDelegationHours(userId);
  if (!delegationCheck.allowed && urgency !== 'critical') {
    return { status: 'deferred', reason: '...' };
  }

  // 3. Ethical rules check
  const ethicalCheck = await this.scheduler.compliesWithEthicalRules(userId, taskName, estimatedPowerWatts);
  if (!ethicalCheck.complies) {
    return { status: 'blocked', reason: '...', violations: [...] };
  }

  // 4. Continue with existing delegation logic...
}
```

### After Task Execution

The scheduler enforces idle period:

```javascript
await scheduler.enforceIdlePeriod(userId, taskId);
// Creates cooldown entry preventing new tasks for configured minutes
```

---

## Usage Examples

### Example 1: Set Up a Conservative User

```sql
-- 1. User preferences
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes, timezone)
VALUES ('alice@example.com', 20, 'America/Los_Angeles');

-- 2. Delegation hours: Only 11 PM - 7 AM
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'alice@example.com', 23, 7, 1, 'Night execution only');

-- 3. Power limit: Max 300W
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-1', 'alice@example.com', 'max_power_watts', '300', 'strict', 'PSU limit');

-- 4. Block heavy computation
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-2', 'alice@example.com', 'no_heavy_computation', 'any', 'strict', 'Protect device');
```

**Result**: Tasks can only run 11 PM - 7 AM, consume ≤300W, and cannot be ML/rendering/analysis jobs. After each task, system rests for 20 minutes.

### Example 2: Set Up a Solar User

```sql
-- 1. User preferences
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes, timezone, preferred_energy_source)
VALUES ('solar-user@example.com', 3, 'UTC', 'solar');

-- 2. Delegation hours: 9 AM - 3 PM (peak solar)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'solar-user@example.com', 9, 15, 1, 'Solar peak hours');

-- 3. Allow any power (will be filtered by renewable energy check elsewhere)
-- (no ethical rules = no restrictions)
```

**Result**: Tasks run during solar peak, minimal idle periods, maximum clean energy usage.

### Example 3: Whitelist Approach

```sql
-- Only allow specific safe tasks
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-whitelist', 'cautious@example.com', 'task_type_whitelist', 'database-cleanup,cache-refresh,log-rotation', 'strict', 'Only approved tasks');
```

**Result**: Any task name not containing one of those strings will be blocked.

---

## Backward Compatibility

✅ **Fully backward compatible**

- Existing agents work without configuration
- New tables are empty by default
- If no rules exist, agent behaves as before (all tasks allowed anytime)
- Lazy initialization: tables created on first startup

---

## Testing

### Verify New Tables Exist

```sql
SELECT name FROM sqlite_master WHERE type='table'
AND name IN ('user_preferences', 'delegation_hours', 'ethical_rules', 'task_cooldown');
```

### Test Idle Period

```javascript
// Simulate task execution
await scheduler.enforceIdlePeriod("alice@example.com", "task-123");

// Check if idle
const idleOk = await scheduler.isWithinIdlePeriod("alice@example.com");
// Should return: false (within idle period)
```

### Test Delegation Hours

```javascript
// Insert delegation hours: only 10-20 (10 AM - 8 PM)
await db.run(
  `INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active)
             VALUES (?, ?, 10, 20, 1)`,
  ["dh-1", "user@example.com"],
);

// Check at 3 AM (should be outside window)
const result = await scheduler.isWithinDelegationHours("user@example.com");
// Should return: { allowed: false, reason: "Outside delegation hours..." }
```

### Test Ethical Rules

```javascript
// Insert max power rule
await db.run(
  `INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level)
             VALUES (?, ?, 'max_power_watts', '200', 'strict')`,
  ["rule-1", "user@example.com"],
);

// Check task compliance
const result = await scheduler.compliesWithEthicalRules(
  "user@example.com",
  "task-name",
  250,
);
// Should return: { complies: false, violations: [...], hardViolations: [...] }
```

---

## Configuration in `.env`

No new environment variables required. All configuration is done via database tables:

```
# Existing .env variables still apply
LOG_LEVEL=info
SCHEDULING_MODE=hybrid
# ...etc
```

User-specific settings are stored in the database, not environment.

---

## What This Achieves

1. **User Control**: Users define exactly when and how their devices execute tasks
2. **Energy Efficiency**: Idle periods let systems cool; delegation hours align with renewable energy
3. **Ethical Constraints**: Prevent abuse and over-consumption (power limits, task type restrictions)
4. **Democratic Moderation**: Complements the voting system - users vote on task importance, rules determine execution constraints
5. **Transparency**: All decisions logged in `execution_history` for audit trail

---

## Next Steps (Optional)

1. **UI Components** - React forms to set delegation hours and ethical rules
2. **Notifications** - Warn users when tasks are deferred due to rules
3. **Analytics** - Dashboard showing idle time, delegation hour usage, rule violations
4. **Auto-Learning** - Detect patterns (e.g., "user never allows this task type") and suggest rules

---

## Documentation

See [USER_CONTROL_GUIDE.md](USER_CONTROL_GUIDE.md) for comprehensive guide with:

- Detailed explanation of each feature
- SQL examples for all scenarios
- API reference
- FAQ
- Step-by-step setup instructions
