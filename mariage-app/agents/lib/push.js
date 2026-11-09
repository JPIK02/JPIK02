// Notifications push (standard Web Push, sans Firebase Cloud Messaging).
// Les clés VAPID sont générées une fois et rangées dans la base : la publique dans meta/push (lue par l'app
// pour s'abonner), la privée dans private/vapid (lue seulement ici). Aucune clé à copier à la main.
// Les abonnements des téléphones sont dans la collection pushSubs (écrits par l'app).
import { createRequire } from "node:module";
import { getDb } from "./firestore.js";

const require = createRequire(import.meta.url);
const webpush = require("web-push");

let keys;
/** Crée les clés au premier passage, puis les relit. */
export async function ensureVapid() {
  if (keys) return keys;
  const db = getDb();
  const priv = await db.doc("private/vapid").get();
  if (priv.exists && priv.data().privateKey) {
    keys = priv.data();
  } else {
    keys = webpush.generateVAPIDKeys();
    await db.doc("private/vapid").set(keys);
  }
  await db.doc("meta/push").set({ publicKey: keys.publicKey }, { merge: true });
  return keys;
}

/**
 * Envoie une notification à tous les téléphones abonnés. Ne lève jamais d'erreur :
 * une notification ratée ne doit pas faire échouer un agent.
 * @param {{title:string, body:string, url?:string, tag?:string}} msg
 */
export async function notify({ title, body, url = "/", tag }, { log = console.log } = {}) {
  try {
    const { publicKey, privateKey } = await ensureVapid();
    webpush.setVapidDetails("mailto:mariageclaireetjulien2028@gmail.com", publicKey, privateKey);
    const subs = await getDb().collection("pushSubs").get();
    let sent = 0;
    for (const doc of subs.docs) {
      try {
        await webpush.sendNotification(doc.data().sub, JSON.stringify({ title, body, url, tag }), { TTL: 24 * 3600 });
        sent++;
      } catch (e) {
        // 404 / 410 : l'abonnement n'existe plus (app désinstallée, notifications coupées)
        if (e.statusCode === 404 || e.statusCode === 410) await doc.ref.delete();
        else log(`[push] échec pour un appareil : ${e.statusCode || e.message}`);
      }
    }
    if (subs.size) log(`[push] « ${title} » envoyée à ${sent}/${subs.size} appareil(s)`);
  } catch (e) {
    log(`[push] notifications indisponibles : ${e.message}`);
  }
}
