// Fonctions pures de lecture des messages Gmail (testables sans dépendances).

const b64 = s => Buffer.from(String(s || "").replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

export function stripHtml(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();
}

/** Texte brut d'un message Gmail (préfère text/plain, sinon HTML nettoyé). */
export function extractText(payload) {
  const plain = [], html = [], files = [], parts = [];
  const walk = p => {
    if (!p) return;
    if (p.filename) {
      files.push(p.filename);
      if (p.body?.attachmentId) parts.push({ filename: p.filename, mimeType: p.mimeType || "", attachmentId: p.body.attachmentId, size: p.body.size || 0 });
    }
    if (p.mimeType === "text/plain" && p.body?.data) plain.push(b64(p.body.data));
    else if (p.mimeType === "text/html" && p.body?.data) html.push(b64(p.body.data));
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  const text = plain.length ? plain.join("\n") : stripHtml(html.join("\n"));
  return { text, attachments: files.filter(Boolean), files: parts };
}

export const header = (msg, name) =>
  (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

export function threadUrl(mailbox, threadId) {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(mailbox)}#all/${threadId}`;
}


// Pièces jointes lisibles par Claude : PDF et photos, 4,5 Mo au plus chacune
export const READABLE = { "application/pdf": "document", "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image" };
export function readableFiles(files, { max = 3, maxSize = 4_500_000 } = {}) {
  const kind = f => READABLE[f.mimeType] || (/\.pdf$/i.test(f.filename) ? "document" : null);
  return files.filter(f => kind(f) && (!f.size || f.size <= maxSize)).slice(0, max)
    .map(f => ({ ...f, kind: kind(f), mimeType: READABLE[f.mimeType] ? f.mimeType : "application/pdf" }));
}
