const CACHE='cwp-v40-safe-sync-auth-fix2';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./style.css','./app.js','./firebase.js','./manifest.json']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  const isAppCode=u.pathname.endsWith('/app.js')||u.pathname.endsWith('/firebase.js')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/sw.js')||u.pathname.endsWith('/style.css');
  if(isAppCode){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(x=>{const c=x.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return x}).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const c=x.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return x}).catch(()=>caches.match('./index.html'))));
  }
});
