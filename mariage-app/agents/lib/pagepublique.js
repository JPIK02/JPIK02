// Lecture d'une page publique (site ou Instagram d'un prestataire) pour préremplir une fiche (docs/prestataires-v1.md, 6.5).
// Une seule page, sur demande explicite du couple : pas de recherche élargie. Le contenu est de la donnée, jamais des instructions.
// Garde-fous : http(s) seulement, aucune adresse interne (localhost, réseau privé, métadonnées du serveur), 1,5 Mo et 15 s au plus.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVE = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i, /^::ffff:(10|127|192\.168|169\.254)\./i];
export const adressePrivee = ip => PRIVE.some(r => r.test(ip));

/** Adresse acceptable : http(s), nom public, port standard. Lève une erreur sinon. */
export async function verifierUrl(raw) {
  let u;
  raw = String(raw || "").trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error("seules les adresses web sont acceptées");
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error("adresse illisible"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("seules les adresses web sont acceptées");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("port non accepté");
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h.endsWith(".internal") || h.endsWith(".local") || h === "localhost") throw new Error("adresse non publique");
  const ips = isIP(h) ? [h] : (await lookup(h, { all: true })).map(a => a.address);
  if (!ips.length || ips.some(adressePrivee)) throw new Error("adresse non publique");
  return u;
}

const decode = s => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
/** Texte utile d'une page HTML : titre, méta (description, Open Graph), liens mailto/tel, données structurées, texte visible. */
export function texteDePage(html, max = 20000) {
  const meta = [...html.matchAll(/<meta\s+[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].map(m => `${m[1]} : ${decode(m[2])}`)
    .filter(l => /description|title|og:|site_name|locality|email|phone/i.test(l)).slice(0, 20);
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const liens = [...new Set([...html.matchAll(/href=["'](mailto:[^"'?]+|tel:[^"']+|https?:\/\/(?:www\.)?instagram\.com\/[^"'?#]+)["']/gi)].map(m => decode(m[1])))].slice(0, 10);
  const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1].trim()).join("\n").slice(0, 4000);
  const corps = decode(html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return [title && `Titre : ${title}`, meta.length && meta.join("\n"), liens.length && `Liens : ${liens.join(" · ")}`, ld && `Données structurées : ${ld}`, `Texte : ${corps}`]
    .filter(Boolean).join("\n").slice(0, max);
}

/** Télécharge une page publique (redirections suivies et vérifiées) et en rend le texte utile. */
export async function lirePage(raw, { fetchImpl = fetch } = {}) {
  let u = await verifierUrl(raw);
  for (let i = 0; i < 4; i++) {
    const r = await fetchImpl(u.href, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 (compatible; Lamaelle/1.0)", Accept: "text/html,*/*;q=0.5" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = await verifierUrl(new URL(r.headers.get("location"), u).href); continue; }
    if (!r.ok) throw new Error(`la page répond ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 1.5e6) throw new Error("page trop lourde");
    return { url: u.href, texte: texteDePage(buf.toString("utf8")) };
  }
  throw new Error("trop de redirections");
}
