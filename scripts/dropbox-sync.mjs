/* =============================================================================
   DROPBOX SYNC — regenerates assets/data/synced.js from real Dropbox folders.
   Runs in GitHub Actions (see .github/workflows/dropbox-sync.yml). Node 18+.

   Env (GitHub Secrets): DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN

   For each product it lists the shared folder, walks the subfolders, and builds a
   thumbnail for EVERY file:
     - images  → Dropbox get_thumbnail_v2 (jpeg)
     - svg     → the vector itself (committed, renders natively)
     - pdf     → first page rendered with pdftoppm (poppler)
     - video   → a frame grabbed with ffmpeg
   Thumbnails are content-addressed (named by Dropbox content_hash) and committed
   under assets/synced/<slug>/, so unchanged files are never re-downloaded.
   Writes window.PORTAL_SYNCED into assets/data/synced.js.
   ========================================================================== */
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const APP_KEY = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REFRESH = process.env.DROPBOX_REFRESH_TOKEN;
if (!APP_KEY || !APP_SECRET || !REFRESH) {
  console.error("Missing DROPBOX_* env vars — nothing to sync.");
  process.exit(0);
}

// Products to sync: portal product name → its public Dropbox shared-folder link.
// One shared folder holds the seven canonical asset categories (below).
const PRODUCTS = [
  {
    // `commitFiles` = commit the real originals so the browser can download/zip
    // them in-portal (the Elite II is the launch showcase). Keeps the published
    // site under GitHub Pages' 1 GB ceiling since it's a single product.
    // Videos are thumbnail-only (downloaded via the Dropbox "Download all" link).
    name: "Grenco Medical Elite II",
    slug: "elite-ii",
    commitFiles: true,
    link: "https://www.dropbox.com/scl/fo/ouziaxb0vsn79y7241s2m/AMNTGl9fBkmCrqOiCbOeRiw?rlkey=lex8silmu0kv5ghw02f11v9ru&st=x5pppd3m&dl=0",
  },
];

// The seven canonical categories, in the order they appear on the portal.
const FOLDER_ORDER = ["Product Photos", "Marketing Photos", "Packaging", "Logos", "Marketing", "Videos", "Documents"];
// Normalize common Dropbox folder-name variants to the canonical names above, so
// a folder called "Lifestyle" or "Social Videos" still lands in the right bucket.
const FOLDER_ALIAS = {
  "Product Photo": "Product Photos", "Product Images": "Product Photos", "E-Comm": "Product Photos", "E-Comm Render Photos": "Product Photos",
  "Lifestyle": "Marketing Photos", "Lifestyle Photo": "Marketing Photos", "Lifestyle Photos": "Marketing Photos", "Marketing Photo": "Marketing Photos",
  "Package": "Packaging",
  "Logo": "Logos",
  "Marketing Materials": "Marketing", "In-Store Marketing": "Marketing", "In Store Marketing": "Marketing", "POS": "Marketing", "POS Materials": "Marketing", "Web Banners": "Marketing", "Web Banner": "Marketing", "Banners": "Marketing",
  "Video": "Videos", "Social Videos": "Videos", "Social Video": "Videos", "TV Screen Videos": "Videos",
  "Doc": "Documents", "Docs": "Documents", "Misc": "Documents",
};
const MAX_COMMIT = 50 * 1024 * 1024;   // commit originals up to 50 MB (bigger files → Dropbox)
const RASTER = /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i;   // Dropbox can thumbnail these directly
const VIDEO = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

function dlLink(link) { return /[?&]dl=/.test(link) ? link.replace(/([?&]dl=)\d/, "$11") : link + (link.includes("?") ? "&dl=1" : "?dl=1"); }
function ext(name) { return (name.split(".").pop() || "").toLowerCase(); }
function typeOf(e) {
  if (e === "svg") return "vector";
  if (RASTER.test("." + e)) return "image";
  if (VIDEO.test("." + e)) return "video";
  if (e === "pdf") return "pdf";
  return "file";
}

async function getToken() {
  const r = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64") },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH }),
  });
  if (!r.ok) throw new Error("token " + r.status + " " + (await r.text()));
  return (await r.json()).access_token;
}

async function rpc(tok, endpoint, body) {
  const r = await fetch("https://api.dropboxapi.com/2/" + endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(endpoint + " " + r.status + " " + (await r.text()));
  return r.json();
}

async function listFolder(tok, link, path) {
  let res = await rpc(tok, "files/list_folder", { path, shared_link: { url: link } });
  let entries = res.entries;
  while (res.has_more) {
    res = await rpc(tok, "files/list_folder/continue", { cursor: res.cursor });
    entries = entries.concat(res.entries);
  }
  return entries;
}

let warned = {};
function warnOnce(key, msg) { if (!warned[key]) { warned[key] = true; console.error(msg); } }

// Create (or reuse) a direct Dropbox share link for one file, by its id, so an
// individual video can be streamed + downloaded from the how-to hub. Best-effort:
// returns null on failure (the hub falls back to the placeholder download).
async function fileShareLink(tok, id) {
  if (!id) return null;
  try {
    const r = await rpc(tok, "sharing/list_shared_links", { path: id, direct_only: true });
    if (r.links && r.links.length) return r.links[0].url;
  } catch { /* fall through to create */ }
  try {
    const c = await rpc(tok, "sharing/create_shared_link_with_settings", { path: id });
    if (c.url) return c.url;
  } catch (e) {
    try {
      const r2 = await rpc(tok, "sharing/list_shared_links", { path: id, direct_only: true });
      if (r2.links && r2.links.length) return r2.links[0].url;
    } catch { /* give up */ }
    warnOnce("sharelink", "share link failed: " + e.message);
  }
  return null;
}

// Dropbox passes call parameters in the "Dropbox-API-Arg" HTTP header, which must
// be ASCII. Filenames often contain non-ASCII (e.g. macOS screenshots use U+202F,
// a narrow no-break space, before AM/PM), so escape every non-ASCII char to \uXXXX
// per Dropbox's HTTP-header-safe JSON requirement.
function apiArg(obj) {
  return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, function (c) {
    return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
  });
}

// Dropbox-rendered thumbnail (raster images only) → writes jpeg to outFile.
async function thumbV2(tok, link, path, outFile) {
  const r = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + tok,
      "Dropbox-API-Arg": apiArg({ resource: { ".tag": "link", url: link, path }, format: "jpeg", size: "w640h480", mode: "fitone_bestfit" }),
    },
  });
  if (!r.ok) { warnOnce("thumbV2", "thumbnail failed " + r.status + ": " + (await r.text()).slice(0, 200)); return false; }
  writeFileSync(outFile, Buffer.from(await r.arrayBuffer()));
  return true;
}

// Download a file from the shared link to disk (streamed — safe for big videos).
async function downloadFile(tok, link, path, outFile) {
  const r = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
    method: "POST",
    headers: { Authorization: "Bearer " + tok, "Dropbox-API-Arg": apiArg({ url: link, path }) },
  });
  if (!r.ok) { warnOnce("dl", "download failed " + r.status + ": " + (await r.text()).slice(0, 200)); return false; }
  await pipeline(Readable.fromWeb(r.body), createWriteStream(outFile));
  return true;
}

// A near-uniform frame (blank white/black intro title card) reads as a "missing"
// thumbnail. Use ImageMagick to measure contrast so we can reject those.
function frameOK(f) {
  try {
    const sd = execFileSync("identify", ["-format", "%[fx:standard_deviation]", f], { encoding: "utf8" }).trim();
    return parseFloat(sd) > 0.06;   // >~6% contrast → real content, not a blank card
  } catch { return true; }          // identify unavailable → accept whatever we got
}

function videoFrame(src, out) {
  // The `thumbnail` filter scores a batch of frames and returns the most
  // representative one, which skips blank intro/outro title cards. Seek a few
  // seconds in first, and reject any frame that still comes back near-uniform.
  const attempts = [
    ["-y", "-ss", "4", "-i", src, "-vf", "thumbnail=n=100,scale=640:-1", "-frames:v", "1", out],
    ["-y", "-ss", "10", "-i", src, "-vf", "thumbnail=n=100,scale=640:-1", "-frames:v", "1", out],
    ["-y", "-i", src, "-vf", "thumbnail=n=300,scale=640:-1", "-frames:v", "1", out],
    ["-y", "-ss", "2", "-i", src, "-frames:v", "1", "-vf", "scale=640:-1", out],
    ["-y", "-i", src, "-frames:v", "1", "-vf", "scale=640:-1", out],
  ];
  for (const args of attempts) {
    try { execFileSync("ffmpeg", args, { stdio: "ignore" }); if (existsSync(out) && frameOK(out)) return true; } catch { /* try next */ }
  }
  return existsSync(out);   // keep the last frame even if plain, rather than nothing
}

function pdfFirstPage(src, outBase) {
  try { execFileSync("pdftoppm", ["-jpeg", "-singlefile", "-scale-to", "640", src, outBase], { stdio: "ignore" }); return existsSync(outBase + ".jpg"); }
  catch (e) { warnOnce("pdf", "pdftoppm failed: " + e.message); return false; }
}

// White/light logos are invisible on the default white thumbnail — composite
// the (usually transparent) art onto a dark neutral gray so it shows. ImageMagick
// reads PNG/SVG/AI/PDF; `[0]` takes the first page/layer.
const LIGHT = /white/i;
function grayThumb(src, out, e) {
  try {
    if (e === "ai" || e === "pdf" || e === "eps") {
      // Illustrator/PDF render onto an opaque white artboard via Ghostscript's
      // default device, hiding the gray. Render with pngalpha (transparent) first,
      // then composite the art onto gray.
      const png = out + ".src.png";
      execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pngalpha", "-r150", "-dFirstPage=1", "-dLastPage=1", "-o", png, src], { stdio: "ignore" });
      execFileSync("convert", ["-background", "#3f3f46", png, "-flatten", "-resize", "640x480>", out], { stdio: "ignore" });
      try { unlinkSync(png); } catch {}
    } else {
      execFileSync("convert", ["-background", "#3f3f46", src + "[0]", "-flatten", "-resize", "640x480>", out], { stdio: "ignore" });
    }
    return existsSync(out);
  } catch (err) { warnOnce("gray", "gray thumb failed: " + err.message); return false; }
}

const tok = await getToken();
const synced = {};

for (const p of PRODUCTS) {
  const dir = join("assets", "synced", p.slug);
  mkdirSync(dir, { recursive: true });
  const keep = new Set();   // thumbnail filenames referenced this run (for pruning)
  const tmp = join(dir, "_tmp");

  const top = await listFolder(tok, p.link, "");
  const subs = top.filter((e) => e[".tag"] === "folder").map((e) => e.name);

  // Folders with subfolders use them as asset groups (like Dash II); a flat
  // folder buckets its files under `flat` (e.g. the logo set).
  const folderSpecs = [];
  if (subs.length) {
    // Map each Dropbox subfolder to its canonical display name, then order by
    // the canonical tab order (aliased/unknown names fall to the end).
    const specs = subs.map((raw) => ({ raw, disp: FOLDER_ALIAS[raw] || raw }));
    specs.sort((a, b) => {
      var ia = FOLDER_ORDER.indexOf(a.disp), ib = FOLDER_ORDER.indexOf(b.disp);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const { raw, disp } of specs) {
      const entries = await listFolder(tok, p.link, "/" + raw);
      const files = [];
      for (const e of entries) if (e[".tag"] === "file") { e.relPath = "/" + raw + "/" + e.name; files.push(e); }
      // Walk one nested level (e.g. per-color variant folders under Product Photos)
      // and flatten those files into the parent group, labelled by their folder.
      for (const ss of entries.filter((e) => e[".tag"] === "folder")) {
        const nested = (await listFolder(tok, p.link, "/" + raw + "/" + ss.name)).filter((e) => e[".tag"] === "file");
        for (const nf of nested) {
          nf.relPath = "/" + raw + "/" + ss.name + "/" + nf.name;
          nf.displayName = ss.name + " · " + nf.name.replace(/\.[^.]+$/, "");
          files.push(nf);
        }
      }
      folderSpecs.push({ name: disp, prefix: "/" + raw, files });
    }
  } else {
    folderSpecs.push({ name: p.flat || "Files", prefix: "", files: top.filter((e) => e[".tag"] === "file") });
  }

  const filesDir = join(dir, "files");
  mkdirSync(filesDir, { recursive: true });
  const keepFiles = new Set();   // committed original filenames (under files/)

  const folders = {};
  for (const spec of folderSpecs) {
    const files = spec.files;
    files.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name, undefined, { numeric: true }));
    const out = [];
    for (const f of files) {
      const e = ext(f.name), type = typeOf(e), path = f.relPath || (spec.prefix + "/" + f.name);
      const hash = f.content_hash, size = f.size || 0;
      let thumb = null, fileRel = null, share = null;
      try {
        // Commit the real original (so the browser can download/zip it in
        // portal) for commitFiles products; always commit tiny SVGs since the
        // vector itself is the preview. Everything else is thumbnail-only.
        if (size <= MAX_COMMIT && type !== "video" && (p.commitFiles || type === "vector")) {
          const cf = `${hash}.${e}`;
          if (!existsSync(join(filesDir, cf))) await downloadFile(tok, p.link, path, join(filesDir, cf));
          if (existsSync(join(filesDir, cf))) { fileRel = `assets/synced/${p.slug}/files/${cf}`; keepFiles.add(cf); }
        }
        const localOrig = fileRel ? join(filesDir, `${hash}.${e}`) : null;

        // White/light logos → composite onto gray (baked into the thumbnail) so
        // they're visible. Distinct `-lt.jpg` name so old white thumbs get pruned.
        if (LIGHT.test(f.name) && type !== "video") {
          const tn = hash + "-lt2.jpg";
          if (!existsSync(join(dir, tn))) {
            const src = localOrig || (await downloadFile(tok, p.link, path, tmp + "." + e) ? tmp + "." + e : null);
            if (src) { grayThumb(src, join(dir, tn), e); if (src === tmp + "." + e) unlinkSync(src); }
          }
          if (existsSync(join(dir, tn))) { thumb = `assets/synced/${p.slug}/${tn}`; keep.add(tn); }
        }

        // Thumbnail (reuses the committed original when we have it). Skipped when
        // the gray light-logo composite above already produced one.
        if (thumb) {
          /* light composite done */
        } else if (type === "vector") {
          thumb = fileRel;  // the SVG itself renders as the preview
        } else if (type === "image" && p.pngThumbs) {
          // Logos: transparent PNG thumbnails. Dropbox's thumbnail service flattens
          // alpha to white, so resize the original with ImageMagick to keep it.
          const tn = hash + "-tr.png";
          if (!existsSync(join(dir, tn))) {
            const src = (await downloadFile(tok, p.link, path, tmp + "." + e)) ? tmp + "." + e : null;
            if (src) {
              try { execFileSync("convert", [src + "[0]", "-resize", "640x480>", join(dir, tn)], { stdio: "ignore" }); }
              catch (e2) { warnOnce("pngthumb", "png thumb failed: " + e2.message); }
              try { unlinkSync(src); } catch {}
            }
          }
          if (existsSync(join(dir, tn))) { thumb = `assets/synced/${p.slug}/${tn}`; keep.add(tn); }
        } else if (type === "image") {
          const tn = hash + ".jpg";
          if (!existsSync(join(dir, tn))) await thumbV2(tok, p.link, path, join(dir, tn));
          if (existsSync(join(dir, tn))) { thumb = `assets/synced/${p.slug}/${tn}`; keep.add(tn); }
        } else if (type === "pdf" || e === "ai") {
          const tn = hash + ".jpg";
          if (!existsSync(join(dir, tn))) {
            const src = localOrig || (await downloadFile(tok, p.link, path, tmp + ".pdf") ? tmp + ".pdf" : null);
            if (src) { pdfFirstPage(src, join(dir, hash)); if (src === tmp + ".pdf") unlinkSync(src); }
          }
          if (existsSync(join(dir, tn))) { thumb = `assets/synced/${p.slug}/${tn}`; keep.add(tn); }
        } else if (type === "video") {
          // `-v2` forces one-time regeneration with the representative-frame
          // logic; the old blank `hash.jpg` frames get pruned automatically.
          const tn = hash + "-v2.jpg";
          if (!existsSync(join(dir, tn))) {
            const src = localOrig || (await downloadFile(tok, p.link, path, tmp + "." + e) ? tmp + "." + e : null);
            if (src) { videoFrame(src, join(dir, tn)); if (src === tmp + "." + e) unlinkSync(src); }
          }
          if (existsSync(join(dir, tn))) { thumb = `assets/synced/${p.slug}/${tn}`; keep.add(tn); }
          // A per-file share link makes the video streamable + downloadable in
          // the how-to hub (the folder link can't hotlink an individual file).
          share = await fileShareLink(tok, f.id);
        }
      } catch (err) { warnOnce("gen-" + type, "asset error (" + f.name + "): " + err.message); }

      out.push({ name: f.displayName || f.name.replace(/\.[^.]+$/, ""), type, format: e.toUpperCase(), url: p.link, thumb, file: fileRel, link: share || undefined });
    }
    if (out.length) folders[spec.name] = (folders[spec.name] || []).concat(out);  // concat so aliased names merge
  }

  // Prune thumbnails / originals for files that no longer exist.
  for (const fn of readdirSync(dir)) if (fn !== "files" && !keep.has(fn)) { try { unlinkSync(join(dir, fn)); } catch {} }
  for (const fn of readdirSync(filesDir)) if (!keepFiles.has(fn)) { try { unlinkSync(join(filesDir, fn)); } catch {} }

  synced[p.name] = { folders, dropbox: dlLink(p.link) };
  const total = Object.values(folders).reduce((n, a) => n + a.length, 0);
  const withThumb = Object.values(folders).reduce((n, a) => n + a.filter((x) => x.thumb).length, 0);
  const withFile = Object.values(folders).reduce((n, a) => n + a.filter((x) => x.file).length, 0);
  console.log(`${p.name}: ${folderSpecs.length} folders, ${total} files, ${withThumb} thumbnails, ${withFile} downloadable`);
}

writeFileSync("assets/data/synced.js", "window.PORTAL_SYNCED = " + JSON.stringify(synced, null, 2) + ";\n");
console.log("Wrote assets/data/synced.js");
