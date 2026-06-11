(function registerClimbLabServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return;

  var base = manifestLink.href.replace(/manifest\.webmanifest$/, '');
  navigator.serviceWorker.register(base + 'sw.js', { scope: base });
})();
