import React, { useState } from 'react'
import { generateUUID } from '../utils/uuid'

export default function ProjectsTab({ projects, onAdd, onDelete, onUpdate }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    bundleId: '',
    teamId: '',
    version: '1.0.0',
    code: '',
    projectType: 'standard',
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingId) {
      onUpdate(editingId, formData)
      setEditingId(null)
    } else {
      onAdd({
        id: generateUUID(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    setFormData({ name: '', bundleId: '', teamId: '', version: '1.0.0', code: '', projectType: 'standard' })
    setShowForm(false)
  }

  const handleEdit = (project) => {
    setFormData({
      name: project.name,
      bundleId: project.bundleId,
      teamId: project.teamId,
      version: project.version,
      code: project.code,
      projectType: project.projectType || 'standard',
    })
    setEditingId(project.id)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', bundleId: '', teamId: '', version: '1.0.0', code: '', projectType: 'standard' })
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Projects</h2>
        {!showForm && (
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            + New Project
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <h3>{editingId ? 'Edit Project' : 'Create New Project'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Bundle ID <span style={{ fontSize: '11px', color: '#999' }}>(optional)</span></label>
              <input
                type="text"
                value={formData.bundleId}
                onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                placeholder="com.example.app"
              />
            </div>

            <div className="form-group">
              <label>Team ID</label>
              <input
                type="text"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Project Type</label>
              <select
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              >
                <option value="standard">📱 Standard App</option>
                <option value="audio">🎵 Audio/Music</option>
                <option value="game">🎮 Game</option>
                <option value="tool">🔧 Utility Tool</option>
                <option value="vst-candidate">⚙️ VST Candidate</option>
              </select>
            </div>

            <div className="form-group">
              <label>Code</label>
              <textarea
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="// Your code here"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="button button-success">
                {editingId ? 'Update' : 'Create'} Project
              </button>
              <button type="button" className="button" onClick={handleCancel} style={{ background: '#e0e0e0', color: '#333' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No Projects Yet</h2>
          <p>Create your first iOS project to get started</p>
        </div>
      ) : (
        <div className="grid">
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>{project.name}</h3>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  padding: '3px 8px', 
                  background: project.projectType === 'vst-candidate' ? '#8B5CF6' : project.projectType === 'audio' ? '#34C759' : '#007AFF',
                  color: '#fff',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap'
                }}>
                  {project.projectType === 'vst-candidate' && '⚙️ VST-Ready'}
                  {project.projectType === 'audio' && '🎵 Audio'}
                  {project.projectType === 'game' && '🎮 Game'}
                  {project.projectType === 'tool' && '🔧 Tool'}
                  {project.projectType === 'standard' && '📱 Standard'}
                  {!project.projectType && '📱 Standard'}
                </span>
              </div>
              <p><strong>Bundle ID:</strong> {project.bundleId}</p>
              <p><strong>Team ID:</strong> {project.teamId || 'N/A'}</p>
              <p><strong>Version:</strong> {project.version}</p>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="button button-primary" onClick={() => handleEdit(project)}>
                  Edit
                </button>
                <button className="button button-danger" onClick={() => onDelete(project.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
