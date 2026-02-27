# User Control & Ethical Moderation Guide

## Overview

The eco-friendly task system now supports **three layers of user control**:

1. **System Idle Periods** - Enforce cooling/rest between consecutive tasks
2. **Delegation Hours** - Define when you allow task execution (by day/time)
3. **Ethical Rules** - Set constraints on task types and resource consumption

This ensures the agent never executes tasks outside your preferences, and gives your system time to cool down between executions.

---

## 1. System Idle Periods

### What It Is

After a task completes, the system will wait a configured amount of time before accepting the next task. This allows:

- System cooling (CPU, GPU, thermal dissipation)
- Battery recovery (if mobile)
- Power cost reduction (staggered execution = lower peak draws)

### Configuration

Each user has a `min_idle_between_tasks_minutes` preference:

```sql
-- Set idle period to 10 minutes
UPDATE user_preferences
SET min_idle_between_tasks_minutes = 10
WHERE user_id = 'alice@example.com';
```

### Default: 5 minutes

After any task finishes, the agent will refuse new tasks for 5 minutes.

### Database Tracking

The `task_cooldown` table records:

- `user_id` - Who's in cooldown
- `last_task_id` - What task just ran
- `last_executed_at` - When it finished
- `idle_until` - Timestamp when next task can run
- `reason` - Always "System idle period: X minutes"

### Example Scenario

```
09:00 → Task "database-cleanup" starts
09:05 → Task completes
09:05-09:10 → IDLE PERIOD (system cooling)
09:10 → Agent accepts new task "cache-refresh"
```

### How the Agent Enforces It

Before delegating any new task:

```javascript
const idleOk = await this.scheduler.isWithinIdlePeriod(userId);
if (!idleOk) {
  return { status: "deferred", reason: "System idle period active" };
}
```

### Use Cases

- **Mobile users** - Longer idle (15-30 min) to save battery
- **Solar users** - Shorter idle (2-3 min) to maximize clean energy windows
- **Data centers** - Can set to 1 min (better thermal capacity)
- **Laptops** - 5-10 min (balance between efficiency and responsiveness)

### Adjusting Idle Time

You can adjust per-user preferences:

```sql
-- Aggressive (minimize idle, run tasks back-to-back)
UPDATE user_preferences
SET min_idle_between_tasks_minutes = 1
WHERE user_id = 'energy-efficient-user';

-- Conservative (maximum cooling time)
UPDATE user_preferences
SET min_idle_between_tasks_minutes = 30
WHERE user_id = 'thermal-sensitive-user';
```

---

## 2. Delegation Hours

### What It Is

Define **when your device is allowed to execute delegated tasks**. You set time windows by day of week.

Examples:

- "Only after 10 PM on weekdays" (off-peak energy)
- "Weekends all day" (don't interrupt work)
- "Midnight-6 AM every day" (night charging + solar farm)

### Configuration

Insert into `delegation_hours` table:

```sql
-- Allow tasks between 10 PM - 6 AM every day
INSERT INTO delegation_hours (id, user_id, start_hour, start_minute, end_hour, end_minute, is_active, description)
VALUES
  ('dh-1', 'alice@example.com', 22, 0, 23, 59, 1, 'Late evening'),
  ('dh-2', 'alice@example.com', 0, 0, 6, 0, 1, 'Early morning');

-- Allow all day on weekends (day_of_week: 0=Sunday, 6=Saturday)
INSERT INTO delegation_hours (id, user_id, day_of_week, start_hour, end_hour, is_active, description)
VALUES
  ('dh-3', 'alice@example.com', 0, 0, 23, 1, 'Sunday all day'),
  ('dh-4', 'alice@example.com', 6, 0, 23, 1, 'Saturday all day');
```

### Database Schema

```
delegation_hours:
  id                  TEXT PRIMARY KEY
  user_id             TEXT (foreign key to user_preferences)
  day_of_week         INTEGER (0-6, NULL = any day)
  start_hour          INTEGER (0-23)
  start_minute        INTEGER (0-59)
  end_hour            INTEGER (0-23)
  end_minute          INTEGER (0-59)
  is_active           BOOLEAN
  description         TEXT (e.g., "off-peak energy window")
  created_at          DATETIME
```

### How the Agent Enforces It

Before executing a task:

```javascript
const delegationCheck = await this.scheduler.isWithinDelegationHours(userId);
if (!delegationCheck.allowed && urgency !== "critical") {
  return { status: "deferred", reason: delegationCheck.reason };
}
```

**EXCEPTION**: Tasks marked `urgency='critical'` bypass delegation hours.

### Example Scenarios

**Scenario A: Solar User (Day Execution)**

```sql
-- Run tasks only 9 AM - 3 PM (peak solar)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-solar-1', 'solar-user@example.com', 9, 15, 1, 'Solar peak hours');
```

**Scenario B: Battery User (Night Only)**

```sql
-- Run tasks only 11 PM - 7 AM (while charging overnight)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-battery-1', 'mobile-user@example.com', 23, 7, 1, 'Night charging window');
```

**Scenario C: Work-Life Balance**

```sql
-- Only allow tasks outside work hours
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES
  ('dh-balance-1', 'work-life@example.com', 19, 8, 1, 'After work (7 PM - 8 AM)'),
  ('dh-balance-2', 'work-life@example.com', 9, 17, 0, 'Work hours (9 AM - 5 PM) - DISABLED');
```

---

## 3. Ethical Rules

### What It Is

Set constraints on what types of tasks can run and how many resources they consume.

Ethical rules include:

- **Power limits** - "Don't run tasks >500W"
- **Task type blacklist** - "Never run ML tasks"
- **Task type whitelist** - "Only run [specific tasks]"
- **Computation restrictions** - "No heavy ML/rendering/analysis"
- **Data transfer restrictions** - "No backups during peak hours"

### Configuration

Insert into `ethical_rules` table:

```sql
-- User doesn't want heavy tasks during peak hours
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-1', 'alice@example.com', 'max_power_watts', '300', 'strict', 'Limit thermal output'),
  ('rule-2', 'alice@example.com', 'no_heavy_computation', 'any', 'strict', 'No ML during work'),
  ('rule-3', 'alice@example.com', 'no_data_intensive', 'any', 'warn', 'Avoid large syncs'),
  ('rule-4', 'alice@example.com', 'task_type_blacklist', 'video-encoding', 'strict', 'Too intensive');
```

### Database Schema

```
ethical_rules:
  id                  TEXT PRIMARY KEY
  user_id             TEXT (foreign key to user_preferences)
  rule_type           TEXT (max_power_watts | task_type_blacklist | task_type_whitelist |
                           no_heavy_computation | no_data_intensive)
  rule_value          TEXT (depends on rule_type)
  enforcement_level   TEXT ('strict' | 'warn')
  is_active           BOOLEAN
  reasoning           TEXT (user notes)
  created_at          DATETIME
  updated_at          DATETIME
```

### Rule Types

#### 1. `max_power_watts`

Reject tasks that exceed estimated power consumption.

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-power', 'alice@example.com', 'max_power_watts', '500', 'strict', 'Protect aging power supply');
```

- `rule_value` = wattage threshold (integer)
- If task's `estimatedPowerWatts > 500W` → **BLOCKED**

#### 2. `task_type_blacklist`

Reject specific task names/patterns.

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-video', 'alice@example.com', 'task_type_blacklist', 'video-encode', 'strict', 'Too resource-intensive');
```

- `rule_value` = substring to match (case-insensitive)
- If task name contains "video-encode" → **BLOCKED**

#### 3. `task_type_whitelist`

Only allow specific task names (deny all others).

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-whitelist', 'conservative@example.com', 'task_type_whitelist', 'db-cleanup,cache-refresh', 'strict', 'Only safe tasks');
```

- `rule_value` = comma-separated task names to allow
- If task not in list → **BLOCKED**

#### 4. `no_heavy_computation`

Automatically block ML, rendering, analysis tasks.

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-compute', 'alice@example.com', 'no_heavy_computation', 'any', 'strict', 'Protect device during work');
```

- Blocks tasks containing: "ml", "render", "analysis"
- `rule_value` ignored (can be "any")

#### 5. `no_data_intensive`

Block backup, sync, transfer operations.

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-data', 'alice@example.com', 'no_data_intensive', 'any', 'warn', 'Limited bandwidth');
```

- Blocks tasks containing: "backup", "sync", "transfer"
- `rule_value` ignored

### Enforcement Levels

#### `strict` (Hard Block)

Task is **rejected immediately**. Returns:

```javascript
{
  status: 'blocked',
  reason: 'Hard violation: task_type_blacklist',
  violations: [{ rule_type: 'task_type_blacklist', ... }]
}
```

#### `warn` (Warning Only)

Task can still run, but logged as violation:

```javascript
{
  status: 'delegated',
  violations: [{ rule_type: 'no_data_intensive', enforcement_level: 'warn' }],
  warning: 'Low-priority rule violation detected'
}
```

### Complete Example: Conservative User

```sql
-- User wants strict control over resource-heavy tasks

-- 1. Only allow between midnight-8 AM
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'conservative@example.com', 0, 8, 1, 'Night execution only');

-- 2. System cools 30 minutes between tasks
UPDATE user_preferences
SET min_idle_between_tasks_minutes = 30
WHERE user_id = 'conservative@example.com';

-- 3. Power limit 200W
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-1', 'conservative@example.com', 'max_power_watts', '200', 'strict', 'Fanless device');

-- 4. Block ML, video, analysis
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
  ('rule-2', 'conservative@example.com', 'no_heavy_computation', 'any', 'strict', 'Protect device'),
  ('rule-3', 'conservative@example.com', 'task_type_blacklist', 'ml', 'strict', 'Energy hog'),
  ('rule-4', 'conservative@example.com', 'task_type_blacklist', 'video', 'strict', 'Energy hog');

-- 5. Warn on large data transfers
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-5', 'conservative@example.com', 'no_data_intensive', 'any', 'warn', 'Log only');
```

---

## Integration with Task Delegation

### Decision Flow

When a task is delegated:

```
1. Check User Idle Period
   → If in cooldown → DEFER (try again later)

2. Check Delegation Hours (unless CRITICAL)
   → If outside window → DEFER (wait for next window)

3. Check Ethical Rules
   → If hard violation → BLOCK (reject permanently)
   → If soft violation → WARN (allow but log)

4. Check Peer Permissions
   → If peer not allowed → BLOCK

5. EXECUTE or DEFER decision
```

### Code Example: Task Submission

```javascript
// User submits a task
const result = await mesh.delegateTask(
  "task-123", // taskId
  "database-cleanup", // taskName
  "peer-alice-device", // peerId
  "alice@example.com", // userId
  "normal", // urgency (critical|high|normal|low)
  150, // estimatedPowerWatts
);

// Returns:
// {
//   delegationId: 'deleg-xyz',
//   status: 'delegated' | 'deferred' | 'blocked',
//   reason?: 'Outside delegation hours' | 'Ethical rule violation',
//   nextWindowStart?: '22:00'
// }
```

---

## Database Queries

### Check User's Current Idle Status

```sql
SELECT
  user_id,
  last_task_id,
  idle_until,
  CASE
    WHEN idle_until > datetime('now')
    THEN 'IDLE (' || cast((julianday(idle_until) - julianday('now')) * 1440 AS INT) || ' min remaining)'
    ELSE 'READY'
  END as status
FROM task_cooldown
WHERE user_id = 'alice@example.com';
```

### Show All Delegation Hours for User

```sql
SELECT
  start_hour || ':' || printf('%02d', start_minute) || ' - ' ||
  end_hour || ':' || printf('%02d', end_minute) as time_window,
  CASE day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
    ELSE 'Any Day'
  END as day,
  description,
  is_active
FROM delegation_hours
WHERE user_id = 'alice@example.com'
ORDER BY day_of_week, start_hour;
```

### Show All Ethical Rules for User

```sql
SELECT
  rule_type,
  rule_value,
  enforcement_level,
  is_active,
  reasoning,
  updated_at
FROM ethical_rules
WHERE user_id = 'alice@example.com'
ORDER BY enforcement_level DESC, rule_type;
```

### Disable a Rule Temporarily

```sql
UPDATE ethical_rules
SET is_active = 0
WHERE id = 'rule-video'
  AND user_id = 'alice@example.com';
```

### Check Why Task Was Deferred

```sql
SELECT
  id,
  task_id,
  status,
  reasoning,
  timestamp
FROM execution_history
WHERE task_id = 'task-123'
ORDER BY timestamp DESC
LIMIT 5;
```

---

## API Reference

### Idle Period Methods

**Check if user is in idle period:**

```javascript
const idleOk = await scheduler.isWithinIdlePeriod("alice@example.com");
// Returns: boolean
```

**Enforce idle after task completion:**

```javascript
await scheduler.enforceIdlePeriod("alice@example.com", "task-123");
// Creates cooldown entry for configured minutes
```

### Delegation Hours Methods

**Check if time is within user's delegation window:**

```javascript
const result = await scheduler.isWithinDelegationHours("alice@example.com");
// Returns: { allowed: boolean, reason: string, nextWindowStart?: string }
```

### Ethical Rules Methods

**Check if task complies with user's rules:**

```javascript
const result = await scheduler.compliesWithEthicalRules(
  "alice@example.com", // userId
  "database-cleanup", // taskName
  150, // estimatedPowerWatts
);
// Returns: {
//   complies: boolean,
//   violations: [...],
//   hardViolations: [...],
//   softViolations: [...]
// }
```

---

## FAQ

**Q: Can critical health tasks override delegation hours?**
A: Yes! If urgency='critical', delegation hours are bypassed. Idle periods and ethical rules still apply (except may be overridden for emergency).

**Q: What if I have no delegation hours set?**
A: Tasks can run anytime (no restriction). Start with a default window and adjust.

**Q: Can I have different rules for different task types?**
A: Yes, use whitelist/blacklist rules. Whitelist is most restrictive; blacklist is selective blocking.

**Q: How do I temporarily allow heavy computation?**
A: Set rule enforcement_level to 'warn' instead of 'strict'. Or disable the rule with `is_active = 0`.

**Q: What's the idle period for?**
A: Let system cool, reduce peak power draw, extend device lifespan, and align with renewable energy availability.

---

## Example: Setting Up Your First Rules

### Step 1: Create User Preferences

```sql
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes, timezone)
VALUES ('you@example.com', 10, 'America/Los_Angeles');
```

### Step 2: Add Delegation Hours

```sql
-- Allow tasks 11 PM - 7 AM every day (off-peak)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'you@example.com', 23, 7, 1, 'Night execution window');

-- Bonus: Allow all day on weekends
INSERT INTO delegation_hours (id, user_id, day_of_week, start_hour, end_hour, is_active, description)
VALUES
  ('dh-2', 'you@example.com', 0, 0, 23, 1, 'Sunday (full day)'),
  ('dh-3', 'you@example.com', 6, 0, 23, 1, 'Saturday (full day)');
```

### Step 3: Add Ethical Rules

```sql
-- Limit to 300W (protect power supply)
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-1', 'you@example.com', 'max_power_watts', '300', 'strict', 'PSU rated 350W');

-- No video encoding (too intensive)
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-2', 'you@example.com', 'task_type_blacklist', 'video-encode', 'strict', 'Overheats system');

-- Warn on large data transfers
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('rule-3', 'you@example.com', 'no_data_intensive', 'any', 'warn', 'Log for awareness');
```

### Step 4: Test

```sql
-- Check your idle status
SELECT * FROM task_cooldown WHERE user_id = 'you@example.com';

-- Check your delegation hours
SELECT * FROM delegation_hours WHERE user_id = 'you@example.com' AND is_active = 1;

-- Check your ethical rules
SELECT rule_type, rule_value FROM ethical_rules WHERE user_id = 'you@example.com' AND is_active = 1;
```

Done! 🎉 Your system now has full user control over when and how tasks execute.
