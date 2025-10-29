// build.mjs
// KJV Static Verse Site Generator — Living Word Bibles
// Creates one HTML page per verse and a sitemap for Google.
// Output ends up in ./dist, ready for GitHub Pages.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Config ----------
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://the-holy-bible.livingwordbibles.com";
const BRAND = "Living Word Bibles";
const LOGO_URL = process.env.LOGO_URL || "https://www.livingwordbibles.com/s/LivingWordBibles01.png";
const CDN = "https://cdn.jsdelivr.net/gh/aruljohn/Bible-kjv@master"; // source JSON
const OUT = path.join(__dirname, "dist");

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

function pageHTML({book, chapter, verse, text, url, prevHref, nextHref}){
  const title = `${book} ${chapter}:${verse} (KJV) — The Holy Bible`;
  const desc  = `King James Version — ${book} ${chapter}:${verse}: ${text}`.slice(0, 300);
  const canonical = url;
  const ogImage = `${SITE_ORIGIN}/og-default.jpg`; // optional: add one later

  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": `${book} ${chapter}:${verse} (KJV)`,
    "text": text,
    "isPartOf": {
      "@type": "Book",
      "name": "The Holy Bible: King James Version",
      "bookEdition": "KJV"
    },
    "publisher": { "@type": "Organization", "name": BRAND }
  };

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
<style>
  :root { --ink:#111; --muted:#666; }
  body{font-family:"EB Garamond", Garamond, "Times New Roman", serif; margin:0; color:var(--ink); background:#fafafa;}
  .wrap{max-width:780px;margin:40px auto;padding:24px;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.06);}
  .brand{display:flex;justify-content:center;margin:-6px 0 10px}
  .brand img{width:150px;height:auto;display:block}
  h1{font-size:28px;margin:8px 0 12px}
  .ref{color:var(--muted);font-size:18px;margin-top:-2px}
  .verse{font-size:28px;line-height:1.5;margin:16px 0}
  .nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
  a.btn{border:1px solid #ddd;border-radius:10px;padding:8px 12px;text-decoration:none;color:var(--ink);background:#f8f8f8}
  .small{color:var(--muted);font-size:14px;margin-top:14px}
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
    <div class="nav">
      <a class="btn" href="${html(prevHref)}">⟵ Prev</a>
      <a class="btn" href="${html(nextHref)}">Next ⟶</a>
      <a class="btn" href="${SITE_ORIGIN}/kjv/genesis/1/1/">Start</a>
      <a class="btn" href="https://www.livingwordbibles.com/">LivingWordBibles.com</a>
    </div>
    <div class="small">Copyright © ${new Date().getFullYear()} ${html(BRAND)}.</div>
  </main>
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</body>
</html>`;
}

async function main(){
  await fs.rm(OUT, {recursive:true, force:true});

  const books = await fetchJSON(`${CDN}/Books.json`);
  const bookRows = books.map(n => ({ name:n, slug:slugify(n), url:`${CDN}/${fileFromName(n)}` }));

  // Load all books
  const lib = new Map();
  for(const row of bookRows){
    const raw = await fetchJSON(row.url);
    lib.set(row.slug, normalizeBook(row.name, raw));
  }

  // Build list of every verse URL in order
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
    const prevHref = (i>0 ? ALL[i-1].url : row.url);
    const nextHref = (i<ALL.length-1 ? ALL[i+1].url : row.url);
    const p = path.join(OUT, "kjv", row.slug, String(row.c), String(row.v), "index.html");
    const htmlStr = pageHTML({
      book: book.name, chapter: row.c, verse: row.v, text, url: row.url, prevHref, nextHref
    });
    await write(p, htmlStr);
  }

  // Home redirect to Genesis 1:1
  await write(path.join(OUT, "index.html"),
`<!doctype html><meta http-equiv="refresh" content="0; url=/kjv/genesis/1/1/"><link rel="canonical" href="/kjv/genesis/1/1/">`);

  // robots + sitemap
  await write(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);

  const sitemap = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `<url><loc>${SITE_ORIGIN}/</loc></url>`,
    ...ALL.map(r=>`<url><loc>${r.url}</loc></url>`),
    `</urlset>`
  ].join("");
  await write(path.join(OUT, "sitemap.xml"), sitemap);

  console.log(`Built ${ALL.length} verse pages → ${OUT}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });
