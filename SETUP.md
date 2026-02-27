# React Native Project Setup Guide

This is a React Native CLI project for the iOS Publisher Companion app, designed as a cross-platform replacement for the SwiftUI iOS-only version.

## Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Install iOS Pod Dependencies

```bash
cd ios
pod install
cd ..
```

### 3. Start Development

**Terminal 1 - Start Metro Bundler:**

```bash
npm start
```

**Terminal 2 - Run on iOS Simulator:**

```bash
npm run ios
```

Or run on Android:

```bash
npm run android
```

## Project Structure

```
IOSPublisherCompanion/
├── src/
│   ├── App.tsx                 # Root app with tab navigation
│   ├── context/
│   │   └── ProjectContext.tsx  # State management for projects
│   ├── screens/
│   │   ├── ProjectsScreen.tsx      # Project list view
│   │   ├── ProjectDetailScreen.tsx # Project form (create/edit)
│   │   ├── CodeEditorScreen.tsx    # Code editor
│   │   └── PreviewScreen.tsx       # Project preview
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   └── utils/
│       └── uuid.ts             # UUID generation
├── ios/                         # iOS native code (generated)
├── android/                     # Android native code (generated)
├── package.json
├── tsconfig.json
├── .babelrc
└── index.js                    # Entry point
```

## Key Technologies

- **React Native 0.72.4**: Cross-platform mobile framework
- **React Navigation 6**: Tab-based navigation
- **AsyncStorage**: Local data persistence
- **TypeScript**: Type-safe development
- **Context API**: State management

## Features Implemented

✅ Tab navigation (Projects, Code Editor, Preview)
✅ Project CRUD operations
✅ Code editing and storage
✅ Project preview with details
✅ AsyncStorage persistence
✅ TypeScript throughout
✅ Error handling and validation

## Available Scripts

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run tests
npm test

# Lint code
npm run lint
```

## Important Notes

### Node/npm Environment

The Windows npm environment encountered issues with `npx react-native init`. If you experience similar issues:

1. **Clear npm cache:**

   ```bash
   npm cache clean --force
   ```

2. **Check Node version:**

   ```bash
   node --version
   ```

   (Requires Node 16+)

3. **Use Windows Subsystem for Linux (WSL2)** if issues persist:
   ```bash
   wsl --install
   wsl npm install
   ```

### CocoaPods (iOS)

If you encounter pod installation issues:

```bash
cd ios
pod repo update
pod install --repo-update
cd ..
```

### Metro Bundler Cache

If the app doesn't update changes:

```bash
npm start -- --reset-cache
```

## First Time Setup Checklist

- [ ] Node.js 16+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] iOS pods installed (`cd ios && pod install && cd ..`)
- [ ] Metro bundler running (`npm start`)
- [ ] iOS simulator/Android emulator open
- [ ] App running on device

## Testing the App

1. **Create a Project**
   - Go to "Projects" tab
   - Click "+ Add" button
   - Fill in: Name, Bundle ID, Team ID, Version
   - Tap "Create Project"

2. **Edit Code**
   - Go to "Code Editor" tab
   - Select a project from dropdown
   - Write Swift code in the editor
   - Tap "Save Code"

3. **View Preview**
   - Go to "Preview" tab
   - Select a project to view details and code

4. **Delete Project**
   - In "Projects" tab, tap "Delete" button on a project card
   - Confirm deletion

## Data Persistence

Projects are automatically saved to AsyncStorage:

- All changes persist across app restarts
- No backend server needed
- Data stored locally on device

Storage key: `@ios_publisher_projects`

## Next Steps

### 1. Run on Physical Devices

**iOS:**

```bash
npm run ios -- --device
# Or manually in Xcode
```

**Android:**

```bash
# Connect device via USB with debugging enabled
react-native run-android
```

### 2. Build for Distribution

**iOS (TestFlight):**

```bash
cd ios
fastlane build_and_upload_testflight
cd ..
```

**Android (Google Play):**

```bash
cd android
./gradlew bundleRelease
cd ..
```

### 3. Enhance Features

- [ ] Add syntax highlighting to code editor
- [ ] Implement code templates
- [ ] Add project export functionality
- [ ] Implement cloud sync (Firebase/Supabase)
- [ ] Add dark mode support
- [ ] Create custom app themes

### 4. CI/CD Setup

- [ ] GitHub Actions workflow for iOS builds
- [ ] TestFlight deployment automation
- [ ] Google Play Store deployment automation
- [ ] Automated testing on every commit

## Troubleshooting

### "Cannot find module" errors

```bash
npm install
npm start -- --reset-cache
```

### iOS build fails

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Android build fails

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### AsyncStorage not working

- Check that `@react-native-community/async-storage` is in node_modules
- Verify app permissions on device
- Check Android manifest or iOS permissions

## Resources

- [React Native Documentation](https://reactnative.dev)
- [React Navigation Docs](https://reactnavigation.org)
- [AsyncStorage Guide](https://react-native-async-storage.github.io/async-storage/)
- [TypeScript & React Native](https://reactnative.dev/docs/typescript)

## GitHub Actions (Coming Soon)

Templates for CI/CD workflows:

- iOS simulator builds on PR
- Android emulator tests on PR
- TestFlight deployment on release
- Google Play Store deployment on release

See the iOS version in the parent directory for reference workflows.

## GitHub Actions & CI/CD

✅ **GitHub Actions workflows are ready!**

Two automated workflows are configured:

1. **Android Build** (`.github/workflows/android-build.yml`)
   - Runs on Ubuntu
   - Builds debug APK and release AAB
   - Triggered on push to main/develop and PRs
   - Artifacts available for download

2. **iOS Build** (`.github/workflows/ios-build.yml`)
   - Runs on macOS
   - Builds and archives app
   - Triggered on push to main/develop and PRs
   - Archive available for TestFlight upload

**See [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md)** for:

- Setting up your GitHub repository
- Configuring repository secrets
- Downloading build artifacts
- Customizing workflows

**See [DEPLOYMENT.md](DEPLOYMENT.md)** for:

- Google Play Store deployment steps
- TestFlight/App Store deployment steps
- Local signing key generation
- GitHub Actions credential setup

## Support

If you encounter issues:

1. Check node_modules is clean (`rm -rf node_modules && npm install`)
2. Clear bundler cache (`npm start -- --reset-cache`)
3. Check React Native docs for platform-specific issues
4. Review error messages in Metro console

---

**Status:** React Native CLI project initialized with full TypeScript, navigation, and persistence setup.
**Reference Version:** See parent directory for original SwiftUI iOS implementation.
