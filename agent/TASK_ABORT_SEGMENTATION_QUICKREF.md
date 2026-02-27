# Task Abort & Segmentation - Quick Reference

## TL;DR

**Problem:** Tasks that overheat devices waste energy. System couldn't abort mid-execution.

**Solution:** 4-layer system:

1. **Thermal Prediction** - Forecast if task will overheat BEFORE execution
2. **Task Checkpointing** - Save progress every N minutes
3. **Runtime Abort Monitor** - Watch temps, abort + checkpoint if critical
4. **Device Profiles** - Know your device's thermal limits

**Result:** If task aborts at 50%, only 50% wasted (not 100%).

---

## New Modules

### `thermalPrediction.js` (480 lines)

**Purpose:** Predict if task will overheat device before execution starts

**Key methods:**

```javascript
preFlightThermalCheck(task, deviceProfile);
// → { safeToRun, peakTempEstimate, recommendation: 'PROCEED'|'WAIT'|'SEGMENT'|'SKIP' }

recommendSegmentation(task, prediction, deviceProfile);
// → { segmentsRecommended: 3, strategy: 'PAUSE_AND_RESUME', segments: [...] }

getWaitTimeUntilSafe(task, deviceProfile);
// → { minutesUntilSafe: 15, currentTemp: 70, targetTemp: 60 }
```

**Decision model:**

```
Peak temp < SafeThreshold
    ↓
    PROCEED (run immediately)

Peak temp in Warning zone + Segmentable
    ↓
    SEGMENT (break into N parts)

Peak temp exceeds Warning + Not segmentable
    ↓
    WAIT_FOR_COOLING (defer until cooler)

Peak temp > Critical threshold
    ↓
    SKIP (reject, would damage device)
```

### `taskCheckpointManager.js` (370 lines)

**Purpose:** Save/restore task state for pause/resume

**Key methods:**

```javascript
registerCheckpointFunction(taskId, callback);
// Register save function called during abort

emergencyCheckpoint(taskId, "THERMAL_CRITICAL");
// Save state immediately before abort

resumeFromCheckpoint(taskId);
// → { checkpoint, state, instructions }

estimateCompletion(taskId, totalDuration);
// → { progressPercent: 75, estimatedTimeRemaining: 1800 }
```

**Energy savings:**

- Without checkpoint: Abort at 75% → Restart from 0% = 100% wasted
- With checkpoint: Abort at 75% → Resume from 75% = 25% wasted

### `runtimeAbortMonitor.js` (520 lines)

**Purpose:** Watch tasks during execution, abort if thermal critical

**Key methods:**

```javascript
startMonitoring(taskId, task, abortCallback);
// Begin watching this task, call abortCallback if critical

checkTaskHealth(taskId);
// Runs every 5 seconds, checks thermal + power

abortTask(taskId, reason, temperature);
// Emergency stop: save checkpoint → call abort callback → trigger sleep

getMonitoringStats(taskId);
// → { peakTemp: 76, thermalAlerts: 8, aborted: true }
```

**Monitoring flow:**

```
Task runs
    ↓
Every 5 seconds: Read temperature
    ↓
Temp < Alert threshold? → Continue
Temp >= Alert? → Log warning, increase checkpoint frequency
Temp >= Abort? → Emergency checkpoint → Pause → Sleep
```

**Trend detection:**

- If temp rising at 1°C/cycle toward abort threshold
- May abort proactively to save energy

---

## Database Schema Additions

### `device_profiles` table

Device thermal capabilities for prediction

```sql
CREATE TABLE device_profiles (
  id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE,
  config TEXT,  -- JSON: thermalMass, coolingRate, thresholds, etc.
  created_at DATETIME,
  updated_at DATETIME
);
```

### `task_checkpoints` table

Save task progress for resumption

```sql
CREATE TABLE task_checkpoints (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  checkpoint_number INTEGER,
  progress_percent INTEGER,      -- 0-100
  state_data TEXT,               -- JSON: task state
  output_data TEXT,              -- JSON: partial results
  reason TEXT,                   -- 'periodic' | 'abort_thermal' | 'manual'
  timestamp DATETIME
);
```

### `task_thermal_history` table

Temperature readings during task execution

```sql
CREATE TABLE task_thermal_history (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  temperature REAL,
  elapsed_seconds INTEGER,
  timestamp DATETIME
);
```

### `task_abort_history` table

When/why tasks were aborted

```sql
CREATE TABLE task_abort_history (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  reason TEXT,                  -- 'THERMAL_CRITICAL', 'POWER_CRITICAL'
  temperature REAL,
  execution_duration_seconds INTEGER,
  peak_temperature REAL,
  thermal_alerts INTEGER,
  power_alerts INTEGER,
  timestamp DATETIME
);
```

### `task_resumption_queue` table

Tasks waiting to resume after abort

```sql
CREATE TABLE task_resumption_queue (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  abort_reason TEXT,
  status TEXT,                  -- 'PENDING', 'RESUMED', 'FAILED'
  retry_count INTEGER,
  created_at DATETIME
);
```

---

## Pre-configured Device Profiles

### Fanless Laptop (Conservative)

```javascript
{
  thermalMass: 0.6,
  coolingRate: 0.8,             // Slow cooling
  coolingEffectiveness: 0.5,
  thermalEfficiency: 0.90,      // Almost all power becomes heat
  criticalThreshold: 80,
  warningThreshold: 70,
  safeThreshold: 60,
  optimalMaxTemp: 45
}
```

### Laptop with Fan (Moderate)

```javascript
{
  thermalMass: 1.0,
  coolingRate: 1.5,
  coolingEffectiveness: 0.8,
  thermalEfficiency: 0.80,
  criticalThreshold: 90,
  warningThreshold: 80,
  safeThreshold: 70,
  optimalMaxTemp: 55
}
```

### Workstation (Robust)

```javascript
{
  thermalMass: 2.5,
  coolingRate: 3.0,             // Fast cooling (liquid/fans)
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.65,      // Excellent ventilation
  criticalThreshold: 95,
  warningThreshold: 85,
  safeThreshold: 75,
  optimalMaxTemp: 60
}
```

### Solar IoT Device (Extreme)

```javascript
{
  thermalMass: 0.3,             // Tiny device
  coolingRate: 2.0,             // Natural convection
  coolingEffectiveness: 0.95,
  thermalEfficiency: 0.60,      // Very inefficient cooling
  criticalThreshold: 70,
  warningThreshold: 60,
  safeThreshold: 50,
  optimalMaxTemp: 35
}
```

---

## Usage Example: Task with Segmentation

```javascript
// 1. Define device profile
const deviceProfile = {
  name: "Fanless laptop",
  thermalMass: 0.6,
  coolingRate: 0.8,
  // ... other settings
};
await predictor.saveDeviceProfile("my-laptop", deviceProfile);

// 2. Task arrives
const task = {
  id: "encode-123",
  type: "video-encoding",
  estimatedPowerWatts: 400,
  estimatedDurationSeconds: 7200, // 2 hours
  segmentable: true,
};

// 3. Pre-flight check
const prediction = await predictor.preFlightThermalCheck(task, deviceProfile);
// → { safeToRun: true, peakTempEstimate: 68,
//     recommendation: 'BREAK_INTO_SEGMENTS' }

// 4. If segmentation needed
if (prediction.recommendation === "BREAK_INTO_SEGMENTS") {
  const segmentation = predictor.recommendSegmentation(
    task,
    prediction,
    deviceProfile,
  );
  // → { segmentsRecommended: 2, segments: [
  //     { segmentId: 1, startTime: 0, endTime: 3600 },
  //     { segmentId: 2, startTime: 3600, endTime: 7200 }
  //   ]}

  // Execute each segment with cooling breaks
  for (const segment of segmentation.segments) {
    await executeSegment(task, segment);
    if (segment.coolingBreakAfterSeconds) {
      await sleep(segment.coolingBreakAfterSeconds);
    }
  }
}

// 5. During execution: Task code registers checkpoint
const checkpointMgr = new TaskCheckpointManager(memory);
checkpointMgr.registerCheckpointFunction(task.id, async () => ({
  progress: videoTask.progress,
  state: { frameIndex: videoTask.currentFrame },
  output: { tempFile: videoTask.outputPath },
}));

// 6. Start monitoring
const monitor = new RuntimeAbortMonitor(memory, thermal, checkpointMgr, sleep);
await monitor.startMonitoring(task.id, task, async () => {
  logger.info("Task paused due to thermal alert");
  videoTask.pause();
});

// 7. If abort happens at 50%
// → Checkpoint saved with progress: 50%
// → Later: Resume from 50%, only 50% work wasted
```

---

## Decision Flowchart

```
Task submitted
    ↓
↳─→ Thermal Prediction: Pre-flight check
    ├─ Estimate peak temperature
    ├─ Compare vs safe threshold
    └─ Recommend: PROCEED | WAIT | SEGMENT | SKIP
        ↓
        ├─ PROCEED
        │  ├─ Register checkpoint function
        │  ├─ Start runtime monitor
        │  └─ Execute task
        │     └─ If thermal alert: Checkpoint → Pause → Sleep
        │
        ├─ SEGMENT
        │  ├─ Create segment plan
        │  ├─ Execute segment 1
        │  ├─ Cool 5 minutes
        │  ├─ Execute segment 2
        │  └─ Continue...
        │
        ├─ WAIT
        │  └─ Defer until device cools
        │
        └─ SKIP
           └─ Reject (would damage device)
```

---

## Monitoring Queries

### Find most problematic tasks

```sql
SELECT task_id, COUNT(*) as abort_count, AVG(temperature) as avg_temp
FROM task_abort_history
GROUP BY task_id
ORDER BY abort_count DESC
LIMIT 5;
```

### Find tasks frequently segmented

```sql
SELECT task_id, COUNT(*) as segment_count
FROM task_checkpoints
WHERE reason = 'periodic'
GROUP BY task_id
ORDER BY segment_count DESC;
```

### Estimate energy wasted by aborts

```sql
SELECT
  reason,
  COUNT(*) as abort_count,
  AVG(execution_duration_seconds) as avg_seconds_wasted
FROM task_abort_history
GROUP BY reason;
```

### Check if device profile needs adjustment

```sql
SELECT
  COUNT(*) as total_aborts,
  MAX(peak_temperature) as hottest_reached,
  AVG(peak_temperature) as avg_peak
FROM task_abort_history;
-- If avg_peak > 85°C: Device profile is too aggressive
-- If max_reached > 95°C: Device profile ineffective
```

---

## Configuration: Before Deployment

1. **Identify your devices**
   - Fanless? Laptop with fan? Workstation? IoT?
   - → Save appropriate device profile

2. **Set thermal thresholds**
   - Conservative: warningThreshold = 70°C, abortThreshold = 80°C
   - Moderate: warningThreshold = 80°C, abortThreshold = 90°C
   - Aggressive: warningThreshold = 85°C, abortThreshold = 95°C

3. **Configure checkpoint frequency**
   - Per-task: Every 15% progress? Every 5 minutes?
   - More frequent = safer resumption, more I/O

4. **Test on real hardware**
   - Run thermal prediction on actual device
   - Compare predicted vs actual peak temperature
   - Adjust `thermalMass` and `coolingRate` if needed
   - Iterate until predictions ±5°C accurate

5. **Monitor first deployments**
   - Watch abort statistics
   - If many aborts: Thresholds too aggressive, increase safeThreshold
   - If no aborts but close calls: Thresholds too conservative, decrease
   - Adjust device profile iteratively

---

## Integration Checklist

- [ ] Create device profiles for your hardware types
- [ ] Update SmartIdleEngine to call thermalPrediction.preFlightThermalCheck()
- [ ] Task submission code registers checkpoint function
- [ ] Task executor starts RuntimeAbortMonitor
- [ ] Database migrations run (new tables created)
- [ ] Configure abort monitoring thresholds for your device
- [ ] Test segmentation on real heavy task
- [ ] Test abort behavior (trigger thermal limit in testing)
- [ ] Monitor statistics after first week of deployment
- [ ] Adjust device profiles based on real thermal data

---

## Real-World Impact

| Scenario                     | Old System                        | New System                          | Benefit                             |
| ---------------------------- | --------------------------------- | ----------------------------------- | ----------------------------------- |
| ML task aborts at 50%        | Restart from 0% (100% wasted)     | Resume from checkpoint (50% wasted) | **50% energy saved**                |
| Heavy task on fanless device | Cannot run (overheats)            | Segments safely into N parts        | **Task completes**                  |
| Power loss mid-task on solar | Lose all progress (100% wasted)   | Resume from checkpoint              | **Up to 75% saved**                 |
| Unexpected thermal spike     | Abort, full restart (100% wasted) | Checkpoint + sleep + resume         | **60-80% wasted reduced to 20-30%** |
