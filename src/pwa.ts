export const registerPwa = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // The game remains fully playable when a browser blocks service workers.
    });
  }, { once: true });
};
