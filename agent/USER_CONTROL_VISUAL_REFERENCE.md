# Visual Overview: User Control Features

## 🎯 The Three Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INCOMING TASK SUBMISSION                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │  LAYER 1: IDLE PERIOD CHECK          │
        │  "Has system cooled down?"           │
        ├──────────────────────────────────────┤
        │ ✓ Default: 5 minutes                 │
        │ ✓ Per-user configurable             │
        │ ✓ Enforced after every task         │
        └──────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓ IDLE PERIOD ACTIVE   ↓ IDLE PERIOD EXPIRED
      DEFER TASK             CONTINUE TO LAYER 2
      (try again later)
                                │
                                ↓
        ┌──────────────────────────────────────┐
        │  LAYER 2: DELEGATION HOURS CHECK    │
        │  "Is it within allowed time?"       │
        ├──────────────────────────────────────┤
        │ ✓ User defines preferred windows    │
        │ ✓ By day-of-week + hour range       │
        │ ✓ Can have multiple windows         │
        │ ✓ Exception: CRITICAL tasks bypass  │
        └──────────────────────────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
         ↓ OUTSIDE WINDOW          ↓ INSIDE WINDOW
         │ (unless CRITICAL)       │
      DEFER TASK              CONTINUE TO LAYER 3
      (wait for next window)
                                │
                                ↓
        ┌──────────────────────────────────────┐
        │  LAYER 3: ETHICAL RULES CHECK       │
        │  "Does task comply with constraints?"│
        ├──────────────────────────────────────┤
        │ ✓ Max power consumption              │
        │ ✓ Task type blacklist/whitelist     │
        │ ✓ Block heavy computation            │
        │ ✓ Block data-intensive tasks        │
        │ ✓ Strict vs Warn enforcement        │
        └──────────────────────────────────────┘
                     │
         ┌───────────┴──────────────────┐
         │                              │
         ↓ RULE VIOLATION              ↓ COMPLIES
         │ (strict level)              │
      BLOCK TASK                 CONTINUE TO ENERGY LAYER
      (reject)
                                │
                                ↓
        ┌──────────────────────────────────────┐
        │  (Existing) RENEWABLE ENERGY CHECK   │
        │  DEMOCRATIC VOTING CHECK             │
        │  (See RENEWABLE_ENERGY_GUIDE.md)     │
        └──────────────────────────────────────┘
                     │
                     ↓
             ┌──────────────────┐
             │  EXECUTE TASK    │
             └──────────────────┘
                     │
                     ↓
        ┌──────────────────────────────────────┐
        │  ENFORCE IDLE PERIOD (for next task) │
        │  (Update task_cooldown table)        │
        └──────────────────────────────────────┘
```

---

## 📊 Rule Decision Matrix

```
IDLE PERIOD
├─ Expired?        → Continue
├─ Not Expired?    → DEFER (try later)
│                    └─ Show: Minutes remaining, next available time

DELEGATION HOURS
├─ Inside window?  → Continue
├─ Outside?        → DEFER (try at next window start)
│ └─ UNLESS urgency='critical' → Continue anyway
│                    └─ Show: Next window start time, description

ETHICAL RULES
├─ Complies?       → Continue
├─ Violation?
│  ├─ Strict       → BLOCK (reject permanently)
│  │                └─ Show: Which rule, rule value, user reasoning
│  └─ Warn         → Continue + LOG (allow with warning)
│                    └─ Show: Warning but execute anyway
```

---

## 💾 Database Relationships

```
user_preferences (root)
    ↓
    ├─→ delegation_hours (1 user → many time windows)
    ├─→ ethical_rules (1 user → many rules)
    ├─→ task_cooldown (1 user → current idle period)
    └─→ (mesh network peers, voting, etc.)


EXAMPLE DATA FLOW:

INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUE ('alice@example.com', 10);
                    ↓
            ┌──────┴──────────┐
            ↓                 ↓
INSERT INTO delegation_hours
(user_id='alice@example.com', start_hour=22, end_hour=8)

INSERT INTO ethical_rules
(user_id='alice@example.com', rule_type='max_power_watts', rule_value='200')

INSERT INTO task_cooldown
(user_id='alice@example.com', idle_until=2026-01-20 14:15:00)
```

---

## 🎯 Example Scenarios

### Scenario 1: Conservative User at 2 PM

```
Task: "database-cleanup" (150W estimated)
User: alice@example.com

Check 1: Idle Period?
  └─ Query: SELECT idle_until FROM task_cooldown WHERE user_id='alice@example.com'
  └─ Result: idle_until = 2026-01-20 13:45:00
  └─ Current time = 2026-01-20 14:00:00
  └─ Status: ✅ IDLE EXPIRED, can execute

Check 2: Delegation Hours?
  └─ Query: SELECT * FROM delegation_hours WHERE user_id='alice@example.com' AND day_of_week=1
  └─ Result: start_hour=22, end_hour=8 (10 PM - 8 AM only)
  └─ Current time = 14:00 (2 PM)
  └─ Status: ❌ OUTSIDE WINDOW (not urgent)
  └─ Action: DEFER until 22:00 (10 PM)

Result: Task deferred, will retry at 10 PM

RETURN:
{
  status: 'deferred',
  reason: 'Outside delegation hours: Next window: 22:00',
  nextWindowStart: '22:00'
}
```

### Scenario 2: Conservative User at 11 PM

```
Task: "database-cleanup" (150W estimated)
User: alice@example.com (same user)

Check 1: Idle Period?
  └─ Status: ✅ EXPIRED

Check 2: Delegation Hours?
  └─ Current time = 23:00 (11 PM)
  └─ Window = 22:00 - 08:00
  └─ Status: ✅ INSIDE WINDOW

Check 3: Ethical Rules?
  └─ Rule 1: max_power_watts = 300
  └─ Task power = 150W
  └─ Status: ✅ 150 < 300 (OK)

  └─ Rule 2: no_heavy_computation = any
  └─ Task name = "database-cleanup" (not ML/render/analysis)
  └─ Status: ✅ NO MATCH (OK)

Check 4-7: Renewable Energy, Voting (existing)
  └─ Status: ✅ (assumed OK for this example)

Result: EXECUTE

AFTER EXECUTION:
  └─ Enforce idle period: 10 minutes
  └─ INSERT task_cooldown (idle_until = now + 10 min)
  └─ Next task cannot run until 23:10

RETURN:
{
  delegationId: 'deleg-xyz123',
  status: 'delegated',
  passedIdleCheck: true,
  passedDelegationHours: true,
  passedEthicalRules: true
}
```

### Scenario 3: Solar User at 2 PM (High Energy)

```
Task: "large-backup" (400W estimated)
User: solar@example.com

Check 1: Idle Period?
  └─ min_idle = 2 minutes (solar user)
  └─ Status: ✅ EXPIRED

Check 2: Delegation Hours?
  └─ Window: 09:00 - 15:00 (solar peak)
  └─ Current: 14:00
  └─ Status: ✅ INSIDE WINDOW

Check 3: Ethical Rules?
  └─ NO RULES (solar user unrestricted)
  └─ Status: ✅ COMPLIES (empty rules = everything allowed)

Check 4-7: Renewable Energy, Voting
  └─ Solar at 92% clean
  └─ Community voted HIGH importance
  └─ Status: ✅ (optimal conditions)

Result: EXECUTE

RETURN:
{
  delegationId: 'deleg-abc789',
  status: 'delegated',
  energyStatus: 'solar peak (92% clean)',
  communityVote: 'HIGH importance'
}
```

---

## 📋 Configuration Templates

### Template A: Night-Only User

```sql
-- No intensive work during day, maximize night windows
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('night-owl@example.com', 15);

INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-1', 'night-owl@example.com', 20, 8, 1, '8 PM - 8 AM');

-- Warn on power-intensive
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-1', 'night-owl@example.com', 'max_power_watts', '250', 'warn', 'Battery aware');
```

### Template B: Weekend-Only User

```sql
-- Work-life balance: only weekends
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('weekday-busy@example.com', 5);

INSERT INTO delegation_hours (id, user_id, day_of_week, start_hour, end_hour, is_active, description)
VALUES
  ('dh-sat', 'weekday-busy@example.com', 6, 0, 23, 1, 'Saturday all day'),
  ('dh-sun', 'weekday-busy@example.com', 0, 0, 23, 1, 'Sunday all day');

-- Warn on sync/backup
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-1', 'weekday-busy@example.com', 'no_data_intensive', 'any', 'warn', 'During work week');
```

### Template C: Minimal User (No Restrictions)

```sql
-- Default configuration, all tasks welcome
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('minimal@example.com', 5);

-- No delegation_hours entries (means: anytime)
-- No ethical_rules entries (means: all task types OK)
```

---

## 🔧 Query Reference

### Quick Checks

```sql
-- Am I in idle period?
SELECT
  CASE WHEN idle_until > datetime('now') THEN 'YES' ELSE 'NO' END as in_idle
FROM task_cooldown WHERE user_id = 'you@example.com';

-- What are my delegation windows?
SELECT start_hour || '-' || end_hour as window, description
FROM delegation_hours WHERE user_id = 'you@example.com';

-- What rules do I have?
SELECT rule_type, rule_value, enforcement_level
FROM ethical_rules WHERE user_id = 'you@example.com';
```

### Modify Configuration

```sql
-- Increase idle period to 30 minutes
UPDATE user_preferences SET min_idle_between_tasks_minutes = 30
WHERE user_id = 'you@example.com';

-- Disable a rule temporarily
UPDATE ethical_rules SET is_active = 0
WHERE id = 'rule-power' AND user_id = 'you@example.com';

-- Add new delegation window (afternoon)
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-afternoon', 'you@example.com', 13, 17, 1, 'Afternoon window');
```

---

## 🎓 Understanding Enforcement Levels

### STRICT (Hard Block)

```
Violates rule?
     ↓
  ❌ BLOCKED
  (task rejected, returned to queue or dropped)

Example: max_power_watts = 200, task = 300W
Result: REJECTED
```

### WARN (Soft Block)

```
Violates rule?
     ↓
  ⚠️  WARNING LOGGED
  (task executes anyway)

Example: no_data_intensive = any, task = "backup"
Result: EXECUTED + WARNING IN LOGS
```

---

## 📈 Decision Tree (Text Format)

```
TASK ARRIVES: "video-encode" 500W from alice

├─ IDLE CHECK
│  ├─ idle_until > now?
│  │  ├─ YES → DEFER(idle remaining)
│  │  └─ NO → continue
│
├─ DELEGATION HOURS CHECK
│  ├─ urgency='critical'?
│  │  ├─ YES → skip this check, continue
│  │  └─ NO → check hours
│  ├─ current time in window?
│  │  ├─ YES → continue
│  │  └─ NO → DEFER(until next window)
│
├─ ETHICAL RULES CHECK
│  ├─ any strict violations?
│  │  ├─ YES → BLOCK(which rule)
│  │  └─ NO → continue
│  ├─ any warn violations?
│  │  ├─ YES → LOG WARNING, continue
│  │  └─ NO → continue
│
├─ ENERGY & VOTING (existing layers)
│  └─ ... (see renewable energy guide)
│
└─ RESULT: EXECUTE or DEFER or BLOCK
```

---

## 💡 Pro Tips

1. **Solar Users**: Set delegation hours to peak solar (9-15) + use 2-3 min idle
2. **Laptop Users**: Use 10-20 min idle + night/weekend windows for thermal rest
3. **Fanless Devices**: Set power limit to 50W max + block heavy computation
4. **Work-Life Balance**: Delegate only to weekends + evenings
5. **Conservative**: Whitelist specific safe tasks only
6. **Aggressive**: No delegation_hours + no ethical_rules (runs anytime)

---

## ✅ Validation Checklist

Before deploying your configuration:

- [ ] User preference record exists
- [ ] At least one delegation hour or (empty = anytime)
- [ ] Any ethical rules are correctly formed
- [ ] Rule values match rule type (e.g., watts for max_power_watts)
- [ ] Enforcement levels are 'strict' or 'warn'
- [ ] No conflicting rules (e.g., whitelist "cleanup" AND blacklist "cleanup")

---

## 🚀 Quick Start (Copy-Paste Ready)

### Step 1: Create User

```sql
INSERT INTO user_preferences (user_id, min_idle_between_tasks_minutes)
VALUES ('you@example.com', 10);
```

### Step 2: Add Time Window

```sql
INSERT INTO delegation_hours (id, user_id, start_hour, end_hour, is_active, description)
VALUES ('dh-night', 'you@example.com', 22, 8, 1, 'Night execution');
```

### Step 3: Add Power Limit

```sql
INSERT INTO ethical_rules (id, user_id, rule_type, rule_value, enforcement_level, reasoning)
VALUES ('r-power', 'you@example.com', 'max_power_watts', '250', 'strict', 'PSU rating');
```

### Step 4: Verify

```sql
SELECT * FROM user_preferences WHERE user_id = 'you@example.com';
SELECT * FROM delegation_hours WHERE user_id = 'you@example.com';
SELECT * FROM ethical_rules WHERE user_id = 'you@example.com';
```

Done! 🎉

---

See [USER_CONTROL_GUIDE.md](USER_CONTROL_GUIDE.md) for detailed explanations of every option.
