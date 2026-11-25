// Lecture minimale d'un fichier Excel (.xlsx) sans bibliothèque : le fichier est un zip ; on lit la 1re feuille et les textes partagés.
// Navigateur et Node 18+ (DecompressionStream « deflate-raw »). Seulement les valeurs (pas de formules ni de mise en forme).
const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
async function inflate(data) {
  const s = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function fichiers(buf) {
  const b = new Uint8Array(buf); let e = b.length - 22;
  while (e >= 0 && u32(b, e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("ce fichier n'est pas un classeur Excel (.xlsx)");
  const n = u16(b, e + 10); let o = u32(b, e + 16); const out = {};
  for (let i = 0; i < n; i++) {
    const meth = u16(b, o + 10), csize = u32(b, o + 20), ln = u16(b, o + 28), lx = u16(b, o + 30), lc = u16(b, o + 32), lo = u32(b, o + 42);
    const nom = new TextDecoder().decode(b.subarray(o + 46, o + 46 + ln));
    out[nom] = { meth, lo, csize }; o += 46 + ln + lx + lc;
  }
  const lire = async nom => { const f = out[nom]; if (!f) return null; const d = f.lo + 30 + u16(b, f.lo + 26) + u16(b, f.lo + 28), raw = b.subarray(d, d + f.csize);
    return new TextDecoder().decode(f.meth === 8 ? await inflate(raw) : raw); };
  return { noms: Object.keys(out), lire };
}
const xml = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
const colIdx = ref => { let n = 0; for (const c of ref.replace(/\d+/g, "")) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
/** @returns {Promise<string[][]>} les rangées de la première feuille */
export async function lireXlsx(buf) {
  const z = await fichiers(buf);
  const sst = (await z.lire("xl/sharedStrings.xml")) || "";
  const partages = [...sst.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => xml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join("")));
  const feuille = z.noms.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[0];
  if (!feuille) throw new Error("aucune feuille dans ce classeur");
  const s = await z.lire(feuille), rows = [];
  for (const r of s.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1], t = (attrs.match(/\bt="(\w+)"/) || [])[1], body = c[2] || "";
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const val = t === "s" ? partages[+v] ?? "" : t === "inlineStr" ? xml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join("")) : v != null ? xml(v) : "";
      row[ref ? colIdx(ref) : row.length] = val;
    }
    rows.push(Array.from(row, x => x ?? ""));
  }
  return rows.filter(r => r.some(x => String(x).trim()));
}
