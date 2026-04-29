const API = '/api';
const tokenKey = 'erasmus-token';
const profileKey = 'erasmus-profile';
const themeKey = 'erasmus-theme';
const fontKey = 'erasmus-font-size';
const accentKey = 'erasmus-accent';

const navToggle = document.querySelector('[data-menu-toggle]');
const navList = document.querySelector('[data-nav-list]');
navToggle?.addEventListener('click', () => navList?.classList.toggle('open'));

function token() { return localStorage.getItem(tokenKey); }
function saveProfile(profile) { localStorage.setItem(profileKey, JSON.stringify(profile)); }
function loadProfile() { try { return JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch { return {}; } }
function setAuth(data) { localStorage.setItem(tokenKey, data.token); saveProfile(data.user); }
function isAuthenticated() { return Boolean(token()); }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function requireAuthForPage() {
  const needsAuth = document.body.dataset.requiresAuth === 'true';
  if (needsAuth && !isAuthenticated()) window.location.href = 'index.html';
}
requireAuthForPage();

document.querySelectorAll('[data-logout]').forEach((button) => {
  button.addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(profileKey);
    window.location.href = 'index.html';
  });
});

const showLogin = document.getElementById('showLogin');
const showRegister = document.getElementById('showRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authStatus = document.getElementById('authStatus');

function activateTab(mode) {
  if (!showLogin || !showRegister || !loginForm || !registerForm) return;
  showLogin.classList.toggle('active', mode === 'login');
  showRegister.classList.toggle('active', mode === 'register');
  loginForm.classList.toggle('hidden', mode !== 'login');
  registerForm.classList.toggle('hidden', mode !== 'register');
}
showLogin?.addEventListener('click', () => activateTab('login'));
showRegister?.addEventListener('click', () => activateTab('register'));

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value,
      }),
    });
    setAuth(data);
    if (authStatus) authStatus.textContent = `Welcome back, ${data.user.name}. Redirecting to your planner...`;
    window.location.href = 'home.html';
  } catch (error) {
    if (authStatus) authStatus.textContent = error.message;
  }
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        country: document.getElementById('registerCountry').value.trim(),
        semester: document.getElementById('registerSemester').value.trim(),
        password: document.getElementById('registerPassword').value,
      }),
    });
    setAuth(data);
    if (authStatus) authStatus.textContent = `Account created for ${data.user.name}. Redirecting...`;
    window.location.href = 'home.html';
  } catch (error) {
    if (authStatus) authStatus.textContent = error.message;
  }
});

const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileCountry = document.getElementById('profileCountry');
const profileSemester = document.getElementById('profileSemester');
const profileNotesPreview = document.getElementById('profileNotesPreview');
const summaryCountry = document.getElementById('summaryCountry');
const summarySemester = document.getElementById('summarySemester');
const summaryName = document.getElementById('summaryName');
const profileForm = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');

function applyProfile(profile) {
  if (profile.name && profileName) profileName.textContent = profile.name;
  if (profile.email && profileEmail) profileEmail.textContent = profile.email;
  if (profile.country && profileCountry) profileCountry.textContent = profile.country;
  if (profile.semester && profileSemester) profileSemester.textContent = profile.semester;
  if (profile.country && summaryCountry) summaryCountry.textContent = profile.country;
  if (profile.semester && summarySemester) summarySemester.textContent = profile.semester;
  if (profile.name && summaryName) summaryName.textContent = profile.name;
  if (profile.notes && profileNotesPreview) profileNotesPreview.textContent = profile.notes;
}
applyProfile(loadProfile());

async function loadMe() {
  if (!isAuthenticated()) return;
  try {
    const data = await api('/me');
    saveProfile(data.user);
    applyProfile(data.user);
  } catch { localStorage.removeItem(tokenKey); }
}
loadMe();

profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const current = loadProfile();
  const updated = {
    name: document.getElementById('profileNameInput')?.value.trim() || current.name || 'Student',
    email: document.getElementById('profileEmailInput')?.value.trim() || current.email || 'student@vdu.lt',
    country: document.getElementById('profileCountryInput')?.value.trim() || current.country || 'Spain',
    semester: document.getElementById('profileSemesterInput')?.value.trim() || current.semester || 'Fall 2026',
    notes: document.getElementById('profileNotes')?.value.trim() || current.notes || 'Need host university course approval and accommodation search.',
  };
  try {
    const data = await api('/me', { method: 'PUT', body: JSON.stringify(updated) });
    saveProfile(data.user);
    applyProfile(data.user);
    if (profileStatus) profileStatus.textContent = 'Profile information saved in the database.';
    profileForm.reset();
  } catch (error) {
    if (profileStatus) profileStatus.textContent = error.message;
  }
});

const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const taskPreviewList = document.getElementById('taskPreviewList');
const openTaskCount = document.getElementById('openTaskCount');
const statusFilter = document.getElementById('statusFilter');
const taskSearch = document.getElementById('taskSearch');
const taskSearchBtn = document.getElementById('taskSearchBtn');
const taskSearchStatus = document.getElementById('taskSearchStatus');
const taskSubmitBtn = document.getElementById('taskSubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let tasks = [];

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = tasks.map(task => `
    <li data-id="${task.id}" data-status="${task.status}" class="${task.status === 'completed' ? 'done' : ''}">
      <div class="task-row">
        <div>
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">${task.status === 'completed' ? 'Completed' : task.deadline} • ${escapeHtml(task.category || 'General')}</div>
        </div>
        <div class="task-actions">
          <button type="button" class="small-btn edit-btn">Edit</button>
          <button type="button" class="small-btn complete-btn">${task.status === 'completed' ? 'Undo' : 'Complete'}</button>
          <button type="button" class="small-btn danger delete-btn">Delete</button>
        </div>
      </div>
    </li>`).join('');
  countOpenTasks();
  syncPreview();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function countOpenTasks() {
  if (openTaskCount) openTaskCount.textContent = String(tasks.filter(t => t.status === 'pending').length);
}
function syncPreview() {
  if (!taskPreviewList) return;
  taskPreviewList.innerHTML = tasks.slice(0, 3).map(t => `<li><div class="task-row"><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${t.status === 'completed' ? 'Completed' : t.deadline}</div></div></div></li>`).join('');
}
async function loadTasks() {
  if (!taskList) return;
  try {
    const status = statusFilter?.value || 'all';
    const q = taskSearch?.value || '';
    const data = await api(`/tasks?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
    tasks = data.tasks;
    renderTasks();
    if (taskSearchStatus) taskSearchStatus.textContent = data.message || `${tasks.length} task(s) found.`;
  } catch (error) {
    if (taskSearchStatus) taskSearchStatus.textContent = error.message;
  }
}

function resetTaskForm() {
  document.getElementById('taskId').value = '';
  taskForm?.reset();
  if (taskSubmitBtn) taskSubmitBtn.textContent = 'Add task';
}

taskForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('taskId').value;
  const payload = {
    title: document.getElementById('taskTitle').value.trim(),
    deadline: document.getElementById('taskDeadline').value,
    category: document.getElementById('taskCategory')?.value.trim() || 'General',
    status: document.getElementById('taskStatus').value,
  };
  try {
    await api(id ? `/tasks/${id}` : '/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    resetTaskForm();
    await loadTasks();
  } catch (error) { if (taskSearchStatus) taskSearchStatus.textContent = error.message; }
});

cancelEditBtn?.addEventListener('click', resetTaskForm);
statusFilter?.addEventListener('change', loadTasks);
taskSearchBtn?.addEventListener('click', loadTasks);
taskSearch?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadTasks(); } });

taskList?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const item = target.closest('li');
  if (!item) return;
  const id = item.dataset.id;
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) return;
  try {
    if (target.classList.contains('delete-btn')) await api(`/tasks/${id}`, { method: 'DELETE' });
    if (target.classList.contains('complete-btn')) await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' }) });
    if (target.classList.contains('edit-btn')) {
      document.getElementById('taskId').value = task.id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDeadline').value = task.deadline;
      document.getElementById('taskCategory').value = task.category || 'General';
      document.getElementById('taskStatus').value = task.status;
      if (taskSubmitBtn) taskSubmitBtn.textContent = 'Save changes';
      return;
    }
    await loadTasks();
  } catch (error) { if (taskSearchStatus) taskSearchStatus.textContent = error.message; }
});
loadTasks();

const documentForm = document.getElementById('documentForm');
const documentList = document.getElementById('documentList');
const docCount = document.getElementById('docCount');
let documents = [];
function renderDocuments() {
  if (!documentList) return;
  documentList.innerHTML = documents.map(d => `<li data-id="${d.id}"><div class="doc-row"><div><strong>${escapeHtml(d.file_name)}</strong><div class="doc-meta">${escapeHtml(d.title)} ${d.description ? '— ' + escapeHtml(d.description) : ''}</div></div><button type="button" class="small-btn danger delete-doc-btn">Delete</button></div></li>`).join('');
  if (docCount) docCount.textContent = String(documents.length);
}
async function loadDocuments() {
  if (!documentList) return;
  const data = await api('/documents');
  documents = data.documents;
  renderDocuments();
}
documentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.getElementById('documentTitle').value.trim();
  const fileInput = document.getElementById('documentFile');
  const fileName = fileInput.files[0]?.name || `${title || 'document'}.pdf`;
  await api('/documents', { method: 'POST', body: JSON.stringify({ title, fileName, description: 'Added to planner' }) });
  documentForm.reset();
  await loadDocuments();
});
documentList?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('delete-doc-btn')) return;
  const id = target.closest('li')?.dataset.id;
  if (id) { await api(`/documents/${id}`, { method: 'DELETE' }); await loadDocuments(); }
});
loadDocuments();

const themeToggle = document.getElementById('themeToggle');
const fontSlider = document.getElementById('fontSlider');
const fontValue = document.getElementById('fontValue');
const colorPicker = document.getElementById('colorPicker');
const messageBtn = document.getElementById('messageBtn');
const announcementText = document.getElementById('announcementText');
const toggleDocsBtn = document.getElementById('toggleDocsBtn');
const documentsBlock = document.getElementById('documentsBlock');
const reminderOptions = [
  'Remember to confirm the final course list before the Learning Agreement is signed.',
  'Accommodation search should start early because popular student housing fills quickly.',
  'Check whether insurance coverage dates match your whole mobility period.'
];
let reminderIndex = 0;

if (localStorage.getItem(themeKey) === 'dark') { document.body.classList.add('dark'); if (themeToggle) themeToggle.checked = true; }
const savedFontSize = localStorage.getItem(fontKey);
if (savedFontSize) { document.documentElement.style.setProperty('--base-font', savedFontSize); if (fontSlider) fontSlider.value = parseInt(savedFontSize, 10); if (fontValue) fontValue.textContent = savedFontSize; }
const savedAccent = localStorage.getItem(accentKey);
if (savedAccent) { document.documentElement.style.setProperty('--accent', savedAccent); if (colorPicker) colorPicker.value = savedAccent; }

themeToggle?.addEventListener('change', () => { document.body.classList.toggle('dark'); localStorage.setItem(themeKey, document.body.classList.contains('dark') ? 'dark' : 'light'); });
fontSlider?.addEventListener('input', event => { const size = `${event.target.value}px`; document.documentElement.style.setProperty('--base-font', size); localStorage.setItem(fontKey, size); if (fontValue) fontValue.textContent = size; });
colorPicker?.addEventListener('input', event => { document.documentElement.style.setProperty('--accent', event.target.value); localStorage.setItem(accentKey, event.target.value); });
messageBtn?.addEventListener('click', () => { reminderIndex = (reminderIndex + 1) % reminderOptions.length; if (announcementText) announcementText.textContent = reminderOptions[reminderIndex]; });
toggleDocsBtn?.addEventListener('click', () => documentsBlock?.classList.toggle('hidden'));

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightbox = document.getElementById('closeLightbox');
document.querySelectorAll('[data-lightbox-item]').forEach(item => {
  item.addEventListener('click', () => {
    const image = item.querySelector('img');
    if (!image || !lightbox || !lightboxImage) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightbox.showModal();
  });
});
closeLightbox?.addEventListener('click', () => lightbox?.close());
lightbox?.addEventListener('click', (event) => {
  const rect = lightbox.getBoundingClientRect();
  const inside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
  if (!inside) lightbox.close();
});
