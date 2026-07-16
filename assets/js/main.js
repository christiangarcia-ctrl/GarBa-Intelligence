const SESSION_KEY = 'garbaIntelligence.session.v1';
const DATA_PREFIX = 'garbaIntelligence.';

const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
};

const firstNameFrom = (fullName = '') => fullName.trim().split(/\s+/)[0] || 'Usuario';

const updatePersonalization = (session) => {
  const firstName = firstNameFrom(session.fullName);
  document.querySelectorAll('[data-user-first-name]').forEach((el) => { el.textContent = firstName; });
  document.querySelectorAll('[data-user-full-name]').forEach((el) => { el.textContent = session.fullName; });
  document.querySelectorAll('[data-user-email]').forEach((el) => { el.textContent = session.email; });
  document.querySelectorAll('[data-user-initial]').forEach((el) => { el.textContent = firstName.charAt(0).toUpperCase(); });
  document.title = `${firstName} | GarBa Intelligence`;
};

const activateSession = (session) => {
  updatePersonalization(session);
  document.body.classList.remove('session-pending');
  document.body.classList.add('session-active');
  document.querySelector('#portalShell')?.setAttribute('aria-hidden', 'false');
};

const clearGarbaStorage = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(DATA_PREFIX)) localStorage.removeItem(key);
  });
};

const existingSession = getSession();
if (existingSession?.fullName && existingSession?.email) activateSession(existingSession);

const accessForm = document.querySelector('#accessForm');
accessForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!accessForm.reportValidity()) return;

  const fullName = document.querySelector('#fullName').value.trim();
  const email = document.querySelector('#email').value.trim().toLowerCase();
  const firstName = firstNameFrom(fullName);
  const submitButton = accessForm.querySelector('button[type="submit"]');
  const preparing = document.querySelector('#accessPreparing');

  const session = { fullName, email, createdAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  submitButton.disabled = true;
  accessForm.classList.add('is-leaving');
  preparing?.setAttribute('aria-hidden', 'false');
  preparing?.classList.add('is-visible');
  const preparingText = preparing?.querySelector('p');
  if (preparingText) preparingText.textContent = `Preparando tu espacio patrimonial, ${firstName}…`;

  window.setTimeout(() => activateSession(session), 1050);
});

const userMenuTrigger = document.querySelector('#userMenuTrigger');
const userMenuPanel = document.querySelector('#userMenuPanel');
userMenuTrigger?.addEventListener('click', () => {
  const open = !userMenuPanel.hasAttribute('hidden');
  userMenuPanel.toggleAttribute('hidden', open);
  userMenuTrigger.setAttribute('aria-expanded', String(!open));
});

document.addEventListener('click', (event) => {
  if (userMenuPanel && !event.target.closest('.user-menu')) {
    userMenuPanel.hidden = true;
    userMenuTrigger?.setAttribute('aria-expanded', 'false');
  }
});

document.querySelectorAll('[data-session-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.sessionAction;
    if (action === 'logout') clearGarbaStorage();
    else localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
