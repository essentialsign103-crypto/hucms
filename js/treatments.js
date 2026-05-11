/* ============================================
   CLINIC OS — TREATMENTS MODULE
   ============================================ */

const Treatments = (() => {
  let searchTerm = '';
  let filterStatus = 'all';

  function render() {
    const canEdit = Auth.can('edit_treatments');

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Treatments</h1>
          <p>Track patient treatment plans and progress</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Treatments.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Treatment
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search patient or treatment..." oninput="Treatments.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <select class="filter-select" onchange="Treatments.onFilterStatus(this.value)">
              <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
              <option value="ongoing" ${filterStatus==='ongoing'?'selected':''}>Ongoing</option>
              <option value="completed" ${filterStatus==='completed'?'selected':''}>Completed</option>
              <option value="cancelled" ${filterStatus==='cancelled'?'selected':''}>Cancelled</option>
            </select>
          </div>
          <span id="treatments-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient</th>
                <th>Treatment</th>
                <th>Start Date</th>
                <th>Follow-up</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="treatments-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let treatments = Storage.getAll('treatments');
    
    // Role-based filtering
    const session = Auth.getSession();
    if (session && session.role === 'doctor') {
      // Doctor sees only their treatments
      const doctorRecord = Storage.query('doctors', d => d.userId === session.userId)[0];
      if (doctorRecord) {
        treatments = treatments.filter(t => t.doctorId === doctorRecord.id);
      } else {
        treatments = []; // Doctor with no doctor record sees nothing
      }
    }
    // Receptionist and Admin see all treatments
    
    if (filterStatus !== 'all') treatments = treatments.filter(t => t.status === filterStatus);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      treatments = treatments.filter(t => {
        const p = Storage.getById('patients', t.patientId);
        const pName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : '';
        return pName.includes(s) || (t.title||'').toLowerCase().includes(s);
      });
    }
    return treatments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderTable() {
    const treatments = getFiltered();
    const canEdit = Auth.can('edit_treatments');
    const tbody = document.getElementById('treatments-tbody');
    const countEl = document.getElementById('treatments-count');
    if (countEl) countEl.textContent = `${treatments.length} treatment${treatments.length !== 1 ? 's' : ''}`;

    if (!treatments.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <h3>No treatments found</h3><p>Try adjusting your search or filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = treatments.map(t => {
      const patient = Storage.getById('patients', t.patientId);
      const doctor = Storage.getById('doctors', t.doctorId);
      const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
      const dName = doctor ? doctor.name : 'Unknown';
      const pColor = avatarColor(pName);
      const progress = parseInt(t.progress) || 0;
      const progressColor = progress >= 80 ? 'green' : progress >= 40 ? '' : 'orange';

      return `
        <tr>
          <td>
            <div class="td-name" style="font-weight:400;color:#1d4ed8;font-family:'Insaniburg',serif;background:#f0f4ff;padding:4px 8px;border-radius:4px">${escapeHtml(dName)}</div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-${pColor}" style="width:32px;height:32px;font-size:0.75rem">${getInitials(pName)}</div>
              <div class="td-name" style="color:#dc2626;font-family:Arial,sans-serif;border-radius:6px">${escapeHtml(pName)}</div>
            </div>
          </td>
          <td>
            <div class="td-name" style="font-family:'Insaniburg',serif;white-space:nowrap">${escapeHtml(t.title||'—')}</div>
            <div class="td-sub">${(t.sessions||[]).length} session${(t.sessions||[]).length !== 1 ? 's' : ''}</div>
          </td>
          <td>${formatDate(t.startDate)}</td>
          <td>${t.followUpDate ? formatDate(t.followUpDate) : '—'}</td>
          <td style="min-width:100px">
            <div style="font-size:0.8rem;color:var(--gray-600);margin-bottom:4px">${progress}%</div>
            <div class="progress-bar">
              <div class="progress-fill ${progressColor}" style="width:${progress}%"></div>
            </div>
          </td>
          <td>${statusBadge(t.status||'ongoing')}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Treatments.viewTreatment('${t.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Treatments.openEditModal('${t.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Treatments.deleteTreatment('${t.id}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterStatus(val) { filterStatus = val; renderTable(); }

  function treatmentForm(t = {}) {
    const patients = Storage.getAll('patients').filter(p => p.status === 'active');
    const doctors = Storage.getAll('doctors').filter(d => d.status === 'active');
    const today = new Date().toISOString().split('T')[0];

    return `
      <form id="treatment-form">
        <div class="form-row">
          <div class="form-group">
            <label>Patient <span class="required">*</span></label>
            <select class="form-control" name="patientId" required>
              <option value="">Select patient</option>
              ${patients.map(p => `<option value="${p.id}" ${t.patientId===p.id?'selected':''}>${escapeHtml(p.firstName+' '+p.lastName)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Doctor <span class="required">*</span></label>
            <select class="form-control" name="doctorId" required>
              <option value="">Select doctor</option>
              ${doctors.map(d => `<option value="${d.id}" ${t.doctorId===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Treatment Title <span class="required">*</span></label>
          <input class="form-control" name="title" value="${escapeHtml(t.title||'')}" required placeholder="e.g. Hypertension Management Program" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea class="form-control" name="description" placeholder="Treatment plan details...">${escapeHtml(t.description||'')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Date <span class="required">*</span></label>
            <input type="date" class="form-control" name="startDate" value="${t.startDate||today}" required />
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="date" class="form-control" name="endDate" value="${t.endDate||''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Follow-up Date</label>
            <input type="date" class="form-control" name="followUpDate" value="${t.followUpDate||''}" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
              <option value="ongoing" ${(t.status||'ongoing')==='ongoing'?'selected':''}>Ongoing</option>
              <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
              <option value="cancelled" ${t.status==='cancelled'?'selected':''}>Cancelled</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Progress (%) — ${t.progress||0}%</label>
          <input type="range" class="form-control" name="progress" value="${t.progress||0}" min="0" max="100" step="5"
            oninput="this.previousElementSibling.textContent='Progress (%) — '+this.value+'%'" style="padding:4px 0;height:auto" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" name="notes" placeholder="Treatment notes and observations...">${escapeHtml(t.notes||'')}</textarea>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Treatment</button>
        </div>
      </form>`;
  }

  function openAddModal() {
    openModal('New Treatment Plan', treatmentForm(), 'modal-lg');
    document.getElementById('treatment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.sessions = [];
      Storage.insert('treatments', data);
      closeModal();
      showToast('Treatment plan created.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const t = Storage.getById('treatments', id);
    if (!t) return;
    openModal('Edit Treatment Plan', treatmentForm(t), 'modal-lg');
    document.getElementById('treatment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.update('treatments', id, data);
      closeModal();
      showToast('Treatment updated.', 'success');
      render();
    });
  }

  function deleteTreatment(id) {
    confirmDelete('this treatment plan', () => {
      Storage.remove('treatments', id);
      showToast('Treatment deleted.', 'success');
      render();
    });
  }

  function viewTreatment(id) {
    const t = Storage.getById('treatments', id);
    if (!t) return;
    const patient = Storage.getById('patients', t.patientId);
    const doctor = Storage.getById('doctors', t.doctorId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
    const dName = doctor ? doctor.name : 'Unknown';
    const progress = parseInt(t.progress) || 0;
    const progressColor = progress >= 80 ? 'green' : progress >= 40 ? '' : 'orange';
    const sessions = t.sessions || [];

    openModal('Treatment Details', `
      <div style="padding:4px 0">
        <div class="info-row"><span class="info-label">Patient</span><span class="info-value">${escapeHtml(pName)}</span></div>
        <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${escapeHtml(dName)}</span></div>
        <div class="info-row"><span class="info-label">Title</span><span class="info-value" style="font-weight:600">${escapeHtml(t.title||'—')}</span></div>
        <div class="info-row" style="align-items:flex-start"><span class="info-label">Description</span><span class="info-value">${escapeHtml(t.description||'—')}</span></div>
        <div class="info-row"><span class="info-label">Start Date</span><span class="info-value">${formatDate(t.startDate)}</span></div>
        <div class="info-row"><span class="info-label">End Date</span><span class="info-value">${t.endDate ? formatDate(t.endDate) : 'Ongoing'}</span></div>
        <div class="info-row"><span class="info-label">Follow-up</span><span class="info-value">${t.followUpDate ? formatDate(t.followUpDate) : '—'}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${statusBadge(t.status||'ongoing')}</span></div>
        <div class="info-row" style="align-items:flex-start"><span class="info-label">Notes</span><span class="info-value">${escapeHtml(t.notes||'—')}</span></div>
      </div>

      <div class="section-divider" style="margin-top:12px">Progress</div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:0.875rem;margin-bottom:6px">
          <span style="color:var(--gray-600)">Treatment Progress</span>
          <span style="font-weight:600">${progress}%</span>
        </div>
        <div class="progress-bar" style="height:10px">
          <div class="progress-fill ${progressColor}" style="width:${progress}%"></div>
        </div>
      </div>

      ${sessions.length ? `
        <div class="section-divider" style="margin-top:16px">Session History (${sessions.length})</div>
        <div style="margin-top:8px">
          ${sessions.map(s => `
            <div class="appt-item">
              <div class="appt-time" style="min-width:80px">${formatDate(s.date)}</div>
              <div class="appt-info"><div class="appt-patient">${escapeHtml(s.note)}</div></div>
            </div>`).join('')}
        </div>
      ` : ''}

      ${Auth.can('edit_treatments') ? `
        <div class="section-divider" style="margin-top:16px">Add Session Note</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="date" id="session-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="max-width:160px" />
          <input type="text" id="session-note" class="form-control" placeholder="Session note..." />
          <button class="btn btn-primary btn-sm" onclick="Treatments.addSession('${id}')">Add</button>
        </div>
      ` : ''}

      <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.can('edit_treatments') ? `<button class="btn btn-primary btn-sm" onclick="closeModal();Treatments.openEditModal('${id}')">Edit</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  }

  function addSession(id) {
    const date = document.getElementById('session-date')?.value;
    const note = document.getElementById('session-note')?.value.trim();
    if (!date || !note) { showToast('Enter both date and note.', 'warning'); return; }
    const t = Storage.getById('treatments', id);
    if (!t) return;
    const sessions = [...(t.sessions||[]), { date, note }];
    Storage.update('treatments', id, { sessions });
    showToast('Session added.', 'success');
    closeModal();
    // Re-open the detail view with updated data, then refresh the list in background
    viewTreatment(id);
  }

  return { render, openAddModal, openEditModal, deleteTreatment, viewTreatment, addSession, onSearch, onFilterStatus };
})();
