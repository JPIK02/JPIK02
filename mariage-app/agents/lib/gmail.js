// Lecture seule de la boîte Gmail dédiée (scope gmail.readonly).
// Aucune fonction d'envoi, de modification ou de suppression n'existe ici, volontairement.
import { google } from "googleapis";
import { extractText, header } from "./mailtext.js";
export { threadUrl } from "./mailtext.js";

export function gmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN)
    throw new Error("Identifiants Gmail manquants (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)");
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth });
}

/** Fils récents, chaque message réduit à {id, from, to, date, subject, text, attachments}. */
export async function recentThreads(gmail, { query, max = 200 }) {
  const ids = [];
  let pageToken;
  do {
    const r = await gmail.users.threads.list({ userId: "me", q: query, maxResults: 50, pageToken });
    (r.data.threads || []).forEach(t => ids.push(t.id));
    pageToken = r.data.nextPageToken;
  } while (pageToken && ids.length < max);

  const out = [];
  for (const id of ids) {
    const t = await gmail.users.threads.get({ userId: "me", id, format: "full" });
    out.push({
      id,
      messages: (t.data.messages || []).map(m => {
        const { text, attachments, files } = extractText(m.payload);
        return {
          id: m.id,
          labelIds: m.labelIds || [],
          from: header(m, "From"), to: header(m, "To"),
          date: new Date(+m.internalDate).toISOString(),
          subject: header(m, "Subject"),
          text: text.slice(0, 20000),
          attachments,
          files,
        };
      }),
    });
  }
  return out;
}

/** Contenu d'une pièce jointe en base64 standard (lecture seule). */
export async function attachmentData(gmail, messageId, attachmentId) {
  const r = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: attachmentId });
  return String(r.data.data || "").replace(/-/g, "+").replace(/_/g, "/");
}
