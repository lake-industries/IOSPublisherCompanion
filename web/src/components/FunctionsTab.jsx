import React, { useState } from 'react'
import { generateUUID } from '../utils/uuid'

export default function FunctionsTab({ 
  customFunctions, 
  onCustomFunctionsChange,
  onUpdateSimulator,
  isRunning
}) {
  const [showFunctionBuilder, setShowFunctionBuilder] = useState(false)
  const [expandedFunctionId, setExpandedFunctionId] = useState(null)
  const [localCustomFunctions, setLocalCustomFunctions] = useState(customFunctions || [])
  const [newFunctionForm, setNewFunctionForm] = useState({ 
    name: '', 
    description: '', 
    code: '', 
    language: 'javascript', 
    routeTo: 'local', 
    codeType: 'optional' 
  })

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
        onUpdateSimulator({ codeOutput: `[local] Function "${func.name}" activated locally\n\nGenerated ${func.language} file:\n\n${generatedCode}\n\n[Download as .${fileExtension} file to integrate]` })
      },
      'user': () => {
        onUpdateSimulator({ codeOutput: `[user endpoint] Submitting "${func.name}" to user endpoint...\nThis would route to: /api/user/functions\nPayload: ${JSON.stringify(func, null, 2)}` })
      },
      'client': () => {
        onUpdateSimulator({ codeOutput: `[client endpoint] Submitting "${func.name}" to client endpoint...\nThis would route to: /api/client/functions\nPayload: ${JSON.stringify(func, null, 2)}` })
      },
      'gha': () => {
        onUpdateSimulator({ codeOutput: `[GitHub Actions] Creating workflow for "${func.name}"...\nThis would create a GHA workflow to validate and integrate the function.` })
      },
      'claude': () => {
        onUpdateSimulator({ codeOutput: `[Claude AI] Submitting "${func.name}" for AI analysis...\nClaude would analyze:\n- Code quality\n- Error handling\n- Performance\n- Security considerations` })
      }
    }
    
    const handler = endpoints[routeTo]
    if (handler) handler()
  }

  return (
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
}
