// Petite file de travail sans dépendance (testable sans Firebase).
/** Exécute fn sur chaque élément, `n` à la fois ; la première erreur est remontée après la fin des autres. */
export async function mapPool(items, n, fn) {
  let i = 0, err = null;
  const worker = async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); } catch (e) { err ||= e; } } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (err) throw err;
}
