export const STORAGE_KEY = "worklog-v6";

export const THEMES = {
  light: { name: "Light" },
  dark: { name: "Dark" },
  softdark: { name: "Soft Dark" },
};

export const ALL_CATEGORIES = [
  "Meetings",
  "Change Request",
  "Incident",
  "Service Request",
  "Teams",
  "SharePoint",
  "GitHub",
  "Documentation",
  "Email / Communication",
  "Outlook",
  "Other",
];

export const PRIORITIES = ["High", "Medium", "Low"];

export const CAT_ICONS = {
  Meetings: "◎",
  "Change Request": "⟳",
  Incident: "⚠",
  "Service Request": "⊕",
  Teams: "⊞",
  SharePoint: "◈",
  GitHub: "⬡",
  Documentation: "☰",
  "Email / Communication": "✉",
  Outlook: "📧",
  Other: "◌",
};

export const LEVELS = [
  { min: 0, max: 99, badge: "🌱", title: "Beginner", color: "#6b7280" },
  { min: 100, max: 299, badge: "⚡", title: "Getting Started", color: "#3b82f6" },
  { min: 300, max: 599, badge: "🔥", title: "On Fire", color: "#f97316" },
  { min: 600, max: 999, badge: "🎯", title: "Focused", color: "#8b5cf6" },
  { min: 1000, max: 1999, badge: "🏆", title: "Champion", color: "#f59e0b" },
  { min: 2000, max: 4999, badge: "💎", title: "Elite", color: "#06b6d4" },
  { min: 5000, max: Number.POSITIVE_INFINITY, badge: "🚀", title: "Legend", color: "#ec4899" },
];

export const DEFAULT_SETTINGS = {
  appName: "WorkLog",
  appSubtitle: "Work Task Manager",
  hiddenCategories: [],
  showImportExport: true,
  showCompleted: true,
  focusMode: false,
  theme: "light",
  showBadges: true,
  soundEnabled: true,
};

export const DEFAULT_UI_PREFS = {
  view: "inbox",
  filterCat: "All",
  sidebarOpen: true,
  calDate: null,
  calView: "month",
  stickySort: "priority",
};

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function createEmptyTask() {
  return {
    id: newId(),
    title: "",
    category: "Meetings",
    priority: "Medium",
    dueDate: "",
    notes: "",
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(dateString, referenceDate = todayStr()) {
  return Boolean(dateString) && dateString < referenceDate;
}

export function getLevel(xp) {
  for (let index = LEVELS.length - 1; index >= 0; index -= 1) {
    if (xp >= LEVELS[index].min) {
      return LEVELS[index];
    }
  }
  return LEVELS[0];
}

export function xpForTask(priority, onTime) {
  let points = priority === "High" ? 25 : priority === "Medium" ? 10 : 5;
  if (onTime) {
    points += 15;
  }
  return points;
}

export function getVisibleCategories(settings) {
  return ALL_CATEGORIES.filter(
    (category) => !settings.hiddenCategories.includes(category),
  );
}

export function normalizeTask(task) {
  const base = createEmptyTask();
  return {
    ...base,
    ...task,
    id: task?.id || base.id,
    title: String(task?.title || ""),
    category: ALL_CATEGORIES.includes(task?.category) ? task.category : base.category,
    priority: PRIORITIES.includes(task?.priority) ? task.priority : base.priority,
    dueDate: typeof task?.dueDate === "string" ? task.dueDate : "",
    notes: typeof task?.notes === "string" ? task.notes : "",
    completed: Boolean(task?.completed),
    completedAt: task?.completedAt || null,
    createdAt: task?.createdAt || base.createdAt,
  };
}

export function normalizeSettings(settings) {
  const theme = THEMES[settings?.theme] ? settings.theme : DEFAULT_SETTINGS.theme;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    hiddenCategories: Array.isArray(settings?.hiddenCategories)
      ? settings.hiddenCategories.filter((category) => ALL_CATEGORIES.includes(category))
      : [],
    theme,
  };
}

export function normalizeUiPrefs(uiPrefs) {
  const allowedViews = ["inbox", "today", "upcoming", "sticky", "calendar", "progress", "completed"];
  return {
    view: allowedViews.includes(uiPrefs?.view) ? uiPrefs.view : DEFAULT_UI_PREFS.view,
    filterCat:
      uiPrefs?.filterCat === "All" || ALL_CATEGORIES.includes(uiPrefs?.filterCat)
        ? uiPrefs.filterCat
        : DEFAULT_UI_PREFS.filterCat,
    sidebarOpen:
      typeof uiPrefs?.sidebarOpen === "boolean"
        ? uiPrefs.sidebarOpen
        : DEFAULT_UI_PREFS.sidebarOpen,
    calDate:
      typeof uiPrefs?.calDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(uiPrefs.calDate)
        ? uiPrefs.calDate
        : DEFAULT_UI_PREFS.calDate,
    calView:
      uiPrefs?.calView === "split" || uiPrefs?.calView === "month"
        ? uiPrefs.calView
        : DEFAULT_UI_PREFS.calView,
    stickySort:
      uiPrefs?.stickySort === "duedate" || uiPrefs?.stickySort === "priority"
        ? uiPrefs.stickySort
        : DEFAULT_UI_PREFS.stickySort,
  };
}

export function sortTasksForDisplay(tasks) {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }
    if (left.dueDate && right.dueDate && left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }
    if (left.dueDate && !right.dueDate) {
      return -1;
    }
    if (!left.dueDate && right.dueDate) {
      return 1;
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function filterTasks(tasks, ui, settings) {
  const visibleCategories = getVisibleCategories(settings);
  const normalizedQuery = ui.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (!visibleCategories.includes(task.category) && ui.filterCat !== task.category) {
      return false;
    }

    const categoryMatch = ui.filterCat === "All" || task.category === ui.filterCat;
    if (!categoryMatch) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [task.title, task.category, task.notes]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

export function tasksForView(tasks, view, referenceDate = todayStr()) {
  if (view === "inbox") {
    return tasks.filter((task) => !task.completed);
  }
  if (view === "today") {
    return tasks.filter((task) => !task.completed && task.dueDate === referenceDate);
  }
  if (view === "upcoming") {
    return tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > referenceDate);
  }
  if (view === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function priorityClass(priority) {
  return priority.toLowerCase();
}
