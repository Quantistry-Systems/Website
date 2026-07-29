import './style.css';

let systemsData = [];

async function loadSystems() {
  try {
    const res = await fetch('systems.json');
    systemsData = await res.json();
  } catch (e) {
    console.error('failed to load systems.json', e);
    systemsData = [];
  }
  renderGrid();
  renderHero();
}

const grid = document.getElementById('systems-grid');
const visibleCount = 6;

function renderGrid() {
  grid.innerHTML = systemsData.map((s, i) => `
    <div class="fade-up system-card panel rounded-md p-6 flex flex-col ${i >= visibleCount ? 'hidden-system' : ''}"
         role="listitem" tabindex="0" data-index="${i}">
      <div class="flex items-start justify-between mb-3">
        <h3 class="font-display font-semibold text-xl text-bone pr-2">${s.name}</h3>
        <span class="font-mono text-[11px] text-okgreen shrink-0 pt-1">${s.stats.monthly}/mo</span>
      </div>
      <p class="text-bone/60 text-sm leading-relaxed mb-4">${s.description}</p>
      ${s.pairs.length ? `<div class="flex flex-wrap gap-1.5 mb-5">${s.pairs.map(p => `<span class="pair-tag px-2 py-1 rounded-sm">${p}</span>`).join('')}</div>` : '<div class="mb-5"></div>'}
      <div class="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-white/10 font-mono text-xs">
        <div><p class="text-bone/35 mb-1">Profit factor</p><p class="text-bone/80">${s.stats.profitFactor}</p></div>
        <div><p class="text-bone/35 mb-1">Win rate</p><p class="text-bone/80">${s.stats.winRate}</p></div>
        <div><p class="text-bone/35 mb-1">Max DD</p><p class="text-bone/80">${s.stats.maxDrawdown}</p></div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('#systems-grid .system-card').forEach((el) => {
    el.addEventListener('click', () => openModal(parseInt(el.dataset.index, 10)));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        openModal(parseInt(el.dataset.index, 10)); 
      }
    });
  });

  document.querySelectorAll('#systems-grid .fade-up').forEach((el) => observer.observe(el));
}

const toggleBtn = document.getElementById('toggle-systems');
let expanded = false;

toggleBtn.addEventListener('click', () => {
  expanded = !expanded;
  document.querySelectorAll('.hidden-system').forEach((el) => {
    el.style.display = expanded ? 'flex' : 'none';
    el.classList.add('is-visible');
  });
  toggleBtn.textContent = expanded ? 'Show fewer systems' : 'Show all systems';
  toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
});

const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
let lastFocused = null;

function openModal(index) {
  const s = systemsData[index];
  if (!s) return;
  
  // save last active element to restore focus on dismiss
  lastFocused = document.activeElement;

  modalContent.innerHTML = `
    <div class="flex items-start justify-between px-6 py-5 border-b border-white/10">
      <h3 id="modal-title" class="font-display font-semibold text-2xl text-bone">${s.name}</h3>
      <button id="modal-close" class="text-bone/50 hover:text-bone font-mono text-sm" aria-label="Close">✕</button>
    </div>
    <div class="px-6 py-6">
      <p class="text-bone/70 leading-relaxed mb-5">${s.description}</p>
      ${s.pairs.length ? `<div class="flex flex-wrap gap-1.5 mb-6">${s.pairs.map(p => `<span class="pair-tag px-2 py-1 rounded-sm">${p}</span>`).join('')}</div>` : ''}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-xs">
        <div class="panel rounded-sm p-3"><p class="text-bone/35 mb-1">Monthly</p><p class="text-bone text-sm">${s.stats.monthly}</p></div>
        <div class="panel rounded-sm p-3"><p class="text-bone/35 mb-1">Profit factor</p><p class="text-bone text-sm">${s.stats.profitFactor}</p></div>
        <div class="panel rounded-sm p-3"><p class="text-bone/35 mb-1">Win rate</p><p class="text-bone text-sm">${s.stats.winRate}</p></div>
        <div class="panel rounded-sm p-3"><p class="text-bone/35 mb-1">Max drawdown</p><p class="text-bone text-sm">${s.stats.maxDrawdown}</p></div>
      </div>
      <h4 class="font-mono text-xs uppercase tracking-wide text-bone/40 mb-3">Full statistics</h4>
      <dl class="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs text-bone/70">
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Total net profit</dt><dd>${s.details.totalNetProfit}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Sharpe ratio</dt><dd>${s.details.sharpeRatio}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Recovery factor</dt><dd>${s.details.recoveryFactor}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Expected payoff</dt><dd>${s.details.expectedPayoff}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Total trades</dt><dd>${s.details.totalTrades}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Short trades won</dt><dd>${s.details.shortTradesWon}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Long trades won</dt><dd>${s.details.longTradesWon}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Gross profit</dt><dd>${s.details.grossProfit}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Gross loss</dt><dd>${s.details.grossLoss}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Largest profit trade</dt><dd>${s.details.largestProfitTrade}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Largest loss trade</dt><dd>${s.details.largestLossTrade}</dd></div>
        <div class="flex justify-between border-b border-white/5 pb-2"><dt class="text-bone/40">Average profit trade</dt><dd>${s.details.averageProfitTrade}</dd></div>
      </dl>
      <p class="text-bone/30 text-[11px] mt-6">Historical / backtested results. Past performance does not guarantee future results.</p>
    </div>
  `;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-close').focus();
}

function closeModal() {
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

const heroSystemNames = ['MAJORS', 'CARRY TRADE', 'COMMODITY', 'SAFE-HAVEN', 'GLOBAL'];
let heroActive = 0;

// simple prng seeded by system name to generate deterministic preview curves
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCurvePoints(sys) {
  const monthly = parseFloat(sys.stats.monthly) || 3;
  const dd = parseFloat(sys.stats.maxDrawdown) || 20;
  const rand = mulberry32(hashSeed(sys.name));
  let val = 100;
  const points = [val];
  const n = 30;

  for (let i = 1; i <= n; i++) {
    const drift = (monthly / 100) / 3.2;
    const vol = (dd / 100) * 0.55;
    const shock = (rand() - 0.52) * vol;
    val = Math.max(val * (1 + drift + shock), val * 0.4);
    points.push(val);
  }
  return points;
}

function pointsToPath(points) {
  const w = 400, h = 150, pad = 6;
  const min = Math.min(...points), max = Math.max(...points);
  const range = (max - min) || 1;
  const step = w / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y];
  });

  const line = coords.map((c, i) => (i === 0 ? `M${c[0]},${c[1]}` : `L${c[0]},${c[1]}`)).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area };
}

function renderHeroCurve() {
  const sys = systemsData.find((s) => s.name === heroSystemNames[heroActive]);
  if (!sys) return;

  const { line, area } = pointsToPath(buildCurvePoints(sys));
  const svg = document.getElementById('hero-curve');

  svg.innerHTML = `
    <defs>
      <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C89B4A" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#C89B4A" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#curveFill)" stroke="none"></path>
    <path d="${line}" fill="none" stroke="#C89B4A" stroke-width="2"></path>
  `;

  document.getElementById('hero-stats').innerHTML = `
    <div class="px-5 py-3.5"><p class="text-[11px] text-bone/45 uppercase tracking-wide mb-1">Monthly</p><p class="font-mono text-sm text-bone">${sys.stats.monthly}</p></div>
    <div class="px-5 py-3.5"><p class="text-[11px] text-bone/45 uppercase tracking-wide mb-1">Profit factor</p><p class="font-mono text-sm text-bone">${sys.stats.profitFactor}</p></div>
    <div class="px-5 py-3.5"><p class="text-[11px] text-bone/45 uppercase tracking-wide mb-1">Win rate</p><p class="font-mono text-sm text-bone">${sys.stats.winRate}</p></div>
    <div class="px-5 py-3.5"><p class="text-[11px] text-bone/45 uppercase tracking-wide mb-1">Max DD</p><p class="font-mono text-sm text-bone">${sys.stats.maxDrawdown}</p></div>
  `;
}

function renderHero() {
  const tabs = document.getElementById('hero-tabs');
  tabs.innerHTML = heroSystemNames.map((name, i) => `
    <button class="tab-btn text-xs uppercase px-3 py-2 ${i === 0 ? 'active' : ''}" role="tab" aria-selected="${i === 0}" data-i="${i}">${name}</button>
  `).join('');

  tabs.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      heroActive = parseInt(btn.dataset.i, 10);
      tabs.querySelectorAll('.tab-btn').forEach((b) => { 
        b.classList.remove('active'); 
        b.setAttribute('aria-selected', 'false'); 
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      renderHeroCurve();
    });
  });
  renderHeroCurve();
}

// scroll reveals
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

// contact form modal logic
const contactOverlay = document.getElementById('contact-modal-overlay');
const contactCloseBtn = document.getElementById('contact-modal-close');
const contactForm = document.getElementById('contact-form');
const submitBtn = contactForm?.querySelector('button[type="submit"]');
const formResult = document.getElementById('form-result');

function openContactModal() {
  if (!contactOverlay) return;
  contactOverlay.classList.remove('hidden');
  contactOverlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeContactModal() {
  if (!contactOverlay) return;
  contactOverlay.classList.add('hidden');
  contactOverlay.classList.remove('flex');
  document.body.style.overflow = '';
}

if (contactCloseBtn) {
  contactCloseBtn.addEventListener('click', closeContactModal);
}

if (contactOverlay) {
  contactOverlay.addEventListener('click', (e) => { 
    if (e.target === contactOverlay) closeContactModal(); 
  });
}

document.addEventListener('keydown', (e) => { 
  if (e.key === 'Escape' && contactOverlay && !contactOverlay.classList.contains('hidden')) {
    closeContactModal();
  }
});

document.querySelectorAll('a[href="#contact"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    openContactModal();
  });
});

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    formData.append("access_key", "b887cce8-fa73-4ac7-84b2-bbcf66d9ccc6");

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    formResult.className = 'font-mono text-xs mt-1 hidden';

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        formResult.textContent = "Success! Your message has been sent.";
        formResult.classList.add('text-okgreen');
        formResult.classList.remove('hidden');
        contactForm.reset();

        // auto-dismiss after success response
        setTimeout(() => {
          closeContactModal();
          formResult.classList.add('hidden');
        }, 3000);
      } else {
        formResult.textContent = "Error: " + data.message;
        formResult.classList.add('text-badred');
        formResult.classList.remove('hidden');
      }
    } catch (error) {
      formResult.textContent = "Something went wrong. Please try again.";
      formResult.classList.add('text-badred');
      formResult.classList.remove('hidden');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

loadSystems();