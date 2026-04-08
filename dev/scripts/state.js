import { loadPersistedState, savePersistedState } from "./storage.js";
import { SoundEngine } from "./sound.js";
import {
  DEFAULT_SETTINGS,
  createEmptyTask,
  getLevel,
  newId,
  normalizeSettings,
  normalizeTask,
  todayStr,
  xpForTask,
} from "./utils.js";

export function createStore() {
  const persisted = loadPersistedState();
  SoundEngine.enabled = persisted.settings?.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled;

  const state = {
    rawPersisted: persisted.rawPersisted,
    tasks: persisted.tasks,
    settings: persisted.settings || DEFAULT_SETTINGS,
    xp: persisted.xp,
    streak: persisted.streak,
    lastCompletedDate: persisted.lastCompletedDate,
    ui: {
      view: persisted.uiPrefs.view,
      filterCat: persisted.uiPrefs.filterCat,
      search: "",
      sidebarOpen: persisted.uiPrefs.sidebarOpen,
      calDate: persisted.uiPrefs.calDate || new Date().toISOString().split("T")[0],
      calView: persisted.uiPrefs.calView,
      stickySort: persisted.uiPrefs.stickySort,
      settingsOpen: false,
      taskModalOpen: false,
      editingTaskId: null,
      settingsDraft: persisted.settings || DEFAULT_SETTINGS,
    },
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  function persistAndNotify() {
    savePersistedState(state);
    notify();
  }

  function updateTaskCollection(updater) {
    state.tasks = updater(state.tasks).map(normalizeTask);
    persistAndNotify();
  }

  function setView(view) {
    state.ui.view = view;
    if (view !== "inbox" && state.ui.filterCat !== "All") {
      state.ui.filterCat = "All";
    }
    persistAndNotify();
  }

  function setFilterCat(category) {
    state.ui.view = "inbox";
    state.ui.filterCat = category;
    persistAndNotify();
  }

  function setSearch(search) {
    state.ui.search = search;
    notify();
  }

  function toggleSidebar() {
    state.ui.sidebarOpen = !state.ui.sidebarOpen;
    persistAndNotify();
  }

  function setStickySort(sort) {
    state.ui.stickySort = sort;
    persistAndNotify();
  }

  function shiftCalendarMonth(direction) {
    const current = new Date(`${state.ui.calDate}T00:00:00`);
    const shifted = new Date(current.getFullYear(), current.getMonth() + direction, 1);
    state.ui.calDate = shifted.toISOString().split("T")[0];
    persistAndNotify();
  }

  function setCalendarToday() {
    state.ui.calDate = new Date().toISOString().split("T")[0];
    persistAndNotify();
  }

  function setCalendarView(view) {
    state.ui.calView = view;
    persistAndNotify();
  }

  function openTaskModal(taskId = null, seedTask = null) {
    state.ui.taskModalOpen = true;
    state.ui.editingTaskId = taskId;
    state.ui.modalSeed = seedTask ? normalizeTask(seedTask) : null;
    notify();
  }

  function closeTaskModal() {
    state.ui.taskModalOpen = false;
    state.ui.editingTaskId = null;
    state.ui.modalSeed = null;
    notify();
  }

  function getEditingTask() {
    if (state.ui.editingTaskId) {
      return state.tasks.find((task) => task.id === state.ui.editingTaskId) || null;
    }
    return state.ui.modalSeed || createEmptyTask();
  }

  function saveTask(formData) {
    const task = normalizeTask({
      ...formData,
      id: formData.id || newId(),
      createdAt: formData.createdAt || new Date().toISOString(),
    });

    if (!task.title.trim()) {
      throw new Error("Title is required.");
    }

    if (state.ui.editingTaskId) {
      updateTaskCollection((tasks) =>
        tasks.map((entry) => (entry.id === task.id ? task : entry)),
      );
    } else {
      updateTaskCollection((tasks) => [task, ...tasks]);
    }

    closeTaskModal();
  }

  function deleteTask(taskId) {
    updateTaskCollection((tasks) => tasks.filter((task) => task.id !== taskId));
    closeTaskModal();
  }

  function toggleTaskComplete(taskId) {
    const now = new Date().toISOString();
    const today = todayStr();
    updateTaskCollection((tasks) =>
      tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        const completed = !task.completed;
        SoundEngine.enabled = state.settings.soundEnabled;
        SoundEngine.play(task.priority, task.completed);
        if (completed) {
          const onTime = task.dueDate && task.dueDate >= today;
          const earned = xpForTask(task.priority, onTime);
          const previousLevel = getLevel(state.xp);
          state.xp += earned;
          const nextLevel = getLevel(state.xp);

          if (nextLevel.title !== previousLevel.title) {
            SoundEngine.playLevelUpFanfare();
          }

          if (state.lastCompletedDate === today) {
            // Keep existing streak; today's completion already counted.
          } else if (state.lastCompletedDate) {
            const lastDate = new Date(`${state.lastCompletedDate}T00:00:00`);
            const diff = Math.round((new Date(`${today}T00:00:00`) - lastDate) / 86400000);
            if (diff === 1) {
              const newStreak = state.streak + 1;
              state.streak = newStreak;
              if (newStreak === 3) {
                state.xp += 50;
              }
              if (newStreak === 7) {
                state.xp += 150;
              }
            } else if (diff > 1) {
              state.streak = 1;
            }
          } else {
            state.streak = 1;
          }
          state.lastCompletedDate = today;
        }
        return {
          ...task,
          completed,
          completedAt: completed ? now : null,
        };
      }),
    );
  }

  function openSettings() {
    state.ui.settingsDraft = normalizeSettings(state.settings);
    state.ui.settingsOpen = true;
    notify();
  }

  function closeSettings() {
    state.ui.settingsOpen = false;
    state.ui.settingsDraft = normalizeSettings(state.settings);
    notify();
  }

  function updateSettingsDraft(key, value) {
    const nextDraft = {
      ...state.ui.settingsDraft,
      [key]: value,
    };
    state.ui.settingsDraft = normalizeSettings(nextDraft);
    notify();
  }

  function toggleDraftCategory(category) {
    const hidden = new Set(state.ui.settingsDraft.hiddenCategories);
    if (hidden.has(category)) {
      hidden.delete(category);
    } else {
      hidden.add(category);
    }
    updateSettingsDraft("hiddenCategories", [...hidden]);
  }

  function saveSettings() {
    state.settings = normalizeSettings(state.ui.settingsDraft);
    SoundEngine.enabled = state.settings.soundEnabled;
    state.ui.settingsOpen = false;
    if (!state.settings.showCompleted && state.ui.view === "completed") {
      state.ui.view = "inbox";
    }
    if (
      state.ui.filterCat !== "All" &&
      state.settings.hiddenCategories.includes(state.ui.filterCat)
    ) {
      state.ui.filterCat = "All";
    }
    persistAndNotify();
  }

  function importBackup(payload) {
    state.tasks = payload.tasks.map(normalizeTask);
    state.xp = payload.xp;
    state.streak = payload.streak;
    persistAndNotify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    state,
    subscribe,
    actions: {
      closeSettings,
      closeTaskModal,
      deleteTask,
      getEditingTask,
      importBackup,
      openSettings,
      openTaskModal,
      saveSettings,
      saveTask,
      setCalendarToday,
      setCalendarView,
      setFilterCat,
      setSearch,
      setStickySort,
      setView,
      shiftCalendarMonth,
      toggleDraftCategory,
      toggleSidebar,
      toggleTaskComplete,
      updateSettingsDraft,
    },
  };
}
