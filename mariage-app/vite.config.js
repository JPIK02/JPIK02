// Trois pages : l'app (index.html), la page publique du lien d'adresse des invités (adresse.html, docs/invites-v1.md section 4)
// et celle des liens du jour J, témoins et invités (jourj.html, docs/jour-j-v1.md section 4).
import { defineConfig } from "vite";
export default defineConfig({
  build: { rollupOptions: { input: { main: "index.html", adresse: "adresse.html", jourj: "jourj.html" } } },
});
