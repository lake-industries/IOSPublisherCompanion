import React, { useState, useEffect } from 'react'
import TaskRoutingService from '../utils/taskRoutingService'
import './TaskRoutingTab.css'

/**
 * Task Routing Tab Component
 * 
 * Allows users to:
 * - Submit projects as jobs to the eco-agent
 * - View thermal predictions before execution
 * - Monitor job execution in real-time
 * - Control jobs (pause, resume, abort)
 * - View device thermal status
 */
const TaskRoutingTab = ({ projects = [], onUpdate = () => {} }) => {
  const [service] = useState(() => new TaskRoutingService())
  
  // UI State
  const [activeView, setActiveView] = useState('submit') // 'submit' | 'monitor' | 'history'
  const [selectedProject, setSelectedProject] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [submittedTasks, setSubmittedTasks] = useState([])
  const [agentStatus, setAgentStatus] = useState(null)
  const [thermalData, setThermalData] = useState(null)
  const [deviceProfiles, setDeviceProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState('auto')
  
  // Loading states
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  
  // Error handling
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Load device profiles and status on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setStatusLoading(true)
        const [profiles, status, thermal] = await Promise.all([
          service.getDeviceProfiles(),
          service.getAgentStatus(),
          service.getThermalData()
        ])
        setDeviceProfiles(profiles)
        setAgentStatus(status)
        setThermalData(thermal)
        setStatusLoading(false)
      } catch (err) {
        setError(`Failed to load initial data: ${err.message}`)
        setStatusLoading(false)
      }
    }
    loadInitialData()
  }, [service])

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [status, thermal, history] = await Promise.all([
          service.getAgentStatus(),
          service.getThermalData(),
          service.getTaskHistory({ limit: 10 })
        ])
        setAgentStatus(status)
        setThermalData(thermal)
        
        // Update submitted tasks with latest status
        const updatedTasks = await Promise.all(
          submittedTasks.map(async (task) => {
            const taskStatus = await service.getTaskStatus(task.taskId)
            return { ...task, ...taskStatus }
          })
        )
        setSubmittedTasks(updatedTasks)
      } catch (err) {
        console.error('Failed to update status:', err)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [service, submittedTasks])

  /**
   * Get thermal prediction for selected project
   */
  const handlePredictThermal = async () => {
    if (!selectedProject) {
      setError('Please select a project first')
      return
    }

    try {
      setPredictionLoading(true)
      setError(null)
      
      const pred = await service.getThermalPrediction(selectedProject, selectedProfile)
      setPrediction(pred)
      
      if (pred.recommendation === 'PROCEED') {
        setSuccess('✓ Project is safe to run immediately')
      } else if (pred.recommendation === 'SEGMENT') {
        setSuccess(`⚠ Project will be segmented into ${pred.segmentsRecommended} parts`)
      } else if (pred.recommendation === 'WAIT') {
        setSuccess('⏱ Project should wait for device cooling')
      } else {
        setSuccess('✗ Project cannot run on this device')
      }
      
      setPredictionLoading(false)
    } catch (err) {
      setError(`Thermal prediction failed: ${err.message}`)
      setPredictionLoading(false)
    }
  }

  /**
   * Submit selected project as a task
   */
  const handleSubmitTask = async () => {
    if (!selectedProject) {
      setError('Please select a project first')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      const result = await service.submitProjectAsTask(selectedProject, {
        urgency: document.getElementById('urgency')?.value || 'normal',
        deviceProfile: selectedProfile,
        autoSegment: true
      })
      
      setSubmittedTasks([...submittedTasks, result])
      setSuccess(`✓ Task submitted! ID: ${result.taskId}`)
      setActiveView('monitor')
      setSubmitting(false)
    } catch (err) {
      setError(`Task submission failed: ${err.message}`)
      setSubmitting(false)
    }
  }

  /**
   * Handle task control actions
   */
  const handleTaskControl = async (taskId, action) => {
    try {
      setError(null)
      
      let result
      if (action === 'pause') {
        result = await service.pauseTask(taskId)
        setSuccess(`✓ Task paused (checkpoint saved)`)
      } else if (action === 'resume') {
        result = await service.resumeTask(taskId)
        setSuccess(`✓ Task resumed from checkpoint`)
      } else if (action === 'abort') {
        result = await service.abortTask(taskId)
        setSuccess(`✓ Task aborted`)
      }
      
      // Refresh task list
      const updated = submittedTasks.map(t => t.taskId === taskId ? result : t)
      setSubmittedTasks(updated)
    } catch (err) {
      setError(`Task control failed: ${err.message}`)
    }
  }

  /**
   * Render submission form
   */
  const renderSubmitView = () => (
    <div className="task-submit-container">
      <h2>🚀 Submit Project as Task</h2>
      
      {/* Project Selection */}
      <div className="form-group">
        <label>Select Project</label>
        <select 
          value={selectedProject?.id || ''} 
          onChange={(e) => {
            const proj = projects.find(p => p.id === e.target.value)
            setSelectedProject(proj)
            setPrediction(null)
          }}
        >
          <option value="">-- Choose a project --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name || 'Untitled'}
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Project Details */}
          <div className="project-details">
            <div className="detail-row">
              <span>Power Estimate:</span>
              <strong>{selectedProject.estimatedPowerWatts || 100}W</strong>
            </div>
            <div className="detail-row">
              <span>Duration Estimate:</span>
              <strong>
                {selectedProject.estimatedDurationSeconds 
                  ? `${Math.round(selectedProject.estimatedDurationSeconds / 60)} min`
                  : '~1 hour'
                }
              </strong>
            </div>
            <div className="detail-row">
              <span>Segmentable:</span>
              <strong>{selectedProject.segmentable !== false ? '✓ Yes' : '✗ No'}</strong>
            </div>
          </div>

          {/* Device Profile Selection */}
          <div className="form-group">
            <label>Device Profile</label>
            <select 
              value={selectedProfile} 
              onChange={(e) => {
                setSelectedProfile(e.target.value)
                setPrediction(null)
              }}
            >
              <option value="auto">Auto-detect</option>
              {deviceProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Thermal Prediction */}
          <div className="section thermal-prediction">
            <h3>Thermal Analysis</h3>
            
            {!prediction ? (
              <button 
                onClick={handlePredictThermal} 
                disabled={predictionLoading}
                className="btn btn-predict"
              >
                {predictionLoading ? 'Analyzing...' : '🌡️ Predict Thermal Impact'}
              </button>
            ) : (
              <div className="prediction-result">
                <div className="metric">
                  <span>Peak Temperature:</span>
                  <strong className={`temp ${getTempClass(prediction.peakTempEstimate)}`}>
                    {prediction.peakTempEstimate.toFixed(1)}°C
                  </strong>
                </div>
                <div className="metric">
                  <span>Safety Margin:</span>
                  <strong className={`margin ${prediction.safetyMargin < 0 ? 'danger' : 'safe'}`}>
                    {prediction.safetyMargin.toFixed(1)}°C
                  </strong>
                </div>
                <div className="metric">
                  <span>Recommendation:</span>
                  <strong className={`recommendation ${getRecommendationClass(prediction.recommendation)}`}>
                    {prediction.recommendation}
                  </strong>
                </div>
                
                {prediction.recommendation === 'SEGMENT' && (
                  <div className="segmentation-info">
                    <p>📋 This task will be split into {prediction.segmentsRecommended} segments</p>
                    <ul>
                      {prediction.segments?.map((seg, i) => (
                        <li key={i}>Segment {seg.segmentId}: {Math.round(seg.durationSeconds / 60)} min + 5 min cooling</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="reason">{prediction.reason}</p>
                
                <button 
                  onClick={() => setPrediction(null)}
                  className="btn btn-secondary"
                >
                  Re-analyze
                </button>
              </div>
            )}
          </div>

          {/* Urgency Selection */}
          {prediction && (
            <div className="form-group">
              <label>Urgency Level</label>
              <select id="urgency">
                <option value="low">Low (off-peak preferred)</option>
                <option value="normal">Normal (balanced)</option>
                <option value="high">High (sooner if possible)</option>
                <option value="critical">Critical (ASAP)</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          {prediction && (
            <button 
              onClick={handleSubmitTask} 
              disabled={submitting}
              className={`btn btn-submit btn-${prediction.recommendation.toLowerCase()}`}
            >
              {submitting ? 'Submitting...' : '✓ Submit Task'}
            </button>
          )}
        </>
      )}
    </div>
  )

  /**
   * Render monitoring view
   */
  const renderMonitorView = () => (
    <div className="task-monitor-container">
      <h2>📊 Job Monitoring</h2>
      
      {/* System Status */}
      <div className="system-status">
        <div className="status-card">
          <h4>Agent Status</h4>
          {agentStatus ? (
            <>
              <div className="status-indicator" style={{
                color: agentStatus.isRunning ? 'green' : 'red'
              }}>
                {agentStatus.isRunning ? '● Running' : '● Offline'}
              </div>
              <div className="queue-stats">
                <span>Pending: {agentStatus.queue?.pending || 0}</span>
                <span>Active: {agentStatus.queue?.active || 0}</span>
                <span>Completed: {agentStatus.queue?.completed || 0}</span>
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="status-card thermal">
          <h4>Thermal Status</h4>
          {thermalData ? (
            <>
              <div className="temperature">
                <span>Current:</span>
                <strong className={getTempClass(thermalData.currentTemp)}>
                  {thermalData.currentTemp.toFixed(1)}°C
                </strong>
              </div>
              <div className="status-bar">
                <div 
                  className={`bar-fill ${getTempClass(thermalData.currentTemp)}`}
                  style={{width: `${(thermalData.currentTemp / 100) * 100}%`}}
                ></div>
              </div>
              <div className="thermal-details">
                <span>Peak: {thermalData.peakTemp?.toFixed(1)}°C</span>
                <span>Status: {thermalData.status}</span>
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      {/* Active Tasks */}
      <div className="active-tasks">
        <h3>Active Tasks</h3>
        {submittedTasks.length === 0 ? (
          <p className="empty">No tasks submitted yet</p>
        ) : (
          <div className="task-list">
            {submittedTasks.map(task => (
              <div key={task.taskId} className={`task-item status-${task.status}`}>
                <div className="task-header">
                  <strong>{task.projectName}</strong>
                  <span className="task-id">ID: {task.taskId.substring(0, 8)}...</span>
                </div>
                
                <div className="task-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{width: `${task.progress || 0}%`}}
                    ></div>
                  </div>
                  <span className="progress-text">{task.progress || 0}%</span>
                </div>

                <div className="task-details">
                  <span>Status: <strong>{task.status}</strong></span>
                  {task.thermalData && (
                    <span>Temp: <strong className={getTempClass(task.thermalData.currentTemp)}>
                      {task.thermalData.currentTemp.toFixed(1)}°C
                    </strong></span>
                  )}
                  {task.checkpoint && (
                    <span>Checkpoint: <strong>#{task.checkpoint.number}</strong></span>
                  )}
                </div>

                <div className="task-controls">
                  {task.status === 'active' && (
                    <>
                      <button 
                        onClick={() => handleTaskControl(task.taskId, 'pause')}
                        className="btn btn-sm btn-pause"
                      >
                        ⏸ Pause
                      </button>
                      <button 
                        onClick={() => handleTaskControl(task.taskId, 'abort')}
                        className="btn btn-sm btn-abort"
                      >
                        ⏹ Abort
                      </button>
                    </>
                  )}
                  {task.status === 'paused' && (
                    <button 
                      onClick={() => handleTaskControl(task.taskId, 'resume')}
                      className="btn btn-sm btn-resume"
                    >
                      ▶️ Resume
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  /**
   * Helper functions
   */
  const getTempClass = (temp) => {
    if (temp < 40) return 'optimal'
    if (temp < 60) return 'safe'
    if (temp < 75) return 'elevated'
    if (temp < 85) return 'warning'
    return 'critical'
  }

  const getRecommendationClass = (rec) => {
    switch(rec) {
      case 'PROCEED': return 'proceed'
      case 'SEGMENT': return 'segment'
      case 'WAIT': return 'wait'
      case 'SKIP': return 'skip'
      default: return ''
    }
  }

  // Main render
  return (
    <div className="task-routing-tab">
      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="close">✕</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)} className="close">✕</button>
        </div>
      )}

      {/* Navigation */}
      <div className="view-tabs">
        <button 
          className={`tab ${activeView === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveView('submit')}
        >
          🚀 Submit Job
        </button>
        <button 
          className={`tab ${activeView === 'monitor' ? 'active' : ''}`}
          onClick={() => setActiveView('monitor')}
        >
          📊 Monitor ({submittedTasks.length})
        </button>
      </div>

      {/* Content */}
      <div className="view-content">
        {statusLoading && activeView === 'submit' ? (
          <p className="loading">Loading device profiles...</p>
        ) : activeView === 'submit' ? (
          renderSubmitView()
        ) : (
          renderMonitorView()
        )}
      </div>
    </div>
  )
}

export default TaskRoutingTab
