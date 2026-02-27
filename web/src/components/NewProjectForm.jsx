import React, { useState } from 'react'
import { generateUUID } from '../utils/uuid'
import { SAMPLE_PROJECTS } from '../utils/sampleProjects'

export default function NewProjectForm({ onProjectCreate, onCancel, isRunning }) {
  const [formMode, setFormMode] = useState('template') // 'template' or 'blank'
  const [formData, setFormData] = useState({
    name: '',
    bundleId: '',
    version: '1.0.0',
    projectType: 'standard',
    code: '',
  })
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const templates = [
    {
      id: 'solarPanelApp',
      label: '☀️ Solar Panel Model',
      description: 'Interactive solar panel efficiency simulator',
      data: SAMPLE_PROJECTS.solarPanelApp,
    },
    {
      id: 'energyTracker',
      label: '⚡ Energy Tracker',
      description: 'Daily solar energy production tracking',
      data: SAMPLE_PROJECTS.dataVisualization,
    },
    {
      id: 'custom',
      label: '+ Blank Project',
      description: 'Start with empty project',
      data: null,
    },
  ]

  const createProject = () => {
    if (formMode === 'template' && selectedTemplate?.data) {
      const newProject = {
        ...selectedTemplate.data,
        id: generateUUID(),
      }
      onProjectCreate(newProject)
    } else if (formMode === 'blank') {
      if (!formData.name || !formData.bundleId) {
        alert('Project name and bundle ID are required')
        return
      }
      const newProject = {
        ...formData,
        id: generateUUID(),
        code: formData.code || `// ${formData.name}\n// Add your code here`,
      }
      onProjectCreate(newProject)
    }
  }

  const selectTemplate = (template) => {
    setSelectedTemplate(template)
    if (template.data) {
      setFormData(template.data)
    } else {
      setFormData({
        name: '',
        bundleId: '',
        version: '1.0.0',
        projectType: 'standard',
        code: '',
      })
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>Create New Project</h3>

        {/* Mode Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setFormMode('template')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: formMode === 'template' ? '#007AFF' : '#f0f0f0',
              color: formMode === 'template' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📋 From Template
          </button>
          <button
            onClick={() => setFormMode('blank')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: formMode === 'blank' ? '#007AFF' : '#f0f0f0',
              color: formMode === 'blank' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ✏️ Blank Project
          </button>
        </div>

        {/* Template Selection */}
        {formMode === 'template' && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>Choose a template:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{
                    padding: '12px',
                    background: selectedTemplate?.id === template.id ? '#E3F2FD' : '#f5f5f5',
                    border: selectedTemplate?.id === template.id ? '2px solid #007AFF' : '1px solid #ddd',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTemplate?.id !== template.id) {
                      e.currentTarget.style.background = '#f0f0f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTemplate?.id !== template.id) {
                      e.currentTarget.style.background = '#f5f5f5'
                    }
                  }}
                >
                  <p style={{ fontWeight: '600', fontSize: '12px', margin: '0 0 2px 0' }}>{template.label}</p>
                  <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blank Project Form */}
        {formMode === 'blank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Project Name *
              </label>
              <input
                type="text"
                placeholder="e.g., My App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '11px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Bundle ID *
              </label>
              <input
                type="text"
                placeholder="e.g., com.example.myapp"
                value={formData.bundleId}
                onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '11px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '11px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Type
                </label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '11px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="standard">Standard App</option>
                  <option value="solar-panel">Solar Panel</option>
                  <option value="piano">Piano</option>
                  <option value="utility">Utility</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Initial Code
              </label>
              <textarea
                placeholder="Optional: Add code to start with"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  fontSize: '11px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontFamily: "'Courier New', monospace",
                }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={createProject}
            disabled={!selectedTemplate && formMode === 'template'}
            style={{
              padding: '8px 16px',
              background: (selectedTemplate || formMode === 'blank') ? '#34C759' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: (selectedTemplate || formMode === 'blank') ? 'pointer' : 'not-allowed',
            }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
