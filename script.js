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
const iconClose = '<line x1="2" y1="1" x2="18" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="1" x2="2" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
function setMenuState(open) {
  navLinks.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  burger.querySelector('svg').innerHTML = open ? iconClose : iconMenu;
}
burger.addEventListener('click', () => setMenuState(!navLinks.classList.contains('open')));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenuState(false)));

const form = document.getElementById('contact-form');
if (form) {
  // Mensagens de erro por campo
  const fieldErrors = {
    name:    { el: document.getElementById('name-error'),    msg: 'Por favor indica o teu nome.' },
    email:   { el: document.getElementById('email-error'),   msg: 'Por favor indica um endereço de email válido.' },
    message: { el: document.getElementById('message-error'), msg: 'Por favor escreve uma mensagem.' },
  };
  function setFieldError(field, hasError) {
    const entry = fieldErrors[field.id];
    if (!entry || !entry.el) return;
    if (hasError) {
      field.setAttribute('aria-invalid', 'true');
      entry.el.textContent = entry.msg;
      entry.el.removeAttribute('hidden');
    } else {
      field.removeAttribute('aria-invalid');
      entry.el.textContent = '';
      entry.el.setAttribute('hidden', '');
    }
  }

  // Validação em tempo real
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('input', () => {
      if (field.value.trim()) setFieldError(field, false);
    });
    field.addEventListener('blur', () => {
      if (!field.value.trim()) setFieldError(field, true);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validação
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) { setFieldError(field, true); valid = false; }
      else { setFieldError(field, false); }
    });
    if (!valid) {
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    // Envio via fetch — sem redirect para o Formspree
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'A enviar…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const msg = document.createElement('p');
        msg.className = 'form-success';
        msg.setAttribute('role', 'status');
        msg.textContent = 'Mensagem enviada. Responderei em breve.';
        const contactInner = form.closest('.contact-inner');
        if (contactInner) {
          contactInner.replaceWith(msg);
        } else {
          const wrapper = form.closest('.reveal') || form.parentElement;
          wrapper.replaceWith(msg);
        }
      } else {
        btn.disabled = false;
        btn.textContent = originalText;
        const errMsg = form.querySelector('.form-error') || document.createElement('p');
        errMsg.className = 'form-error';
        errMsg.setAttribute('role', 'alert');
        errMsg.textContent = 'Ocorreu um erro. Tenta novamente ou envia email directamente.';
        if (!form.querySelector('.form-error')) form.appendChild(errMsg);
      }
    } catch {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// ============================================================
// DELIGHT
// ============================================================

// Active nav indicator — set .active on anchors as sections scroll into view
(function () {
  const sections = document.querySelectorAll('main section[id]');
  const anchorMap = {};
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
    anchorMap[a.getAttribute('href').slice(1)] = a;
  });
  if (!sections.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = anchorMap[e.target.id];
      if (link) link.classList.toggle('active', e.isIntersecting);
    });
  }, { rootMargin: '-20% 0px -65% 0px' });
  sections.forEach(s => obs.observe(s));
}());

// Count-up animation for .count-target elements
(function () {
  const targets = document.querySelectorAll('.count-target');
  if (!targets.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n >= 1000
    ? Math.floor(n / 1000) + ' ' + String(n % 1000).padStart(3, '0')
    : String(n);
  const ease = t => 1 - Math.pow(1 - t, 5);
  function run(el) {
    const target = parseInt(el.dataset.target, 10);
    if (reduced) { el.textContent = fmt(target); return; }
    const dur = 1400, t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = fmt(Math.round(ease(p) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  targets.forEach(el => obs.observe(el));
}());

// Reading progress bar (case study pages)
(function () {
  const bar = document.querySelector('.case-progress');
  if (!bar) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bar.style.display = 'none'; return;
  }
  let ticking = false;
  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}());

// Problems list stagger (case study pages)
(function () {
  const lists = document.querySelectorAll('.case-problems-list');
  if (!lists.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { lists.forEach(l => l.classList.add('animated')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        // Wait for parent .reveal transition (~0.65s) before staggering
        setTimeout(() => e.target.classList.add('animated'), 500);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  lists.forEach(l => obs.observe(l));
}());

// Lightbox acessível para imagens de casos de estudo
(function () {
  const imgs = document.querySelectorAll('.case-figure img');
  if (!imgs.length) return;

  // Criar modal no DOM
  const modal = document.createElement('div');
  modal.id = 'img-modal';
  modal.className = 'img-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'img-modal-caption');
  modal.setAttribute('hidden', '');
  modal.innerHTML = `
    <div class="img-modal-backdrop"></div>
    <div class="img-modal-inner">
      <button class="img-modal-close" aria-label="Fechar imagem ampliada">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <img class="img-modal-img" src="" alt="">
      <p class="img-modal-caption" id="img-modal-caption"></p>
    </div>`;
  document.body.appendChild(modal);

  const modalImg     = modal.querySelector('.img-modal-img');
  const modalCaption = modal.querySelector('.img-modal-caption');
  const closeBtn     = modal.querySelector('.img-modal-close');
  const backdrop     = modal.querySelector('.img-modal-backdrop');
  let lastTrigger    = null;

  function open(trigger) {
    const img     = trigger.querySelector('img');
    const caption = trigger.closest('.case-figure')?.querySelector('figcaption');
    modalImg.src      = img.src;
    modalImg.alt      = img.alt || img.closest('[aria-label]')?.getAttribute('aria-label') || '';
    modalCaption.textContent = caption ? caption.textContent : '';
    lastTrigger = trigger;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  }

  // Converter cada img em botão trigger
  imgs.forEach(img => {
    const figure  = img.closest('.case-figure');
    const caption = figure?.querySelector('figcaption');
    const label   = caption
      ? 'Ampliar: ' + caption.textContent.trim()
      : 'Ampliar imagem';

    const btn = document.createElement('button');
    btn.className = 'case-figure-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', label);

    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);

    btn.addEventListener('click', () => open(btn));
  });

  // Fechar
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) close();
  });

  // Focus trap
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });
}());

// Console easter egg
console.log(
  '%cJosé Maria Barros%c\nPrincipal UX & Product Designer · Lisboa, Portugal\n%c✦ Feito com atenção ao detalhe. josemariabarros@gmail.com',
  'color:#2d6a3f;font-size:1.25rem;font-weight:800;letter-spacing:-0.02em;',
  'color:#888;font-size:.875rem;font-weight:300;',
  'color:#aaa;font-size:.6875rem;'
);
