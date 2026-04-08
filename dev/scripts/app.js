import { parseBackupText, triggerBackupDownload } from "./storage.js";
import { createStore } from "./state.js";
import { renderApp } from "./render.js";
import { createEmptyTask, formatDate, todayStr } from "./utils.js";

const root = document.getElementById("app");
const importInput = document.getElementById("import-file");
const store = createStore();
const { actions, state } = store;

function render() {
  const activeState = captureActiveInputState();
  renderApp(root, state);
  restoreActiveInputState(activeState);
}

function createTaskSeed(overrides = {}) {
  const category =
    state.ui.filterCat && state.ui.filterCat !== "All"
      ? state.ui.filterCat
      : createEmptyTask().category;

  return {
    ...createEmptyTask(),
    category,
    ...overrides,
  };
}

store.subscribe(render);
render();

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-date-picker]")) {
    closeAllDatePickers();
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === "toggle-sidebar") {
    actions.toggleSidebar();
    return;
  }

  if (action === "set-view") {
    actions.setView(actionTarget.dataset.view);
    return;
  }

  if (action === "set-sticky-sort") {
    actions.setStickySort(actionTarget.dataset.sort);
    return;
  }

  if (action === "calendar-shift") {
    actions.shiftCalendarMonth(Number(actionTarget.dataset.direction));
    return;
  }

  if (action === "calendar-today") {
    actions.setCalendarToday();
    return;
  }

  if (action === "set-calendar-view") {
    actions.setCalendarView(actionTarget.dataset.calendarView);
    return;
  }

  if (action === "filter-category") {
    actions.setFilterCat(actionTarget.dataset.category);
    return;
  }

  if (action === "new-task") {
    actions.openTaskModal(null, createTaskSeed());
    return;
  }

  if (action === "date-picker-toggle") {
    toggleDatePicker(actionTarget.closest("[data-date-picker]"));
    return;
  }

  if (action === "date-picker-prev") {
    shiftDatePickerMonth(actionTarget.closest("[data-date-picker]"), -1);
    return;
  }

  if (action === "date-picker-next") {
    shiftDatePickerMonth(actionTarget.closest("[data-date-picker]"), 1);
    return;
  }

  if (action === "date-picker-select") {
    setDatePickerValue(actionTarget.closest("[data-date-picker]"), actionTarget.dataset.dateValue);
    closeDatePicker(actionTarget.closest("[data-date-picker]"));
    return;
  }

  if (action === "date-picker-clear") {
    setDatePickerValue(actionTarget.closest("[data-date-picker]"), "");
    closeDatePicker(actionTarget.closest("[data-date-picker]"));
    return;
  }

  if (action === "date-picker-today") {
    const today = todayStr();
    setDatePickerValue(actionTarget.closest("[data-date-picker]"), today);
    closeDatePicker(actionTarget.closest("[data-date-picker]"));
    return;
  }

  if (action === "edit-task") {
    actions.openTaskModal(actionTarget.dataset.taskId);
    return;
  }

  if (action === "close-task-modal") {
    actions.closeTaskModal();
    return;
  }

  if (action === "dismiss-task-modal" && event.target === actionTarget) {
    actions.closeTaskModal();
    return;
  }

  if (action === "delete-task") {
    actions.deleteTask(actionTarget.dataset.taskId);
    return;
  }

  if (action === "toggle-complete") {
    actions.toggleTaskComplete(actionTarget.dataset.taskId);
    return;
  }

  if (action === "open-settings") {
    actions.openSettings();
    return;
  }

  if (action === "close-settings") {
    actions.closeSettings();
    return;
  }

  if (action === "dismiss-settings" && event.target === actionTarget) {
    actions.closeSettings();
    return;
  }

  if (action === "toggle-settings-flag") {
    const key = actionTarget.dataset.settingsKey;
    const nextValue = !state.ui.settingsDraft[key];
    actions.updateSettingsDraft(key, nextValue);
    return;
  }

  if (action === "toggle-draft-category") {
    actions.toggleDraftCategory(actionTarget.dataset.category);
    return;
  }

  if (action === "set-theme") {
    actions.updateSettingsDraft("theme", actionTarget.dataset.themeKey);
    return;
  }

  if (action === "save-settings") {
    actions.saveSettings();
    return;
  }

  if (action === "export-backup") {
    triggerBackupDownload(state);
    return;
  }

  if (action === "trigger-import") {
    importInput.click();
    return;
  }

  if (action === "new-task-on-date") {
    actions.openTaskModal(null, {
      ...createTaskSeed(),
      dueDate: actionTarget.dataset.date,
    });
  }
});

document.addEventListener("input", (event) => {
  const settingsField = event.target.closest("[data-settings-field]");
  if (settingsField) {
    actions.updateSettingsDraft(settingsField.dataset.settingsField, settingsField.value);
    return;
  }

  const field = event.target.closest("[data-field]");
  if (field && field.dataset.field === "search") {
    actions.setSearch(field.value);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest('[data-form="task"]');
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.completed = payload.completed === "true";
  payload.completedAt = payload.completedAt || null;

  try {
    actions.saveTask(payload);
  } catch (error) {
    window.alert(error.message);
  }
});

document.addEventListener("keydown", (event) => {
  const tagName = document.activeElement?.tagName?.toLowerCase();
  const typing = tagName === "input" || tagName === "textarea" || tagName === "select";

  if (event.key === "Escape") {
    if (state.ui.taskModalOpen) {
      actions.closeTaskModal();
      return;
    }
    if (state.ui.settingsOpen) {
      actions.closeSettings();
      return;
    }
  }

  if (typing) {
    return;
  }

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    actions.openTaskModal(null, createTaskSeed());
    return;
  }

  if (event.key === "b" || event.key === "B") {
    actions.toggleSidebar();
    return;
  }

  if (event.key === "1") {
    actions.setView("inbox");
    return;
  }

  if (event.key === "2") {
    actions.setView("today");
    return;
  }

  if (event.key === "3") {
    actions.setView("upcoming");
    return;
  }

  if (event.key === "4") {
    actions.setView("sticky");
    return;
  }

  if (event.key === "5") {
    actions.setView("calendar");
    return;
  }

  if (event.key === "6") {
    actions.setView("progress");
    return;
  }

  if (event.key === "7" && state.settings.showCompleted) {
    actions.setView("completed");
  }
});

importInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = parseBackupText(text);
    actions.importBackup(payload);
    window.alert(`Imported ${payload.tasks.length} tasks.`);
  } catch (error) {
    window.alert(error.message || "Could not read file.");
  } finally {
    importInput.value = "";
  }
});

function toggleDatePicker(root) {
  if (!root) {
    return;
  }

  const popup = root.querySelector(".date-popup");
  const willOpen = popup.hidden;
  closeAllDatePickers(root);

  if (!willOpen) {
    closeDatePicker(root);
    return;
  }

  renderDatePickerPopup(root);
  root.classList.add("open");
  popup.hidden = false;
  root.querySelector('[data-action="date-picker-toggle"]')?.setAttribute("aria-expanded", "true");
}

function closeDatePicker(root) {
  if (!root) {
    return;
  }

  root.classList.remove("open");
  const popup = root.querySelector(".date-popup");
  if (popup) {
    popup.hidden = true;
  }
  root.querySelector('[data-action="date-picker-toggle"]')?.setAttribute("aria-expanded", "false");
}

function closeAllDatePickers(exceptRoot = null) {
  document.querySelectorAll("[data-date-picker]").forEach((root) => {
    if (root !== exceptRoot) {
      closeDatePicker(root);
    }
  });
}

function shiftDatePickerMonth(root, delta) {
  if (!root) {
    return;
  }

  const [year, month] = root.dataset.viewMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  root.dataset.viewMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  renderDatePickerPopup(root);
}

function setDatePickerValue(root, value) {
  if (!root) {
    return;
  }

  const input = root.querySelector('input[name="dueDate"]');
  const label = root.querySelector(".date-picker-label");
  input.value = value;
  label.textContent = value ? formatDate(value) : "Pick a date...";
  if (value) {
    root.dataset.viewMonth = value.slice(0, 7);
  }
}

function renderDatePickerPopup(root) {
  const popup = root.querySelector(".date-popup");
  const input = root.querySelector('input[name="dueDate"]');
  const selected = input.value;
  const viewMonth = root.dataset.viewMonth || (selected || todayStr()).slice(0, 7);
  const [year, month] = viewMonth.split("-").map(Number);
  const viewDate = new Date(year, month - 1, 1);
  const monthTitle = viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const today = todayStr();
  const cells = buildDatePickerCells(viewDate.getFullYear(), viewDate.getMonth());

  popup.innerHTML = `
    <div class="date-popup-header">
      <button type="button" class="icon-button" data-action="date-picker-prev">◀</button>
      <div class="date-popup-title">${monthTitle}</div>
      <button type="button" class="icon-button" data-action="date-picker-next">▶</button>
    </div>
    <div class="date-popup-weekdays">
      ${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
        .map((label) => `<div class="date-popup-weekday">${label}</div>`)
        .join("")}
    </div>
    <div class="date-popup-grid">
      ${cells
        .map((day) => {
          if (!day) {
            return '<button type="button" class="date-popup-day is-empty" tabindex="-1"></button>';
          }
          const value = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const classes = [
            "date-popup-day",
            value === today ? "today" : "",
            value === selected ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<button type="button" class="${classes}" data-action="date-picker-select" data-date-value="${value}">${day}</button>`;
        })
        .join("")}
    </div>
    <div class="date-popup-footer">
      <button type="button" class="ghost-button" data-action="date-picker-today">Today</button>
      <button type="button" class="ghost-button" data-action="date-picker-clear">Clear</button>
    </div>
  `;
}

function buildDatePickerCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const padding = (firstDay + 6) % 7;
  const cells = [];

  for (let index = 0; index < padding; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  return cells;
}

function captureActiveInputState() {
  const active = document.activeElement;
  if (!active) {
    return null;
  }

  const searchField = active.closest("[data-field]");
  if (searchField?.dataset.field === "search") {
    return {
      selector: '[data-field="search"]',
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
    };
  }

  const settingsField = active.closest("[data-settings-field]");
  if (settingsField?.dataset.settingsField) {
    return {
      selector: `[data-settings-field="${settingsField.dataset.settingsField}"]`,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
    };
  }

  return null;
}

function restoreActiveInputState(activeState) {
  if (!activeState?.selector) {
    return;
  }

  const input = document.querySelector(activeState.selector);
  if (!input) {
    return;
  }

  input.focus();
  if (
    typeof activeState.selectionStart === "number" &&
    typeof activeState.selectionEnd === "number" &&
    typeof input.setSelectionRange === "function"
  ) {
    input.setSelectionRange(activeState.selectionStart, activeState.selectionEnd);
  }
}
