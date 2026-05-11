/* ============================================
   CLINIC OS — SHARED APP SHELL
   Runs on every page except login.html
   ============================================ */

// ---- Utility Functions (global) ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function openModal(title, bodyHTML, size = '') {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  container.className = 'modal-container' + (size ? ' ' + size : '');
  overlay.classList.remove('hidden');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calcAge(dob) {
  if (!dob) return '—';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name) {
  const colors = ['blue', 'green', 'purple', 'orange', 'cyan', 'red'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function statusBadge(status) {
  const map = {
    scheduled: 'status-scheduled', completed: 'status-completed',
    cancelled: 'status-cancelled', pending: 'status-pending',
    active: 'status-active', expired: 'status-expired',
    ongoing: 'status-ongoing', 'no-show': 'status-noshow', inactive: 'badge-gray'
  };
  const cls = map[status] || 'badge-gray';
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  return `<span class="badge ${cls}">${label}</span>`;
}

function confirmDelete(name, onConfirm) {
  openModal('Confirm Delete', `
    <div class="confirm-dialog">
      <div class="confirm-icon">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </div>
      <h4>Delete ${escapeHtml(name)}?</h4>
      <p>This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" id="confirm-delete-btn">Delete</button>
      </div>
    </div>
  `, 'modal-sm');
  document.getElementById('confirm-delete-btn').onclick = () => { onConfirm(); closeModal(); };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- PAGE DETECTION ----
function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  return file.replace('.html', '') || 'index';
}

// ---- SHELL INIT ----
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guardPage()) return;
  Storage.seedIfEmpty();

  const session = Auth.getSession();

  // Populate user info in sidebar
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarEl = document.getElementById('user-avatar');
  const headerBadgeEl = document.getElementById('header-role-badge');

  if (userNameEl) userNameEl.textContent = session.name;
  if (userRoleEl) userRoleEl.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
  if (userAvatarEl) userAvatarEl.textContent = getInitials(session.name);
  if (headerBadgeEl) headerBadgeEl.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);

  // Set active nav item
  const currentPage = getCurrentPage();
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === currentPage);
  });

  // Role-based nav visibility
  const staffNav = document.querySelector('.nav-admin');
  if (staffNav) staffNav.style.display = Auth.isAdmin() ? '' : 'none';

  document.querySelectorAll('.nav-item').forEach(el => {
    const page = el.dataset.page;
    if ((page === 'prescriptions' || page === 'treatments') && Auth.isReceptionist()) {
      el.style.display = 'none';
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

  // Modal close
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarClose = document.getElementById('sidebar-close');

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

  if (menuToggle) menuToggle.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
  });

  // Render current page module
  const pageModules = {
    'index':         () => typeof Dashboard     !== 'undefined' && Dashboard.render(),
    'patients':      () => typeof Patients      !== 'undefined' && Patients.render(),
    'doctors':       () => typeof Doctors       !== 'undefined' && Doctors.render(),
    'appointments':  () => typeof Appointments  !== 'undefined' && Appointments.render(),
    'records':       () => typeof Records       !== 'undefined' && Records.render(),
    'prescriptions': () => typeof Prescriptions !== 'undefined' && Prescriptions.render(),
    'treatments':    () => typeof Treatments    !== 'undefined' && Treatments.render(),
    'staff':         () => typeof Staff         !== 'undefined' && Staff.render(),
  };

  const renderFn = pageModules[currentPage];
  if (renderFn) renderFn();
});
