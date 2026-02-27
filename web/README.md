# iOS Publisher Companion - Web Edition

A browser-based version of the iOS Publisher Companion app. Test and manage your iOS projects directly in your web browser.

## Features

✅ **Projects Management** - Create, edit, and delete iOS projects
✅ **Code Editor** - Edit and save project code
✅ **Preview** - View project details and code previews
✅ **App Simulator** - Test multiple projects in parallel with separate sessions
✅ **Data Persistence** - All data saved to browser localStorage
✅ **Shared Storage** - Data syncs between web and mobile versions (same localStorage key)

## Getting Started

### Prerequisites

- Node.js 14+ (with npm)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
cd web
npm install
```

### Development

Start the dev server:

```bash
npm run dev
```

App opens automatically at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## How to Use

### Projects Tab

- **Create** - Click "+ New Project" and fill in the form
- **Edit** - Click "Edit" on any project card
- **Delete** - Click "Delete" to remove a project
- View all project details in card format

### Code Editor Tab

- Select a project from the dropdown
- Write or paste your code
- Click "Save Code" to persist changes

### Preview Tab

- View complete project details
- See code preview
- View creation and update dates

### Simulator Tab

- **Multiple Sessions** - Click "+ New" to create parallel testing sessions
- **Session Tabs** - Switch between different projects being tested
- **Per-Session State** - Each session has its own selected project and tab
- **Embedded Tabs** - Navigate between Projects/Code/Preview within the simulator

## Data Storage

Data is stored in browser `localStorage` under key: `iosPublisherProjects`

### Exporting Data

```javascript
// Copy from browser console
JSON.parse(localStorage.getItem("iosPublisherProjects"));
```

### Importing Data

```javascript
// Paste in browser console
localStorage.setItem('iosPublisherProjects', JSON.stringify([...data...]))
location.reload()
```

## Syncing with Mobile App

The web version uses the same data structure as the React Native mobile app. Data stored in browser localStorage will sync with the mobile app when you use the same project management system.

To share data between web and mobile:

1. Export data from web (localStorage)
2. Set `AsyncStorage` on mobile with same key
3. Both apps now access the same projects

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iPhone Safari, Chrome Mobile)

## Performance

- Lightweight React app (~50KB gzipped)
- No backend required
- Fast localStorage access
- Responsive design for all screen sizes

## Limitations

- Data limited to browser storage (~5MB on most browsers)
- No cloud sync (stays local)
- Not installable as PWA (yet)

## Future Enhancements

- [ ] PWA installation support
- [ ] Cloud sync with backend
- [ ] Project templates
- [ ] Code syntax highlighting
- [ ] Export projects as ZIP
- [ ] Collaborative editing
- [ ] Dark mode

## Tech Stack

- React 18
- Vite (build tool)
- CSS Grid for responsive layout
- Browser localStorage API

## License

See main project LICENSE file
