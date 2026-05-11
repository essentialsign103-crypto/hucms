/* ============================================
   CLINIC OS — STAFF MODULE (Admin only)
   ============================================ */

const Staff = (() => {
  let searchTerm = '';
  let filterRole = 'all';

  function render() {
    if (!Auth.isAdmin()) {
      document.getElementById('page-content').innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <h3>Admin Access Required</h3>
          <p>Only administrators can manage staff accounts.</p>
        </div>`;
      return;
    }

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Staff Management</h1>
          <p>Manage clinic staff accounts and roles</p>
        </div>
        <button class="btn btn-primary" onclick="Staff.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Staff
        </button>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
        ${renderRoleStats()}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search staff..." oninput="Staff.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <select class="filter-select" onchange="Staff.onFilterRole(this.value)">
              <option value="all" ${filterRole==='all'?'selected':''}>All Roles</option>
              <option value="admin" ${filterRole==='admin'?'selected':''}>Admin</option>
              <option value="doctor" ${filterRole==='doctor'?'selected':''}>Doctor</option>
              <option value="receptionist" ${filterRole==='receptionist'?'selected':''}>Receptionist</option>
            </select>
          </div>
          <span id="staff-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="staff-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function renderRoleStats() {
    const users = Storage.getAll('users');
    const roles = [
      { label: 'Administrators', role: 'admin', color: 'blue' },
      { label: 'Doctors', role: 'doctor', color: 'green' },
      { label: 'Receptionists', role: 'receptionist', color: 'purple' }
    ];
    return roles.map(r => {
      const count = users.filter(u => u.role === r.role).length;
      return `
        <div class="stat-card">
          <div class="stat-icon ${r.color}">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${count}</div>
            <div class="stat-label">${r.label}</div>
          </div>
        </div>`;
    }).join('');
  }

  function getFiltered() {
    let users = Storage.getAll('users');
    if (filterRole !== 'all') users = users.filter(u => u.role === filterRole);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.department||'').toLowerCase().includes(s)
      );
    }
    return users;
  }

  function renderTable() {
    const users = getFiltered();
    const tbody = document.getElementById('staff-tbody');
    const countEl = document.getElementById('staff-count');
    if (countEl) countEl.textContent = `${users.length} staff member${users.length !== 1 ? 's' : ''}`;

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>No staff found</h3>
      </div></td></tr>`;
      return;
    }

    const roleColors = { admin: 'badge-red', doctor: 'badge-green', receptionist: 'badge-purple' };
    const currentSession = Auth.getSession();

    tbody.innerHTML = users.map(u => {
      const color = avatarColor(u.name);
      const isCurrentUser = u.id === currentSession.userId;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-${color}">${getInitials(u.name)}</div>
              <div>
                <div class="td-name">${escapeHtml(u.name)} ${isCurrentUser ? '<span class="badge badge-blue" style="font-size:0.65rem">You</span>' : ''}</div>
                <div class="td-sub">${escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge ${roleColors[u.role]||'badge-gray'}">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
          <td>${escapeHtml(u.department||'—')}</td>
          <td>${escapeHtml(u.phone||'—')}</td>
          <td>${u.joinDate ? formatDate(u.joinDate) : '—'}</td>
          <td>${statusBadge(u.status||'active')}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Staff.openEditModal('${u.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              ${!isCurrentUser ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Staff.deleteStaff('${u.id}','${escapeHtml(u.name)}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterRole(val) { filterRole = val; renderTable(); }

  function staffForm(u = {}, isEdit = false) {
    return `
      <form id="staff-form">
        <div class="form-group">
          <label>Full Name <span class="required">*</span></label>
          <input class="form-control" name="name" value="${escapeHtml(u.name||'')}" required placeholder="John Smith" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email <span class="required">*</span></label>
            <input type="email" class="form-control" name="email" value="${escapeHtml(u.email||'')}" required placeholder="staff@clinic.com" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input class="form-control" name="phone" value="${escapeHtml(u.phone||'')}" placeholder="555-0000" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role <span class="required">*</span></label>
            <select class="form-control" name="role" required>
              <option value="">Select role</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>Administrator</option>
              <option value="doctor" ${u.role==='doctor'?'selected':''}>Doctor</option>
              <option value="receptionist" ${u.role==='receptionist'?'selected':''}>Receptionist</option>
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <input class="form-control" name="department" value="${escapeHtml(u.department||'')}" placeholder="e.g. Cardiology" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${isEdit ? 'New Password' : 'Password'} ${!isEdit ? '<span class="required">*</span>' : ''}</label>
            <div style="position:relative">
              <input type="password" class="form-control" name="password" id="staff-password-input" ${!isEdit ? 'required' : ''} placeholder="${isEdit ? 'Leave blank to keep current' : '••••••••'}" style="padding-right:42px" />
              <button type="button" onclick="Staff.togglePassword()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;color:#6b7280;display:flex;align-items:center;">
                <svg id="staff-eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            ${isEdit ? '<div class="form-hint">Leave blank to keep current password</div>' : ''}
          </div>
          <div class="form-group">
            <label>Join Date</label>
            <input type="date" class="form-control" name="joinDate" value="${u.joinDate||''}" />
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" name="status">
            <option value="active" ${(u.status||'active')==='active'?'selected':''}>Active</option>
            <option value="inactive" ${u.status==='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Staff</button>
        </div>
      </form>`;
  }

  function openAddModal() {
    openModal('Add Staff Member', staffForm());
    document.getElementById('staff-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      // Check email uniqueness
      const existing = Storage.query('users', u => u.email === data.email);
      if (existing.length) { showToast('Email already in use.', 'error'); return; }
      Storage.insert('users', data);
      closeModal();
      showToast('Staff member added.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const u = Storage.getById('users', id);
    if (!u) return;
    openModal('Edit Staff Member', staffForm(u, true));
    document.getElementById('staff-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      // Don't overwrite password if blank
      if (!data.password) delete data.password;
      // Check email uniqueness (excluding self)
      const existing = Storage.query('users', usr => usr.email === data.email && usr.id !== id);
      if (existing.length) { showToast('Email already in use.', 'error'); return; }
      Storage.update('users', id, data);
      closeModal();
      showToast('Staff member updated.', 'success');
      render();
    });
  }

  function deleteStaff(id, name) {
    const currentSession = Auth.getSession();
    if (id === currentSession.userId) { showToast('Cannot delete your own account.', 'error'); return; }
    confirmDelete(name, () => {
      Storage.remove('users', id);
      showToast('Staff member deleted.', 'success');
      render();
    });
  }

  function togglePassword() {
    const input = document.getElementById('staff-password-input');
    const icon  = document.getElementById('staff-eye-icon');
    if (!input) return;
    const show  = input.type === 'password';
    input.type  = show ? 'text' : 'password';
    icon.innerHTML = show
      ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }

  return { render, openAddModal, openEditModal, deleteStaff, onSearch, onFilterRole, togglePassword };
})();
