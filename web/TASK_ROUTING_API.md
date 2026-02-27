# Task Routing API Endpoints

This document describes the REST API endpoints that need to be implemented in the eco-agent backend to support the TaskRoutingService from the browser app.

## Overview

The browser app communicates with the eco-agent via HTTP REST APIs and WebSocket. The TaskRoutingService (web/src/utils/taskRoutingService.js) expects these endpoints to exist.

## Base URL

All endpoints are relative to the agent's base URL (default: `http://localhost:3001`)

## Endpoints

### 1. Submit Task with Thermal Prediction

**POST** `/api/tasks/submit-with-prediction`

Submit a project as a task to the agent's job queue with thermal prediction analysis.

**Request Body:**

```json
{
  "project": {
    "id": "uuid",
    "name": "Project Name",
    "code": "// project code",
    "estimatedPowerWatts": 100,
    "estimatedDurationSeconds": 3600,
    "segmentable": true
  },
  "options": {
    "urgency": "normal",
    "deviceProfile": "auto",
    "autoSegment": true
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "taskQueue": {
    "jobId": "bull-job-id"
  },
  "prediction": {
    "peakTempEstimate": 65.5,
    "safetyMargin": 19.5,
    "recommendation": "PROCEED",
    "reason": "Device thermal capacity is excellent",
    "segments": null,
    "segmentsRecommended": 1
  },
  "decision": "PROCEED",
  "segments": null,
  "scheduledFor": "2024-01-15T10:30:00Z"
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "Project code is required"
}
```

---

### 2. Get Thermal Prediction (without submission)

**POST** `/api/predict/thermal`

Get thermal prediction for a project without submitting it to the queue.

**Request Body:**

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

**Response (200):**

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

### 3. Get Agent Status

**GET** `/api/agent/status`

Get overall agent status including queue statistics and device information.

**Response (200):**

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

### 4. Get Task Status

**GET** `/api/tasks/{taskId}`

Get status and details of a specific task.

**Response (200):**

```json
{
  "success": true,
  "taskId": "task-uuid",
  "projectName": "My Project",
  "status": "active",
  "progress": 45,
  "startedAt": "2024-01-15T10:00:00Z",
  "estimatedEndTime": "2024-01-15T11:30:00Z",
  "checkpoint": {
    "number": 2,
    "savedAt": "2024-01-15T10:25:00Z",
    "state": {
      "progress": 45,
      "executedSegments": 2,
      "totalSegments": 3
    }
  },
  "thermalData": {
    "currentTemp": 62.5,
    "peakTemp": 68.3,
    "avgTemp": 58.2,
    "status": "elevated"
  },
  "execution": {
    "segmentNumber": 2,
    "totalSegments": 3,
    "segmentProgress": 100,
    "totalProgress": 67
  }
}
```

**Response (404):**

```json
{
  "success": false,
  "error": "Task not found"
}
```

---

### 5. Pause Task

**POST** `/api/tasks/{taskId}/pause`

Pause a running task and save its checkpoint.

**Request Body:**

```json
{
  "reason": "User requested pause"
}
```

**Response (200):**

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

### 6. Resume Task

**POST** `/api/tasks/{taskId}/resume`

Resume a paused task from its last checkpoint.

**Request Body:**

```json
{
  "reason": "User requested resume"
}
```

**Response (200):**

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

### 7. Abort Task

**POST** `/api/tasks/{taskId}/abort`

Immediately abort a task (emergency stop).

**Request Body:**

```json
{
  "reason": "Device overheating"
}
```

**Response (200):**

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

### 8. Get Thermal Data

**GET** `/api/thermal/current`

Get real-time thermal data from the device.

**Response (200):**

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

### 9. Get Device Profiles

**GET** `/api/device-profiles`

Get list of available device thermal profiles.

**Response (200):**

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

### 10. Get Task History

**GET** `/api/tasks/history?limit=10&status=completed&offset=0`

Get historical task execution data.

**Query Parameters:**

- `limit` (default: 20) - Number of tasks to return
- `status` (optional) - Filter by status: pending, active, completed, failed, aborted
- `offset` (default: 0) - Pagination offset
- `sortBy` (default: createdAt) - Sort field: createdAt, completedAt, duration
- `sortOrder` (default: desc) - asc or desc

**Response (200):**

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
  "limit": 10,
  "offset": 0
}
```

---

### 11. Submit Batch Tasks

**POST** `/api/tasks/batch`

Submit multiple projects as tasks in batch.

**Request Body:**

```json
{
  "projects": [
    {
      "id": "uuid1",
      "name": "Project 1",
      "code": "// code",
      "estimatedPowerWatts": 100,
      "estimatedDurationSeconds": 3600
    },
    {
      "id": "uuid2",
      "name": "Project 2",
      "code": "// code",
      "estimatedPowerWatts": 150,
      "estimatedDurationSeconds": 5400
    }
  ],
  "options": {
    "urgency": "normal",
    "deviceProfile": "auto",
    "autoSegment": true
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "submitted": 2,
  "tasks": [
    {
      "projectId": "uuid1",
      "taskId": "task-uuid1",
      "prediction": { ... }
    },
    {
      "projectId": "uuid2",
      "taskId": "task-uuid2",
      "prediction": { ... }
    }
  ]
}
```

---

## WebSocket Endpoint

### Live Stream Updates

**WS** `/ws/live`

WebSocket connection for real-time updates on task execution and thermal status.

**Client -> Server (Subscribe):**

```json
{
  "type": "subscribe",
  "taskId": "task-uuid",
  "channels": ["task-status", "thermal-data", "queue-status"]
}
```

**Server -> Client (Task Status Update):**

```json
{
  "type": "task-status",
  "taskId": "task-uuid",
  "status": "active",
  "progress": 45,
  "checkpoint": 2
}
```

**Server -> Client (Thermal Update):**

```json
{
  "type": "thermal-data",
  "timestamp": "2024-01-15T10:30:00Z",
  "currentTemp": 62.5,
  "status": "elevated",
  "trend": "rising"
}
```

**Server -> Client (Queue Status):**

```json
{
  "type": "queue-status",
  "pending": 2,
  "active": 1,
  "completed": 50
}
```

---

## Error Handling

All endpoints use consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**

- `INVALID_REQUEST` - Missing or malformed parameters
- `TASK_NOT_FOUND` - Task ID doesn't exist
- `DEVICE_OFFLINE` - Device not accessible
- `THERMAL_LIMIT_EXCEEDED` - Device too hot
- `INTERNAL_ERROR` - Server error

**HTTP Status Codes:**

- `200` - Success
- `400` - Bad request / invalid parameters
- `404` - Not found
- `500` - Server error
- `503` - Service unavailable

---

## Implementation Notes

### Location

These endpoints should be implemented in the agent's main server file (likely `agent/index.js` or a routes file like `agent/routes/tasks.js`).

### Dependencies

- Express.js (for HTTP routing)
- WebSocket library (e.g., `ws` or `socket.io`)
- ThermalPrediction module (thermal predictions)
- TaskCheckpointManager (checkpoint operations)
- RuntimeAbortMonitor (monitoring/abort)

### Integration Points

1. These endpoints wrap existing modules (ThermalPrediction, TaskCheckpointManager, etc.)
2. They interface with the Bull task queue
3. They communicate thermal state through the RuntimeAbortMonitor
4. WebSocket broadcasts to all connected clients on updates

### Examples

#### Express Route Setup

```javascript
// agent/routes/tasks.js
const express = require("express");
const router = express.Router();
const { ThermalPrediction } = require("../modules/thermalPrediction");

router.post("/submit-with-prediction", async (req, res) => {
  try {
    const { project, options } = req.body;

    // Validate project
    if (!project || !project.code) {
      return res.status(400).json({
        success: false,
        error: "Project code is required",
      });
    }

    // Get thermal prediction
    const prediction = await ThermalPrediction.predict(
      project,
      options.deviceProfile || "auto",
    );

    // Submit task with auto-segmentation if needed
    const taskId = await submitTask(project, prediction, options);

    res.json({
      success: true,
      taskId,
      prediction,
      decision: prediction.recommendation,
      scheduledFor: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
```

#### WebSocket Setup

```javascript
// agent/wsHandler.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "subscribe") {
      // Track subscription for this client
      ws.subscribedChannels = msg.channels;
      ws.subscribedTaskId = msg.taskId;
    }
  });
});

// Broadcast updates when they occur
function broadcastThermalUpdate(data) {
  wss.clients.forEach((client) => {
    if (client.subscribedChannels.includes("thermal-data")) {
      client.send(
        JSON.stringify({
          type: "thermal-data",
          ...data,
        }),
      );
    }
  });
}

module.exports = { wss, broadcastThermalUpdate };
```

---

## Testing

Test endpoints using Postman or curl:

```bash
# Submit a task with thermal prediction
curl -X POST http://localhost:3001/api/tasks/submit-with-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "project": {
      "id": "test-1",
      "name": "Test Project",
      "code": "console.log(\"hello\")",
      "estimatedPowerWatts": 100,
      "estimatedDurationSeconds": 3600
    },
    "options": {
      "urgency": "normal",
      "deviceProfile": "auto"
    }
  }'

# Get agent status
curl http://localhost:3001/api/agent/status

# Get task status
curl http://localhost:3001/api/tasks/task-uuid

# Get thermal data
curl http://localhost:3001/api/thermal/current
```

---

## Next Steps

1. ✅ Service layer created (TaskRoutingService)
2. ✅ React UI component created (TaskRoutingTab)
3. ⏳ **Implement these API endpoints** in agent
4. ⏳ Test endpoints with browser app
5. ⏳ Implement WebSocket handler for real-time updates
6. ⏳ Deploy and monitor
