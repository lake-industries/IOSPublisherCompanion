# Task Abort & Segmentation Guide

## Problem Statement

**The Energy Waste Challenge:**

Previous system could defer tasks before execution, but once a task started:

- No mid-execution abort capability
- No thermal prediction (task starts, system overheats halfway through)
- No checkpointing (failure → restart from zero, wasting energy)
- No device capability mapping (don't know what tasks are "safe" for this hardware)

**Real-world example:**

```
Task: ML model training (600W, 4 hours)
Device: Fanless laptop (max safe temp: 65°C)

Old System:
├─ Pre-execution check: Temp 45°C → "looks ok, execute"
├─ 30 minutes in: Temp reaches 72°C (WARNING)
├─ 45 minutes in: Temp reaches 78°C (critical!)
├─ 50 minutes in: System throttles, slows down
├─ ABORT with no checkpoint → 50 minutes wasted, restart needed
└─ Energy wasted: 500W × 50 min ≈ 417 Wh down the drain

New System:
├─ Pre-execution thermal prediction: "Peak will be 75°C at 35 min mark"
├─ Decision: "Segment into 4×1-hour chunks (5°C per segment)"
├─ Segment 1: Runs, saves checkpoint at 25% complete
├─ Continues checkpoints every 25%
├─ If abort happens: Resume from last checkpoint, not from zero
└─ Maximum waste per abort: 25% of energy (vs 50%)
```

---

## New System: 4 Components

### 1. Thermal Prediction (BEFORE execution)

**What it does:**

- Estimates peak temperature a task will reach
- Predicts when peak occurs
- Recommends: PROCEED | WAIT | SEGMENT | SKIP

**How it works:**

```
Input: Task power rating + Device profile
  ↓
Estimate heat generation (task type × device efficiency)
  ↓
Model temperature trajectory (heating vs cooling rates)
  ↓
Compare peak vs device thermal zones
  ↓
Decision: Safe? Segmentable? Skip?
```

**Temperature modeling:**

```javascript
// Example: 400W video encoding on fanless laptop

Starting temperature: 35°C
Task heat generation: 400W × 0.85 (fanless efficiency) = 340W heat
Device cooling rate: 1.5°C/min when idle
Device thermal mass: 1.0 (normal laptop)

Temperature trajectory (mathematical model):
├─ Minute 0:   35°C (start)
├─ Minute 5:   42°C (rapid heating, cooling can't keep up)
├─ Minute 10:  48°C
├─ Minute 15:  53°C
├─ Minute 20:  57°C
├─ Minute 25:  60°C (peak, heating = cooling rate)
├─ Minute 26+: Asymptotic at ~62°C

Prediction result:
├─ Peak temperature: 62°C
├─ Peak time: ~25 minutes
├─ Safety margin: 65°C - 62°C = 3°C above safe
├─ Recommendation: "SEGMENT into 2×2-hour chunks"
```

**Device profiles:**

Different devices need different thresholds:

```javascript
// Fanless laptop (passive cooling only)
{
  name: "Fanless ultrabook",
  thermalMass: 0.6,           // Lower mass = heats faster
  coolingRate: 0.8,           // Slower cooling (no fans)
  coolingEffectiveness: 0.5,
  thermalEfficiency: 0.90,    // 90% becomes heat (poor ventilation)
  criticalThreshold: 80,
  warningThreshold: 70,
  safeThreshold: 60,          // Conservative!
  optimalMaxTemp: 45
}

// Desktop workstation (active cooling)
{
  name: "Desktop with 3 fans",
  thermalMass: 2.5,           // High mass = heats slower
  coolingRate: 3.0,           // Fast cooling (dual fans)
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.70,    // 70% becomes heat (good ventilation)
  criticalThreshold: 95,
  warningThreshold: 85,
  safeThreshold: 75,
  optimalMaxTemp: 60
}

// Solar-powered edge device (extreme efficiency)
{
  name: "Solar IoT device",
  thermalMass: 0.4,
  coolingRate: 2.0,
  coolingEffectiveness: 0.9,
  thermalEfficiency: 0.60,    // Natural convection only
  criticalThreshold: 70,
  warningThreshold: 60,
  safeThreshold: 50,
  optimalMaxTemp: 35
}
```

**Pre-flight check example:**

```javascript
// Task object
{
  id: "task-456",
  type: "video-encoding",
  estimatedPowerWatts: 400,
  estimatedDurationSeconds: 7200,  // 2 hours
  segmentable: true,
  priority: "normal"
}

// Device profile (from database)
{
  criticalThreshold: 80,
  safeThreshold: 60,
  coolingRate: 1.5
}

// Pre-flight check result
{
  safeToRun: true,
  peakTempEstimate: 62,
  peakTempTime: 25,
  safetyMargin: -2,  // NEGATIVE = exceeds safe threshold
  reason: "Peak exceeds safe temp by 2°C. Recommend segmentation.",
  recommendation: "BREAK_INTO_SEGMENTS",
  segments: [
    { segmentId: 1, startTime: 0, endTime: 3600, coolingBreakAfter: 300 },
    { segmentId: 2, startTime: 3600, endTime: 7200, coolingBreakAfter: 0 }
  ]
}
```

**API:**

```javascript
const predictor = new ThermalPrediction(memory, thermalMonitor);

// Pre-flight check
const prediction = await predictor.preFlightThermalCheck(task, deviceProfile);

// Get wait time if deferring
const wait = await predictor.getWaitTimeUntilSafe(task, deviceProfile);
// → { minutesUntilSafe: 15, currentTemp: 65, targetTemp: 60 }

// Recommend segmentation
const segmentation = predictor.recommendSegmentation(
  task,
  prediction,
  deviceProfile,
);
// → { segmentsRecommended: 3, strategy: "PAUSE_AND_RESUME", segments: [...] }

// Save device profile to database
await predictor.saveDeviceProfile("laptop-001", profileConfig);
```

---

### 2. Task Checkpointing (DURING execution)

**What it does:**

- Task registers a "save state" function
- System calls it when abort/interrupt needed
- Saves progress to database
- Enables resume from last checkpoint instead of zero

**Why it matters:**

```
Example: 2-hour video encoding task

Traditional abort:
├─ 90 minutes in: Thermal abort triggered
├─ Progress: LOST
├─ Must restart from 0%
└─ Energy wasted: 1.5 hours × 400W = 600 Wh 😞

With checkpoints:
├─ Every 30 minutes: Checkpoint saved (progress marker)
├─ 90 minutes in: Thermal abort
├─ Latest checkpoint: 60 minutes (from checkpoint #2)
├─ Resume from 50% (60 min completed)
├─ Only 30 minutes wasted (last segment)
└─ Energy wasted: 0.5 hours × 400W = 200 Wh 😊
```

**Checkpoint flow:**

```
Task execution loop:
├─ Start task, register checkpoint callback
├─ Every N minutes: Call checkpoint function
├─ Callback returns: { progress, state, output, metadata }
├─ Save to task_checkpoints table
├─ If abort: Use latest checkpoint to resume
└─ On completion: Clean up old checkpoints
```

**Example implementation in task code:**

```javascript
// Task code (video encoding)
class VideoEncodingTask {
  async execute() {
    // Register checkpoint function
    checkpointMgr.registerCheckpointFunction("task-456", async () => {
      return {
        progress: this.currentSegmentProgress, // 0-100
        state: {
          lastProcessedFrame: this.frameIndex,
          encodedSegments: this.completedSegments,
          partialOutput: this.bufferData,
        },
        output: {
          intermediatePath: this.tempFile,
          frameCount: this.frameIndex,
        },
        metadata: {
          lastCheckpointTime: Date.now(),
        },
      };
    });

    // Start monitoring
    await monitor.startMonitoring("task-456", task, async () => {
      // This abort callback is called if thermal reaches critical
      logger.info("Pausing video encoding...");
      this.paused = true;
      // System will have already saved checkpoint
    });

    // Main execution loop
    while (this.frameIndex < this.totalFrames) {
      if (this.paused) {
        logger.info("Resuming from checkpoint...");
        const checkpoint = await checkpointMgr.resumeFromCheckpoint("task-456");
        this.frameIndex = checkpoint.state.lastProcessedFrame;
        this.paused = false;
      }

      this.encodeFrame(this.frameIndex++);

      // Periodic checkpoint saving
      if (this.frameIndex % 100 === 0) {
        await checkpointMgr.saveCheckpoint("task-456", {
          progress: (this.frameIndex / this.totalFrames) * 100,
          state: { lastProcessedFrame: this.frameIndex },
          reason: "periodic",
        });
      }
    }

    // Clean up on completion
    await checkpointMgr.cleanupCheckpoints("task-456");
  }
}
```

**Checkpoint database schema:**

```sql
CREATE TABLE task_checkpoints (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  checkpoint_number INTEGER,      -- Which checkpoint (1st, 2nd, etc.)
  progress_percent INTEGER,       -- 0-100% complete
  state_data TEXT,               -- JSON: task-specific state
  output_data TEXT,              -- JSON: partial results
  reason TEXT,                   -- 'periodic' | 'abort_thermal' | 'manual'
  timestamp DATETIME,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

-- Example row:
{
  id: "ckpt-789",
  task_id: "task-456",
  checkpoint_number: 3,
  progress_percent: 75,
  state_data: '{"frameIndex": 1500, "encodedSegments": 3}',
  output_data: '{"tempFile": "/tmp/encode-3.mp4", "frameCount": 1500}',
  reason: "abort_thermal",
  timestamp: "2026-01-20 14:35:22"
}
```

**API:**

```javascript
const checkpoint = new TaskCheckpointManager(memory);

// Register save function
checkpoint.registerCheckpointFunction("task-456", async () => ({
  progress: 75,
  state: { frameIndex: 1500 },
  output: { tempFile: "/tmp/encode-3.mp4" },
}));

// Emergency abort saves checkpoint
await checkpoint.emergencyCheckpoint("task-456", "THERMAL_CRITICAL");

// Resume from checkpoint
const resume = await checkpoint.resumeFromCheckpoint("task-456");
// → { progress: 75, state: {...}, instructions: {...} }

// Get progress estimation
const est = await checkpoint.estimateCompletion("task-456", 7200);
// → { progressPercent: 75, estimatedTimeRemaining: 1800 }

// Clean up when done
await checkpoint.cleanupCheckpoints("task-456");
```

---

### 3. Runtime Abort Monitor (DURING execution)

**What it does:**

- Watches temperature every 5 seconds during task execution
- If threshold exceeded: Save checkpoint → Pause task → Trigger sleep
- Tracks alert history for analytics

**Abort thresholds:**

```
Temperature zones during task execution:

Safe:     < 60°C  → Keep running
Alert:    60-75°C → Log warning, increase checkpoint frequency
Abort:    > 75°C  → Save checkpoint, pause, trigger device sleep
Critical: > 85°C  → Immediate abort, device sleep

Power zones:

Alert:    > 80% capacity  → Reduce concurrent tasks
Abort:    > 95% capacity  → Pause, device sleep needed
Battery:  < 10% remaining → Abort all non-critical
```

**Monitoring lifecycle:**

```
1. Task execution starts
   ↓
2. Register abort callback (pause function)
   ↓
3. Start monitoring (interval: 5 seconds)
   ├─ Read current temperature
   ├─ Check vs thresholds
   ├─ Record data point
   ├─ Check for thermal trend (rising fast?)
   └─ If abort: Jump to step 4
   ↓
4. Thermal abort triggered
   ├─ Save emergency checkpoint
   ├─ Call abort callback (pause execution)
   ├─ Record abort event to database
   ├─ Queue task for resumption
   ├─ Initiate device sleep (if thermal reason)
   └─ Stop monitoring

5. Later: Device cools or next delegation window
   ├─ Wake device
   ├─ Resume task from checkpoint
   └─ Continue execution
```

**Example monitoring data:**

```javascript
// During video encoding task, temperature readings at 5-sec intervals

Time    Temp    Status      Action
──────  ────    ──────────  ──────────────────────
00:00   35°C    SAFE        Continue
00:05   39°C    SAFE        Continue
00:10   44°C    SAFE        Continue
00:15   48°C    SAFE        Continue
00:20   53°C    SAFE        Continue
00:25   58°C    SAFE        Continue
00:30   62°C    ALERT ⚠️     Log warning, increase checkpoint frequency
00:35   64°C    ALERT       Log warning
00:40   66°C    ALERT       Log warning
00:45   68°C    ALERT       Log warning
00:50   70°C    ALERT       Log warning
00:55   72°C    ALERT       Starting to trend high (+ 2°C/cycle)
01:00   74°C    ALERT       Rising rapidly (+2°C/cycle)
01:05   76°C    ABORT ⛔     → THERMAL_CRITICAL triggered!

Abort sequence:
├─ Emergency checkpoint saved (at 76°C, 25% complete)
├─ Abort callback called (task execution paused)
├─ Abort event recorded to database
├─ Device sleep initiated
└─ Task resumption queued for later

Temperature trajectory after abort:
01:10   75°C    (still hot, device sleeping)
01:15   73°C
01:20   71°C
...
02:30   45°C    (cooled down, ready to resume)
      ↓ Auto-wake triggers
      ↓ Task resumes from 25% checkpoint
03:30   46°C    (task completes second segment)
```

**Thermal trend detection:**

```javascript
// Monitor detects if temperature rising too fast
// Could abort before reaching absolute threshold

Window: Last 4 readings (20 seconds)
[58°C, 62°C, 66°C, 70°C]

Trend calculation:
├─ Rise per cycle: 4°C/5sec = 0.8°C/sec
├─ Trajectory: Would reach 75°C in 6 more cycles (30 sec)
├─ Decision: ABORT now (predictive)
└─ Reason: "Temperature rising rapidly, would exceed threshold"
```

**API:**

```javascript
const monitor = new RuntimeAbortMonitor(memory, thermal, checkpoint, sleep);

// Start monitoring a task
await monitor.startMonitoring("task-456", taskObj, async () => {
  logger.info("Task paused");
  // Called if abort triggered
});

// Get current monitoring stats
const stats = await monitor.getMonitoringStats("task-456");
// → {
//   peakTemp: 76,
//   thermalAlerts: 8,
//   executionDuration: 3600,
//   aborted: true
// }

// Configure thresholds
monitor.configureThresholds({
  thermalAbortThreshold: 80,
  thermalAlertThreshold: 72,
});

// View monitored tasks
const running = monitor.getMonitoredTasks();
// → [
//   { taskId: "task-456", running: false, peakTemp: 76, alerts: 8 }
// ]
```

---

### 4. Device Profiles (configuration)

**What it is:**
A database of thermal capabilities per device type. Enables system to understand:

- How fast this device heats up
- How fast it cools down
- What temperatures are safe/unsafe
- Efficiency (how much power becomes heat)

**Pre-configured profiles:**

```javascript
// Conservative profile (fanless, passive cooling)
FANLESS_LAPTOP = {
  name: "Fanless ultrabook",
  thermalMass: 0.6, // Heats up quickly
  coolingRate: 0.8, // Cools slowly (no fans)
  coolingEffectiveness: 0.5,
  thermalEfficiency: 0.9, // Almost all power becomes heat
  criticalThreshold: 80,
  warningThreshold: 70,
  safeThreshold: 60,
  optimalMaxTemp: 45,
  description: "Passive cooling only. Restrict power-heavy tasks.",
};

// Moderate profile (laptop with single fan)
LAPTOP_WITH_FAN = {
  name: "MacBook Pro (2023)",
  thermalMass: 1.0, // Standard heating
  coolingRate: 1.5, // Fan kicks in
  coolingEffectiveness: 0.8,
  thermalEfficiency: 0.8, // Good ventilation
  criticalThreshold: 90,
  warningThreshold: 80,
  safeThreshold: 70,
  optimalMaxTemp: 55,
  description: "Active cooling available. Moderate load capability.",
};

// Robust profile (workstation, liquid cooling)
WORKSTATION = {
  name: "Desktop with liquid cooling",
  thermalMass: 2.5, // High mass, heats slowly
  coolingRate: 3.0, // Excellent cooling
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.65, // Excellent ventilation
  criticalThreshold: 95,
  warningThreshold: 85,
  safeThreshold: 75,
  optimalMaxTemp: 60,
  description: "Heavy-duty. Can handle sustained loads.",
};

// Extreme profile (solar IoT device, very low power)
SOLAR_EDGE_DEVICE = {
  name: "Solar-powered Pi 4",
  thermalMass: 0.3, // Tiny device
  coolingRate: 2.0, // Exposed, natural convection
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.6, // Only natural convection
  criticalThreshold: 70,
  warningThreshold: 60,
  safeThreshold: 50,
  optimalMaxTemp: 35,
  description: "Severely thermally constrained. Short, frequent tasks only.",
};
```

**How profiles are used:**

```
User boots their device
├─ System reads: /proc/cpuinfo or equivalent
├─ Detects: "Intel i7" + "8GB RAM" + "MacBook Air"
├─ Looks up device in database
│  ├─ Found profile: LAPTOP_WITH_FAN
│  └─ Loads config: thermalMass=1.0, coolingRate=1.5, etc.
├─ Or if not found: Use generic profile
└─ Thermal prediction now uses actual device specs

Task arrives: video-encoding (400W)
├─ Pre-flight check with device profile
├─ Prediction: Peak 65°C, safe window 25 min
├─ Recommendation: PROCEED
└─ Task executes with confidence

Different task on same hardware:
├─ ML training (800W, 4 hours)
├─ Same device profile used
├─ Prediction: Peak 82°C, exceeds safe (70°C)
├─ Recommendation: SEGMENT into 2×2-hour chunks
└─ Prevents overheating by design
```

**Saving custom profiles:**

```javascript
// User has rare device, needs custom profile
const customProfile = {
  name: "My custom gaming laptop",
  thermalMass: 1.2,
  coolingRate: 2.0, // Has gaming cooler
  coolingEffectiveness: 0.85,
  thermalEfficiency: 0.75,
  criticalThreshold: 92,
  warningThreshold: 82,
  safeThreshold: 72,
  optimalMaxTemp: 58,
};

// Save to database for future use
await predictor.saveDeviceProfile("gaming-laptop-001", customProfile);

// Next time task arrives, system uses this profile
```

---

## Integration with Smart Idle Engine

**Decision flow with abort/segmentation:**

```
Task arrives
│
├─→ Smart Idle Engine: Pre-execution checks
│   ├─ User preferences? (delegation hours, idle period)
│   ├─ Energy available? (clean power)
│   ├─ Queue status? (other tasks running)
│   └─ Thermal OK?
│
├─→ NEW: Thermal Prediction
│   ├─ Pre-flight thermal check
│   ├─ Peak temperature estimate
│   └─ Recommendation: PROCEED | WAIT | SEGMENT | SKIP
│
├─ If PROCEED:
│   │
│   ├─→ Register task checkpoint
│   ├─→ Start runtime abort monitor
│   ├─→ Execute task
│   │
│   └─ During execution:
│       ├─ Monitor temperature every 5 sec
│       ├─ Save checkpoint periodically
│       └─ If thermal critical:
│           ├─ Emergency checkpoint
│           ├─ Pause execution
│           ├─ Trigger device sleep
│           └─ Queue for resumption
│
├─ If SEGMENT:
│   │
│   ├─ Create segment plan (N parts)
│   ├─ Execute segment 1
│   │  ├─ Monitor + checkpoint
│   │  └─ Wait 5 min (cooling break)
│   ├─ Execute segment 2
│   │  └─ ...
│   └─ Continue until complete
│
├─ If WAIT:
│   │
│   └─ Queue task, retry when cooler
│
└─ If SKIP:
    └─ Reject task (would damage device)
```

---

## Real-World Scenarios

### Scenario 1: Fanless Laptop, Heavy ML Task

```
Device: XPS 13 9310 (fanless)
Task: ML model training (600W, 4 hours)

Flow:
├─ Task arrives at 10:00 AM
├─ Device temp: 25°C (cool from sleep)
│
├─ Thermal prediction:
│  ├─ Current: 25°C
│  ├─ Power: 600W (very heavy)
│  ├─ Device: fanless (coolingRate=0.8)
│  ├─ Prediction: Peak 85°C at 40 min mark
│  ├─ Safe threshold: 60°C
│  └─ **Result: UNSAFE - exceeds by 25°C**
│
├─ Recommendation: SEGMENT into 4 parts (1 hour each)
│
├─ Execution plan:
│  ├─ Segment 1 (0-1 hour):
│  │  ├─ Start: 25°C
│  │  ├─ Peak prediction: 60°C (within safe)
│  │  ├─ Save checkpoint every 15 min
│  │  ├─ Complete: 62°C
│  │  └─ Cool for 5 min: 61°C → 55°C
│  │
│  ├─ Segment 2 (1-2 hours):
│  │  ├─ Start: 55°C
│  │  ├─ Peak: 62°C again
│  │  ├─ Complete: 62°C
│  │  └─ Cool: 55°C
│  │
│  ├─ Segment 3 & 4: Similar
│  │
│  └─ Total time: 4 hours + 3×5min cooling = 4 hours 15 min
│
└─ Result: Task completes safely without overheating
   Even if segment 3 aborted at 50%:
   ├─ Latest checkpoint at 75% complete
   ├─ Resume from checkpoint
   └─ Only 25% wasted (vs 75% without checkpoints)
```

### Scenario 2: Workstation, Sudden Thermal Spike

```
Device: 4-socket workstation
Task: Database backup (200W, steady)

Execution:
├─ 10:00 AM: Task starts normally at 40°C
├─ Monitor running: checks temp every 5 sec
│
├─ 10:15 AM: Another user starts gaming (high GPU load)
│  ├─ Device temp spikes: 40°C → 65°C in 3 minutes
│  └─ Thermal monitor detects rapid rise
│
├─ 10:18 AM: Temp reaches 75°C (alert threshold)
│  ├─ Checkpoint frequency increases
│  ├─ More frequent saves (every 10 sec instead of 5 min)
│  └─ Alert logged
│
├─ 10:20 AM: Temp reaches 80°C (abort threshold)
│  ├─ Emergency checkpoint: "Database backup - 60% complete"
│  ├─ Abort callback called: database stops mid-transfer
│  ├─ Task paused
│  └─ Device sleep initiated
│
├─ 11:00 AM: Device cooled, gaming stopped
│  ├─ Auto-wake triggers
│  ├─ Thermal check: 40°C (safe)
│  ├─ Resume from checkpoint
│  ├─ Database backup resumes from 60%
│  └─ Complete in 15 more minutes
│
└─ Energy efficiency:
   ├─ Without checkpoint: Restart from 0%, lose all 60% work
   ├─ With checkpoint: Only 40% work remains
   └─ Saved ~600 Wh (running for extra 50 minutes)
```

### Scenario 3: Solar Device, Intermittent Power

```
Device: Raspberry Pi 4 on solar panel
Task: Image processing (150W, segmented into 6×10-min chunks)

Environment: Cloudy afternoon

Flow:
├─ 2:00 PM: Sunny, solar strong, temp 35°C
├─ Start segment 1 (image set 1-10)
│  ├─ Monitor: Thermal OK, power abundant
│  ├─ Complete: save checkpoint (100% of segment)
│  └─ Temp after: 40°C
│
├─ 2:12 PM: Cloud passes, power drops by 40%
│  ├─ Thermal monitor: Still OK (35°C)
│  ├─ Power monitor: Voltage sagging
│  └─ Start segment 2 (images 11-20)
│
├─ 2:20 PM: Dark cloud, power critical
│  ├─ Monitor detects: Power dropping below 10% safe
│  ├─ Emergency checkpoint: "Image set 11-15 processed" (50% of segment)
│  ├─ Device sleep: Low-power mode
│  └─ Waits for sun return
│
├─ 2:45 PM: Sun returns, solar strong again
│  ├─ Device wakes
│  ├─ Resume segment 2 from checkpoint (continue images 16-20)
│  ├─ Complete: save checkpoint
│  └─ Continue segments 3-6
│
└─ Result:
   ├─ Total time: ~2 hours (including sleep)
   ├─ Energy wasted: Only 25 images (12.5% of process)
   ├─ Benefit: Completed as much as solar allowed
   └─ Without segmentation: Would restart entire process after power loss
```

---

## Configuration Examples

### Example 1: Conservative Fanless Device

```javascript
// In your application startup:

const thermalPrediction = new ThermalPrediction(memory, thermalMonitor);

// Define fanless laptop profile
const fanlessConfig = {
  name: "Fanless ultrabook",
  thermalMass: 0.6,
  coolingRate: 0.8,
  coolingEffectiveness: 0.5,
  thermalEfficiency: 0.9,
  criticalThreshold: 80,
  warningThreshold: 70,
  safeThreshold: 60,
  optimalMaxTemp: 45,
};

// Save it
await thermalPrediction.saveDeviceProfile("laptop-456", fanlessConfig);

// Configure runtime abort
const monitor = new RuntimeAbortMonitor(memory, thermal, checkpoint, sleep);
monitor.configureThresholds({
  thermalAbortThreshold: 78, // More conservative
  thermalAlertThreshold: 68, // Alert earlier
  enableThermalAbort: true,
});

// In task arrival handler:
async function onTaskArrival(task) {
  const profile = await predictor.getDefaultProfile(); // Uses saved config

  // Pre-flight check
  const prediction = await thermalPrediction.preFlightThermalCheck(
    task,
    profile,
  );

  if (prediction.recommendation === "SKIP") {
    logger.warn(`Task rejected: Would damage fanless device`);
    return;
  }

  if (prediction.recommendation === "BREAK_INTO_SEGMENTS") {
    const segmentation = predictor.recommendSegmentation(
      task,
      prediction,
      profile,
    );
    await executeTaskInSegments(task, segmentation);
  } else {
    await executeTask(task, profile);
  }
}
```

### Example 2: Solar Device with Intermittent Power

```javascript
// Solar IoT device configuration

const solarProfile = {
  name: "Solar-powered Pi 4",
  thermalMass: 0.3,
  coolingRate: 2.0,
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.6,
  criticalThreshold: 70,
  warningThreshold: 60,
  safeThreshold: 50,
  optimalMaxTemp: 35,
};

await predictor.saveDeviceProfile("solar-device-001", solarProfile);

// Configure abort monitor for power-critical scenarios
monitor.configureThresholds({
  thermalAbortThreshold: 68,
  thermalAlertThreshold: 58,
  powerAlertThreshold: 85, // Alert at 85% capacity
  enablePowerAbort: true, // Enable power-based abort
});

// All tasks must be segmentable on solar device
const taskRequirements = {
  maxDurationSeconds: 900, // Max 15 minutes per segment
  requiredSegmentable: true,
  recommendedSegments: 6, // Break into ~2.5-min chunks
};
```

---

## Monitoring & Analytics

### Query: Which tasks get aborted most?

```sql
SELECT
  task_id,
  COUNT(*) as abort_count,
  reason,
  AVG(temperature) as avg_temp_at_abort,
  AVG(peak_temperature) as avg_peak_temp
FROM task_abort_history
GROUP BY task_id
ORDER BY abort_count DESC
LIMIT 10;
```

### Query: Average energy waste per abort reason

```sql
SELECT
  reason,
  AVG(execution_duration_seconds) as avg_duration,
  AVG(100 - ((100 - progress) * 0.5)) as estimated_wasted_percent
FROM task_abort_history
JOIN task_checkpoints ON task_abort_history.task_id = task_checkpoints.task_id
GROUP BY reason;
```

### Query: Devices needing profile updates

```sql
SELECT
  device_id,
  COUNT(*) as abort_count,
  AVG(peak_temperature) as avg_peak_temp,
  MAX(peak_temperature) as max_reached_temp
FROM task_abort_history
JOIN tasks ON task_abort_history.task_id = tasks.id
GROUP BY device_id
HAVING abort_count > 5 OR max_reached_temp > 85
ORDER BY abort_count DESC;
```

---

## Benefits Summary

| Scenario                          | Without Segmentation                  | With Segmentation                                       |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| Task reaches critical temp at 50% | Abort, restart from zero, 100% wasted | Checkpoint at 50%, resume from checkpoint, 50% lost     |
| Unexpected power loss mid-task    | Restart entire process                | Resume from last checkpoint, minimal loss               |
| Device thermal spikes             | Forced abort, task rejected           | Pause, cool, resume automatically                       |
| Fanless device, heavy task        | Cannot run at all                     | Segmented into safe chunks, completes successfully      |
| Solar device, intermittent power  | Loss of all progress per cloud pass   | Checkpoint per segment, cloud events cause minimal loss |

---

## Next Steps

1. **Register checkpoints** in your task code
2. **Configure device profile** for your hardware
3. **Monitor abort statistics** to understand thermal behavior
4. **Adjust segmentation** based on real execution data
5. **Optimize task design** for checkpoint efficiency
