// Après « vite build » : liste des fichiers que le service worker garde sur l'appareil (public/sw.js),
// pour que l'app s'ouvre sans attendre le réseau. Les polices autres que latines sont gardées à la demande.
import { readdirSync, writeFileSync } from "node:fs";

const files = readdirSync("dist/assets").filter(f => /\.(js|css)$/.test(f) || /latin-(?!ext).*\.woff2$/.test(f));
writeFileSync("dist/precache.json", JSON.stringify({ at: Date.now(), files: files.map(f => "/assets/" + f) }));
console.log(`precache.json : ${files.length} fichiers`);
