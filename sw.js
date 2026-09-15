const CACHE='cwp-v37-local';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./style.css','./app.js','./manifest.json']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const c=x.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return x}).catch(()=>caches.match('./index.html')))));
