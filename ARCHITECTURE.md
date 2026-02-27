# Architecture & Data Flow

## App Architecture

```
┌─────────────────────────────────────────────┐
│           React Native App (App.tsx)         │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  ProjectProvider (Context)           │  │
│  │  - projects state                    │  │
│  │  - CRUD operations                   │  │
│  │  - AsyncStorage persistence          │  │
│  │                                      │  │
│  │  ┌──────────────────────────────┐   │  │
│  │  │  Bottom Tab Navigator        │   │  │
│  │  │                              │   │  │
│  │  │  ┌────────┐ ┌────────┐ ┌───┐│   │  │
│  │  │  │Projects│ │ Code   │ │Pre││   │  │
│  │  │  │  Tab   │ │Editor  │ │vie││   │  │
│  │  │  │        │ │  Tab   │ │ w ││   │  │
│  │  │  └────────┘ └────────┘ └───┘│   │  │
│  │  │         Stack Navigator      │   │  │
│  │  │                              │   │  │
│  │  │ ┌──────────────────────────┐ │   │  │
│  │  │ │  ProjectsStack           │ │   │  │
│  │  │ │  - ProjectsScreen        │ │   │  │
│  │  │ │  - ProjectDetailScreen   │ │   │  │
│  │  │ └──────────────────────────┘ │   │  │
│  │  └──────────────────────────────┘   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────┐
│  User Actions   │
│  (CRUD buttons) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Screen Component            │
│  (ProjectsScreen, etc)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  useProjects() Hook             │
│  (Access ProjectContext)        │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  ProjectContext.Provider         │
│  - addProject()                  │
│  - updateProject()               │
│  - deleteProject()               │
│  - getProjectById()              │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  AsyncStorage                    │
│  (Device Persistent Storage)     │
│  Key: @ios_publisher_projects    │
└──────────────────────────────────┘
```

## Project Data Model

```
┌──────────────────────┐
│  IOSProject          │
├──────────────────────┤
│ id: string (UUID)    │
│ name: string         │
│ bundleId: string     │
│ teamId: string       │
│ version: string      │
│ code: string         │
│ createdAt: number    │
│ updatedAt: number    │
└──────────────────────┘
```

## State Management Flow

```
ProjectContext
├── State (projects: IOSProject[])
│
├── Actions
│   ├── loadProjects() ──► AsyncStorage.getItem()
│   ├── addProject() ──► setProjects() ──► AsyncStorage.setItem()
│   ├── updateProject() ──► setProjects() ──► AsyncStorage.setItem()
│   ├── deleteProject() ──► setProjects() ──► AsyncStorage.setItem()
│   └── getProjectById() ──► array.find()
│
└── useProjects() Hook ──► Returns ProjectContextType
    ├── projects[]
    ├── addProject()
    ├── updateProject()
    ├── deleteProject()
    ├── getProjectById()
    ├── loading: boolean
    └── error: string | null
```

## Screen Hierarchy

```
App (Root Navigation)
│
└── Tab Navigator
    ├── ProjectsTab (Stack)
    │   ├── ProjectsScreen
    │   └── ProjectDetailScreen
    │       (navigate with projectId param)
    │
    ├── CodeEditorTab (Stack)
    │   └── CodeEditorScreen
    │       (select project dropdown)
    │
    └── PreviewTab (Stack)
        └── PreviewScreen
            (select project dropdown)
```

## Component Communication

```
ProjectsScreen
├── useProjects()
├── Render project list
└── On action:
    ├── Delete ──► deleteProject(id) ──► ProjectContext
    └── Edit ──► navigate('ProjectDetail', {projectId})
         │
         ▼
    ProjectDetailScreen
    ├── useProjects()
    ├── Load project with getProjectById(projectId)
    ├── Form editing
    └── On save:
         └── updateProject(id, data) ──► ProjectContext
```

## Persistence Flow

```
User Creates/Edits Project
    │
    ▼
ProjectContext.addProject() or updateProject()
    │
    ├─► Update state: setProjects(...)
    │
    └─► Effect hook watches projects state
         │
         ▼
         saveProjects() function
         │
         ├─► JSON.stringify(projects)
         │
         └─► AsyncStorage.setItem('@ios_publisher_projects', json)
              │
              ▼
         Data persisted to device

App Restart/Reload
    │
    ▼
ProjectProvider useEffect (on mount)
    │
    └─► loadProjects()
         │
         ├─► AsyncStorage.getItem('@ios_publisher_projects')
         │
         └─► JSON.parse() ──► setProjects(data)
              │
              ▼
         Projects restored on screen
```

## GitHub Actions Build Pipeline

```
┌─────────────────────┐
│  Push to main/PR    │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
Android Build  iOS Build
(Ubuntu)       (macOS)
    │             │
    ├─► Node      ├─► Node
    ├─► npm       ├─► npm
    ├─► Java      ├─► Xcode
    ├─► Android   ├─► CocoaPods
    │   SDK       ├─► Build
    ├─► Build     ├─► Archive
    │   APK       └─► Upload
    ├─► Build         Artifact
    │   AAB
    └─► Upload
        Artifacts
        │
        └─► Download & Test
```

## Local Development Workflow

```
Windows/Mac
    │
    ├─► npm install
    │   └─► node_modules/
    │
    ├─► npm start
    │   └─► Metro Bundler (localhost:8081)
    │
    ├─► npm run android (or npm run ios)
    │   │
    │   ├─► React Native CLI
    │   ├─► Connects to device/emulator
    │   ├─► Installs app
    │   └─► Launches app
    │
    └─► Edit src/ files
        │
        └─► Metro hot reload
            └─► App updates instantly
```

## Build Output

```
Project
│
├─► Android Build
│   └─► android/app/build/outputs/
│       ├─► apk/debug/ (APK for testing)
│       └─► bundle/release/ (AAB for Play Store)
│
└─► iOS Build
    └─► ios/build/
        ├─► IOSPublisherCompanion.xcarchive
        └─► (Export to IPA for TestFlight)
```

## Type Safety

```
TypeScript Compilation
    │
    ├─► src/ (TypeScript files)
    │   ├─► types/index.ts (Type definitions)
    │   ├─► context/ProjectContext.tsx (Context types)
    │   └─► screens/*.tsx (Component types)
    │
    └─► tsconfig.json
        ├─► Checks types
        ├─► Validates prop passing
        └─► Ensures type safety
             │
             ├─► IOSProject interface
             ├─► ProjectContextType interface
             ├─► NavigationProps interface
             └─► All screens typed
```

## Deployment Pipeline (Future)

```
GitHub Actions ──► Build (APK/AAB)
    │
    ├─► Android
    │   ├─► Sign with keystore
    │   ├─► Upload to Google Play
    │   └─► Release to production
    │
    └─► iOS
        ├─► Sign with certificate
        ├─► Upload to TestFlight
        └─► Release to App Store
```

---

## Key Interactions

### Creating a Project

```
1. User taps "Add" button on ProjectsScreen
2. Navigate to ProjectDetailScreen (no projectId)
3. User fills form and taps "Create Project"
4. Form validates input
5. useProjects hook calls addProject()
6. ProjectContext creates new IOSProject with UUID
7. Updates state: setProjects([...prev, newProject])
8. useEffect watches projects state change
9. Calls saveProjects() → AsyncStorage.setItem()
10. Data persisted to device
11. Navigate back to ProjectsScreen
12. ProjectsScreen re-renders showing new project
```

### Editing Code

```
1. User selects project in CodeEditorScreen
2. Current project code displayed in TextInput
3. User edits code
4. onChange updates state: setCode(newCode)
5. User taps "Save Code"
6. useProjects hook calls updateProject(id, {code})
7. ProjectContext updates projects array
8. useEffect triggers saveProjects()
9. AsyncStorage persists updated project
10. Alert shows success
```

### Deleting Project

```
1. User taps "Delete" on project card
2. Alert prompt asks for confirmation
3. On delete press:
   - useProjects hook calls deleteProject(id)
   - ProjectContext filters out project from array
   - useEffect triggers saveProjects()
   - AsyncStorage removes project from persistence
4. ProjectsScreen re-renders without deleted project
```

---

**This architecture ensures:**

- ✅ Single source of truth (ProjectContext)
- ✅ Predictable data flow
- ✅ Persistent storage
- ✅ Type-safe interactions
- ✅ Easy to test and maintain
