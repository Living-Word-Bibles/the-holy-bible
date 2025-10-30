// build.mjs
// Online Bible — KJV Static Verse Site Generator (Stable Alpha)
// Living Word Bibles
// Creates one HTML page per verse + sitemap.xml + robots.txt + ads.txt
// Output: ./dist/kjv/<book-slug>/<chapter>/<verse>/index.html

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Config ----------
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://the-holy-bible.livingwordbibles.com";
const BRAND = "Living Word Bibles";
const LOGO_URL = process.env.LOGO_URL || "https://www.livingwordbibles.com/s/LivingWordBibles01.png";
const CDN = "https://cdn.jsdelivr.net/gh/aruljohn/Bible-kjv@master"; // source JSON (unchanged)
const OUT = path.join(__dirname, "dist");

// --- Google AdSense ---
const ADSENSE_CLIENT   = process.env.ADSENSE_CLIENT || "ca-pub-5303063222439969"; // your Publisher ID
const ADSENSE_SLOT     = process.env.ADSENSE_SLOT || ""; // optional manual in-article slot id
const ENABLE_AUTO_ADS  = true; // set false to disable everywhere

// ---------- Helpers ----------
const slugify = s => String(s).trim().toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"-");
const fileFromName = name => String(name).replace(/[^0-9A-Za-z]/g,"") + ".json";
const html = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ensureDir = async d => fs.mkdir(d, {recursive:true});
const write = async (p, c) => { await ensureDir(path.dirname(p)); await fs.writeFile(p, c); };

async function fetchJSON(url){
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) throw new Error(`${r.status} for ${url}`);
  const ct = (r.headers.get("content-type")||"").toLowerCase();
  if(ct.includes("application/json")) return r.json();
  return JSON.parse(await r.text());
}

function normalizeBook(name, data){
  const out = { name, chapters:{} };

  function addChapter(chNum, versesObj){
    const vmap = {};
    if(Array.isArray(versesObj)){
      versesObj.forEach((v,i)=> vmap[String(i+1)] = typeof v==="string" ? v : String(v ?? ""));
    } else {
      for(const [k,v] of Object.entries(versesObj||{})){
        vmap[String(k)] = typeof v==="string" ? v : String(v ?? "");
      }
    }
    out.chapters[Number(chNum)] = { verseCount:Object.keys(vmap).length, verses:vmap };
  }

  // Supported shapes
  if(data && Array.isArray(data.chapters)){
    for(const ch of data.chapters){
      const chNum = Number(ch.chapter);
      const vv = {};
      if(Array.isArray(ch.verses)){
        ch.verses.forEach((v,i)=>{
          if(v && typeof v==="object"){
            const num = String(v.verse ?? v.num ?? v.v ?? (i+1));
            const txt = String(v.text ?? v.t ?? "");
            vv[num] = txt;
          } else { vv[String(i+1)] = String(v ?? ""); }
        });
      } else if(ch.verses && typeof ch.verses==="object"){
        Object.assign(vv, ch.verses);
      }
      addChapter(chNum, vv);
    }
    return out;
  }
  if(data && typeof data==="object" && data.chapters && typeof data.chapters==="object"){
    for(const [chNum, verses] of Object.entries(data.chapters)) addChapter(chNum, verses);
    return out;
  }
  if(data && typeof data==="object" && Object.keys(data).every(k=>/^\d+$/.test(k))){
    for(const [chNum, verses] of Object.entries(data)) addChapter(chNum, verses);
    return out;
  }
  if(Array.isArray(data) && data.length && Array.isArray(data[0])){
    data.forEach((chap,i)=> addChapter(i+1, chap));
    return out;
  }
  throw new Error("Unrecognized book JSON structure.");
}

function pageHTML({book, chapter, verse, text, url, prevHref, nextHref, books}){
  const title = `${book} ${chapter}:${verse} (KJV) — The Holy Bible`;
  const desc  = `King James Version — ${book} ${chapter}:${verse}: ${text}`.slice(0, 300);
  const canonical = url;
  const ogImage = `${SITE_ORIGIN}/og-default.jpg`; // optional file

  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": `${book} ${chapter}:${verse} (KJV)`,
    "text": text,
    "isPartOf": { "@type": "Book", "name": "The Holy Bible: King James Version", "bookEdition": "KJV" },
    "publisher": { "@type": "Organization", "name": BRAND }
  };

  const pageJS  = JSON.stringify({ book, chapter, verse, text, url });
  const booksJS = JSON.stringify(books || []);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${html(title)}</title>
<link rel="canonical" href="${html(canonical)}">
<meta name="description" content="${html(desc)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${html(title)}">
<meta property="og:description" content="${html(desc)}">
<meta property="og:url" content="${html(canonical)}">
<meta property="og:site_name" content="${html(BRAND)}">
${ogImage ? `<meta property="og:image" content="${html(ogImage)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${html(title)}">
<meta name="twitter:description" content="${html(desc)}">
${ogImage ? `<meta name="twitter:image" content="${html(ogImage)}">` : ""}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">

${ENABLE_AUTO_ADS ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${html(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>` : ""}

<style>
  :root{ --ink:#111; --muted:#666; --bd:#ddd; --bg:#fafafa; }
  body{font-family:"EB Garamond", Garamond, "Times New Roman", serif; margin:0; color:var(--ink); background:var(--bg);}
  .wrap{max-width:780px;margin:40px auto;padding:24px;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.06);}
  .brand{display:flex;justify-content:center;margin:-6px 0 10px}
  .brand img{width:150px;height:auto;display:block}
  h1{font-size:28px;margin:8px 0 12px}
  .ref{color:var(--muted);font-size:18px;margin-top:-2px}
  .verse{font-size:28px;line-height:1.5;margin:16px 0}

  .nav{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
  a.btn{border:1px solid var(--bd);border-radius:10px;padding:8px 12px;text-decoration:none;color:var(--ink);background:#f8f8f8}

  /* Search bar (replaces "Start") */
  .searchbar{display:flex;gap:8px;flex-wrap:nowrap;align-items:center}
  .searchbar input{border:1px solid var(--bd);border-radius:10px;padding:8px 10px;min-width:220px;font-family:inherit}
  .searchbar button{border:1px solid var(--bd);border-radius:10px;padding:8px 12px;background:#f8f8f8;cursor:pointer;font-family:inherit}

  .sharebar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 6px}
  .sbtn{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--bd);border-radius:10px;background:#fafafa;cursor:pointer;font-size:15px}
  .sbtn svg{width:16px;height:16px}
  .sbtn:hover{background:#f2f2f2}

  .small{color:var(--muted);font-size:14px;margin-top:14px}
  .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font-size:13px;opacity:0;transition:.25s ease}
  .toast.show{opacity:1}
  /* Optional: space for manual in-article ad */
  .adwrap{margin:16px 0}
</style>
</head>
<body>
  <main class="wrap">
    <div class="brand">
      <img src="${html(LOGO_URL)}" alt="${html(BRAND)} logo" loading="lazy" decoding="async">
    </div>

    <h1>The Holy Bible: King James Version</h1>
    <div class="ref">${html(book)} ${chapter}:${verse} (KJV)</div>
    <div class="verse">${html(text)}</div>

    ${ADSENSE_SLOT ? `
    <!-- Manual in-article ad (optional) -->
    <div class="adwrap">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${html(ADSENSE_CLIENT)}"
           data-ad-slot="${html(ADSENSE_SLOT)}"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>` : ``}

    <div class="nav">
      <a class="btn" href="${html(prevHref)}">⟵ Prev</a>
      <a class="btn" href="${html(nextHref)}">Next ⟶</a>

      <!-- Search bar -->
      <div class="searchbar" role="search">
        <input id="verse-search" type="text" placeholder="e.g., John 3:16" aria-label="Go to reference">
        <button id="go-search" type="button">Go</button>
      </div>

      <a class="btn" href="https://www.the-holy-bible.online/">The Holy Bible</a>
    </div>

    <!-- Social share bar -->
    <div class="sharebar" aria-label="Share this verse">
      <button class="sbtn" data-share="facebook" title="Share on Facebook">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-9h3l1-4h-4V7a2 2 0 0 1 2-2h2V1h-3a5 5 0 0 0-5 5v3H7v4h3v9h3z"/></svg>
        Facebook
      </button>
      <button class="sbtn" data-share="instagram" title="Instagram">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-1.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
        Instagram
      </button>
      <button class="sbtn" data-share="x" title="Share on X/Twitter">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 2H22l-9.7 11.1L21.4 22h-7l-5.5-6.7L2.6 22H2l8.6-9.8L2 2h7l5 6.1L18.3 2z"/></svg>
        X
      </button>
      <button class="sbtn" data-share="linkedin" title="Share on LinkedIn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8.98h5V24H0zM8.48 8.98H13v2.05h.07c.63-1.2 2.16-2.47 4.45-2.47 4.76 0 5.64 3.14 5.64 7.23V24h-5v-6.56c0-1.56-.03-3.56-2.17-3.56-2.17 0-2.5 1.7-2.5 3.45V24h-5V8.98z"/></svg>
        LinkedIn
      </button>
      <button class="sbtn" data-share="email" title="Share by Email">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 4h20v16H2V4zm10 7L3.5 6.5h17L12 11zm0 2l8.5-6.5V20h-17V6.5L12 13z"/></svg>
        Email
      </button>
      <button class="sbtn" data-share="copy" title="Copy link">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        Copy
      </button>
    </div>

    <div class="small">Copyright © ${new Date().getFullYear()} | ${html(BRAND)} | All Rights Reserved | <a href="https://www.livingwordbibles.com/" target="_blank" rel="noopener">www.livingwordbibles.com</a> </div>
  </main>

  <div class="toast" id="toast">Link copied</div>

  <script type="application/ld+json">${JSON.stringify(ld)}</script>

  <script>
    // Page data
    const PAGE  = ${pageJS};
    const BOOKS = ${booksJS};

    function showToast(msg){
      const t = document.getElementById('toast'); t.textContent = msg || 'Done';
      t.classList.add('show'); setTimeout(()=> t.classList.remove('show'), 1200);
    }
    function openShare(u){ window.open(u, '_blank', 'noopener,noreferrer'); }
    async function copyLink(){
      try{ await navigator.clipboard.writeText(PAGE.url); showToast('Link copied'); }
      catch(_){
        const ta=document.createElement('textarea'); ta.value=PAGE.url; ta.style.position='fixed'; ta.style.left='-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('Link copied');
      }
    }

    // --- Search (same logic as widget) ---
    function slugify(s){ return String(s).trim().toLowerCase().replace(/[^a-z0-9\\s]/g,"").replace(/\\s+/g,"-"); }
    function parseRef(input){
      const m = String(input||"").trim().match(/^(\\d?\\s*[A-Za-z][A-Za-z\\s]+?)\\s+(\\d+)(?::(\\d+))?$/);
      if(!m) return null;
      const name = m[1].replace(/\\s+/g," ").trim();
      const chapter = parseInt(m[2],10);
      const verse = m[3] ? parseInt(m[3],10) : 1;
      const target = slugify(name);
      const found = (BOOKS||[]).find(n => slugify(n) === target);
      return found ? { bookSlug: slugify(found), chapter, verse } : null;
    }
    function goSearch(){
      const el = document.getElementById('verse-search');
      const r = parseRef(el.value);
      if(!r){ alert('Could not parse reference. Try "John 3:16".'); el.focus(); return; }
      location.href = \`/kjv/\${r.bookSlug}/\${r.chapter}/\${r.verse}/\`;
    }
    document.getElementById('go-search').addEventListener('click', goSearch);
    document.getElementById('verse-search').addEventListener('keydown', e=>{ if(e.key==='Enter') goSearch(); });

    // Share links
    function buildShareLinks(){
      const refLabel = \`\${PAGE.book} \${PAGE.chapter}:\${PAGE.verse}\`;
      const enc = encodeURIComponent;
      const text = \`The Holy Bible (KJV) — \${refLabel}: \${PAGE.text}\`.slice(0, 240);
      const url = enc(PAGE.url);
      const title = enc(\`\${refLabel} (KJV)\`);
      const textEnc = enc(text);
      return {
        facebook: \`https://www.facebook.com/sharer/sharer.php?u=\${url}\`,
        x:        \`https://twitter.com/intent/tweet?url=\${url}&text=\${textEnc}\`,
        linkedin: \`https://www.linkedin.com/sharing/share-offsite/?url=\${url}\`,
        email:    \`mailto:?subject=\${title}&body=\${textEnc}%0A%0A\${url}\`
      };
    }
    function isMobile(){ return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||''); }
    async function shareInstagram(){
      const profileWeb = 'https://www.instagram.com/living.word.bibles/';
      if(!isMobile()){ openShare(profileWeb); return; }
      const refLabel = \`\${PAGE.book} \${PAGE.chapter}:\${PAGE.verse} (KJV)\`;
      const shareData = { title: 'The Holy Bible (KJV)', text: \`\${refLabel}\\n\${PAGE.text}\`, url: PAGE.url };
      if(navigator.share){ try { await navigator.share(shareData); return; } catch(_){} }
      openShare(profileWeb);
    }
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-share]'); if(!btn) return;
      const which = btn.getAttribute('data-share');
      const links = buildShareLinks();
      if(which === 'copy') return copyLink();
      if(which === 'instagram') return shareInstagram();
      if(links[which]) return openShare(links[which]);
    });
  </script>
</body>
</html>`;
}

// ---------- Build ----------
async function main(){
  await fs.rm(OUT, {recursive:true, force:true});

  // Books list (names)
  const names = await fetchJSON(`${CDN}/Books.json`);
  const bookRows = names.map(n => ({ name:n, slug:slugify(n), url:`${CDN}/${fileFromName(n)}` }));
  const BOOK_NAMES = bookRows.map(r => r.name);

  // Load and normalize all books
  const lib = new Map();
  for(const row of bookRows){
    const raw = await fetchJSON(row.url);
    lib.set(row.slug, normalizeBook(row.name, raw));
  }

  // Build ordered list of every verse URL
  const ALL = [];
  for(const [slug, book] of lib.entries()){
    const chNums = Object.keys(book.chapters).map(Number).sort((a,b)=>a-b);
    for(const c of chNums){
      const vNums = Object.keys(book.chapters[c].verses).map(Number).sort((a,b)=>a-b);
      for(const v of vNums){
        ALL.push({ slug, c, v, url: `${SITE_ORIGIN}/kjv/${slug}/${c}/${v}/` });
      }
    }
  }

  // Write pages with real Prev/Next links
  for(let i=0;i<ALL.length;i++){
    const row = ALL[i];
    const book = lib.get(row.slug);
    const text = book.chapters[row.c].verses[String(row.v)];
    const prevHref = (i>0 ? ALL[i-1].url : ALL[i].url);
    const nextHref = (i<ALL.length-1 ? ALL[i+1].url : ALL[i].url);
    const p = path.join(OUT, "kjv", row.slug, String(row.c), String(row.v), "index.html");
    const htmlStr = pageHTML({
      book: book.name, chapter: row.c, verse: row.v, text, url: row.url,
      prevHref, nextHref,
      books: BOOK_NAMES
    });
    await write(p, htmlStr);
  }

  // Home redirect to Genesis 1:1
  await write(path.join(OUT, "index.html"),
`<!doctype html><meta http-equiv="refresh" content="0; url=/kjv/genesis/1/1/"><link rel="canonical" href="/kjv/genesis/1/1/">`);

  // robots.txt + sitemap.xml
  await write(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);

  const sitemap = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `<url><loc>${SITE_ORIGIN}/</loc></url>`,
    ...ALL.map(r=>`<url><loc>${r.url}</loc></url>`),
    `</urlset>`
  ].join("");
  await write(path.join(OUT, "sitemap.xml"), sitemap);

  // ads.txt for the subdomain (helps buyers verify inventory)
  if (ADSENSE_CLIENT && ADSENSE_CLIENT.includes('pub-')) {
    const PUB_ID = ADSENSE_CLIENT.replace(/^ca-/, ''); // ca-pub-… → pub-…
    await write(path.join(OUT, "ads.txt"), `google.com, ${PUB_ID}, DIRECT, f08c47fec0942fa0\n`);
  }

  console.log(`Built ${ALL.length} verse pages → ${OUT}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });
