# Testing Guide - Multiple Simulator Sessions & Web Version

## 🎯 Overview

You now have **two ways** to test your app:

1. **React Native Mobile Simulator** (in the app) - Multi-session support
2. **Web Browser Version** - Full featured web app

Both share the **same data storage**, so projects created in one appear in the other!

---

## 📱 Mobile Simulator (React Native)

### What's New

- **Multiple Sessions** - Open multiple simulator windows in parallel
- **Session Tabs** - Quick switch between Sessions 1, 2, 3, etc.
- **Add Session** - Click green "+ New" button to add another testing session
- **Close Session** - Click "✕" on session tab to remove it (min 1 required)

### Test Parallel Projects

**Scenario:** Test 2 projects side-by-side

```
Session 1 → Project A
  └─ Projects Tab
  └─ Code Editor
  └─ Preview

Session 2 → Project B
  └─ Projects Tab
  └─ Code Editor
  └─ Preview
```

### How to Use

1. Run `npm start` (Metro bundler)
2. Run `npm run android` (or test on physical device)
3. Navigate to "Simulator" tab
4. Click "+ New" to add Session 2
5. Session 1 stays on Project A, Session 2 on Project B
6. Switch between sessions instantly

---

## 🌐 Web Browser Version

### Getting Started

**Terminal 1 - Start Web Server:**

```powershell
cd c:\mpy\ib\cloned_repos\IOSPublisherCompanion\web
npm install
npm run dev
```

App opens automatically at `http://localhost:3000`

### Features

- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Same 4 tabs: Projects, Code Editor, Preview, Simulator
- ✅ Multi-session simulator just like mobile
- ✅ Data saved to browser localStorage
- ✅ No backend required

### Web-Only Benefits

- Test in browser alongside IDE
- No device/emulator needed
- Easy to share with team (just send URL)
- Better for quick testing
- Works offline (data cached locally)

---

## 🔄 Data Sync Between Versions

### How It Works

Both versions use browser storage:

- **Mobile App**: React Native `AsyncStorage`
- **Web App**: Browser `localStorage`
- **Same Key**: `iosPublisherProjects`

### Test Scenario

```
1. Create project "MyApp" in mobile simulator
   ↓
2. Switch to web version
   ↓
3. "MyApp" appears in web Projects tab!
```

### Important Notes

- Sync is **NOT automatic** between browser tabs
- Refresh the page to see new projects
- Each platform stores separately (mobile ≠ web storage)
- To share data: export/import as JSON

---

## 📋 Quick Start Checklist

### Option A: Mobile Testing

- [ ] Run `npm start` in main project folder
- [ ] Run `npm run android` in new terminal
- [ ] Navigate to Simulator tab
- [ ] Create multiple sessions with "+ New"
- [ ] Test different projects in parallel

### Option B: Web Browser Testing

- [ ] Go to `web/` folder
- [ ] Run `npm install` (first time only)
- [ ] Run `npm run dev`
- [ ] Browser opens automatically
- [ ] Create projects and test

### Option C: Both Simultaneously

- [ ] Terminal 1: `npm start` (mobile Metro)
- [ ] Terminal 2: `npm run android` (mobile app)
- [ ] Terminal 3: `cd web && npm run dev` (web app)
- [ ] Open `localhost:3000` in browser
- [ ] Test both platforms side-by-side!

---

## 🎮 Testing Workflows

### Parallel Project Testing (Mobile)

1. Open Simulator tab
2. Create Session 1 for "Project Alpha"
3. Create Session 2 for "Project Beta"
4. Switch between sessions with tab buttons
5. Each maintains its own state

### Parallel Testing (Web)

1. Open Simulator tab in web
2. Create multiple sessions
3. Open web in another browser tab/window
4. Different sessions in each window
5. Test independently

### Cross-Platform Testing

1. Web version at `localhost:3000`
2. Mobile simulator in app
3. Create same project in both
4. Verify behavior matches
5. Test data export/import

---

## 🔧 Troubleshooting

### Web App Won't Start

```powershell
cd web
npm install
npm run dev
```

### Projects Not Showing in Web

- Refresh the page
- Check browser console for errors
- Mobile and web have separate storage!

### Port 3000 Already in Use

```powershell
npm run dev -- --port 3001
```

### Want to Reset Data

```javascript
// In browser console
localStorage.removeItem("iosPublisherProjects");
location.reload();
```

---

## 💡 Tips

1. **Use Web for Quick Testing** - No device setup needed
2. **Use Mobile for Real UX** - Actual touch/gesture testing
3. **Test Both in Parallel** - Find differences faster
4. **Export Before Switching** - Backup your data
5. **Keep Multiple Sessions** - Test different scenarios simultaneously

---

## 📊 Comparison

| Feature        | Mobile      | Web             |
| -------------- | ----------- | --------------- |
| Multi-Session  | ✅ Yes      | ✅ Yes          |
| Device Testing | ✅ Yes      | ❌ No           |
| Browser        | ❌ No       | ✅ Yes          |
| Offline        | ✅ Yes      | ✅ Yes          |
| Data Sync      | ❌ Separate | ✅ localStorage |
| Touch Gestures | ✅ Yes      | ❌ No           |
| Responsive UI  | ✅ Native   | ✅ CSS Grid     |
| Setup Time     | ~5 min      | ~1 min          |

---

## Next Steps

1. **Try Web Version First** - Quickest to test

   ```powershell
   cd web && npm install && npm run dev
   ```

2. **Create Test Projects** - Build a few projects
3. **Test Multi-Session** - Try multiple sessions

4. **Use Mobile Simulator** - When ready for device testing

5. **Build Features** - Iterate based on testing results

Good luck! 🚀
