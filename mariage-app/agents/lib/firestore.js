// Accès Firestore côté agents (SDK Admin, compte de service).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let db;
export function getDb() {
  if (db) return db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant (JSON du compte de service)");
  initializeApp({ credential: cert(JSON.parse(raw)) });
  db = getFirestore();
  return db;
}

export async function getMeta(id) {
  const snap = await getDb().doc(`meta/${id}`).get();
  return snap.exists ? snap.data() : {};
}

export async function listAll(collection) {
  const snap = await getDb().collection(collection).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Écrit jusqu'à 500 documents par lot. writes = [{collection, id, data, merge?}] */
export async function batchWrite(writes) {
  const db = getDb();
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    for (const w of writes.slice(i, i + 450)) {
      batch.set(db.collection(w.collection).doc(w.id), w.data, { merge: !!w.merge });
    }
    await batch.commit();
  }
}

export async function mergeMeta(id, data) {
  await getDb().doc(`meta/${id}`).set(data, { merge: true });
}
