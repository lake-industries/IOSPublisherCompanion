# 🌱 Eco Agent - Setup Checklist

## Pre-Installation

- [ ] Node.js 18+ installed
- [ ] ~500MB free disk space
- [ ] (Optional) Redis available or willing to use fallback
- [ ] Read [QUICKSTART.md](QUICKSTART.md) (2 min)

## Installation (5 minutes)

```bash
cd agent/
npm install
```

- [ ] Dependencies installed without errors
- [ ] `node_modules/` created
- [ ] No security vulnerabilities reported

## Configuration (2 minutes)

```bash
cp .env.example .env
```

- [ ] `.env` file created
- [ ] Review settings in `.env`
- [ ] Verify `ALLOWED_TASKS` matches your needs
- [ ] Adjust `OFF_PEAK_HOURS` if desired (default: 2-5 AM)

## Startup & Verification (3 minutes)

```bash
npm start
```

Expected output:

```
🚀 Initializing Eco Agent...
✅ Eco Agent initialized successfully
📋 Registered 7 task processors
🌱 Eco Agent running - ready to accept tasks
```

- [ ] Agent started without errors
- [ ] No "port already in use" errors
- [ ] SQLite database created (`agent.db`)
- [ ] Logs directory created (`logs/`)

## Database Verification (1 minute)

```bash
sqlite3 agent.db
sqlite> .tables
```

Expected: 6 tables

```
configuration  execution_history  feedback  learning_patterns  metrics  tasks
```

- [ ] All 6 tables present
- [ ] Close with: `sqlite> .quit`

## Test First Task (5 minutes)

### Option A: Command Line Test

```javascript
// In Node.js REPL
const { EcoAgent } = require("./agent/index.js");
const agent = new EcoAgent();
await agent.submitTask("database-cleanup", {}, "low");
// Should return: { taskId: '...', status: 'queued', ... }
```

- [ ] Task submitted successfully
- [ ] Received taskId
- [ ] Scheduled time is in future

### Option B: Browser/React Test

```javascript
// In web component
import { AgentClient } from "./agent/client/agentClient.js";
const agent = new AgentClient();
const task = await agent.submitTask("database-cleanup", {}, "low");
console.log(task);
```

- [ ] Task submitted without errors
- [ ] Task visible in SQLite: `SELECT * FROM tasks;`

## Monitoring (Ongoing)

### Real-Time Logs

```bash
npm run logs
```

- [ ] Logs display in real-time
- [ ] Shows timestamps and decision reasons
- [ ] Can see APPROVED/DENIED/DEFERRED decisions

### Database Inspection

```bash
# Check tasks
sqlite3 agent.db "SELECT COUNT(*) as total_tasks FROM tasks;"
sqlite3 agent.db "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1;"

# Check feedback
sqlite3 agent.db "SELECT feedback_type, COUNT(*) as count FROM feedback GROUP BY feedback_type;"

# Check decisions
sqlite3 agent.db "SELECT decision, COUNT(*) as count FROM execution_history GROUP BY decision;"
```

- [ ] Tasks are being recorded
- [ ] Feedback collected when available
- [ ] Decisions logged with reasoning

## Integration with Web App (if needed)

- [ ] Reviewed [INTEGRATION_EXAMPLES.md](INTEGRATION_EXAMPLES.md)
- [ ] Imported `AgentClient` in React components
- [ ] Added UI for submitting tasks
- [ ] Added UI for feedback collection
- [ ] Agent API URL configured correctly

## Security Audit

- [ ] `.env` is NOT in Git (check `.gitignore`)
- [ ] Agent cannot access outside directories
- [ ] Config is read-only to agent process
- [ ] Whitelist is restrictive (only needed tasks)
- [ ] Memory/timeout limits are reasonable
- [ ] Network access is disabled

## Shutdown & Cleanup

### Normal Shutdown

```bash
npm run stop
# Or Ctrl+C in terminal
```

- [ ] Agent gracefully shuts down
- [ ] No errors in logs
- [ ] Database connections closed
- [ ] Temporary files cleaned

### Backup Existing Data (optional)

```bash
cp agent.db agent.db.backup
cp logs/* backup/logs/
```

- [ ] Database backed up
- [ ] Logs archived

## Advanced: Custom Tasks

- [ ] Identified additional whitelisted tasks needed
- [ ] Updated `ALLOWED_TASKS` in `.env`
- [ ] Restarted agent
- [ ] Tested custom task submission

## Advanced: Scheduled Tasks

- [ ] Reviewed `ecoScheduler.js` for scheduling logic
- [ ] Considered adding recurring cleanup tasks
- [ ] Off-peak hours match your needs

## Documentation

- [ ] Read [README.md](README.md) for full details
- [ ] Bookmarked [QUICKSTART.md](QUICKSTART.md) for reference
- [ ] Reviewed [ARCHITECTURE.md](ARCHITECTURE.md) for design
- [ ] Saved [INTEGRATION_EXAMPLES.md](INTEGRATION_EXAMPLES.md) for later

## Monitoring Plan

### Daily

- [ ] Check logs: `npm run logs`
- [ ] Verify agent is running
- [ ] Count pending tasks

### Weekly

```bash
sqlite3 agent.db "SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at > datetime('now', '-7 days');"
```

- [ ] Review completed tasks count
- [ ] Check feedback collected
- [ ] Verify no errors in execution history

### Monthly

```bash
sqlite3 agent.db "VACUUM;"  # Clean up database
```

- [ ] Archive old logs
- [ ] Backup agent.db
- [ ] Review performance metrics

## Troubleshooting Checklist

If agent won't start:

- [ ] `node --version` shows 18+
- [ ] No permission errors on `agent.db`
- [ ] Port 6379 available (if using Redis)
- [ ] Check logs: `npm run logs`
- [ ] Try fallback: Delete `agent.db`, restart (fresh DB)

If tasks not executing:

- [ ] Agent is running: `npm start` still active?
- [ ] Task in whitelist: `grep ALLOWED_TASKS .env`
- [ ] System load low: Check `cpu_usage_percent` in metrics table
- [ ] Logs show decision: `npm run logs`

If database errors:

- [ ] SQLite not corrupted: `sqlite3 agent.db ".tables"`
- [ ] Disk space available: `df -h` (on Unix)
- [ ] No file locks: Close all DB connections

## Performance Baseline

After setup, note these values:

```bash
# Memory usage
wmic OS get TotalVisibleMemorySize, FreePhysicalMemory
# Agent should use <200MB

# CPU when idle
Get-Counter '\Processor(_Total)\% Processor Time'
# Agent should use <1%

# Database size
ls -lh agent.db
# Should be ~1-5 MB after initialization
```

- [ ] Memory baseline: **\_** MB
- [ ] CPU baseline: **\_** %
- [ ] DB size baseline: **\_** MB

## Success Criteria

✅ Agent starts without errors
✅ Tasks can be submitted
✅ Database stores tasks/feedback
✅ Logs show decisions
✅ Off-peak scheduling works
✅ User feedback collected
✅ <200MB memory usage
✅ <1% CPU when idle
✅ Zero network traffic (local)

---

## Next Steps

1. **Week 1:** Monitor baseline, test various tasks
2. **Week 2:** Collect user feedback on task necessity
3. **Week 3:** Review patterns, adjust off-peak hours
4. **Week 4+:** Refine configuration, add custom tasks

---

**✅ Setup Complete!** The eco-friendly autonomous agent is ready to optimize your workloads. 🌱
