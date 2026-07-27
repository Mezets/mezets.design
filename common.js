const BAN_API = 'https://mez.up.railway.app';

async function getBrowserFingerprintForBan() {
  try {
    const cached = localStorage.getItem('mezets_fp');
    if (cached) return cached;
  } catch(e) {}

  let canvasHash = '';
  try {
    const c = document.createElement('canvas');
    const cx = c.getContext('2d');
    cx.textBaseline = 'top';
    cx.font = "14px 'Arial'";
    cx.fillText('mezets-fp-🔥', 2, 2);
    canvasHash = c.toDataURL();
  } catch(e) {}

  const raw = [
    navigator.userAgent, navigator.language, navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '', screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    (Intl.DateTimeFormat().resolvedOptions().timeZone) || '', canvasHash
  ].join('###');

  let hash = '';
  try {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const enc = new TextEncoder().encode(raw);
      const digest = await crypto.subtle.digest('SHA-256', enc);
      hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
  } catch(e) {}

  if (!hash) {
    let h = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    hash = 'fnv' + (h >>> 0).toString(16);
  }

  try { localStorage.setItem('mezets_fp', hash); } catch(e) {}
  return hash;
}

let banEnforced = false;
function enforceBanOverlay(reason) {
  const overlay = document.getElementById('banOverlay');
  const reasonLine = document.getElementById('banReasonLine');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (reason && reasonLine) {
    reasonLine.textContent = 'Причина: ' + reason;
    reasonLine.style.display = 'block';
  }
  if (!banEnforced) {
    banEnforced = true;

    Array.from(document.body.children).forEach(el => {
      if (el.id !== 'banOverlay' && el.id !== 'banSound') el.remove();
    });

    const snd = document.getElementById('banSound');
    if (snd) {
      snd.currentTime = 0;
      const playPromise = snd.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          const retry = () => { snd.currentTime = 0; snd.play().catch(()=>{}); };
          document.addEventListener('click', retry, { once: true });
          document.addEventListener('keydown', retry, { once: true });
          document.addEventListener('touchstart', retry, { once: true });
        });
      }
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key.toUpperCase())) e.preventDefault();
      if (e.ctrlKey && e.key.toUpperCase() === 'U') e.preventDefault();
    }, true);
    document.addEventListener('contextmenu', e => e.preventDefault(), true);

    const mo = new MutationObserver(() => {
      const ov = document.getElementById('banOverlay');
      if (!ov || ov.style.display !== 'flex') {
        location.reload();
      }
    });
    mo.observe(overlay, { attributes: true, attributeFilter: ['style','class'] });
    mo.observe(document.body, { childList: true });

    setInterval(() => {
      const ov = document.getElementById('banOverlay');
      if (ov) { ov.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    }, 800);

    let ddtWarned = false;
    setInterval(() => {
      const wDiff = window.outerWidth  - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 160 || hDiff > 160) {
        if (!ddtWarned) { ddtWarned = true; }
        location.reload();
      } else {
        ddtWarned = false;
      }
    }, 1000);
  }
}

function hideLoadingGate() {
  const gate = document.getElementById('loadingGate');
  if (gate) gate.style.display = 'none';
}

async function checkSiteBanOnLoad() {
  const session = localStorage.getItem('mezets_session') || '';
  const fp = await getBrowserFingerprintForBan();
  try {
    const params = new URLSearchParams();
    if (session) params.set('session', session);
    if (fp) params.set('fp', fp);
    const res  = await fetch(`${BAN_API}/check-ban?${params.toString()}`, { mode: 'cors' });
    const data = await res.json();
    if (data.banned) enforceBanOverlay(data.reason);
    else hideLoadingGate();
  } catch(e) {
    hideLoadingGate(); // бэкенд недоступен — не блокируем сайт всем подряд
  }
  fetch(`${BAN_API}/track-visit?fp=${encodeURIComponent(fp)}&session=${encodeURIComponent(session)}`, { mode: 'cors' }).catch(()=>{});
}

async function checkMaintenance() {
  const toast = document.getElementById('maintToast');
  if (!toast) return;
  try {
    const res  = await fetch(`${BAN_API}/maintenance-status`, { mode: 'cors' });
    const data = await res.json();
    if (data.on) {
      const msgEl   = document.getElementById('maintToastMsg');
      const titleEl = document.getElementById('maintToastTitle');
      if (msgEl)   msgEl.innerHTML = data.msg || '';
      if (titleEl) titleEl.textContent = data.title || 'Тех. неполадки';
      toast.style.transform = 'translateY(0)';
    } else {
      toast.style.transform = 'translateY(140%)';
    }
  } catch(e) {}
}

setTimeout(hideLoadingGate, 6000);
checkSiteBanOnLoad();
setInterval(checkSiteBanOnLoad, 60000);
checkMaintenance();
setInterval(checkMaintenance, 60000);

// --- PAYMENT_METHODS_START ---
var PAYMENT_METHODS = [
  {"key": "sbp", "label": "СБП"},
  {"key": "card", "label": "Карта"},
  {"key": "steam_gift", "label": "Подарок Steam"},
  {"key": "steam_topup", "label": "Пополнение Steam"}
];
// --- PAYMENT_METHODS_END ---
