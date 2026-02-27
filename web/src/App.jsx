import React, { useEffect, useState } from 'react'
import './App.css'
import ProjectsTab from './tabs/ProjectsTab'
import CodeEditorTab from './tabs/CodeEditorTab'
import PreviewTab from './tabs/PreviewTab'
import SimulatorTab from './tabs/SimulatorTab'
import StorageSettings from './components/StorageSettings'
import { StorageManager } from './utils/storage'

function App() {
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [customFunctions, setCustomFunctions] = useState([])

  // Load projects from StorageManager on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await StorageManager.load()
        if (data) {
          if (data.projects) setProjects(data.projects)
          if (data.customFunctions) setCustomFunctions(data.customFunctions)
        }
      } catch (e) {
        console.error('Failed to load data from storage:', e)
        // Fallback to localStorage for backward compatibility
        const stored = localStorage.getItem('iosPublisherProjects')
        if (stored) {
          try {
            setProjects(JSON.parse(stored))
          } catch (err) {
            console.error('Fallback failed:', err)
          }
        }
      }
    }
    loadData()
  }, [])

  // Reload data when environment changes
  const handleEnvironmentChange = async () => {
    const data = await StorageManager.load()
    if (data) {
      if (data.projects) setProjects(data.projects)
      if (data.customFunctions) setCustomFunctions(data.customFunctions)
    } else {
      // Empty environment
      setProjects([])
      setCustomFunctions([])
    }
  }

  // Save projects and functions whenever they change
  useEffect(() => {
    const saveData = async () => {
      try {
        await StorageManager.save({
          projects,
          customFunctions,
          lastSaved: new Date().toISOString(),
        })
      } catch (e) {
        console.error('Failed to save data:', e)
      }
    }
    
    if (projects.length > 0 || customFunctions.length > 0) {
      saveData()
    }
  }, [projects, customFunctions])

  const addProject = (newProject) => {
    setProjects([...projects, newProject])
  }

  const updateProject = (id, updates) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
  }

  const deleteProject = (id) => {
    setProjects(projects.filter(p => p.id !== id))
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsTab projects={projects} onAdd={addProject} onDelete={deleteProject} onUpdate={updateProject} />
      case 'code':
        return <CodeEditorTab projects={projects} onUpdate={updateProject} />
      case 'preview':
        return <PreviewTab projects={projects} />
      case 'simulator':
        return (
          <SimulatorTab 
            projects={projects} 
            onAdd={addProject} 
            onDelete={deleteProject} 
            onUpdate={updateProject}
            customFunctions={customFunctions}
            onCustomFunctionsChange={setCustomFunctions}
          />
        )
      case 'storage':
        return (
          <StorageSettings
            projects={projects}
            customFunctions={customFunctions}
            onImport={(data) => {
              if (data.projects) setProjects(data.projects)
              if (data.customFunctions) setCustomFunctions(data.customFunctions)
            }}
            onEnvironmentChange={handleEnvironmentChange}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📱 iOS Publisher Companion</h1>
        <p>Web Edition</p>
      </header>

      <main className="app-main">
        {renderTab()}
      </main>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button
          className={`nav-btn ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code Editor
        </button>
        <button
          className={`nav-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
        <button
          className={`nav-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          Simulator
        </button>
        <button
          className={`nav-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          Storage
        </button>
      </nav>
    </div>
  )
}

export default App
