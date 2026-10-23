'use strict';

const STORAGE_KEY = 'studyflow.tasks.v1';
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const categoryInput = document.querySelector('#task-category');
const priorityInput = document.querySelector('#task-priority');
const dueInput = document.querySelector('#task-due');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const importFile = document.querySelector('#import-file');
const toast = document.querySelector('#toast');
let tasks = loadTasks();
let activeFilter = 'all';
let toastTimer;

function normalizeTask(task) {
  if (!task || typeof task.title !== 'string' || !task.title.trim()) return null;
  return {
    id: typeof task.id === 'string' ? task.id : createId(),
    title: task.title.trim().slice(0, 120),
    category: ['Study', 'Assignment', 'Personal', 'Project'].includes(task.category) ? task.category : 'Study',
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    dueDate: typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : '',
    completed: Boolean(task.completed),
    createdAt: Number(task.createdAt) || Date.now()
  };
}

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(savedTasks)) return [];
    return savedTasks.map(normalizeTask).filter(Boolean);
  } catch (error) {
    console.warn('Could not read saved tasks:', error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Could not save tasks:', error);
    showToast('Storage is unavailable. Your changes may not persist.');
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDueDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((task) => activeFilter === 'all' || (activeFilter === 'completed' ? task.completed : !task.completed))
    .filter((task) => `${task.title} ${task.category} ${task.priority}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (sortSelect.value === 'due') return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || b.createdAt - a.createdAt;
      if (sortSelect.value === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt - a.createdAt;
      return b.createdAt - a.createdAt;
    });
}

function displayTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren();

  visibleTasks.forEach((task, index) => {
    const row = document.createElement('article');
    row.className = `task-row${task.completed ? ' is-completed' : ''}`;
    row.style.animationDelay = `${Math.min(index * 45, 270)}ms`;

    const check = document.createElement('button');
    check.className = 'task-check';
    check.type = 'button';
    check.setAttribute('aria-label', task.completed ? `Mark ${task.title} as pending` : `Mark ${task.title} as completed`);
      check.textContent = '✓';
    check.addEventListener('click', () => toggleTask(task.id));

    const details = document.createElement('div');
    details.className = 'task-details';
    const title = document.createElement('p');
    title.className = 'task-name';
    title.textContent = task.title;
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const category = document.createElement('span');
    category.className = `category-label category-${task.category.toLowerCase()}`;
    category.textContent = task.category;
    meta.append(category);
    if (task.dueDate) {
      const due = document.createElement('span');
      due.className = `due-label${isOverdue(task) ? ' overdue' : ''}`;
      due.textContent = `${isOverdue(task) ? 'Overdue · ' : 'Due '}${formatDueDate(task.dueDate)}`;
      meta.append(due);
    }
    details.append(title, meta);

    const priority = document.createElement('span');
    priority.className = `task-priority priority-${task.priority}`;
    priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const edit = document.createElement('button');
    edit.className = 'task-action';
    edit.type = 'button';
    edit.setAttribute('aria-label', `Edit ${task.title}`);
    edit.title = 'Edit task';
    edit.textContent = '✎';
    edit.addEventListener('click', () => editTask(task.id));
    const remove = document.createElement('button');
    remove.className = 'task-action delete';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.title = 'Delete task';
    remove.textContent = '×';
    remove.addEventListener('click', () => deleteTask(task.id));
    actions.append(edit, remove);
    row.append(check, details, priority, actions);
    taskList.append(row);
  });

  const noTasks = visibleTasks.length === 0;
  emptyState.hidden = !noTasks;
  taskList.hidden = noTasks;
  const hasAnyTasks = tasks.length > 0;
  document.querySelector('#empty-title').textContent = searchInput.value.trim() ? 'No matches' : hasAnyTasks ? 'No tasks in this view' : 'No tasks yet';
  document.querySelector('#empty-copy').textContent = searchInput.value.trim()
    ? 'Try a different search or filter.'
    : hasAnyTasks ? 'Choose another filter to view tasks.' : 'Add a task to get started.';
  document.querySelector('#empty-cta').hidden = hasAnyTasks || Boolean(searchInput.value.trim());
  updateStats();
}

function updateStats() {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  document.querySelector('#total-stat').textContent = tasks.length;
  document.querySelector('#pending-stat').textContent = pending;
  document.querySelector('#completed-stat').textContent = completed;
  document.querySelector('#progress-label').textContent = `${percent}% of your tasks`;
  document.querySelector('#mini-progress-fill').style.width = `${percent}%`;
  document.querySelector('#all-nav-count').textContent = tasks.length;
  document.querySelector('#pending-nav-count').textContent = pending;
  document.querySelector('#all-tab-count').textContent = tasks.length;
  document.querySelector('#list-summary').textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} · ${pending} left to do`;
  document.querySelector('#clear-completed').hidden = completed === 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('is-active', selected);
    if (button.classList.contains('nav-item')) {
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  });
  displayTasks();
}

function addTask(title, category, priority, dueDate) {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    taskInput.focus();
    return false;
  }
  tasks.unshift({ id: createId(), title: title.trim(), category, priority, dueDate, completed: false, createdAt: Date.now() });
  saveTasks();
  displayTasks();
  showToast('Task added.');
  return true;
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  displayTasks();
  showToast(task.completed ? 'Task completed.' : 'Task moved to pending.');
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  displayTasks();
  if (task) showToast('Task deleted.');
}

function editTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  const updatedTitle = window.prompt('Edit your task:', task.title);
  if (updatedTitle === null) return;
  const cleanTitle = updatedTitle.trim();
  if (!cleanTitle) {
    showToast('A task needs a name.');
    return;
  }
  task.title = cleanTitle.slice(0, 120);
  saveTasks();
  displayTasks();
  showToast('Task updated.');
}

function exportTasks() {
  const backup = { app: 'Studyflow', version: 1, exportedAt: new Date().toISOString(), tasks };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `studyflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('JSON backup downloaded.');
}

async function importTasks(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : parsed?.tasks;
    if (!Array.isArray(incoming)) throw new Error('The file does not contain a task list.');
    const imported = incoming.map(normalizeTask).filter(Boolean);
    if (!imported.length && incoming.length) throw new Error('No valid tasks were found in the file.');
    const existingIds = new Set(tasks.map((task) => task.id));
    const uniqueTasks = imported.map((task) => {
      if (existingIds.has(task.id)) task.id = createId();
      existingIds.add(task.id);
      return task;
    });
    tasks = [...uniqueTasks, ...tasks];
    saveTasks();
    setFilter('all');
    showToast(`${uniqueTasks.length} ${uniqueTasks.length === 1 ? 'task' : 'tasks'} imported.`);
  } catch (error) {
    showToast(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message || 'Could not import this file.');
  } finally {
    importFile.value = '';
  }
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const didAddTask = addTask(taskInput.value, categoryInput.value, priorityInput.value, dueInput.value);
  if (!didAddTask) return;
  taskForm.reset();
  priorityInput.value = 'medium';
  taskInput.focus();
});

searchInput.addEventListener('input', displayTasks);
sortSelect.addEventListener('change', displayTasks);
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});
document.querySelector('#clear-completed').addEventListener('click', () => {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (!completedCount) return;
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  displayTasks();
  showToast(`${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'} cleared.`);
});
document.querySelector('#empty-cta').addEventListener('click', () => taskInput.focus());
document.querySelector('#export-json').addEventListener('click', exportTasks);
document.querySelector('#import-json').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => importTasks(importFile.files[0]));
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    tasks = loadTasks();
    displayTasks();
    showToast('Task list updated in another tab.');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if ((event.key === 'n' || event.key === 'N') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    taskInput.focus();
  }
  if (event.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    displayTasks();
    searchInput.blur();
  }
});
document.querySelector('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());

displayTasks();
