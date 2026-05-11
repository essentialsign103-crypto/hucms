/* ============================================
   CLINIC OS — PATIENTS MODULE
   ============================================ */

const Patients = (() => {
  let searchTerm = '';
  let filterStatus = 'all';
  let filterGender = 'all';

  function render() {
    const canEdit = Auth.can('edit_patients');
    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Patients</h1>
          <p>Manage patient records and profiles</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Patients.openAddModal()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Patient
        </button>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" id="patient-search" placeholder="Search patients..." value="${escapeHtml(searchTerm)}" oninput="Patients.onSearch(this.value)" />
            </div>
            <select class="filter-select" onchange="Patients.onFilterStatus(this.value)">
              <option value="all" ${filterStatus==='all'?'selected':''}>All Status</option>
              <option value="active" ${filterStatus==='active'?'selected':''}>Active</option>
              <option value="inactive" ${filterStatus==='inactive'?'selected':''}>Inactive</option>
            </select>
            <select class="filter-select" onchange="Patients.onFilterGender(this.value)">
              <option value="all" ${filterGender==='all'?'selected':''}>All Gender</option>
              <option value="male" ${filterGender==='male'?'selected':''}>Male</option>
              <option value="female" ${filterGender==='female'?'selected':''}>Female</option>
            </select>
          </div>
          <span id="patient-count" class="badge badge-gray"></span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age / Gender</th>
                <th>Contact</th>
                <th>Blood Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="patients-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    renderTable();
  }

  function getFiltered() {
    let patients = Storage.getAll('patients');
    
    // Role-based filtering
    const session = Auth.getSession();
    if (session && session.role === 'doctor') {
      // Doctor sees only patients they have appointments with
      const doctorRecord = Storage.query('doctors', d => d.userId === session.userId)[0];
      if (doctorRecord) {
        const doctorAppointments = Storage.query('appointments', a => a.doctorId === doctorRecord.id);
        const patientIds = new Set(doctorAppointments.map(a => a.patientId));
        patients = patients.filter(p => patientIds.has(p.id));
      } else {
        patients = []; // Doctor with no doctor record sees no patients
      }
    }
    // Receptionist and Admin see all patients
    
    if (filterStatus !== 'all') patients = patients.filter(p => p.status === filterStatus);
    if (filterGender !== 'all') patients = patients.filter(p => p.gender === filterGender);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      patients = patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s) ||
        (p.phone || '').includes(s)
      );
    }
    return patients;
  }

  function renderTable() {
    const patients = getFiltered();
    const canEdit = Auth.can('edit_patients');
    const tbody = document.getElementById('patients-tbody');
    const countEl = document.getElementById('patient-count');
    if (countEl) countEl.textContent = `${patients.length} patient${patients.length !== 1 ? 's' : ''}`;

    if (!patients.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>No patients found</h3><p>Try adjusting your search or filters</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = patients.map(p => {
      const name = `${p.firstName} ${p.lastName}`;
      const age = calcAge(p.dob);
      const color = avatarColor(name);
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-${color}">${getInitials(name)}</div>
              <div>
                <div class="td-name">${escapeHtml(name)}</div>
                <div class="td-sub"><span class="mono">${p.id}</span></div>
              </div>
            </div>
          </td>
          <td>${age} yrs / ${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}</td>
          <td>
            <div>${escapeHtml(p.phone || '—')}</div>
            <div class="td-sub">${escapeHtml(p.email || '—')}</div>
          </td>
          <td><span class="badge badge-blue mono">${escapeHtml(p.bloodType || '—')}</span></td>
          <td>${statusBadge(p.status || 'active')}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View Profile" onclick="Patients.viewProfile('${p.id}')">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${canEdit ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Patients.openEditModal('${p.id}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="Patients.deletePatient('${p.id}','${escapeHtml(name)}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function onSearch(val) { searchTerm = val; renderTable(); }
  function onFilterStatus(val) { filterStatus = val; renderTable(); }
  function onFilterGender(val) { filterGender = val; renderTable(); }

  function patientForm(p = {}) {
    return `
      <form id="patient-form">
        <div class="form-row">
          <div class="form-group">
            <label>First Name <span class="required">*</span></label>
            <input class="form-control" name="firstName" value="${escapeHtml(p.firstName||'')}" required placeholder="John" />
          </div>
          <div class="form-group">
            <label>Last Name <span class="required">*</span></label>
            <input class="form-control" name="lastName" value="${escapeHtml(p.lastName||'')}" required placeholder="Doe" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date of Birth <span class="required">*</span></label>
            <input type="date" class="form-control" name="dob" value="${p.dob||''}" required />
          </div>
          <div class="form-group">
            <label>Gender <span class="required">*</span></label>
            <select class="form-control" name="gender" required>
              <option value="">Select gender</option>
              <option value="male" ${p.gender==='male'?'selected':''}>Male</option>
              <option value="female" ${p.gender==='female'?'selected':''}>Female</option>
              <option value="other" ${p.gender==='other'?'selected':''}>Other</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Phone <span class="required">*</span></label>
            <input class="form-control" name="phone" value="${escapeHtml(p.phone||'')}" required placeholder="555-0000" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" name="email" value="${escapeHtml(p.email||'')}" placeholder="patient@email.com" />
          </div>
        </div>
        <div class="form-group">
          <label>Address</label>
          <input class="form-control" name="address" value="${escapeHtml(p.address||'')}" placeholder="123 Main St, City" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Blood Type</label>
            <select class="form-control" name="bloodType">
              <option value="">Unknown</option>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => `<option value="${bt}" ${p.bloodType===bt?'selected':''}>${bt}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
              <option value="active" ${(p.status||'active')==='active'?'selected':''}>Active</option>
              <option value="inactive" ${p.status==='inactive'?'selected':''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Allergies</label>
          <input class="form-control" name="allergies" value="${escapeHtml(p.allergies||'')}" placeholder="Penicillin, Sulfa drugs, or None" />
        </div>
        <div class="form-group">
          <label>Emergency Contact</label>
          <input class="form-control" name="emergencyContact" value="${escapeHtml(p.emergencyContact||'')}" placeholder="Name - Phone" />
        </div>
        <div class="form-group">
          <label>Insurance</label>
          <input class="form-control" name="insurance" value="${escapeHtml(p.insurance||'')}" placeholder="Provider #PolicyNumber" />
        </div>
        <div class="modal-footer" style="padding:16px 0 0;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Patient</button>
        </div>
      </form>`;
  }

  function openAddModal() {
    openModal('Add New Patient', patientForm());
    document.getElementById('patient-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.insert('patients', data);
      closeModal();
      showToast('Patient added successfully.', 'success');
      render();
    });
  }

  function openEditModal(id) {
    const p = Storage.getById('patients', id);
    if (!p) return;
    openModal('Edit Patient', patientForm(p));
    document.getElementById('patient-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.update('patients', id, data);
      closeModal();
      showToast('Patient updated successfully.', 'success');
      render();
    });
  }

  function deletePatient(id, name) {
    confirmDelete(name, () => {
      Storage.remove('patients', id);
      showToast('Patient deleted.', 'success');
      render();
    });
  }

  function viewProfile(id) {
    const p = Storage.getById('patients', id);
    if (!p) return;
    const name = `${p.firstName} ${p.lastName}`;
    const color = avatarColor(name);
    const records      = Storage.query('records',       r  => r.patientId  === id);
    const appointments = Storage.query('appointments',  a  => a.patientId  === id);
    const prescriptions= Storage.query('prescriptions', rx => rx.patientId === id);
    const treatments   = Storage.query('treatments',    t  => t.patientId  === id);

    const recentRecords = [...records].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
    const recentAppts   = [...appointments].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);

    openModal(`Patient Profile`, `
      <div class="profile-header">
        <div class="profile-avatar">${getInitials(name)}</div>
        <div style="flex:1;min-width:0">
          <div class="profile-name">${escapeHtml(name)}</div>
          <div class="profile-sub">Age ${calcAge(p.dob)} · ${p.gender ? p.gender.charAt(0).toUpperCase()+p.gender.slice(1) : '—'} · ${escapeHtml(p.bloodType||'Unknown blood type')}</div>
          <div style="margin-top:6px"><span style="font-family:var(--font-mono);font-size:0.75rem;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px">ID: ${p.id}</span></div>
        </div>
        ${statusBadge(p.status||'active')}
      </div>

      <div class="tabs" style="margin-top:16px">
        <button class="tab-btn active" onclick="Patients.switchTab(this,'tab-info')">Info</button>
        <button class="tab-btn" onclick="Patients.switchTab(this,'tab-records')">Records (${records.length})</button>
        <button class="tab-btn" onclick="Patients.switchTab(this,'tab-appts')">Appointments (${appointments.length})</button>
        <button class="tab-btn" onclick="Patients.switchTab(this,'tab-rx')">Prescriptions (${prescriptions.length})</button>
        <button class="tab-btn" onclick="Patients.switchTab(this,'tab-tx')">Treatments (${treatments.length})</button>
      </div>

      <div id="tab-info">
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${escapeHtml(p.phone||'—')}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escapeHtml(p.email||'—')}</span></div>
        <div class="info-row"><span class="info-label">Date of Birth</span><span class="info-value">${formatDate(p.dob)}</span></div>
        <div class="info-row"><span class="info-label">Address</span><span class="info-value">${escapeHtml(p.address||'—')}</span></div>
        <div class="info-row"><span class="info-label">Allergies</span><span class="info-value" style="color:var(--danger);font-weight:600">${escapeHtml(p.allergies||'None')}</span></div>
        <div class="info-row"><span class="info-label">Emergency Contact</span><span class="info-value">${escapeHtml(p.emergencyContact||'—')}</span></div>
        <div class="info-row"><span class="info-label">Insurance</span><span class="info-value">${escapeHtml(p.insurance||'—')}</span></div>
        <div class="info-row"><span class="info-label">Patient ID</span><span class="info-value"><span class="mono">${p.id}</span></span></div>
        <div class="info-row"><span class="info-label">Registered</span><span class="info-value">${formatDateTime(p.createdAt)}</span></div>
      </div>

      <div id="tab-records" class="hidden">
        ${recentRecords.length ? recentRecords.map(r => `
          <div class="appt-item">
            <div class="appt-info">
              <div class="appt-patient">${escapeHtml(r.diagnosis)}</div>
              <div class="appt-doctor">${formatDate(r.date)} · <span class="badge badge-blue" style="font-size:0.7rem">${escapeHtml(r.type||'')}</span></div>
            </div>
          </div>`).join('') : '<p style="color:var(--gray-400);padding:16px 0">No records found</p>'}
      </div>

      <div id="tab-appts" class="hidden">
        ${recentAppts.length ? recentAppts.map(a => {
          const doc = Storage.getById('doctors', a.doctorId);
          return `<div class="appt-item">
            <div class="appt-time">${a.time}</div>
            <div class="appt-info">
              <div class="appt-patient">${formatDate(a.date)} · ${escapeHtml(a.type)}</div>
              <div class="appt-doctor">${doc ? escapeHtml(doc.name) : 'Unknown'}</div>
            </div>
            ${statusBadge(a.status)}
          </div>`;
        }).join('') : '<p style="color:var(--gray-400);padding:16px 0">No appointments found</p>'}
      </div>

      <div id="tab-rx" class="hidden">
        ${prescriptions.length ? prescriptions.map(rx => `
          <div class="appt-item">
            <div class="appt-info">
              <div class="appt-patient">${rx.medications.map(m=>`<span class="mono" style="font-size:0.75rem">${escapeHtml(m.name)}</span>`).join(', ')}</div>
              <div class="appt-doctor">${formatDate(rx.date)} · ${rx.medications.length} medication${rx.medications.length!==1?'s':''}</div>
            </div>
            ${statusBadge(rx.status)}
          </div>`).join('') : '<p style="color:var(--gray-400);padding:16px 0">No prescriptions found</p>'}
      </div>

      <div id="tab-tx" class="hidden">
        ${treatments.length ? treatments.map(t => {
          const progress = parseInt(t.progress)||0;
          const pColor = progress>=80?'green':progress>=40?'':'orange';
          return `<div class="appt-item" style="flex-direction:column;align-items:stretch;gap:6px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div class="appt-patient">${escapeHtml(t.title)}</div>
              ${statusBadge(t.status)}
            </div>
            <div style="font-size:0.75rem;color:var(--gray-500)">${formatDate(t.startDate)} · ${(t.sessions||[]).length} session${(t.sessions||[]).length!==1?'s':''}</div>
            <div class="progress-bar"><div class="progress-fill ${pColor}" style="width:${progress}%"></div></div>
          </div>`;
        }).join('') : '<p style="color:var(--gray-400);padding:16px 0">No treatments found</p>'}
      </div>

      <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${Auth.can('edit_patients') ? `<button class="btn btn-primary btn-sm" onclick="closeModal();Patients.openEditModal('${id}')">Edit Patient</button>` : ''}
        ${Auth.can('view_appointments') ? `<button class="btn btn-secondary btn-sm" onclick="window.location.href='appointments.html'">Book Appointment</button>` : ''}
        <button class="btn btn-info btn-sm" onclick="Patients.downloadPatientPDF('${id}')">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PDF
        </button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  }

  function switchTab(btn, tabId) {
    btn.closest('.modal-body').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tabs = ['tab-info','tab-records','tab-appts','tab-rx','tab-tx'];
    tabs.forEach(t => {
      const el = document.getElementById(t);
      if (el) el.classList.toggle('hidden', t !== tabId);
    });
  }

  function downloadPatientPDF(id) {
    const p = Storage.getById('patients', id);
    if (!p) return;
    
    const name = `${p.firstName} ${p.lastName}`;
    const records      = Storage.query('records',       r  => r.patientId  === id);
    const appointments = Storage.query('appointments',  a  => a.patientId  === id);
    const prescriptions= Storage.query('prescriptions', rx => rx.patientId === id);
    const treatments   = Storage.query('treatments',    t  => t.patientId  === id);

    // Create PDF content
    let pdfContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h1 style="text-align: center; color: #1d4ed8; margin-bottom: 10px;">HU CMS - Patient Record</h1>
        <hr style="border: 1px solid #ddd; margin-bottom: 20px;">
        
        <!-- Patient Information -->
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-top: 20px;">Patient Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Full Name:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(name)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Patient ID:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date of Birth:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(p.dob)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Age:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${calcAge(p.dob)} years</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Gender:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Blood Type:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.bloodType || '—')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.phone || '—')}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.email || '—')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Address:</td>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.address || '—')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Allergies:</td>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;">${escapeHtml(p.allergies || 'None')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Emergency Contact:</td>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.emergencyContact || '—')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Insurance:</td>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(p.insurance || '—')}</td>
          </tr>
        </table>

        <!-- Medical Records -->
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-top: 30px;">Medical Records (${records.length})</h2>
        ${records.length ? records.map(r => {
          const doc = Storage.getById('doctors', r.doctorId);
          return `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-left: 4px solid #1d4ed8;">
              <p style="margin: 0; font-weight: bold; color: #1d4ed8;">${escapeHtml(r.diagnosis)}</p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">Date: ${formatDate(r.date)} | Type: ${escapeHtml(r.type || 'General')} | Doctor: ${doc ? escapeHtml(doc.name) : 'Unknown'}</p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Symptoms:</strong> ${escapeHtml(r.symptoms || '—')}</p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Notes:</strong> ${escapeHtml(r.notes || '—')}</p>
              ${r.vitalSigns && Object.keys(r.vitalSigns).length ? `
                <p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Vital Signs:</strong> 
                  ${r.vitalSigns.bp ? 'BP: ' + escapeHtml(r.vitalSigns.bp) + ' | ' : ''}
                  ${r.vitalSigns.pulse ? 'Pulse: ' + escapeHtml(r.vitalSigns.pulse) + ' bpm | ' : ''}
                  ${r.vitalSigns.temp ? 'Temp: ' + escapeHtml(r.vitalSigns.temp) + '°F | ' : ''}
                  ${r.vitalSigns.weight ? 'Weight: ' + escapeHtml(r.vitalSigns.weight) : ''}
                </p>
              ` : ''}
            </div>
          `;
        }).join('') : '<p style="color: #999;">No medical records found</p>'}

        <!-- Appointments -->
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-top: 30px;">Appointments (${appointments.length})</h2>
        ${appointments.length ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Date</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Time</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Doctor</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Type</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(a => {
                const doc = Storage.getById('doctors', a.doctorId);
                return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(a.date)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${a.time || '—'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${doc ? escapeHtml(doc.name) : 'Unknown'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(a.type || '—')}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${a.status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : '<p style="color: #999;">No appointments found</p>'}

        <!-- Prescriptions -->
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-top: 30px;">Prescriptions (${prescriptions.length})</h2>
        ${prescriptions.length ? prescriptions.map(rx => {
          const doc = Storage.getById('doctors', rx.doctorId);
          return `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-left: 4px solid #1d4ed8;">
              <p style="margin: 0; font-weight: bold; color: #1d4ed8;">Date: ${formatDate(rx.date)} | Doctor: ${doc ? escapeHtml(doc.name) : 'Unknown'} | Status: ${rx.status}</p>
              <p style="margin: 8px 0 0 0; font-weight: bold;">Medications:</p>
              <ul style="margin: 5px 0 0 20px; padding: 0;">
                ${rx.medications.map(m => `
                  <li style="margin: 3px 0;">${escapeHtml(m.name)} - ${escapeHtml(m.dosage)} - ${escapeHtml(m.frequency)} - ${escapeHtml(m.duration)}</li>
                `).join('')}
              </ul>
              ${rx.instructions ? `<p style="margin: 8px 0 0 0; font-size: 0.9em;"><strong>Instructions:</strong> ${escapeHtml(rx.instructions)}</p>` : ''}
            </div>
          `;
        }).join('') : '<p style="color: #999;">No prescriptions found</p>'}

        <!-- Treatments -->
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-top: 30px;">Treatments (${treatments.length})</h2>
        ${treatments.length ? treatments.map(t => {
          const doc = Storage.getById('doctors', t.doctorId);
          return `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-left: 4px solid #1d4ed8;">
              <p style="margin: 0; font-weight: bold; color: #1d4ed8;">${escapeHtml(t.title)}</p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">Start: ${formatDate(t.startDate)} | Doctor: ${doc ? escapeHtml(doc.name) : 'Unknown'} | Status: ${t.status} | Progress: ${t.progress}%</p>
              ${t.description ? `<p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Description:</strong> ${escapeHtml(t.description)}</p>` : ''}
              ${t.notes ? `<p style="margin: 5px 0 0 0; font-size: 0.9em;"><strong>Notes:</strong> ${escapeHtml(t.notes)}</p>` : ''}
              ${t.sessions && t.sessions.length ? `
                <p style="margin: 8px 0 0 0; font-size: 0.9em;"><strong>Sessions (${t.sessions.length}):</strong></p>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                  ${t.sessions.map(s => `<li style="margin: 3px 0; font-size: 0.85em;">${formatDate(s.date)}: ${escapeHtml(s.note)}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }).join('') : '<p style="color: #999;">No treatments found</p>'}

        <hr style="border: 1px solid #ddd; margin-top: 30px; margin-bottom: 10px;">
        <p style="text-align: center; font-size: 0.85em; color: #999;">Generated on ${new Date().toLocaleString()} | HU CMS Patient Management System</p>
      </div>
    `;

    // Generate PDF
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    
    const opt = {
      margin: 10,
      filename: `${name.replace(/\s+/g, '_')}_Records_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    showToast(`PDF downloaded for ${name}`, 'success');
  }

  return { render, openAddModal, openEditModal, deletePatient, viewProfile, onSearch, onFilterStatus, onFilterGender, switchTab, downloadPatientPDF };
})();
