# Quick Reference: User Control Features

## 📋 Summary

Three new moderation layers added to give you complete control:

| Feature              | Purpose                           | Default | Bypass                                 |
| -------------------- | --------------------------------- | ------- | -------------------------------------- |
| **Idle Periods**     | System cooling between tasks      | 5 min   | None (always enforced)                 |
| **Delegation Hours** | When tasks can run                | Anytime | Critical urgency only                  |
| **Ethical Rules**    | What tasks can run + power limits | None    | Cannot be bypassed (except warn-level) |

---

## ⚡ Idle Periods

**What**: Prevent system overheating by waiting between task executions.

**Setup**:

```sql
UPDATE user_preferences
SET min_idle_between_tasks_minutes = 10
WHERE user_id = 'you@example.com';
```

**Effect**: After a task finishes, agent waits 10 minutes before accepting next task.

**Check Status**:

```sql
SELECT idle_until FROM task_cooldown WHERE user_id = 'you@example.com';
```

---

## 🕐 Delegation Hours

**What**: Define when your device is allowed to accept tasks.

**Setup** (Night execution only):

```sql
-- 11 PM - 7 AM every day
INSERT INTO delegation_hours
(id, user_id, start_hour, end_hour, is_active, description)
VALUES
('dh-1', 'you@example.com', 23, 7, 1, 'Night window'),
('dh-2', 'you@example.com', 0, 7, 1, 'Early morning');
```

**Setup** (Weekends only):

```sql
-- All day Saturday + Sunday
INSERT INTO delegation_hours
(id, user_id, day_of_week, start_hour, end_hour, is_active, description)
VALUES
('dh-sat', 'you@example.com', 6, 0, 23, 1, 'Saturday'),
('dh-sun', 'you@example.com', 0, 0, 23, 1, 'Sunday');
```

**Effect**: Tasks outside window are deferred until next window.

**Exception**: Critical tasks bypass this (still execute).

---

## 🛡️ Ethical Rules

**What**: Enforce constraints on task types and resource consumption.

### Rule Type: Power Limit

```sql
INSERT INTO ethical_rules
(id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
('r1', 'you@example.com', 'max_power_watts', '300', 'strict', 'PSU limit 350W');
```

**Effect**: Tasks using >300W rejected.

### Rule Type: Block Task Type

```sql
INSERT INTO ethical_rules
(id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
('r2', 'you@example.com', 'task_type_blacklist', 'video-encode', 'strict', 'Too intensive');
```

**Effect**: Tasks containing "video-encode" rejected.

### Rule Type: Allow Only Specific Tasks

```sql
INSERT INTO ethical_rules
(id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
('r3', 'you@example.com', 'task_type_whitelist', 'cleanup,refresh', 'strict', 'Safe tasks only');
```

**Effect**: Only tasks containing "cleanup" or "refresh" allowed.

### Rule Type: No Heavy Computation

```sql
INSERT INTO ethical_rules
(id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
('r4', 'you@example.com', 'no_heavy_computation', 'any', 'strict', 'Block ML/render');
```

**Effect**: Blocks tasks with "ml", "render", "analysis" in name.

### Rule Type: No Data Transfer

```sql
INSERT INTO ethical_rules
(id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES
('r5', 'you@example.com', 'no_data_intensive', 'any', 'warn', 'Log only');
```

**Effect**: Warns on tasks with "backup", "sync", "transfer" in name.

---

## 🔧 Common Configurations

### Conservative User (Fanless Device)

```sql
-- 1. User settings
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('conservative@example.com', 30);

-- 2. Only night execution
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'conservative@example.com', 0, 8, 1, 'Night only');

-- 3. Strict power limit
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-power', 'conservative@example.com', 'max_power_watts', '100', 'strict', 'Fanless device');

-- 4. Block heavy tasks
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-compute', 'conservative@example.com', 'no_heavy_computation', 'any', 'strict', 'Block ML/render');
```

### Solar User (Maximize Clean Energy)

```sql
-- 1. User settings
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes, preferred_energy_source)
VALUES ('solar@example.com', 2, 'solar');

-- 2. Solar peak hours only (9 AM - 3 PM)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-solar', 'solar@example.com', 9, 15, 1, 'Solar peak');

-- 3. No hard rules (let renewable energy decide)
```

### Work-Life Balance User

```sql
-- 1. User settings
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('balanced@example.com', 5);

-- 2. Only after hours (6 PM - 9 AM)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES
('dh-evening', 'balanced@example.com', 18, 23, 1, 'Evening'),
('dh-morning', 'balanced@example.com', 0, 9, 1, 'Morning');

-- 3. Warn on data transfers
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-data', 'balanced@example.com', 'no_data_intensive', 'any', 'warn', 'Bandwidth awareness');
```

---

## 📊 Database Queries

### View Your Idle Status

```sql
SELECT idle_until,
  CASE WHEN idle_until > datetime('now')
  THEN 'IDLE'
  ELSE 'READY' END as status
FROM task_cooldown WHERE user_id = 'you@example.com';
```

### View Your Delegation Hours

```sql
SELECT
  CASE day_of_week
    WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday' ELSE 'Any Day' END as day,
  start_hour || ':00 - ' || end_hour || ':00' as time_window,
  description
FROM delegation_hours
WHERE user_id = 'you@example.com' AND is_active = 1;
```

### View Your Ethical Rules

```sql
SELECT rule_type, rule_value, enforcement_level, reasoning
FROM ethical_rules
WHERE user_id = 'you@example.com' AND is_active = 1;
```

### Disable a Rule Temporarily

```sql
UPDATE ethical_rules SET is_active = 0
WHERE id = 'rule-id' AND user_id = 'you@example.com';
```

### Re-enable a Rule

```sql
UPDATE ethical_rules SET is_active = 1
WHERE id = 'rule-id' AND user_id = 'you@example.com';
```

---

## 🎯 Decision Flow When Task is Submitted

```
1. Check Idle Period?
   ├─ YES → DEFER task (wait for cooldown to end)
   └─ NO → Continue to step 2

2. Check Delegation Hours? (skip if urgency='critical')
   ├─ Outside window → DEFER task (wait for next window)
   └─ Inside window → Continue to step 3

3. Check Ethical Rules?
   ├─ Hard violation (strict) → BLOCK task (reject)
   ├─ Soft violation (warn) → ALLOW + LOG warning
   └─ No violation → Continue to step 4

4. Execute task
```

---

## ❓ FAQ

**Q: Can critical health tasks bypass delegation hours?**
A: Yes, set `urgency='critical'` to bypass hours. Idle/ethical rules still apply.

**Q: What if I don't configure anything?**
A: Default behavior: tasks run anytime, no power limit, no idle period (or minimal 5 min).

**Q: Can I have multiple delegation windows?**
A: Yes! Insert multiple rows for the same user at different hours.

**Q: How do I allow tasks only on weekends?**
A: Insert rows with `day_of_week = 0` (Sunday) and `day_of_week = 6` (Saturday).

**Q: What's "warn" vs "strict" enforcement?**
A: Strict blocks the task. Warn allows it but logs the violation.

**Q: Can I whitelist AND blacklist?**
A: Yes, but whitelist is more restrictive. Use one or the other.

---

## 📝 Documentation

- **[USER_CONTROL_GUIDE.md](USER_CONTROL_GUIDE.md)** - Full detailed guide (50+ examples)
- **[USER_CONTROL_IMPLEMENTATION.md](USER_CONTROL_IMPLEMENTATION.md)** - Technical details
- **[README.md](README.md)** - System overview

---

## 🚀 Getting Started

1. **Create your user preferences**:

   ```sql
   INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
   VALUES ('you@example.com', 10);
   ```

2. **Add a delegation window**:

   ```sql
   INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
   VALUES ('dh-1', 'you@example.com', 22, 8, 1, 'Night window (10 PM - 8 AM)');
   ```

3. **Add an ethical rule** (optional):
   ```sql
   INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
   VALUES ('r-1', 'you@example.com', 'max_power_watts', '250', 'strict', 'Power supply limit');
   ```

Done! 🎉
