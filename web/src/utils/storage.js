// Storage utility with multiple backends support and environment management
const STORAGE_KEY = 'iosPublisherData'
const ENVIRONMENTS_KEY = 'iosPublisherEnvironments'
const CURRENT_ENV_KEY = 'iosPublisherCurrentEnv'

export const StorageManager = {
  // Environment Management
  
  // Get current environment name
  getCurrentEnvironment: () => {
    return localStorage.getItem(CURRENT_ENV_KEY) || 'default'
  },

  // Set current environment
  setCurrentEnvironment: (envName) => {
    localStorage.setItem(CURRENT_ENV_KEY, envName)
  },

  // Get all environments
  getAllEnvironments: () => {
    const envs = localStorage.getItem(ENVIRONMENTS_KEY)
    return envs ? JSON.parse(envs) : ['default']
  },

  // Create new environment
  createEnvironment: (envName) => {
    const environments = StorageManager.getAllEnvironments()
    if (!environments.includes(envName)) {
      environments.push(envName)
      localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(environments))
      return { success: true, message: `Environment "${envName}" created` }
    }
    return { success: false, message: `Environment "${envName}" already exists` }
  },

  // Delete environment
  deleteEnvironment: (envName) => {
    if (envName === 'default') {
      return { success: false, message: 'Cannot delete default environment' }
    }
    const environments = StorageManager.getAllEnvironments()
    const filtered = environments.filter(e => e !== envName)
    localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(filtered))
    
    // Clean up data for deleted environment
    StorageManager.deleteEnvironmentData(envName)
    
    // If deleted env was active, switch to default
    if (StorageManager.getCurrentEnvironment() === envName) {
      StorageManager.setCurrentEnvironment('default')
    }
    
    return { success: true, message: `Environment "${envName}" deleted` }
  },

  // Delete all data for an environment
  deleteEnvironmentData: (envName) => {
    const backend = StorageManager.getBackend()
    const envKey = `${STORAGE_KEY}_${envName}`
    
    if (backend === 'localStorage') {
      localStorage.removeItem(envKey)
    } else if (backend === 'sessionStorage') {
      sessionStorage.removeItem(envKey)
    } else if (backend === 'indexedDB') {
      // Delete from IndexedDB
      const request = indexedDB.open('IOSPublisher', 1)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('data', 'readwrite')
        const store = transaction.objectStore('data')
        store.delete(envName)
      }
    }
  },

  // Get storage backend
  getBackend: () => {
    return localStorage.getItem('storageBackend') || 'localStorage'
  },

  // Set storage backend
  setBackend: (backend) => {
    localStorage.setItem('storageBackend', backend)
  },

  // Save data with current backend
  save: async (data) => {
    const backend = StorageManager.getBackend()
    const currentEnv = StorageManager.getCurrentEnvironment()
    const envKey = `${STORAGE_KEY}_${currentEnv}`
    const timestamp = new Date().toISOString()
    const dataWithTimestamp = { ...data, lastSaved: timestamp, environment: currentEnv }

    try {
      if (backend === 'localStorage') {
        localStorage.setItem(envKey, JSON.stringify(dataWithTimestamp))
      } else if (backend === 'sessionStorage') {
        sessionStorage.setItem(envKey, JSON.stringify(dataWithTimestamp))
      } else if (backend === 'indexedDB') {
        await StorageManager.saveToIndexedDB(dataWithTimestamp, currentEnv)
      }
      return { success: true, timestamp }
    } catch (error) {
      console.error('Storage error:', error)
      return { success: false, error: error.message }
    }
  },

  // Load data from current backend
  load: async () => {
    const backend = StorageManager.getBackend()
    const currentEnv = StorageManager.getCurrentEnvironment()
    const envKey = `${STORAGE_KEY}_${currentEnv}`

    try {
      let data = null
      if (backend === 'localStorage') {
        const item = localStorage.getItem(envKey)
        data = item ? JSON.parse(item) : null
      } else if (backend === 'sessionStorage') {
        const item = sessionStorage.getItem(envKey)
        data = item ? JSON.parse(item) : null
      } else if (backend === 'indexedDB') {
        data = await StorageManager.loadFromIndexedDB(currentEnv)
      }
      return data
    } catch (error) {
      console.error('Load error:', error)
      return null
    }
  },

  // IndexedDB operations
  saveToIndexedDB: (data, envName = 'default') => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IOSPublisher', 1)

      request.onerror = () => reject(request.error)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('data', 'readwrite')
        const store = transaction.objectStore('data')
        store.put({ id: envName, ...data })
        resolve()
      }
    })
  },

  loadFromIndexedDB: (envName = 'default') => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IOSPublisher', 1)

      request.onerror = () => reject(request.error)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('data', 'readonly')
        const store = transaction.objectStore('data')
        const getRequest = store.get(envName)

        getRequest.onsuccess = () => {
          const result = getRequest.result
          resolve(result ? { ...result } : null)
        }
      }
    })
  },

  // Export data as JSON file
  exportToFile: (data, filename = 'ios-publisher-data.json') => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Import data from JSON file
  importFromFile: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          resolve(data)
        } catch (error) {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  },

  // Clear all data
  clear: async () => {
    const backend = StorageManager.getBackend()
    try {
      if (backend === 'localStorage') {
        localStorage.removeItem(STORAGE_KEY)
      } else if (backend === 'sessionStorage') {
        sessionStorage.removeItem(STORAGE_KEY)
      } else if (backend === 'indexedDB') {
        const request = indexedDB.open('IOSPublisher', 1)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction('data', 'readwrite')
          const store = transaction.objectStore('data')
          store.clear()
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get storage info
  getStorageInfo: async () => {
    const backend = StorageManager.getBackend()
    
    try {
      if (backend === 'localStorage') {
        let size = 0
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            size += localStorage[key].length + key.length
          }
        }
        return {
          backend: 'localStorage',
          size: Math.round(size / 1024) + ' KB',
          limit: '5-10 MB (varies by browser)',
          available: true,
        }
      } else if (backend === 'sessionStorage') {
        let size = 0
        for (let key in sessionStorage) {
          if (sessionStorage.hasOwnProperty(key)) {
            size += sessionStorage[key].length + key.length
          }
        }
        return {
          backend: 'sessionStorage',
          size: Math.round(size / 1024) + ' KB',
          limit: '5-10 MB (varies by browser)',
          available: true,
        }
      } else if (backend === 'indexedDB') {
        const estimate = await navigator.storage.estimate()
        return {
          backend: 'indexedDB',
          size: Math.round(estimate.usage / 1024 / 1024) + ' MB',
          limit: Math.round(estimate.quota / 1024 / 1024) + ' MB',
          available: true,
        }
      }
    } catch (error) {
      return {
        backend,
        error: error.message,
        available: false,
      }
    }
  },

  // Auto-backup to localStorage as fallback
  autoBackup: (data) => {
    const backupKey = 'iosPublisherBackup'
    try {
      localStorage.setItem(backupKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }))
    } catch (error) {
      console.warn('Auto-backup failed:', error)
    }
  },

  // Restore from backup
  restoreFromBackup: () => {
    try {
      const backup = localStorage.getItem('iosPublisherBackup')
      return backup ? JSON.parse(backup) : null
    } catch (error) {
      console.error('Restore error:', error)
      return null
    }
  },
}
