# iOS Publisher Companion - React Native

A **cross-platform (iOS & Android)** React Native application for managing iOS app projects and editing code.

[![Android Build](https://img.shields.io/badge/Android-Build-blue?style=flat-square)](https://github.com/YOUR_USERNAME/IOSPublisherCompanion/actions)
[![iOS Build](https://img.shields.io/badge/iOS-Build-gray?style=flat-square)](https://github.com/YOUR_USERNAME/IOSPublisherCompanion/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)

---

## 🎯 Features

✨ **Project Management**

- Create, edit, and delete iOS app projects
- Store project details: name, bundle ID, team ID, version
- Automatic persistence via AsyncStorage

💻 **Code Editor**

- Edit Swift code for each project
- Real-time code editing
- Persistent storage of code changes

👁️ **Preview**

- View project details and metadata
- Code preview with line numbers
- Creation and modification dates

📱 **Cross-Platform**

- Native iOS and Android apps from single codebase
- iOS 12.0+ and Android API 21+
- Full TypeScript support

🚀 **CI/CD Ready**

- GitHub Actions workflows for automated builds
- APK and AAB builds for Android
- Archive builds for iOS TestFlight

---

## 📋 Quick Start

### Prerequisites

- **Node.js** 20.10.0+ ([Download](https://nodejs.org/))
- **npm** 10.2.3+ (included with Node.js)
- **Android Emulator/Device** (for Android testing)
- **Mac with Xcode** (for iOS testing)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start Metro bundler
npm start

# 3. In another terminal, run on Android
npm run android

# Or run on iOS (Mac only)
npm run ios
```

Once the app is running:

1. Go to **Projects** tab
2. Tap **+ Add** to create a new project
3. Fill in project details
4. Go to **Code** tab to edit code
5. Go to **Preview** tab to view details

**Data automatically persists** — create a project and restart the app to verify!

---

## 📚 Documentation

| Document                                     | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| **[SETUP.md](SETUP.md)**                     | Development setup, configuration, troubleshooting |
| **[DEPLOYMENT.md](DEPLOYMENT.md)**           | Google Play & App Store deployment guide          |
| **[GITHUB_ACTIONS.md](GITHUB_ACTIONS.md)**   | CI/CD configuration and secrets setup             |
| **[ARCHITECTURE.md](ARCHITECTURE.md)**       | Data flow diagrams and component structure        |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Project overview and next steps                   |
| **[CHECKLIST.md](CHECKLIST.md)**             | Development & deployment checklist                |

---

## 🏗️ Project Structure

```
IOSPublisherCompanion/
├── src/
│   ├── App.tsx                    # Root navigation & app entry
│   ├── context/
│   │   └── ProjectContext.tsx     # State management with Context API
│   ├── screens/
│   │   ├── ProjectsScreen.tsx     # Project list view
│   │   ├── ProjectDetailScreen.tsx # Project creation/editing
│   │   ├── CodeEditorScreen.tsx   # Code editing interface
│   │   └── PreviewScreen.tsx      # Project preview & details
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   └── utils/
│       └── uuid.ts                # UUID generation utility
│
├── .github/
│   └── workflows/
│       ├── android-build.yml      # Android CI/CD pipeline
│       └── ios-build.yml          # iOS CI/CD pipeline
│
├── Configuration Files
│   ├── package.json               # Dependencies & scripts
│   ├── tsconfig.json              # TypeScript configuration
│   ├── metro.config.js            # Metro bundler config
│   ├── .babelrc                   # Babel transpiler config
│   ├── .eslintrc.json             # ESLint code quality
│   ├── .editorconfig              # Editor settings
│   └── .gitignore                 # Git ignore patterns
│
└── Documentation
    ├── README.md                  # This file
    ├── SETUP.md                   # Setup guide
    ├── DEPLOYMENT.md              # Deployment guide
    ├── GITHUB_ACTIONS.md          # CI/CD guide
    ├── ARCHITECTURE.md            # Architecture & data flow
    ├── PROJECT_SUMMARY.md         # Project overview
    └── CHECKLIST.md               # Development checklist
```

---

## 🔧 Available Scripts

```bash
# Development
npm start                 # Start Metro bundler
npm run android          # Build and run on Android
npm run ios              # Build and run on iOS (Mac only)
npm run lint             # Check code quality with ESLint
npm test                 # Run tests (if configured)

# Building
npm run build:android    # Build Android release APK/AAB
npm run build:ios        # Build iOS archive (Mac only)
```

---

## 🧠 State Management

The app uses **React Context API** for state management:

```typescript
import { useProjects } from "./context/ProjectContext";

// In any component
const { projects, addProject, updateProject, deleteProject } = useProjects();

// Add a new project
await addProject({
  name: "My App",
  bundleId: "com.example.myapp",
  teamId: "ABC123",
  version: "1.0.0",
  code: "",
});

// Update existing project
await updateProject(projectId, {
  code: "new code here",
  version: "1.0.1",
});

// Delete project
await deleteProject(projectId);
```

---

## 💾 Data Persistence

Projects are **automatically persisted** to device storage using AsyncStorage:

- All changes are saved instantly
- Data survives app restarts
- No server or backend needed
- Local-only storage for privacy
- Storage key: `@ios_publisher_projects`

---

## 📦 Technology Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| **Framework**    | React Native 0.72.4   |
| **Language**     | TypeScript 4.8.4      |
| **Navigation**   | React Navigation 6.5+ |
| **State**        | React Context API     |
| **Storage**      | AsyncStorage          |
| **Code Quality** | ESLint + TypeScript   |
| **Build Tools**  | Metro, Gradle, Xcode  |
| **CI/CD**        | GitHub Actions        |

---

## 🚀 Getting Started with Deployment

### Android (Google Play Store)

1. **Create Google Play Developer account** (~$25)
2. **Generate signing key:**
   ```bash
   keytool -genkey -v -keystore ios-publisher-companion.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias ios-publisher-companion
   ```
3. **Build release APK/AAB:**
   ```bash
   cd android && ./gradlew bundleRelease
   ```
4. **Upload to Google Play Console**

👉 **See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions**

### iOS (App Store & TestFlight)

1. **Create Apple Developer account** ($99/year)
2. **Generate code signing assets** (requires Mac)
3. **Build and archive:**
   ```bash
   cd ios && pod install && cd ..
   xcodebuild archive ...  # See DEPLOYMENT.md for full command
   ```
4. **Upload to TestFlight/App Store**

👉 **See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions**

---

## 🔄 GitHub Actions CI/CD

Two workflows automatically build your app on every push:

### Android Build (`android-build.yml`)

- Runs on Ubuntu
- Builds APK (debug) and AAB (release)
- Uploads artifacts for download
- Time: ~15-20 minutes

### iOS Build (`ios-build.yml`)

- Runs on macOS
- Builds and archives for TestFlight
- Uploads .xcarchive artifact
- Time: ~30-45 minutes

👉 **See [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) for setup instructions**

---

## 🐛 Troubleshooting

### App won't start

```bash
npm install                    # Reinstall dependencies
npm start -- --reset-cache    # Clear Metro cache
```

### Android build fails

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### iOS build fails (Mac only)

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios
```

### AsyncStorage not persisting

- Check device storage permissions
- Verify `@react-native-community/async-storage` is installed
- Check console logs for errors

👉 **See [SETUP.md](SETUP.md) for more troubleshooting**

---

## 📱 Testing

### Local Testing

```bash
# Android emulator
npm start
npm run android

# iOS simulator (Mac)
npm start
npm run ios

# Physical device
# Connect device, enable USB debugging (Android) or trust computer (iOS)
npm run android  # or npm run ios
```

### Automated Testing

```bash
npm run lint          # Check code quality
npm test              # Run unit tests (when configured)
```

---

## 🎨 UI Overview

### Projects Tab

- List of all projects
- Create new project with "+ Add" button
- Edit project with tap
- Delete project with confirmation

### Code Editor Tab

- Select project from dropdown
- Edit Swift code in text editor
- Auto-save functionality
- Multiple project support

### Preview Tab

- Select project to preview
- View project details (name, bundle ID, version)
- See code preview
- Check creation/modification dates

---

## 🔐 Security Notes

1. **Never commit signing keys** to Git repository
2. **Store credentials** securely in GitHub Secrets
3. **Use `.gitignore`** to exclude sensitive files
4. **AsyncStorage** only stores data locally (no cloud backup)
5. **Code is visible** in the editor (no encryption)

---

## 🎯 Next Steps

### Short Term (This Week)

- [ ] Test app on device/emulator
- [ ] Verify CRUD operations work
- [ ] Check data persistence

### Medium Term (1-2 Weeks)

- [ ] Push code to GitHub
- [ ] Test GitHub Actions workflows
- [ ] Download and verify build artifacts

### Long Term (1-3 Months)

- [ ] Deploy to Google Play Store
- [ ] Deploy to App Store via TestFlight
- [ ] Monitor reviews and user feedback
- [ ] Plan feature updates

👉 **See [CHECKLIST.md](CHECKLIST.md) for complete development checklist**

---

## 📖 Learn More

- **React Native:** https://reactnative.dev/docs/getting-started
- **React Navigation:** https://reactnavigation.org/docs/getting-started
- **TypeScript:** https://www.typescriptlang.org/docs/handbook
- **GitHub Actions:** https://docs.github.com/en/actions
- **Google Play:** https://developer.android.com/google-play/console
- **App Store Connect:** https://help.apple.com/app-store-connect/

---

## 📝 License

Same as original iOS Publisher Companion project.

---

## 💬 Support

For issues or questions:

1. **Check documentation** — See files listed in [📚 Documentation](#-documentation)
2. **Review examples** — Check `src/screens/` for component examples
3. **Consult error logs** — Check Metro console and Xcode/Android Studio
4. **Google the error** — Most issues have existing solutions online
5. **Check GitHub Issues** — Browse existing project issues

---

## 🎉 You're Ready!

This project is **production-ready** with:

- ✅ Complete React Native scaffold
- ✅ TypeScript for type safety
- ✅ GitHub Actions for CI/CD
- ✅ Comprehensive documentation
- ✅ Best practices included

**Start building!** 🚀

---

**Created:** January 17, 2026  
**React Native:** 0.72.4  
**Node.js:** 20.10.0+  
**Status:** ✅ Ready for Development
