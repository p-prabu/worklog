import {
  ALL_CATEGORIES,
  CAT_ICONS,
  THEMES,
  createEmptyTask,
  escapeHtml,
  filterTasks,
  formatDate,
  getLevel,
  getVisibleCategories,
  isOverdue,
  priorityClass,
  sortTasksForDisplay,
  tasksForView,
  todayStr,
} from "./utils.js";

const VIEW_META = {
  inbox: { label: "WorkLog Inbox", icon: "📥", key: "1" },
  today: { label: "Today", icon: "📅", key: "2" },
  upcoming: { label: "Upcoming", icon: "📆", key: "3" },
  sticky: { label: "Sticky Notes", icon: "📌", key: "4" },
  calendar: { label: "Calendar", icon: "🗓", key: "5" },
  progress: { label: "My Progress", icon: "📈", key: "6" },
  completed: { label: "Completed", icon: "✅", key: "7" },
};

export function renderApp(root, state) {
  const { settings, tasks, ui, xp, streak } = state;
  const visibleCategories = getVisibleCategories(settings);
  const referenceDate = todayStr();
  const filteredTasks = filterTasks(tasks, ui, settings);
  const viewTasks = sortTasksForDisplay(tasksForView(filteredTasks, ui.view, referenceDate));
  const level = getLevel(xp);

  document.body.dataset.theme = settings.theme;

  root.innerHTML = `
    <div class="app-shell ${ui.sidebarOpen ? "" : "sidebar-collapsed"}">
      <aside class="sidebar">
        <div class="sidebar-inner">
          ${renderSidebar(state, visibleCategories, level)}
        </div>
      </aside>
      <main class="main-panel">
        ${renderTopbar(state)}
        <div class="content content-scroll">
          <div class="content-body">
            ${renderToolbar(state, visibleCategories)}
            ${renderView(state, viewTasks, filteredTasks, referenceDate)}
          </div>
        </div>
      </main>
    </div>
    ${ui.taskModalOpen ? renderTaskModal(state) : ""}
    ${ui.settingsOpen ? renderSettingsDrawer(state) : ""}
  `;
}

function renderSidebar(state, visibleCategories, level) {
  const { settings, tasks, ui, xp, streak } = state;
  const navItems = buildNavItems(state);
  const taskCounts = countTasks(tasks, visibleCategories, todayStr());
  const progress = buildXpProgress(xp);

  return `
    <div class="brand">
      <div class="brand-name">⚡ ${escapeHtml(settings.appName || "WorkLog")}</div>
      <div class="brand-subtitle">${escapeHtml(settings.appSubtitle || "Work Task Manager")}</div>
      <div class="summary-card">
        <div class="summary-meta">
          <span>${level.badge} ${escapeHtml(level.title)}</span>
          <span>${xp} XP</span>
        </div>
        <div class="summary-meta">
          <span>🔥 ${streak}d</span>
          <span>${progress.label}</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${progress.percent}%"></div>
        </div>
      </div>
    </div>
    <div class="sidebar-scroll">
      <div class="section">
        <div class="section-title">WorkLog List</div>
        ${navItems
          .map(
            (item) => `
              <button class="nav-item ${ui.view === item.id ? "active" : ""}" data-action="set-view" data-view="${item.id}">
                <span>${item.icon}</span>
                <span>${escapeHtml(item.label)}</span>
                <span class="nav-spacer"></span>
                <span class="nav-key">${item.key}</span>
                ${
                  settings.showBadges && item.count > 0
                    ? `<span class="badge">${item.count}</span>`
                    : ""
                }
              </button>
            `,
          )
          .join("")}
      </div>
      ${
        !settings.focusMode
          ? `
            <div class="section">
              <div class="section-title">Categories</div>
              ${visibleCategories
                .map(
                  (category) => `
                    <button class="category-link" data-action="filter-category" data-category="${escapeHtml(category)}">
                      <span>${CAT_ICONS[category]}</span>
                      <span>${escapeHtml(category)}</span>
                      <span class="nav-spacer"></span>
                      ${
                        settings.showBadges && taskCounts.byCategory[category] > 0
                          ? `<span class="badge">${taskCounts.byCategory[category]}</span>`
                          : ""
                      }
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
    ${
      !settings.focusMode
        ? `
          <div class="sidebar-bottom">
            <div class="button-row">
              <button class="ghost-button" data-action="open-settings">⚙️ Settings</button>
              <button class="ghost-button" data-action="toggle-sidebar">☰ Sidebar</button>
            </div>
            ${
              settings.showImportExport
                ? `
                  <div class="button-row" style="margin-top:10px">
                    <button class="ghost-button" data-action="export-backup">⬇ Export</button>
                    <button class="ghost-button" data-action="trigger-import">⬆ Import</button>
                  </div>
                `
                : ""
            }
            <div class="muted-copy" style="margin-top:10px">Data saved in this browser</div>
          </div>
        `
        : ""
    }
  `;
}

function renderTopbar(state) {
  const current = VIEW_META[state.ui.view];
  return `
    <header class="topbar">
      <button class="icon-button" data-action="toggle-sidebar">☰</button>
      <div class="topbar-title">${escapeHtml(current.label)}</div>
      <button class="ghost-button" data-action="open-settings">⚙️ Settings</button>
    </header>
  `;
}

function renderToolbar(state, visibleCategories) {
  const { settings, ui } = state;
  const searchField = `
    <div class="toolbar-grow">
      <input
        class="toolbar-search"
        type="search"
        placeholder="Search title, category, or notes"
        data-field="search"
        value="${escapeHtml(ui.search)}"
      >
    </div>
  `;

  if (ui.view === "progress") {
    return `
      <div class="toolbar">
        ${searchField}
        <div class="muted-copy">Track completions, XP, streaks, and category activity from your saved task history.</div>
      </div>
    `;
  }

  if (ui.view === "calendar") {
    const current = new Date(`${ui.calDate}T00:00:00`);
    const monthLabel = current.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `
      <div class="toolbar">
        ${searchField}
        <div class="button-row">
        <button class="icon-button" data-action="calendar-shift" data-direction="-1">◀</button>
        <div class="panel-card calendar-month-label">${escapeHtml(monthLabel)}</div>
        <button class="icon-button" data-action="calendar-shift" data-direction="1">▶</button>
      </div>
      <button class="ghost-button" data-action="calendar-today">Today</button>
      <div class="button-row">
        <button class="chip ${ui.calView === "month" ? "active" : ""}" data-action="set-calendar-view" data-calendar-view="month">📅 Month</button>
        <button class="chip ${ui.calView === "split" ? "active" : ""}" data-action="set-calendar-view" data-calendar-view="split">⊟ Split</button>
      </div>
      <span class="toolbar-grow muted-copy">Click a day to create a task with that due date.</span>
      <button class="primary-button" data-action="new-task">+ Add Item</button>
    </div>
  `;
  }

  if (ui.view === "sticky") {
    return `
      <div class="toolbar">
        ${searchField}
        <div class="button-row">
          <button class="chip ${ui.stickySort === "priority" ? "active" : ""}" data-action="set-sticky-sort" data-sort="priority">🎯 Priority</button>
          <button class="chip ${ui.stickySort === "duedate" ? "active" : ""}" data-action="set-sticky-sort" data-sort="duedate">📅 Due Date</button>
        </div>
        <span class="toolbar-grow muted-copy">Open tasks shown as quick-glance notes.</span>
        <button class="primary-button" data-action="new-task">+ Add Item</button>
      </div>
    `;
  }

  return `
    <div class="toolbar">
      ${searchField}
      ${
        ui.view === "inbox"
          ? `
            <div class="chip-row">
              <button class="chip ${ui.filterCat === "All" ? "active" : ""}" data-action="filter-category" data-category="All">All</button>
              ${visibleCategories
                .map(
                  (category) => `
                    <button class="chip ${ui.filterCat === category ? "active" : ""}" data-action="filter-category" data-category="${escapeHtml(category)}">
                      ${CAT_ICONS[category]} ${escapeHtml(category)}
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
      ${
        settings.showImportExport
          ? `<button class="ghost-button" data-action="export-backup">Export Backup</button>`
          : ""
      }
      <button class="primary-button" data-action="new-task">+ Add Item</button>
    </div>
  `;
}

function renderView(state, tasks, filteredTasks, referenceDate) {
  const { view } = state.ui;

  if (view === "sticky") {
    return renderStickyView(tasks, referenceDate, state.ui.stickySort);
  }

  if (view === "calendar") {
    return renderCalendarView(state, filteredTasks, referenceDate);
  }

  if (view === "progress") {
    return renderProgressView(state, filteredTasks);
  }

  if (tasks.length === 0) {
    const empty = {
      inbox: ["📋", "WorkLog is empty", "Add your first item to start tracking work."],
      today: ["✅", "Nothing due today", "You do not have any open work scheduled for today."],
      upcoming: ["📆", "No upcoming items", "Tasks with future due dates will show here."],
      sticky: ["📌", "No sticky notes", "Open tasks will appear here as notes."],
      calendar: ["🗓", "Calendar is empty", "Tasks with due dates will appear on the calendar."],
      progress: ["📈", "No progress yet", "Complete tasks to populate your activity."],
      completed: ["🏁", "No completed items yet", "Completed work will appear here."],
    }[view];

    return `
      <div class="empty-state">
        <div style="font-size:2rem;margin-bottom:10px">${empty[0]}</div>
        <strong>${empty[1]}</strong>
        <div>${empty[2]}</div>
      </div>
    `;
  }

  if (view === "upcoming") {
    const grouped = groupUpcoming(tasks);
    return `
      <div class="task-grid">
        ${grouped
          .map(
            (group) => `
              <section class="task-group">
                <div class="task-group-title">${escapeHtml(formatDate(group.date))}</div>
                <div class="task-list">
                  ${group.tasks.map((task) => renderTaskCard(task, referenceDate)).join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </div>
    `;
  }

  return `<div class="task-list">${tasks
    .map((task) => renderTaskCard(task, referenceDate))
    .join("")}</div>`;
}

function renderTaskCard(task, referenceDate) {
  const overdue = isOverdue(task.dueDate, referenceDate) && !task.completed;
  return `
    <article class="task-card clickable ${task.completed ? "completed" : ""} ${overdue ? "overdue" : ""}" data-action="edit-task" data-task-id="${task.id}">
      <button class="task-check" data-action="toggle-complete" data-task-id="${task.id}" aria-label="Toggle complete">
        ${task.completed ? "✓" : ""}
      </button>
      <div>
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="meta-pill">${CAT_ICONS[task.category]} ${escapeHtml(task.category)}</span>
          <span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
          ${
            task.dueDate
              ? `<span>${overdue ? "⚠" : "📅"} ${escapeHtml(formatDate(task.dueDate))}</span>`
              : ""
          }
        </div>
        ${
          task.notes
            ? `<div class="task-notes">${escapeHtml(task.notes)}</div>`
            : ""
        }
      </div>
      <div class="task-actions">
        <button class="icon-button" data-action="edit-task" data-task-id="${task.id}">✎</button>
      </div>
    </article>
  `;
}

function renderTaskModal(state) {
  const task = state.ui.editingTaskId
    ? state.tasks.find((entry) => entry.id === state.ui.editingTaskId)
    : state.ui.modalSeed || createEmptyTask();

  return `
    <div class="modal-backdrop" data-action="dismiss-task-modal">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Task editor">
        <div class="modal-header">
          <div class="modal-title">${state.ui.editingTaskId ? "Edit WorkLog Item" : "Add WorkLog Item"}</div>
        </div>
        <form class="modal-body" data-form="task">
          <input type="hidden" name="id" value="${escapeHtml(task.id)}">
          <input type="hidden" name="createdAt" value="${escapeHtml(task.createdAt)}">
          <input type="hidden" name="completed" value="${task.completed ? "true" : "false"}">
          <input type="hidden" name="completedAt" value="${escapeHtml(task.completedAt || "")}">
          <div class="field-group">
            <label class="field-label" for="task-title">Title *</label>
            <input id="task-title" class="field-input" name="title" value="${escapeHtml(task.title)}" required autofocus>
          </div>
          <div class="field-grid">
            <div class="field-group">
              <label class="field-label" for="task-category">Category</label>
              <select id="task-category" class="field-select" name="category">
                ${ALL_CATEGORIES.map(
                  (category) => `
                    <option value="${escapeHtml(category)}" ${task.category === category ? "selected" : ""}>
                      ${CAT_ICONS[category]} ${escapeHtml(category)}
                    </option>
                  `,
                ).join("")}
              </select>
            </div>
            <div class="field-group">
              <label class="field-label" for="task-priority">Priority</label>
              <select id="task-priority" class="field-select" name="priority">
                ${["High", "Medium", "Low"]
                  .map(
                    (priority) => `
                      <option value="${priority}" ${task.priority === priority ? "selected" : ""}>${priority}</option>
                    `,
                  )
                  .join("")}
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="task-due-date">Due date</label>
            ${renderDatePicker(task.dueDate || "")}
          </div>
          <div class="field-group">
            <label class="field-label" for="task-notes">Notes</label>
            <textarea id="task-notes" class="field-textarea" name="notes">${escapeHtml(task.notes)}</textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="ghost-button" data-action="close-task-modal">Cancel</button>
            ${
              state.ui.editingTaskId
                ? `<button type="button" class="danger-button" data-action="delete-task" data-task-id="${task.id}">Delete</button>`
                : ""
            }
            <button type="submit" class="primary-button">${state.ui.editingTaskId ? "Save Changes" : "Add to WorkLog"}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderSettingsDrawer(state) {
  const draft = state.ui.settingsDraft;
  return `
    <div class="drawer-backdrop" data-action="dismiss-settings">
      <aside class="drawer-card" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="drawer-header">
          <div class="drawer-title">⚙️ Settings</div>
        </div>
        <div class="drawer-content">
          <div class="settings-section">
            <div class="settings-heading">App Identity</div>
            <div class="field-group">
              <label class="settings-label" for="settings-app-name">App Name</label>
              <input id="settings-app-name" class="field-input" data-settings-field="appName" value="${escapeHtml(draft.appName)}">
            </div>
            <div class="field-group">
              <label class="settings-label" for="settings-app-subtitle">Subtitle</label>
              <input id="settings-app-subtitle" class="field-input" data-settings-field="appSubtitle" value="${escapeHtml(draft.appSubtitle)}">
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-heading">Theme</div>
            <div class="theme-picker">
              ${Object.entries(THEMES)
                .map(
                  ([key, value]) => `
                    <button class="theme-swatch ${draft.theme === key ? "active" : ""}" data-action="set-theme" data-theme-key="${key}">
                      ${escapeHtml(value.name)}
                    </button>
                  `,
                )
                .join("")}
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-heading">Display</div>
            ${renderToggleRow("Count badges", "Show task counts in the sidebar", "showBadges", draft.showBadges)}
            ${renderToggleRow("Celebration sounds", "Preserved for compatibility in later phases", "soundEnabled", draft.soundEnabled)}
            ${renderToggleRow("Focus mode", "Hide category and utility sections in the sidebar", "focusMode", draft.focusMode)}
            ${renderToggleRow("Show import / export", "Display backup buttons in the sidebar", "showImportExport", draft.showImportExport)}
            ${renderToggleRow("Show Completed view", "Keep the completed tab in navigation", "showCompleted", draft.showCompleted)}
          </div>

          <div class="settings-section">
            <div class="settings-heading">Visible Categories</div>
            <div class="muted-copy" style="margin-bottom:10px">Turn categories off to hide them from the sidebar and inbox filter chips.</div>
            ${ALL_CATEGORIES.map(
              (category) => `
                <div class="settings-row">
                  <div class="settings-row-copy">
                    <div class="settings-row-title">${CAT_ICONS[category]} ${escapeHtml(category)}</div>
                  </div>
                  <button
                    class="toggle ${draft.hiddenCategories.includes(category) ? "" : "active"}"
                    data-action="toggle-draft-category"
                    data-category="${escapeHtml(category)}"
                    aria-label="Toggle ${escapeHtml(category)}"
                  ></button>
                </div>
              `,
            ).join("")}
          </div>
        </div>
        <div class="drawer-footer">
          <button class="ghost-button" data-action="close-settings">Cancel</button>
          <button class="primary-button" data-action="save-settings">Save Settings</button>
        </div>
      </aside>
    </div>
  `;
}

function renderToggleRow(title, subtitle, key, enabled) {
  return `
    <div class="settings-row">
      <div class="settings-row-copy">
        <div class="settings-row-title">${escapeHtml(title)}</div>
        <div class="settings-row-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <button class="toggle ${enabled ? "active" : ""}" data-action="toggle-settings-flag" data-settings-key="${key}"></button>
    </div>
  `;
}

function buildNavItems(state) {
  const counts = countTasks(state.tasks, getVisibleCategories(state.settings), todayStr());
  const items = [
    { id: "inbox", label: "WorkLog Inbox", icon: "📥", key: "1", count: counts.open },
    { id: "today", label: "Today", icon: "📅", key: "2", count: counts.today },
    { id: "upcoming", label: "Upcoming", icon: "📆", key: "3", count: counts.upcoming },
    { id: "sticky", label: "Sticky Notes", icon: "📌", key: "4", count: counts.open },
    { id: "calendar", label: "Calendar", icon: "🗓", key: "5", count: counts.withDates },
    { id: "progress", label: "My Progress", icon: "📈", key: "6", count: 0 },
  ];

  if (state.settings.showCompleted) {
    items.push({
      id: "completed",
      label: "Completed",
      icon: "✅",
      key: "7",
      count: counts.completed,
    });
  }

  return items;
}

function countTasks(tasks, visibleCategories, referenceDate) {
  const allowed = tasks.filter((task) => visibleCategories.includes(task.category));
  return {
    open: allowed.filter((task) => !task.completed).length,
    today: allowed.filter((task) => !task.completed && task.dueDate === referenceDate).length,
    upcoming: allowed.filter((task) => !task.completed && task.dueDate && task.dueDate > referenceDate).length,
    withDates: allowed.filter((task) => !task.completed && task.dueDate).length,
    completed: allowed.filter((task) => task.completed).length,
    byCategory: visibleCategories.reduce((accumulator, category) => {
      accumulator[category] = allowed.filter(
        (task) => !task.completed && task.category === category,
      ).length;
      return accumulator;
    }, {}),
  };
}

function buildXpProgress(xp) {
  const level = getLevel(xp);
  const nextLevel = Object.values({
    0: { min: 100, title: "Getting Started" },
    100: { min: 300, title: "On Fire" },
    300: { min: 600, title: "Focused" },
    600: { min: 1000, title: "Champion" },
    1000: { min: 2000, title: "Elite" },
    2000: { min: 5000, title: "Legend" },
  }).find((entry) => entry.min > level.min);

  if (!nextLevel) {
    return { percent: 100, label: "Max" };
  }

  const percent = Math.min(
    100,
    Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100),
  );
  return { percent, label: `${nextLevel.min - xp} to ${nextLevel.title}` };
}

function groupUpcoming(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = task.dueDate || "No Date";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(task);
  });
  return [...groups.entries()].map(([date, groupedTasks]) => ({
    date,
    tasks: groupedTasks,
  }));
}

function renderStickyView(tasks, referenceDate, stickySort) {
  const openTasks = tasks.filter((task) => !task.completed);
  if (openTasks.length === 0) {
    return `
      <div class="empty-state">
        <div style="font-size:2rem;margin-bottom:10px">📌</div>
        <strong>No sticky notes</strong>
        <div>Open tasks will appear here as notes.</div>
      </div>
    `;
  }

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const sorted = [...openTasks].sort((left, right) => {
    if (stickySort === "priority") {
      const priorityDelta = priorityOrder[left.priority] - priorityOrder[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
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

    if (stickySort === "duedate") {
      return priorityOrder[left.priority] - priorityOrder[right.priority];
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  return `
    <div class="sticky-grid">
      ${sorted
        .map((task, index) => {
          const overdue = isOverdue(task.dueDate, referenceDate);
          return `
            <article class="sticky-card clickable ${priorityClass(task.priority)}" data-action="edit-task" data-task-id="${task.id}" style="transform: rotate(${stickyRotation(index)})">
              <div class="sticky-pin"></div>
              <div class="sticky-priority">${escapeHtml(task.priority)}</div>
              <button class="sticky-edit" data-action="edit-task" data-task-id="${task.id}">✎</button>
              <div class="sticky-title">${escapeHtml(task.title)}</div>
              <div class="sticky-meta">
                <div>${CAT_ICONS[task.category]} ${escapeHtml(task.category)}</div>
                <div class="${overdue ? "sticky-overdue" : ""}">
                  ${task.dueDate ? `${overdue ? "⚠" : "📅"} ${escapeHtml(formatDate(task.dueDate))}` : "No due date"}
                </div>
              </div>
              ${
                task.notes
                  ? `<div class="sticky-notes">${escapeHtml(task.notes)}</div>`
                  : ""
              }
              <div class="sticky-actions">
                <button class="ghost-button" data-action="toggle-complete" data-task-id="${task.id}">Mark Done</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCalendarView(state, filteredTasks, referenceDate) {
  const current = new Date(`${state.ui.calDate}T00:00:00`);
  const year = current.getFullYear();
  const month = current.getMonth();
  const cells = buildCalendarCells(year, month);
  const months = [
    { year, month },
    { year: month === 11 ? year + 1 : year, month: (month + 1) % 12 },
    { year: month >= 10 ? year + 1 : year, month: (month + 2) % 12 },
  ];

  if (state.ui.calView === "split") {
    const upcomingTasks = filteredTasks
      .filter((task) => !task.completed && task.dueDate && task.dueDate >= referenceDate)
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    const grouped = groupUpcoming(upcomingTasks);

    return `
      <div class="calendar-split">
        <section class="panel-card calendar-mini-panel">
          ${months
            .map(({ year: miniYear, month: miniMonth }) =>
              renderMiniMonth(filteredTasks, miniYear, miniMonth, referenceDate),
            )
            .join("")}
        </section>
        <section class="panel-card calendar-upcoming-panel">
          <div class="stats-panel-title">🗓 Upcoming Tasks</div>
          <div class="muted-copy" style="margin-top:4px">${upcomingTasks.length} items</div>
          ${
            grouped.length === 0
              ? `
                <div class="empty-state" style="margin-top:16px">
                  <strong>No upcoming tasks</strong>
                  <div>Click a date in the mini calendars to add one.</div>
                </div>
              `
              : `
                <div class="task-grid" style="margin-top:16px">
                  ${grouped
                    .map(
                      (group) => `
                        <section class="task-group">
                          <div class="task-group-title">${escapeHtml(formatDate(group.date))}</div>
                          <div class="task-list">
                            ${group.tasks
                              .map(
                                (task) => `
                                  <article class="task-card clickable" data-action="edit-task" data-task-id="${task.id}">
                                    <button class="task-check" data-action="toggle-complete" data-task-id="${task.id}" aria-label="Toggle complete"></button>
                                    <div>
                                      <div class="task-title">${escapeHtml(task.title)}</div>
                                      <div class="task-meta">
                                        <span class="meta-pill">${CAT_ICONS[task.category]} ${escapeHtml(task.category)}</span>
                                        <span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
                                      </div>
                                    </div>
                                    <div class="task-actions">
                                      <button class="icon-button" data-action="edit-task" data-task-id="${task.id}">✎</button>
                                    </div>
                                  </article>
                                `,
                              )
                              .join("")}
                          </div>
                        </section>
                      `,
                    )
                    .join("")}
                </div>
              `
          }
        </section>
      </div>
    `;
  }

  return `
    <div class="calendar-grid panel-card">
      ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        .map((label) => `<div class="calendar-header">${label}</div>`)
        .join("")}
      ${cells
        .map((day) => {
          if (!day) {
            return '<div class="calendar-cell is-empty"></div>';
          }
          const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = filteredTasks
            .filter((task) => !task.completed && task.dueDate === dateString)
            .sort((left, right) => left.priority.localeCompare(right.priority));
          const isToday = dateString === referenceDate;
          return `
            <button class="calendar-cell ${isToday ? "is-today" : ""}" data-action="new-task-on-date" data-date="${dateString}">
              <div class="calendar-day">${day}</div>
              <div class="calendar-task-stack">
                ${dayTasks
                  .slice(0, 3)
                  .map(
                    (task) => `
                      <span class="calendar-pill clickable ${priorityClass(task.priority)}" data-action="edit-task" data-task-id="${task.id}" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
                    `,
                  )
                  .join("")}
                ${dayTasks.length > 3 ? `<span class="calendar-more">+${dayTasks.length - 3} more</span>` : ""}
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderProgressView(state, filteredTasks) {
  const { xp, streak } = state;
  const now = new Date();
  const completedTasks = filteredTasks.filter((task) => task.completed && task.completedAt);
  const today = todayStr();
  const weekDays = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    weekDays.push(date.toISOString().split("T")[0]);
  }

  const weekCounts = weekDays.map((date) => ({
    date,
    count: completedTasks.filter((task) => task.completedAt?.startsWith(date)).length,
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" }),
  }));
  const weekTotal = weekCounts.reduce((sum, item) => sum + item.count, 0);
  const maxWeek = Math.max(...weekCounts.map((item) => item.count), 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthTotal = completedTasks.filter((task) => task.completedAt >= monthStart).length;
  const catBreakdown = ALL_CATEGORIES.map((category) => ({
    category,
    count: completedTasks.filter(
      (task) => task.completedAt >= monthStart && task.category === category,
    ).length,
  }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);

  const level = getLevel(xp);
  const progress = buildXpProgress(xp);

  return `
    <div class="stats-layout">
      <section class="panel-card stats-hero">
        <div class="stats-badge">${level.badge}</div>
        <div class="stats-copy">
          <div class="stats-kicker">${escapeHtml(level.title)}</div>
          <div class="stats-value">${xp} XP</div>
          <div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div>
          <div class="muted-copy">${escapeHtml(progress.label === "Max" ? "Max level reached" : progress.label)}</div>
        </div>
        <div class="stats-streak">
          <strong>${streak}</strong>
          <span>day streak 🔥</span>
        </div>
      </section>

      <section class="stats-grid">
        ${renderStatCard("✅", "This week", String(weekTotal), "tasks completed")}
        ${renderStatCard("📅", "This month", String(monthTotal), "tasks completed")}
        ${renderStatCard("🎯", "Total done", String(completedTasks.length), "all time")}
        ${renderStatCard("📥", "Open now", String(filteredTasks.filter((task) => !task.completed).length), "active items")}
      </section>

      <section class="panel-card stats-panel">
        <div class="stats-panel-title">📊 This week</div>
        <div class="week-chart">
          ${weekCounts
            .map(
              (item) => `
                <div class="week-bar-wrap">
                  <div class="week-bar-label">${item.count > 0 ? item.count : ""}</div>
                  <div class="week-bar ${item.date === today ? "is-today" : ""}" style="height:${Math.max(8, (item.count / maxWeek) * 96)}px"></div>
                  <div class="week-bar-day">${item.label}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>

      ${
        catBreakdown.length > 0
          ? `
            <section class="panel-card stats-panel">
              <div class="stats-panel-title">📂 This month by category</div>
              <div class="category-chart">
                ${catBreakdown
                  .map(
                    (entry) => `
                      <div class="category-row">
                        <span class="category-name">${CAT_ICONS[entry.category]} ${escapeHtml(entry.category)}</span>
                        <div class="category-track"><div class="category-fill" style="width:${(entry.count / catBreakdown[0].count) * 100}%"></div></div>
                        <span class="category-value">${entry.count}</span>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    </div>
  `;
}

function renderStatCard(icon, label, value, subtitle) {
  return `
    <article class="panel-card stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="muted-copy">${escapeHtml(subtitle)}</div>
    </article>
  `;
}

function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (firstDay + 6) % 7;
  const cells = [];

  for (let index = 0; index < pad; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  return cells;
}

function stickyRotation(index) {
  return ["-1.2deg", "0.8deg", "-0.5deg", "1deg", "0.3deg", "-0.8deg"][index % 6];
}

function renderDatePicker(value) {
  const viewMonth = (value || todayStr()).slice(0, 7);
  return `
    <div class="date-picker" data-date-picker data-view-month="${escapeHtml(viewMonth)}">
      <input id="task-due-date" type="hidden" name="dueDate" value="${escapeHtml(value)}">
      <button type="button" class="date-trigger" data-action="date-picker-toggle" aria-haspopup="dialog" aria-expanded="false">
        <span class="date-trigger-icon">📅</span>
        <span class="date-picker-label">${escapeHtml(value ? formatDate(value) : "Pick a date...")}</span>
        <span class="date-trigger-caret">▾</span>
      </button>
      <div class="date-popup" hidden></div>
    </div>
  `;
}

function renderMiniMonth(filteredTasks, year, month, referenceDate) {
  const cells = buildCalendarCells(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return `
    <section class="mini-month">
      <div class="mini-month-title">${escapeHtml(monthLabel)}</div>
      <div class="mini-month-grid">
        ${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
          .map((label) => `<div class="mini-month-head">${label}</div>`)
          .join("")}
        ${cells
          .map((day, index) => {
            if (!day) {
              return `<div class="mini-month-cell is-empty" data-empty="${index}"></div>`;
            }
            const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = filteredTasks.filter((task) => !task.completed && task.dueDate === dateString).length;
            const isToday = dateString === referenceDate;
            return `
              <button class="mini-month-cell ${isToday ? "is-today" : ""}" data-action="new-task-on-date" data-date="${dateString}">
                <span>${day}</span>
                ${count > 0 ? `<i class="mini-month-dot"></i>` : ""}
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}
