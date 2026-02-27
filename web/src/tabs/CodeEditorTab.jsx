import React, { useState } from 'react'

export default function CodeEditorTab({ projects, onUpdate }) {
  const [selectedId, setSelectedId] = useState(projects.length > 0 ? projects[0].id : null)
  const [code, setCode] = useState('')

  const currentProject = projects.find(p => p.id === selectedId)

  const handleProjectChange = (id) => {
    setSelectedId(id)
    const project = projects.find(p => p.id === id)
    setCode(project?.code || '')
  }

  const handleSave = () => {
    if (currentProject) {
      onUpdate(currentProject.id, { code })
      alert('Code saved!')
    }
  }

  return (
    <div className="container">
      <h2>Code Editor</h2>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No Projects</h2>
          <p>Create a project first to edit its code</p>
        </div>
      ) : (
        <div>
          <div className="form-group">
            <label>Select Project</label>
            <select
              value={selectedId || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {currentProject && (
            <div>
              <div className="form-group">
                <label>Code Editor</label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Enter your code here..."
                  style={{ fontFamily: "'Courier New', monospace" }}
                />
              </div>

              <button className="button button-success" onClick={handleSave}>
                Save Code
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
