import {
  DEFAULT_UI_PREFS,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  normalizeSettings,
  normalizeTask,
  normalizeUiPrefs,
} from "./utils.js";

export function loadPersistedState() {
  let rawPersisted = {};

  try {
    rawPersisted = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    rawPersisted = {};
  }

  const tasks = Array.isArray(rawPersisted.tasks)
    ? rawPersisted.tasks.map(normalizeTask)
    : [];

  return {
    rawPersisted,
    tasks,
    settings: normalizeSettings(rawPersisted.settings || DEFAULT_SETTINGS),
    uiPrefs: normalizeUiPrefs(rawPersisted.uiPrefs || DEFAULT_UI_PREFS),
    xp: Number.isFinite(rawPersisted.xp) ? rawPersisted.xp : 0,
    streak: Number.isFinite(rawPersisted.streak) ? rawPersisted.streak : 0,
    lastCompletedDate: rawPersisted.lastCompletedDate || null,
  };
}

export function savePersistedState(state) {
  const payload = {
    ...state.rawPersisted,
    tasks: state.tasks,
    settings: state.settings,
    uiPrefs: {
      view: state.ui.view,
      filterCat: state.ui.filterCat,
      sidebarOpen: state.ui.sidebarOpen,
      calDate: state.ui.calDate,
      calView: state.ui.calView,
      stickySort: state.ui.stickySort,
    },
    xp: state.xp,
    streak: state.streak,
    lastCompletedDate: state.lastCompletedDate,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function buildBackupPayload(state) {
  return {
    tasks: state.tasks,
    xp: state.xp,
    streak: state.streak,
    exportedAt: new Date().toISOString(),
  };
}

export function triggerBackupDownload(state) {
  const payload = buildBackupPayload(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `worklog-backup-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseBackupText(text) {
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.tasks)) {
    throw new Error("Invalid backup file.");
  }

  return {
    tasks: parsed.tasks.map(normalizeTask),
    xp: Number.isFinite(parsed.xp) ? parsed.xp : 0,
    streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
  };
}
