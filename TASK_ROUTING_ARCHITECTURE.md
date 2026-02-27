# Task Routing System - Visual Overview

## Complete System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        BROWSER APPLICATION (React)                           ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │                         TaskRoutingTab Component                       │   ║
║  │                                                                        │   ║
║  │  [Projects | Code Editor | Preview | Simulator | Task Routing | ...] │   ║
║  │                                      ↓                                 │   ║
║  │                           ┌──────────────────┐                        │   ║
║  │                           │  SUBMIT VIEW     │  MONITOR VIEW          │   ║
║  │                           │                  │                        │   ║
║  │                           │ 1. Select Project│  • Agent Status        │   ║
║  │                           │ 2. Predict       │    - Running? ○        │   ║
║  │                           │    Thermal ○     │    - Queue: 3/1/45     │   ║
║  │                           │ 3. View          │  • Thermal Status      │   ║
║  │                           │    Recommendation│    - 42.5°C Safe       │   ║
║  │                           │ 4. Submit ○      │  • Active Tasks        │   ║
║  │                           │                  │    ├─ Project A 45%    │   ║
║  │                           │                  │    └─ Project B 72%    │   ║
║  │                           │                  │  • Task Controls       │   ║
║  │                           │                  │    ├─ Pause ○          │   ║
║  │                           │                  │    ├─ Resume ○         │   ║
║  │                           │                  │    └─ Abort ○          │   ║
║  │                           └──────────────────┘                        │   ║
║  │                                    ↓                                   │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                      ↓                                        ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │                    TaskRoutingService (Bridge Layer)                  │   ║
║  │                                                                        │   ║
║  │  Methods:                                                              │   ║
║  │  ├─ submitProjectAsTask()          → POST /api/tasks/submit-with-pred│   ║
║  │  ├─ getThermalPrediction()         → POST /api/predict/thermal       │   ║
║  │  ├─ getTaskStatus(taskId)          → GET /api/tasks/{taskId}         │   ║
║  │  ├─ pauseTask(taskId)              → POST /api/tasks/{id}/pause      │   ║
║  │  ├─ resumeTask(taskId)             → POST /api/tasks/{id}/resume     │   ║
║  │  ├─ abortTask(taskId)              → POST /api/tasks/{id}/abort      │   ║
║  │  ├─ getAgentStatus()               → GET /api/agent/status           │   ║
║  │  ├─ getThermalData()               → GET /api/thermal/current        │   ║
║  │  ├─ getDeviceProfiles()            → GET /api/device-profiles        │   ║
║  │  ├─ getTaskHistory(options)        → GET /api/tasks/history          │   ║
║  │  └─ createLiveStream()             → WS /ws/live                     │   ║
║  │                                                                        │   ║
║  │  Caching: Status results cached for 5 seconds                         │   ║
║  │  Error Handling: Try-catch, descriptive messages                      │   ║
║  │  WebSocket: Support for real-time updates (fallback to polling)       │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                      ↓                                        ║
║                    HTTP REST API + WebSocket (JSON)                          ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                      ↓
                    ╔═════════════════════════════════════╗
                    ║   AGENT BACKEND (Node.js/Express)   ║
                    ║     [API Implementation Needed]     ║
                    ╚═════════════════════════════════════╝
                                      ↓
╔══════════════════════════════════════════════════════════════════════════════╗
║                          EXPRESS.JS API ROUTES                               ║
║                                                                               ║
║  POST /api/tasks/submit-with-prediction                                      ║
║      ├─ Validate project                                                     ║
║      ├─ Call ThermalPrediction.predict()                                     ║
║      ├─ Decide segmentation strategy                                         ║
║      ├─ Create task in Bull queue                                            ║
║      └─ Return { taskId, prediction, decision, scheduledFor }                ║
║                                                                               ║
║  POST /api/predict/thermal                                                   ║
║      ├─ Validate project parameters                                          ║
║      ├─ Get current device thermal state                                     ║
║      ├─ Call ThermalPrediction.predict()                                     ║
║      └─ Return { peakTempEstimate, recommendation, segments... }             ║
║                                                                               ║
║  GET /api/tasks/{taskId}                                                     ║
║      ├─ Query task from Bull queue                                           ║
║      ├─ Get task metadata from database                                      ║
║      ├─ Get current thermal readings                                         ║
║      └─ Return { status, progress, thermal, checkpoint... }                  ║
║                                                                               ║
║  POST /api/tasks/{taskId}/pause                                              ║
║      ├─ Pause task execution                                                 ║
║      ├─ Call TaskCheckpointManager.saveCheckpoint()                          ║
║      └─ Return { status: 'paused', checkpoint }                              ║
║                                                                               ║
║  POST /api/tasks/{taskId}/resume                                             ║
║      ├─ Load checkpoint via TaskCheckpointManager.loadCheckpoint()           ║
║      ├─ Resume task execution                                                ║
║      └─ Return { status: 'active', resumedFrom }                             ║
║                                                                               ║
║  POST /api/tasks/{taskId}/abort                                              ║
║      ├─ Call RuntimeAbortMonitor.abort()                                     ║
║      ├─ Stop task immediately                                                ║
║      └─ Return { status: 'aborted', progress }                               ║
║                                                                               ║
║  GET /api/agent/status                                                       ║
║      ├─ Get queue statistics                                                 ║
║      ├─ Get device information                                               ║
║      ├─ Get thermal readings                                                 ║
║      └─ Return { isRunning, queue, device, thermal }                         ║
║                                                                               ║
║  GET /api/thermal/current                                                    ║
║      ├─ Query thermal sensor data                                            ║
║      ├─ Calculate trend (rising/stable/cooling)                              ║
║      ├─ Estimate cooldown time                                               ║
║      └─ Return { currentTemp, peakTemp, status, trend... }                   ║
║                                                                               ║
║  GET /api/device-profiles                                                    ║
║      ├─ Load device profile definitions                                      ║
║      ├─ Detect current device                                                ║
║      └─ Return [ { id, name, maxTemp, coolingRate... } ]                     ║
║                                                                               ║
║  GET /api/tasks/history?limit=10&status=completed                            ║
║      ├─ Query task history from database                                     ║
║      ├─ Filter by status/date range                                          ║
║      ├─ Sort by field (createdAt, duration, etc)                             ║
║      └─ Return [ { taskId, status, progress, duration... } ]                 ║
║                                                                               ║
║  WS /ws/live                                                                 ║
║      ├─ Open WebSocket connection                                            ║
║      ├─ Client subscribes to channels (task-status, thermal-data, etc)       ║
║      ├─ Server broadcasts updates on changes                                 ║
║      └─ Push { type: 'task-status', taskId, status, progress }               ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                      ↓
╔══════════════════════════════════════════════════════════════════════════════╗
║                      CORE BACKEND MODULES                                    ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  ThermalPrediction Module                                             │   ║
║  │  ├─ predict(project, deviceProfile)                                  │   ║
║  │  │  └─ Returns: { peakTemp, recommendation, segments }               │   ║
║  │  ├─ getDeviceProfile(id)                                             │   ║
║  │  ├─ simulateExecution(project, deviceProfile)                        │   ║
║  │  └─ Decision engine: PROCEED | SEGMENT | WAIT | SKIP                │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  TaskCheckpointManager Module                                         │   ║
║  │  ├─ saveCheckpoint(taskId, state)                                    │   ║
║  │  │  └─ Stores task state in database for later resume                │   ║
║  │  ├─ loadCheckpoint(taskId)                                           │   ║
║  │  │  └─ Retrieves saved state for task resumption                     │   ║
║  │  ├─ deleteCheckpoint(taskId)                                         │   ║
║  │  └─ listCheckpoints(taskId)                                          │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  RuntimeAbortMonitor Module                                           │   ║
║  │  ├─ startMonitoring(taskId, thermalThreshold)                        │   ║
║  │  │  └─ Watches task execution, triggers abort if overheating         │   ║
║  │  ├─ abort(taskId, reason)                                            │   ║
║  │  │  └─ Emergency stop, saves checkpoint                              │   ║
║  │  ├─ onThermalAlert(callback)                                         │   ║
║  │  │  └─ Called when device approaching thermal limit                  │   ║
║  │  └─ getThermalStatus(taskId)                                         │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  Task Queue (Bull)                                                   │   ║
║  │  ├─ Manages job scheduling                                           │   ║
║  │  ├─ Handles job execution                                            │   ║
║  │  ├─ Tracks progress                                                  │   ║
║  │  └─ Supports pause/resume/abort                                      │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  Database (SQLite)                                                   │   ║
║  │  ├─ tasks                    (task metadata)                         │   ║
║  │  ├─ task_checkpoints         (saved state)                           │   ║
║  │  ├─ thermal_history          (temperature readings)                  │   ║
║  │  ├─ device_profiles          (device specifications)                 │   ║
║  │  └─ task_execution_history   (analytics)                             │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                      ↓
╔══════════════════════════════════════════════════════════════════════════════╗
║                         DEVICE HARDWARE                                      ║
║                                                                               ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     ║
║  │     CPU      │  │   Memory     │  │   Storage    │  │  Thermal     │     ║
║  │              │  │              │  │              │  │  Sensors     │     ║
║  │ • Processor  │  │ • RAM        │  │ • SSD/Flash  │  │ • Temp       │     ║
║  │ • Cores      │  │ • Available  │  │ • Free Space │  │ • Limits     │     ║
║  │ • Frequency  │  │              │  │              │  │ • Throttling │     ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## User Interaction Flow

```
START
  │
  ├─→ [Browser] Click "Task Routing" Tab
  │     └─→ Load TaskRoutingTab component
  │         ├─ Load device profiles (GET /api/device-profiles)
  │         ├─ Load agent status (GET /api/agent/status)
  │         ├─ Load thermal data (GET /api/thermal/current)
  │         └─ Display "Submit" view by default
  │
  ├─→ [User] Select Project from Dropdown
  │     └─→ Display project details (power, duration, segmentable)
  │
  ├─→ [User] Select Device Profile
  │     └─→ Ready for thermal prediction
  │
  ├─→ [User] Click "🌡️ Predict Thermal Impact"
  │     └─→ TaskRoutingService.getThermalPrediction()
  │         └─→ POST /api/predict/thermal
  │             └─→ Agent calls ThermalPrediction.predict()
  │                 └─→ Returns:
  │                    ├─ peakTempEstimate (°C)
  │                    ├─ recommendation (PROCEED|SEGMENT|WAIT|SKIP)
  │                    ├─ safetyMargin (°C)
  │                    └─ reason (explanation)
  │
  ├─→ [UI] Display Prediction
  │     ├─ "✓ Project is safe to run immediately" (PROCEED)
  │     ├─ "⚠ Project will be segmented into 3 parts" (SEGMENT)
  │     ├─ "⏱ Project should wait for device cooling" (WAIT)
  │     └─ "✗ Project cannot run on this device" (SKIP)
  │
  ├─→ [User] If Safe (PROCEED or SEGMENT):
  │     ├─ Select Urgency Level (Low/Normal/High/Critical)
  │     └─ Click "✓ Submit Task"
  │
  ├─→ [Submit Flow]
  │     └─→ TaskRoutingService.submitProjectAsTask()
  │         └─→ POST /api/tasks/submit-with-prediction
  │             └─→ Agent:
  │                 ├─ Creates task in Bull queue
  │                 ├─ If SEGMENT: creates subtasks with cooling breaks
  │                 ├─ Stores task metadata in database
  │                 ├─ Starts RuntimeAbortMonitor for this task
  │                 └─→ Returns:
  │                    ├─ taskId (unique identifier)
  │                    ├─ decision (PROCEED or SEGMENT)
  │                    └─ scheduledFor (ISO timestamp)
  │
  ├─→ [UI] Switch to "Monitor" View
  │     └─→ Display system status, active tasks, controls
  │
  ├─→ [Polling Loop] Every 5 seconds:
  │     ├─ GET /api/agent/status
  │     ├─ GET /api/tasks/{taskId}
  │     ├─ GET /api/thermal/current
  │     └─→ Update UI with:
  │        ├─ Queue status (pending/active/completed)
  │        ├─ Task progress (%)
  │        ├─ Thermal readings (current/peak/avg)
  │        ├─ Checkpoint number (if segmented)
  │        └─ Estimated end time
  │
  ├─→ [While Task Running]
  │     ├─ Device executes task
  │     ├─ RuntimeAbortMonitor watches temperature
  │     │   ├─ If temp > safeThreshold:
  │     │   │  ├─ Triggers pause automatically
  │     │   │  ├─ Saves checkpoint
  │     │   │  └─ Waits for cooling (if segmented)
  │     │   └─ Temperature normalizes? Resumes execution
  │     └─ Thermal sensor feeds data to agent
  │
  ├─→ [User Can] While Monitoring:
  │     ├─ Click "⏸ Pause" →POST /api/tasks/{taskId}/pause
  │     │  └─ Saves checkpoint, pauses execution
  │     ├─ Click "▶️ Resume" → POST /api/tasks/{taskId}/resume
  │     │  └─ Resumes from checkpoint
  │     └─ Click "⏹ Abort" → POST /api/tasks/{taskId}/abort
  │        └─ Emergency stop (if device overheating)
  │
  ├─→ [Task Completes]
  │     ├─ Progress reaches 100%
  │     ├─ Status changes to "completed"
  │     ├─ Task moved out of active list
  │     └─ Available in /api/tasks/history for review
  │
  └─→ END

Optional [WebSocket Path]:
    If /ws/live implemented:
    ├─ Connect WebSocket at startup
    ├─ Subscribe to channels: task-status, thermal-data
    ├─ Receive real-time updates instead of polling
    └─ Instant UI updates (< 100ms vs 5s polling)
```

---

## Thermal Decision Flow

```
Get Thermal Prediction
    │
    ├─→ Query current device state
    │   ├─ currentTemp (from sensors)
    │   ├─ maxTemp (from profile)
    │   ├─ coolingRate (from profile)
    │   └─ ambientTemp (estimated)
    │
    ├─→ Simulate project execution
    │   ├─ Estimate power consumption
    │   ├─ Project temperature rise
    │   ├─ Calculate peak temperature
    │   └─ Estimate cooling time
    │
    ├─→ Compare peak temp to device limits
    │   │
    │   ├─ If peak < 60°C
    │   │  ├─ Decision: PROCEED ✓
    │   │  ├─ Reason: "Device thermal capacity is excellent"
    │   │  ├─ safetyMargin: (85 - peak) °C
    │   │  └─ segments: null (no segmentation needed)
    │   │
    │   ├─ Else if peak < 75°C
    │   │  ├─ Decision: PROCEED ✓
    │   │  ├─ Reason: "Device has good thermal margin"
    │   │  ├─ safetyMargin: (85 - peak) °C
    │   │  └─ segments: null
    │   │
    │   ├─ Else if peak < 80°C
    │   │  ├─ Decision: SEGMENT ⚠️
    │   │  ├─ Reason: "Task should be segmented to prevent throttling"
    │   │  ├─ safetyMargin: (85 - peak) °C (warning)
    │   │  ├─ Divide task into N segments
    │   │  │  └─ Each segment: duration × (75°C / peak) + cooling break
    │   │  └─ segments: [ { id: 1, duration: t1, cooling: 5min }, ... ]
    │   │
    │   ├─ Else if peak < 85°C
    │   │  ├─ Decision: WAIT ⏱
    │   │  ├─ Reason: "Device too hot, wait for cooling before running"
    │   │  ├─ safetyMargin: negative (unsafe)
    │   │  ├─ estimatedCooldownTime: calculated from coolingRate
    │   │  └─ segments: null (don't run at all right now)
    │   │
    │   └─ Else (peak >= 85°C)
    │      ├─ Decision: SKIP ✗
    │      ├─ Reason: "Device thermal limit exceeded, cannot run"
    │      ├─ safetyMargin: severely negative
    │      └─ segments: null (cannot run)
    │
    └─→ Return recommendation with details
```

---

## State Management Diagram

```
TaskRoutingTab Component State
│
├─ activeView: 'submit' | 'monitor'
│  └─ Controls which view is shown
│
├─ selectedProject: Project object | null
│  └─ Currently selected project (null initially)
│
├─ prediction: PredictionResult | null
│  └─ Thermal prediction result
│      ├─ peakTempEstimate
│      ├─ safetyMargin
│      ├─ recommendation
│      ├─ reason
│      ├─ segments (if SEGMENT)
│      └─ segmentsRecommended
│
├─ submittedTasks: Array<Task>
│  └─ List of submitted tasks
│      ├─ Task 1
│      │  ├─ taskId
│      │  ├─ projectName
│      │  ├─ status (active|paused|completed|failed)
│      │  ├─ progress (0-100)
│      │  ├─ checkpoint
│      │  └─ thermalData
│      └─ Task 2
│
├─ agentStatus: AgentStatus | null
│  └─ Agent backend status
│      ├─ isRunning: boolean
│      ├─ uptime: ms
│      ├─ queue:
│      │  ├─ pending: 3
│      │  ├─ active: 1
│      │  ├─ completed: 45
│      │  ├─ failed: 2
│      │  └─ delayed: 1
│      └─ thermal: { currentTemp, peakTemp, status }
│
├─ thermalData: ThermalReading | null
│  └─ Real-time thermal readings
│      ├─ currentTemp: 42.5
│      ├─ peakTemp: 72.1
│      ├─ avgTemp: 58.2
│      ├─ status: 'safe' | 'elevated' | 'warning'
│      ├─ trend: 'rising' | 'stable' | 'cooling'
│      └─ coolingRate: 2.5 °C/min
│
├─ deviceProfiles: Array<DeviceProfile>
│  └─ List of available device profiles
│      ├─ Profile 1 (iPhone 15 Pro)
│      │  ├─ id
│      │  ├─ name
│      │  ├─ maxTemp: 85
│      │  ├─ coolingRate: 2.8
│      │  └─ ...
│      └─ Profile 2 (iPhone 14 Pro)
│
├─ selectedProfile: string
│  └─ Currently selected device profile ('auto' initially)
│
├─ Loading States:
│  ├─ predictionLoading: boolean
│  ├─ submitting: boolean
│  └─ statusLoading: boolean
│
└─ Feedback States:
   ├─ error: string | null
   └─ success: string | null
```

---

## Data Flow Diagram

```
    User Input                API Call                Agent Processing       Device Output
         │                        │                          │                    │
    Select Project  ────────────→ |                          │                    │
         │                        |                          │                    │
    Set Profile     ────────────→ |                          │                    │
         │                        |                          │                    │
    Click Predict   ────────────→ GET /api/predict/thermal   │                    │
         │                        |                          ├─ Current temp ←─────┤
         │                        |                          ├─ Get profile      │
         │                        |                          ├─ Simulate exec.   │
         │                        |                          ├─ Calculate peak   │
    ← Prediction ───────────────── | ←───────────────────────┤─ Make decision    │
         │                        |                          │                    │
    View Results                  |                          │                    │
         │                        |                          │                    │
    Click Submit    ────────────→ POST /api/tasks/submit-with-prediction         │
         │                        |                          ├─ Create task ─────→├─ Start execution
         │                        |                          ├─ If SEGMENT: ─────→├─ Monitor temp
         │                        |                          │   Create subtasks │
    ← Task Created ───────────────│ ←────────────────────────┤─ Start monitor    │
         │                        |                          │                    │
    Switch to Monitor             |                          │                    │
         │                        |                          │                    │
    [Polling Loop]                |                          │                    │
    Every 5 seconds:              |                          │                    │
         │                        |                          │                    │
         ├─────────────────────→ GET /api/agent/status       │                    │
         │                        |                          ├─ Queue stats ─────→|
         │ ← Queue, Thermal ──────│ ←──────────────────────── |                    │
         │                        |                          │                    │
         ├─────────────────────→ GET /api/tasks/{taskId}     │                    │
         │                        |                          ├─ Task status ─────→├─ Progress
         │ ← Progress, Thermal ───│ ←──────────────────────── |                    │
         │                        |                          │                    │
         └─────────────────────→ GET /api/thermal/current    │                    │
             ← Temp, Status ──────│ ←──────────────────────── ├─ Thermal reading ←─┤
                                  |                          │                    │
    User clicks Control:          |                          │                    │
         │                        |                          │                    │
    [Pause] ────────────────────→ POST /api/tasks/{id}/pause │                    │
                                  |                          ├─ Save checkpoint ─→├─ Pause exec.
         ← Paused ────────────────│ ←──────────────────────── |                    │
                                  |                          │                    │
    [Resume] ───────────────────→ POST /api/tasks/{id}/resume│                    │
                                  |                          ├─ Load checkpoint ──→├─ Resume exec.
         ← Resumed ────────────────│ ←──────────────────────── |                    │
                                  |                          │                    │
    [Abort] ────────────────────→ POST /api/tasks/{id}/abort │                    │
                                  |                          ├─ Emergency stop ──→├─ Stop exec.
         ← Aborted ────────────────│ ←──────────────────────── |                    │
                                  |                          │                    │
```

---

## Component Communication

```
App.jsx
  │
  ├─ Props Down: projects, onUpdate
  │
  └─ TaskRoutingTab
      │
      ├─ Service Layer (TaskRoutingService)
      │   ├─ Constructor (agentUrl)
      │   ├─ Methods:
      │   │  ├─ submitProjectAsTask()
      │   │  ├─ getThermalPrediction()
      │   │  ├─ getTaskStatus()
      │   │  ├─ abortTask() / pauseTask() / resumeTask()
      │   │  ├─ getAgentStatus()
      │   │  ├─ getThermalData()
      │   │  ├─ getDeviceProfiles()
      │   │  └─ createLiveStream()
      │   │
      │   └─ Fetch API Calls
      │       ├─ POST /api/tasks/submit-with-prediction
      │       ├─ POST /api/predict/thermal
      │       ├─ GET /api/tasks/{taskId}
      │       ├─ GET /api/agent/status
      │       ├─ GET /api/thermal/current
      │       ├─ POST /api/tasks/{taskId}/pause
      │       ├─ POST /api/tasks/{taskId}/resume
      │       ├─ POST /api/tasks/{taskId}/abort
      │       ├─ GET /api/device-profiles
      │       ├─ GET /api/tasks/history
      │       └─ WS /ws/live
      │
      └─ State & Render
          ├─ useState hooks (10+ pieces of state)
          ├─ useEffect hooks (2 main effects)
          ├─ Event handlers (3+ handlers)
          └─ Render methods (renderSubmitView, renderMonitorView, helpers)
```

---

## Deployment Architecture

```
Production Deployment
│
├─ Frontend Server (Static Files)
│  ├─ React App (built)
│  ├─ TaskRoutingTab.jsx (compiled)
│  ├─ TaskRoutingTab.css
│  └─ Other tabs/components
│
├─ API Server (Express.js)
│  ├─ Port 3001 (or configured)
│  ├─ 11 endpoints (per TASK_ROUTING_API.md)
│  ├─ Request validation
│  ├─ Error handling
│  └─ CORS enabled
│
├─ Job Queue (Bull + Redis)
│  ├─ Task scheduling
│  ├─ Job state persistence
│  └─ Worker processes
│
├─ Database (SQLite)
│  ├─ Task metadata
│  ├─ Checkpoints
│  ├─ Thermal history
│  ├─ Device profiles
│  └─ Execution history
│
└─ Monitoring & Logging
   ├─ API response times
   ├─ Task execution metrics
   ├─ Thermal alerts
   ├─ Error tracking
   └─ User activity logs
```

---

This visual architecture provides a complete overview of how all components interact to create a functional task routing system.
