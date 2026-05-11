/* ============================================
   CLINIC OS — STORAGE LAYER
   localStorage abstraction — swap-ready for Firebase
   (Renamed from DB to Storage; window.DB alias kept for backward compat)
   ============================================ */

const Storage = (() => {
  const PREFIX = 'clinicos_';

  // ---- Core CRUD ----
  function getAll(collection) {
    try {
      const data = localStorage.getItem(PREFIX + collection);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  function getById(collection, id) {
    return getAll(collection).find(item => item.id === id) || null;
  }

  function insert(collection, data) {
    const items = getAll(collection);
    const newItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    save(collection, items);
    return newItem;
  }

  function update(collection, id, data) {
    const items = getAll(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    save(collection, items);
    return items[idx];
  }

  function remove(collection, id) {
    const items = getAll(collection).filter(i => i.id !== id);
    save(collection, items);
    return true;
  }

  function query(collection, filterFn) {
    return getAll(collection).filter(filterFn);
  }

  function save(collection, data) {
    localStorage.setItem(PREFIX + collection, JSON.stringify(data));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  function count(collection) {
    return getAll(collection).length;
  }

  function clear(collection) {
    localStorage.removeItem(PREFIX + collection);
  }

  // ---- Seed Data ----
  function seedIfEmpty() {
    // Always clear and reseed to get latest data
    clear('seeded');
    // Clear all collections to force fresh load
    clear('users');
    clear('doctors');
    clear('patients');
    clear('appointments');
    clear('records');
    clear('prescriptions');
    clear('treatments');
    
    // Staff / Users
    const users = [
      { id: 'u1', name: 'Dr. hamza teha ', email: 'hamza@gmail.com', password: 'admin123', role: 'admin', phone: '0965614501', department: 'Administration', status: 'active', joinDate: '2020-01-15' },
      { id: 'u2', name: 'Dr. haylat genene', email: 'doctor@gmail.com', password: 'doctor123', role: 'doctor', phone: '0960382982', department: 'General Medicine', status: 'active', joinDate: '2019-03-10' },
      { id: 'u3', name: 'Duri Abdurahman  ', email: 'reception@gmail.com', password: 'recep123', role: 'receptionist', phone: '091234567', department: 'management', status: 'active', joinDate: '2021-06-01' },
      { id: 'u4', name: 'Dr.Edom legese', email: 'abdisaa@gmail.com', password: 'doc456', role: 'doctor', phone: '0920597510', department: 'Cardiology', status: 'active', joinDate: '2018-09-20' },
      { id: 'u5', name: 'yonas lole', email: 'yonas@gmail.com', password: 'staff123', role: 'receptionist', phone: '0710317185', department: 'management', status: 'active', joinDate: '2022-02-14' }
    ];
    users.forEach(u => { u.createdAt = new Date().toISOString(); u.updatedAt = new Date().toISOString(); });
    save('users', users);

    // Doctors
    const doctors = [
      { id: 'd1', name: 'Dr. Eman nesru', specialization: 'General Medicine', email: 'doctor@gmail.com', phone: '09456123', licenseNo: 'LIC-2019-001', experience: 12, availability: ['Monday','Tuesday','Wednesday','Thursday','Friday'], status: 'active', userId: 'u2' },
      { id: 'd2', name: 'Dr. Aisha nurahmed ', specialization: 'Cardiology', email: 'aisha@gmail.com', phone: '09124567', licenseNo: 'LIC-2018-002', experience: 15, availability: ['Monday','Wednesday','Friday'], status: 'active', userId: 'u4' },
      { id: 'd3', name: 'Dr. imran abdurahmen', specialization: 'Pediatrics', email: 'durim@gmail.com', phone: '09456212', licenseNo: 'LIC-2021-003', experience: 8, availability: ['Tuesday','Thursday','Saturday'], status: 'active', userId: null },
      { id: 'd4', name: 'Dr. ismail hyder', specialization: 'Dermatology', email: 'ismail@gmail.com', phone: '0945612345', licenseNo: 'LIC-2017-004', experience: 18, availability: ['Monday','Tuesday','Thursday'], status: 'active', userId: null },
      { id: 'd5', name: 'Dr. kadira', specialization: 'Orthopedics', email: 'kadira@gmail.com', phone: '09456134', licenseNo: 'LIC-2020-005', experience: 10, availability: ['Wednesday','Friday'], status: 'inactive', userId: null }
    ];
    doctors.forEach(d => { d.createdAt = new Date().toISOString(); d.updatedAt = new Date().toISOString(); });
    save('doctors', doctors);

    // Patients
    const patients = [
      { id: 'p1', firstName: 'mule ', lastName: 'terefa', dob: '1985-04-12', gender: 'male', phone: '09123456', email: 'mule@email.com', address: '123 Oak Street, Springfield', bloodType: 'A+', allergies: 'Penicillin', emergencyContact: 'Lisa Johnson - 555-1002', insurance: 'BlueCross #BC123456', status: 'active' },
      { id: 'p2', firstName: 'saliha', lastName: 'husen', dob: '1992-08-25', gender: 'female', phone: '09214501', email: 'saliha@email.com', address: '456 Maple Ave, Springfield', bloodType: 'O-', allergies: 'None', emergencyContact: 'Tom Williams - 555-1004', insurance: 'Aetna #AE789012', status: 'active' },
      { id: 'p3', firstName: 'David', lastName: 'kedir', dob: '1978-11-30', gender: 'male', phone: '091345', email: 'devid@email.com', address: '789 Pine Road, Springfield', bloodType: 'B+', allergies: 'Sulfa drugs, Aspirin', emergencyContact: 'Mary Brown - 555-1006', insurance: 'United Health #UH345678', status: 'active' },
      { id: 'p4', firstName: 'Emmanuel', lastName: 'debebe', dob: '2001-02-14', gender: 'male', phone: '093456', email: 'emanuel@email.com', address: '321 Elm Street, Springfield', bloodType: 'AB+', allergies: 'Latex', emergencyContact: 'John Davis - 555-1008', insurance: 'Cigna #CI901234', status: 'active' },
      { id: 'p5', firstName: 'khalid', lastName: 'W', dob: '1965-07-08', gender: 'male', phone: '09762345', email: 'khalid@email.com', address: '654 Cedar Lane, Springfield', bloodType: 'O+', allergies: 'None', emergencyContact: 'Helen Wilson - 555-1010', insurance: 'Medicare #MC567890', status: 'active' },
      { id: 'p6', firstName: 'amira', lastName: 'mukter', dob: '1990-12-03', gender: 'female', phone: '09656234', email: 'amira@email.com', address: '987 Birch Blvd, Springfield', bloodType: 'A-', allergies: 'Codeine', emergencyContact: 'Carlos Martinez - 555-1012', insurance: 'BlueCross #BC234567', status: 'active' },
      { id: 'p7', firstName: 'Tashome', lastName: 'fikru', dob: '1955-03-22', gender: 'male', phone: '09567812', email: 'teshe@email.com', address: '147 Walnut Way, Springfield', bloodType: 'B-', allergies: 'Ibuprofen', emergencyContact: 'Nancy Anderson - 555-1014', insurance: 'Aetna #AE890123', status: 'active' },
      { id: 'p8', firstName: 'cala', lastName: 'ayyane', dob: '1998-06-17', gender: 'male', phone: '0934561234', email: 'cala@email.com', address: '258 Spruce St, Springfield', bloodType: 'AB-', allergies: 'None', emergencyContact: 'Mark Taylor - 555-1016', insurance: 'Cigna #CI012345', status: 'inactive' }
    ];
    patients.forEach(p => { p.createdAt = new Date().toISOString(); p.updatedAt = new Date().toISOString(); });
    save('patients', patients);

    // Appointments
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    const appointments = [
      { id: 'a1', patientId: 'p1', doctorId: 'd1', date: fmt(today), time: '09:00', type: 'General Checkup', status: 'scheduled', notes: 'Annual physical examination', duration: 30 },
      { id: 'a2', patientId: 'p2', doctorId: 'd2', date: fmt(today), time: '10:30', type: 'Follow-up', status: 'scheduled', notes: 'Cardiac follow-up after ECG', duration: 45 },
      { id: 'a3', patientId: 'p3', doctorId: 'd1', date: fmt(today), time: '14:00', type: 'Consultation', status: 'completed', notes: 'Blood pressure management', duration: 30 },
      { id: 'a4', patientId: 'p4', doctorId: 'd3', date: fmt(today), time: '15:30', type: 'Pediatric Visit', status: 'scheduled', notes: 'Routine checkup', duration: 30 },
      { id: 'a5', patientId: 'p5', doctorId: 'd2', date: fmt(yesterday), time: '11:00', type: 'Cardiology', status: 'completed', notes: 'Stress test results review', duration: 60 },
      { id: 'a6', patientId: 'p6', doctorId: 'd4', date: fmt(yesterday), time: '13:00', type: 'Dermatology', status: 'completed', notes: 'Skin rash evaluation', duration: 30 },
      { id: 'a7', patientId: 'p7', doctorId: 'd1', date: fmt(yesterday), time: '16:00', type: 'General Checkup', status: 'no-show', notes: '', duration: 30 },
      { id: 'a8', patientId: 'p1', doctorId: 'd2', date: fmt(tomorrow), time: '09:30', type: 'Cardiology', status: 'scheduled', notes: 'ECG review', duration: 45 },
      { id: 'a9', patientId: 'p8', doctorId: 'd4', date: fmt(tomorrow), time: '11:00', type: 'Dermatology', status: 'scheduled', notes: 'Acne treatment follow-up', duration: 30 },
      { id: 'a10', patientId: 'p3', doctorId: 'd5', date: fmt(nextWeek), time: '10:00', type: 'Orthopedics', status: 'scheduled', notes: 'Knee pain assessment', duration: 45 }
    ];
    appointments.forEach(a => { a.createdAt = new Date().toISOString(); a.updatedAt = new Date().toISOString(); });
    save('appointments', appointments);

    // Medical Records
    const records = [
      { id: 'r1', patientId: 'p1', doctorId: 'd1', appointmentId: 'a3', date: fmt(yesterday), diagnosis: 'Hypertension Stage 1', symptoms: 'Headache, dizziness, elevated BP (145/92)', notes: 'Patient advised lifestyle changes. Prescribed antihypertensive medication. Follow-up in 4 weeks.', vitalSigns: { bp: '145/92', pulse: '78', temp: '98.6', weight: '185 lbs', height: '5\'10"' }, type: 'Consultation', referral: false, referralReason: '' },
      { id: 'r2', patientId: 'p2', doctorId: 'd2', appointmentId: 'a5', date: fmt(yesterday), diagnosis: 'Mild Mitral Valve Regurgitation', symptoms: 'Occasional shortness of breath, fatigue', notes: 'Echo shows mild MR. No intervention needed at this time. Annual monitoring recommended.', vitalSigns: { bp: '118/76', pulse: '72', temp: '98.4', weight: '132 lbs', height: '5\'5"' }, type: 'Follow-up', referral: false, referralReason: '' },
      { id: 'r3', patientId: 'p3', doctorId: 'd1', appointmentId: null, date: fmt(yesterday), diagnosis: 'Type 2 Diabetes Mellitus', symptoms: 'Increased thirst, frequent urination, fatigue', notes: 'HbA1c: 7.8%. Metformin dosage adjusted. Dietary counseling provided.', vitalSigns: { bp: '130/85', pulse: '80', temp: '98.7', weight: '210 lbs', height: '5\'11"' }, type: 'Consultation', referral: false, referralReason: '' },
      { id: 'r4', patientId: 'p5', doctorId: 'd2', appointmentId: 'a5', date: fmt(yesterday), diagnosis: 'Coronary Artery Disease', symptoms: 'Chest pain on exertion, shortness of breath', notes: 'Stress test positive. Referred for cardiac catheterization. Aspirin and statin therapy initiated.', vitalSigns: { bp: '138/88', pulse: '68', temp: '98.5', weight: '195 lbs', height: '5\'9"' }, type: 'Cardiology', referral: false, referralReason: '' },
      { id: 'r5', patientId: 'p6', doctorId: 'd4', appointmentId: 'a6', date: fmt(yesterday), diagnosis: 'Contact Dermatitis', symptoms: 'Itchy red rash on forearms, mild swelling', notes: 'Likely allergic reaction to new detergent. Topical corticosteroid prescribed. Avoid irritant.', vitalSigns: { bp: '115/72', pulse: '74', temp: '98.6', weight: '128 lbs', height: '5\'4"' }, type: 'Dermatology', referral: false, referralReason: '' }
    ];
    records.forEach(r => { r.createdAt = new Date().toISOString(); r.updatedAt = new Date().toISOString(); });
    save('records', records);

    // Prescriptions
    const prescriptions = [
      { id: 'rx1', patientId: 'p1', doctorId: 'd1', recordId: 'r1', date: fmt(yesterday), medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' }, { name: 'Hydrochlorothiazide', dosage: '12.5mg', frequency: 'Once daily', duration: '30 days' }], instructions: 'Take with water in the morning. Monitor BP daily.', status: 'active', refills: 2 },
      { id: 'rx2', patientId: 'p3', doctorId: 'd1', recordId: 'r3', date: fmt(yesterday), medications: [{ name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily with meals', duration: '90 days' }, { name: 'Glipizide', dosage: '5mg', frequency: 'Once daily before breakfast', duration: '90 days' }], instructions: 'Monitor blood glucose levels. Report hypoglycemia immediately.', status: 'active', refills: 3 },
      { id: 'rx3', patientId: 'p5', doctorId: 'd2', recordId: 'r4', date: fmt(yesterday), medications: [{ name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', duration: '180 days' }, { name: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', duration: '180 days' }, { name: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', duration: '90 days' }], instructions: 'Do not stop medications without consulting doctor. Report chest pain immediately.', status: 'active', refills: 5 },
      { id: 'rx4', patientId: 'p6', doctorId: 'd4', recordId: 'r5', date: fmt(yesterday), medications: [{ name: 'Hydrocortisone Cream 1%', dosage: 'Apply thin layer', frequency: 'Twice daily', duration: '14 days' }, { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '14 days' }], instructions: 'Avoid contact with known irritant. Keep area clean and dry.', status: 'active', refills: 0 },
      { id: 'rx5', patientId: 'p2', doctorId: 'd2', recordId: 'r2', date: fmt(yesterday), medications: [{ name: 'Furosemide', dosage: '20mg', frequency: 'Once daily', duration: '60 days' }], instructions: 'Monitor for signs of fluid retention. Low sodium diet recommended.', status: 'expired', refills: 0 }
    ];
    prescriptions.forEach(rx => { rx.createdAt = new Date().toISOString(); rx.updatedAt = new Date().toISOString(); });
    save('prescriptions', prescriptions);

    // Treatments
    const treatments = [
      { id: 't1', patientId: 'p1', doctorId: 'd1', title: 'Hypertension Management Program', description: 'Comprehensive blood pressure management including medication, diet, and exercise plan.', startDate: fmt(yesterday), endDate: '', followUpDate: fmt(nextWeek), status: 'ongoing', progress: 35, notes: 'Patient showing good compliance. BP trending down.', sessions: [{ date: fmt(yesterday), note: 'Initial assessment. BP 145/92. Started medication.' }] },
      { id: 't2', patientId: 'p3', doctorId: 'd1', title: 'Diabetes Management Plan', description: 'Type 2 diabetes control through medication adjustment, dietary changes, and regular monitoring.', startDate: '2025-01-10', endDate: '', followUpDate: fmt(nextWeek), status: 'ongoing', progress: 60, notes: 'HbA1c improving. Patient adhering to diet plan.', sessions: [{ date: '2025-01-10', note: 'Baseline HbA1c 8.5%. Started Metformin.' }, { date: fmt(yesterday), note: 'HbA1c 7.8%. Adjusted dosage.' }] },
      { id: 't3', patientId: 'p5', doctorId: 'd2', title: 'Cardiac Rehabilitation', description: 'Post-diagnosis cardiac rehabilitation program including supervised exercise and lifestyle modification.', startDate: fmt(yesterday), endDate: '', followUpDate: fmt(tomorrow), status: 'ongoing', progress: 15, notes: 'Referred for catheterization. Awaiting results.', sessions: [{ date: fmt(yesterday), note: 'Initial cardiac assessment. Stress test positive.' }] },
      { id: 't4', patientId: 'p6', doctorId: 'd4', title: 'Contact Dermatitis Treatment', description: 'Short-term treatment for allergic contact dermatitis.', startDate: fmt(yesterday), endDate: '', followUpDate: fmt(nextWeek), status: 'ongoing', progress: 20, notes: 'Topical treatment started. Allergen identified.', sessions: [{ date: fmt(yesterday), note: 'Rash evaluation. Prescribed topical corticosteroid.' }] },
      { id: 't5', patientId: 'p2', doctorId: 'd2', title: 'Mitral Valve Monitoring', description: 'Annual monitoring of mild mitral valve regurgitation.', startDate: '2024-06-15', endDate: '2025-06-15', followUpDate: '2026-06-15', status: 'completed', progress: 100, notes: 'Annual echo completed. Condition stable. Continue monitoring.', sessions: [{ date: '2024-06-15', note: 'Initial echo. Mild MR detected.' }, { date: fmt(yesterday), note: 'Follow-up echo. No progression.' }] }
    ];
    treatments.forEach(t => { t.createdAt = new Date().toISOString(); t.updatedAt = new Date().toISOString(); });
    save('treatments', treatments);

    // Mark as seeded
    save('seeded', [{ id: '1', date: new Date().toISOString() }]);
  }

  return { getAll, getById, insert, update, remove, query, count, clear, seedIfEmpty, generateId };
})();

// Backward compatibility alias
window.DB = Storage;
