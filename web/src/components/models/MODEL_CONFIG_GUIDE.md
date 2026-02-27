# Custom Model Configuration

This document describes how to create a custom project model for the iOS Publisher Companion simulator.

## Overview

Models are React components that render custom visualizations in the Preview tab. You can create custom models and import them from GitHub repositories.

## File Structure

Your GitHub repository should contain:

```
your-repo/
├── model-config.json      # Model configuration (required)
├── model-component.jsx    # Model React component (optional)
└── README.md
```

## model-config.json Format

```json
{
  "type": "your-model-type",
  "label": "Your Model Display Name",
  "description": "What this model does",
  "version": "1.0.0",
  "componentName": "YourModelComponent",
  "componentCode": "// React component code here"
}
```

### Required Fields

| Field           | Type   | Description                                              |
| --------------- | ------ | -------------------------------------------------------- |
| `type`          | string | Unique identifier for the model (e.g., 'energy-tracker') |
| `label`         | string | Human-readable name                                      |
| `componentCode` | string | JSX/React component code (multiline)                     |

### Optional Fields

| Field         | Type   | Description                        |
| ------------- | ------ | ---------------------------------- |
| `description` | string | Description of what the model does |
| `version`     | string | Version number                     |
| `author`      | string | Model creator                      |
| `repository`  | string | Repository URL                     |
| `props`       | object | Expected props documentation       |

## Example: Energy Tracker Model

**model-config.json:**

```json
{
  "type": "energy-tracker",
  "label": "Energy Tracker",
  "description": "Real-time energy consumption and generation tracking",
  "version": "1.0.0",
  "componentCode": "export default function EnergyTracker({ project }) {\n  const [consumption, setConsumption] = React.useState(0);\n  return (\n    <div style={{ padding: '20px' }}>\n      <h3>Energy Tracker</h3>\n      <p>Current Consumption: {consumption}W</p>\n      <input type=\"range\" min=\"0\" max=\"5000\" value={consumption} onChange={(e) => setConsumption(parseInt(e.target.value))} />\n    </div>\n  );\n}"
}
```

## Importing Custom Models

### Method 1: Model Manager (UI)

1. Open the Model Manager in Storage Settings
2. Click "Import Model from GitHub"
3. Enter `owner/repo`
4. Model is cached and ready to use

### Method 2: Manual Import

Create a project with:

```json
{
  "name": "My App with Custom Model",
  "projectType": "import",
  "gitHubImport": {
    "owner": "your-username",
    "repo": "your-model-repo",
    "branch": "main"
  },
  "code": "// Your app code"
}
```

## Using Imported Models

Once imported, use in projects:

```json
{
  "name": "My Project",
  "projectType": "energy-tracker",
  "code": "const trackUsage = () => console.log('Tracking...');"
}
```

## Component Requirements

Your model component receives:

```javascript
export default function YourModel({ project }) {
  // project object contains:
  // - name: string
  // - description: string
  // - code: string
  // - bundleId: string
  // - version: string
  // - gitHubImport: { owner, repo, branch }
  // - customData: any additional fields

  return <div>{/* Your model UI here */}</div>;
}
```

## Best Practices

1. **Keep It Self-Contained**: All code should be in the `componentCode` field
2. **Use React.useState/useEffect**: Available as global `React`
3. **Responsive Design**: Works on different screen sizes
4. **Error Handling**: Gracefully handle missing data
5. **Performance**: Minimize re-renders with `React.memo`

## Example: Data Visualization Model

```json
{
  "type": "data-visualizer",
  "label": "Data Visualizer",
  "description": "Interactive data charts and graphs",
  "componentCode": "export default function DataVisualizer({ project }) {\n  const data = project.code ? JSON.parse(project.code) : {};\n  \n  return (\n    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>\n      <h3>Data Visualization</h3>\n      <div style={{\n        display: 'grid',\n        gridTemplateColumns: 'repeat(3, 1fr)',\n        gap: '12px'\n      }}>\n        {Object.entries(data).map(([key, value]) => (\n          <div key={key} style={{\n            padding: '12px',\n            backgroundColor: '#f0f0f0',\n            borderRadius: '6px',\n            textAlign: 'center'\n          }}>\n            <div style={{ fontSize: '12px', color: '#666' }}>{key}</div>\n            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value}</div>\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}"
}
```

## Sharing Models

1. Push your model repository to GitHub
2. Create a shareable link: `https://your-simulator.com?repo=owner/repo-model`
3. Share in documentation or GitHub badges:

```markdown
[Test with Custom Model](https://your-simulator.com?repo=owner/model-repo)
```

## Troubleshooting

### Model Not Loading

- Check `model-config.json` exists in root
- Verify JSON syntax is valid
- Ensure `type` field is present and unique

### Component Not Rendering

- Check JSX syntax is correct
- Verify React imports (use global `React`)
- Check browser console for errors

### Props Missing

- Project object always passed as `project` prop
- Access via `project.name`, `project.code`, etc.

## Advanced: Component Factory

For complex models, consider creating a component factory pattern:

```json
{
  "type": "advanced-model",
  "componentCode": "const React = window.React || require('react');\n\nconst ModelFactory = (props) => {\n  const [state, setState] = React.useState({});\n  \n  React.useEffect(() => {\n    // Initialize from project data\n  }, []);\n  \n  return <div>Advanced Model</div>;\n};\n\nexport default ModelFactory;"
}
```

## Contributing Models

Want to share your model? Submit a pull request to the main simulator repository with your model in the `/models` directory!
