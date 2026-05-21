const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const burger = document.querySelector('.nav-burger');
const navLinks = document.getElementById('nav-links');
const iconMenu = '<rect width="20" height="2" fill="currentColor"/><rect y="6" width="20" height="2" fill="currentColor"/><rect y="12" width="20" height="2" fill="currentColor"/>';
const iconClose = '<line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="2" x2="2" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
function setMenuState(open) {
  navLinks.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  burger.querySelector('svg').innerHTML = open ? iconClose : iconMenu;
}
burger.addEventListener('click', () => setMenuState(!navLinks.classList.contains('open')));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenuState(false)));

const form = document.getElementById('contact-form');
form.addEventListener('submit', (e) => {
  let valid = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (!field.value.trim()) { field.setAttribute('aria-invalid', 'true'); valid = false; }
    else { field.removeAttribute('aria-invalid'); }
  });
  if (!valid) {
    e.preventDefault();
    const first = form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
  }
});
form.querySelectorAll('[required]').forEach(field => {
  field.addEventListener('input', () => {
    if (field.value.trim()) field.removeAttribute('aria-invalid');
  });
});
