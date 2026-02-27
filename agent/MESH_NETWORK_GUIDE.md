# 🌐 Decentralized Task Mesh Network

## Vision

Instead of cloud servers deciding when to run your tasks, **your community decides together**. Tasks get delegated to whoever has clean energy available, with importance democratically determined and public health always prioritized.

```
Alice (☀️ Solar)          Bob (💨 Wind)           Carol (🔋 Battery)
   ↓                         ↓                           ↓
   └─────────────── Task Mesh Network ───────────────┘
                            ↓
                    Voting Pool
                (Is this critical?)
                            ↓
        Energy + Democracy + Public Health
                    → Execute optimally
```

---

## Three Core Components

### 1. **Democratic Importance Voting**

Users vote on whether a task is:

- **CRITICAL** - Life/death, public health, security (execute anywhere)
- **HIGH** - Time-sensitive business (clean energy preferred)
- **NORMAL** - Regular operations (prefer clean)
- **LOW** - Maintenance (wait for clean)
- **NON-CRITICAL** - "I can wait weeks for 100% renewable"

**Public health override:** Tasks mentioning "hospital", "ambulance", "emergency", "sewage" auto-flag as critical.

### 2. **User Quotas & Fair Resource Distribution**

Prevent abuse, ensure fairness:

```
FREE TIER:
  - 10 tasks/day
  - 10 min max each
  - 100 MB memory

SUPPORTER (Monthly donation):
  - 50 tasks/day
  - 30 min max each
  - 500 MB memory

CONTRIBUTOR (Active volunteer):
  - 200 tasks/day
  - 60 min max each
  - 2 GB memory
```

### 3. **Decentralized Delegation**

Tasks can move between devices:

```
Task created on Device A (coal grid, 1% wind)
  ↓
"Can I delegate?" (check permissions, quotas)
  ↓
"Find best peer" (who has clean energy?)
  ↓
Device B (80% solar, sunny) ← Delegate here!
  ↓
"Execute" + "Record carbon saved"
```

---

## Energy-Aware SLAs (Service Levels)

Users choose how patient they want to be:

```env
# "I need this in 30 minutes, any energy source"
SLA=URGENT
→ Execute immediately, even if grid is dirty
→ Can delegate to any available peer
→ Cannot be interrupted

# "I need this today, but prefer clean energy"
SLA=HIGH
→ Execute within 24 hours
→ Prefer clean grid/renewable
→ Can delegate
→ Cannot be interrupted

# "Normal operation, wait for clean if needed"
SLA=NORMAL
→ Execute within 48 hours
→ Prefer clean grid
→ Can delegate
→ Can be interrupted if battery/grid gets worse

# "I'm eco-conscious, wait for perfect conditions"
SLA=ECO
→ Execute when grid is clean (could be days)
→ Must be renewable generation
→ Can delegate
→ Can be interrupted

# "Only use my solar generation"
SLA=SOLAR_ONLY
→ Execute only during peak solar (9 AM - 3 PM, sunny)
→ Cannot delegate (stays on your device)
→ Can be interrupted

# "Only use wind generation"
SLA=WIND_ONLY
→ Execute during strong wind hours
→ Cannot delegate
→ Can be interrupted
```

---

## How Delegation Works

### Step 1: User Submits Task

```javascript
const result = await mesh.submitTask({
  name: "database-cleanup",
  duration: 600000, // 10 minutes max
  memory: 200, // MB
  sla: "normal", // How patient?
  importance: null, // Will be voted on
});
```

### Step 2: Community Votes on Importance

```
Within 5 minutes, community votes:

Alice: "HIGH - we need clean backups"
Bob:   "NORMAL - can wait for off-peak"
Carol: "HIGH - database is critical"

Result: 2/3 = HIGH consensus (66% confidence)
```

### Step 3: Agent Finds Best Peer

```
Current situation:
- Alice: 40% solar, 30% charge (not ideal)
- Bob:   80% wind, peak wind hours (GREAT!)
- Carol: 100% battery, 60% charged (medium)

Grid carbon: 450 kg CO2/MWh (moderate)
```

**Decision:**

- Task importance: HIGH
- Best energy: Bob (wind peak)
- Action: Delegate to Bob

### Step 4: Delegation with Permissions

```
[User A's Device] signs delegation:
  "Execute 'database-cleanup' on Bob's device
   Signed: Alice's private key
   Permissions: ✓ Alice has permission to use Bob's device"

[Bob's Device] verifies:
  "Signature valid? ✓
   Alice has permission to use me? ✓
   Task type allowed? ✓
   Memory available? ✓
   Accept delegation"

[Bob executes at 3 PM] (wind peak)
  Result: Task completed in 8 minutes using 150 MB
  Energy: 200 Wh from wind turbine
  Carbon: 0 kg CO2 (wind generation)
  vs if executed on Alice: 45 kg CO2 (coal grid)

Saved: 45 kg CO2
```

### Step 5: Record & Feedback

```javascript
await mesh.recordCompletion(delegationId, {
  energyUsedWh: 200,
  gridCarbonAt: 450,
  renewablePercent: 80,
  executedPeerId: "bob-device",
  actualDuration: 480000,
  memoryUsed: 150,
});
```

**Carbon Impact Recorded:**

```
Carbon emitted if executed on dirty grid: 45 kg CO2
Carbon emitted if executed on renewable: 0 kg CO2
Carbon saved: 45 kg CO2 ✅
```

**User feedback loop:**

- Alice sees: "Task completed, 45 kg CO2 saved by waiting!"
- Bob sees: "Executed Alice's task during my wind peak"
- Network learns: database-cleanup is often safe to defer

---

## Permission Model

### User-to-Peer Permissions

Alice grants Bob permission to execute tasks:

```sql
-- Bob can execute 'database-cleanup' on Alice's device
INSERT INTO peer_permissions (peer_id, user_id, can_execute_task)
VALUES ('bob-device', 'alice', 'database-cleanup');

-- Or: Bob can execute anything
INSERT INTO peer_permissions (peer_id, user_id, can_execute_task)
VALUES ('bob-device', 'alice', '*');

-- With expiration
INSERT INTO peer_permissions (peer_id, user_id, can_execute_task, expires_at)
VALUES ('bob-device', 'alice', 'database-cleanup', '2026-02-20 23:59:59');
```

### Device-Level Trust

Bob's device advertises what it accepts:

```javascript
// Bob's device configuration
registerPeer("bob-device", {
  name: "Bob's Wind-Powered Server",
  permissions: ["database-cleanup", "index-optimization", "log-rotation"],
  // ❌ NOT permitted: 'access-files', 'network-calls', etc.
  maxTaskDuration: 3600000,
  timezone: "UTC",
});
```

### Veto Rights

Any user can veto a delegation:

```javascript
// Alice says: "Actually, don't delegate my task to Carol"
await mesh.vetoDelegation(delegationId);
// Task stays on Alice's device, executes in eco-mode
```

---

## Voting Mechanics

### Vote Weighting (Optional)

Different voting systems:

**1. One-Vote-Per-User (Simplest)**

```
1 vote = 1 weight
```

**2. Reputation-Weighted**

```
Vote weight = user_reputation_score (0-100)
```

**3. Stake-Based (Requires Microdonation)**

```
Vote weight = amount_donated (can include time donation)
```

**4. Hybrid (Time + Contribution)**

```
Vote weight = (months_active * 0.5) + (tasks_completed * 0.3) + (donations * 0.2)
```

### Consensus Rules

- **60% agreement** = Decisive
- **Below 60%** = Default to NORMAL (middle ground)
- **Unanimous** = Very high confidence

---

## Quota System

### Task Tracking

```sql
-- Count user's tasks today
SELECT COUNT(*) FROM tasks
WHERE user_id = 'alice'
  AND created_at > datetime('now', 'start of day');

-- Check quota
Tier: FREE (max 10/day)
Completed today: 7
Remaining: 3
```

### Quota Increases

**Free → Supporter:**

- $5/month donation
- Or: 50 completed tasks
- Or: 10 community votes cast

**Supporter → Contributor:**

- 100+ tasks executed
- 50+ votes cast
- Member for 3+ months

### Quota Reset

Resets at midnight in user's timezone.

---

## Public Health Override

Automatic critical priority for:

```python
HEALTH_KEYWORDS = [
    'health', 'medical', 'hospital', 'emergency',
    'ambulance', 'drug', 'vaccine', 'oxygen',
    'security', 'police', 'fire', 'rescue',
    'hazmat', 'nuclear', 'power-grid', 'water',
    'sewage', 'pandemic', 'disaster'
]

if any(keyword in task_name for keyword in HEALTH_KEYWORDS):
    importance = 'CRITICAL'  # Always, regardless of voting
    sla = 'URGENT'           # Execute ASAP
    energy_priority = 'any'  # Use any energy source
    log.warn(f"PUBLIC HEALTH OVERRIDE: {task_name}")
```

Examples:

- "hospital-backup-power-test" → CRITICAL
- "water-treatment-safety-check" → CRITICAL
- "emergency-shelter-heating" → CRITICAL
- "routine-database-cleanup" → Vote normally

---

## Network Governance

### Registry

Mesh maintains a registry of available peers:

```sql
SELECT device_name, location, current_energy,
       status, last_seen, permissions
FROM peers
ORDER BY last_seen DESC;

-- Example output:
-- "Alice's Solar MacBook" | San Francisco | {type: solar, %clean: 95} | online
-- "Bob's Wind Server" | Portland | {type: wind, %clean: 85} | online
-- "Carol's Hydro Backup" | Seattle | {type: hydro, %clean: 100} | offline
```

### Network Events Log

Every action is logged:

```sql
SELECT event_type, peer_id, task_id, event_data, timestamp
FROM mesh_events
ORDER BY timestamp DESC;

-- Examples:
-- peer_online | alice-device | null | {device_name: '...'}
-- task_delegated | bob-device | task-123 | {from: alice-device, sla: normal}
-- consensus_reached | null | vote-456 | {importance: high, confidence: 0.8}
-- carbon_saved | carol-device | task-123 | {kg_co2: 45}
```

---

## Carbon Impact Dashboard

Users see real-time impact:

```javascript
// Alice's personal stats
{
  tasksExecuted: 47,
  totalCarbonSaved: 850,    // kg CO2
  energyUsedClean: 8500,    // Wh from renewable
  energyUsedDirty: 2100,    // Wh from fossil
  renewablePercent: 80,
  averageDeferralTime: 12,  // hours waited for clean energy

  thisMonth: {
    tasksDeferred: 18,       // Waited for clean energy
    carbonSaved: 230         // vs executing immediately
  }
}
```

---

## Example Scenarios

### Scenario 1: Database Backup (No Hurry)

```javascript
await mesh.submitTask({
  name: "database-backup",
  sla: "eco", // "I can wait for perfect energy"
  durationMax: 1800000,
});

// Tuesday 3 PM: Submit on Alice's coal-heavy grid
// Tuesday evening: Still coal (thermal generators ramping up)
// Wednesday 6 AM: Coal still high (industrial demand)
// Wednesday 1 PM: ✅ Solar peak! 85% renewable
//   → Delegation to Bob (solar)
//   → Executed with 0 coal energy
//   → Carbon saved: 120 kg CO2
```

### Scenario 2: Security Patch (Urgent)

```javascript
await mesh.submitTask({
  name: "security-patch",
  importance: "CRITICAL", // Overrides voting
  sla: "URGENT", // Must execute in 30 mins
  durationMax: 300000,
});

// Tuesday 9 PM: Submit
// Tuesday 9:05 PM: Democracy votes (but override active)
// Tuesday 9:08 PM: Execute immediately on local device
// Result: Patch applied, security hole closed
// (Carbon cost acceptable for security)
```

### Scenario 3: Cooperative Mesh (Everyone Helps)

```
Alice has sunny weather (solar good):
  → Executes her own solar-friendly tasks
  → Executes delegated tasks from Bob/Carol during solar hours

Bob has windy weather (wind good):
  → Executes his own wind-friendly tasks
  → Executes delegated tasks from Alice/Carol during wind peak

Carol has battery but no sun/wind:
  → Stores energy in battery during others' peaks
  → Asks for delegation to Alice/Bob
  → Contributes reputation/donations to community

Result: Network average = 85% renewable
vs individual = 50-60% each
```

---

## Setup & Configuration

### Register Your Peer

```env
# .env configuration for your device
MESH_ENABLED=true
MESH_PEER_ID=unique-device-id
MESH_PEER_NAME="My Solar Server"
MESH_PEER_LOCATION="San Francisco, CA"
MESH_ALLOWED_TASKS=database-cleanup,index-optimization,log-rotation
MESH_MAX_TASK_DURATION_MS=3600000
MESH_TIMEZONE=America/Los_Angeles

# Energy information
MESH_CURRENT_ENERGY_TYPE=solar      # solar|wind|hydro|battery|grid
MESH_CURRENT_ENERGY_PERCENT_CLEAN=95
```

### Join the Network

```bash
# Register device
const mesh = new TaskDelegationNetwork(sharedMemory, renewableModule);
await mesh.registerPeer('my-device-id', {
  name: 'My Solar Server',
  location: 'San Francisco',
  currentEnergy: { type: 'solar', percentClean: 95 },
  capacity: { cpu: 4, memory: 16000 },
  permissions: ['database-cleanup', 'index-optimization'],
  maxTaskDuration: 3600000
});
```

### Grant Permissions

```bash
# Allow Alice to delegate tasks to your device
sqlite3 agent.db \
  "INSERT INTO peer_permissions (peer_id, user_id, can_execute_task)
   VALUES ('my-device', 'alice@example.com', '*');"
```

---

## Monitoring & Transparency

**All actions visible:**

- Who delegated what?
- When was it executed?
- On which device?
- What energy was used?
- How much carbon was saved?

**Everyone can see:**

```sql
-- Public ledger of delegations
SELECT task_id, from_peer_id, to_peer_id,
       energy_used_wh, carbon_saved_kg, executed_at
FROM task_delegations
WHERE status = 'completed'
ORDER BY executed_at DESC;
```

---

## Challenges & Safeguards

| Risk                                       | Safeguard                                          |
| ------------------------------------------ | -------------------------------------------------- |
| Malicious peer executes stolen task        | Signature verification + key management            |
| User floods network with unimportant tasks | Quotas + reputation system                         |
| Voting system gamed                        | Multiple voting methods, can switch if compromised |
| Device goes offline mid-task               | Timeout + retry on another peer                    |
| Energy data manipulated                    | Cryptographic proofs (optional)                    |
| Someone delegates without permission       | Permissions table + cryptographic signature        |

---

## Democracy in Action

**When voting is slow:**
→ Default to ECO mode (wait for clean energy)

**When public health is involved:**
→ Override voting entirely (execute critical tasks)

**When community disagrees:**
→ Allow individual veto (user can opt-out)

**When energy is perfect:**
→ Execute immediately (consensus unnecessary)

---

**This is peer-to-peer sustainability.** Not centralized cloud, not individual machines—**a cooperative mesh where everyone benefits from clean energy available to anyone in the network.** 🌱

Contributions (time, devices, renewable energy) earn reputation, votes earn influence, and public health always wins.
