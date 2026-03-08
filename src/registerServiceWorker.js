const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        // eslint-disable-next-line no-console
        .catch((err) => console.error('Service worker registration failed', err));
    });
  }
};

export default registerServiceWorker;
