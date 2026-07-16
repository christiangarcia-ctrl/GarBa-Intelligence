(() => {
  const key = 'garbaIntelligence.session.v1';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(key)); } catch {}
  if (!session?.fullName || !session?.email) {
    window.location.replace('../');
    return;
  }
  const firstName = session.fullName.trim().split(/\s+/)[0] || 'Usuario';
  document.querySelectorAll('[data-user-first-name]').forEach((el) => el.textContent = firstName);
  document.querySelectorAll('[data-user-full-name]').forEach((el) => el.textContent = session.fullName);
  document.querySelectorAll('[data-user-email]').forEach((el) => el.textContent = session.email);
})();
