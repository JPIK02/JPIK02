// Plan de table v1 (docs/invites-v1.md, lot 4, 3.4) : tables dessinées, glisser-déposer (ou toucher une personne puis une table),
// alertes calculées sans IA, placement proposé par le coach (job `placer`, sans nom envoyé) puis appliqué sur validation, PDF.
// Règles dans agents/lib/plan.js (testées). `guests.table` = nom de la table, `guests.tableFixe` = placé à la main ; collection `tables`.
import { tablesDe, concernes, occupants, resume, alertes, besoinTables, clePaire, memeNom, PLACES_DEFAUT } from "../agents/lib/plan.js";
import { foyersDe, momentDe, nomFoyer, coteDe, estPlusUn } from "../agents/lib/invites.js";

// Textes d'interface (à traduire)
const UI = {
  titre: "Plan de table", retour: "Nos invités", ajouterTable: "Ajouter une table", brouillon: "Brouillon",
  brouillonP: "Les faire-part ne sont pas encore partis : brouillon avec toute la liste invitée au dîner.",
  ligne: (p, n, t) => `${p} placé${p > 1 ? "s" : ""} sur ${n} · ${t} table${t > 1 ? "s" : ""}`,
  videT: "Pas encore de table", videP: (n, t) => `${n} personne${n > 1 ? "s" : ""} au dîner : ${t > 1 ? `${t} tables de ${PLACES_DEFAUT} suffisent` : `une table de ${PLACES_DEFAUT} suffit`}.`,
  creerN: (t) => `Créer ${t} table${t > 1 ? "s" : ""} de ${PLACES_DEFAUT}`, tablesCreees: n => `${n} table${n > 1 ? "s" : ""} créée${n > 1 ? "s" : ""}`,
  honneur: "Table d'honneur", enfants: "Table des enfants", sur: (n, p) => `${n} / ${p}`,
  alertes: "À vérifier", al: {
    plein: a => `${a.tables[0]} : ${a.n} personnes pour ${a.places} places`,
    foyer: (a, nom) => `${nom} est séparé entre ${a.tables.join(" et ")}`,
    enfant: (a, n) => `${n} est loin de ses parents (${a.tables[0]})`,
    separer: (a, n1, n2) => `${n1} et ${n2} sont à la même table (${a.tables[0]}), alors qu'ils sont à séparer`,
  },
  aPlacer: n => `À placer · ${n}`, toutPlace: "Tout le monde a sa place.", aideTiroir: "Glissez une personne sur une table, ou touchez-la puis touchez la table.",
  choisie: n => `${n} : touchez une table`, annulerChoix: "Annuler",
  pdf: "PDF du plan", coach: n => `Placer les ${n} avec le coach`, coachBusy: "Le coach place vos invités…", coachErr: e => `Le placement n'a pas pu être proposé : ${e}`,
  separerLien: "Personnes à séparer", listeLien: "Vue en liste (ancienne)",
  place: (n, t) => `${n} → ${t}`, retire: n => `${n} n'a plus de place`,
  // feuille d'une table
  nomTable: "Nom de la table", places: "Places", moins: "Une place de moins", plus: "Une place de plus", forme: "Forme", ronde: "Ronde", rect: "Rectangle",
  assis: "À cette table", personne: "Personne pour l'instant.", retirer: "Retirer", ajouterIci: "Ajouter à cette table", fermer: "Fermer",
  supprimer: "Supprimer la table", supprimee: t => `${t} supprimée : ses invités sont à placer`, renommee: t => `Table renommée « ${t} »`, nomPris: "Une autre table porte déjà ce nom.",
  // à séparer
  sepT: "Personnes à séparer", sepP: "Le coach ne les place jamais ensemble, et une alerte vous prévient si elles se retrouvent à la même table.", sepAucune: "Aucune pour l'instant.",
  sepA: "Première personne", sepB: "Deuxième personne", sepAjouter: "Ajouter", sepRetirer: "Retirer", sepOk: "Noté : à séparer",
  // proposition du coach
  propT: "La proposition du coach", propP: (p, n) => `${p} personne${p > 1 ? "s" : ""} placée${p > 1 ? "s" : ""} sur ${n} à placer. Les personnes placées à la main ne bougent pas.`,
  propVide: "Le coach n'a trouvé personne à placer.", deja: "déjà là", appliquer: "Appliquer ce plan", applique: n => `${n} personne${n > 1 ? "s" : ""} placée${n > 1 ? "s" : ""}`,
  voirProp: "Voir la proposition du coach", autre: "Une autre proposition",
  // PDF
  pdfDoc: "Plan de table", pdfK: ["Placés", "Tables", "À placer"], pdfEnfant: "enfant",
};
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export function makePlan(ctx) {
  const { S, esc } = ctx;
  const moment = () => momentDe(foyersDe(S.guests, S.foyers || []));
  const gens = () => concernes(S.guests, { settings: S.settings, moment: moment() });
  const T = () => tablesDe(S.tables || [], S.guests);
  const separer = () => (Array.isArray((S.plan || {}).separer) ? S.plan.separer : []);
  const nomP = g => (estPlusUn(g) && !String(g.name || "").replace(/^\s*\+\s*1\s*/, "").trim() ? "+1" : g.name || "");
  const tableDe = id => T().find(t => t.id === id);

  /* ---------- dessin d'une table ---------- */
  function dessin(t, occ) {
    const n = Math.max(t.places, occ.length), seats = [], r = n > 12 ? 6.5 : 8.5;
    if (t.forme === "rect") {
      const haut = Math.ceil(n / 2), bas = n - haut, pos = (k, i) => 18 + (64 * (i + 0.5)) / k;
      for (let i = 0; i < haut; i++) seats.push([pos(haut, i), 24]);
      for (let i = 0; i < bas; i++) seats.push([pos(bas, i), 76]);
    } else for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; seats.push([50 + 39 * Math.cos(a), 50 + 39 * Math.sin(a)]); }
    const centre = t.forme === "rect" ? `<rect x="14" y="36" width="72" height="28" rx="6" class="pt-plateau"/>` : `<circle cx="50" cy="50" r="25" class="pt-plateau"/>`;
    return `<svg class="pt-svg" viewBox="0 0 100 100" aria-hidden="true">${centre}${seats.map(([x, y], i) => { const g = occ[i];
      return g ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" class="pt-s s-${coteDe(g)}${i >= t.places ? " trop" : ""}"/><text x="${x.toFixed(1)}" y="${(y + 2.3).toFixed(1)}" class="pt-i">${esc(estPlusUn(g) ? "+1" : ctx.initials(g.name))}</text>`
        : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" class="pt-s libre"/>`; }).join("")}</svg>`;
  }
  function carteTable(t, G, mauvaises) {
    const occ = occupants(t, G).sort((a, b) => String(a.foyerId || a.id).localeCompare(String(b.foyerId || b.id)));
    return `<button class="pt-t ${t.honneur ? "honneur" : ""} ${mauvaises.has(t.nom) ? "bad" : ""} ${S.ui.ptSel ? "cible" : ""}" data-act="pttable" data-id="${esc(t.id)}" data-tnom="${esc(t.nom)}"
      aria-label="${esc(`${t.nom}, ${occ.length} sur ${t.places} places${S.ui.ptSel ? ". Toucher pour y placer la personne choisie" : ""}`)}">
      ${dessin(t, occ)}<b>${esc(t.nom)}</b><span class="num">${UI.sur(occ.length, t.places)}${t.honneur ? ` · ${UI.honneur}` : t.enfants ? ` · ${UI.enfants}` : ""}</span></button>`;
  }
  function texteAlerte(a) {
    if (a.k === "plein") return UI.al.plein(a);
    if (a.k === "foyer") return UI.al.foyer(a, nomFoyer(a.foyer));
    if (a.k === "enfant") return UI.al.enfant(a, nomP(a.personne));
    return UI.al.separer(a, nomP(a.personnes[0]), nomP(a.personnes[1]));
  }

  /* ---------- page ---------- */
  function vPlan() {
    if (S.f.tView === "placement") return vPlacement();
    if (S.f.tView === "liste") { document.body.classList.remove("on-plan-bar"); return ctx.ancienne(); }
    const G = gens(), tables = T(), r = resume(tables, G), fs = foyersDe(S.guests, S.foyers || []);
    const al = alertes({ tables, gens: G, foyers: fs, separer: separer() }), mauvaises = new Set(al.flatMap(a => a.tables));
    const hon = tables.filter(t => t.honneur), autres = tables.filter(t => !t.honneur), libres = G.filter(g => !tables.some(t => memeNom(t.nom, g.table)));
    const sel = S.ui.ptSel && S.guests.find(g => g.id === S.ui.ptSel);
    const tiroir = S.canWrite && tables.length;
    document.body.classList.toggle("on-plan-bar", !!tiroir);
    return `<div class="pr bu iv pt ${tiroir ? "has-tiroir" : ""}"><section class="pr-head bu-head iv-head">
      <div class="pr-top"><button class="pr-round" data-act="ptretour" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-act="ptajout" aria-label="${UI.ajouterTable}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <p class="pt-ligne">${esc(UI.ligne(r.places, r.total, r.tables))}${moment() === 1 ? ` <span class="pt-brouillon">${UI.brouillon}</span>` : ""}</p>
      ${moment() === 1 ? `<p class="pt-note">${UI.brouillonP}</p>` : ""}</section>
      ${!tables.length ? `<section class="pr-card bu-arb"><span class="ev-tag">${UI.videT}</span><p>${esc(UI.videP(G.length, besoinTables(G.length)))}</p>
        ${S.canWrite ? `<div class="pl-acts"><button class="btn primary" data-act="ptcreer">${UI.creerN(besoinTables(G.length))}</button><button class="btn" data-act="ptajout">${UI.ajouterTable}</button></div>` : ""}</section>` : ""}
      ${hon.length ? `<div class="pt-hon">${hon.map(t => carteTable(t, G, mauvaises)).join("")}</div>` : ""}
      ${autres.length ? `<div class="pt-grid">${autres.map(t => carteTable(t, G, mauvaises)).join("")}</div>` : ""}
      ${al.length ? `<section class="pr-sec"><h3 class="home-h">${UI.alertes}</h3><ul class="pt-al">${al.map(a => `<li>${esc(texteAlerte(a))}</li>`).join("")}</ul></section>` : ""}
      ${S.placement && S.placement.tables && S.placement.tables.length && S.canWrite ? `<button class="pr-row bu-pdf" data-act="ptprop"><span class="pr-rb"><b>${UI.voirProp}</b></span>${ctx.CHEV}</button>` : ""}
      ${!tiroir && tables.length ? `<button class="btn" data-act="ptpdf">${UI.pdf}</button>` : ""}
      <div class="iv-bas">${S.canWrite ? `<button class="link" data-act="ptsep">${UI.separerLien}${separer().length ? ` (${separer().length})` : ""}</button>` : ""}<button class="link" data-act="ptliste">${UI.listeLien}</button></div>
      ${tiroir ? `<section class="pt-tiroir" aria-label="${esc(UI.aPlacer(libres.length))}">
        <div class="pt-th"><b>${UI.aPlacer(libres.length)}</b>${sel ? `<span class="pt-sel">${esc(UI.choisie(nomP(sel)))} <button class="link" data-act="ptdesel">${UI.annulerChoix}</button></span>` : `<span>${libres.length ? UI.aideTiroir : UI.toutPlace}</span>`}</div>
        ${libres.length ? `<div class="pt-chips">${libres.sort((a, b) => String(a.group || "").localeCompare(b.group || "") || String(a.foyerId || a.id).localeCompare(String(b.foyerId || b.id))).map(g => `<button class="pt-chip ${S.ui.ptSel === g.id ? "on" : ""}" data-act="ptsel" data-gid="${g.id}" aria-pressed="${S.ui.ptSel === g.id}">
          <span class="iv-av s-${coteDe(g)} ${estPlusUn(g) ? "plus" : ""}" aria-hidden="true">${estPlusUn(g) ? "+1" : esc(ctx.initials(g.name))}</span>${esc(nomP(g))}</button>`).join("")}</div>` : ""}
        ${S.ui.ptErr ? `<p class="brief-err" role="alert">${esc(UI.coachErr(S.ui.ptErr))}</p>` : ""}
        <div class="pt-acts"><button class="btn" data-act="ptpdf">${UI.pdf}</button>${libres.length ? `<button class="btn primary" data-act="ptcoach" ${S.ui.ptBusy ? "disabled" : ""}>${S.ui.ptBusy ? UI.coachBusy : UI.coach(libres.length)}</button>` : ""}</div>
      </section>` : ""}</div>`;
  }

  /* ---------- placer, retirer ---------- */
  async function placer(gid, tnom) {
    const g = S.guests.find(x => x.id === gid); if (!g) return;
    const avant = { table: g.table || "", tableFixe: !!g.tableFixe };
    S.ui.ptSel = null;
    if (await ctx.patch("guests", gid, { table: tnom, tableFixe: true })) ctx.toastUndo(UI.place(nomP(g), tnom), () => ctx.patch("guests", gid, avant));
    ctx.render(); majFeuille();
  }
  async function retirer(gid) {
    const g = S.guests.find(x => x.id === gid); if (!g) return;
    const avant = { table: g.table || "", tableFixe: !!g.tableFixe };
    if (await ctx.patch("guests", gid, { table: "", tableFixe: false })) ctx.toastUndo(UI.retire(nomP(g)), () => ctx.patch("guests", gid, avant));
    majFeuille();
  }
  // une table « virtuelle » (nom sur des fiches seulement) devient un document à sa première modification
  async function tableReelle(t) { if (!t.virtuel) return t.id; const id = await ctx.addDoc("tables", { nom: t.nom, places: t.places, forme: t.forme, ordre: Date.now() }); if (id && S.ui.ptTable === t.id) S.ui.ptTable = id; return id; }
  const prochainNom = () => { const ns = T().map(t => t.nom); let i = 1; while (ns.some(n => memeNom(n, `Table ${i}`))) i++; return `Table ${i}`; };
  async function ajouterTable() { const id = await ctx.addDoc("tables", { nom: prochainNom(), places: PLACES_DEFAUT, forme: "ronde", ordre: Date.now() }); if (id) setTimeout(() => ouvrirTable(id), 300); }
  async function creerTables() {
    const n = besoinTables(gens().length), ids = [];
    for (let i = 0; i < n; i++) { const id = await ctx.addDoc("tables", { nom: prochainNomApres(ids.length), places: PLACES_DEFAUT, forme: "ronde", ordre: Date.now() + i }); if (id) ids.push(id); }
    ctx.toastUndo(UI.tablesCreees(ids.length), async () => { for (const id of ids) await ctx.remove("tables", id); });
  }
  const prochainNomApres = k => { const ns = T().map(t => t.nom); let i = 1, vus = 0; for (;;) { if (!ns.some(n => memeNom(n, `Table ${i}`))) { if (vus === k) return `Table ${i}`; vus++; } i++; } };

  /* ---------- feuille d'une table ---------- */
  function feuille(t) {
    const G = gens(), occ = occupants(t, G), libres = G.filter(g => !T().some(x => memeNom(x.nom, g.table)));
    return `<h3>${esc(t.nom)}</h3>
      <label class="pl-f"><span>${UI.nomTable}</span><input data-ptnom="${esc(t.id)}" value="${esc(t.nom)}" maxlength="40" autocomplete="off"></label>
      <p class="brief-err" id="pt-err" role="alert"></p>
      <div class="pt-reg"><div class="pl-f"><span>${UI.places}</span><div class="bu-step"><button class="btn sm" data-act="ptplaces" data-id="${esc(t.id)}" data-d="-1" aria-label="${UI.moins}" ${t.places <= 1 ? "disabled" : ""}>−</button><b class="num">${t.places}</b><button class="btn sm" data-act="ptplaces" data-id="${esc(t.id)}" data-d="1" aria-label="${UI.plus}">+</button></div></div>
        <div class="pl-f"><span>${UI.forme}</span><div class="seg" role="group" aria-label="${UI.forme}">${[["ronde", UI.ronde], ["rect", UI.rect]].map(([k, l]) => `<button data-act="ptforme" data-id="${esc(t.id)}" data-v="${k}" aria-pressed="${t.forme === k}">${l}</button>`).join("")}</div></div></div>
      <div class="iv-moments"><button class="chip ${t.honneur ? "acc" : ""}" data-act="ptdrap" data-id="${esc(t.id)}" data-k="honneur" aria-pressed="${!!t.honneur}">${UI.honneur}</button><button class="chip ${t.enfants ? "acc" : ""}" data-act="ptdrap" data-id="${esc(t.id)}" data-k="enfants" aria-pressed="${!!t.enfants}">${UI.enfants}</button></div>
      <h4 class="home-h">${UI.assis} · ${occ.length} / ${t.places}</h4>
      <div class="pr-box">${occ.length ? occ.map(g => `<div class="iv-p"><span class="iv-av s-${coteDe(g)} ${estPlusUn(g) ? "plus" : ""}" aria-hidden="true">${estPlusUn(g) ? "+1" : esc(ctx.initials(g.name))}</span><span class="pr-rb"><b>${esc(nomP(g))}</b><span>${esc([g.group, g.enfant ? UI.pdfEnfant : ""].filter(Boolean).join(" · "))}</span></span><button class="link" data-act="ptretirer" data-gid="${g.id}">${UI.retirer}</button></div>`).join("") : `<p class="ev-note">${UI.personne}</p>`}</div>
      ${libres.length ? `<h4 class="home-h">${UI.ajouterIci}</h4><div class="pt-chips wrap">${libres.map(g => `<button class="pt-chip" data-act="ptici" data-gid="${g.id}" data-tnom="${esc(t.nom)}"><span class="iv-av s-${coteDe(g)}" aria-hidden="true">${estPlusUn(g) ? "+1" : esc(ctx.initials(g.name))}</span>${esc(nomP(g))}</button>`).join("")}</div>` : ""}
      <div class="acts"><button type="button" class="link iv-retirer" data-act="ptsuppr" data-id="${esc(t.id)}">${UI.supprimer}</button><div><button type="button" class="btn" data-close="1">${UI.fermer}</button></div></div>`;
  }
  function ouvrirTable(id) {
    const t = tableDe(id); if (!t) return; S.ui.ptTable = id;
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick pt-feuille" role="dialog" aria-modal="true" aria-label="${esc(t.nom)}"><div id="pt-feuille">${feuille(t)}</div></div></div>`);
  }
  function majFeuille() { setTimeout(() => { const el = document.getElementById("pt-feuille"), t = S.ui.ptTable && tableDe(S.ui.ptTable); if (el && t) el.innerHTML = feuille(t); }, 250); }
  async function champTable(id, o) { const t = tableDe(id); if (!t) return; const rid = await tableReelle(t); if (rid) await ctx.patch("tables", rid, o); majFeuille(); }
  async function renommer(id, nom) {
    const t = tableDe(id), err = document.getElementById("pt-err"); nom = String(nom || "").trim().slice(0, 40); if (!t || !nom || nom === t.nom) return;
    if (T().some(x => x.id !== id && memeNom(x.nom, nom))) { if (err) err.textContent = UI.nomPris; return; }
    const rid = await tableReelle(t); if (!rid) return; const ancien = t.nom, qui = S.guests.filter(g => memeNom(g.table, ancien)).map(g => g.id);
    await ctx.patch("tables", rid, { nom }); for (const gid of qui) await ctx.patch("guests", gid, { table: nom });
    ctx.toastUndo(UI.renommee(nom), async () => { await ctx.patch("tables", rid, { nom: ancien }); for (const gid of qui) await ctx.patch("guests", gid, { table: ancien }); });
    majFeuille();
  }
  async function supprimer(id) {
    const t = tableDe(id); if (!t) return; ctx.closeModal(); S.ui.ptTable = null;
    const qui = S.guests.filter(g => memeNom(g.table, t.nom)).map(g => [g.id, { table: g.table, tableFixe: !!g.tableFixe }]), doc = !t.virtuel && (S.tables || []).find(x => x.id === t.id);
    for (const [gid] of qui) await ctx.patch("guests", gid, { table: "", tableFixe: false });
    if (doc) await ctx.remove("tables", doc.id);
    ctx.toastUndo(UI.supprimee(t.nom), async () => { if (doc) { const { id: _i, ...d } = doc; await ctx.setRaw(`tables/${doc.id}`, d); } for (const [gid, a] of qui) await ctx.patch("guests", gid, a); });
  }

  /* ---------- personnes à séparer ---------- */
  function feuilleSep() {
    const G = gens().slice().sort((a, b) => nomP(a).localeCompare(nomP(b))), nomDe = id => nomP(S.guests.find(g => g.id === id) || {});
    const opts = G.map(g => `<option value="${g.id}">${esc(nomP(g))}</option>`).join("");
    return `<h3>${UI.sepT}</h3><p class="ev-note">${UI.sepP}</p>
      <div class="pr-box">${separer().length ? separer().map(p => { const [a, b] = p.split("|"); return `<div class="iv-p"><span class="pr-rb"><b>${esc(nomDe(a))} · ${esc(nomDe(b))}</b></span><button class="link" data-act="ptsepout" data-p="${esc(p)}">${UI.sepRetirer}</button></div>`; }).join("") : `<p class="ev-note">${UI.sepAucune}</p>`}</div>
      <div class="pt-reg"><label class="pl-f"><span>${UI.sepA}</span><select id="pt-sa">${opts}</select></label><label class="pl-f"><span>${UI.sepB}</span><select id="pt-sb">${opts}</select></label></div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.fermer}</button><button type="button" class="btn primary" data-act="ptsepin">${UI.sepAjouter}</button></div></div>`;
  }
  const ouvrirSep = () => ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.sepT}"><div id="pt-sep">${feuilleSep()}</div></div></div>`);
  const majSep = () => setTimeout(() => { const el = document.getElementById("pt-sep"); if (el) el.innerHTML = feuilleSep(); }, 250);
  async function setSeparer(l) { await ctx.setMeta("plan", { separer: l }); majSep(); }

  /* ---------- placement par le coach ---------- */
  async function demanderCoach() {
    if (S.ui.ptBusy) return; S.ui.ptBusy = true; S.ui.ptErr = null; ctx.render();
    try { const r = await ctx.runAgentNow("placer"); if (r && r.ok === false) S.ui.ptErr = r.erreur || "erreur"; else { if (r && r.placement) S.placement = r.placement; S.f.tView = "placement"; ctx.saveF(); } }
    catch (e) { S.ui.ptErr = e.message || "erreur"; }
    S.ui.ptBusy = false; ctx.render(); window.scrollTo(0, 0);
  }
  function vPlacement() {
    document.body.classList.remove("on-plan-bar");
    const p = S.placement || {}, l = (p.tables || []).filter(t => t.ids.length), G = gens(), nomDe = id => nomP(S.guests.find(g => g.id === id) || {});
    const enTout = l.reduce((n, t) => n + t.ids.length, 0);
    return `<div class="ev-page pl-tache iv-page bu-arbp"><button class="link env-back" data-act="ptmain">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.propT}</h2><p class="ev-note">${l.length ? esc(UI.propP(enTout, p.aPlacer || enTout)) : UI.propVide}</p>
      ${l.map(t => { const tb = T().find(x => memeNom(x.nom, t.nom)), deja = tb ? occupants(tb, G).filter(g => g.tableFixe) : [];
        return `<div class="pr-card pt-prop"><b>${esc(t.nom)}</b>${t.pourquoi ? `<p>${esc(t.pourquoi)}</p>` : ""}<div class="iv-membres">${deja.map(g => `<span class="chip">${esc(nomP(g))} · ${UI.deja}</span>`).join("")}${t.ids.map(id => `<span class="chip acc">${esc(nomDe(id))}</span>`).join("")}</div></div>`; }).join("")}
      ${S.canWrite ? `<button class="link" data-act="ptcoach">${UI.autre}</button>` : ""}
      ${l.length && S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><b class="num">${enTout}</b><span>${UI.applique(enTout).replace(/^\d+ /, "")}</span></div><button class="btn primary" data-act="ptappliquer">${UI.appliquer}</button></div>` : ""}</div>`;
  }
  async function appliquer() {
    const l = ((S.placement || {}).tables || []), avant = [];
    for (const t of l) for (const id of t.ids) { const g = S.guests.find(x => x.id === id); if (!g || g.tableFixe) continue; avant.push([id, { table: g.table || "", tableFixe: !!g.tableFixe }]); await ctx.patch("guests", id, { table: t.nom, tableFixe: false }); }
    await ctx.setMeta("placement", { tables: [], appliqueLe: Date.now() });
    S.f.tView = "main"; ctx.saveF(); ctx.render(); window.scrollTo(0, 0);
    ctx.toastUndo(UI.applique(avant.length), async () => { for (const [id, a] of avant) await ctx.patch("guests", id, a); });
  }

  /* ---------- PDF ---------- */
  function pdf() {
    const G = gens(), tables = T(), r = resume(tables, G);
    const blocks = [{ kpis: [[UI.pdfK[0], `${r.places} / ${r.total}`, ""], [UI.pdfK[1], String(r.tables), ""], [UI.pdfK[2], String(r.aPlacer), ""]] }];
    if (moment() === 1) blocks.push({ note: UI.brouillonP });
    for (const t of tables) { const occ = occupants(t, G); blocks.push({ h3: `${t.nom} · ${occ.length} / ${t.places}${t.honneur ? ` · ${UI.honneur}` : t.enfants ? ` · ${UI.enfants}` : ""}` }, occ.length ? { ul: occ.map(g => `${nomP(g)}${g.enfant ? ` (${UI.pdfEnfant})` : ""}`) } : { note: UI.personne }); }
    const libres = G.filter(g => !tables.some(t => memeNom(t.nom, g.table)));
    if (libres.length) blocks.push({ h2: UI.aPlacer(libres.length) }, { ul: libres.map(nomP) });
    ctx.makePdf("plan-de-table.pdf", { docTitle: UI.pdfDoc, blocks });
  }

  /* ---------- glisser-déposer (doigt ou souris) : une personne du tiroir vers une table ---------- */
  let drag = null;
  const sousLeDoigt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest(".pt-t"); };
  document.addEventListener("pointerdown", e => {
    const c = e.target.closest && e.target.closest(".pt-tiroir .pt-chip"); if (!c || !S.canWrite || e.button > 0) return;
    drag = { gid: c.dataset.gid, x: e.clientX, y: e.clientY, el: null, c, cible: null };
  });
  document.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.el) {
      if (Math.abs(dy) < 10 || Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 10) drag = null; return; } // geste horizontal : on laisse défiler
      drag.el = drag.c.cloneNode(true); drag.el.classList.add("pt-fantome"); document.body.appendChild(drag.el); document.body.classList.add("pt-drag");
    }
    e.preventDefault();
    drag.el.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 24}px)`;
    // près du tiroir ou du haut de l'écran : la page défile pour atteindre les tables cachées
    const tir = document.querySelector(".pt-tiroir"), bas = tir ? tir.getBoundingClientRect().top : innerHeight;
    drag.vit = e.clientY > bas - 70 ? 12 : e.clientY < 90 ? -12 : 0; drag.px = e.clientX; drag.py = e.clientY;
    if (drag.vit && !drag.raf) { const pas = () => { if (!drag || !drag.vit) { if (drag) drag.raf = null; return; } scrollBy(0, drag.vit); survol(drag.px, drag.py); drag.raf = requestAnimationFrame(pas); }; drag.raf = requestAnimationFrame(pas); }
    survol(e.clientX, e.clientY);
  }, { passive: false });
  function survol(x, y) {
    if (!drag) return;
    const t = sousLeDoigt(x, y);
    if (t !== drag.cible) { if (drag.cible) drag.cible.classList.remove("survol"); if (t) t.classList.add("survol"); drag.cible = t; }
  }
  const fin = () => {
    if (!drag) return; const d = drag; drag = null; if (d.raf) cancelAnimationFrame(d.raf);
    if (!d.el) return; d.el.remove(); document.body.classList.remove("pt-drag");
    if (d.cible) { d.cible.classList.remove("survol"); placer(d.gid, d.cible.dataset.tnom); }
    window.__ptSansClic = Date.now(); // le clic qui suit un glisser n'est pas un toucher
  };
  document.addEventListener("pointerup", fin); document.addEventListener("pointercancel", () => { if (drag && drag.el) { drag.el.remove(); document.body.classList.remove("pt-drag"); if (drag.cible) drag.cible.classList.remove("survol"); } drag = null; });

  /* ---------- gestes ---------- */
  const show = (v) => { S.f.tView = v; ctx.saveF(); ctx.render(); window.scrollTo(0, 0); };
  function act(a, t) {
    if (Date.now() - (window.__ptSansClic || 0) < 400 && (a === "ptsel" || a === "pttable")) return true;
    const id = t.dataset.id;
    switch (a) {
      case "ptretour": S.f.tView = "main"; ctx.saveF(); ctx.go("invites"); return true;
      case "ptmain": show("main"); return true;
      case "ptliste": show("liste"); return true;
      case "ptprop": show("placement"); return true;
      case "ptajout": ajouterTable(); return true;
      case "ptcreer": creerTables(); return true;
      case "ptsel": S.ui.ptSel = S.ui.ptSel === t.dataset.gid ? null : t.dataset.gid; ctx.render(); return true;
      case "ptdesel": S.ui.ptSel = null; ctx.render(); return true;
      case "pttable": if (S.ui.ptSel && S.canWrite) placer(S.ui.ptSel, t.dataset.tnom); else ouvrirTable(id); return true;
      case "ptici": placer(t.dataset.gid, t.dataset.tnom); return true;
      case "ptretirer": retirer(t.dataset.gid); return true;
      case "ptplaces": { const x = tableDe(id); if (x) champTable(id, { places: Math.max(1, x.places + +t.dataset.d) }); return true; }
      case "ptforme": champTable(id, { forme: t.dataset.v }); return true;
      case "ptdrap": { const x = tableDe(id); if (x) champTable(id, { [t.dataset.k]: !x[t.dataset.k] }); return true; }
      case "ptsuppr": supprimer(id); return true;
      case "ptsep": ouvrirSep(); return true;
      case "ptsepin": { const a1 = (document.getElementById("pt-sa") || {}).value, b1 = (document.getElementById("pt-sb") || {}).value; if (!a1 || !b1 || a1 === b1) return true;
        const k = clePaire(a1, b1); if (!separer().includes(k)) { setSeparer([...separer(), k]); ctx.toast(UI.sepOk); } return true; }
      case "ptsepout": setSeparer(separer().filter(p => p !== t.dataset.p)); return true;
      case "ptcoach": demanderCoach(); return true;
      case "ptappliquer": appliquer(); return true;
      case "ptpdf": pdf(); return true;
    }
    return false;
  }
  function change(el) { if (el.dataset && el.dataset.ptnom) { renommer(el.dataset.ptnom, el.value); return true; } return false; }
  return { vPlan, act, change };
}
