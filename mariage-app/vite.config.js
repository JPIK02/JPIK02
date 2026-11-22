// Deux pages : l'app (index.html) et la page publique du lien d'adresse des invités (adresse.html, docs/invites-v1.md section 4).
import { defineConfig } from "vite";
export default defineConfig({
  build: { rollupOptions: { input: { main: "index.html", adresse: "adresse.html" } } },
});
