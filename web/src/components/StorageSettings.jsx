import React, { useState, useEffect } from 'react'
import { StorageManager } from '../utils/storage'

export default function StorageSettings({ projects, customFunctions, onImport, onEnvironmentChange }) {
  const [backend, setBackend] = useState('localStorage')
  const [storageInfo, setStorageInfo] = useState(null)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [environments, setEnvironments] = useState([])
  const [currentEnv, setCurrentEnv] = useState('')
  const [newEnvName, setNewEnvName] = useState('')
  const [showNewEnvInput, setShowNewEnvInput] = useState(false)

  useEffect(() => {
    const currentBackend = StorageManager.getBackend()
    setBackend(currentBackend)
    
    StorageManager.getStorageInfo().then(info => {
      setStorageInfo(info)
    })

    const backupEnabled = localStorage.getItem('autoBackupEnabled') === 'true'
    setAutoBackupEnabled(backupEnabled)

    // Load environments
    const envs = StorageManager.getAllEnvironments()
    setEnvironments(envs)
    const curr = StorageManager.getCurrentEnvironment()
    setCurrentEnv(curr)
  }, [])

  const handleBackendChange = (newBackend) => {
    StorageManager.setBackend(newBackend)
    setBackend(newBackend)
    setMessage(`Storage backend changed to ${newBackend}`)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleExport = () => {
    const dataToExport = {
      projects,
      customFunctions,
      exportDate: new Date().toISOString(),
      appVersion: '1.0',
    }
    StorageManager.exportToFile(dataToExport, `ios-publisher-backup-${new Date().toISOString().split('T')[0]}.json`)
    setMessage('✓ Data exported successfully')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0]
        const data = await StorageManager.importFromFile(file)
        if (data.projects && data.customFunctions) {
          onImport && onImport(data)
          setMessage('✓ Data imported successfully')
        } else {
          setMessage('✗ Invalid backup file format')
        }
      } catch (error) {
        setMessage(`✗ Import failed: ${error.message}`)
      }
      setTimeout(() => setMessage(''), 3000)
    }
    input.click()
  }

  const handleAutoBackupToggle = () => {
    const newState = !autoBackupEnabled
    setAutoBackupEnabled(newState)
    localStorage.setItem('autoBackupEnabled', newState)
    setMessage(newState ? '✓ Auto-backup enabled' : '✓ Auto-backup disabled')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleClearData = () => {
    if (window.confirm('Are you sure? This will delete all data. Make sure you have a backup!')) {
      StorageManager.clear().then(() => {
        setMessage('✓ All data cleared')
        setTimeout(() => window.location.reload(), 1500)
      })
    }
  }

  const handleRestoreBackup = () => {
    const backup = StorageManager.restoreFromBackup()
    if (backup) {
      onImport && onImport(backup.data)
      setMessage(`✓ Restored backup from ${new Date(backup.timestamp).toLocaleString()}`)
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('✗ No backup available')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleCreateEnvironment = () => {
    if (!newEnvName.trim()) {
      setMessage('✗ Environment name cannot be empty')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    const result = StorageManager.createEnvironment(newEnvName)
    if (result.success) {
      const updated = StorageManager.getAllEnvironments()
      setEnvironments(updated)
      setMessage(`✓ Environment "${newEnvName}" created`)
      setNewEnvName('')
      setShowNewEnvInput(false)
    } else {
      setMessage(`✗ ${result.message}`)
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSwitchEnvironment = (envName) => {
    StorageManager.setCurrentEnvironment(envName)
    setCurrentEnv(envName)
    setMessage(`✓ Switched to "${envName}" environment`)
    onEnvironmentChange && onEnvironmentChange()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDeleteEnvironment = (envName) => {
    if (envName === 'default') {
      setMessage('✗ Cannot delete default environment')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    if (window.confirm(`Delete environment "${envName}" and all its data? This cannot be undone.`)) {
      const result = StorageManager.deleteEnvironment(envName)
      if (result.success) {
        const updated = StorageManager.getAllEnvironments()
        setEnvironments(updated)
        setMessage(`✓ Environment "${envName}" deleted`)
        if (currentEnv === envName) {
          setCurrentEnv('default')
          onEnvironmentChange && onEnvironmentChange()
        }
      }
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Storage & Data Management</h2>

      {message && (
        <div style={{
          background: message.startsWith('✓') ? '#D4EDDA' : '#F8D7DA',
          color: message.startsWith('✓') ? '#155724' : '#721C24',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12px',
        }}>
          {message}
        </div>
      )}

      {/* Environment Management Section */}
      <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #007AFF' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>🌍 Environments</h3>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>Each environment has its own projects and tasks</p>
        
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>Available Environments:</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {environments.map(env => (
              <div key={env} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => handleSwitchEnvironment(env)}
                  style={{
                    padding: '6px 12px',
                    background: currentEnv === env ? '#007AFF' : '#fff',
                    color: currentEnv === env ? '#fff' : '#666',
                    border: `1px solid ${currentEnv === env ? '#007AFF' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {env === currentEnv && '✓ '}
                  {env}
                </button>
                {env !== 'default' && (
                  <button
                    onClick={() => handleDeleteEnvironment(env)}
                    style={{
                      padding: '4px 8px',
                      background: '#FFE5E5',
                      color: '#C41C3B',
                      border: '1px solid #FFB3B3',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    title="Delete environment"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {!showNewEnvInput ? (
            <button
              onClick={() => setShowNewEnvInput(true)}
              style={{
                padding: '8px 12px',
                background: '#34C759',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + New Environment
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Environment name"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateEnvironment()}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '11px',
                  flex: 1,
                }}
              />
              <button
                onClick={handleCreateEnvironment}
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
                Create
              </button>
              <button
                onClick={() => setShowNewEnvInput(false)}
                style={{
                  padding: '6px 12px',
                  background: '#ddd',
                  color: '#666',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Storage Backend Section */}
      <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Storage Backend</h3>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>Choose where your data is stored</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {['localStorage', 'sessionStorage', 'indexedDB'].map(option => (
            <button
              key={option}
              onClick={() => handleBackendChange(option)}
              style={{
                padding: '8px 12px',
                background: backend === option ? '#007AFF' : '#fff',
                color: backend === option ? '#fff' : '#666',
                border: `1px solid ${backend === option ? '#007AFF' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {option === 'localStorage' && '💾 Local Storage'}
              {option === 'sessionStorage' && '⏱️ Session Storage'}
              {option === 'indexedDB' && '📦 IndexedDB'}
            </button>
          ))}
        </div>

        {storageInfo && (
          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px', color: '#666' }}>
            <p><strong>Current:</strong> {storageInfo.backend}</p>
            <p><strong>Used:</strong> {storageInfo.size}</p>
            <p><strong>Limit:</strong> {storageInfo.limit}</p>
          </div>
        )}
      </div>

      {/* Backup & Restore Section */}
      <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Backup & Restore</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 12px',
              background: '#34C759',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📥 Export Backup
          </button>
          <button
            onClick={handleImportClick}
            style={{
              padding: '8px 12px',
              background: '#007AFF',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📤 Import Backup
          </button>
          <button
            onClick={handleRestoreBackup}
            style={{
              padding: '8px 12px',
              background: '#FF9500',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🔄 Restore Backup
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoBackupEnabled}
            onChange={handleAutoBackupToggle}
          />
          <span>Enable automatic backups to browser</span>
        </label>
      </div>

      {/* Data Overview */}
      <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Data Overview</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px' }}>
            <p style={{ color: '#999', margin: '0 0 4px 0' }}>Projects</p>
            <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{projects.length}</p>
          </div>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px' }}>
            <p style={{ color: '#999', margin: '0 0 4px 0' }}>Custom Functions</p>
            <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{customFunctions.length}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ background: '#FFF3CD', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#856404' }}>⚠️ Danger Zone</h3>
        
        <button
          onClick={handleClearData}
          style={{
            padding: '8px 12px',
            background: '#FF3B30',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🗑️ Clear All Data
        </button>
        <p style={{ fontSize: '11px', color: '#856404', marginTop: '8px', margin: '8px 0 0 0' }}>
          This action cannot be undone. Export a backup first!
        </p>
      </div>
    </div>
  )
}
