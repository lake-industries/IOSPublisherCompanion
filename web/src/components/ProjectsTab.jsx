import React, { useState, useEffect } from 'react'
import { StorageManager } from '../utils/storage'
import { generateUUID } from '../utils/uuid'
import NewProjectForm from './NewProjectForm'

export default function ProjectsTab({ 
  projects, 
  onAdd, 
  onDelete, 
  selectedProjectId,
  onSelectProject,
  isRunning,
  activeProjects,
  onToggleProjectActive,
  showProjectFlashButtons,
  onFlash,
  parseCodeFunctions
}) {
  const [showProjectLoader, setShowProjectLoader] = useState(false)
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [loaderMessage, setLoaderMessage] = useState('')
  const [availableEnvironments, setAvailableEnvironments] = useState([])
  const [selectedLoaderEnv, setSelectedLoaderEnv] = useState('')
  const [envProjects, setEnvProjects] = useState([])
  const [showEnvironmentList, setShowEnvironmentList] = useState(false)
  const [showProjectList, setShowProjectList] = useState(false)

  useEffect(() => {
    loadAvailableEnvironments()
  }, [])

  const loadAvailableEnvironments = async () => {
    try {
      const envs = StorageManager.getAllEnvironments ? StorageManager.getAllEnvironments() : ['default']
      setAvailableEnvironments(envs)
      const currentEnv = StorageManager.getCurrentEnvironment()
      setSelectedLoaderEnv(currentEnv)
    } catch (error) {
      console.error('Error loading environments:', error)
      setAvailableEnvironments(['default'])
    }
  }

  const loadProjectsInEnvironment = async (envName) => {
    try {
      const originalEnv = StorageManager.getCurrentEnvironment()
      StorageManager.setCurrentEnvironment(envName)
      const envData = await StorageManager.load()
      StorageManager.setCurrentEnvironment(originalEnv)

      if (envData && envData.projects) {
        setEnvProjects(envData.projects)
        setSelectedLoaderEnv(envName)
        setShowEnvironmentList(false)
        setShowProjectList(true)
      } else {
        setEnvProjects([])
        setLoaderMessage(`⚠ Environment "${envName}" has no projects`)
        setTimeout(() => setLoaderMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setEnvProjects([])
      setLoaderMessage(`✗ Error loading environment: ${error.message}`)
      setTimeout(() => setLoaderMessage(''), 3000)
    }
  }

  const loadProjectFromList = (project) => {
    try {
      const newProject = {
        ...project,
        id: generateUUID(),
        loadedFrom: `${selectedLoaderEnv}.${project.name}`
      }
      onAdd && onAdd(newProject)
      setLoaderMessage(`✓ Loaded "${project.name}" from "${selectedLoaderEnv}"`)
      setShowProjectList(false)
      setShowProjectLoader(false)
      setTimeout(() => setLoaderMessage(''), 3000)
    } catch (error) {
      setLoaderMessage(`✗ Error: ${error.message}`)
      setTimeout(() => setLoaderMessage(''), 3000)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Projects</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowNewProjectForm(true)}
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
            + New Project
          </button>
          <button
            onClick={() => {
              setShowProjectLoader(!showProjectLoader)
              setShowEnvironmentList(false)
              setShowProjectList(false)
              setLoaderMessage('')
            }}
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
            {showProjectLoader ? '✕ Close' : '📂 Load Project'}
          </button>
        </div>
      </div>

      {showProjectLoader && (
        <div style={{ background: '#E8F5E9', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#2E7D32', marginBottom: '12px' }}>Load Project from Environment</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => {
                setShowEnvironmentList(!showEnvironmentList)
                setShowProjectList(false)
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: showEnvironmentList ? '#2E7D32' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              🌍 {selectedLoaderEnv ? `Env: ${selectedLoaderEnv}` : 'Select Environment'}
            </button>
            <button
              onClick={() => {
                setShowProjectList(!showProjectList)
                setShowEnvironmentList(false)
              }}
              disabled={!selectedLoaderEnv}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: showProjectList ? '#0056b3' : '#007AFF',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: selectedLoaderEnv ? 'pointer' : 'not-allowed',
                opacity: selectedLoaderEnv ? 1 : 0.5,
              }}
            >
              📋 {envProjects.length} Project{envProjects.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Environment List */}
          {showEnvironmentList && (
            <div style={{ background: '#fff', border: '1px solid #4CAF50', borderRadius: '4px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {availableEnvironments.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
                  No environments found
                </div>
              ) : (
                <div>
                  {availableEnvironments.map(env => (
                    <button
                      key={env}
                      onClick={() => loadProjectsInEnvironment(env)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: selectedLoaderEnv === env ? '#E8F5E9' : '#fff',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        fontSize: '11px',
                        fontWeight: selectedLoaderEnv === env ? '600' : '400',
                        color: selectedLoaderEnv === env ? '#1B5E20' : '#333',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {selectedLoaderEnv === env && '✓ '} {env}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project List */}
          {showProjectList && (
            <div style={{ background: '#fff', border: '1px solid #007AFF', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto' }}>
              {envProjects.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
                  No projects in "{selectedLoaderEnv}"
                </div>
              ) : (
                <div>
                  {envProjects.map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => loadProjectFromList(proj)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#fff',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        fontSize: '11px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F0F8FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>{proj.name}</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {proj.bundleId || 'No bundle ID'} • {proj.projectType || 'App'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loaderMessage && (
            <div style={{
              marginTop: '12px',
              padding: '8px 10px',
              background: loaderMessage.startsWith('✓') ? '#C8E6C9' : '#FFCCCC',
              color: loaderMessage.startsWith('✓') ? '#1B5E20' : '#C62828',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '600',
            }}>
              {loaderMessage}
            </div>
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
                  borderLeft: (activeProjects || []).includes(p.id) ? '4px solid #34C759' : '4px solid #007AFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: isRunning ? 1 : 0.7,
                  pointerEvents: isRunning ? 'auto' : 'none',
                }}
              >
                <div style={{ flex: 1, cursor: isRunning ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={(activeProjects || []).includes(p.id)}
                    onChange={() => isRunning && onToggleProjectActive(p.id)}
                    disabled={!isRunning}
                    style={{ cursor: isRunning ? 'pointer' : 'not-allowed' }}
                  />
                  <div onClick={() => isRunning && onSelectProject(p.id)}>
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
                  {showProjectFlashButtons && projectFunctions.length > 0 && (
                    <button
                      onClick={() => onFlash()}
                      disabled={!isRunning}
                      style={{
                        padding: '4px 8px',
                        background: '#FF9500',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: isRunning ? 'pointer' : 'not-allowed',
                        opacity: isRunning ? 1 : 0.5,
                      }}
                    >
                      ⚡ Flash
                    </button>
                  )}
                  <button
                    onClick={() => isRunning && onDelete(p.id)}
                    disabled={!isRunning}
                    style={{
                      padding: '4px 8px',
                      background: '#FF3B30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: isRunning ? 'pointer' : 'not-allowed',
                      opacity: isRunning ? 1 : 0.5,
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

      {showNewProjectForm && (
        <NewProjectForm
          onProjectCreate={(newProject) => {
            onAdd && onAdd(newProject)
            setShowNewProjectForm(false)
          }}
          onCancel={() => setShowNewProjectForm(false)}
          isRunning={isRunning}
        />
      )}
    </div>
  )
}
