/* ============================================
   CLINIC OS — DOCTORS MODULE
   ============================================ */

const Doctors = (() => {
  let searchTerm = '';
  let filterSpec = 'all';
  let filterStatus = 'all';

  function render() {
    const canEdit = Auth.isAdmin();
    const specializations = [...new Set(Storage.getAll('doctors').map(d => d.specialization))].sort();

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Doctors</h1>
          <p>Manage medical staff and specializations</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Doctors.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Doctor
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search doctors..." oninput="Doctors.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <select class="filter-select" onchange="Doctors.onFilterSpec(this.value)">
              <option value="all">All Specializations</option>
              ${specializations.map(s => `<option value="${s}" ${filterSpec===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}
            </select>
            <select class="filter-select" onchange="Doctors.onFilterStatus(this.value)">
              <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
              <option value="active" ${filterStatus==='active'?'selected':''}>Active</option>
              <option value="inactive" ${filterStatus==='inactive'?'selected':''}>Inactive</option>
            </select>
          </div>
          <span id="doctor-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Contact</th>
                <th>Experience</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="doctors-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let doctors = Storage.getAll('doctors');
    if (filterStatus !== 'all') doctors = doctors.filter(d => d.status === filterStatus);
    if (filterSpec !== 'all') doctors = doctors.filter(d => d.specialization === filterSpec);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(s) ||
        (d.specialization||'').toLowerCase().includes(s) ||
        (d.email||'').toLowerCase().includes(s)
      );
    }
    return doctors;
  }

  function renderTable() {
    const doctors = getFiltered();
    const canEdit = Auth.isAdmin();
    const tbody = document.getElementById('doctors-tbody');
    const countEl = document.getElementById('doctor-count');
    if (countEl) countEl.textContent = `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''}`;

    if (!doctors.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <h3>No doctors found</h3><p>Try adjusting your search or filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = doctors.map(d => {
      const color = avatarColor(d.name);
      const avail = (d.availability || []).map(day => day.slice(0,3)).join(', ');
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-${color}">${getInitials(d.name)}</div>
              <div>
                <div class="td-name">${escapeHtml(d.name)}</div>
                <div class="td-sub">Lic: ${escapeHtml(d.licenseNo||'—')}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-purple">${escapeHtml(d.specialization||'—')}</span></td>
          <td>
            <div class="td-name" style="font-weight:400">${escapeHtml(d.phone||'—')}</div>
            <div class="td-sub">${escapeHtml(d.email||'—')}</div>
          </td>
          <td>${d.experience ? d.experience + ' yrs' : '—'}</td>
          <td><span style="font-size:0.8rem;color:var(--gray-600)">${avail || '—'}</span></td>
          <td>${statusBadge(d.status||'active')}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Doctors.viewProfile('${d.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Doctors.openEditModal('${d.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Doctors.deleteDoctor('${d.id}','${escapeHtml(d.name)}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterSpec(val) { filterSpec = val; renderTable(); }
  function onFilterStatus(val) { filterStatus = val; renderTable(); }

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  function doctorForm(d = {}) {
    const avail = d.availability || [];
    return `
      <form id="doctor-form">
        <div class="form-group">
          <label>Full Name <span class="required">*</span></label>
          <input class="form-control" name="name" value="${escapeHtml(d.name||'')}" required placeholder="Dr. John Smith" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Specialization <span class="required">*</span></label>
            <select class="form-control" name="specialization" required>
              <option value="">Select specialization</option>
              ${['General Medicine','Cardiology','Pediatrics','Dermatology','Orthopedics','Neurology','Gynecology','Ophthalmology','ENT','Psychiatry','Radiology','Oncology','Urology','Endocrinology'].map(s =>
                `<option value="${s}" ${d.specialization===s?'selected':''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Experience (years)</label>
            <input type="number" class="form-control" name="experience" value="${d.experience||''}" min="0" max="60" placeholder="10" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email <span class="required">*</span></label>
            <input type="email" class="form-control" name="email" value="${escapeHtml(d.email||'')}" required placeholder="doctor@clinic.com" />
          </div>
          <div class="form-group">
            <label>Phone <span class="required">*</span></label>
            <input class="form-control" name="phone" value="${escapeHtml(d.phone||'')}" required placeholder="555-0000" />
          </div>
        </div>
        <div class="form-group">
          <label>License Number</label>
          <input class="form-control" name="licenseNo" value="${escapeHtml(d.licenseNo||'')}" placeholder="LIC-2024-001" />
        </div>
        <div class="form-group">
          <label>Availability</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            ${DAYS.map(day => `
              <label style="display:flex;align-items:center;gap:5px;font-size:0.875rem;cursor:pointer">
                <input type="checkbox" name="availability" value="${day}" ${avail.includes(day)?'checked':''} style="width:auto" />
                ${day.slice(0,3)}
              </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" name="status">
            <option value="active" ${(d.status||'active')==='active'?'selected':''}>Active</option>
            <option value="inactive" ${d.status==='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Doctor</button>
        </div>
      </form>`;
  }

  function getFormData(form) {
    const data = {};
    const fd = new FormData(form);
    for (const [key, val] of fd.entries()) {
      if (key === 'availability') {
        if (!data.availability) data.availability = [];
        data.availability.push(val);
      } else {
        data[key] = val;
      }
    }
    if (!data.availability) data.availability = [];
    return data;
  }

  function openAddModal() {
    openModal('Add New Doctor', doctorForm());
    document.getElementById('doctor-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = getFormData(e.target);
      Storage.insert('doctors', data);
      closeModal();
      showToast('Doctor added successfully.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const d = Storage.getById('doctors', id);
    if (!d) return;
    openModal('Edit Doctor', doctorForm(d));
    document.getElementById('doctor-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = getFormData(e.target);
      Storage.update('doctors', id, data);
      closeModal();
      showToast('Doctor updated successfully.', 'success');
      render();
    });
  }

  function deleteDoctor(id, name) {
    confirmDelete(name, () => {
      Storage.remove('doctors', id);
      showToast('Doctor deleted.', 'success');
      render();
    });
  }

  function viewProfile(id) {
    const d = Storage.getById('doctors', id);
    if (!d) return;
    const appointments = Storage.query('appointments', a => a.doctorId === id);
    const completedAppts = appointments.filter(a => a.status === 'completed').length;
    const records = Storage.query('records', r => r.doctorId === id);

    openModal('Doctor Profile', `
      <div class="profile-header">
        <div class="profile-avatar">${getInitials(d.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="profile-name">${escapeHtml(d.name)}</div>
          <div class="profile-sub">${escapeHtml(d.specialization)} · ${d.experience||0} yrs experience</div>
          <div style="margin-top:6px"><span style="font-family:var(--font-mono);font-size:0.75rem;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px">${escapeHtml(d.licenseNo||'No license on file')}</span></div>
        </div>
        ${statusBadge(d.status||'active')}
      </div>
      <div style="padding:16px 0">
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escapeHtml(d.email||'—')}</span></div>
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escapeHtml(d.phone||'—')}</span></div>
        <div class="info-row"><span class="info-label">License No.</span><span class="info-value"><span class="mono">${escapeHtml(d.licenseNo||'—')}</span></span></div>
        <div class="info-row"><span class="info-label">Availability</span><span class="info-value">${(d.availability||[]).join(', ')||'—'}</span></div>
        <div class="info-row"><span class="info-label">Total Appointments</span><span class="info-value">${appointments.length} (${completedAppts} completed)</span></div>
        <div class="info-row"><span class="info-label">Medical Records</span><span class="info-value">${records.length}</span></div>
        <div class="info-row"><span class="info-label">Joined</span><span class="info-value">${formatDateTime(d.createdAt)}</span></div>
      </div>
      <div style="display:flex;gap:10px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.isAdmin() ? `<button class="btn btn-primary btn-sm" onclick="closeModal();Doctors.openEditModal('${id}')">Edit Doctor</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `);
  }

  return { render, openAddModal, openEditModal, deleteDoctor, viewProfile, onSearch, onFilterSpec, onFilterStatus };
})();
