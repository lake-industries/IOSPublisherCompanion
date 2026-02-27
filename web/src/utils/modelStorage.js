/**
 * Model storage and registry management
 * Handles loading models from local storage, hardcoded registry, and GitHub repos
 */

const MODELS_STORAGE_KEY = 'iosPublisherCompanion_models';

/**
 * Get all cached models from local storage
 * @returns {Object} Map of modelType -> modelConfig
 */
export const getCachedModels = () => {
  try {
    const stored = localStorage.getItem(MODELS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load cached models:', error);
    return {};
  }
};

/**
 * Save model to local storage cache
 * @param {string} modelType - Type identifier for the model
 * @param {Object} modelConfig - Model configuration object
 */
export const saveModelToCache = (modelType, modelConfig) => {
  try {
    const cached = getCachedModels();
    cached[modelType] = {
      ...modelConfig,
      cachedAt: new Date().toISOString()
    };
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache model:', error);
  }
};

/**
 * Get model config from cache
 * @param {string} modelType - Type identifier
 * @returns {Object|null} Model config or null if not found
 */
export const getCachedModel = (modelType) => {
  const cached = getCachedModels();
  return cached[modelType] || null;
};

/**
 * Delete model from cache
 * @param {string} modelType - Type identifier
 */
export const deleteCachedModel = (modelType) => {
  try {
    const cached = getCachedModels();
    delete cached[modelType];
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to delete cached model:', error);
  }
};

/**
 * List all cached models with metadata
 * @returns {Array} Array of {type, config}
 */
export const listCachedModels = () => {
  const cached = getCachedModels();
  return Object.entries(cached).map(([type, config]) => ({
    type,
    config,
    label: config.label || type,
    source: config.sourceRepo || 'local'
  }));
};

/**
 * Clear all cached models
 */
export const clearModelCache = () => {
  try {
    localStorage.removeItem(MODELS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear model cache:', error);
  }
};
