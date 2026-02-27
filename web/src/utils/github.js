/**
 * GitHub API utilities for fetching project files from repositories
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch raw file content from GitHub
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path (e.g., 'src/project.json')
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<string>} File content
 */
export const fetchGitHubFile = async (owner, repo, path, branch = 'main') => {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  
  return response.text();
};

/**
 * List files in a GitHub directory
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Directory path
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<Array>} Array of file objects
 */
export const listGitHubDirectory = async (owner, repo, path = '', branch = 'main') => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to list directory: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Get repository info
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository metadata
 */
export const getRepositoryInfo = async (owner, repo) => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Repository not found: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Parse repository URL to owner and repo name
 * @param {string} url - GitHub URL or owner/repo format
 * @returns {Object} {owner, repo, branch}
 */
export const parseGitHubUrl = (url) => {
  url = url.trim();
  
  // Handle full GitHub URL
  if (url.includes('github.com')) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/([^\/]+))?/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace('.git', ''),
        branch: match[4] || 'main'
      };
    }
  }
  
  // Handle owner/repo format
  if (url.includes('/')) {
    const [owner, repoWithBranch] = url.split('/');
    const [repo, branch] = repoWithBranch.split('@');
    return {
      owner,
      repo,
      branch: branch || 'main'
    };
  }
  
  throw new Error('Invalid GitHub URL format. Use: owner/repo or https://github.com/owner/repo');
};

/**
 * Import project from GitHub
 * Looks for app.json or project.json in the repo root
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<Object>} Project object
 */
export const importProjectFromGitHub = async (owner, repo, branch = 'main') => {
  try {
    // Try to fetch app.json first, then project.json
    let projectData;
    let projectFile = 'app.json';
    
    try {
      const content = await fetchGitHubFile(owner, repo, 'app.json', branch);
      projectData = JSON.parse(content);
    } catch (e) {
      projectFile = 'project.json';
      const content = await fetchGitHubFile(owner, repo, 'project.json', branch);
      projectData = JSON.parse(content);
    }
    
    // Get repository info for metadata
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    // Merge GitHub repo info with project data
    return {
      ...projectData,
      name: projectData.name || repoInfo.name,
      description: projectData.description || repoInfo.description,
      bundleId: projectData.bundleId || `com.github.${owner}.${repo}`,
      version: projectData.version || repoInfo.tag_name || '1.0.0',
      sourceRepo: `${owner}/${repo}`,
      sourceBranch: branch,
      sourceUrl: repoInfo.html_url
    };
  } catch (error) {
    throw new Error(`Failed to import project from GitHub: ${error.message}`);
  }
};

/**
 * Search for projects in a GitHub repo by looking for project files
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<Array>} Array of found project files
 */
export const searchProjectFilesInRepo = async (owner, repo, branch = 'main') => {
  const files = [];
  
  try {
    const contents = await listGitHubDirectory(owner, repo, '', branch);
    
    for (const item of contents) {
      if ((item.name === 'app.json' || item.name === 'project.json') && item.type === 'file') {
        files.push({
          name: item.name,
          path: item.path,
          url: item.html_url
        });
      }
    }
  } catch (error) {
    console.warn('Could not search repo files:', error);
  }
  
  return files;
};

/**
 * Fetch model configuration from GitHub
 * Looks for model-config.json in the repo root
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<Object>} Model configuration
 */
export const fetchModelFromGitHub = async (owner, repo, branch = 'main') => {
  try {
    const content = await fetchGitHubFile(owner, repo, 'model-config.json', branch);
    const modelConfig = JSON.parse(content);
    
    // Add source information
    return {
      ...modelConfig,
      sourceRepo: `${owner}/${repo}`,
      sourceBranch: branch,
      sourceUrl: `https://github.com/${owner}/${repo}`,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to fetch model from GitHub: ${error.message}`);
  }
};

/**
 * Search for model file in GitHub repo
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<boolean>} True if model-config.json exists
 */
export const hasModelInRepo = async (owner, repo, branch = 'main') => {
  try {
    await fetchGitHubFile(owner, repo, 'model-config.json', branch);
    return true;
  } catch (error) {
    return false;
  }
};

