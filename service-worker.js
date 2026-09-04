const CACHE_NAME='prato-pwa-v20';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;if(r.mode==='navigate'){e.respondWith(fetch(r).then(resp=>{const cp=resp.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',cp));return resp;}).catch(()=>caches.match('./index.html')));return;}e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(resp=>{if(resp&&resp.ok){const cp=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(r,cp));}return resp;})));});
