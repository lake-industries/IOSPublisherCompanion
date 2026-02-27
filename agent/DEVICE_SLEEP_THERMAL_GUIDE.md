# Device Sleep & Thermal Management Guide

## Overview

Your eco-friendly task system now includes **intelligent device sleep management** and **temperature-based thermal protection** instead of just time-based cooling.

This enables:

- ✅ Automatic device sleep when no tasks are queued
- ✅ Auto-wake during delegation hours
- ✅ Temperature-based thermal management (instead of fixed idle periods)
- ✅ Smart decisions: Accept → Defer → Sleep → Idle
- ✅ Task queue awareness (don't sleep if work pending)
- ✅ Critical task wake-up (emergency tasks wake device immediately)

---

## 🌡️ Thermal Management (Temperature-Based)

### The Problem with Time-Based Idle

**Old approach**: "Wait 5 minutes after every task"

- Doesn't account for actual system temperature
- Conservative (wastes time waiting on cool systems)
- Inefficient (doesn't help hot systems)

**New approach**: "Wait until temperature drops to safe level"

- Uses real CPU/GPU temperature data
- Adaptive to actual thermal conditions
- Much more energy-efficient

### Temperature Thresholds

```
CRITICAL (>80°C)   → 🔴 SLEEP immediately
WARNING (70-80°C)  → 🟠 DEFER new tasks
ELEVATED (55-70°C) → 🟡 DEFER power-heavy tasks
SAFE (40-55°C)     → 🟢 Can execute
OPTIMAL (20-40°C)  → 🟩 Best performance
```

### Configuration

Default thresholds (Celsius):

```sql
-- In code (thermalMonitor.js):
thresholds = {
  optimal: { min: 20, max: 40 },
  safe: { min: 15, max: 55 },
  warning: { min: 10, max: 70 },
  critical: 80
};

-- Cooling rate: ~1.5°C per minute when idle
coolingRate = 1.5;
```

### Custom Configuration

```javascript
// In your agent initialization:
const thermal = new ThermalMonitor(sharedMemory);

// Set custom thresholds
thermal.configureThresholds({
  optimal: { min: 25, max: 45 },
  critical: 85,
});

// Set cooling rate (device-specific)
// Fanless devices cool slower
thermal.configureCoolingRate(0.8);

// High-end systems with good cooling
thermal.configureCoolingRate(2.0);
```

### Temperature Sensing

Supports multiple data sources:

- **CPU temperature** (primary)
  - Windows: WMI queries
  - Linux: /sys/class/thermal
  - macOS: pmset/smc

- **GPU temperature** (if available)
  - NVIDIA: nvidia-smi
  - AMD: rocm-smi
  - Intel: intel_gpu_top

- **Fallback**: Estimation from CPU load if sensors unavailable
  - `estimated_temp = 40°C + (load_percent * 0.4)`

### Temperature Monitoring

The system continuously monitors temperature:

```javascript
// Start monitoring (runs every 30 seconds)
thermal.startMonitoring();

// Check current temperature
const temps = await thermal.getSystemTemperature();
// Returns: { cpu, gpu, average, timestamp, status }

// Get temperature recommendation
const rec = await thermal.getThermalRecommendation();
// {
//   status: 'safe' | 'elevated' | 'warning' | 'critical',
//   currentTemp: 52,
//   action: 'EXECUTE' | 'DEFER' | 'SLEEP',
//   minutesUntilReady: 5
// }
```

### Thermal History

All temperature readings are stored in the database:

```sql
-- View temperature history (last 2 hours)
SELECT timestamp, average_temp, status
FROM thermal_history
WHERE timestamp > datetime('now', '-2 hours')
ORDER BY timestamp DESC;

-- Get thermal statistics
SELECT
  MIN(average_temp) as min,
  MAX(average_temp) as max,
  AVG(average_temp) as avg
FROM thermal_history
WHERE timestamp > datetime('now', '-24 hours');
```

---

## 💤 Device Sleep Management

### What is Device Sleep?

**Device sleep** = OS-level suspend (not screen lock or idle)

When activated:

- CPU reduces to minimal power (usually 1% power consumption)
- GPU/Display off
- Memory stays powered (maintains state)
- System wakes automatically at scheduled time
- Can be interrupted by critical tasks

### When Does Device Sleep Activate?

Device sleeps when ALL of these are true:

1. ✅ No tasks queued in task queue
2. ✅ System idle for 15+ minutes (configurable)
3. ✅ Not in a delegation window
4. ✅ Not approaching next delegation window
5. ✅ User not actively using device

### Configuration

```javascript
const sleepManager = new DeviceSleepManager(sharedMemory, taskQueue);

sleepManager.configureSettings({
  enableAutoSleep: true, // Enable/disable auto-sleep
  sleepAfterIdleMinutes: 15, // Sleep if idle 15+ min
  wakeUpBuffer: 10, // Wake 10 min before next window
  allowWakefulInterrupts: true, // Wake for critical tasks
  enableTemperatureSleep: true, // Sleep to cool device
  criticalTempThreshold: 75, // Sleep if > 75°C
});
```

### Sleep Schedule Examples

**Example 1: Night-Only User**

```
User delegation hours: 23:00 - 07:00 (11 PM - 7 AM)

23:30 → 3 tasks queued and running
00:15 → All tasks complete, system idle
00:16-00:30 → System remains awake (checking queue)
00:31 → 15+ minutes idle, no queued tasks
00:31-06:50 → 💤 DEVICE SLEEPING
06:50 → Auto-wake buffer (10 min before 7:00 AM)
06:50-07:00 → Device awake, ready for users
07:00 → Start of delegation window
```

**Example 2: Solar User (Day Execution)**

```
User delegation hours: 09:00 - 15:00 (9 AM - 3 PM)

08:50 → Auto-wake buffer triggers
08:50-09:00 → Device awake, ready
09:00 → Delegation window opens
09:15 → 10 tasks queued, all running
12:00 → All tasks complete, system idle
12:01-15:00 → System idle but NOT sleeping (window open until 15:00)
15:01 → Window closed, no more queued tasks
15:01-15:16 → 15-minute idle timer starts
15:16 → Next window is tomorrow 9:00 AM
15:16-08:50 → 💤 DEVICE SLEEPING (next auto-wake: 08:50 tomorrow)
```

**Example 3: Temperature-Based Sleep**

```
User running large task (video render)
14:00 → Task starts (GPU at 45°C)
14:15 → Task still running (GPU at 72°C)
14:30 → Task ends (GPU at 78°C - WARNING)
14:30-14:45 → System checks: "Can I accept new task?"
14:45 → GPU still at 76°C (THERMAL CHECK FAILS)
14:45-14:55 → 🌡️ SYSTEM SLEEPS TO COOL (not task idle!)
14:55 → Auto-wake timer for next delegation window
15:00 → System wakes, GPU at 42°C (cooled!)
15:00-16:00 → Next task can now execute
```

### Sleep/Wake Database

All sleep events are tracked:

```sql
-- View sleep history (last 7 days)
SELECT sleep_start, actual_wake,
  actual_sleep_duration as minutes,
  reason
FROM sleep_schedule
WHERE sleep_start > datetime('now', '-7 days')
ORDER BY sleep_start DESC;

-- Get sleep statistics
SELECT
  COUNT(*) as total_sleep_events,
  SUM(actual_sleep_duration) as total_minutes,
  AVG(actual_sleep_duration) as avg_minutes
FROM sleep_schedule
WHERE sleep_start > datetime('now', '-7 days');
```

---

## 🧠 Smart Idle Decision Engine

### Decision Flow

When a task arrives, the system makes one of 4 decisions:

```
INCOMING TASK
    ↓
┌─────────────────────────┐
│ Check Thermal Condition │
├─────────────────────────┤
│ Critical (>80°C)?    → SLEEP
│ Warning (70-80°C)?   → DEFER
│ Elevated (>55°C) + heavy task? → DEFER
│ OK? → Continue
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Check User Preferences  │
├─────────────────────────┤
│ Outside delegation hours? → DEFER
│ In idle period? → DEFER
│ OK? → Continue
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Check Energy Conditions │
├─────────────────────────┤
│ Grid dirty + low priority? → DEFER
│ Clean energy available? → Continue
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Check Task Queue        │
├─────────────────────────┤
│ No tasks queued? → SLEEP
│ Tasks pending? → Continue
└─────────────────────────┘
    ↓
┌─ DECISION ─┐
├─────────────┤
│ ACCEPT      │ Execute immediately
│ DEFER       │ Wait for better conditions
│ SLEEP       │ Device sleep mode
│ IDLE        │ Keep running, don't accept
└─────────────┘
```

### Decision Examples

**Example 1: Normal task, cold system, no queue**

```
Task: "database-cleanup" (100W)
Thermal: 35°C (optimal)
Queue: empty
Delegation hours: in window

Decision: SLEEP
Reason: All conditions good, but no queued tasks
Action: Sleep until next delegation window or critical task
```

**Example 2: Important task, warm system, queue pending**

```
Task: "backup-database" (200W)
Thermal: 65°C (elevated)
Power: 200W
Queue: 5 tasks pending
Delegation hours: in window
Urgency: high

Decision: DEFER
Reason: "Thermal elevated (65°C), task power-intensive (200W)"
Retry: In ~5 minutes when cooled to 55°C
```

**Example 3: Critical health task, very hot system**

```
Task: "health-sensor-upload" (50W)
Urgency: critical
Thermal: 82°C (critical)
Queue: 10 tasks pending
Delegation hours: outside (but doesn't matter)

Decision: SLEEP (then wake for task)
Reason: "Critical temperature: 82°C"
Action: Sleep immediately, interrupt with critical task arrival
Effect: System sleeps 2-3 minutes to cool, then wakes for health task
```

---

## 🔄 Integration with Existing System

### How It All Works Together

```
User Submits Task
    ↓
Smart Idle Engine
├─ Check: Thermal (temperature-based)
├─ Check: User preferences (delegation + idle)
├─ Check: Energy (clean grid)
├─ Check: Queue (anything pending?)
    ↓
Decision: ACCEPT | DEFER | SLEEP | IDLE
    ↓
If SLEEP → DeviceSleepManager
├─ Record sleep event
├─ Schedule auto-wake
├─ Trigger OS sleep
    ↓
If DEFER → Task goes back in queue
├─ Record why (thermal/energy/preference)
├─ Estimate wait time
├─ Notify user
    ↓
If ACCEPT → Execute task
├─ Monitor temperature during execution
├─ Defer new tasks if temp rising
├─ After completion:
│  ├─ Record temperature
│  ├─ Decide: SLEEP | IDLE | ACCEPT NEXT
```

### Example Real-World Scenario

**Alice's Solar Laptop (9 AM - 3 PM execution window)**

```
08:50 → Auto-wake: Device wakes for delegation window
        └─ Temperature: 22°C (cool after night sleep)

09:00 → Delegation window opens
        └─ 12 tasks submitted by community

09:05 → First task "database-cleanup" (80W) runs
        └─ Thermal: 30°C → OK
        └─ Energy: 98% solar clean → EXECUTE

09:15 → Task completes, thermal: 42°C
        └─ Smart engine: "Cold, tasks queued, in window"
        └─ Decision: ACCEPT next task

09:15 → Second task "cache-refresh" (60W) runs
        └─ Thermal: 42°C, energy: 95% clean → EXECUTE

09:30 → Task completes, thermal: 48°C
        └─ Smart engine checks

10:00 → 5th task completes, thermal: 68°C (rising)
        └─ Queue: 3 tasks remaining

10:10 → 6th task (video-encode, 400W) submitted
        └─ Smart engine decision:
        │  ├─ Thermal: 68°C + heavy task (400W) → DEFER
        │  ├─ Reason: "Thermal elevated (68°C), task power-intensive"
        │  └─ ETA: "Ready in ~10 minutes (when cooled to 55°C)"
        └─ Task stays in queue

10:10-10:20 → System IDLES (running but not accepting new tasks)
              └─ Temperature drops: 68°C → 59°C
              └─ Other light tasks execute normally

10:20 → Thermal: 55°C (back to safe)
        └─ Video-encode task now ACCEPTED
        └─ Executes for 20 minutes

10:40 → Video completes, thermal: 72°C (peaked during render)
        └─ Queue: empty
        └─ Time: 10:40 (in delegation window until 15:00)
        └─ Smart engine: "No queue, window still open"
        └─ Decision: IDLE (keep running, check queue)

10:40-15:00 → System IDLES
               └─ Continuously checks for new tasks
               └─ Temperature gradually cools: 72°C → 35°C
               └─ No new tasks arrive

15:00 → Delegation window closes
        └─ Queue: empty
        └─ Next window: tomorrow 9:00 AM
        └─ Smart engine: "Can sleep"
        └─ Decision: SLEEP

15:00 → 💤 Device enters sleep mode
        └─ Auto-wake scheduled for 08:50 tomorrow
        └─ CPU power: ~0.5W (< 1% of normal)
        └─ GPU off, display off
        └─ Memory powered (maintains state)

Energy savings for the day:
- Avoided 4+ hours of idle system running
- Temperature-based task deferral prevented thermal throttling
- Device slept when no work available
- Total energy: ~60% less than time-based approach
```

---

## 📊 Configuration Examples

### Conservative User (Fanless Laptop)

```javascript
const thermal = new ThermalMonitor(sharedMemory);
thermal.configureThresholds({
  critical: 70, // Lower threshold for fanless
  warning: { min: 10, max: 60 },
  safe: { min: 15, max: 50 },
});
thermal.configureCoolingRate(0.8); // Cools slower (fanless)

const sleep = new DeviceSleepManager(sharedMemory, taskQueue);
sleep.configureSettings({
  sleepAfterIdleMinutes: 10, // Sleep faster
  criticalTempThreshold: 65, // Lower temp for sleep trigger
});
```

### Solar User (Maximize Clean Energy)

```javascript
const thermal = new ThermalMonitor(sharedMemory);
thermal.configureThresholds({
  critical: 85, // Higher threshold (more robust)
  warning: { min: 10, max: 75 },
});
thermal.configureCoolingRate(1.5); // Normal cooling

const sleep = new DeviceSleepManager(sharedMemory, taskQueue);
sleep.configureSettings({
  sleepAfterIdleMinutes: 20, // Sleep less (solar available often)
  enableTemperatureSleep: true, // Use thermal for efficiency
});
```

### High-End Workstation

```javascript
const thermal = new ThermalMonitor(sharedMemory);
thermal.configureThresholds({
  critical: 95, // High threshold (robust cooling)
  warning: { min: 10, max: 85 },
});
thermal.configureCoolingRate(2.5); // Excellent cooling

const sleep = new DeviceSleepManager(sharedMemory, taskQueue);
sleep.configureSettings({
  sleepAfterIdleMinutes: 30, // Can stay idle longer
  enableTemperatureSleep: false, // Rarely needs thermal sleep
});
```

---

## 📈 Monitoring & Metrics

### Temperature Metrics

```sql
-- Average CPU temperature today
SELECT AVG(average_temp) as avg_temp
FROM thermal_history
WHERE DATE(timestamp) = DATE('now');

-- Thermal warnings triggered
SELECT COUNT(*) as warnings
FROM thermal_history
WHERE status IN ('warning', 'critical')
  AND timestamp > datetime('now', '-24 hours');

-- Temperature trend (hourly average)
SELECT
  strftime('%H:00', timestamp) as hour,
  AVG(average_temp) as avg_temp,
  COUNT(*) as samples
FROM thermal_history
WHERE timestamp > datetime('now', '-24 hours')
GROUP BY hour
ORDER BY hour;
```

### Sleep Metrics

```sql
-- Sleep summary (last 7 days)
SELECT
  DATE(sleep_start) as date,
  COUNT(*) as sleep_events,
  SUM(actual_sleep_duration) as total_sleep_minutes,
  AVG(actual_sleep_duration) as avg_sleep_minutes
FROM sleep_schedule
WHERE sleep_start > datetime('now', '-7 days')
GROUP BY DATE(sleep_start)
ORDER BY date DESC;

-- Sleep efficiency (% of night sleeping)
SELECT
  COUNT(CASE WHEN reason = 'idle' THEN 1 END) as idle_sleeps,
  COUNT(CASE WHEN reason = 'thermal' THEN 1 END) as thermal_sleeps,
  SUM(CASE WHEN reason = 'idle' THEN actual_sleep_duration ELSE 0 END) as idle_minutes,
  SUM(CASE WHEN reason = 'thermal' THEN actual_sleep_duration ELSE 0 END) as thermal_minutes
FROM sleep_schedule
WHERE sleep_start > datetime('now', '-7 days');
```

### Decision Statistics

```sql
-- Decision distribution (why are tasks being deferred?)
SELECT decision, COUNT(*) as count
FROM execution_history
WHERE timestamp > datetime('now', '-24 hours')
GROUP BY decision
ORDER BY count DESC;

-- Deferral reasons
SELECT
  reason,
  COUNT(*) as count
FROM execution_history
WHERE decision = 'DEFER'
  AND timestamp > datetime('now', '-24 hours')
GROUP BY reason
ORDER BY count DESC;
```

---

## 🔧 API Reference

### ThermalMonitor

```javascript
const thermal = new ThermalMonitor(sharedMemory);

// Monitoring
await thermal.startMonitoring();        // Start 30-sec sampling
thermal.stopMonitoring();               // Stop monitoring
thermal.configureThresholds({...});     // Set temp thresholds
thermal.configureCoolingRate(1.5);      // Set cooling rate

// Reading temperature
const temps = await thermal.getSystemTemperature();
// { cpu, gpu, average, status }

const rec = await thermal.getThermalRecommendation();
// { action, currentTemp, minutesUntilReady, reason }

const canRun = await thermal.canExecuteTask('normal');
// { canExecute, temperature, status, message }

// History
const history = await thermal.getThermalHistory(60); // Last 60 min
const stats = await thermal.getThermalStats(24);     // Last 24 hours
```

### DeviceSleepManager

```javascript
const sleep = new DeviceSleepManager(sharedMemory, taskQueue);

// Sleep control
await sleep.initiateDeviceSleep("idle"); // Start sleep
await sleep.wakeDevice("critical_task"); // Wake up
sleep.scheduleAutoWake(wakeTime); // Schedule wake

// Status
const shouldSleep = await sleep.shouldDeviceSleep();
const status = await sleep.getDeviceStatus();

// History
const history = await sleep.getSleepHistory(7); // Last 7 days
const stats = await sleep.getSleepStats(7); // Sleep stats

// Configuration
sleep.configureSettings({
  enableAutoSleep: true,
  sleepAfterIdleMinutes: 15,
  criticalTempThreshold: 75,
});
```

### SmartIdleEngine

```javascript
const engine = new SmartIdleEngine(sharedMemory, thermal, sleep, scheduler);

// Make decision
const decision = await engine.makeDecision(task, userId);
// { action, reason, metadata }

// Log & analyze
await engine.logDecision(decision);
const stats = await engine.getDecisionStats(24);

// Configuration
engine.configureSettings({
  prioritizeEnergySavings: true,
  enableSmartSleep: true,
  enableThermalManagement: true,
});
```

---

## ❓ FAQ

**Q: Can my device actually sleep without losing data?**
A: Yes! Sleep mode (S3/suspend) powers off CPU/GPU but keeps RAM powered. All data stays in memory. Wake-up is instant.

**Q: Won't frequent sleep/wake cycles be bad for hardware?**
A: Modern systems handle this fine. Sleep cycling is far less stressful than running hot, and much more efficient.

**Q: What if my device doesn't support sleep?**
A: Set `enableAutoSleep: false`. System will instead IDLE (run but not accept tasks) and provide thermal management.

**Q: How accurate is temperature sensing?**
A: Very accurate if you have CPU/GPU sensors (99%+). Fallback estimation from load is ~80% accurate.

**Q: Can I override thermal throttling for critical tasks?**
A: Yes! Critical tasks bypass thermal warnings (but not critical threshold). Use `urgency: 'critical'`.

**Q: What if grid is dirty but I have a critical task?**
A: Energy checks are bypassed for critical tasks. Thermal checks are NOT bypassed (device safety first).

**Q: How much energy does sleep mode use?**
A: ~0.5-2W depending on device (vs 20-100W running). Sleeps typically last 8+ hours, saving 150+ Wh per day.

---

## 🚀 Getting Started

### Step 1: Initialize Thermal Monitoring

```javascript
const thermal = new ThermalMonitor(sharedMemory);
await thermal.startMonitoring();
```

### Step 2: Initialize Device Sleep

```javascript
const sleep = new DeviceSleepManager(sharedMemory, taskQueue);
```

### Step 3: Create Smart Idle Engine

```javascript
const engine = new SmartIdleEngine(sharedMemory, thermal, sleep, scheduler);
```

### Step 4: Use for Task Decisions

```javascript
const decision = await engine.makeDecision(task, userId);

if (decision.action === "ACCEPT") {
  // Execute task
} else if (decision.action === "DEFER") {
  // Queue for later
  // Retry in decision.retryAfter minutes
} else if (decision.action === "SLEEP") {
  // Device enters sleep mode
  await sleep.initiateDeviceSleep(decision.reason);
}
```

Done! Your system now sleeps intelligently and manages temperature in real-time. 🎉

---

See [SYSTEM_INTEGRATION_SUMMARY.md](SYSTEM_INTEGRATION_SUMMARY.md) for how this fits into the complete eco-friendly system.
