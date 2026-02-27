import React, { useState } from 'react'
import ProjectModelRenderer from './models/ProjectModelRenderer'

// Simple UI element builder for projects
const UIElementRenderer = ({ code, projectName }) => {
  if (!code) return null

  // Parse code for UI element markers
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
    <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginTop: '12px', border: '1px solid #ddd' }}>
      <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', margin: '0 0 8px 0' }}>🎨 Project UI Elements</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {hasButton && (
          <button style={{ padding: '8px 12px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Action Button
          </button>
        )}
        {hasCard && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px' }}>
            <p style={{ fontWeight: '600', fontSize: '12px', margin: '0 0 4px 0' }}>Sample Card</p>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>This is a card element from the project</p>
          </div>
        )}
        {hasForm && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px' }}>
            <input type="text" placeholder="Form input" style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '6px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Another field" style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>
        )}
        {hasSlider && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px' }}>
            <p style={{ fontSize: '10px', color: '#666', margin: '0 0 6px 0' }}>Slider Control</p>
            <input type="range" min="0" max="100" defaultValue="50" style={{ width: '100%' }} />
          </div>
        )}
        {hasCounter && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <button style={{ width: '32px', height: '32px', padding: 0, background: '#FF3B30', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>−</button>
            <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>0</span>
            <button style={{ width: '32px', height: '32px', padding: 0, background: '#34C759', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>+</button>
          </div>
        )}
        {hasToggle && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Toggle Switch</span>
            <input type="checkbox" defaultChecked style={{ width: '24px', height: '24px', cursor: 'pointer' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function PreviewTab({ selectedProject, isRunning }) {
  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Preview</h3>
      {selectedProject ? (
        <div>
          <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Name</label>
              <p style={{ fontSize: '14px', fontWeight: '600', margin: '4px 0 0 0' }}>{selectedProject.name}</p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Bundle ID</label>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>{selectedProject.bundleId}</p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Type</label>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>{selectedProject.projectType || 'Standard App'}</p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Version</label>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>{selectedProject.version}</p>
            </div>
            {selectedProject.loadedFrom && (
              <div style={{ marginBottom: '0' }}>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Loaded From</label>
                <p style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: '600', margin: '4px 0 0 0' }}>{selectedProject.loadedFrom}</p>
              </div>
            )}
          </div>

          {/* Render project-specific model if available */}
          <ProjectModelRenderer project={selectedProject} />

          {/* Render UI elements if project code contains them */}
          <UIElementRenderer code={selectedProject.code} projectName={selectedProject.name} />

          {/* Project Description or Code Preview */}
          {selectedProject.code && (
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
              <label style={{ fontSize: '11px', color: '#999', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Code Preview</label>
              <pre style={{
                fontSize: '10px',
                fontFamily: "'Courier New', monospace",
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
                margin: 0,
              }}>
                {selectedProject.code.substring(0, 300)}{selectedProject.code.length > 300 ? '...' : ''}
              </pre>
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
}
