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
      ${s.balanceGrowth && s.balanceGrowth.length > 1 ? `
      <h4 class="font-mono text-xs uppercase tracking-wide text-bone/40 mb-3">Balance growth</h4>
      <div class="panel rounded-sm p-4 mb-6">
        <div class="relative">
          <svg id="modal-curve" viewBox="0 0 400 150" class="w-full h-[150px]"
            preserveAspectRatio="none"></svg>
          <div id="modal-curve-tooltip" class="curve-tooltip hidden"></div>
        </div>
        <div class="flex justify-between font-mono text-[11px] text-bone/35 mt-2">
          <span>${formatCurveDate(s.balanceGrowth[0].time)}</span>
          <span>${formatCurveDate(s.balanceGrowth[s.balanceGrowth.length - 1].time)}</span>
        </div>
      </div>` : ''}
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

  const modalCurveSvg = document.getElementById('modal-curve');
  if (modalCurveSvg && s.balanceGrowth && s.balanceGrowth.length > 1) {
    renderCurveSvg(
      modalCurveSvg,
      document.getElementById('modal-curve-tooltip'),
      s.balanceGrowth.map((p) => p.balance),
      s.balanceGrowth.map((p) => p.time),
      'modalCurveFill'
    );
  }
}

// "2025/07/30 00:00:00" -> "Jul 2025"
function formatCurveDate(timeStr) {
  const [datePart] = (timeStr || '').split(' ');
  const [year, month] = (datePart || '').split('/');
  if (!year || !month) return timeStr || '';
  const d = new Date(Date.UTC(+year, +month - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function closeModal() {
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// The 5 systems highlighted in the homepage hero tabs. These must match
// the "name" field produced by build-systems.mjs (nameFromFile / the
// "Name" you set in combined.json).
const heroSystemNames = ['AUD CAD Europe', 'Risk', 'Safe Haven', 'EUR Pairs'];
let heroActive = 0;

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
  return { line, area, coords };
}

function formatCurrency(n) {
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// Draws a filled line chart of `values` into the given svg element, and
// wires up a hover/touch tooltip (shown in `tooltipEl`) that tracks the
// nearest data point to the pointer. gradientId must be unique per svg on
// the page at once, so hero and modal don't clobber each other's <defs>.
function renderCurveSvg(svg, tooltipEl, values, times, gradientId) {
  const { line, area, coords } = pointsToPath(values);

  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C89B4A" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#C89B4A" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gradientId})" stroke="none"></path>
    <path d="${line}" fill="none" stroke="#C89B4A" stroke-width="2"></path>
    <line class="hover-guide" x1="0" y1="0" x2="0" y2="150" stroke="rgba(233,230,221,0.25)" stroke-width="1" visibility="hidden"></line>
    <circle class="hover-dot" r="3.5" fill="#E0B562" stroke="#0B0E14" stroke-width="1.5" visibility="hidden"></circle>
    <rect class="hover-hit" x="0" y="0" width="400" height="150" fill="transparent"></rect>
  `;

  if (!tooltipEl) return;

  const guide = svg.querySelector('.hover-guide');
  const dot = svg.querySelector('.hover-dot');
  const hitArea = svg.querySelector('.hover-hit');

  function showAt(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const relX = clientX - rect.left;
    if (relX < 0 || relX > rect.width) { hide(); return; }

    // svg viewBox is 400 wide regardless of rendered width (preserveAspectRatio="none")
    const vbX = (relX / rect.width) * 400;
    const step = 400 / (coords.length - 1);
    const index = Math.max(0, Math.min(coords.length - 1, Math.round(vbX / step)));
    const [x, y] = coords[index];

    guide.setAttribute('x1', x); guide.setAttribute('x2', x);
    guide.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    dot.setAttribute('visibility', 'visible');

    tooltipEl.textContent = `${formatCurrency(values[index])} · ${formatTooltipDate(times[index])}`;
    tooltipEl.classList.remove('hidden');

    // position tooltip near the point, keeping it inside the chart bounds
    const leftPct = (x / 400) * 100;
    tooltipEl.style.left = `${leftPct}%`;
    tooltipEl.style.transform = leftPct > 70 ? 'translateX(-100%)' : leftPct < 5 ? 'translateX(0)' : 'translateX(-50%)';
    tooltipEl.style.top = '0px';
  }

  function hide() {
    guide.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    tooltipEl.classList.add('hidden');
  }

  hitArea.addEventListener('mousemove', (e) => showAt(e.clientX, e.clientY));
  hitArea.addEventListener('mouseleave', hide);
  hitArea.addEventListener('touchstart', (e) => { showAt(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  hitArea.addEventListener('touchmove', (e) => { showAt(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  hitArea.addEventListener('touchend', hide);
}

// "2025/08/11 23:00:00" -> "Aug 11, 2025"
function formatTooltipDate(timeStr) {
  const [datePart] = (timeStr || '').split(' ');
  const [year, month, day] = (datePart || '').split('/');
  if (!year || !month || !day) return timeStr || '';
  const d = new Date(Date.UTC(+year, +month - 1, +day));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function renderHeroCurve() {
  const sys = systemsData.find((s) => s.name === heroSystemNames[heroActive]);
  if (!sys) return;

  const values = (sys.balanceGrowth || []).map((p) => p.balance);
  const times = (sys.balanceGrowth || []).map((p) => p.time);
  const svg = document.getElementById('hero-curve');
  if (values.length > 1) {
    renderCurveSvg(svg, document.getElementById('hero-curve-tooltip'), values, times, 'heroCurveFill');
  }

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