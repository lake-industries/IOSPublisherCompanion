import React, { useState, useEffect } from 'react'
import ProjectsTab from '../components/ProjectsTab'
import CodeTab from '../components/CodeTab'
import PreviewTab from '../components/PreviewTab'
import FunctionsTab from '../components/FunctionsTab'

// Built-in interpreter functions
const INTERPRETER_FUNCTIONS = {
  'visual flash': {
    name: 'visual flash',
    description: 'Makes the simulator frame flash',
    execute: (simulatorState, updateSimulator) => {
      updateSimulator({ executionFlash: true })
      setTimeout(() => updateSimulator({ executionFlash: false }), 600)
      return '[visual flash] Simulator flashed'
    }
  },
  'visual flash button project view': {
    name: 'visual flash button project view',
    description: 'Adds a flash button to project cards',
    execute: (simulatorState, updateSimulator) => {
      updateSimulator({ showProjectFlashButtons: true })
      return '[visual flash button project view] Flash buttons added to projects'
    }
  },
  'clear output': {
    name: 'clear output',
    description: 'Clears code output',
    execute: (simulatorState, updateSimulator) => {
      updateSimulator({ codeOutput: '' })
      return '[clear output] Output cleared'
    }
  },
  'set theme dark': {
    name: 'set theme dark',
    description: 'Changes simulator theme to dark',
    execute: (simulatorState, updateSimulator) => {
      updateSimulator({ theme: 'dark' })
      return '[set theme dark] Theme changed to dark'
    }
  },
  'set theme light': {
    name: 'set theme light',
    description: 'Changes simulator theme to light',
    execute: (simulatorState, updateSimulator) => {
      updateSimulator({ theme: 'light' })
      return '[set theme light] Theme changed to light'
    }
  },
}

// Parser to detect functions in code
const parseCodeFunctions = (code) => {
  if (!code) return []
  const found = []
  Object.keys(INTERPRETER_FUNCTIONS).forEach(funcName => {
    if (code.includes(funcName)) {
      found.push(funcName)
    }
  })
  return found
}

export default function SimulatorTab({ projects, onAdd, onDelete, onUpdate, customFunctions, onCustomFunctionsChange }) {
  const [simulatorState, setSimulatorState] = useState({
    selectedProjectId: null,
    activeTab: 'projects',
    isRunning: false,
    codeOutput: '',
    activeProjects: [],
    executionFlash: false,
    testResults: '',
    showProjectFlashButtons: false,
    theme: 'light',
  })
  const [localCustomFunctions, setLocalCustomFunctions] = useState(customFunctions || [])

  const updateSimulator = (updates) => {
    setSimulatorState(prev => ({ ...prev, ...updates }))
  }

  const toggleRunning = () => {
    updateSimulator({ isRunning: !simulatorState.isRunning })
  }

  const selectedProject = projects.find(p => p.id === simulatorState.selectedProjectId)
  const detectedFunctions = selectedProject ? parseCodeFunctions(selectedProject.code || '') : []
  const availableTabs = ['projects', 'code', 'preview', 'functions']

  const runCode = () => {
    if (!selectedProject || !selectedProject.code) return
    const timestamp = new Date().toLocaleTimeString()
    const detectedFunctions = parseCodeFunctions(selectedProject.code)
    let output = `[${timestamp}] Executing code for "${selectedProject.name}"\n`
    
    if (detectedFunctions.length === 0) {
      output += '\nNo recognized functions found.\nAvailable functions:\n'
      Object.keys(INTERPRETER_FUNCTIONS).forEach(fn => {
        output += `  • ${fn}\n`
      })
    } else {
      detectedFunctions.forEach(funcName => {
        const func = INTERPRETER_FUNCTIONS[funcName]
        if (func) {
          const result = func.execute(simulatorState, updateSimulator)
          output += `\n${result}`
        }
      })
    }
    
    updateSimulator({ codeOutput: output, executionFlash: true })
    setTimeout(() => {
      updateSimulator({ executionFlash: false })
    }, 600)
  }

  const runTests = () => {
    if (!selectedProject || !selectedProject.code) return
    const timestamp = new Date().toLocaleTimeString()
    
    const tests = [
      { name: 'Code length > 0', passed: selectedProject.code.length > 0 },
      { name: 'Contains function', passed: selectedProject.code.includes('function') || selectedProject.code.includes('=>') },
      { name: 'Syntax valid', passed: !selectedProject.code.includes('{{') && !selectedProject.code.includes('}}') },
    ]
    
    const testResults = tests.map(t => `${t.passed ? '✓' : '✗'} ${t.name}`)
    const summary = `[${timestamp}] Test Results for "${selectedProject.name}"\n${testResults.join('\n')}\n\nPassed: ${tests.filter(t => t.passed).length}/${tests.length}`
    
    updateSimulator({ testResults: summary, executionFlash: true })
    setTimeout(() => {
      updateSimulator({ executionFlash: false })
    }, 600)
  }

  const toggleProjectActive = (projectId) => {
    const activeProjects = simulatorState.activeProjects || []
    const newActive = activeProjects.includes(projectId)
      ? activeProjects.filter(id => id !== projectId)
      : [...activeProjects, projectId]
    updateSimulator({ activeProjects: newActive })
  }

  const handleFlash = () => {
    updateSimulator({ executionFlash: true })
    setTimeout(() => updateSimulator({ executionFlash: false }), 600)
  }

  const handleUpdateProject = (projectId, updates) => {
    if (onUpdate) {
      onUpdate(projectId, updates)
    }
  }

  return (
    <div className="container">
      <h2>App Simulator</h2>

      {/* Simulator Frame */}
      <div
        style={{
          background: simulatorState.executionFlash ? '#E3F2FD' : '#fff',
          border: simulatorState.executionFlash ? '2px solid #007AFF' : '1px solid #e0e0e0',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: simulatorState.executionFlash ? '0 4px 12px rgba(0,122,255,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          opacity: simulatorState.isRunning ? 1 : 0.6,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Phone Frame Header with Running Status */}
        <div style={{
          background: simulatorState.isRunning ? '#000' : '#ccc',
          color: '#fff',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>9:41</span>
            <span style={{ fontSize: '10px', fontWeight: '700' }}>
              {simulatorState.isRunning ? '● Running' : '○ Stopped'}
            </span>
          </div>
          <span>●●●●●</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {!simulatorState.isRunning ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Simulator Stopped</p>
              <p style={{ fontSize: '12px' }}>Click "Play" button to start testing</p>
            </div>
          ) : (
            <>
              {simulatorState.activeTab === 'projects' && (
                <ProjectsTab
                  projects={projects}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  selectedProjectId={simulatorState.selectedProjectId}
                  onSelectProject={(id) => updateSimulator({ selectedProjectId: id })}
                  isRunning={simulatorState.isRunning}
                  activeProjects={simulatorState.activeProjects}
                  onToggleProjectActive={toggleProjectActive}
                  showProjectFlashButtons={simulatorState.showProjectFlashButtons}
                  onFlash={handleFlash}
                  parseCodeFunctions={parseCodeFunctions}
                />
              )}
              {simulatorState.activeTab === 'code' && (
                <CodeTab
                  selectedProject={selectedProject}
                  isRunning={simulatorState.isRunning}
                  detectedFunctions={detectedFunctions}
                  codeOutput={simulatorState.codeOutput}
                  testResults={simulatorState.testResults}
                  onRunCode={runCode}
                  onRunTests={runTests}
                  parseCodeFunctions={parseCodeFunctions}
                  onUpdateProject={handleUpdateProject}
                />
              )}
              {simulatorState.activeTab === 'preview' && (
                <PreviewTab
                  selectedProject={selectedProject}
                  isRunning={simulatorState.isRunning}
                />
              )}
              {simulatorState.activeTab === 'functions' && (
                <FunctionsTab
                  customFunctions={localCustomFunctions}
                  onCustomFunctionsChange={(updated) => {
                    setLocalCustomFunctions(updated)
                    onCustomFunctionsChange && onCustomFunctionsChange(updated)
                  }}
                  onUpdateSimulator={updateSimulator}
                  isRunning={simulatorState.isRunning}
                />
              )}
            </>
          )}
        </div>

        {/* Simulator Tabs & Controls */}
        <div style={{ borderTop: '1px solid #e0e0e0', background: '#f9f9f9' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', height: '50px' }}>
            {availableTabs.map(tab => (
              <button
                key={tab}
                onClick={() => simulatorState.isRunning && updateSimulator({ activeTab: tab })}
                disabled={!simulatorState.isRunning}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: simulatorState.activeTab === tab ? '2px solid #007AFF' : '2px solid transparent',
                  color: simulatorState.activeTab === tab ? '#007AFF' : '#666',
                  fontWeight: simulatorState.activeTab === tab ? '700' : '500',
                  fontSize: '12px',
                  cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed',
                  opacity: simulatorState.isRunning ? 1 : 0.5,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={toggleRunning}
              style={{
                padding: '12px 20px',
                background: simulatorState.isRunning ? '#FF3B30' : '#34C759',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                borderLeft: '1px solid #e0e0e0',
              }}
            >
              {simulatorState.isRunning ? '⏹ Stop' : '▶ Play'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
        <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
          <strong>Tip:</strong> Use "Load Project" to browse environments and select projects visually from dropdown lists.
        </p>
      </div>
    </div>
  )
}
