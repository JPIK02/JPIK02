// Verrou simple dans meta/locks : évite qu'un agent tourne deux fois en même temps
// (réveil planifié toutes les 10 minutes + lancement immédiat depuis l'app).
import { getDb } from "./firestore.js";

export async function withLock(name, ttlMs, fn, { log = console.log } = {}) {
  const db = getDb(), ref = db.doc("meta/locks"), now = Date.now();
  const got = await db.runTransaction(async tx => {
    const l = (await tx.get(ref)).data() || {};
    if ((l[name] || 0) > now) return false;
    tx.set(ref, { [name]: now + ttlMs }, { merge: true });
    return true;
  });
  if (!got) { log(`[${name}] → déjà en cours ailleurs, passage ignoré`); return { skipped: true }; }
  try { return await fn(); } finally { await ref.set({ [name]: 0 }, { merge: true }); }
}
