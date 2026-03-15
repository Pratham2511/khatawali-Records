const isLocalHost = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

const APP_BUILD_VERSION = '2026-03-15-r2';
const BUILD_VERSION_KEY = 'khatawali.app.build.version';
const SW_RELOAD_FLAG = 'khatawali.sw.reloaded';

const clearDevelopmentServiceWorkers = async () => {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to clear service worker cache in development', error);
  }
};

const syncBuildVersion = async () => {
  const previousVersion = window.localStorage.getItem(BUILD_VERSION_KEY);

  if (previousVersion === APP_BUILD_VERSION) {
    return false;
  }

  window.localStorage.setItem(BUILD_VERSION_KEY, APP_BUILD_VERSION);

  await clearDevelopmentServiceWorkers();
  return Boolean(previousVersion);
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    const shouldDisableServiceWorker = import.meta.env.DEV || isLocalHost();

    if (shouldDisableServiceWorker) {
      void clearDevelopmentServiceWorkers();
      return;
    }

    const shouldReloadAfterCleanup = await syncBuildVersion();
    if (shouldReloadAfterCleanup) {
      window.location.reload();
      return;
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (window.sessionStorage.getItem(SW_RELOAD_FLAG)) return;
      window.sessionStorage.setItem(SW_RELOAD_FLAG, '1');
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        void registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      // eslint-disable-next-line no-console
      .catch((err) => console.error('Service worker registration failed', err));
  });
};

export default registerServiceWorker;
