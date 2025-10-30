self.addEventListener("install", e=>{
  e.waitUntil(caches.open("online-bible-v1").then(c=>c.addAll([
    "/","/kjv/genesis/1/1/"
  ])));
});
self.addEventListener("fetch", e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
// ---- PWA assets to site root ----
try {
  // Copy manifest / service worker if they’re at repo root (optional)
  if (fsSync.existsSync(path.join(__dirname, "manifest.webmanifest"))) {
    await fs.copyFile(path.join(__dirname, "manifest.webmanifest"), path.join(OUT, "manifest.webmanifest"));
  }
  if (fsSync.existsSync(path.join(__dirname, "sw.js"))) {
    await fs.copyFile(path.join(__dirname, "sw.js"), path.join(OUT, "sw.js"));
  }

  // Copy icons from pwa/icons → /icons/
  if (fsSync.existsSync(ICONS_SRC)) {
    await ensureDir(path.join(OUT, "icons"));
    for (const name of ["icon-192.png", "icon-512.png"]) {
      const src = path.join(ICONS_SRC, name);
      if (fsSync.existsSync(src)) {
        await fs.copyFile(src, path.join(OUT, "icons", name));
      }
    }
  }
} catch (e) {
  console.warn("PWA asset copy skipped:", e?.message || e);
}

