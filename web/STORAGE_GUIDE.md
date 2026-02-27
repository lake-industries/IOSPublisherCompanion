# Storage & Data Management Guide

## Overview

The iOS Publisher Companion now includes a comprehensive storage system with multiple backend options, automatic backups, and import/export functionality.

## Features

### 1. Multiple Storage Backends

Choose where your data is stored:

- **localStorage** (Default) - 5-10 MB, persists across browser sessions
- **sessionStorage** - 5-10 MB, persists only during current session
- **IndexedDB** - Browser quota (typically 50+ MB), best for large datasets

### 2. Backup & Restore

- **Export Backup**: Download all your projects and functions as a JSON file
- **Import Backup**: Load previously exported data files
- **Restore Backup**: Recover from automatic localStorage backup

### 3. Auto-Backup System

- Automatically saves backup copy to localStorage
- Acts as fallback if primary storage fails
- Enable/disable in Storage Settings

### 4. Data Management

- View current data stats (projects, custom functions)
- Clear all data (with confirmation dialog)
- Monitor storage usage and limits

## How to Use

### Switching Storage Backend

1. Go to **Storage** tab (last tab in navigation)
2. Under "Storage Backend" section, click your preferred backend
3. Data automatically migrates to new backend

### Exporting Data

1. Click **📥 Export Backup** button
2. A JSON file downloads automatically
3. Keep this safe for backup/sharing

### Importing Data

1. Click **📤 Import Backup** button
2. Select a previously exported JSON file
3. Data loads and merges with current storage

### Enabling Auto-Backup

1. Under "Backup & Restore" section
2. Check "Enable automatic backups to browser"
3. Backup automatically saves to localStorage

### Restoring from Backup

1. Click **🔄 Restore Backup** button
2. Latest backup is restored if available

## Storage Specifications

| Backend        | Size Limit | Persistence          | Speed    | Use Case                       |
| -------------- | ---------- | -------------------- | -------- | ------------------------------ |
| localStorage   | 5-10 MB    | Cross-session        | Fast     | Default, small-medium projects |
| sessionStorage | 5-10 MB    | Current session only | Fast     | Temporary work, scratch space  |
| IndexedDB      | 50+ MB     | Cross-session        | Moderate | Large datasets, many projects  |

## Data Structure

Exported/imported data includes:

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My App",
      "bundleId": "com.example.app",
      "projectType": "Standard App",
      "description": "...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "customFunctions": [
    {
      "id": "uuid",
      "name": "myFunction",
      "description": "...",
      "code": "...",
      "language": "javascript",
      "status": "active",
      "routeTo": "local",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "exportDate": "2024-01-01T00:00:00Z",
  "appVersion": "1.0"
}
```

## Best Practices

1. **Regular Backups**: Export data monthly or before major changes
2. **Backend Selection**: Use localStorage for casual use, IndexedDB for production
3. **Test Imports**: Test import functionality on test data first
4. **Backup Storage**: Keep exported files in cloud storage (Google Drive, OneDrive, etc.)
5. **Auto-Backup**: Always enable auto-backup as safety net

## Troubleshooting

### "Failed to load data" message

- Check browser storage settings/permissions
- Try switching to different backend
- Restore from backup if available

### Storage limits exceeded

- Switch to IndexedDB for larger capacity
- Export and delete old projects
- Clear browser cache/cookies

### Import fails

- Ensure JSON file is valid (not corrupted)
- Check file comes from this app
- Try in different browser if persistent

## API Reference

If extending functionality, use `StorageManager`:

```javascript
import { StorageManager } from "./utils/storage";

// Save data
await StorageManager.save({ projects, customFunctions });

// Load data
const data = await StorageManager.load();

// Switch backend
StorageManager.setBackend("indexedDB");

// Get storage info
const info = await StorageManager.getStorageInfo();

// Export to file
StorageManager.exportToFile(data, "backup.json");

// Import from file
const imported = await StorageManager.importFromFile(fileObject);

// Clear all data
await StorageManager.clear();
```

## Version Info

- Storage Manager v1.0
- Last Updated: 2024
- Supported Backends: 3 (localStorage, sessionStorage, IndexedDB)
