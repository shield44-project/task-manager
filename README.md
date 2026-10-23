# Studyflow — Student Task Manager

A lightweight task manager built with plain HTML, CSS, and JavaScript. It runs in the browser without a framework, build step, or server.

## Run it

Open `proj.html` in a modern browser. Tasks are stored in that browser's Local Storage and stay on the device. Clearing browser site data removes them. JSON backup can be used to move tasks to another browser/device.

## Features

- Add tasks with a category, priority, and optional due date.
- Search task titles, categories, and priority labels.
- Filter tasks by all, pending, or completed.
- Mark tasks complete, edit their title, delete them, or clear all completed tasks.
- Sort pending and completed tasks by latest added, due date, or priority.
- View total, pending, completed, and completion percentage statistics.
- Import and export task lists as JSON files.
- Synchronize task changes between tabs of the same browser using the `storage` event.
- Keyboard shortcuts: `/` focuses search, `N` focuses the new-task field, and `Escape` clears and leaves search.
- Responsive layout, hover states, transitions, animated task entrance, and reduced-motion support.

## Project files

| File | Role |
| --- | --- |
| `proj.html` | Semantic page structure, forms, buttons, filters, and labels. |
| `proj.css` | Near-black interface, responsive layout, visual states, transforms, transitions, and keyframe animations. |
| `proj.js` | Task data, validation, Local Storage, JSON import/export, sorting, filtering, and DOM updates. |

## JavaScript concepts demonstrated

- **Variables and constants:** DOM references, the task array, filter state, and the storage key.
- **Objects and arrays:** each task is an object; `tasks` is an array of task objects.
- **Functions:** small functions handle rendering, saving, filtering, adding, editing, importing, and more.
- **Conditions:** input checks, task status, due dates, filtering, and JSON error handling.
- **Loops and array methods:** `forEach`, `filter`, `map`, `find`, `sort`, and `includes` render and transform task data.
- **DOM manipulation:** create elements, update text and attributes, change classes, and replace list contents.
- **Events:** form submission, input, button clicks, file selection, keyboard shortcuts, and cross-tab storage updates.
- **JSON:** `JSON.stringify()` serializes task data; `JSON.parse()` reads Local Storage and imported backup files.
- **Local Storage:** the task array is stored under `studyflow.tasks.v1` and loaded when the page starts.

## Data format

Local Storage contains a JSON array of task objects in this shape:

```json
{
  "id": "unique-id",
  "title": "Review biology notes",
  "category": "Study",
  "priority": "medium",
  "dueDate": "2026-10-30",
  "completed": false,
  "createdAt": 1792785600000
}
```

Exported backups are JSON objects containing the app name, version, export time, and a `tasks` array. Import accepts that format or a plain array of task objects. Imported values are normalized and invalid task entries are ignored.

## Notes

- The app uses no JavaScript packages or external services.
- Google Fonts are linked in `proj.html` and `proj.css`; if unavailable, the browser uses fallback fonts.
- Storage is browser-specific and is not encrypted or synced to an online account.
- Import merges tasks with the current list; duplicate IDs are assigned new IDs.
