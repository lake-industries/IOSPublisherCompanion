import React, { useState } from 'react'
import { generateUUID } from '../utils/uuid'
import { StorageManager } from '../utils/storage'

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
  const [expandedFunctionId, setExpandedFunctionId] = useState(null)
  const [audioContext, setAudioContext] = useState(null)
  const [showFunctionBuilder, setShowFunctionBuilder] = useState(false)
  const [showProjectLoader, setShowProjectLoader] = useState(false)
  const [projectLoaderAddress, setProjectLoaderAddress] = useState('')
  const [projectLoaderEnv, setProjectLoaderEnv] = useState('')
  const [projectLoaderName, setProjectLoaderName] = useState('')
  const [loaderMessage, setLoaderMessage] = useState('')
  const [newFunctionForm, setNewFunctionForm] = useState({ name: '', description: '', code: '', language: 'javascript', routeTo: 'local', codeType: 'optional' })
  const [localCustomFunctions, setLocalCustomFunctions] = useState(customFunctions || [])

  const updateSimulator = (updates) => {
    setSimulatorState(prev => ({ ...prev, ...updates }))
  }

  const toggleRunning = () => {
    updateSimulator({ isRunning: !simulatorState.isRunning })
  }

  const selectedProject = projects.find(p => p.id === simulatorState.selectedProjectId)
  const detectedFunctions = selectedProject ? parseCodeFunctions(selectedProject.code || '') : []
  const hasExecutableCode = detectedFunctions.length > 0
  const hasPianoProject = projects.some(p => p.projectType === 'piano')
  const availableTabs = ['projects', 'code', 'preview', 'functions'].concat(hasPianoProject ? ['piano'] : [])

  // Load project from address or fields
  const loadProjectFromAddress = async (address) => {
    try {
      // Parse address format: "environment.projectname" or use separate fields
      let envName, projName
      
      if (address && address.includes('.')) {
        [envName, projName] = address.split('.', 2)
      } else {
        envName = projectLoaderEnv || StorageManager.getCurrentEnvironment()
        projName = projectLoaderName || address
      }

      if (!envName || !projName) {
        setLoaderMessage('⚠ Provide environment and project name')
        setTimeout(() => setLoaderMessage(''), 3000)
        return
      }

      // Load data from specified environment
      const originalEnv = StorageManager.getCurrentEnvironment()
      StorageManager.setCurrentEnvironment(envName)
      const envData = await StorageManager.load()
      StorageManager.setCurrentEnvironment(originalEnv)

      if (!envData || !envData.projects) {
        setLoaderMessage(`✗ Environment "${envName}" not found or empty`)
        setTimeout(() => setLoaderMessage(''), 3000)
        return
      }

      // Find project in that environment
      const foundProject = envData.projects.find(p => p.name.toLowerCase() === projName.toLowerCase())
      
      if (!foundProject) {
        setLoaderMessage(`✗ Project "${projName}" not found in "${envName}"`)
        setTimeout(() => setLoaderMessage(''), 3000)
        return
      }

      // Add project to current environment
      const newProject = { ...foundProject, id: generateUUID(), loadedFrom: `${envName}.${projName}` }
      onAdd && onAdd(newProject)
      
      setLoaderMessage(`✓ Loaded "${projName}" from "${envName}"`)
      setProjectLoaderAddress('')
      setProjectLoaderEnv('')
      setProjectLoaderName('')
      setShowProjectLoader(false)
      setTimeout(() => setLoaderMessage(''), 3000)
    } catch (error) {
      setLoaderMessage(`✗ Error: ${error.message}`)
      setTimeout(() => setLoaderMessage(''), 3000)
    }
  }

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

  const createCustomFunction = () => {
    if (!newFunctionForm.name || !newFunctionForm.description) {
      alert('Name and description are required')
      return
    }
    
    const customFunc = {
      id: generateUUID(),
      name: newFunctionForm.name,
      description: newFunctionForm.description,
      code: newFunctionForm.code,
      codeType: newFunctionForm.codeType,
      language: newFunctionForm.language,
      routeTo: newFunctionForm.routeTo,
      createdAt: new Date().toISOString(),
      status: 'draft'
    }
    
    const updated = [...localCustomFunctions, customFunc]
    setLocalCustomFunctions(updated)
    onCustomFunctionsChange && onCustomFunctionsChange(updated)
    setNewFunctionForm({ name: '', description: '', code: '', language: 'javascript', routeTo: 'local', codeType: 'optional' })
    setShowFunctionBuilder(false)
  }

  const submitFunction = async (funcId, routeTo) => {
    const func = localCustomFunctions.find(f => f.id === funcId)
    if (!func) return
    
    const generateCodeTemplate = (name, description, language, code) => {
      const templates = {
        javascript: `/**\n * Function: ${name}\n * Description: ${description}\n */\nexport function ${name.replace(/\s+/g, '')}() {\n  // Implementation\n  ${code || '// TODO: implement'}\n}`,
        python: `"""\nFunction: ${name}\nDescription: ${description}\n"""\ndef ${name.replace(/\s+/g, '_').lower()}():\n    # Implementation\n    ${code || '# TODO: implement'}\n    pass`,
        swift: `/**\n Function: ${name}\n Description: ${description}\n */\nfunc ${name.replace(/\s+/g, '')}() {\n    // Implementation\n    ${code || '// TODO: implement'}\n}`,
        kotlin: `/**\n * Function: ${name}\n * Description: ${description}\n */\nfun ${name.replace(/\s+/g, '')}() {\n    // Implementation\n    ${code || '// TODO: implement'}\n}`,
        typescript: `/**\n * Function: ${name}\n * Description: ${description}\n */\nexport function ${name.replace(/\s+/g, '')}(): void {\n  // Implementation\n  ${code || '// TODO: implement'}\n}`
      }
      return templates[language] || templates.javascript
    }
    
    const endpoints = {
      'local': () => {
        const generatedCode = generateCodeTemplate(func.name, func.description, func.language, func.code)
        updateCustomFunction(funcId, { status: 'active' })
        const fileExtension = { javascript: 'js', python: 'py', swift: 'swift', kotlin: 'kt', typescript: 'ts' }[func.language] || 'js'
        updateSimulator({ codeOutput: `[local] Function "${func.name}" activated locally\n\nGenerated ${func.language} file:\n\n${generatedCode}\n\n[Download as .${fileExtension} file to integrate]` })
      },
      'user': () => {
        updateSimulator({ codeOutput: `[user endpoint] Submitting "${func.name}" to user endpoint...\nThis would route to: /api/user/functions\nPayload: ${JSON.stringify(func, null, 2)}` })
      },
      'client': () => {
        updateSimulator({ codeOutput: `[client endpoint] Submitting "${func.name}" to client endpoint...\nThis would route to: /api/client/functions\nPayload: ${JSON.stringify(func, null, 2)}` })
      },
      'gha': () => {
        updateSimulator({ codeOutput: `[GitHub Actions] Creating workflow for "${func.name}"...\nThis would create a GHA workflow to validate and integrate the function.` })
      },
      'claude': () => {
        updateSimulator({ codeOutput: `[Claude AI] Submitting "${func.name}" for AI analysis...\nClaude would analyze:\n- Code quality\n- Error handling\n- Performance\n- Security considerations` })
      }
    }
    
    const handler = endpoints[routeTo]
    if (handler) handler()
  }

  const updateCustomFunction = (funcId, updates) => {
    const updated = localCustomFunctions.map(f =>
      f.id === funcId ? { ...f, ...updates } : f
    )
    setLocalCustomFunctions(updated)
    onCustomFunctionsChange && onCustomFunctionsChange(updated)
  }

  const deleteCustomFunction = (funcId) => {
    const updated = localCustomFunctions.filter(f => f.id !== funcId)
    setLocalCustomFunctions(updated)
    onCustomFunctionsChange && onCustomFunctionsChange(updated)
  }

  const playNote = (frequency, duration = 0.2) => {
    if (!audioContext) return
    const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)()
    if (!audioContext) setAudioContext(ctx)
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = frequency
    osc.type = 'triangle'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  }

  const initAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      setAudioContext(ctx)
    }
  }

  const renderPianoTab = () => {
    const notes = [
      { name: 'C', freq: 261.63, key: 'C' },
      { name: 'D', freq: 293.66, key: 'D' },
      { name: 'E', freq: 329.63, key: 'E' },
      { name: 'F', freq: 349.23, key: 'F' },
      { name: 'G', freq: 392.00, key: 'G' },
      { name: 'A', freq: 440.00, key: 'A' },
      { name: 'B', freq: 493.88, key: 'B' },
    ]

    return (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Piano Synth</h3>
        <button
          onClick={initAudioContext}
          disabled={!simulatorState.isRunning}
          style={{
            padding: '8px 12px',
            background: simulatorState.isRunning ? '#34C759' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed',
            marginBottom: '12px',
            opacity: simulatorState.isRunning ? 1 : 0.5,
          }}
        >
          🎵 Enable Audio
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', opacity: simulatorState.isRunning ? 1 : 0.4, pointerEvents: simulatorState.isRunning ? 'auto' : 'none' }}>
          {notes.map(note => (
            <button
              key={note.key}
              onMouseDown={() => playNote(note.freq)}
              style={{
                padding: '20px 8px',
                background: '#fff',
                border: '2px solid #007AFF',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.1s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#007AFF'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = '#000'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {note.name}
              <br />
              <span style={{ fontSize: '10px' }}>{note.key}</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: '10px', color: '#666', marginTop: '12px' }}>
          Click keys to play notes or use keyboard: C, D, E, F, G, A, B
        </p>
      </div>
    )
  }

  const renderProjectsTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Projects</h3>
        <button
          onClick={() => setShowProjectLoader(!showProjectLoader)}
          style={{
            padding: '6px 12px',
            background: '#007AFF',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {showProjectLoader ? '✕ Cancel' : '📂 Load Project'}
        </button>
      </div>

      {showProjectLoader && (
        <div style={{ background: '#E8F5E9', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#2E7D32', marginBottom: '10px' }}>Load Project from Storage</p>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              📍 Address (format: <code>environment.projectname</code>)
            </label>
            <input
              type="text"
              placeholder="e.g., Mobile.MyApp or default.Piano"
              value={projectLoaderAddress}
              onChange={(e) => setProjectLoaderAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadProjectFromAddress(projectLoaderAddress)}
              style={{ width: '100%', padding: '6px', fontSize: '10px', border: '1px solid #4CAF50', borderRadius: '4px', boxSizing: 'border-box', fontFamily: "'Courier New', monospace" }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Environment</label>
              <input
                type="text"
                placeholder="e.g., Mobile, default, VST"
                value={projectLoaderEnv}
                onChange={(e) => setProjectLoaderEnv(e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Project Name</label>
              <input
                type="text"
                placeholder="e.g., MyApp, Piano"
                value={projectLoaderName}
                onChange={(e) => setProjectLoaderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadProjectFromAddress('')}
                style={{ width: '100%', padding: '6px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => loadProjectFromAddress(projectLoaderAddress)}
              style={{
                flex: 1,
                padding: '6px',
                background: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Load from Address
            </button>
            <button
              onClick={() => loadProjectFromAddress('')}
              style={{
                flex: 1,
                padding: '6px',
                background: '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Load from Fields
            </button>
          </div>

          {loaderMessage && (
            <div style={{
              marginTop: '8px',
              padding: '6px 8px',
              background: loaderMessage.startsWith('✓') ? '#C8E6C9' : '#FFCCCC',
              color: loaderMessage.startsWith('✓') ? '#1B5E20' : '#C62828',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '600',
            }}>
              {loaderMessage}
            </div>
          )}

          {selectedProject?.loadedFrom && (
            <p style={{ fontSize: '9px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
              💡 Tip: Projects loaded from other environments are copied to current environment
            </p>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <p>No projects yet</p>
          <p style={{ fontSize: '11px', marginTop: '8px' }}>Click "Load Project" to import from another environment</p>
        </div>
      ) : (
        <div>
          {projects.map(p => {
            const projectFunctions = parseCodeFunctions(p.code || '')
            const isPiano = p.projectType === 'piano'
            return (
              <div
                key={p.id}
                style={{
                  background: '#f9f9f9',
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  borderLeft: (simulatorState.activeProjects || []).includes(p.id) ? '4px solid #34C759' : '4px solid #007AFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: simulatorState.isRunning ? 1 : 0.7,
                  pointerEvents: simulatorState.isRunning ? 'auto' : 'none',
                }}
              >
                <div style={{ flex: 1, cursor: simulatorState.isRunning ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={(simulatorState.activeProjects || []).includes(p.id)}
                    onChange={() => simulatorState.isRunning && toggleProjectActive(p.id)}
                    disabled={!simulatorState.isRunning}
                    style={{ cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed' }}
                  />
                  <div onClick={() => simulatorState.isRunning && updateSimulator({ selectedProjectId: p.id })}>
                    <p style={{ fontWeight: '600', marginBottom: '2px' }}>{p.name}</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {isPiano ? '🎹 Interactive Piano' : (p.bundleId || 'No bundle ID')}
                    </p>
                    {p.loadedFrom && (
                      <p style={{ fontSize: '10px', color: '#8B5CF6', marginTop: '2px' }}>
                        📂 From: {p.loadedFrom}
                      </p>
                    )}
                    {projectFunctions.length > 0 && (
                      <p style={{ fontSize: '10px', color: '#007AFF', marginTop: '2px' }}>
                        🔧 {projectFunctions.length} function{projectFunctions.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {simulatorState.showProjectFlashButtons && projectFunctions.length > 0 && (
                    <button
                      onClick={() => {
                        updateSimulator({ executionFlash: true })
                        setTimeout(() => updateSimulator({ executionFlash: false }), 600)
                      }}
                      disabled={!simulatorState.isRunning}
                      style={{
                        padding: '4px 8px',
                        background: '#FF9500',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed',
                        opacity: simulatorState.isRunning ? 1 : 0.5,
                      }}
                    >
                      ⚡ Flash
                    </button>
                  )}
                  <button
                    onClick={() => simulatorState.isRunning && onDelete(p.id)}
                    disabled={!simulatorState.isRunning}
                    style={{
                      padding: '4px 8px',
                      background: '#FF3B30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed',
                      opacity: simulatorState.isRunning ? 1 : 0.5,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderCodeTab = () => {
   // if (selectedProject?.projectType === 'piano') {
   //   return renderPianoTab()
   // }

    return (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Code Editor</h3>
        {selectedProject ? (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {hasExecutableCode ? (
                <>
                  <button
                    onClick={runCode}
                    disabled={!simulatorState.isRunning}
                    style={{
                      padding: '6px 12px',
                      background: simulatorState.isRunning ? '#007AFF' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: simulatorState.isRunning ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ▶ Run Code ({detectedFunctions.length} function{detectedFunctions.length !== 1 ? 's' : ''})
                  </button>
                  <span style={{ fontSize: '10px', color: '#34C759', fontWeight: '600' }}>✓ Executable</span>
                </>
              ) : (
                <span style={{ fontSize: '11px', color: '#999', padding: '6px 0' }}>
                  No recognized functions. Try adding function calls below.
                </span>
              )}
              <span style={{ fontSize: '11px', color: '#999', padding: '6px 0', marginLeft: 'auto' }}>
                {selectedProject.name}
              </span>
            </div>
            
            <div style={{ marginBottom: '8px', padding: '8px', background: '#f0f8ff', borderRadius: '4px', fontSize: '10px', color: '#0066cc', maxHeight: '80px', overflowY: 'auto' }}>
              <strong>Available Functions:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                {Object.entries(INTERPRETER_FUNCTIONS).map(([name, func]) => (
                  <li key={name}><code style={{ fontSize: '9px' }}>{name}</code> - {func.description}</li>
                ))}
              </ul>
            </div>
            
            <textarea
              value={selectedProject.code}
              readOnly
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                fontSize: '11px',
                fontFamily: "'Courier New', monospace",
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {simulatorState.codeOutput && (
                <div style={{
                  flex: 1,
                  background: '#f0f0f0',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '10px',
                  fontFamily: "'Courier New', monospace",
                  maxHeight: '100px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {simulatorState.codeOutput}
                </div>
              )}
              {simulatorState.testResults && (
                <div style={{
                  flex: 1,
                  background: '#f0f0f0',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '10px',
                  fontFamily: "'Courier New', monospace",
                  maxHeight: '100px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {simulatorState.testResults}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            <p>No project selected</p>
          </div>
        )}
      </div>
    )
  }

  const renderPreviewTab = () => (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Preview</h3>
      {selectedProject ? (
        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Name</label>
            <p>{selectedProject.name}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Bundle ID</label>
            <p style={{ fontSize: '12px' }}>{selectedProject.bundleId}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Type</label>
            <p style={{ fontSize: '12px' }}>{selectedProject.projectType || 'Standard App'}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Version</label>
            <p style={{ fontSize: '12px' }}>{selectedProject.version}</p>
          </div>
          {selectedProject.loadedFrom && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Loaded From</label>
              <p style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: '600' }}>{selectedProject.loadedFrom}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <p>No project selected</p>
        </div>
      )}
    </div>
  )

  const renderFunctionsTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Function Builder</h3>
        <button
          onClick={() => setShowFunctionBuilder(!showFunctionBuilder)}
          style={{
            padding: '6px 12px',
            background: '#34C759',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {showFunctionBuilder ? '✕ Cancel' : '+ New Function'}
        </button>
      </div>

      {showFunctionBuilder && (
        <div style={{ background: '#f0f8ff', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #0066cc' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Function Name *</label>
            <input
              type="text"
              placeholder="e.g., toggle dark mode"
              value={newFunctionForm.name}
              onChange={(e) => setNewFunctionForm({ ...newFunctionForm, name: e.target.value })}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Description *</label>
            <input
              type="text"
              placeholder="What does this function do?"
              value={newFunctionForm.description}
              onChange={(e) => setNewFunctionForm({ ...newFunctionForm, description: e.target.value })}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Code</label>
            <div style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="codeType"
                  value="blank"
                  checked={newFunctionForm.codeType === 'blank'}
                  onChange={() => setNewFunctionForm({ ...newFunctionForm, codeType: 'blank', code: '' })}
                />
                Blank
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="codeType"
                  value="optional"
                  checked={newFunctionForm.codeType === 'optional'}
                  onChange={() => setNewFunctionForm({ ...newFunctionForm, codeType: 'optional' })}
                />
                Optional
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="codeType"
                  value="any"
                  checked={newFunctionForm.codeType === 'any'}
                  onChange={() => setNewFunctionForm({ ...newFunctionForm, codeType: 'any' })}
                />
                Any
              </label>
            </div>
            {newFunctionForm.codeType !== 'blank' && (
              <textarea
                placeholder={newFunctionForm.codeType === 'optional' ? 'Optional: add implementation code' : 'Implementation code for this function'}
                value={newFunctionForm.code}
                onChange={(e) => setNewFunctionForm({ ...newFunctionForm, code: e.target.value })}
                style={{ width: '100%', minHeight: '80px', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontFamily: "'Courier New', monospace" }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Language</label>
              <select
                value={newFunctionForm.language}
                onChange={(e) => setNewFunctionForm({ ...newFunctionForm, language: e.target.value })}
                style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="swift">Swift</option>
                <option value="kotlin">Kotlin</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Route To</label>
              <select
                value={newFunctionForm.routeTo}
                onChange={(e) => setNewFunctionForm({ ...newFunctionForm, routeTo: e.target.value })}
                style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="local">Local</option>
                <option value="user">User Endpoint</option>
                <option value="client">Client Endpoint</option>
                <option value="gha">GitHub Actions</option>
                <option value="claude">Claude AI</option>
              </select>
            </div>
          </div>
          <button
            onClick={createCustomFunction}
            style={{
              width: '100%',
              padding: '8px',
              background: '#007AFF',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Create Function
          </button>
        </div>
      )}

      <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', marginTop: '16px' }}>Custom Functions ({(localCustomFunctions || []).length})</h4>
      {(localCustomFunctions || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
          <p>No custom functions yet</p>
          <p style={{ fontSize: '11px', marginTop: '8px' }}>Create one to extend your simulator capabilities</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(localCustomFunctions || []).map(func => (
            <div key={func.id}>
              <div 
                onClick={() => setExpandedFunctionId(expandedFunctionId === func.id ? null : func.id)}
                style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px', fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', margin: '0 0 2px 0' }}>
                      {expandedFunctionId === func.id ? '▼' : '▶'} {func.name}
                    </p>
                    <p style={{ color: '#666', margin: '0 0 4px 0' }}>{func.description}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px' }}>
                      <span style={{ color: '#999' }}>{func.language} • {func.codeType || 'optional'}</span>
                      <select
                        value={func.status}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateCustomFunction(func.id, { status: e.target.value })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '2px 6px',
                          fontSize: '9px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          background: func.status === 'active' ? '#D4EDDA' : func.status === 'needs work' ? '#FFF3CD' : func.status === 'in review' ? '#D1ECF1' : func.status === 'archived' ? '#E2E3E5' : '#F0F0F0',
                          color: func.status === 'active' ? '#155724' : func.status === 'needs work' ? '#856404' : func.status === 'in review' ? '#0C5460' : func.status === 'archived' ? '#383D41' : '#666',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="draft">○ Draft</option>
                        <option value="needs work">⚠ Needs Work</option>
                        <option value="in review">📋 In Review</option>
                        <option value="active">✓ Active</option>
                        <option value="archived">📦 Archived</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCustomFunction(func.id)
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#FF3B30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {expandedFunctionId === func.id && (
                <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px', fontSize: '10px', marginBottom: '8px' }}>
                  {func.code ? (
                    <div>
                      <label style={{ fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>Code ({func.codeType}):</label>
                      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', fontFamily: "'Courier New', monospace", fontSize: '9px', maxHeight: '150px', overflowY: 'auto', marginBottom: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {func.code}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', color: '#999', marginBottom: '10px' }}>
                      No code
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => submitFunction(func.id, 'local')}
                      style={{ flex: 1, minWidth: '70px', padding: '6px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      ↙ Local
                    </button>
                    <button
                      onClick={() => submitFunction(func.id, 'user')}
                      style={{ flex: 1, minWidth: '70px', padding: '6px', background: '#5AC8FA', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      👤 User
                    </button>
                    <button
                      onClick={() => submitFunction(func.id, 'client')}
                      style={{ flex: 1, minWidth: '70px', padding: '6px', background: '#34C759', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      💼 Client
                    </button>
                    <button
                      onClick={() => submitFunction(func.id, 'gha')}
                      style={{ flex: 1, minWidth: '70px', padding: '6px', background: '#FF9500', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      ⚙️ GHA
                    </button>
                    <button
                      onClick={() => submitFunction(func.id, 'claude')}
                      style={{ flex: 1, minWidth: '70px', padding: '6px', background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '9px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      🤖 Claude
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

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
              {simulatorState.activeTab === 'projects' && renderProjectsTab()}
              {simulatorState.activeTab === 'code' && renderCodeTab()}
              {simulatorState.activeTab === 'preview' && renderPreviewTab()}
              {simulatorState.activeTab === 'functions' && renderFunctionsTab()}
              {simulatorState.activeTab === 'piano' && renderPianoTab()}
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
          <strong>Tip:</strong> Use "Load Project" to import projects from other environments by address (<code>environment.projectname</code>) or separate fields.
        </p>
      </div>
    </div>
  )
}
