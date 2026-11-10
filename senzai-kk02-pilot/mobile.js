// Touch flight, relative aiming, quiet HUD and installable-app controls.
export const touchLayout = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || new URLSearchParams(location.search).get('touch') === '1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Pointer IDs keep flight and aiming independent during two-thumb play.
export function bindStick(element, onChange, onActivity = () => {}) {
  let pointer = null;
  const thumb = element.querySelector('i');
  function update(e) {
    const rect = element.getBoundingClientRect(), radius = rect.width * .34;
    let x = (e.clientX - rect.left - rect.width / 2) / radius, y = (e.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    if (length < .1) x = y = 0;
    thumb.style.transform = `translate(${x * radius}px,${y * radius}px)`;
    onChange(x, -y);
  }
  function reset() {
    const old = pointer; pointer = null;
    if (old !== null && element.hasPointerCapture?.(old)) element.releasePointerCapture(old);
    thumb.style.transform = ''; element.classList.remove('active'); onChange(0, 0);
  }
  element.addEventListener('pointerdown', e => {
    if (pointer !== null || e.button > 0) return;
    e.preventDefault(); pointer = e.pointerId; element.setPointerCapture(pointer); element.classList.add('active'); onActivity(); update(e);
  });
  element.addEventListener('pointermove', e => { if (e.pointerId === pointer) { e.preventDefault(); update(e); } });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(name, e => { if (e.pointerId === pointer) reset(); });
  return reset;
}

export function bindHold(element, onChange, onActivity = () => {}) {
  const pointers = new Set();
  const update = () => { element.classList.toggle('active', pointers.size > 0); onChange(pointers.size > 0); };
  element.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault(); pointers.add(e.pointerId); element.setPointerCapture(e.pointerId); onActivity(); update();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(name, e => { if (pointers.delete(e.pointerId)) update(); });
  return () => { const ids = [...pointers]; pointers.clear(); for (const id of ids) if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id); update(); };
}

export function bindTouchAim(canvas, pilot, onActivity = () => {}) {
  let pointer = null, x = 0, y = 0, travel = 0;
  const reset = () => { const old = pointer; pointer = null; if (old !== null && canvas.hasPointerCapture?.(old)) canvas.releasePointerCapture(old); };
  canvas.addEventListener('pointerdown', e => {
    if (!pilot.state.touchMode || pilot.state.paused || pointer !== null || e.button > 0) return;
    e.preventDefault(); pointer = e.pointerId; x = e.clientX; y = e.clientY; travel = 0; canvas.setPointerCapture(pointer); onActivity();
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    e.preventDefault(); const dx = e.clientX - x, dy = e.clientY - y;
    travel += Math.hypot(dx, dy); x = e.clientX; y = e.clientY; pilot.touchLook(dx, dy);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, e => { if (e.pointerId === pointer) { if (name === 'pointerup' && travel < 10) onActivity(); reset(); } });
  return reset;
}

export function createMobile({ stage, canvas, pilot, signals }) {
  const $ = id => document.getElementById(id), enabled = touchLayout();
  pilot.state.touchMode = enabled; stage.classList.toggle('is-touch', enabled); $('mobile-ui').hidden = !enabled;
  if (!enabled) return { ready() {}, update() {} };
  pilot.state.paused = true;
  let quietAt = performance.now() + 3000, started = false, installPrompt, waitingWorker, up = false, down = false;
  const wake = () => { quietAt = performance.now() + 2800; stage.classList.remove('hud-quiet'); };
  const resets = [bindStick($('flight-stick'), (x, z) => pilot.setTouchFlight({ x, z }), wake), bindTouchAim(canvas, pilot, wake)];
  const lift = () => pilot.setTouchFlight({ y: Number(up) - Number(down) });
  resets.push(bindHold($('touch-up'), on => { up = on; lift(); }, wake), bindHold($('touch-down'), on => { down = on; lift(); }, wake), bindHold($('touch-brake'), brake => pilot.setTouchFlight({ brake }), wake));
  const clear = () => { resets.forEach(reset => reset()); pilot.clearInput(); };
  const button = (id, fn) => $(id).addEventListener('click', () => { wake(); fn(); $(id).blur(); });
  button('touch-sweep', () => pilot.ping()); button('touch-lock', () => pilot.toggleLock()); button('touch-next', () => pilot.cycle(1));
  function panel(open) {
    clear(); $('mobile-panel').hidden = !open; stage.classList.toggle('menu-open', open);
    $('mobile-menu').setAttribute('aria-expanded', String(open)); pilot.state.paused = open || !started; wake();
  }
  function fullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen?.();
    if (stage.requestFullscreen) return stage.requestFullscreen({ navigationUI: 'hide' }).catch(() => { $('install-help').hidden = false; });
    $('install-help').hidden = false;
  }
  button('mobile-enter', () => { clear(); started = true; $('mobile-welcome').hidden = true; stage.classList.add('touch-started'); pilot.state.paused = false; fullscreen(); });
  button('mobile-menu', () => panel($('mobile-panel').hidden)); button('mobile-close', () => panel(false)); button('mobile-resume', () => panel(false));
  button('mobile-fullscreen', fullscreen); button('mobile-zoom-in', () => pilot.zoom(.85)); button('mobile-zoom-out', () => pilot.zoom(1.18)); button('mobile-recentre', () => pilot.recentre());
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
  button('mobile-install', async () => {
    if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; }
    else $('install-help').hidden = false;
  });
  addEventListener('appinstalled', () => { $('mobile-install').textContent = 'Installed'; $('install-help').hidden = true; });
  if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone) $('mobile-install').hidden = true;
  addEventListener('senzai:offline', e => { $('offline-status').textContent = e.detail; });
  addEventListener('senzai:update', e => { waitingWorker = e.detail; $('mobile-update').hidden = false; });
  button('mobile-update', () => { clear(); waitingWorker?.postMessage({ type: 'ACTIVATE_UPDATE' }); });
  addEventListener('blur', clear); addEventListener('orientationchange', clear);
  document.addEventListener('visibilitychange', () => { clear(); if (document.hidden && started) panel(true); });
  return {
    ready() { $('mobile-enter').disabled = false; $('mobile-enter').textContent = 'Enter the field'; },
    update() {
      stage.classList.toggle('hud-quiet', started && $('mobile-panel').hidden && performance.now() > quietAt);
      $('mobile-count').textContent = `${signals.list.filter(s => s.resolved).length} / ${signals.list.length}`;
      $('touch-lock').textContent = pilot.state.lock >= 0 ? 'Release' : 'Lock';
      $('touch-lock').setAttribute('aria-pressed', String(pilot.state.lock >= 0));
      $('touch-sweep').disabled = pilot.state.clock - pilot.state.pingAt < 2.4;
    },
  };
}
