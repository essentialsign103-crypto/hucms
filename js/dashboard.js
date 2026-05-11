/* ============================================
   CLINIC OS — DASHBOARD MODULE
   ============================================ */

const Dashboard = (() => {

  function render() {
    const today = new Date().toISOString().split('T')[0];
    const patients = Storage.getAll('patients');
    const doctors = Storage.getAll('doctors');
    const appointments = Storage.getAll('appointments');
    const records = Storage.getAll('records');
    const prescriptions = Storage.getAll('prescriptions');
    const treatments = Storage.getAll('treatments');

    const todayAppts = appointments.filter(a => a.date === today);
    const scheduledToday = todayAppts.filter(a => a.status === 'scheduled').length;
    const activePrescriptions = prescriptions.filter(p => p.status === 'active').length;
    const ongoingTreatments = treatments.filter(t => t.status === 'ongoing').length;

    const todayApptsList = todayAppts
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(a => {
        const patient = Storage.getById('patients', a.patientId);
        const doctor = Storage.getById('doctors', a.doctorId);
        const pName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
        const dName = doctor ? doctor.name : 'Unknown';
        return `
          <div class="appt-item">
            <div class="appt-time">${a.time}</div>
            <div class="appt-info">
              <div class="appt-patient">${escapeHtml(pName)}</div>
              <div class="appt-doctor">${escapeHtml(dName)} · ${escapeHtml(a.type)}</div>
            </div>
            ${statusBadge(a.status)}
          </div>`;
      }).join('') || '<div class="empty-state" style="padding:30px"><p>No appointments today</p></div>';

    // Recent activity from records + appointments
    const recentActivity = buildActivity(appointments, records, patients, doctors);

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, ${escapeHtml(Auth.getSession().name)} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div class="workflow-banner">
        <div style="font-size:0.8rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap">Clinical Workflow</div>
        <div class="workflow-steps">
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">1</div>Register Patient</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">2</div>Book Appointment</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">3</div>Consultation</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">4</div>Medical Record</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">5</div>Prescription</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" style="font-family:'Insaniburg',serif"><div class="workflow-step-num">6</div>Treatment</div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="quick-action-btn" onclick="window.location.href='patients.html'">
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          New Patient
        </button>
        <button class="quick-action-btn" onclick="window.location.href='appointments.html'">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
          Book Appointment
        </button>
        <button class="quick-action-btn" onclick="window.location.href='records.html'">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          New Record
        </button>
        <button class="quick-action-btn" onclick="window.location.href='prescriptions.html'">
          <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
          Prescribe
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${patients.filter(p=>p.status==='active').length}</div>
            <div class="stat-label">Active Patients</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${scheduledToday}</div>
            <div class="stat-label">Today's Appointments</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${activePrescriptions}</div>
            <div class="stat-label">Active Prescriptions</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cyan">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${ongoingTreatments}</div>
            <div class="stat-label">Ongoing Treatments</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${doctors.filter(d=>d.status==='active').length}</div>
            <div class="stat-label">Active Doctors</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${records.length}</div>
            <div class="stat-label">Medical Records</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Today's Appointments</span>
            <a href="appointments.html" class="btn btn-ghost btn-sm">View all</a>
          </div>
          <div class="card-body" style="padding:0 20px">
            ${todayApptsList}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Activity</span>
          </div>
          <div class="card-body" style="padding:0 20px">
            <ul class="activity-list">
              ${recentActivity}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function buildActivity(appointments, records, patients, doctors) {
    const items = [];

    // Recent appointments
    const recentAppts = [...appointments]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 4);

    recentAppts.forEach(a => {
      const p = Storage.getById('patients', a.patientId);
      const pName = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
      const colorMap = { scheduled: 'blue', completed: 'green', cancelled: 'red', 'no-show': 'orange' };
      items.push({
        text: `Appointment <strong>${a.status}</strong> for ${escapeHtml(pName)}`,
        time: formatDateTime(a.updatedAt),
        color: colorMap[a.status] || 'blue',
        ts: new Date(a.updatedAt)
      });
    });

    // Recent records
    const recentRecs = [...records]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    recentRecs.forEach(r => {
      const p = Storage.getById('patients', r.patientId);
      const pName = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
      items.push({
        text: `Medical record added for <strong>${escapeHtml(pName)}</strong> — ${escapeHtml(r.diagnosis)}`,
        time: formatDateTime(r.createdAt),
        color: 'purple',
        ts: new Date(r.createdAt)
      });
    });

    return items
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(i => `
        <li class="activity-item">
          <div class="activity-dot ${i.color}"></div>
          <div class="activity-text">${i.text}</div>
          <div class="activity-time">${i.time}</div>
        </li>
      `).join('') || '<li class="activity-item"><div class="activity-text" style="color:var(--gray-400)">No recent activity</div></li>';
  }

  return { render };
})();
