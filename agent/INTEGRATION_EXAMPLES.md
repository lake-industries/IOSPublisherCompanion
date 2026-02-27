/\*\*

- Example: Integrating Eco Agent into IOSPublisherCompanion Web App
-
- This shows how to use the agent in your React components
  \*/

// ============================================================================
// 1. COMPONENT EXAMPLE: Tasks with Agent Integration
// ============================================================================

import React, { useState, useEffect } from 'react';
import { AgentClient } from '../agent/client/agentClient.js';

export function DatabaseMaintenancePanel() {
const [agentStatus, setAgentStatus] = useState(null);
const [submitted, setSubmitted] = useState(null);
const [feedback, setFeedback] = useState(null);
const agent = new AgentClient('http://localhost:3001'); // Agent API URL

// Fetch agent status on mount
useEffect(() => {
async function checkAgent() {
try {
const status = await agent.getStatus();
setAgentStatus(status);
} catch (error) {
console.error('Agent not available:', error);
}
}
checkAgent();
}, []);

// Submit maintenance task
const handleSubmitTask = async (taskName, urgency = 'low') => {
try {
const result = await agent.submitTask(
taskName,
{ description: `User-triggered ${taskName}` },
urgency
);
setSubmitted(result);
setFeedback(null); // Reset feedback
} catch (error) {
console.error('Failed to submit task:', error);
}
};

// Record user feedback
const handleFeedback = async (type) => {
if (!submitted) return;

    try {
      const result = await agent.recordFeedback(
        submitted.taskId,
        type,
        'User feedback via web interface'
      );
      setFeedback({ type, success: true });
    } catch (error) {
      console.error('Failed to record feedback:', error);
      setFeedback({ type, success: false });
    }

};

if (!agentStatus) {
return <div>⏳ Connecting to agent...</div>;
}

return (
<div className="maintenance-panel">
<h2>🌱 Eco-Friendly Database Maintenance</h2>

      {/* Agent Status */}
      <div className="agent-status">
        <p>
          <strong>Status:</strong> {agentStatus.isRunning ? '✅ Running' : '❌ Offline'}
        </p>
        <p>
          <strong>Queue:</strong> {agentStatus.queue.pending} pending,{' '}
          {agentStatus.queue.active} active
        </p>
      </div>

      {/* Maintenance Tasks */}
      <div className="maintenance-buttons">
        <button onClick={() => handleSubmitTask('database-cleanup', 'low')}>
          🗑️ Clean Old Data
        </button>
        <button onClick={() => handleSubmitTask('index-optimization', 'low')}>
          ⚡ Optimize Indexes
        </button>
        <button onClick={() => handleSubmitTask('log-rotation', 'low')}>
          📋 Rotate Logs
        </button>
        <button onClick={() => handleSubmitTask('backup-verification', 'high')}>
          ✓ Verify Backups
        </button>
      </div>

      {/* Task Submitted Feedback */}
      {submitted && (
        <div className="task-submitted">
          <p>
            ✅ <strong>Task queued!</strong>
          </p>
          <p>Scheduled for: <code>{new Date(submitted.scheduledFor).toLocaleString()}</code></p>
          <p>Estimated power cost: <code>{submitted.estimatedPowerCost}W</code></p>

          {/* Feedback Options */}
          <div className="feedback-buttons">
            <button onClick={() => handleFeedback('necessary')}>
              👍 This was helpful
            </button>
            <button onClick={() => handleFeedback('avoidable')}>
              👎 Wasn't needed
            </button>
            <button onClick={() => handleFeedback('optimizable')}>
              💡 Could be faster
            </button>
          </div>
        </div>
      )}

      {/* Feedback Confirmation */}
      {feedback && (
        <div className={`feedback-result ${feedback.success ? 'success' : 'error'}`}>
          {feedback.success
            ? `✅ Feedback recorded as "${feedback.type}"`
            : '❌ Failed to record feedback'}
        </div>
      )}
    </div>

);
}

// ============================================================================
// 2. HOOK EXAMPLE: useAgent Custom Hook
// ============================================================================

export function useEcoAgent(agentUrl = 'http://localhost:3001') {
const [status, setStatus] = useState(null);
const [loading, setLoading] = useState(false);
const agent = new AgentClient(agentUrl);

const submitTask = async (taskName, urgency = 'normal') => {
setLoading(true);
try {
const result = await agent.submitTask(taskName, {}, urgency);
setStatus(result);
return result;
} finally {
setLoading(false);
}
};

const recordFeedback = async (taskId, type, notes = '') => {
try {
return await agent.recordFeedback(taskId, type, notes);
} catch (error) {
console.error('Feedback error:', error);
}
};

return { submitTask, recordFeedback, status, loading };
}

// Usage in component:
// const { submitTask, recordFeedback } = useEcoAgent();
// const result = await submitTask('database-cleanup', 'low');
// await recordFeedback(result.taskId, 'necessary');

// ============================================================================
// 3. SETTINGS PAGE EXAMPLE: Agent Configuration UI
// ============================================================================

export function AgentSettingsPanel() {
const [whitelistedTasks, setWhitelistedTasks] = useState([]);

useEffect(() => {
async function loadWhitelist() {
const agent = new AgentClient();
const status = await agent.getStatus();
setWhitelistedTasks(status.whitelistedTasks);
}
loadWhitelist();
}, []);

return (
<div className="agent-settings">
<h3>🔧 Agent Configuration</h3>

      <section>
        <h4>Whitelisted Tasks</h4>
        <ul>
          {whitelistedTasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
        <p className="info">
          ℹ️ To modify: Edit <code>.env</code> and restart agent
        </p>
      </section>

      <section>
        <h4>⚙️ Scheduling</h4>
        <label>
          Off-peak hours: <code>2 AM - 5 AM (weekdays)</code>
        </label>
        <label>
          CPU threshold: <code>60%</code>
        </label>
        <label>
          Memory threshold: <code>70%</code>
        </label>
      </section>

      <section>
        <h4>🔒 Security</h4>
        <ul>
          <li>✅ Task whitelist: Enforced</li>
          <li>✅ Memory limit: 500 MB per task</li>
          <li>✅ Timeout: 1 hour per task</li>
          <li>✅ Network access: Disabled</li>
          <li>✅ Config modification: Disabled</li>
        </ul>
      </section>
    </div>

);
}

// ============================================================================
// 4. TASK HISTORY EXAMPLE: View Past Tasks
// ============================================================================

export function TaskHistoryPanel() {
const [history, setHistory] = useState([]);

useEffect(() => {
async function loadHistory() {
try {
const agent = new AgentClient();
const tasks = await agent.getTaskHistory(20);
setHistory(tasks);
} catch (error) {
console.error('Failed to load history:', error);
}
}
loadHistory();
}, []);

return (
<div className="task-history">
<h3>📊 Task History</h3>
<table>
<thead>
<tr>
<th>Task</th>
<th>Status</th>
<th>Scheduled</th>
<th>Completed</th>
<th>Power Cost</th>
</tr>
</thead>
<tbody>
{history.map((task) => (
<tr key={task.id}>
<td>{task.name}</td>
<td>{task.status}</td>
<td>{new Date(task.scheduled_for).toLocaleString()}</td>
<td>
{task.completed_at
? new Date(task.completed_at).toLocaleString()
: '—'}
</td>
<td>{task.actual_power_cost}W</td>
</tr>
))}
</tbody>
</table>
</div>
);
}

// ============================================================================
// 5. INTEGRATION IN MAIN APP (App.jsx)
// ============================================================================

/\*
import DatabaseMaintenancePanel from './components/agent/DatabaseMaintenancePanel';
import AgentSettingsPanel from './components/agent/AgentSettingsPanel';
import TaskHistoryPanel from './components/agent/TaskHistoryPanel';

export function App() {
return (
<div className="app">
<nav>
<a href="/maintenance">Maintenance</a>
<a href="/settings">Settings</a>
<a href="/history">History</a>
</nav>

      <main>
        {/* Route: /maintenance */}
        <DatabaseMaintenancePanel />

        {/* Route: /settings */}
        <AgentSettingsPanel />

        {/* Route: /history */}
        <TaskHistoryPanel />
      </main>
    </div>

);
}
\*/

// ============================================================================
// 6. STYLE SUGGESTIONS (CSS)
// ============================================================================

const styles = `
.maintenance-panel {
padding: 20px;
background: #f5f5f5;
border-radius: 8px;
}

.agent-status {
background: white;
padding: 15px;
border-radius: 6px;
margin-bottom: 20px;
border-left: 4px solid #4CAF50;
}

.maintenance-buttons {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap: 10px;
margin: 20px 0;
}

.maintenance-buttons button {
padding: 12px;
background: #4CAF50;
color: white;
border: none;
border-radius: 4px;
cursor: pointer;
font-size: 16px;
transition: background 0.2s;
}

.maintenance-buttons button:hover {
background: #45a049;
}

.task-submitted {
background: #e8f5e9;
border: 1px solid #4CAF50;
border-radius: 4px;
padding: 15px;
margin: 20px 0;
}

.feedback-buttons {
display: flex;
gap: 10px;
margin-top: 15px;
}

.feedback-buttons button {
padding: 8px 15px;
background: white;
border: 1px solid #4CAF50;
color: #4CAF50;
border-radius: 4px;
cursor: pointer;
}

.feedback-result {
padding: 10px;
margin-top: 10px;
border-radius: 4px;
}

.feedback-result.success {
background: #c8e6c9;
color: #2e7d32;
}

.feedback-result.error {
background: #ffcdd2;
color: #c62828;
}

.agent-settings section {
background: white;
padding: 15px;
border-radius: 4px;
margin-bottom: 15px;
}

.agent-settings h4 {
margin-top: 0;
color: #333;
}

.task-history table {
width: 100%;
border-collapse: collapse;
}

.task-history th {
background: #4CAF50;
color: white;
padding: 12px;
text-align: left;
}

.task-history td {
padding: 10px;
border-bottom: 1px solid #ddd;
}

.task-history tr:hover {
background: #f5f5f5;
}
`;

// ============================================================================
// 7. TESTING EXAMPLE
// ============================================================================

/\*
// In **tests**/agent.test.js
import { AgentClient } from '../agent/client/agentClient.js';

describe('Eco Agent Integration', () => {
const agent = new AgentClient();

it('should submit a task', async () => {
const result = await agent.submitTask('database-cleanup', {}, 'low');
expect(result.taskId).toBeDefined();
expect(result.scheduledFor).toBeDefined();
});

it('should record feedback', async () => {
const task = await agent.submitTask('database-cleanup', {}, 'low');
const feedback = await agent.recordFeedback(task.taskId, 'necessary');
expect(feedback.status).toBe('recorded');
});

it('should get agent status', async () => {
const status = await agent.getStatus();
expect(status.isRunning).toBe(true);
expect(status.queue).toBeDefined();
});
});
\*/

export default {
DatabaseMaintenancePanel,
useEcoAgent,
AgentSettingsPanel,
TaskHistoryPanel,
};
