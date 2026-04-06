# WorkLog — Technical Documentation

> A self-contained, offline-first personal work task manager built as a single HTML file.  
> No server required. No installation. Works in any modern browser.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Data Storage](#data-storage)
5. [Data Schema](#data-schema)
6. [XP & Progression System](#xp--progression-system)
7. [Sound Engine](#sound-engine)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [File Structure](#file-structure)
10. [Hosting Options](#hosting-options)
11. [Browser Compatibility](#browser-compatibility)
12. [Privacy & Security](#privacy--security)
13. [Backup & Portability](#backup--portability)
14. [Known Limitations](#known-limitations)
15. [Version History](#version-history)

---

## Overview

WorkLog is a **single-file HTML application** — the entire app (HTML, CSS, JavaScript, React) lives inside one `.html` file. There is no backend, no database server, no cloud dependency, and no build step required.

It is designed for IT professionals to track work tasks across categories like Meetings, Incidents, Change Requests, GitHub, Teams, SharePoint, and more.

**Key design principles:**
- Zero dependencies to install
- Works fully offline after first load
- Data stays on the user's own machine
- Shareable by simply sending the `.html` file
- Each user's data is stored independently in their own browser

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI Framework | React | 18 (UMD) | Component-based UI rendering |
| JSX Transpiler | Babel Standalone | Latest | Transpiles JSX in the browser at runtime |
| Styling | Inline CSS-in-JS | — | Theme-aware styles via JavaScript objects |
| Global CSS | `<style>` block | — | Animations, sticky notes, date picker, scrollbars |
| Fonts | Google Fonts (DM Sans) | — | Loaded from CDN on first use |
| Audio | Web Audio API | Browser native | Procedurally generated celebration sounds |
| Storage | `localStorage` | Browser native | Persistent data storage, no server needed |

All external resources (React, ReactDOM, Babel, Google Fonts) are loaded from CDN. After the first page load, the app logic runs entirely in the browser.

---

## Architecture

WorkLog follows a **single-page application (SPA)** pattern with all logic inside one React `App` component tree.

```
WorkLog.html
├── <style>           — Global CSS (animations, sticky notes, date picker)
├── <script babel>    — All application code
│   ├── Constants     — THEMES, CATEGORIES, PRIORITIES, LEVELS, CAT_ICONS
│   ├── SoundEngine   — Web Audio API sound generator
│   ├── DatePicker    — Custom calendar date picker component
│   ├── XPPopup       — Floating XP gain animation
│   ├── LevelUpToast  — Level-up notification banner
│   ├── SettingsPanel — Slide-in settings drawer
│   ├── ViewProgress  — Stats dashboard (charts, heatmap, XP)
│   ├── ShortcutsHelp — Keyboard shortcuts popup
│   └── App           — Main application component
│       ├── State     — tasks, xp, streak, settings, UI state
│       ├── Effects   — localStorage sync, keyboard shortcuts, sound toggle
│       ├── Views     — Inbox, Today, Upcoming, Sticky, Calendar, Progress, Completed
│       └── Render    — Sidebar + Main panel + Modals + Overlays
```

### Component Communication

All state lives in the top-level `App` component. Child components receive data and callbacks as props. There is no external state management library (no Redux, no Zustand).

### Rendering

React renders the UI. The JSX is transpiled at runtime by Babel Standalone — this adds approximately 1–2 seconds of initial parse time, which is acceptable for a single-user productivity tool. For production-scale use, pre-building with a bundler (Vite/webpack) would improve performance.

---

## Data Storage

WorkLog uses the browser's `localStorage` API to persist all data.

**Storage key:** `worklog-v6`

**Data is stored as a single JSON string** under this key, containing:

```json
{
  "tasks": [...],
  "settings": {...},
  "xp": 0,
  "streak": 0,
  "lastCompletedDate": "2026-04-06"
}
```

### Storage Behaviour

| Behaviour | Detail |
|---|---|
| Auto-save | Every time `tasks`, `settings`, `xp`, `streak`, or `lastCompletedDate` changes |
| Scope | Per browser, per origin (domain or `file://` path) |
| Capacity | localStorage limit is typically 5–10 MB per origin |
| Persistence | Survives page refresh and browser restart |
| Isolation | Each user's browser stores their own data independently |

### Important: Data Isolation

If two people open the same hosted URL, their data is stored separately in each person's browser. Data is never shared between users automatically — this is by design.

If a user opens the file from a different browser, different computer, or clears browser storage, their data will not be there. This is why the **Export / Import JSON backup** feature exists.

---

## Data Schema

### Task Object

```typescript
{
  id:          string,       // Unique ID: timestamp-based (e.g. "lf2abc3d")
  title:       string,       // Task title — required
  category:    string,       // One of the 10 work categories
  priority:    "High" | "Medium" | "Low",
  dueDate:     string | "",  // ISO date "YYYY-MM-DD" or empty string
  notes:       string,       // Optional additional notes
  completed:   boolean,
  completedAt: string | null,// ISO datetime when completed, null if open
  createdAt:   string,       // ISO datetime of creation
}
```

### Settings Object

```typescript
{
  appName:           string,    // Custom app name, default "WorkLog"
  appSubtitle:       string,    // Custom subtitle
  hiddenCategories:  string[],  // Categories hidden from sidebar
  showImportExport:  boolean,
  showCompleted:     boolean,
  focusMode:         boolean,
  theme:             "light" | "dark" | "softdark",
  showBadges:        boolean,
  soundEnabled:      boolean,
}
```

### Backup / Export JSON Format

```json
{
  "tasks": [ ...task objects... ],
  "xp": 340,
  "streak": 5,
  "exportedAt": "2026-04-06T10:34:00.000Z"
}
```

---

## XP & Progression System

WorkLog uses a points system inspired by habit-formation principles (Atomic Habits, Tiny Habits) to encourage consistent task completion through celebration and identity-building.

### XP Values

| Action | XP Earned |
|---|---|
| Complete a Low priority task | +5 XP |
| Complete a Medium priority task | +10 XP |
| Complete a High priority task | +25 XP |
| Completed on or before due date (bonus) | +15 XP |
| 3-day completion streak | +50 XP bonus |
| 7-day completion streak | +150 XP bonus |

### Level Thresholds

| Level | XP Required | Badge | Title | Colour |
|---|---|---|---|---|
| 1 | 0 | 🌱 | Beginner | Gray |
| 2 | 100 | ⚡ | Getting Started | Blue |
| 3 | 300 | 🔥 | On Fire | Orange |
| 4 | 600 | 🎯 | Focused | Purple |
| 5 | 1,000 | 🏆 | Champion | Amber |
| 6 | 2,000 | 💎 | Elite | Cyan |
| 7 | 5,000 | 🚀 | Legend | Pink |

### Streak Logic

- A streak increments by 1 each calendar day that at least one task is completed
- If a day is skipped, the streak resets to 1 (not 0) on the next completion
- The streak date is compared using `YYYY-MM-DD` local date strings
- Streak bonuses (+50 XP at day 3, +150 XP at day 7) fire once per milestone crossing

### XP Persistence

XP and streak are stored in `localStorage` alongside tasks. They are included in the JSON export and restored on import.

---

## Sound Engine

All sounds are generated procedurally using the **Web Audio API** — no audio files are downloaded or embedded.

| Sound | Trigger | Description |
|---|---|---|
| Soft chime | Complete Medium task | Warm sine wave bell at 880Hz → 660Hz with harmonic shimmer |
| Level up arpeggio | Complete High task | 4-note ascending arpeggio C5→E5→G5→C6 using triangle wave |
| Gentle two-tone | Complete Low task | Two soft sine tones at 528Hz and 660Hz |
| Undo tone | Un-complete a task | Soft descending sine 660Hz → 440Hz |
| Level-up fanfare | Advance to new level | 5-note ascending fanfare, plays alongside level-up toast |

The sound engine creates a new `AudioContext` lazily on first use (required by browser autoplay policies). If a browser blocks audio, sounds are silently skipped. The mute toggle sets `SoundEngine.enabled = false` and is checked before every sound call.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open Add Item modal (fires on keyup to prevent typing "n" in the input) |
| `1` – `7` | Jump to view: Inbox, Today, Upcoming, Sticky, Calendar, Progress, Completed |
| `B` | Toggle sidebar open/closed |
| `E` | Export JSON backup |
| `M` | Toggle celebration sounds on/off |
| `/` | Open search |
| `Ctrl + K` | Open search |
| `Ctrl + Enter` | Save item (when modal is open) |
| `?` | Open keyboard shortcuts help popup |
| `Escape` | Close any open modal, search, or panel |

**Note on the N key:** The modal is opened on `keyup` rather than `keydown`. The `keydown` event calls `preventDefault()` to block the character. This ensures the autofocused title input does not receive the "n" character when the modal opens.

Single-key shortcuts (`N`, `B`, `E`, `M`, `/`, `?`, `1–7`) are suppressed when the user is typing in an `<input>`, `<textarea>`, or `<select>` element.

---

## File Structure

The entire application is a single file:

```
WorkLog.html          (≈ 77 KB)
```

When a user exports a backup, an additional file is created:

```
worklog-backup-YYYY-MM-DD.json    (size depends on number of tasks)
```

There are no other files, folders, config files, or dependencies to manage.

---

## Hosting Options

Because WorkLog is a single HTML file, hosting is very flexible.

### Option 1 — Local file (no hosting needed)

Save `WorkLog.html` to your desktop or any folder and double-click to open in a browser. Data is stored in `localStorage` for that browser on that machine.

```
file:///Users/prabu/Desktop/WorkLog.html
```

### Option 2 — Static web hosting (shared team access)

Upload `WorkLog.html` to any static hosting service. Each user who opens the URL gets their own independent localStorage — data is never shared between users.

| Service | Free tier | Steps |
|---|---|---|
| GitHub Pages | Yes | Push to repo → enable Pages in settings |
| Netlify | Yes | Drag and drop the file onto netlify.com/drop |
| Vercel | Yes | Upload via CLI or dashboard |
| Any web server | — | Copy file to `/var/www/html/` or equivalent |

### Option 3 — File sharing

Email or share the `.html` file directly. Each recipient opens it in their browser. Their data is stored locally on their own machine.

### Note on localStorage scope

When hosted at a URL (e.g. `https://yoursite.com/WorkLog.html`), localStorage is scoped to that origin. When opened as a `file://` path, localStorage is scoped to that exact file path. Moving the file to a new location creates a new empty storage scope.

---

## Browser Compatibility

WorkLog is tested and works in:

| Browser | Minimum Version | Notes |
|---|---|---|
| Google Chrome | 90+ | Fully supported |
| Microsoft Edge | 90+ | Fully supported |
| Mozilla Firefox | 88+ | Fully supported |
| Apple Safari | 14+ | Fully supported |
| Opera | 76+ | Fully supported |

**Requirements:**
- JavaScript enabled
- `localStorage` available (not blocked by browser settings or private/incognito mode in some browsers)
- Web Audio API (for sounds — silently skipped if unavailable)
- Internet connection on first load only (to fetch React, Babel, and Google Fonts from CDN)

**Offline use:** After the first successful load, the app logic works offline. However, CDN resources (React, Babel, fonts) will not reload if the browser cache is cleared while offline. For fully offline use, a self-contained version with embedded dependencies would be needed.

---

## Privacy & Security

- **No data leaves the browser.** WorkLog makes no network requests of its own.
- **No analytics, no tracking, no cookies.**
- **No accounts or login.** There is no authentication layer.
- CDN requests are made to `unpkg.com` (React, ReactDOM, Babel) and `fonts.googleapis.com` on load. These are standard public CDNs.
- All task data, XP, settings, and streaks are stored only in the user's own browser `localStorage`.
- If hosted on a shared URL, users cannot see each other's data — localStorage is per-browser, per-user.

---

## Backup & Portability

### Exporting

Click **⬇ Export Backup** in the sidebar (or press `E`) to download a `.json` file containing all tasks, XP, and streak data. The file is named `worklog-backup-YYYY-MM-DD.json`.

### Importing

Click **⬆ Import Backup** and select a previously exported `.json` file. This replaces all current tasks and XP with the imported data. Use this to:
- Move data between computers
- Move data between browsers
- Restore after clearing browser storage
- Share a task list with another person

### Recommended backup frequency

For active daily use, exporting once a week is sufficient. Export before clearing browser data or switching machines.

---

## Known Limitations

| Limitation | Detail |
|---|---|
| No multi-device sync | Data lives in one browser's localStorage only. Use Export/Import to move between devices. |
| No real-time collaboration | Multiple users cannot share a live task list. |
| No notifications / reminders | The app has no background process to send alerts. |
| No recurring tasks | Tasks must be added manually each time. |
| Babel runtime cost | JSX is transpiled at runtime, adding ~1–2s initial parse time on slower machines. |
| localStorage cleared by browser | Browser "Clear site data" or private mode may erase data. Always keep a backup. |
| No file attachment support | Only text fields (title, notes, category, priority, due date). |

---

## Version History

| Version | Key Changes |
|---|---|
| v1 | Initial app — Inbox, Today, Upcoming, Sticky, Calendar views |
| v2 | Real sticky notes design, modern date picker, dual calendar view, Outlook category |
| v3 | Full keyboard shortcuts (N, 1–7, B, E, /, ?, Ctrl+K, Ctrl+Enter), shortcuts help popup, 3-month split calendar |
| v4 | Celebration sounds (Web Audio API), mute toggle, sound per priority level |
| v5 | Fixed N key bug (keyup vs keydown), N character no longer typed into modal input |
| v6 | XP & badge progression system, My Progress view (bar chart + heatmap), Settings panel, custom app name/subtitle, focus mode, per-category hide/show, level-up toast, XP popup animation |

---

*WorkLog is a personal productivity tool. It is not affiliated with Todoist, Notion, or any other task management service.*
