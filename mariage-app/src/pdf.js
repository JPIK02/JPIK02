// Fabrication de vrais fichiers PDF dans le navigateur (jsPDF), chargée seulement quand on en a besoin.
// Pourquoi pas l'impression du navigateur : sur iPhone, window.print() ne fait rien dans l'app installée
// sur l'écran d'accueil, et Safari la bloque si elle n'est pas lancée pile au moment du toucher.
//
// Le contenu est décrit par blocs : { h2 }, { h3 }, { p }, { note }, { ul: [...] }, { kpis: [[libellé, valeur, détail]] },
// { alerts: [[niveau, titre, texte]] }, { table: { head: [...], body: [[...]], widths?: [...], right?: [index] } },
// { tags: [...] } (pastilles), { imgs: [{ data: "data:image/jpeg;base64,…", caption }] }, { page: true } (saut de page).
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Les polices standard des PDF ne connaissent pas les espaces fines insécables (montants en français) ni les symboles rares
const T = s => String(s ?? "").replace(/[   ]/g, " ").replace(/[✓✔★]/g, "").replace(/[^\x00-\xff€’‘“”…—–œŒ•]/g, "");
const PRUNE = [58, 23, 51], GOLD = [143, 106, 46], INK = [31, 26, 36], MUTED = [93, 86, 101], LINE = [228, 223, 232];
const COLORS = { bad: [[251, 230, 230], [162, 52, 52]], warn: [[252, 239, 214], [138, 90, 12]], info: [[242, 232, 240], [90, 42, 79]] };

export function buildPdf({ kicker = "LE MARIAGE DE", title, subtitle, docTitle, blocks = [], footer }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, CW = W - 2 * M, BOTTOM = 297 - 18;
  let y = 18;
  const need = h => { if (y + h > BOTTOM) { doc.addPage(); y = 18; } };
  const text = (str, size, { color = INK, style = "normal", lh = 1.35, width = CW, x = M } = {}) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(T(str), width);
    const h = lines.length * size * 0.3528 * lh;
    need(h);
    doc.text(lines, x, y + size * 0.3528);
    y += h;
  };

  // En-tête
  text(kicker, 8.5, { color: GOLD, style: "bold" }); y += 1;
  text(title, 24, { color: PRUNE, style: "bold", lh: 1.15 });
  if (subtitle) { y += 1; text(subtitle, 10.5, { color: MUTED }); }
  if (docTitle) { y += 3; text(docTitle, 15, { style: "bold" }); }
  y += 2; doc.setDrawColor(...PRUNE); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 6;

  for (const b of blocks) {
    if (b.h2) { y += 3; need(14); text(b.h2, 13.5, { color: PRUNE, style: "bold" }); y += 2; }
    else if (b.h3) { y += 1.5; need(10); text(b.h3, 11, { style: "bold" }); y += 1; }
    else if (b.p) { text(b.p, 10); y += 2; }
    else if (b.note) { text(b.note, 8.8, { color: MUTED }); y += 2; }
    else if (b.ul) { for (const li of b.ul) { const x0 = M + 4; doc.setFontSize(10); text("•", 10, { x: M + 0.5, width: 4 }); y -= 10 * 0.3528 * 1.35; text(li, 10, { x: x0, width: CW - 4 }); y += 1; } y += 1.5; }
    else if (b.kpis) {
      const n = b.kpis.length, gap = 3, w = (CW - gap * (n - 1)) / n, h = 20; need(h + 2);
      b.kpis.forEach(([l, v, s], i) => {
        const x = M + i * (w + gap);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(T(l).toUpperCase(), x + 3, y + 5);
        doc.setFontSize(13); doc.setTextColor(...INK); doc.text(T(v), x + 3, y + 11.5);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(T(s || ""), w - 6).slice(0, 2), x + 3, y + 15.5);
      });
      y += h + 4;
    }
    else if (b.alerts) {
      for (const [lvl, t, s] of b.alerts) {
        const [bg, fg] = COLORS[lvl] || COLORS.info;
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(T(s), CW - 8), h = 6 + lines.length * 4.2;
        need(h + 2);
        doc.setFillColor(...bg); doc.rect(M, y, CW, h, "F"); doc.setFillColor(...fg); doc.rect(M, y, 1.2, h, "F");
        doc.setFont("helvetica", "bold"); doc.setTextColor(...fg); doc.text(T(t), M + 4, y + 4.6);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...INK); doc.text(lines, M + 4, y + 9);
        y += h + 2;
      }
      y += 1;
    }
    else if (b.page) { doc.addPage(); y = 18; }
    else if (b.tags) {
      // mots-clés en pastilles
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      let x = M; need(9);
      for (const t of b.tags) {
        const w = doc.getTextWidth(T(t)) + 6;
        if (x + w > W - M) { x = M; y += 8; need(9); }
        doc.setFillColor(242, 232, 240); doc.roundedRect(x, y, w, 6.2, 3, 3, "F");
        doc.setTextColor(...PRUNE); doc.text(T(t), x + 3, y + 4.3); x += w + 2.5;
      }
      y += 10;
    }
    else if (b.imgs) {
      // photos d'inspiration : 3 par ligne, légende dessous
      const n = 3, gap = 4, w = (CW - gap * (n - 1)) / n;
      for (let i = 0; i < b.imgs.length; i += n) {
        const row = b.imgs.slice(i, i + n);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.8);
        const caps = row.map(im => doc.splitTextToSize(T(im.caption || ""), w).slice(0, 3));
        const h = w * 0.75 + 2 + Math.max(...caps.map(c => c.length)) * 3.3;
        need(h + 3);
        row.forEach((im, j) => {
          const x = M + j * (w + gap);
          try {
            const pr = doc.getImageProperties(im.data), r = Math.min(w / pr.width, (w * 0.75) / pr.height);
            const iw = pr.width * r, ih = pr.height * r;
            doc.addImage(im.data, "JPEG", x + (w - iw) / 2, y + (w * 0.75 - ih) / 2, iw, ih);
          } catch { doc.setDrawColor(...LINE); doc.rect(x, y, w, w * 0.75); }
          doc.setTextColor(...MUTED); doc.text(caps[j], x, y + w * 0.75 + 4.5);
        });
        y += h + 3;
      }
    }
    else if (b.table) {
      const { head, body, widths, right = [], foot } = b.table;
      autoTable(doc, {
        startY: y, margin: { left: M, right: M, bottom: 18 }, head: [head.map(T)], body: body.map(r => r.map(T)), foot: foot ? [foot.map(T)] : undefined,
        theme: "plain", styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }, textColor: INK, lineColor: LINE, lineWidth: { bottom: 0.2 } },
        headStyles: { fontSize: 7.5, fontStyle: "bold", textColor: MUTED, lineWidth: { bottom: 0.4 } }, footStyles: { fontStyle: "bold", lineWidth: { top: 0.4 } },
        columnStyles: Object.fromEntries((widths || []).map((w, i) => [i, { cellWidth: w }]).concat(right.map(i => [i, { halign: "right", ...(widths && widths[i] ? { cellWidth: widths[i] } : {}) }]))),
        didParseCell: d => { if (d.section === "body" && d.column.index === 0 && b.table.boldFirst) d.cell.styles.fontStyle = "bold"; },
      });
      y = doc.lastAutoTable.finalY + 4;
    }
  }

  // Pied de page sur chaque page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(T(footer || ""), M, 297 - 10); doc.text(`${i} / ${pages}`, W - M, 297 - 10, { align: "right" });
  }
  return doc.output("blob");
}
