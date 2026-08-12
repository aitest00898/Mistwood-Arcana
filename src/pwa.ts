export const registerPwa = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  }, { once: true });
  window.addEventListener('load', () => {
    // Keep the script URL versioned so an installed iOS PWA actively checks
    // for a new worker after a deployment instead of holding the previous
    // shell indefinitely.
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=13`, { scope: import.meta.env.BASE_URL }).then((registration) => {
      void registration.update().catch(() => {
        // A failed background update must never block the game.
      });
    }).catch(() => {
      // The game remains fully playable when a browser blocks service workers.
    });
  }, { once: true });
};
