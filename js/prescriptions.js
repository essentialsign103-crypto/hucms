/* ============================================
   CLINIC OS — PRESCRIPTIONS MODULE
   ============================================ */

const Prescriptions = (() => {
  let searchTerm = '';
  let filterStatus = 'all';
  let medCount = 1;

  function render() {
    const canEdit = Auth.can('edit_prescriptions');

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p>Manage patient medications and prescriptions</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Prescriptions.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Prescription
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search patient or medication..." oninput="Prescriptions.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <select class="filter-select" onchange="Prescriptions.onFilterStatus(this.value)">
              <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
              <option value="active" ${filterStatus==='active'?'selected':''}>Active</option>
              <option value="expired" ${filterStatus==='expired'?'selected':''}>Expired</option>
            </select>
          </div>
          <span id="rx-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Medications</th>
                <th>Refills</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="rx-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let rxs = Storage.getAll('prescriptions');
    
    // Role-based filtering
    const session = Auth.getSession();
    if (session && session.role === 'doctor') {
      // Doctor sees only their prescriptions
      const doctorRecord = Storage.query('doctors', d => d.userId === session.userId)[0];
      if (doctorRecord) {
        rxs = rxs.filter(r => r.doctorId === doctorRecord.id);
      } else {
        rxs = []; // Doctor with no doctor record sees nothing
      }
    }
    // Receptionist and Admin see all prescriptions
    
    if (filterStatus !== 'all') rxs = rxs.filter(r => r.status === filterStatus);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      rxs = rxs.filter(r => {
        const p = Storage.getById('patients', r.patientId);
        const pName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : '';
        const meds = (r.medications||[]).map(m => m.name.toLowerCase()).join(' ');
        return pName.includes(s) || meds.includes(s);
      });
    }
    return rxs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderTable() {
    const rxs = getFiltered();
    const canEdit = Auth.can('edit_prescriptions');
    const tbody = document.getElementById('rx-tbody');
    const countEl = document.getElementById('rx-count');
    if (countEl) countEl.textContent = `${rxs.length} prescription${rxs.length !== 1 ? 's' : ''}`;

    if (!rxs.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
        <h3>No prescriptions found</h3><p>Try adjusting your search or filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = rxs.map(rx => {
      const patient = Storage.getById('patients', rx.patientId);
      const doctor = Storage.getById('doctors', rx.doctorId);
      const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
      const dName = doctor ? doctor.name : 'Unknown';
      const pColor = avatarColor(pName);
      const medNames = (rx.medications||[]).map(m => escapeHtml(m.name)).join(', ');
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
          <td>${formatDate(rx.date)}</td>
          <td>
            <div style="font-size:0.875rem;font-family:'Insaniburg',serif;white-space:nowrap">${medNames || '—'}</div>
            <div class="td-sub">${(rx.medications||[]).length} medication${(rx.medications||[]).length !== 1 ? 's' : ''}</div>
          </td>
          <td>${rx.refills !== undefined ? rx.refills : '—'}</td>
          <td>${statusBadge(rx.status||'active')}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Prescriptions.viewPrescription('${rx.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Prescriptions.openEditModal('${rx.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Prescriptions.deletePrescription('${rx.id}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterStatus(val) { filterStatus = val; renderTable(); }

  function medRow(idx, med = {}) {
    return `
      <div class="med-item" id="med-row-${idx}" style="flex-direction:column;align-items:stretch;gap:8px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:0.8rem;font-weight:600;color:var(--gray-500)">Medication ${idx + 1}</span>
          ${idx > 0 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="Prescriptions.removeMed(${idx})" style="color:var(--danger);padding:2px 6px">Remove</button>` : ''}
        </div>
        <div class="form-row" style="margin-bottom:0">
          <div class="form-group" style="margin-bottom:0">
            <input class="form-control" name="med_name_${idx}" value="${escapeHtml(med.name||'')}" required placeholder="Medication name" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <input class="form-control" name="med_dosage_${idx}" value="${escapeHtml(med.dosage||'')}" placeholder="Dosage (e.g. 10mg)" />
          </div>
        </div>
        <div class="form-row" style="margin-bottom:0">
          <div class="form-group" style="margin-bottom:0">
            <input class="form-control" name="med_frequency_${idx}" value="${escapeHtml(med.frequency||'')}" placeholder="Frequency (e.g. Twice daily)" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <input class="form-control" name="med_duration_${idx}" value="${escapeHtml(med.duration||'')}" placeholder="Duration (e.g. 30 days)" />
          </div>
        </div>
      </div>`;
  }

  function prescriptionForm(rx = {}) {
    const patients = Storage.getAll('patients').filter(p => p.status === 'active');
    const doctors = Storage.getAll('doctors').filter(d => d.status === 'active');
    const records = Storage.getAll('records');
    const today = new Date().toISOString().split('T')[0];
    const meds = rx.medications && rx.medications.length ? rx.medications : [{}];
    medCount = meds.length;

    return `
      <form id="rx-form">
        <div class="form-row">
          <div class="form-group">
            <label>Patient <span class="required">*</span></label>
            <select class="form-control" name="patientId" required>
              <option value="">Select patient</option>
              ${patients.map(p => `<option value="${p.id}" ${rx.patientId===p.id?'selected':''}>${escapeHtml(p.firstName+' '+p.lastName)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Doctor <span class="required">*</span></label>
            <select class="form-control" name="doctorId" required>
              <option value="">Select doctor</option>
              ${doctors.map(d => `<option value="${d.id}" ${rx.doctorId===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" class="form-control" name="date" value="${rx.date||today}" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
              <option value="active" ${(rx.status||'active')==='active'?'selected':''}>Active</option>
              <option value="expired" ${rx.status==='expired'?'selected':''}>Expired</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Linked Medical Record</label>
          <select class="form-control" name="recordId">
            <option value="">None</option>
            ${records.map(r => {
              const p = Storage.getById('patients', r.patientId);
              const pName = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
              return `<option value="${r.id}" ${rx.recordId===r.id?'selected':''}>${escapeHtml(pName)} — ${escapeHtml(r.diagnosis)} (${formatDate(r.date)})</option>`;
            }).join('')}
          </select>
        </div>

        <div class="section-divider">Medications</div>
        <div id="meds-container">
          ${meds.map((m, i) => medRow(i, m)).join('')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="Prescriptions.addMed()" style="margin-bottom:16px">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Medication
        </button>

        <div class="form-group">
          <label>Instructions</label>
          <textarea class="form-control" name="instructions" placeholder="Special instructions for patient...">${escapeHtml(rx.instructions||'')}</textarea>
        </div>
        <div class="form-group">
          <label>Refills Allowed</label>
          <input type="number" class="form-control" name="refills" value="${rx.refills||0}" min="0" max="12" />
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Prescription</button>
        </div>
      </form>`;
  }

  function addMed() {
    const container = document.getElementById('meds-container');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = medRow(medCount);
    container.appendChild(div.firstElementChild);
    medCount++;
  }

  function removeMed(idx) {
    const row = document.getElementById(`med-row-${idx}`);
    if (row) row.remove();
  }

  function parseMeds(form) {
    const meds = [];
    let i = 0;
    while (form.querySelector(`[name="med_name_${i}"]`)) {
      const name = form.querySelector(`[name="med_name_${i}"]`).value.trim();
      if (name) {
        meds.push({
          name,
          dosage: form.querySelector(`[name="med_dosage_${i}"]`)?.value || '',
          frequency: form.querySelector(`[name="med_frequency_${i}"]`)?.value || '',
          duration: form.querySelector(`[name="med_duration_${i}"]`)?.value || ''
        });
      }
      i++;
    }
    return meds;
  }

  function openAddModal() {
    openModal('New Prescription', prescriptionForm(), 'modal-lg');
    document.getElementById('rx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.medications = parseMeds(e.target);
      if (!data.medications.length) { showToast('Add at least one medication.', 'error'); return; }
      Storage.insert('prescriptions', data);
      closeModal();
      showToast('Prescription created.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const rx = Storage.getById('prescriptions', id);
    if (!rx) return;
    openModal('Edit Prescription', prescriptionForm(rx), 'modal-lg');
    document.getElementById('rx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.medications = parseMeds(e.target);
      if (!data.medications.length) { showToast('Add at least one medication.', 'error'); return; }
      Storage.update('prescriptions', id, data);
      closeModal();
      showToast('Prescription updated.', 'success');
      render();
    });
  }

  function deletePrescription(id) {
    confirmDelete('this prescription', () => {
      Storage.remove('prescriptions', id);
      showToast('Prescription deleted.', 'success');
      render();
    });
  }

  function viewPrescription(id) {
    const rx = Storage.getById('prescriptions', id);
    if (!rx) return;
    const patient = Storage.getById('patients', rx.patientId);
    const doctor = Storage.getById('doctors', rx.doctorId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
    const dName = doctor ? doctor.name : 'Unknown';

    const medsList = (rx.medications||[]).map(m => `
      <div class="med-item">
        <div>
          <div class="med-name">${escapeHtml(m.name)}</div>
          <div class="med-details"><span class="mono">${escapeHtml(m.dosage)}</span> · ${escapeHtml(m.frequency)} · ${escapeHtml(m.duration)}</div>
        </div>
      </div>`).join('');

    openModal('Prescription Details', `
      <div style="padding:4px 0">
        <div class="info-row"><span class="info-label">Patient</span><span class="info-value">${escapeHtml(pName)}</span></div>
        <div class="info-row"><span class="info-label">Prescribing Doctor</span><span class="info-value">${escapeHtml(dName)}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(rx.date)}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${statusBadge(rx.status||'active')}</span></div>
        <div class="info-row"><span class="info-label">Refills</span><span class="info-value">${rx.refills||0}</span></div>
      </div>
      <div class="section-divider" style="margin-top:12px">Medications</div>
      <ul class="med-list" style="margin-top:8px">${medsList}</ul>
      ${rx.instructions ? `
        <div class="section-divider" style="margin-top:12px">Instructions</div>
        <p style="font-size:0.875rem;color:var(--gray-700);margin-top:8px;line-height:1.6">${escapeHtml(rx.instructions)}</p>
      ` : ''}
      <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.can('edit_prescriptions') ? `
          <button class="btn btn-primary btn-sm" onclick="closeModal();Prescriptions.openEditModal('${id}')">Edit</button>
          <button class="btn btn-warning btn-sm" onclick="Prescriptions.toggleStatus('${id}','${rx.status}')">
            ${rx.status === 'active' ? 'Mark Expired' : 'Mark Active'}
          </button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `);
  }

  function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'expired' : 'active';
    Storage.update('prescriptions', id, { status: newStatus });
    closeModal();
    showToast(`Prescription marked as ${newStatus}.`, 'success');
    render();
  }

  return { render, openAddModal, openEditModal, deletePrescription, viewPrescription, toggleStatus, onSearch, onFilterStatus, addMed, removeMed };
})();
