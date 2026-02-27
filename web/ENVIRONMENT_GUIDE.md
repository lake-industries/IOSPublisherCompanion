# Environment Management Guide

## Overview

Environments allow you to organize and switch between different sets of projects and tasks. Each environment is completely isolated - projects and tasks in one environment won't appear in another.

## Use Cases

### Development Workflows

- **"Mobile"** - Projects for mobile app development
- **"Web"** - Projects for web app development
- **"VST"** - Audio plugin projects
- **"Testing"** - Experimental projects and features

### Client Projects

- **"Client-A"** - All projects for Client A
- **"Client-B"** - All projects for Client B
- **"Internal"** - Internal company projects

### Project Phases

- **"Development"** - Active work in progress
- **"Review"** - Code review and QA phase
- **"Production"** - Released/deployed projects
- **"Archive"** - Old, completed projects

## How to Use

### Create New Environment

1. Go to **Storage** tab
2. Under "🌍 Environments" section, click **+ New Environment**
3. Enter a unique name (e.g., "Mobile Development")
4. Click **Create**

### Switch Environments

- Click the environment button to switch
- Current environment is highlighted in blue with ✓
- All projects and tasks automatically load for that environment

### Delete Environment

- Click the **✕** button next to any environment (except "default")
- Confirm deletion
- All data in that environment is permanently deleted
- Cannot delete the "default" environment (safety feature)

### Example Workflow

```
1. Create environment: "Web Development"
2. Add 5 web projects and 10 custom functions
3. Work on projects...
4. Create environment: "VST Plugins"
5. Add 3 audio plugin projects
6. Click "VST Plugins" → see only VST projects
7. Click "Web Development" → see web projects again
8. Each environment remembers its state
```

## Technical Details

### How Environments Work

- Each environment has its own storage key
- When you switch environments, the app loads that environment's data
- Data is saved separately per environment
- Switching doesn't affect other environments
- All environments use the same storage backend (localStorage, IndexedDB, etc.)

### Storage Structure

```
localStorage:
  iosPublisherData_default → { projects: [...], customFunctions: [...] }
  iosPublisherData_Mobile → { projects: [...], customFunctions: [...] }
  iosPublisherData_VST → { projects: [...], customFunctions: [...] }
  iosPublisherEnvironments → ["default", "Mobile", "VST"]
  iosPublisherCurrentEnv → "Mobile"
```

### Backend Support

- **localStorage**: Each environment stored separately, 5-10 MB per environment
- **sessionStorage**: Each environment stored separately, per-session only
- **IndexedDB**: All environments in one database, no per-environment size limit

## Features per Environment

Each environment independently stores:

- ✓ Projects (name, bundle ID, type, description)
- ✓ Custom Functions (code, language, routing endpoints)
- ✓ Simulator sessions and state
- ✓ Piano projects (if created)
- ✓ Last save timestamp

## Best Practices

### Naming Conventions

- Use clear, descriptive names
- Examples: "iOS-Apps", "Web-Dev", "Music-VST", "Client-2024"
- Avoid special characters (@, #, /, \)
- Keep names under 20 characters for readability

### Organization Strategy

```
Option 1: By Project Type
- Standard Apps
- Audio Music
- Games
- Tools
- VST Plugins

Option 2: By Client
- Internal
- Client ABC
- Client XYZ

Option 3: By Phase
- Active Development
- Code Review
- Production
- Archive

Option 4: By Technology
- React Native
- Web (Vite)
- Swift
- Kotlin
```

### Backup Strategy

- Each environment can be exported separately
- Export before switching major environments
- Keep backups named by environment
- Example: `env-backup-Mobile-2024-01-17.json`

## Exporting Environment Data

### Export Single Environment

1. Switch to desired environment
2. Go to Storage tab
3. Click **📥 Export Backup**
4. File name includes current environment
5. Save to backup location

### Export All Environments (Manual)

1. For each environment:
   - Switch to it
   - Export backup
   - Rename file with environment name

## Importing to Different Environment

1. Switch to target environment
2. Click **📤 Import Backup**
3. Select JSON file from different environment
4. Data imports to current environment
5. Original environment data unchanged

## Advanced: Cloning Environment

1. Go to environment you want to clone
2. Click **📥 Export Backup**
3. Create new environment with new name
4. Switch to new environment
5. Click **📤 Import Backup** and select exported file
6. Both environments now have same data

## Common Tasks

### Task: Move Project to Different Environment

1. Export current environment
2. Edit JSON file manually (optional, for verification)
3. Switch to target environment
4. Import the JSON file
5. Delete unnecessary projects from old environment

### Task: Compare Two Environments

1. Export environment A
2. Export environment B
3. Open both JSON files in text editor
4. Compare project lists and functions

### Task: Merge Environments

1. Export both environments
2. Create new "merged" environment
3. Import first environment
4. Manually add/copy missing projects from second
5. Or import second and verify for duplicates

### Task: Create Development Snapshot

1. Go to environment you're working in
2. Create new environment: "dev-snapshot-Jan-17"
3. Export it as backup
4. Continue work in original environment
5. Have snapshot if anything goes wrong

## Troubleshooting

### "Environment already exists"

- Choose a different name
- Or delete the existing environment if you don't need it

### "Cannot delete default environment"

- Default is required; you cannot remove it
- Switch to default first, then try deleting another environment

### Projects disappeared after switching environments

- Check which environment is currently active (blue with ✓)
- Switch to the correct environment
- If still missing, check if environment has projects by exporting

### Can't see imported data

- Verify import completed (check message)
- Data imports to current environment
- Check that you imported to correct environment
- All imported data replaces current environment data

### Need to recover deleted environment

- Use restore backup if auto-backup is enabled
- Restore from exported JSON file (if you have one)
- Cannot recover without backup

## Version Info

- Environment Manager v1.0
- Added to StorageManager
- Integrated with all storage backends
- Last Updated: 2024
