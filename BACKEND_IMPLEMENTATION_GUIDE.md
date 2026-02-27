# Backend Implementation Guide - Task Routing System

## Overview

This guide helps backend developers implement the 11 REST API endpoints needed for the task routing system.

The frontend is complete and ready. Your job is to:

1. Add Express routes
2. Connect to existing modules (ThermalPrediction, TaskCheckpointManager, RuntimeAbortMonitor)
3. Return data in the expected format
4. Handle errors gracefully

---

## Prerequisites

Before you start, ensure you have:

- ✅ Node.js + Express.js
- ✅ ThermalPrediction module (thermalPrediction.js)
- ✅ TaskCheckpointManager module (taskCheckpointManager.js)
- ✅ RuntimeAbortMonitor module (runtimeAbortMonitor.js)
- ✅ Bull task queue (for job management)
- ✅ SQLite database (for metadata)
- ✅ Device thermal profiles

---

## Endpoint Implementation Order

### Phase 1: Core Endpoints (Critical)

1. ✅ POST /api/tasks/submit-with-prediction
2. ✅ POST /api/predict/thermal
3. ✅ GET /api/agent/status
4. ✅ GET /api/thermal/current

**Why first?** These are the minimum viable product. Browser can submit tasks and monitor status.

### Phase 2: Task Operations (Important)

5. ✅ GET /api/tasks/{taskId}
6. ✅ POST /api/tasks/{taskId}/pause
7. ✅ POST /api/tasks/{taskId}/resume
8. ✅ POST /api/tasks/{taskId}/abort

**Why second?** Enables full task control and monitoring.

### Phase 3: Discovery Endpoints (Nice-to-have)

9. ✅ GET /api/device-profiles
10. ✅ GET /api/tasks/history

**Why third?** Improves UX but not critical for MVP.

### Phase 4: Advanced (Optional)

11. ✅ POST /api/tasks/batch
12. ✅ WS /ws/live (WebSocket)

**Why last?** Optimizations for power users and real-time updates.

---

## Endpoint Implementation Details

### 1. POST /api/tasks/submit-with-prediction

**Purpose:** Submit a project as a task with thermal prediction analysis.

**Request:**

```javascript
{
  project: {
    id: "uuid",
    name: "Project Name",
    code: "// project code",
    estimatedPowerWatts: 100,
    estimatedDurationSeconds: 3600,
    segmentable: true
  },
  options: {
    urgency: "normal",     // 'low' | 'normal' | 'high' | 'critical'
    deviceProfile: "auto", // 'auto' | profile id
    autoSegment: true      // Auto-segment if needed
  }
}
```

**Implementation Steps:**

```javascript
// 1. Validate project
if (!project || !project.code) {
  return res
    .status(400)
    .json({ success: false, error: "Project code required" });
}

// 2. Get thermal prediction
const prediction = await ThermalPrediction.predict(
  project,
  options.deviceProfile,
);

// 3. Create task in queue
const taskId = generateTaskId();
const task = queue.create("execute-project", {
  projectId: project.id,
  projectName: project.name,
  code: project.code,
  segments: prediction.segments,
  urgency: options.urgency,
});

// 4. Store metadata in database
await db.tasks.insert({
  id: taskId,
  projectId: project.id,
  projectName: project.name,
  status: "pending",
  createdAt: new Date(),
  prediction: prediction,
  options: options,
});

// 5. Start abort monitor
RuntimeAbortMonitor.startMonitoring(taskId, 85); // 85°C threshold

// 6. Return response
return res.json({
  success: true,
  taskId: taskId,
  prediction: prediction,
  decision: prediction.recommendation,
  scheduledFor: new Date().toISOString(),
});
```

**Response:**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "prediction": {
    "peakTempEstimate": 65.5,
    "safetyMargin": 19.5,
    "recommendation": "PROCEED",
    "reason": "Device thermal capacity is excellent",
    "segments": null,
    "segmentsRecommended": 1
  },
  "decision": "PROCEED",
  "scheduledFor": "2024-01-15T10:30:00Z"
}
```

---

### 2. POST /api/predict/thermal

**Purpose:** Get thermal prediction without submitting task.

**Request:**

```json
{
  "project": {
    "id": "uuid",
    "name": "Project Name",
    "estimatedPowerWatts": 100,
    "estimatedDurationSeconds": 3600
  },
  "deviceProfile": "auto"
}
```

**Implementation:**

```javascript
// 1. Validate input
if (!project) {
  return res.status(400).json({ success: false, error: "Project required" });
}

// 2. Call thermal prediction
const prediction = await ThermalPrediction.predict(project, deviceProfile);

// 3. Add metadata
const currentTemp = await getThermalSensor();
const metadata = {
  currentTemp: currentTemp,
  ambientTemp: 25, // estimate or actual
  thermalBudget: 85,
  coolingRate: 2.5,
};

// 4. Return
return res.json({
  success: true,
  ...prediction,
  metadata: metadata,
});
```

**Response:**

```json
{
  "success": true,
  "peakTempEstimate": 65.5,
  "safetyMargin": 19.5,
  "recommendation": "PROCEED",
  "reason": "Device thermal capacity is excellent",
  "segments": null,
  "segmentsRecommended": 1,
  "metadata": {
    "currentTemp": 35,
    "ambientTemp": 25,
    "thermalBudget": 85,
    "coolingRate": 2.5
  }
}
```

---

### 3. GET /api/agent/status

**Purpose:** Get overall agent status and queue statistics.

**Implementation:**

```javascript
// 1. Get queue stats
const stats = await queue.getJobCounts();

// 2. Get device info
const device = {
  model: "iPhone 15 Pro",
  platform: "ios",
  processorCores: 8,
  memoryGB: 8,
};

// 3. Get thermal info
const currentTemp = await getThermalSensor();
const peakTemp = await getThermalHistory().max;
const status = currentTemp > 70 ? "elevated" : "optimal";

// 4. Return
return res.json({
  success: true,
  isRunning: true,
  uptime: process.uptime() * 1000,
  timestamp: new Date().toISOString(),
  queue: {
    pending: stats.waiting,
    active: stats.active,
    completed: stats.completed,
    failed: stats.failed,
    delayed: stats.delayed,
  },
  device: device,
  thermal: {
    currentTemp: currentTemp,
    peakTemp: peakTemp,
    status: status,
  },
});
```

**Response:**

```json
{
  "success": true,
  "isRunning": true,
  "uptime": 3600000,
  "timestamp": "2024-01-15T10:30:00Z",
  "queue": {
    "pending": 3,
    "active": 1,
    "completed": 45,
    "failed": 2,
    "delayed": 1
  },
  "device": {
    "model": "iPhone 15 Pro",
    "platform": "ios",
    "processorCores": 8,
    "memoryGB": 8
  },
  "thermal": {
    "currentTemp": 38.2,
    "peakTemp": 72.1,
    "status": "optimal"
  }
}
```

---

### 4. GET /api/thermal/current

**Purpose:** Get real-time thermal data from device.

**Implementation:**

```javascript
// 1. Get current readings
const currentTemp = await getThermalSensor();
const peakTemp = await getThermalHistory().max;
const avgTemp = await getThermalHistory().average;

// 2. Calculate trend
const recentTemps = await getThermalHistory(60); // last 60 seconds
const trend =
  recentTemps[recentTemps.length - 1] > recentTemps[0]
    ? "rising"
    : recentTemps[recentTemps.length - 1] < recentTemps[0]
      ? "cooling"
      : "stable";

// 3. Estimate cooldown
const coolingRate = 2.5; // degrees per minute
const targetTemp = 60;
const timeToTarget = Math.max(0, (currentTemp - targetTemp) / coolingRate) * 60;

// 4. Status
let status = "optimal";
if (currentTemp > 75) status = "critical";
else if (currentTemp > 70) status = "warning";
else if (currentTemp > 60) status = "elevated";
else if (currentTemp > 40) status = "safe";

// 5. Return
return res.json({
  success: true,
  timestamp: new Date().toISOString(),
  currentTemp: currentTemp,
  peakTemp: peakTemp,
  avgTemp: avgTemp,
  status: status,
  trend: trend,
  coolingRate: coolingRate,
  estimatedCooldownTime: timeToTarget,
  thermalBudget: 85,
  headroom: 85 - currentTemp,
});
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "currentTemp": 42.5,
  "peakTemp": 72.1,
  "avgTemp": 58.2,
  "status": "safe",
  "trend": "cooling",
  "coolingRate": 2.5,
  "estimatedCooldownTime": 300,
  "thermalBudget": 85,
  "headroom": 42.5
}
```

---

### 5. GET /api/tasks/{taskId}

**Purpose:** Get status of a specific task.

**Implementation:**

```javascript
// 1. Get task from queue
const bullJob = await queue.getJob(taskId);
if (!bullJob) {
  return res.status(404).json({ success: false, error: "Task not found" });
}

// 2. Get metadata from database
const taskMeta = await db.tasks.findById(taskId);

// 3. Get thermal data
const thermalData = await db.thermalHistory.findByTaskId(taskId);
const currentThermal = thermalData[thermalData.length - 1];

// 4. Get checkpoint if paused
let checkpoint = null;
if (bullJob.state() === "paused") {
  checkpoint = await TaskCheckpointManager.loadCheckpoint(taskId);
}

// 5. Calculate execution stats
const progress = bullJob.progress();
const startTime = bullJob.startedAt || taskMeta.createdAt;
const now = Date.now();
const elapsed = now - startTime;
const estimatedTotal = taskMeta.project.estimatedDurationSeconds * 1000;
const estimatedEnd = startTime + estimatedTotal;

// 6. Return
return res.json({
  success: true,
  taskId: taskId,
  projectName: taskMeta.projectName,
  status: bullJob.state(), // 'active', 'paused', 'completed', 'failed'
  progress: progress,
  startedAt: new Date(bullJob.startedAt).toISOString(),
  estimatedEndTime: new Date(estimatedEnd).toISOString(),
  checkpoint: checkpoint,
  thermalData: currentThermal,
  execution: {
    segmentNumber: checkpoint?.segmentId || 1,
    totalSegments: taskMeta.prediction.segmentsRecommended || 1,
    segmentProgress: 100,
    totalProgress: progress,
  },
});
```

**Response:**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "projectName": "My Project",
  "status": "active",
  "progress": 45,
  "startedAt": "2024-01-15T10:00:00Z",
  "estimatedEndTime": "2024-01-15T11:30:00Z",
  "checkpoint": null,
  "thermalData": {
    "currentTemp": 62.5,
    "peakTemp": 68.3,
    "avgTemp": 58.2,
    "status": "elevated"
  },
  "execution": {
    "segmentNumber": 1,
    "totalSegments": 1,
    "segmentProgress": 100,
    "totalProgress": 45
  }
}
```

---

### 6. POST /api/tasks/{taskId}/pause

**Purpose:** Pause a running task and save checkpoint.

**Implementation:**

```javascript
// 1. Get task
const task = await queue.getJob(taskId);
if (!task) {
  return res.status(404).json({ success: false, error: "Task not found" });
}

// 2. Get current state
const state = {
  progress: task.progress(),
  executedSegments: task.data.executedSegments || 0,
  totalSegments: task.data.totalSegments || 1,
  lastTemperature: await getThermalSensor(),
};

// 3. Save checkpoint
const checkpoint = await TaskCheckpointManager.saveCheckpoint(taskId, state);

// 4. Pause task execution
await task.pause();
await db.tasks.update(taskId, { status: "paused", pausedAt: new Date() });

// 5. Return
return res.json({
  success: true,
  taskId: taskId,
  status: "paused",
  checkpoint: {
    number: checkpoint.number,
    savedAt: checkpoint.savedAt,
    progress: state.progress,
    state: state,
  },
});
```

**Response:**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "status": "paused",
  "checkpoint": {
    "number": 2,
    "savedAt": "2024-01-15T10:25:00Z",
    "progress": 45,
    "state": {
      "progress": 45,
      "executedSegments": 2,
      "totalSegments": 3
    }
  }
}
```

---

### 7. POST /api/tasks/{taskId}/resume

**Purpose:** Resume a paused task from checkpoint.

**Implementation:**

```javascript
// 1. Get task
const task = await queue.getJob(taskId);
if (!task) {
  return res.status(404).json({ success: false, error: "Task not found" });
}

// 2. Load checkpoint
const checkpoint = await TaskCheckpointManager.loadCheckpoint(taskId);
if (!checkpoint) {
  return res.status(400).json({ success: false, error: "No checkpoint found" });
}

// 3. Resume execution
await task.resume();
task.data.checkpointState = checkpoint.state;
await task.update(task.data);

// 4. Update database
await db.tasks.update(taskId, { status: "active", resumedAt: new Date() });

// 5. Return
return res.json({
  success: true,
  taskId: taskId,
  status: "active",
  resumedFrom: checkpoint.number,
  message: `Task resumed from checkpoint ${checkpoint.number} (${checkpoint.state.progress}% complete)`,
});
```

**Response:**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "status": "active",
  "resumedFrom": 2,
  "message": "Task resumed from checkpoint 2 (45% complete)"
}
```

---

### 8. POST /api/tasks/{taskId}/abort

**Purpose:** Immediately abort a task (emergency stop).

**Implementation:**

```javascript
// 1. Get task
const task = await queue.getJob(taskId);
if (!task) {
  return res.status(404).json({ success: false, error: "Task not found" });
}

// 2. Stop execution via abort monitor
await RuntimeAbortMonitor.abort(taskId, reason);

// 3. Remove from queue
await task.remove();

// 4. Update database
await db.tasks.update(taskId, {
  status: "aborted",
  abortedAt: new Date(),
  abortReason: reason,
});

// 5. Return
return res.json({
  success: true,
  taskId: taskId,
  status: "aborted",
  progress: task.progress(),
  reason: reason,
});
```

**Response:**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "status": "aborted",
  "progress": 45,
  "reason": "Device overheating"
}
```

---

### 9. GET /api/device-profiles

**Purpose:** Get list of available device profiles.

**Implementation:**

```javascript
// 1. Load profiles from config/database
const profiles = await db.deviceProfiles.findAll();

// 2. Get current device
const currentDevice = await detectCurrentDevice(); // or config value

// 3. Return
return res.json({
  success: true,
  profiles: profiles,
  currentProfile: currentDevice.id,
});
```

**Response:**

```json
{
  "success": true,
  "profiles": [
    {
      "id": "iphone15pro",
      "name": "iPhone 15 Pro",
      "maxTemp": 85,
      "typicalTemp": 60,
      "coolingRate": 2.8,
      "processorCores": 8,
      "memoryGB": 8
    },
    {
      "id": "iphone14pro",
      "name": "iPhone 14 Pro",
      "maxTemp": 85,
      "typicalTemp": 62,
      "coolingRate": 2.5,
      "processorCores": 6,
      "memoryGB": 6
    }
  ],
  "currentProfile": "iphone15pro"
}
```

---

### 10. GET /api/tasks/history

**Purpose:** Get historical task execution data.

**Implementation:**

```javascript
// 1. Parse query parameters
const limit = req.query.limit || 20;
const offset = req.query.offset || 0;
const status = req.query.status; // filter by status
const sortBy = req.query.sortBy || "createdAt";
const sortOrder = req.query.sortOrder || "desc";

// 2. Build query
let query = db.tasks.findAll();
if (status) query = query.where({ status: status });
query = query.sort(sortBy, sortOrder);

// 3. Get total count
const total = await query.count();

// 4. Get paginated results
const tasks = await query.limit(limit).offset(offset);

// 5. Format results
const formatted = tasks.map((t) => ({
  taskId: t.id,
  projectName: t.projectName,
  status: t.status,
  createdAt: t.createdAt,
  startedAt: t.startedAt,
  completedAt: t.completedAt,
  duration: t.completedAt ? t.completedAt - t.startedAt : null,
  progress: t.progress,
  segments: t.prediction.segmentsRecommended,
  thermalPeak: t.thermalPeak,
  errors: t.errors,
}));

// 6. Return
return res.json({
  success: true,
  tasks: formatted,
  total: total,
  limit: limit,
  offset: offset,
});
```

**Response:**

```json
{
  "success": true,
  "tasks": [
    {
      "taskId": "task-uuid",
      "projectName": "My Project",
      "status": "completed",
      "createdAt": "2024-01-15T09:00:00Z",
      "startedAt": "2024-01-15T09:05:00Z",
      "completedAt": "2024-01-15T10:30:00Z",
      "duration": 5400000,
      "progress": 100,
      "segments": 3,
      "thermalPeak": 71.2,
      "errors": null
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

## Setup Instructions

### 1. Create Routes File

**File: `agent/routes/taskRouting.js`**

```javascript
const express = require("express");
const router = express.Router();
const { ThermalPrediction } = require("../modules/thermalPrediction");
const { TaskCheckpointManager } = require("../modules/taskCheckpointManager");
const { RuntimeAbortMonitor } = require("../modules/runtimeAbortMonitor");

// All endpoints here...

module.exports = router;
```

### 2. Register Routes in Main File

**File: `agent/index.js`**

```javascript
const taskRoutingRoutes = require("./routes/taskRouting");

// Mount routes
app.use("/api", taskRoutingRoutes);
```

### 3. Database Schema

Ensure these tables exist:

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  projectName TEXT,
  status TEXT,
  createdAt DATETIME,
  startedAt DATETIME,
  completedAt DATETIME,
  progress INTEGER,
  prediction JSON,
  options JSON,
  errors JSON
);

-- Checkpoints table
CREATE TABLE task_checkpoints (
  id INTEGER PRIMARY KEY,
  taskId TEXT,
  checkpointNumber INTEGER,
  state JSON,
  savedAt DATETIME,
  FOREIGN KEY(taskId) REFERENCES tasks(id)
);

-- Thermal history table
CREATE TABLE thermal_history (
  id INTEGER PRIMARY KEY,
  taskId TEXT,
  timestamp DATETIME,
  temperature REAL,
  status TEXT,
  FOREIGN KEY(taskId) REFERENCES tasks(id)
);

-- Device profiles table
CREATE TABLE device_profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  maxTemp INTEGER,
  coolingRate REAL,
  processorCores INTEGER,
  memoryGB INTEGER
);
```

### 4. Error Handling

Implement consistent error responses:

```javascript
// Validation error
res.status(400).json({
  success: false,
  error: "Invalid input",
  code: "INVALID_REQUEST",
});

// Not found
res.status(404).json({
  success: false,
  error: "Task not found",
  code: "TASK_NOT_FOUND",
});

// Server error
res.status(500).json({
  success: false,
  error: "Internal server error",
  code: "INTERNAL_ERROR",
});
```

---

## Testing

### Test with Postman

```bash
# 1. Predict thermal
POST http://localhost:3001/api/predict/thermal
Content-Type: application/json

{
  "project": {
    "id": "test-1",
    "name": "Test",
    "estimatedPowerWatts": 100,
    "estimatedDurationSeconds": 3600
  },
  "deviceProfile": "auto"
}

# 2. Submit task
POST http://localhost:3001/api/tasks/submit-with-prediction
Content-Type: application/json

{
  "project": {...},
  "options": {"urgency": "normal", "deviceProfile": "auto"}
}

# 3. Get agent status
GET http://localhost:3001/api/agent/status

# 4. Get task status
GET http://localhost:3001/api/tasks/{taskId}
```

### Unit Tests

```javascript
describe("Task Routing API", () => {
  test("POST /api/predict/thermal returns prediction", async () => {
    const res = await request(app)
      .post("/api/predict/thermal")
      .send({
        project: { estimatedPowerWatts: 100, estimatedDurationSeconds: 3600 },
        deviceProfile: "auto",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendation).toBeDefined();
  });

  // More tests...
});
```

---

## WebSocket Implementation (Optional)

### Basic WebSocket Handler

```javascript
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "subscribe") {
      ws.taskId = msg.taskId;
      ws.channels = msg.channels;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Broadcast task status updates
async function broadcastTaskUpdate(taskId, status) {
  wss.clients.forEach((client) => {
    if (client.taskId === taskId && client.channels.includes("task-status")) {
      client.send(
        JSON.stringify({
          type: "task-status",
          taskId: taskId,
          status: status.status,
          progress: status.progress,
        }),
      );
    }
  });
}
```

---

## Summary

### Required Steps

1. ✅ Review the 10 endpoint specifications above
2. ✅ Create `routes/taskRouting.js` with all endpoints
3. ✅ Connect to ThermalPrediction, TaskCheckpointManager, RuntimeAbortMonitor
4. ✅ Test with Postman
5. ✅ Deploy

### Testing Checklist

- [ ] All 10 endpoints return correct format
- [ ] Error cases handled properly
- [ ] Database transactions work
- [ ] Thermal predictions accurate
- [ ] Checkpoints save/load correctly
- [ ] Abort monitoring works

### Time Estimate

- **Phase 1 (MVP)**: 4 endpoints, ~2-4 hours
- **Phase 2 (Full)**: 10 endpoints, ~6-8 hours
- **Phase 3 (WebSocket)**: Optional, ~2-3 hours

---

## Questions?

Refer to:

- [web/TASK_ROUTING_API.md](web/TASK_ROUTING_API.md) - Complete specs
- [TASK_ROUTING_ARCHITECTURE.md](TASK_ROUTING_ARCHITECTURE.md) - System diagrams
- Component source code - JSDoc comments

---

Good luck! You've got this! 🚀
