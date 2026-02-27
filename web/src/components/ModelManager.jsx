import React, { useState, useEffect } from 'react';
import {
  listCachedModels,
  getCachedModel,
  deleteCachedModel,
  saveModelToCache,
  getCachedModels
} from '../../utils/modelStorage';
import { fetchModelFromGitHub } from '../../utils/github';

export default function ModelManager() {
  const [cachedModels, setCachedModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    loadCachedModels();
  }, []);

  const loadCachedModels = () => {
    const models = listCachedModels();
    setCachedModels(models);
  };

  const handleDeleteModel = (modelType) => {
    if (window.confirm(`Delete cached model: ${modelType}?`)) {
      deleteCachedModel(modelType);
      loadCachedModels();
      setSelectedModel(null);
    }
  };

  const handleImportModel = async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a repository URL');
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      const [owner, repo] = importUrl.trim().split('/');
      if (!owner || !repo) {
        throw new Error('Invalid format. Use: owner/repo');
      }

      const modelConfig = await fetchModelFromGitHub(owner, repo, 'main');
      
      if (!modelConfig.type) {
        throw new Error('Model config must include a "type" field');
      }

      // Save to cache
      saveModelToCache(modelConfig.type, modelConfig);
      
      // Refresh list
      loadCachedModels();
      setImportUrl('');
      setShowImportForm(false);
    } catch (error) {
      setImportError(error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Model Manager</h3>

      {/* Cached Models List */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Cached Models ({cachedModels.length})</h4>
        
        {cachedModels.length === 0 ? (
          <p style={styles.empty}>No cached models. Import one from GitHub!</p>
        ) : (
          <div style={styles.modelList}>
            {cachedModels.map(model => (
              <div
                key={model.type}
                style={{
                  ...styles.modelItem,
                  backgroundColor: selectedModel?.type === model.type ? '#e3f2fd' : '#fff'
                }}
                onClick={() => setSelectedModel(model)}
              >
                <div style={styles.modelName}>{model.type}</div>
                <div style={styles.modelLabel}>{model.label}</div>
                <div style={styles.modelSource}>{model.source}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Model Details */}
      {selectedModel && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Model Details</h4>
          <div style={styles.details}>
            <div style={styles.detailRow}>
              <strong>Type:</strong> {selectedModel.type}
            </div>
            <div style={styles.detailRow}>
              <strong>Label:</strong> {selectedModel.config.label || 'N/A'}
            </div>
            <div style={styles.detailRow}>
              <strong>Source:</strong> {selectedModel.config.sourceRepo || 'Local'}
            </div>
            {selectedModel.config.description && (
              <div style={styles.detailRow}>
                <strong>Description:</strong> {selectedModel.config.description}
              </div>
            )}
            {selectedModel.config.cachedAt && (
              <div style={styles.detailRow}>
                <strong>Cached:</strong> {new Date(selectedModel.config.cachedAt).toLocaleString()}
              </div>
            )}
            
            <button
              onClick={() => handleDeleteModel(selectedModel.type)}
              style={styles.deleteButton}
            >
              Delete Model
            </button>
          </div>
        </div>
      )}

      {/* Import Form */}
      <div style={styles.section}>
        <button
          onClick={() => setShowImportForm(!showImportForm)}
          style={styles.toggleButton}
        >
          {showImportForm ? '▼' : '▶'} Import Model from GitHub
        </button>

        {showImportForm && (
          <div style={styles.importForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Repository (owner/repo)</label>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value);
                  setImportError('');
                }}
                placeholder="e.g., your-org/custom-model"
                style={styles.input}
                disabled={importing}
              />
              <p style={styles.hint}>
                Repository must contain a <code>model-config.json</code> file in the root.
              </p>
            </div>

            {importError && (
              <div style={styles.error}>{importError}</div>
            )}

            <div style={styles.formFooter}>
              <button
                onClick={() => setShowImportForm(false)}
                style={styles.buttonSecondary}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImportModel}
                style={styles.buttonPrimary}
                disabled={importing || !importUrl.trim()}
              >
                {importing ? 'Importing...' : 'Import Model'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div style={styles.info}>
        <h4>How to Create a Custom Model</h4>
        <ol style={styles.infoList}>
          <li>Create a GitHub repository with a <code>model-config.json</code> file</li>
          <li>In your project, set <code>projectType: 'import'</code></li>
          <li>Add <code>gitHubImport</code> data when importing from that repo</li>
          <li>The simulator will fetch and cache the model</li>
        </ol>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginTop: '16px'
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  section: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e0e0e0'
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555'
  },
  empty: {
    fontSize: '12px',
    color: '#999',
    margin: 0
  },
  modelList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '8px'
  },
  modelItem: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modelName: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#333',
    marginBottom: '4px'
  },
  modelLabel: {
    fontSize: '12px',
    color: '#666'
  },
  modelSource: {
    fontSize: '11px',
    color: '#999'
  },
  details: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px'
  },
  detailRow: {
    marginBottom: '8px',
    fontSize: '13px'
  },
  deleteButton: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#ff6b6b',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  toggleButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left'
  },
  importForm: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    border: '1px solid #e0e0e0'
  },
  formGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  hint: {
    margin: '6px 0 0 0',
    fontSize: '11px',
    color: '#666'
  },
  error: {
    padding: '8px',
    backgroundColor: '#fee',
    border: '1px solid #f99',
    borderRadius: '4px',
    color: '#c33',
    fontSize: '12px',
    marginBottom: '12px'
  },
  formFooter: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  buttonPrimary: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  buttonSecondary: {
    padding: '8px 12px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  info: {
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    fontSize: '12px'
  },
  infoList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px'
  }
};
