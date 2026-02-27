import React, { useState } from 'react'

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

// Render UI elements from code if marked
const UIElementRenderer = ({ code }) => {
  if (!code) return null

  const hasButton = code.includes('ui:button')
  const hasCard = code.includes('ui:card')
  const hasForm = code.includes('ui:form')
  const hasSlider = code.includes('ui:slider')
  const hasCounter = code.includes('ui:counter')
  const hasToggle = code.includes('ui:toggle')

  if (!hasButton && !hasCard && !hasForm && !hasSlider && !hasCounter && !hasToggle) {
    return null
  }

  return (
    <div style={{ background: '#F0F8FF', padding: '12px', borderRadius: '6px', marginTop: '12px', border: '1px solid #007AFF' }}>
      <p style={{ fontSize: '11px', fontWeight: '600', color: '#0066cc', margin: '0 0 10px 0' }}>🎨 Running UI Elements</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {hasButton && (
          <button style={{ padding: '8px 12px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Action Button (ui:button)
          </button>
        )}
        {hasCard && (
          <div style={{ background: '#fff', border: '1px solid #0066cc', borderRadius: '6px', padding: '10px' }}>
            <p style={{ fontWeight: '600', fontSize: '12px', margin: '0 0 4px 0', color: '#0066cc' }}>Sample Card (ui:card)</p>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>This card is rendered from your code</p>
          </div>
        )}
        {hasForm && (
          <div style={{ background: '#fff', border: '1px solid #0066cc', borderRadius: '6px', padding: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#0066cc', margin: '0 0 8px 0' }}>Form (ui:form)</p>
            <input type="text" placeholder="Input field 1" style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '6px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Input field 2" style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>
        )}
        {hasSlider && (
          <div style={{ background: '#fff', border: '1px solid #0066cc', borderRadius: '6px', padding: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#0066cc', margin: '0 0 6px 0' }}>Slider (ui:slider)</p>
            <input type="range" min="0" max="100" defaultValue="50" style={{ width: '100%' }} />
          </div>
        )}
        {hasCounter && (
          <div style={{ background: '#fff', border: '1px solid #0066cc', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <button style={{ width: '32px', height: '32px', padding: 0, background: '#FF3B30', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>−</button>
            <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>0</span>
            <button style={{ width: '32px', height: '32px', padding: 0, background: '#34C759', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>+</button>
            <span style={{ fontSize: '9px', color: '#999', marginLeft: '8px' }}>(ui:counter)</span>
          </div>
        )}
        {hasToggle && (
          <div style={{ background: '#fff', border: '1px solid #0066cc', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Toggle Switch (ui:toggle)</span>
            <input type="checkbox" defaultChecked style={{ width: '24px', height: '24px', cursor: 'pointer' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function CodeTab({ 
  selectedProject, 
  isRunning, 
  detectedFunctions,
  codeOutput,
  testResults,
  onRunCode,
  onRunTests,
  parseCodeFunctions,
  onUpdateProject,
}) {
  const [editMode, setEditMode] = useState(false)
  const [editedCode, setEditedCode] = useState(selectedProject?.code || '')
  const hasExecutableCode = detectedFunctions.length > 0

  const saveCode = () => {
    if (onUpdateProject && selectedProject) {
      onUpdateProject(selectedProject.id, { code: editedCode })
      setEditMode(false)
    }
  }

  const cancelEdit = () => {
    setEditedCode(selectedProject?.code || '')
    setEditMode(false)
  }

  // Update editedCode when selectedProject changes
  React.useEffect(() => {
    setEditedCode(selectedProject?.code || '')
  }, [selectedProject?.id])

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Code Editor</h3>
      {selectedProject ? (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {hasExecutableCode ? (
              <>
                <button
                  onClick={onRunCode}
                  disabled={!isRunning}
                  style={{
                    padding: '6px 12px',
                    background: isRunning ? '#007AFF' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: isRunning ? 'pointer' : 'not-allowed',
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

          <div style={{ marginBottom: '8px', padding: '8px', background: '#FFF3E0', borderRadius: '4px', fontSize: '10px', color: '#E65100' }}>
            <strong>UI Elements:</strong> Add these markers to your code to render UI components:
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              <li><code style={{ fontSize: '9px' }}>ui:button</code> - Action button</li>
              <li><code style={{ fontSize: '9px' }}>ui:card</code> - Card container</li>
              <li><code style={{ fontSize: '9px' }}>ui:form</code> - Form with inputs</li>
              <li><code style={{ fontSize: '9px' }}>ui:slider</code> - Range slider</li>
              <li><code style={{ fontSize: '9px' }}>ui:counter</code> - +/- counter</li>
              <li><code style={{ fontSize: '9px' }}>ui:toggle</code> - Toggle switch</li>
            </ul>
          </div>

          {/* Edit/Save Controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                disabled={!isRunning}
                style={{
                  padding: '6px 12px',
                  background: isRunning ? '#5AC8FA' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: isRunning ? 'pointer' : 'not-allowed',
                }}
              >
                ✏️ Edit Code
              </button>
            ) : (
              <>
                <button
                  onClick={saveCode}
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
                  ✓ Save
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: '6px 12px',
                    background: '#FF9500',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Cancel
                </button>
              </>
            )}
          </div>
          <textarea
            value={editMode ? editedCode : selectedProject.code}
            onChange={(e) => editMode && setEditedCode(e.target.value)}
            readOnly={!editMode}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              fontSize: '11px',
              fontFamily: "'Courier New', monospace",
              border: editMode ? '2px solid #007AFF' : '1px solid #e0e0e0',
              borderRadius: '4px',
              marginBottom: '12px',
              background: editMode ? '#fff' : '#f9f9f9',
              cursor: editMode ? 'text' : 'default',
              resize: 'vertical',
            }}
          />

          {/* Render UI elements if code contains markers */}
          <UIElementRenderer code={selectedProject.code} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {codeOutput && (
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
                {codeOutput}
              </div>
            )}
            {testResults && (
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
                {testResults}
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
