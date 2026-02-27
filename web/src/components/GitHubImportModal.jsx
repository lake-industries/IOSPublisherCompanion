import React, { useState } from 'react';
import { importProjectFromGitHub, parseGitHubUrl, searchProjectFilesInRepo, fetchModelFromGitHub } from '../utils/github';
import { generateUUID } from '../utils/uuid';

export default function GitHubImportModal({ isOpen, onClose, onImport }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectPreview, setProjectPreview] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [importMode, setImportMode] = useState('single'); // 'single' or 'multiple'

  const handleImport = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError('');
    setProjectPreview(null);
    setAvailableProjects([]);
    setSelectedProjects(new Set());

    try {
      const { owner, repo, branch } = parseGitHubUrl(repoUrl);
      
      // Try to fetch model-config.json first (multiple projects)
      try {
        const modelConfig = await fetchModelFromGitHub(owner, repo, branch);
        
        if (modelConfig.projects && modelConfig.projects.length > 0) {
          // Multiple projects mode
          setImportMode('multiple');
          setAvailableProjects(modelConfig.projects.map((p, idx) => ({
            ...p,
            _id: p.type || `project-${idx}`,
            owner,
            repo,
            branch
          })));
          return;
        }
      } catch (e) {
        // Not a multi-project repo, try single project import
      }

      // Single project mode
      setImportMode('single');
      
      // Search for project files
      const projectFiles = await searchProjectFilesInRepo(owner, repo, branch);
      
      if (projectFiles.length === 0) {
        setError(`No app.json, project.json, or model-config.json found in ${owner}/${repo}`);
        setLoading(false);
        return;
      }

      // Import the single project
      const projectData = await importProjectFromGitHub(owner, repo, branch);
      
      // Add required fields
      const importedProject = {
        id: generateUUID(),
        ...projectData,
        createdAt: new Date().toISOString(),
        gitHubImport: {
          owner,
          repo,
          branch,
          importedAt: new Date().toISOString()
        }
      };

      setProjectPreview(importedProject);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelection = (projectId) => {
    const updated = new Set(selectedProjects);
    if (updated.has(projectId)) {
      updated.delete(projectId);
    } else {
      updated.add(projectId);
    }
    setSelectedProjects(updated);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === availableProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(availableProjects.map(p => p._id)));
    }
  };

  const handleConfirmMultiImport = () => {
    const selected = availableProjects.filter(p => selectedProjects.has(p._id));
    
    selected.forEach(project => {
      const importedProject = {
        id: generateUUID(),
        name: project.label || project.name,
        description: project.description || '',
        bundleId: project.bundleId || `com.github.${project.owner}.${project.repo}`,
        version: project.version || '1.0.0',
        code: project.componentCode || '',
        createdAt: new Date().toISOString(),
        gitHubImport: {
          owner: project.owner,
          repo: project.repo,
          branch: project.branch,
          importedAt: new Date().toISOString(),
          projectType: project.type
        }
      };
      
      onImport(importedProject);
    });

    resetModal();
  };

  const handleConfirmImport = () => {
    if (projectPreview) {
      onImport(projectPreview);
      resetModal();
    }
  };

  const resetModal = () => {
    setRepoUrl('');
    setError('');
    setProjectPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import Project from GitHub</h2>
          <button
            onClick={resetModal}
            style={styles.closeButton}
          >
            ✕
          </button>
        </div>

        {!projectPreview && availableProjects.length === 0 ? (
          <div style={styles.content}>
            <div style={styles.section}>
              <label style={styles.label}>Repository URL or owner/repo</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setError('');
                }}
                placeholder="e.g., owner/repo or https://github.com/owner/repo"
                style={styles.input}
                disabled={loading}
              />
              <p style={styles.hint}>
                Enter a GitHub repository URL or owner/repo format. The repo must contain app.json, project.json, or model-config.json.
              </p>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            <div style={styles.footer}>
              <button
                onClick={resetModal}
                style={styles.buttonSecondary}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                style={styles.buttonPrimary}
                disabled={loading || !repoUrl.trim()}
              >
                {loading ? 'Loading...' : 'Load Project'}
              </button>
            </div>
          </div>
        ) : importMode === 'multiple' && availableProjects.length > 0 ? (
          <div style={styles.content}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Select Projects to Import ({selectedProjects.size} of {availableProjects.length})
              </h3>
              <p style={styles.hint}>
                Found {availableProjects.length} project(s) in model-config.json. Select which ones to import.
              </p>
            </div>

            <div style={styles.projectList}>
              <div style={styles.selectAllRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedProjects.size === availableProjects.length && availableProjects.length > 0}
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                  />
                  <span>Select All ({availableProjects.length})</span>
                </label>
              </div>

              {availableProjects.map((project) => (
                <div key={project._id} style={styles.projectItem}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project._id)}
                      onChange={() => handleProjectSelection(project._id)}
                      style={styles.checkbox}
                    />
                    <div style={styles.projectInfo}>
                      <strong>{project.label || project.name}</strong>
                      {project.description && (
                        <p style={styles.projectDesc}>{project.description}</p>
                      )}
                      <p style={styles.projectMeta}>
                        Type: {project.type} • Version: {project.version || '1.0.0'}
                      </p>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div style={styles.footer}>
              <button
                onClick={() => {
                  setProjectPreview(null);
                  setAvailableProjects([]);
                  setSelectedProjects(new Set());
                }}
                style={styles.buttonSecondary}
              >
                Back
              </button>
              <button
                onClick={handleConfirmMultiImport}
                style={{
                  ...styles.buttonPrimary,
                  opacity: selectedProjects.size === 0 ? 0.5 : 1,
                  cursor: selectedProjects.size === 0 ? 'not-allowed' : 'pointer'
                }}
                disabled={selectedProjects.size === 0}
              >
                Import Selected ({selectedProjects.size})
              </button>
            </div>
          </div>
        ) : projectPreview ? (
          <div style={styles.content}>
            <div style={styles.preview}>
              <h3 style={styles.previewTitle}>Project Preview</h3>
              <div style={styles.previewItem}>
                <strong>Name:</strong> {projectPreview.name}
              </div>
              {projectPreview.description && (
                <div style={styles.previewItem}>
                  <strong>Description:</strong> {projectPreview.description}
                </div>
              )}
              <div style={styles.previewItem}>
                <strong>Bundle ID:</strong> {projectPreview.bundleId}
              </div>
              <div style={styles.previewItem}>
                <strong>Version:</strong> {projectPreview.version}
              </div>
              {projectPreview.sourceRepo && (
                <div style={styles.previewItem}>
                  <strong>Source:</strong> 
                  <a 
                    href={projectPreview.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {projectPreview.sourceRepo}
                  </a>
                </div>
              )}
              {projectPreview.code && (
                <div style={styles.previewItem}>
                  <strong>Code Preview:</strong>
                  <pre style={styles.codePreview}>
                    {projectPreview.code.substring(0, 200)}
                    {projectPreview.code.length > 200 ? '...' : ''}
                  </pre>
                </div>
              )}
            </div>

            <div style={styles.footer}>
              <button
                onClick={() => setProjectPreview(null)}
                style={styles.buttonSecondary}
              >
                Back
              </button>
              <button
                onClick={handleConfirmImport}
                style={styles.buttonPrimary}
              >
                Import Project
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    padding: '20px'
  },
  section: {
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d0d0d0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#666',
    margin: '8px 0 0 0'
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    border: '1px solid #f99',
    borderRadius: '6px',
    color: '#c33',
    marginBottom: '16px',
    fontSize: '14px'
  },
  projectList: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '16px',
    overflow: 'hidden'
  },
  selectAllRow: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center'
  },
  projectItem: {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'flex-start',
    ':last-child': {
      borderBottom: 'none'
    }
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    flex: 1
  },
  checkbox: {
    marginTop: '4px',
    cursor: 'pointer',
    width: '18px',
    height: '18px'
  },
  projectInfo: {
    flex: 1
  },
  projectDesc: {
    margin: '4px 0',
    fontSize: '12px',
    color: '#666'
  },
  projectMeta: {
    margin: '4px 0 0 0',
    fontSize: '11px',
    color: '#999'
  },
  preview: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  previewTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  previewItem: {
    marginBottom: '8px',
    fontSize: '13px',
    color: '#555'
  },
  codePreview: {
    marginTop: '4px',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '100px',
    border: '1px solid #ddd'
  },
  link: {
    color: '#0366d6',
    textDecoration: 'none',
    marginLeft: '8px'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid #e0e0e0',
    padding: '16px',
    backgroundColor: '#fafafa'
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};
