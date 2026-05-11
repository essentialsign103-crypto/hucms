/* ============================================
   CLINIC OS — AUTH MODULE
   Login, logout, session, role management
   ============================================ */

const Auth = (() => {
  const SESSION_KEY = 'clinicos_session';

  function login(email, password) {
    const users = Storage.getAll('users');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, message: 'Invalid email or password.' };
    if (user.status === 'inactive') return { success: false, message: 'Account is inactive. Contact administrator.' };

    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loginTime: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  function getSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function getRole() {
    const s = getSession();
    return s ? s.role : null;
  }

  function isAdmin() { return getRole() === 'admin'; }
  function isDoctor() { return getRole() === 'doctor'; }
  function isReceptionist() { return getRole() === 'receptionist'; }

  function guardPage() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function can(action) {
    const role = getRole();
    const permissions = {
      admin: ['all'],
      doctor: [
        'view_patients', 'edit_patients',
        'view_appointments', 'edit_appointments',
        'view_records', 'edit_records',
        'view_prescriptions', 'edit_prescriptions',
        'view_treatments', 'edit_treatments',
        'view_doctors'
      ],
      receptionist: [
        'view_patients', 'edit_patients',
        'view_appointments', 'edit_appointments',
        'view_records',
        'view_doctors'
        // no edit_records, no prescriptions, no treatments, no manage_staff
      ]
    };
    const perms = permissions[role] || [];
    return perms.includes('all') || perms.includes(action);
  }

  function signup(name, email, password, role) {
    const existing = Storage.query('users', u => u.email === email);
    if (existing.length) return { success: false, message: 'An account with this email already exists.' };
    const newUser = Storage.insert('users', {
      name, email, password,
      role: role || 'receptionist',
      status: 'active',
      department: '',
      phone: '',
      joinDate: new Date().toISOString().split('T')[0]
    });
    // Auto login after signup
    const session = {
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      loginTime: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }

  return { login, logout, signup, getSession, isLoggedIn, getRole, isAdmin, isDoctor, isReceptionist, guardPage, can };
})();
