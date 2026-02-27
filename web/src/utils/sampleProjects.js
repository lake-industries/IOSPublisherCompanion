// Sample projects that can be loaded into the simulator
export const SAMPLE_PROJECTS = {
  solarPanelApp: {
    name: 'Solar Panel Efficiency Model',
    bundleId: 'com.solar.panel.model',
    version: '1.0.0',
    projectType: 'solar-panel',
    code: `// Solar Panel Modeling App
// Add UI elements to render controls in code tab:
// ui:slider - for angle adjustment
// ui:counter - for power metrics

const calculatePanelEfficiency = (angle, intensity, temperature) => {
  const angleEfficiency = Math.cos((angle - 45) * (Math.PI / 180)) * 100;
  const tempFactor = Math.max(0, 100 - (temperature - 25) * 0.5);
  return (angleEfficiency * intensity * tempFactor) / 10000;
};

// Optimal configuration:
// - Panel angle: 45°
// - Sun intensity: 100%
// - Temperature: 25°C
// - Maximum efficiency: 100%`,
    description: 'Interactive solar panel efficiency modeling system with real-time calculations'
  },

  dataVisualization: {
    name: 'Energy Output Tracker',
    bundleId: 'com.solar.tracker',
    version: '1.0.0',
    projectType: 'solar-panel',
    code: `// Energy tracking application
// Monitors solar panel output over time
// ui:card
// ui:form
// ui:slider

const trackEnergyProduction = (hour) => {
  const sunPosition = Math.sin((hour - 6) * (Math.PI / 12));
  const baseEnergy = Math.max(0, sunPosition) * 400;
  return baseEnergy;
};

// Daily production pattern follows sun arc
// Peak output at solar noon`,
    description: 'Track and visualize daily solar energy production'
  }
}
