// Obtient le refresh token Gmail (lecture seule) de la boîte dédiée, une seule fois.
// 1. Console Google Cloud > API Gmail activée > Identifiants > ID client OAuth « Application de bureau ».
// 2. GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/get-gmail-token.js
// 3. Ouvrir l'URL affichée, se connecter avec mariageclaireetjulien2028@gmail.com, accepter.
import http from "node:http";
import { createRequire } from "node:module";
const require = createRequire(new URL("../agents/package.json", import.meta.url));
const { google } = require("googleapis");

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) { console.error("GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET requis"); process.exit(1); }
const PORT = 53682, redirect = `http://127.0.0.1:${PORT}`;
const oauth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, redirect);
const url = oauth.generateAuthUrl({ access_type: "offline", prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.readonly"], login_hint: "mariageclaireetjulien2028@gmail.com" });
console.log("Ouvre cette URL dans ton navigateur :\n\n" + url + "\n");
http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) { res.end("Pas de code."); return; }
  const { tokens } = await oauth.getToken(code);
  res.end("C'est bon, tu peux fermer cet onglet.");
  console.log("GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
  process.exit(0);
}).listen(PORT);
