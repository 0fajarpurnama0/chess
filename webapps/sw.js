// sw.js

// ==========================================
// PWA SERVICE WORKER
// ==========================================

// 1. Installation Phase
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed successfully.');
    // Future expansion: You can force the worker to activate immediately here using self.skipWaiting()
});

// 2. Activation Phase
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated and ready to intercept requests.');
    // Future expansion: Clean up old caches here if you update your app
});

// 3. Fetch Interceptor (Network Requests)
self.addEventListener('fetch', (e) => {
    // Currently operating in "Pass-through" mode (requires an internet connection).
    // Future expansion: To make the app playable fully offline, you would intercept 
    // requests here and serve HTML/CSS/JS/Images from a local cache!
});