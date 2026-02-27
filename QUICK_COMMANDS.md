# Quick Commands Reference

## Mobile App (React Native)

### Development

```powershell
# Start Metro bundler (Terminal 1)
npm start

# Run on Android emulator/device (Terminal 2)
npm run android

# Run on iOS (macOS only)
npm run ios

# Lint code
npm run lint

# Run tests
npm test
```

### Build

```powershell
# Android APK (debug)
npm run android -- --variant=debug

# Android AAB (release)
npm run android -- --variant=release

# iOS (macOS)
npm run ios -- --configuration Release
```

---

## Web App

### First Time Setup

```powershell
cd web
npm install
```

### Development

```powershell
# Start dev server (auto-opens browser)
npm run dev

# Open at specific port
npm run dev -- --port 3001
```

### Production

```powershell
# Build for production
npm run build

# Preview build
npm run preview
```

---

## Testing Workflows

### Single Platform Testing

```powershell
# Mobile only
npm start          # Terminal 1
npm run android    # Terminal 2

# Web only
cd web
npm run dev        # Terminal 1 (browser opens automatically)
```

### Multi-Platform Testing

```powershell
# Terminal 1 - Metro bundler
npm start

# Terminal 2 - Mobile app
npm run android

# Terminal 3 - Web app
cd web && npm run dev

# Browser + App running simultaneously
```

---

## Data Management

### Export Projects (Browser Console)

```javascript
// Copy your projects
JSON.parse(localStorage.getItem("iosPublisherProjects"));

// Save to file or share
```

### Import Projects (Browser Console)

```javascript
// Paste your data
localStorage.setItem('iosPublisherProjects', JSON.stringify([...data...]))
location.reload()
```

### Reset All Data

```javascript
localStorage.removeItem("iosPublisherProjects");
location.reload();
```

---

## Debugging

### View App Logs

```powershell
# React Native Metro logs
npm start  # Shows all logs in terminal

# Watch for specific errors
npm start 2>&1 | grep "error"
```

### Clear Cache

```powershell
# React Native
npm start -- --reset-cache

# Web build
cd web && rm -r dist && npm run build
```

### Check Node Version

```powershell
node --version   # Should be 14+
npm --version    # Should be 6+
nvm list         # If using nvm-windows
```

---

## NPM Shortcuts

### Create Alias (Optional)

```powershell
# Add to PowerShell profile
New-Alias -Name rns -Value "npm start" -Force
New-Alias -Name rna -Value "npm run android" -Force

# Then use:
rns
rna
```

---

## Port Reference

- **3000** - Web app (http://localhost:3000)
- **3001** - Web app alternate (if 3000 taken)
- **8081** - React Native Metro bundler
- **5555** - Android emulator

---

## Common Issues & Fixes

### npm not found

```powershell
nvm use 20.10.0
npm --version
```

### Port already in use

```powershell
# Use different port
npm run dev -- --port 3001

# Or kill process on port
taskkill /F /IM node.exe
```

### Clear all caches

```powershell
# Node modules
rm -r node_modules
rm -r web\node_modules
npm install
cd web && npm install
```

### Reset everything

```powershell
# Start fresh
npm run android -- --reset-cache
cd web && npm run build
```

---

## File Structure Reference

```
IOSPublisherCompanion/
├── src/                           # React Native source
│   ├── screens/SimulatorScreen.tsx   # Multi-session simulator
│   └── ...other screens
├── web/                           # Web version
│   ├── src/
│   │   ├── tabs/                  # Tab components
│   │   ├── App.jsx                # Main app
│   │   └── index.css              # Styles
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── TESTING_GUIDE.md               # This file
└── package.json
```

---

## Next Feature Ideas

- [ ] Code syntax highlighting
- [ ] Project templates
- [ ] Export/import as ZIP
- [ ] Dark mode toggle
- [ ] PWA installation
- [ ] Cloud backup
- [ ] Team collaboration
- [ ] CI/CD integration

---

**Last Updated:** January 17, 2026
**Version:** 0.0.1

For detailed guides, see:

- `SETUP.md` - Development environment setup
- `TESTING_GUIDE.md` - Detailed testing workflows
- `web/README.md` - Web version documentation
