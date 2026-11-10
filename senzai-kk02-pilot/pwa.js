// Versioned, same-origin offline shell. Updates wait until the pilot chooses to restart.
export async function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  const status = text => dispatchEvent(new CustomEvent('senzai:offline', { detail: text }));
  try {
    const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { scope: '../', updateViaCache: 'none' });
    const offerUpdate = () => { if (registration.waiting) dispatchEvent(new CustomEvent('senzai:update', { detail: registration.waiting })); };
    offerUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(); });
    });
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (controlled) location.reload(); else controlled = true; });
    await navigator.serviceWorker.ready;
    status(navigator.onLine ? 'Ready for offline flight' : 'Offline · ready to fly');
    addEventListener('online', () => status('Ready for offline flight'));
    addEventListener('offline', () => status('Offline · ready to fly'));
  } catch { status('Offline download unavailable · reconnect and reopen to retry'); }
}
