const isLocalHost = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

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

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const shouldDisableServiceWorker = import.meta.env.DEV || isLocalHost();

    if (shouldDisableServiceWorker) {
      void clearDevelopmentServiceWorkers();
      return;
    }

    navigator.serviceWorker
      .register('/service-worker.js')
      // eslint-disable-next-line no-console
      .catch((err) => console.error('Service worker registration failed', err));
  });
};

export default registerServiceWorker;
