self.addEventListener("install", e=>{
  e.waitUntil(caches.open("online-bible-v1").then(c=>c.addAll([
    "/","/kjv/genesis/1/1/"
  ])));
});
self.addEventListener("fetch", e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
