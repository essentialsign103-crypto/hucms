/* ============================================
   CLINIC OS — MEDICAL RECORDS MODULE
   ============================================ */

const Records = (() => {
  let searchTerm = '';
  let filterType = 'all';

  function render() {
    const canEdit = Auth.can('edit_records');
    const types = [...new Set(Storage.getAll('records').map(r => r.type).filter(Boolean))].sort();

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Medical Records</h1>
          <p>Patient diagnoses, notes, and clinical history</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Records.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Record
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search patient or diagnosis..." oninput="Records.onSearch(this.value)" value="${escapeHtml(searchTerm)}" />
            </div>
            <select class="filter-select" onchange="Records.onFilterType(this.value)">
              <option value="all">All Types</option>
              ${types.map(t => `<option value="${t}" ${filterType===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}
            </select>
          </div>
          <span id="records-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Diagnosis</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="records-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let records = Storage.getAll('records');
    
    // Role-based filtering
    const session = Auth.getSession();
    if (session && session.role === 'doctor') {
      // Doctor sees only their records
      const doctorRecord = Storage.query('doctors', d => d.userId === session.userId)[0];
      if (doctorRecord) {
        records = records.filter(r => r.doctorId === doctorRecord.id);
      } else {
        records = []; // Doctor with no doctor record sees nothing
      }
    }
    // Receptionist and Admin see all records
    
    if (filterType !== 'all') records = records.filter(r => r.type === filterType);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      records = records.filter(r => {
        const p = Storage.getById('patients', r.patientId);
        const pName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : '';
        return pName.includes(s) || (r.diagnosis||'').toLowerCase().includes(s) || (r.symptoms||'').toLowerCase().includes(s);
      });
    }
    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderTable() {
    const records = getFiltered();
    const canEdit = Auth.can('edit_records');
    const tbody = document.getElementById('records-tbody');
    const countEl = document.getElementById('records-count');
    if (countEl) countEl.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>No records found</h3><p>Try adjusting your search or filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const patient = Storage.getById('patients', r.patientId);
      const doctor = Storage.getById('doctors', r.doctorId);
      const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
      const dName = doctor ? doctor.name : 'Unknown';
      const pColor = avatarColor(pName);
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
          <td>${formatDate(r.date)}</td>
          <td>
            <div class="td-name" style="font-family:'Insaniburg',serif;white-space:nowrap">${escapeHtml(r.diagnosis||'—')}</div>
            <div class="td-sub" style="font-family:'Insaniburg',serif;white-space:nowrap">${escapeHtml(r.symptoms||'')}</div>
          </td>
          <td><span class="badge badge-blue">${escapeHtml(r.type||'General')}</span></td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Records.viewRecord('${r.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Records.openEditModal('${r.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Records.deleteRecord('${r.id}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterType(val) { filterType = val; renderTable(); }

  function recordForm(r = {}) {
    const patients = Storage.getAll('patients').filter(p => p.status === 'active');
    const doctors = Storage.getAll('doctors').filter(d => d.status === 'active');
    const today = new Date().toISOString().split('T')[0];
    const vs = r.vitalSigns || {};

    return `
      <form id="record-form">
        <div class="form-row">
          <div class="form-group">
            <label>Patient <span class="required">*</span></label>
            <select class="form-control" name="patientId" required>
              <option value="">Select patient</option>
              ${patients.map(p => `<option value="${p.id}" ${r.patientId===p.id?'selected':''}>${escapeHtml(p.firstName+' '+p.lastName)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Doctor <span class="required">*</span></label>
            <select class="form-control" name="doctorId" required>
              <option value="">Select doctor</option>
              ${doctors.map(d => `<option value="${d.id}" ${r.doctorId===d.id?'selected':''}>${escapeHtml(d.name)} — ${escapeHtml(d.specialization)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" class="form-control" name="date" value="${r.date||today}" required />
          </div>
          <div class="form-group">
            <label>Record Type</label>
            <select class="form-control" name="type">
              ${['Consultation','Follow-up','Emergency','Cardiology','Dermatology','Pediatrics','Orthopedics','Neurology','General'].map(t =>
                `<option value="${t}" ${r.type===t?'selected':''}>${t}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Diagnosis <span class="required">*</span></label>
          <input class="form-control" name="diagnosis" value="${escapeHtml(r.diagnosis||'')}" required placeholder="Primary diagnosis" />
        </div>
        <div class="form-group">
          <label>Symptoms</label>
          <textarea class="form-control" name="symptoms" placeholder="Patient-reported symptoms...">${escapeHtml(r.symptoms||'')}</textarea>
        </div>
        <div class="form-group">
          <label>Clinical Notes</label>
          <textarea class="form-control" name="notes" placeholder="Doctor's notes, observations, treatment plan...">${escapeHtml(r.notes||'')}</textarea>
        </div>
        
        <div class="section-divider">Referral</div>
        <div class="form-row">
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" name="referral" ${r.referral?'checked':''} onchange="document.getElementById('referral-reason').style.display=this.checked?'block':'none'" />
              <span>Refer to Specialist</span>
            </label>
          </div>
        </div>
        <div class="form-group" id="referral-reason" style="display:${r.referral?'block':'none'}">
          <label>Referral Reason / Required Specialization</label>
          <input class="form-control" name="referralReason" value="${escapeHtml(r.referralReason||'')}" placeholder="e.g., Needs Cardiology specialist for advanced testing" />
        </div>

        <div class="section-divider">Vital Signs</div>
        <div class="form-row">
          <div class="form-group">
            <label>Blood Pressure</label>
            <input class="form-control" name="vs_bp" value="${escapeHtml(vs.bp||'')}" placeholder="120/80" />
          </div>
          <div class="form-group">
            <label>Pulse (bpm)</label>
            <input class="form-control" name="vs_pulse" value="${escapeHtml(vs.pulse||'')}" placeholder="72" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Temperature (°F)</label>
            <input class="form-control" name="vs_temp" value="${escapeHtml(vs.temp||'')}" placeholder="98.6" />
          </div>
          <div class="form-group">
            <label>Weight</label>
            <input class="form-control" name="vs_weight" value="${escapeHtml(vs.weight||'')}" placeholder="150 lbs" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Height</label>
            <input class="form-control" name="vs_height" value="${escapeHtml(vs.height||'')}" placeholder="5'10&quot;" />
          </div>
          <div class="form-group">
            <label>O₂ Saturation (%)</label>
            <input class="form-control" name="vs_o2" value="${escapeHtml(vs.o2||'')}" placeholder="98%" />
          </div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>`;
  }

  function parseFormData(formData) {
    const data = {};
    const vs = {};
    for (const [key, val] of formData.entries()) {
      if (key.startsWith('vs_')) {
        vs[key.replace('vs_', '')] = val;
      } else {
        data[key] = val;
      }
    }
    data.vitalSigns = vs;
    return data;
  }

  function openAddModal() {
    openModal('New Medical Record', recordForm(), 'modal-lg');
    document.getElementById('record-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = parseFormData(new FormData(e.target));
      Storage.insert('records', data);
      closeModal();
      showToast('Medical record created.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const r = Storage.getById('records', id);
    if (!r) return;
    openModal('Edit Medical Record', recordForm(r), 'modal-lg');
    document.getElementById('record-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = parseFormData(new FormData(e.target));
      Storage.update('records', id, data);
      closeModal();
      showToast('Record updated.', 'success');
      render();
    });
  }

  function deleteRecord(id) {
    confirmDelete('this medical record', () => {
      Storage.remove('records', id);
      showToast('Record deleted.', 'success');
      render();
    });
  }

  function viewRecord(id) {
    const r = Storage.getById('records', id);
    if (!r) return;
    const patient = Storage.getById('patients', r.patientId);
    const doctor = Storage.getById('doctors', r.doctorId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
    const dName = doctor ? doctor.name : 'Unknown';
    const vs = r.vitalSigns || {};

    openModal('Medical Record', `
      <div style="padding:4px 0">
        <div class="info-row"><span class="info-label">Patient</span><span class="info-value">${escapeHtml(pName)}</span></div>
        <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${escapeHtml(dName)}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(r.date)}</span></div>
        <div class="info-row"><span class="info-label">Type</span><span class="info-value"><span class="badge badge-blue">${escapeHtml(r.type||'General')}</span></span></div>
        <div class="info-row"><span class="info-label">Diagnosis</span><span class="info-value" style="font-weight:600;color:var(--gray-900)">${escapeHtml(r.diagnosis||'—')}</span></div>
        <div class="info-row" style="align-items:flex-start"><span class="info-label">Symptoms</span><span class="info-value">${escapeHtml(r.symptoms||'—')}</span></div>
        <div class="info-row" style="align-items:flex-start"><span class="info-label">Notes</span><span class="info-value">${escapeHtml(r.notes||'—')}</span></div>
        ${r.referral ? `
        <div class="info-row" style="align-items:flex-start;background:#fff3cd;padding:10px;border-radius:4px;border-left:4px solid #ffc107">
          <span class="info-label" style="color:#856404">⚠ REFERRAL</span>
          <span class="info-value" style="color:#856404;font-weight:600">${escapeHtml(r.referralReason||'Needs specialist consultation')}</span>
        </div>
        ` : ''}
        ${Object.keys(vs).length ? `
        <div class="section-divider" style="margin-top:12px">Vital Signs</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          ${vs.bp     ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">Blood Pressure</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.bp)}</div></div>` : ''}
          ${vs.pulse  ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">Pulse</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.pulse)} bpm</div></div>` : ''}
          ${vs.temp   ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">Temperature</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.temp)} °F</div></div>` : ''}
          ${vs.weight ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">Weight</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.weight)}</div></div>` : ''}
          ${vs.height ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">Height</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.height)}</div></div>` : ''}
          ${vs.o2     ? `<div><label style="font-size:0.75rem;color:var(--gray-500)">O₂ Saturation</label><div class="mono" style="margin-top:2px">${escapeHtml(vs.o2)}</div></div>` : ''}
        </div>` : ''}
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.can('edit_records') ? `<button class="btn btn-primary btn-sm" onclick="closeModal();Records.openEditModal('${id}')">Edit Record</button>` : ''}
        ${Auth.isReceptionist && r.referral ? `<button class="btn btn-warning btn-sm" onclick="closeModal();Records.reassignPatient('${r.patientId}','${escapeHtml(r.referralReason)}')">Reassign to Specialist</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `);
  }

  function reassignPatient(patientId, referralReason) {
    const patient = Storage.getById('patients', patientId);
    if (!patient) return;
    const pName = `${patient.firstName} ${patient.lastName}`;
    const doctors = Storage.getAll('doctors').filter(d => d.status === 'active');
    
    openModal('Reassign Patient to Specialist', `
      <div style="padding:8px 0;margin-bottom:16px">
        <p style="margin:0;font-weight:600;color:var(--gray-900)">${escapeHtml(pName)}</p>
        <p style="margin:4px 0 0 0;font-size:0.875rem;color:var(--gray-600)">Referral Reason: ${escapeHtml(referralReason)}</p>
      </div>
      <form id="reassign-form">
        <div class="form-group">
          <label>Select Specialist Doctor <span class="required">*</span></label>
          <select class="form-control" name="doctorId" required>
            <option value="">Choose doctor...</option>
            ${doctors.map(d => `<option value="${d.id}">${escapeHtml(d.name)} — ${escapeHtml(d.specialization)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Appointment Date <span class="required">*</span></label>
          <input type="date" class="form-control" name="date" value="${new Date().toISOString().split('T')[0]}" required />
        </div>
        <div class="form-group">
          <label>Appointment Time <span class="required">*</span></label>
          <input type="time" class="form-control" name="time" value="09:00" required />
        </div>
        <div class="form-group">
          <label>Notes for Specialist</label>
          <textarea class="form-control" name="notes" placeholder="Previous diagnosis and referral reason...">${escapeHtml(referralReason)}</textarea>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Appointment</button>
        </div>
      </form>
    `);
    
    document.getElementById('reassign-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const doctorId = formData.get('doctorId');
      const date = formData.get('date');
      const time = formData.get('time');
      const notes = formData.get('notes');
      
      // Create new appointment
      Storage.insert('appointments', {
        patientId,
        doctorId,
        date,
        time,
        type: 'Specialist Referral',
        status: 'scheduled',
        notes,
        duration: 45
      });
      
      closeModal();
      showToast(`Patient reassigned to specialist. New appointment created.`, 'success');
      render();
    });
  }

  return { render, openAddModal, openEditModal, deleteRecord, viewRecord, reassignPatient, onSearch, onFilterType };
})();
