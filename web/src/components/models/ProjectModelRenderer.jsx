import React from 'react'
import SolarPanelModel from './SolarPanelModel'

// Registry of project type models
const PROJECT_MODELS = {
  'solar-panel': {
    name: 'Solar Panel',
    component: SolarPanelModel,
    description: 'Interactive solar panel efficiency modeling'
  },
  'piano': {
    name: 'Piano Synth',
    component: null, // Can add later
    description: 'Music synthesis and looping'
  },
}

// Component to render the appropriate model based on project type
export default function ProjectModelRenderer({ project }) {
  if (!project) return null

  const projectType = project.projectType || 'default'
  const model = PROJECT_MODELS[projectType]

  if (!model || !model.component) {
    return null
  }

  const ModelComponent = model.component
  return <ModelComponent project={project} />
}

export { PROJECT_MODELS }
