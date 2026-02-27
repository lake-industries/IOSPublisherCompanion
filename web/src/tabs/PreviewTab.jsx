import React, { useState } from 'react'

export default function PreviewTab({ projects, onUpdate }) {
  const [selectedId, setSelectedId] = useState(projects.length > 0 ? projects[0].id : null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const currentProject = projects.find(p => p.id === selectedId)

  const handleReset = () => {
    if (currentProject) {
      // Reset to default values
      onUpdate(currentProject.id, {
        name: currentProject.name,
        bundleId: currentProject.bundleId || '',
        teamId: currentProject.teamId || '',
        version: '1.0.0',
        code: '',
      })
      setShowResetConfirm(false)
      alert('Project reset to defaults!')
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Preview</h2>
        {currentProject && (
          <button
            className="button button-danger"
            onClick={() => setShowResetConfirm(true)}
            style={{ fontSize: '12px' }}
          >
            🔄 Reset Project
          </button>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div style={{
          background: '#fff',
          border: '2px solid #FF9500',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>⚠️ Reset Project?</p>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            This will clear all project data and restore defaults. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button button-danger" onClick={handleReset}>
              Confirm Reset
            </button>
            <button
              className="button"
              onClick={() => setShowResetConfirm(false)}
              style={{ background: '#e0e0e0', color: '#333' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No Projects</h2>
          <p>Create a project to preview its details</p>
        </div>
      ) : (
        <div>
          <div className="form-group">
            <label>Select Project</label>
            <select
              value={selectedId || ''}
              onChange={(e) => {
                setSelectedId(e.target.value)
                setShowResetConfirm(false)
              }}
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
            <div className="card" style={{ maxWidth: '600px', marginTop: '16px' }}>
              <div style={{
                background: '#F0F0F0',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '11px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>
                  ℹ️ PROTECTED PREVIEW
                </p>
                <p style={{ fontSize: '11px', color: '#999' }}>
                  All fields are read-only. Use "Reset Project" to restore defaults if needed.
                </p>
              </div>

              <h3>{currentProject.name}</h3>

              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Bundle ID
                  </label>
                  <input
                    type="text"
                    value={currentProject.bundleId}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Team ID
                  </label>
                  <input
                    type="text"
                    value={currentProject.teamId || 'Not set'}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Version
                  </label>
                  <input
                    type="text"
                    value={currentProject.version}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Code Preview
                  </label>
                  <textarea
                    value={currentProject.code || '// No code yet'}
                    readOnly
                    style={{
                      width: '100%',
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: "'Courier New', monospace",
                      border: '1px solid #e0e0e0',
                      minHeight: '150px',
                      color: '#666',
                      resize: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Created
                  </label>
                  <input
                    type="text"
                    value={new Date(currentProject.createdAt).toLocaleString()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#999', marginBottom: '4px' }}>
                    Last Updated
                  </label>
                  <input
                    type="text"
                    value={new Date(currentProject.updatedAt).toLocaleString()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
