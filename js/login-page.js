/* ============================================
   CLINIC MANAGEMENT SYSTEM — LOGIN PAGE HANDLER
   Only loaded on login.html
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Seed data on first load
  Storage.seedIfEmpty();

  // If already logged in, go to dashboard
  if (Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }

  // ---- Sign In ----
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const result = Auth.login(email, password);
    if (result.success) {
      window.location.href = 'index.html';
    } else {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
    }
  });

  // ---- Sign Up ----
  document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role     = document.getElementById('signup-role').value;
    const errEl    = document.getElementById('signup-error');
    errEl.classList.add('hidden');

    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    const result = Auth.signup(name, email, password, role);
    if (result.success) {
      window.location.href = 'index.html';
    } else {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
    }
  });
});
