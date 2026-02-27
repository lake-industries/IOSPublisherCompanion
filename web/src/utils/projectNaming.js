/**
 * Project Naming Utility
 * Handles duplicate project names and generates unique identifiers
 */

export const ProjectNaming = {
  /**
   * Generate a unique project name if a duplicate exists
   * @param {string} baseName - The original project name
   * @param {Array} existingProjects - Array of existing projects in environment
   * @returns {string} - Unique project name
   */
  getUniqueName: (baseName, existingProjects = []) => {
    if (!existingProjects || existingProjects.length === 0) {
      return baseName
    }

    const existingNames = existingProjects.map(p => p.name.toLowerCase())
    
    // Check if exact name exists
    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName
    }

    // Find next available number
    let counter = 1
    let newName = `${baseName} (${counter})`
    
    while (existingNames.includes(newName.toLowerCase())) {
      counter++
      newName = `${baseName} (${counter})`
    }

    return newName
  },

  /**
   * Validate project name for issues
   * @param {string} name - Project name to validate
   * @returns {Object} - { isValid, message }
   */
  validateName: (name) => {
    if (!name || name.trim() === '') {
      return { isValid: false, message: 'Project name cannot be empty' }
    }
    if (name.length > 100) {
      return { isValid: false, message: 'Project name must be 100 characters or less' }
    }
    if (/[<>:"|?*]/.test(name)) {
      return { isValid: false, message: 'Project name contains invalid characters: < > : " | ? *' }
    }
    return { isValid: true, message: 'Valid' }
  },

  /**
   * Generate a copy name for a project
   * @param {string} originalName - Original project name
   * @param {Array} existingProjects - Array of existing projects
   * @returns {string} - New copy name
   */
  getCopyName: (originalName, existingProjects = []) => {
    // Remove existing copy suffix if present
    let baseName = originalName.replace(/ \(copy.*\)$/i, '').trim()
    const copyName = `${baseName} (copy)`
    
    return ProjectNaming.getUniqueName(copyName, existingProjects)
  },

  /**
   * Generate a name for imported project
   * @param {string} originalName - Original project name
   * @param {string} sourceEnv - Source environment name
   * @param {Array} existingProjects - Array of existing projects
   * @returns {string} - New import name
   */
  getImportName: (originalName, sourceEnv, existingProjects = []) => {
    // Don't add source suffix if already in same environment or if name already contains env reference
    if (originalName.includes(`(${sourceEnv})`)) {
      return ProjectNaming.getUniqueName(originalName, existingProjects)
    }

    const importName = `${originalName}`
    return ProjectNaming.getUniqueName(importName, existingProjects)
  },

  /**
   * Sanitize project name (remove/replace invalid characters)
   * @param {string} name - Project name to sanitize
   * @returns {string} - Sanitized name
   */
  sanitize: (name) => {
    return name
      .replace(/[<>:"|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  },

  /**
   * Generate a unique project ID (already in use, but for reference)
   * IDs are generated fresh when a project is copied to prevent collisions
   * @returns {string} - UUID-like ID
   */
  generateId: () => {
    return 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
  }
}

export default ProjectNaming
