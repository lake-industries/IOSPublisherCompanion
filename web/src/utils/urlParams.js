/**
 * URL parameter utilities for loading projects from URL
 */

/**
 * Get URL search parameters
 * @returns {URLSearchParams} Search parameters
 */
export const getUrlParams = () => {
  return new URLSearchParams(window.location.search);
};

/**
 * Get repository from URL parameter
 * @returns {Object|null} {owner, repo, branch} or null if not present
 */
export const getRepoFromUrl = () => {
  const params = getUrlParams();
  const repo = params.get('repo');
  const branch = params.get('branch');
  
  if (!repo) return null;
  
  const [owner, repoName] = repo.split('/');
  
  if (!owner || !repoName) return null;
  
  return {
    owner,
    repo: repoName,
    branch: branch || 'main'
  };
};

/**
 * Build URL with repository parameter
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (optional)
 * @returns {string} URL with repo parameter
 */
export const buildRepoUrl = (owner, repo, branch = 'main') => {
  const params = new URLSearchParams();
  params.set('repo', `${owner}/${repo}`);
  if (branch !== 'main') {
    params.set('branch', branch);
  }
  return `${window.location.pathname}?${params.toString()}`;
};

/**
 * Copy URL to clipboard
 * @param {string} url - URL to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyUrlToClipboard = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Failed to copy URL:', err);
    return false;
  }
};
