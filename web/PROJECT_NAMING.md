# Project Naming Convention & Duplicate Prevention

## Overview

To prevent naming conflicts and ensure each project is uniquely identifiable, the app uses:

1. **Unique UUIDs** - Each project gets a fresh UUID when created or copied
2. **Automatic Duplicate Name Prevention** - When loading/saving projects, names are automatically made unique if conflicts exist
3. **Copy/Import Tracking** - Projects track their source environment and copy timestamp

## Naming Strategy

### When Creating a New Project
- Name is user-defined
- If a project with that exact name already exists in the current environment:
  - Auto-rename to `{Name} (2)`, `{Name} (3)`, etc.
  - User is notified of the rename

### When Loading from Another Environment
- Original project's name is used
- If a project with that name already exists in current environment:
  - Auto-rename to `{Original Name} (2)`, `{Original Name} (3)`, etc.
  - Metadata shows source: `📂 From: Mobile.Piano`
  - `copiedAt` timestamp records when it was imported
  - New UUID is assigned (prevents ID collisions)

### When Copying Within Same Environment
- Name format: `{Original Name} (copy)` or `{Original Name} (copy 2)` if copy already exists
- New UUID assigned
- Tracks that it's a copy of the original

## Unique Identifier System

### Project ID
```javascript
{
  id: "uuid-string",        // Always unique, regenerated on copy
  name: "My App",           // May be auto-renamed if duplicate
  loadedFrom: "Mobile.Piano", // Source environment.projectname (if imported)
  copiedAt: "ISO-timestamp", // When project was imported/copied
}
```

### Why New UUIDs on Copy?
- **Prevents collisions**: Each copy is a separate instance
- **Maintains history**: Original project unaffected
- **Clean references**: No shared ID conflicts across environments

## Storage & Saving

### Per-Environment Isolation
```javascript
// Data stored with environment key
localStorage.getItem(`${STORAGE_KEY}_${environment}`)
// e.g., "IOSPublisher_Mobile" or "IOSPublisher_default"
```

Each environment has its own project array. When loading projects:
1. Switch to source environment temporarily
2. Read its projects array
3. Return to current environment
4. Apply unique naming logic
5. Save with new UUID

### Save Flow with Duplicates

```javascript
// Load projects with automatic deduplication
const projects = [
  { id: "uuid1", name: "Piano" },
  { id: "uuid2", name: "Piano (2)" }  // Auto-renamed to prevent conflict
]

// Save (all projects stored together)
StorageManager.save({ projects, customFunctions, ... })
```

## Usage Examples

### Example 1: Loading "Piano" from Mobile environment
```
Current env: default
Projects: ["Calculator", "Piano"]

Load "Piano" from Mobile →
Auto-renamed to "Piano (2)"
```

### Example 2: Copy within same environment
```
Current env: default
Projects: ["MyApp"]

Copy "MyApp" →
Creates "MyApp (copy)" with new UUID
```

### Example 3: Import from different env
```
Default env projects: ["Piano", "Calculator"]
Mobile env projects: ["Piano"]

Load "Piano" from Mobile →
Auto-renamed to "Piano (2)"
Metadata shows: 📂 From: Mobile.Piano
New UUID prevents any ID conflicts
```

## API Reference

### ProjectNaming.getUniqueName(baseName, existingProjects)
Generates a unique name if duplicate exists
```javascript
// If "Piano" exists:
getUniqueName("Piano", projects) → "Piano (2)"

// If "Piano (2)" also exists:
getUniqueName("Piano", projects) → "Piano (3)"
```

### ProjectNaming.getCopyName(originalName, existingProjects)
Generates a copy name with automatic numbering
```javascript
getCopyName("MyApp", projects) → "MyApp (copy)"
getCopyName("MyApp (copy)", projects) → "MyApp (copy 2)"
```

### ProjectNaming.validateName(name)
Validates project name for issues
```javascript
validateName("My<Invalid>App") → { isValid: false, message: "..." }
validateName("Valid App Name") → { isValid: true, message: "Valid" }
```

## Implementation Checklist

- ✅ ProjectNaming utility created
- ✅ SimulatorTab integrated with naming logic
- ✅ Project IDs regenerated on load/copy
- ✅ Metadata tracked (loadedFrom, copiedAt)
- ⬜ Integrate into ProjectsTab.jsx (for manual creates)
- ⬜ Add validation to save forms
- ⬜ Add undo/rollback for auto-renamed projects (optional)

## Future Enhancements

1. **User notification**: Show dialog when auto-renaming instead of silent rename
2. **Rename management**: Allow users to view and manually rename duplicates
3. **Merge detection**: Warn if loading an identical project version
4. **History tracking**: Keep audit log of all project versions/copies
5. **Smart versioning**: Use semantic versioning (v1, v1.1, v2) instead of (copy)
