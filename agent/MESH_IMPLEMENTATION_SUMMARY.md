# 🌐 Decentralized Mesh Network - Implementation Summary

## What Just Got Built

A **peer-to-peer task coordination layer** where:

1. **Tasks get delegated** based on who has clean energy available
2. **Importance is democratically voted** by the community
3. **Public health always overrides** any eco-mode defaults
4. **Users have quotas** preventing abuse but allowing contributions
5. **Carbon impact is tracked** showing what was saved by waiting
6. **Everything is transparent** - full ledger of who did what, when, using what energy

---

## Three Breakthrough Ideas

### 1. **Democracy for Importance** (Not Algorithms)

Instead of:

```
Server decides: "This is important"
```

Community votes:

```
Alice: "CRITICAL - hospital backup"
Bob:   "NORMAL - routine cleanup"
Carol: "CRITICAL - life safety"

Result: 2/3 = CRITICAL (community knows better)
```

Voting options:

- **CRITICAL** = Life/death, public health, security
- **HIGH** = Business critical, time-sensitive
- **NORMAL** = Regular operations
- **LOW** = Maintenance, non-urgent
- **NON-CRITICAL** = "I'll wait weeks for 100% renewable"

### 2. **Energy-Aware Delegation**

```
Task created on Device A (coal grid)
  ↓
Search network:
  ├─ Alice has solar ☀️ (95% clean) ← Pick this!
  ├─ Bob has wind 💨 (80% clean)
  └─ Carol has battery 🔋 (60% charged)
  ↓
Delegate to Alice
  ↓
Alice executes during sunny afternoon
  ↓
Result: 0 kg CO2 vs 45 kg CO2 if executed on coal
```

### 3. **Graceful Degradation**

**Normal flow:**

1. Democracy votes on importance
2. Find peer with best energy
3. Delegate if approved
4. Execute optimally

**When voting is slow:**
→ Default to ECO mode (wait for clean energy)

**When it's critical (hospital, emergency):**
→ Override everything, execute immediately

**When everything fails:**
→ Execute locally in off-peak hours

---

## File Structure

```
agent/
├── mesh/
│   ├── taskDelegationNetwork.js      # Core delegation logic
│   └── meshSchema.js                  # SQLite tables for mesh
│
├── scheduler/
│   ├── ecoScheduler.js                # Updated for mesh integration
│   └── renewableEnergyModule.js       # Grid carbon awareness
│
├── MESH_NETWORK_GUIDE.md              # Comprehensive guide
├── RENEWABLE_ENERGY_GUIDE.md          # Energy optimization
└── ... (existing files)
```

---

## Core Components

### `TaskDelegationNetwork`

```javascript
// Register your device as a peer
await mesh.registerPeer("my-device", {
  name: "Alice's Solar MacBook",
  location: "San Francisco",
  currentEnergy: { type: "solar", percentClean: 95 },
  permissions: ["database-cleanup", "index-optimization"],
  maxTaskDuration: 3600000,
});

// Find best peer for a task
const best = await mesh.findBestPeer("database-cleanup", 600000, "normal");
// Returns: {peerId, peerName, energyScore, capacityScore}

// Delegate task to peer
await mesh.delegateTask(
  taskId,
  "database-cleanup",
  best.peerId,
  userId,
  "normal",
);
```

### `TaskImportanceVoting`

```javascript
// Submit for community vote
const vote = await voting.submitForVoting(
  taskId,
  "database-cleanup",
  "Weekly backup of user data",
);

// Users cast votes
await voting.castVote(vote.voteId, "alice", "normal", "Can wait, not urgent");
await voting.castVote(vote.voteId, "bob", "normal", "Schedule for off-peak");
await voting.castVote(vote.voteId, "carol", "high", "Data integrity critical");

// Get consensus
const consensus = await voting.getConsensus(vote.voteId);
// {consensus: 'normal', confidence: 0.67}
```

### `UserQuotaManager`

```javascript
// Check if user can execute task
const can = await quotas.canExecuteTask(
  userId,
  "database-cleanup",
  600000, // duration in ms
  200, // memory in MB
);

// Returns: {allowed, reasons, tier, quota}
// If FREE tier has 10 tasks/day and used 9: allowed=false
```

### `EnergySLA`

```javascript
// Define how patient the user is
const sla = EnergySLA.getSLAPolicy("eco", gridStatus);
// {
//   maxWaitTime: Infinity,
//   energyRequired: 'clean-only',
//   canDelegate: true,
//   canInterrupt: true
// }

// Check if waiting would break SLA
if (EnergySLA.wouldBreakSLA(taskStartTime, "urgent")) {
  // Been waiting >30 mins, must execute now
}
```

---

## Database Schema Additions

**New tables:**

```sql
peers                    -- Connected devices in network
importance_votes         -- Community voting on task criticality
votes                    -- Individual votes cast
user_tiers               -- User tier (free|supporter|contributor)
task_delegations         -- Task movement between devices
mesh_events              -- All network events logged
peer_permissions         -- Who can delegate to whom
carbon_impact            -- Carbon savings tracked
```

All integrated with existing `tasks`, `feedback`, `metrics` tables.

---

## Configuration

### Enable Mesh Network

```env
# .env
MESH_ENABLED=true

# Your device info
MESH_PEER_ID=alice-device-uuid
MESH_PEER_NAME="Alice's Solar MacBook"
MESH_PEER_LOCATION="San Francisco, CA"
MESH_CURRENT_ENERGY_TYPE=solar
MESH_CURRENT_ENERGY_PERCENT_CLEAN=95

# Allowed tasks (what others can delegate to you)
MESH_ALLOWED_TASKS=database-cleanup,index-optimization,log-rotation
MESH_MAX_TASK_DURATION_MS=3600000

# Quotas
MESH_USER_QUOTA_TIER=free        # free|supporter|contributor
```

### Grant Permissions

```bash
# Allow Alice to delegate to your device
sqlite3 agent.db \
  "INSERT INTO peer_permissions
   (peer_id, user_id, can_execute_task)
   VALUES ('my-device', 'alice@example.com', '*');"
```

---

## Decision Flow

### When Task is Submitted

```
1. Check importance voting
   └─ If public health keyword → CRITICAL override
   └─ Else → Start community vote (5 min window)

2. Determine SLA
   └─ How patient is user? (URGENT → ECO)
   └─ Extract maxWaitTime + energyRequired

3. Check quotas
   └─ Does user have quota available?
   └─ If not → Queue for when quota resets
   └─ If yes → Proceed

4. Find best peer
   └─ Who has:
      ├─ Permission to execute?
      ├─ Capacity available?
      ├─ Cleanest energy?
      └─ Right timezone?
   └─ Score and rank peers

5. Delegate (if consensus)
   └─ Verify permissions
   └─ Sign with user's key
   └─ Send to peer
   └─ Log delegation event

6. Peer executes
   └─ Verify signature
   └─ Execute task
   └─ Report energy used
   └─ Calculate carbon saved

7. Close loop
   └─ Update task status
   └─ Record carbon impact
   └─ Update user stats
   └─ Log to mesh events
```

---

## User Experience

### Alice's Perspective

```
1. Alice submits: "Clean my database"
   └─ Eco-friendly Alice = SLA: "ECO" (wait for clean energy)

2. Agent checks:
   ├─ Grid carbon = 450 kg CO2/MWh (dirty)
   ├─ Alice's solar = 30% (cloudy afternoon)
   ├─ Bob's wind = 85% (peak wind evening)
   └─ → Delegate to Bob!

3. Voting (happens in background):
   └─ 3 community members vote "NORMAL"
   └─ Consensus: NORMAL (can wait for clean energy)

4. Task executes on Bob's device at 6 PM
   └─ Wind peak = clean energy
   └─ Bob's device = 80% renewable
   └─ Uses 0 kg CO2 equivalent (wind only)

5. Alice sees notification:
   "✅ Task completed! Executed on Bob's wind power.
    Carbon saved vs coal: 45 kg CO2
    Waiting time: 4 hours (SLA: any)"
```

### Bob's Perspective

```
1. Bob's device advertises:
   ├─ Location: Portland, OR
   ├─ Current energy: 80% wind
   ├─ Capacity: 4 CPU, 16 GB RAM
   ├─ Permissions: Any of Bob's approved tasks
   └─ Status: online

2. Mesh finds Bob as "best peer" for Alice's task
   └─ Wind peak + capacity available

3. Receives delegation:
   ├─ Signature: ✓ Valid (Alice's key)
   ├─ Permissions: ✓ Alice approved for 'database-cleanup'
   ├─ Quota: ✓ Alice has quota available
   └─ → Accept

4. Executes task
   └─ Monitors energy usage
   └─ Reports: Used 200 Wh from wind turbine

5. Contributes to network
   └─ Bob's reputation increases
   └─ "Helped 3 users save 120 kg CO2 this month"
```

### Carol's Perspective (Battery User)

```
1. Carol has battery but no solar/wind
   └─ Tier: FREE (10 tasks/day, limited)

2. Carol delegates her tasks to Alice/Bob
   └─ Gets priority during solar/wind peaks
   └─ Her battery charges via renewable delegation

3. Carol votes on importance
   └─ Each vote = participation credit
   └─ 50 votes → Promote to SUPPORTER tier
   └─ More quota, more respect

4. Carol's contribution valued
   └─ "Participated in 100+ importance votes"
   └─ Grows community wisdom about what's critical
```

---

## Carbon Impact Tracking

Every delegation tracked:

```sql
SELECT
  delegated_at,
  task_name,
  from_device,
  to_device,
  grid_carbon_at_execution,
  renewable_percent_at_execution,
  carbon_emitted_kg,
  carbon_saved_kg
FROM carbon_impact
ORDER BY delegated_at DESC;

-- Example:
-- 2026-01-20 18:00 | database-cleanup | alice | bob | 450 | 80% | 0 | 45 kg ✅
-- 2026-01-20 19:30 | index-optimization | carol | alice | 350 | 60% | 21 | 24 kg ✅
-- 2026-01-20 21:00 | log-rotation | alice | alice | 200 | 90% | 2 | 43 kg ✅
```

**Monthly report:**

```
Total tasks: 47
Total carbon saved: 850 kg
Average renewable: 75%
Best delegation: Bob → Alice (95% renewable)
Worst delegation: Carol (battery, limited choice)

Recommendation: Carol should add solar to improve
```

---

## Governance Model

### Voting Methods (Choose One)

**Democracy 1: One-User-One-Vote (Simplest)**

```
Each user = 1 vote
Result: Pure democracy
```

**Democracy 2: Reputation-Weighted (Merit-Based)**

```
Vote weight = reputation_score (0-100)
Good behavior = higher weight
Spamming = lower weight
```

**Democracy 3: Stake-Based (Fair Resource Use)**

```
Vote weight = donation_amount + task_contribution
Incentivizes genuine participation
```

**Democracy 4: Hybrid (Balanced)**

```
Vote weight = (tenure * 0.3) + (tasks_completed * 0.4) + (donations * 0.3)
Rewards long-term, active, supportive members
```

### Quota Progression

```
FREE (default):
  └─ 10 tasks/day
  └─ Can become SUPPORTER by:
     ├─ Donating (any amount)
     └─ OR completing 50 tasks

SUPPORTER ($5/month or equivalent):
  └─ 50 tasks/day
  └─ Can become CONTRIBUTOR by:
     ├─ Completing 100+ tasks
     ├─ Casting 50+ votes
     └─ Member for 3+ months

CONTRIBUTOR (Active volunteer):
  └─ 200 tasks/day
  └─ Highest trust level
  └─ Can influence governance
```

---

## Safety Safeguards

| Risk                          | How Mitigated                                      |
| ----------------------------- | -------------------------------------------------- |
| Malicious peer steals task    | Cryptographic signatures + key management          |
| User floods network           | Quotas + reputation system                         |
| Voting gamed                  | Multiple voting methods, can switch if compromised |
| Device goes offline           | Timeout + retry on another peer                    |
| Bad actor executes wrong task | Permissions whitelist + ACL                        |
| Energy data faked             | Cryptographic proofs (optional)                    |
| Public health ignored         | Automatic CRITICAL tag for health keywords         |

---

## Public Health Priority

Automatic overrides for:

```python
HEALTH_CRITICAL = [
    'hospital', 'ambulance', 'emergency', 'medical',
    'vaccine', 'drug', 'oxygen', 'blood',
    'fire', 'police', 'rescue', 'disaster',
    'nuclear', 'power-grid', 'water-treatment',
    'sewage', 'pandemic', 'quarantine'
]

if any(keyword in task for keyword in HEALTH_CRITICAL):
    importance = 'CRITICAL'      # Auto-critical
    sla = 'URGENT'               # 30 min max wait
    energy = 'any'               # Use any energy
    log.warn(f"PUBLIC HEALTH OVERRIDE: {task}")
```

---

## Getting Started

### 1. Enable Mesh in .env

```env
MESH_ENABLED=true
MESH_PEER_ID=my-unique-device-id
MESH_PEER_NAME="My Device Name"
MESH_ALLOWED_TASKS=database-cleanup,index-optimization
MESH_CURRENT_ENERGY_TYPE=solar
```

### 2. Initialize Mesh Tables

```bash
# In agent initialization
import { addMeshNetworkSchema } from './mesh/meshSchema.js';
addMeshNetworkSchema(db);
```

### 3. Register as Peer

```javascript
const mesh = new TaskDelegationNetwork(sharedMemory, renewableModule);
await mesh.registerPeer("my-device", {
  name: "My Server",
  permissions: ["database-cleanup"],
  maxTaskDuration: 3600000,
});
```

### 4. Submit a Task

```javascript
await submitTask("database-cleanup", {}, "normal");
// Agent automatically checks mesh before executing
```

### 5. Watch the Magic

```bash
npm run logs | grep -i mesh
# See delegations, votes, carbon saved
```

---

## Philosophy

**Three principles converge:**

1. **Energy**: Tasks executed when clean energy available
2. **Democracy**: Community decides importance, not algorithms
3. **Resilience**: Network survives single device failure

Result: **Decentralized, democratically-governed, energy-optimized computing.**

Not cloud servers deciding for you. Not one person's device deciding. **Your cooperative network, voting together, using clean energy together.**

---

**The future of sustainable computing is peer-to-peer.** 🌱

Devices share clean energy. Communities vote on priorities. Public health always wins. And carbon impact is transparent to everyone.
