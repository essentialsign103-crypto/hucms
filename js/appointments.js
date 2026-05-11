/* ============================================
   CLINIC OS — APPOINTMENTS MODULE
   ============================================ */

const Appointments = (() => {
  let searchTerm = '';
  let filterStatus = 'all';
  let filterDate = '';
  let _dateInitialized = false;

  function render() {
    const canEdit = Auth.can('edit_appointments');
    const today = new Date().toISOString().split('T')[0];
    // Only default to today on first load, not on every re-render
    if (!_dateInitialized) {
      filterDate = today;
      _dateInitialized = true;
    }

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Appointments</h1>
          <p>Schedule and manage patient appointments</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Appointments.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Book Appointment
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search patient or doctor..." oninput="Appointments.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <input type="date" class="filter-select" value="${filterDate}" onchange="Appointments.onFilterDate(this.value)" style="padding:7px 10px" />
            <select class="filter-select" onchange="Appointments.onFilterStatus(this.value)">
              <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
              <option value="scheduled" ${filterStatus==='scheduled'?'selected':''}>Scheduled</option>
              <option value="completed" ${filterStatus==='completed'?'selected':''}>Completed</option>
              <option value="cancelled" ${filterStatus==='cancelled'?'selected':''}>Cancelled</option>
              <option value="no-show" ${filterStatus==='no-show'?'selected':''}>No Show</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="Appointments.clearDateFilter()">All Dates</button>
          </div>
          <span id="appt-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="appts-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let appts = Storage.getAll('appointments');
    
    // Role-based filtering
    const session = Auth.getSession();
    if (session && session.role === 'doctor') {
      // Doctor sees only their appointments
      const doctorRecord = Storage.query('doctors', d => d.userId === session.userId)[0];
      if (doctorRecord) {
        appts = appts.filter(a => a.doctorId === doctorRecord.id);
      } else {
        appts = []; // Doctor with no doctor record sees nothing
      }
    }
    // Receptionist and Admin see all appointments
    
    if (filterStatus !== 'all') appts = appts.filter(a => a.status === filterStatus);
    if (filterDate) appts = appts.filter(a => a.date === filterDate);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      appts = appts.filter(a => {
        const p = Storage.getById('patients', a.patientId);
        const d = Storage.getById('doctors', a.doctorId);
        const pName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : '';
        const dName = d ? d.name.toLowerCase() : '';
        return pName.includes(s) || dName.includes(s) || (a.type||'').toLowerCase().includes(s);
      });
    }
    return appts.sort((a, b) => {
      const da = new Date(a.date + 'T' + a.time);
      const db2 = new Date(b.date + 'T' + b.time);
      return db2 - da;
    });
  }

  function renderTable() {
    const appts = getFiltered();
    const canEdit = Auth.can('edit_appointments');
    const tbody = document.getElementById('appts-tbody');
    const countEl = document.getElementById('appt-count');
    if (countEl) countEl.textContent = `${appts.length} appointment${appts.length !== 1 ? 's' : ''}`;

    if (!appts.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>No appointments found</h3><p>Try adjusting your filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = appts.map(a => {
      const patient = Storage.getById('patients', a.patientId);
      const doctor = Storage.getById('doctors', a.doctorId);
      const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
      const dName = doctor ? doctor.name : 'Unknown';
      const pColor = avatarColor(pName);
      return `
        <tr>
          <td>
            <div class="td-name" style="font-weight:400;color:#1d4ed8;font-family:'Insaniburg',serif;background:#f0f4ff;padding:4px 8px;border-radius:4px">${escapeHtml(dName)}</div>
            <div class="td-sub">${escapeHtml(doctor ? doctor.specialization : '')}</div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-${pColor}" style="width:32px;height:32px;font-size:0.75rem">${getInitials(pName)}</div>
              <div class="td-name" style="color:#dc2626;font-family:Arial,sans-serif;border-radius:6px">${escapeHtml(pName)}</div>
            </div>
          </td>
          <td>
            <div class="td-name">${formatDate(a.date)}</div>
            <div class="td-sub">${a.time || '—'}</div>
          </td>
          <td><span class="badge badge-cyan" style="font-family:'Insaniburg',serif;white-space:nowrap">${escapeHtml(a.type||'—')}</span></td>
          <td>${a.duration ? a.duration + ' min' : '—'}</td>
          <td>${statusBadge(a.status)}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Appointments.viewAppointment('${a.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Appointments.openEditModal('${a.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Appointments.deleteAppointment('${a.id}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterStatus(val) { filterStatus = val; renderTable(); }
  function onFilterDate(val) { filterDate = val; renderTable(); }
  function clearDateFilter() { filterDate = ''; renderTable(); }

  function appointmentForm(a = {}, isEdit = false) {
    const patients = Storage.getAll('patients').filter(p => p.status === 'active');
    const doctors = Storage.getAll('doctors').filter(d => d.status === 'active');
    const today = new Date().toISOString().split('T')[0];

    return `
      <form id="appt-form">
        <div class="form-group">
          <label>Patient <span class="required">*</span></label>
          <select class="form-control" name="patientId" required>
            <option value="">Select patient</option>
            ${patients.map(p => `<option value="${p.id}" ${a.patientId===p.id?'selected':''}>${escapeHtml(p.firstName+' '+p.lastName)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Doctor <span class="required">*</span></label>
          <select class="form-control" name="doctorId" required>
            <option value="">Select doctor</option>
            ${doctors.map(d => `<option value="${d.id}" ${a.doctorId===d.id?'selected':''}>${escapeHtml(d.name)} — ${escapeHtml(d.specialization)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" class="form-control" name="date" value="${a.date||today}" required ${isEdit ? '' : `min="${today}"`} />
          </div>
          <div class="form-group">
            <label>Time <span class="required">*</span></label>
            <input type="time" class="form-control" name="time" value="${a.time||'09:00'}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Appointment Type <span class="required">*</span></label>
            <select class="form-control" name="type" required>
              <option value="">Select type</option>
              ${['General Checkup','Follow-up','Consultation','Emergency','Pediatric Visit','Cardiology','Dermatology','Orthopedics','Neurology','Gynecology','Lab Results','Vaccination'].map(t =>
                `<option value="${t}" ${a.type===t?'selected':''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Duration (minutes)</label>
            <select class="form-control" name="duration">
              ${[15,30,45,60,90].map(d => `<option value="${d}" ${(a.duration||30)==d?'selected':''}>${d} min</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" name="status">
            <option value="scheduled" ${(a.status||'scheduled')==='scheduled'?'selected':''}>Scheduled</option>
            <option value="completed" ${a.status==='completed'?'selected':''}>Completed</option>
            <option value="cancelled" ${a.status==='cancelled'?'selected':''}>Cancelled</option>
            <option value="no-show" ${a.status==='no-show'?'selected':''}>No Show</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" name="notes" placeholder="Additional notes...">${escapeHtml(a.notes||'')}</textarea>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Appointment</button>
        </div>
      </form>`;
  }

  function openAddModal() {
    openModal('Book Appointment', appointmentForm({}, false));
    document.getElementById('appt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.insert('appointments', data);
      closeModal();
      showToast('Appointment booked successfully.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const a = Storage.getById('appointments', id);
    if (!a) return;
    openModal('Edit Appointment', appointmentForm(a, true));
    document.getElementById('appt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.update('appointments', id, data);
      closeModal();
      showToast('Appointment updated.', 'success');
      render();
    });
  }

  function deleteAppointment(id) {
    confirmDelete('this appointment', () => {
      Storage.remove('appointments', id);
      showToast('Appointment deleted.', 'success');
      render();
    });
  }

  function viewAppointment(id) {
    const a = Storage.getById('appointments', id);
    if (!a) return;
    const patient = Storage.getById('patients', a.patientId);
    const doctor = Storage.getById('doctors', a.doctorId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
    const dName = doctor ? doctor.name : 'Unknown';

    openModal('Appointment Details', `
      <div style="padding:4px 0">
        <div class="info-row"><span class="info-label">Patient</span><span class="info-value">${escapeHtml(pName)}</span></div>
        <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${escapeHtml(dName)}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(a.date)}</span></div>
        <div class="info-row"><span class="info-label">Time</span><span class="info-value">${a.time||'—'}</span></div>
        <div class="info-row"><span class="info-label">Type</span><span class="info-value">${escapeHtml(a.type||'—')}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${a.duration ? a.duration + ' minutes' : '—'}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${statusBadge(a.status)}</span></div>
        <div class="info-row"><span class="info-label">Notes</span><span class="info-value">${escapeHtml(a.notes||'—')}</span></div>
        <div class="info-row"><span class="info-label">Created</span><span class="info-value">${formatDateTime(a.createdAt)}</span></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.can('edit_appointments') ? `
          <button class="btn btn-primary btn-sm" onclick="closeModal();Appointments.openEditModal('${id}')">Edit</button>
          <button class="btn btn-success btn-sm" onclick="Appointments.markStatus('${id}','completed')">Mark Completed</button>
          <button class="btn btn-warning btn-sm" onclick="Appointments.markStatus('${id}','cancelled')">Cancel</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `);
  }

  function markStatus(id, status) {
    Storage.update('appointments', id, { status });
    closeModal();
    showToast(`Appointment marked as ${status}.`, 'success');
    render();
  }

  return { render, openAddModal, openEditModal, deleteAppointment, viewAppointment, markStatus, onSearch, onFilterStatus, onFilterDate, clearDateFilter };
})();
