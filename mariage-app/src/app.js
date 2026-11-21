// Polices Lamaelle hébergées avec l'app (pas de Google Fonts : RGPD) : Jost pour l'interface, Cormorant Garamond italique pour les accroches
import "@fontsource/jost/300.css";import "@fontsource/jost/400.css";import "@fontsource/jost/500.css";import "@fontsource/jost/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";import "@fontsource/cormorant-garamond/500-italic.css";
import {db,auth,signInGoogle,sendEmailLink,completeEmailLink,signOut,ALLOWED,callAssistant,runAgentNow} from "./firebase.js";
import {QCATS} from "./questions.js"; // ancien questionnaire : archive lisible (synthèse, réponses archivées)
import {TUILES} from "../agents/lib/envies/catalogue.js";
import {FR as FR_ENVIES} from "../agents/lib/envies/fr.js";
import {OLD2TILE,METIER2TILE} from "../agents/lib/envies/logic.js";
import {makeEnvies} from "./envies-ui.js";
import {PROFILES,FEATURES,USD_EUR,DEFAULT_BUDGET_EUR,monthKey} from "../agents/lib/usage.js";
// Ne touche au DOM que si le contenu a changé : remplacer la page pendant un défilement
// coupe l'élan sur iPhone et remet les barres horizontales au début.
const setHTML=(el,h)=>{if(el&&el._h!==h){el._h=h;el.innerHTML=h}};


/* ---------- Constants ---------- */
// Navigation : 4 sections principales (Coach, Planning, Prestataires, Nos envies) ; Agenda et Plan de table
// sont des sous-onglets de Planning et d'Invités ; le reste (dont Invités) est dans « Plus ».
const VIEWS=[
  ["apercu","Coach"],["planning","Planning"],["prestataires","Prestataires"],["envies","Nos envies"],
  ["invites","Invités"],["budget","Budget"],["jour-j","Jour J"],["assistant","E-mails"],["reglages","Réglages"]
];
const VIEW_NAMES=Object.assign(Object.fromEntries(VIEWS),{agenda:"Agenda",tables:"Plan de table","reglages-ia":"Agents IA"});
const PARENT_VIEW={agenda:"planning",tables:"invites","reglages-ia":"reglages"};
const subnav=(items)=>`<div class="seg subnav" role="tablist">${items.map(([k,l])=>`<button role="tab" data-go="${k}" aria-selected="${S.view===k}" aria-pressed="${S.view===k}">${l}</button>`).join("")}</div>`;
const JOBS={
  mail:{label:"Lecture de la boîte mail",intro:"L'assistant lit les nouveaux mails et prépare des propositions à valider.",def:{enabled:true,mode:"daily",h1:7,h2:19,day:1}},
  analyse:{label:"Analyse des prestataires",intro:"L'agent cherche les avis en ligne et met à jour les notes de fit et la synthèse de vos envies.",def:{enabled:true,mode:"daily",h1:8,h2:20,day:1}}
};
const JOURS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MODES=[["hourly","Toutes les heures"],["daily","1 fois par jour"],["twice","2 fois par jour"],["weekly","1 fois par semaine"]];
/* Prénoms du couple : saisis dans Réglages (meta/settings.prenom1 et prenom2), jamais écrits dans le code.
   Les emplacements internes restent "claire" (partenaire 1) et "julien" (partenaire 2) : ce sont des clés de données. */
const P1=()=>String(S.settings&&S.settings.prenom1||"").trim()||"Partenaire 1";
const P2=()=>String(S.settings&&S.settings.prenom2||"").trim()||"Partenaire 2";
const COUPLE=(sep=" et ")=>`${P1()}${sep}${P2()}`;
const OWNERS={get claire(){return P1()},get julien(){return P2()},deux:"Les deux"};
const STATUS={todo:"À faire",doing:"En cours",done:"Fait"};
const SIDES={get claire(){return P1()},get julien(){return P2()},commun:"Commun"};
const RSVP={attente:"En attente",oui:"Présent",non:"Absent"};
const RSVP_CLS={attente:"warn",oui:"ok",non:"bad"};
const VSTAT={repere:"Repéré",contacte:"Contacté",devis:"Devis reçu",reserve:"Réservé",ecarte:"Écarté"};
const VSTAT_CLS={repere:"",contacte:"acc",devis:"warn",reserve:"ok",ecarte:"bad"};
const VSTAT_RANK={ecarte:0,repere:1,contacte:2,devis:3,reserve:4};
const VCATS=["Lieu","Traiteur","Bar","Pâtissier","Photographe","Vidéaste","Musique","Fleuriste","Tenues","Alliances","Coiffure & maquillage","Papeterie","Transport","Officiant","Hébergement","Animation enfants","Wedding planner","Agence de voyage","Autre"];
const KEY_VCATS=["Lieu","Traiteur","Photographe","Musique","Fleuriste","Tenues"];
const GROUPS=["Famille","Amis","Collègues","Voisins","Autre"];
const SUGTYPE={vendor:["Nouveau prestataire","acc"],quote:["Devis reçu","gold"],task:["Tâche","claire"],payment:["Paiement","warn"],rdv:["Rendez-vous","julien"],rsvp:["Réponse d'invité","ok"]};
const SUGACT={vendor:"Ajouter aux prestataires",quote:"Enregistrer le devis",task:"Ajouter au planning",payment:"Enregistrer l'échéance",rdv:"Ajouter à l'agenda",rsvp:"Mettre à jour l'invité"};

const addMonths=(d,m)=>{const x=new Date(d);x.setMonth(x.getMonth()+m);return x};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const PHASES=[
  {k:"m12",label:"12 mois avant",short:"J–12 mois",hint:"Les fondations",due:d=>addMonths(d,-9)},
  {k:"m9",label:"9 mois avant",short:"J–9 mois",hint:"Les prestataires clés",due:d=>addMonths(d,-6)},
  {k:"m6",label:"6 mois avant",short:"J–6 mois",hint:"Tenues, liste et site",due:d=>addMonths(d,-4)},
  {k:"m4",label:"4 mois avant",short:"J–4 mois",hint:"Faire-part et détails",due:d=>addMonths(d,-2)},
  {k:"m2",label:"2 mois avant",short:"J–2 mois",hint:"Mairie et confirmations",due:d=>addMonths(d,-1)},
  {k:"m1",label:"1 mois avant",short:"J–1 mois",hint:"Les derniers réglages",due:d=>addDays(d,-7)},
  {k:"s1",label:"La dernière semaine",short:"Dernière semaine",hint:"Soldes et logistique",due:d=>addDays(d,-1)},
  {k:"j",label:"Le jour J",short:"Jour J",hint:"",due:d=>d},
  {k:"apres",label:"Après le mariage",short:"Après",hint:"",due:d=>addMonths(d,2)}
];
const PH=Object.fromEntries(PHASES.map((p,i)=>[p.k,Object.assign({i},p)]));

/* ---------- State ---------- */
const COLS=["tasks","budget","guests","vendors","schedule","rdv","inbox","brief","envies","recompenses","envies_reperees","inspirations"];
const S={
  db:null,dl:true,user:null,mode:"loading",canWrite:true,pending:false,
  settings:{},agent:{},profil:{},analyse:{},planning:{},prefs:{},push:{},pushState:null,presence:{},locks:{},ia:{},briefs:{},pinterest:{},usage:{cur:{},prev:{}},cmp:{cat:null,ids:[],seeded:null},hebdo:{},photo:{},ui:{more:false,hebdo:false,onb:false,opts:{}},chat:{messages:[],busy:false,mode:"chat",loaded:false},tasks:[],budget:[],guests:[],inspirations:[],envies:[],recompenses:[],envies_reperees:[],qs:null,vendors:[],schedule:[],rdv:[],inbox:[],brief:[],
  got:new Set(),stale:false,view:"apercu",selMode:false,sel:new Set(),
  f:{owner:"all",hideDone:false,gSide:"all",gRsvp:"all",gq:"",vView:"actifs",vCat:"all",bcat:"vision",overview:false}
};

/* ---------- Interview (senior wedding planner brief) ---------- */
const QC=Object.fromEntries(QCATS.map(c=>[c.k,c]));
const VCAT2Q=Object.fromEntries(QCATS.filter(c=>c.vcat).map(c=>[c.vcat,c.k]));
const IMPORT=["Secondaire","Utile","Important","Très important","Essentiel"];
try{const saved=JSON.parse(localStorage.getItem("mariage-filtres")||"null");if(saved)Object.assign(S.f,saved,{gq:""})}catch(e){}
const saveF=()=>{try{localStorage.setItem("mariage-filtres",JSON.stringify(S.f))}catch(e){}};

/* ---------- Helpers ---------- */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pd=s=>s?new Date(String(s).slice(0,10)+"T12:00:00"):null;
const today=()=>{const t=new Date();t.setHours(12,0,0,0);return t};
const isoD=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const fmtD=(d,y=true)=>d?d.toLocaleDateString("fr-FR",y?{day:"numeric",month:"short",year:"numeric"}:{day:"numeric",month:"short"}):"";
const fmtLong=d=>d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const days=(a,b)=>Math.round((b-a)/86400000);
const eur=n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const num=v=>{const n=parseFloat(String(v??"").replace(/\s/g,"").replace(",","."));return isFinite(n)?n:0};
const wDate=()=>pd(S.settings.date);
const ownerChip=o=>`<span class="chip ${o==="claire"?"claire":o==="julien"?"julien":""}">${esc(OWNERS[o]||OWNERS.deux)}</span>`;
const taskDue=t=>{if(t.due)return pd(t.due);const d=wDate();const p=PH[t.phase];return d&&p?p.due(d):null};
const isLate=t=>{if(t.status==="done")return false;const d=taskDue(t);return !!d&&d<today()};
const byOrder=(a,b)=>(PH[a.phase]?.i??99)-(PH[b.phase]?.i??99)||(a.order??999)-(b.order??999)||String(a.title).localeCompare(b.title);
const relDay=d=>{const n=days(today(),d);return n===0?"aujourd'hui":n===1?"demain":n===-1?"hier":n>0?`dans ${n} j`:`il y a ${-n} j`};
const dateBox=(d,cls="")=>`<div class="datebox ${cls}"><b>${d.getDate()}</b><span>${d.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")}</span></div>`;
const currentPhase=()=>{const d=wDate();if(!d)return null;const t=today();return PHASES.find(p=>p.due(d)>=t)||PHASES[PHASES.length-1]};
const pendingSugs=()=>S.inbox.filter(s=>(s.status||"new")==="new");
const findVendor=name=>{const n=String(name||"").trim().toLowerCase();return n?S.vendors.find(v=>String(v.name||"").trim().toLowerCase()===n):null};
const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const MOIS=["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
// Catégorie de prestataire → poste de budget (par mots-clés du libellé du poste)
const CAT_BUDGET={Lieu:/lieu|salle|reception|domaine/,Traiteur:/traiteur|repas|boisson/,Photographe:/photo/,"Vidéaste":/video/,Musique:/musique|dj|orchestre/,Fleuriste:/fleur|deco/,Tenues:/tenue|robe|costume|costard/,Alliances:/alliance/,"Coiffure & maquillage":/coiff|maquill/,Papeterie:/papeterie|faire.?part/,Transport:/transport/,Officiant:/ceremonie|officiant/,"Hébergement":/heberg/,"Animation enfants":/enfant|animation/,Bar:/bar\b|boisson|vin|alcool/,"Pâtissier":/gateau|patiss|dessert/,"Wedding planner":/planner|organisat/,"Agence de voyage":/voyage|noces|lune de miel/};
// Les notes importées d'Excel contiennent un « 20 % du budget » figé : on l'enlève, la part est calculée en direct
const budgetNote=n=>String(n||"").replace(/\s*·?\s*\d+(?:[.,]\d+)?\s*%\s*du budget\s*·?\s*/gi," ").replace(/^\s*·\s*|\s*·\s*$/g,"").trim();
const budgetLineFor=cat=>{const re=CAT_BUDGET[cat];return re?S.budget.find(b=>re.test(fold(b.label))):null};
const lastBriefAt=()=>Math.max(S.brief.reduce((m,b)=>Math.max(m,b.updatedAt||0),0),env().lastAt());
async function mergeDoc(path,data){if(!S.db)return false;try{await S.db.doc(path).set(data,{merge:true});return true}catch(e){return writeErr(e)}}
/* Points à regarder : incohérences entre date, budget, devis, capacité, et actions en attente. */
/* Capacité d'accueil lue dans les notes (texte sans accents, en minuscules) : le plus grand nombre de personnes cité
   sur la ligne « capacité » (« 3 salles de 40 à 240 personnes » → 240 ; « jusqu'à 70 » → 70 ; « 100-200 » → 200).
   Les nombres de salles, d'espaces ou de chambres sont ignorés. Null si rien de sûr. */
function capacityFrom(n){
  const line=(String(n).split(/\n/).find(l=>/capacite/.test(l))||"").replace(/.*?capacite\s*:?/,"");
  if(!line)return null;
  const nums=[];const re=/(\d+)\s*(salles?|espaces?|chambres?|pieces?|lieux|couchages?)?/g;let m;
  while((m=re.exec(line))){if(!m[2])nums.push(+m[1])}
  const big=nums.filter(x=>x>=10);
  return big.length?Math.max(...big):null;
}
function alerts(){
  const out=[],d=wDate(),tot=num(S.settings.budgetTotal);
  const prevu=S.budget.reduce((s,b)=>s+num(b.prevu),0),engage=S.budget.reduce((s,b)=>s+num(b.engage),0);
  // le titre dit l'écart, la phrase donne les chiffres
  if(tot&&engage>tot)out.push({k:"budget",over:engage-tot,lvl:"bad",t:`${eur(engage-tot)} engagés au-delà du budget`,s:`${eur(engage)} engagés pour ${eur(tot)}.`,go:"budget"});
  else if(tot&&prevu>tot)out.push({k:"budget",over:prevu-tot,lvl:"bad",t:`${eur(prevu-tot)} au-dessus du budget`,s:`${eur(prevu)} prévus pour ${eur(tot)}.`,go:"budget"});
  const guests=S.guests.filter(g=>g.rsvp!=="non"&&g.diner!==false).length;
  S.vendors.filter(v=>v.status!=="ecarte").forEach(v=>{
    const note=String(v.note||""),n=fold(note);
    if(d&&!S.settings.dateIndicative&&/complet/.test(n)){
      const line=note.split(/\n/).find(l=>/complet/i.test(fold(l)))||"";
      if(new RegExp("complet[^\\n]*\\b"+MOIS[d.getMonth()]+"\\b").test(fold(line)))
        out.push({k:"complet",v,lvl:"bad",t:`${v.name} semble complet en ${MOIS[d.getMonth()].replace("fevrier","février").replace("aout","août")}`,s:`Vos notes : « ${line.trim()} ». La date retenue est le ${fmtD(d)}.`,fiche:v.id});
    }
    const mx=v.cat==="Lieu"?capacityFrom(n):null;
    if(mx){if(guests>mx)out.push({k:"cap",v,lvl:"warn",t:`${v.name} : ${guests-mx} invité${guests-mx>1?"s":""} de trop`,s:`${mx} personnes au maximum pour ${guests} invités au dîner.`,fiche:v.id})}
    const px=num(v.prix),line=budgetLineFor(v.cat);
    if(px&&line&&num(line.prevu)&&px>num(line.prevu)&&["devis","reserve"].includes(v.status))
      out.push({k:"devis",v,line,px,lvl:"warn",t:`Devis ${v.name} : +${eur(px-num(line.prevu))} sur l'enveloppe`,s:`${eur(px)} pour ${eur(num(line.prevu))} prévus au poste « ${line.label} ».`,fiche:v.id});
  });
  const late=S.tasks.filter(isLate).length;
  if(late)out.push({k:"late",lvl:"warn",t:`${late} tâche${late>1?"s":""} en retard`,s:"À reprogrammer ou à faire en priorité.",go:"planning"});
  const ps=pendingSugs().length;
  if(ps)out.push({k:"sugs",lvl:"info",t:`${ps} proposition${ps>1?"s":""} de l'assistant à valider`,s:"Devis, rendez-vous et tâches repérés dans vos mails.",go:"assistant"});
  const analysed=S.vendors.filter(v=>v.status!=="ecarte"&&v.fit&&v.fit.updatedAt);
  if(analysed.length&&allProg()<.3)out.push({k:"brief",lvl:"info",t:allProg()?`Lamaelle vous connaît à ${Math.round(allProg()*100)} %`:"Lamaelle apprend à vous connaître",s:"Les notes de fit des prestataires restent peu fiables tant que vos envies ne sont pas décrites.",go:"envies"});
  else if(analysed.length&&lastBriefAt()>Math.min(...analysed.map(v=>v.fit.updatedAt))+60000)
    out.push({k:"refit",lvl:"info",t:"Vos envies ont changé depuis l'analyse des prestataires",s:"Relancez l'analyse dans l'Annuaire pour mettre les notes de fit à jour.",go:"prestataires"});
  S.rdv.filter(r=>r.date&&pd(r.date)>=today()&&days(today(),pd(r.date))<=14).forEach(r=>{
    const v=findVendor(r.avec)||S.vendors.find(x=>fold(r.title).includes(fold(x.name)));
    const nq=v&&v.fit&&v.fit.questions?v.fit.questions.length:0;
    out.push({k:"rdv",r,v,lvl:"info",t:`${r.title} le ${fmtD(pd(r.date),false)} (${relDay(pd(r.date))})`,s:nq?`${nq} questions à poser préparées dans la fiche.`:"Pensez à préparer vos questions.",
      ts:`${r.title} · ${pd(r.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}`,ss:nq?`${nq} questions à poser, prêtes`:"Questions à préparer",fiche:v?v.id:null,edit:v?null:r.id});
  });
  const rank={bad:0,warn:1,info:2};
  return out.sort((a,b)=>rank[a.lvl]-rank[b.lvl]);
}
const alertRow=a=>`<button class="alert ${a.lvl}" ${a.fiche?`data-fiche="${a.fiche}"`:a.edit?`data-edit="rdv" data-id="${a.edit}"`:a.k==="late"?`data-act="qr" data-do="late:"`:`data-go="${a.go}"`}><span class="adot" aria-hidden="true"></span><span class="atx"><b>${esc(a.t)}</b><span>${esc(a.s)}</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>`;
/* ---------- Le coach à l'accueil : réponses rapides en un toucher ---------- */
// Quel partenaire est connecté (compte → emplacement) ; le prénom vient des réglages
const PARTNER={"julienpicquet@gmail.com":"julien","duquesne.claire@yahoo.fr":"claire","claiire.duquesne59@gmail.com":"claire"};
const prenom=()=>{const k=PARTNER[String(S.user&&S.user.email||"").toLowerCase()];return k==="claire"?P1():k==="julien"?P2():""};
const SPARK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/></svg>';
function qrFor(a){
  const v=a.v;
  switch(a.k){
    case "budget":return [["Voir le budget","go:budget"],["Que me conseilles-tu ?",`ask:Notre budget prévu dépasse le budget total de ${eur(a.over)}. Propose-moi 3 pistes concrètes pour revenir dans le budget.`]];
    case "complet":return [["Écarter ce lieu",`vstatus:${v.id}:ecarte`],["Ouvrir la fiche",`fiche:${v.id}`],["En parler au coach",`ask:${v.name} semble complet à notre date. Que nous conseilles-tu : changer de date ou de lieu ?`]];
    case "cap":return [["Ouvrir la fiche",`fiche:${v.id}`],["En parler au coach",`ask:${v.name} paraît trop petit pour nos invités. Quelles options avons-nous ?`]];
    case "devis":return [[`Passer l'enveloppe à ${eur(a.px)}`,`budgetset:${a.line.id}:${a.px}`],["Préparer une négociation",`ask:Rédige un mail cordial à ${v.name} pour négocier leur devis de ${eur(a.px)} : notre enveloppe « ${a.line.label} » est de ${eur(num(a.line.prevu))}.`],["Comparer",`compare:${v.cat}:${v.id}`]];
    case "late":return [["Voir les retards","late:"],["Replanifier avec le coach","ask:Aide-nous à replanifier nos tâches en retard de façon réaliste."]];
    case "sugs":return [["Voir les propositions","go:assistant"]];
    case "brief":return [["Commencer l'entretien","chatbrief"]];
    case "refit":return [["Relancer l'analyse","go:prestataires"]];
    case "rdv":return [["Préparer la visite",`ask:Prépare notre rendez-vous « ${a.r.title} » : les questions à poser et les points à vérifier sur place, en fonction de nos envies.`],...(v?[["Ouvrir la fiche",`fiche:${v.id}`]]:[])];
  }
  return [];
}
const qrBtns=list=>list.length?`<div class="qr">${list.map(([l,d],i)=>`<button class="${i===0?"on":""}" data-act="qr" data-do="${esc(d)}">${esc(l)}</button>`).join("")}</div>`:"";
const chMsg=(lvl,html,qr)=>`<div class="ch-msg ${lvl||""}">${html}${qrBtns(qr||[])}</div>`;
// Visites des 3 derniers jours sans notes de visite : le coach demande comment ça s'est passé
function visitsToTell(){
  const t=today();
  return S.rdv.filter(r=>r.date&&pd(r.date)<=t&&days(pd(r.date),t)<=3).map(r=>{
    const v=findVendor(r.avec)||S.vendors.find(x=>fold(r.title).includes(fold(x.name)));
    return v&&!((v.fitRequestedAt||0)>=+pd(r.date)-43200000)?{r,v}:null}).filter(Boolean);
}
function coupleAvatar(){
  const ph=S.photo&&S.photo.data;
  return `<button class="ch-photo ${ph?"has":""}" data-act="couplephoto" aria-label="${ph?"Changer la photo du couple":"Ajouter une photo du couple"}" ${S.canWrite?"":"disabled"}>${ph?`<img src="data:image/jpeg;base64,${ph}" alt="${esc(COUPLE())}">`:`<span>${esc(P1().charAt(0))}&amp;${esc(P2().charAt(0))}</span><i aria-hidden="true">+</i>`}</button>`;
}
/* ---------- Accueil (vue apercu), voir docs/accueil-v3.md (et docs/accueil-coach-v1.md pour le comportement) ----------
   Ouverture (photo et phrase du couple), « À faire » en visuels (jamais vide), point de la semaine sur une ligne, six tuiles chiffrées. */
const PUSH_CARD_KEY="lamaelle-push-card-off";
const pushCardOff=()=>{try{return localStorage.getItem(PUSH_CARD_KEY)==="1"}catch(e){return false}};
const WEEKDAYS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
function whenShort(d){const n=days(today(),d);return n>=-1&&n<=1?relDay(d):n>1&&n<7?WEEKDAYS[d.getDay()]:fmtD(d,false)}
function nextOpenTask(){
  return S.tasks.filter(t=>t.status!=="done").sort((a,b)=>{const da=taskDue(a),db=taskDue(b);if(da&&db&&+da!==+db)return da-db;if(da&&!db)return -1;if(db&&!da)return 1;return byOrder(a,b)})[0]||null;
}
// Ordre : alertes graves, propositions des mails, visites à raconter, alertes à surveiller puis d'information, notifications, sinon la prochaine tâche
// Un point « À faire » : id, niveau, étiquette, titre et texte (HTML échappé), réponses rapides, version courte pour les lignes
// Un point « À faire » : type (k), niveau, réponses rapides et données utiles au visuel et au titre court (a)
const todoItem=(id,k,lvl,qr,a={})=>({id,k,lvl,qr,a});
function todoCards(al){
  const cards=[],card=(a,i)=>todoItem("al-"+(a.k||"")+"-"+(a.v?a.v.id:a.r?a.r.id:i),a.k,a.lvl,qrFor(a),a);
  al.filter(a=>a.lvl==="bad").forEach((a,i)=>cards.push(card(a,i)));
  const ps=pendingSugs().length;
  if(ps)cards.push(todoItem("sugs","sugs","sug",[["Valider en un geste","go:assistant"]],{n:ps}));
  visitsToTell().forEach(({r,v})=>cards.push(todoItem("visit-"+r.id,"visit","info",[["Raconter la visite",`prefill:Visite de ${v.name} : `]],{r,v})));
  al.filter(a=>a.lvl!=="bad"&&a.k!=="sugs").forEach((a,i)=>cards.push(card(a,i)));
  if((S.pushState==="off"||S.pushState==="install")&&!pushCardOff())cards.push(todoItem("push","push","info",S.pushState==="off"?[["Activer les notifications","pushon:"],["Ne plus proposer","pushhide:"]]:[["Voir dans Réglages","go:reglages"],["Ne plus proposer","pushhide:"]]));
  if(!cards.length){
    const t=nextOpenTask();
    cards.push(t?todoItem("next-"+t.id,"next","next",[["Voir dans le planning",`task:${t.id}`]],{t}):todoItem("next","next","next",[["Par quoi continuer ?","ask:Par quoi commencer cette semaine ?"]]));
  }
  return cards;
}
// Titre court (l'écart ou l'objet) et ligne (l'action), en texte brut
function todoShort(c){
  const a=c.a||{},v=a.v,pl=(n,s,p)=>`${n} ${n>1?p:s}`;
  switch(c.k){
    case "budget":return /engag/.test(a.t||"")?[`+${eur(a.over)} engagés`,"Au-delà du budget"]:[`+${eur(a.over)} sur le budget`,"À trouver ou à couper"];
    case "complet":return [`${v.name} complet ?`,"À vérifier ou à écarter"];
    case "cap":return [`${v.name} trop petit`,"Capacité à vérifier"];
    case "devis":return [`Devis ${v.name} +${eur(a.px-num(a.line.prevu))}`,"À négocier ou comparer"];
    case "late":{const n=S.tasks.filter(isLate).length;return [`${pl(n,"tâche","tâches")} en retard`,"À reprogrammer"]}
    case "sugs":return [pl(a.n,"proposition","propositions"),"Tirées de vos mails"];
    case "brief":return [allProg()?`Lamaelle vous connaît à ${Math.round(allProg()*100)} %`:"Racontez vos envies","À compléter"];
    case "refit":return ["Envies modifiées","Relancer l'analyse"];
    case "rdv":{const nq=v&&v.fit&&v.fit.questions?v.fit.questions.length:0;return [a.r.title,nq?`${nq} questions prêtes`:"Questions à préparer"]}
    case "visit":return [`Visite ${v.name}`,"À raconter au coach"];
    case "push":return ["Notifications","Le point du lundi"];
    case "next":return a.t?[a.t.title,"Prochaine étape"]:["Rien d'urgent","Demander au coach"];
  }
  return [a.t||"",a.s||""];
}
// Anneau de progression (budget) : pourcentage au centre, rouge au-delà de 100 %
function ringV(pct,size=56,label=true){
  const r=size/2-5,c=2*Math.PI*r,v=Math.max(0,Math.min(1,pct/100));
  return `<svg class="ringv ${pct>100?"over":""}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="rb" cx="${size/2}" cy="${size/2}" r="${r}"/><circle class="rf" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${(c*v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/>${label?`<text x="50%" y="50%">${Math.round(pct)}%</text>`:""}</svg>`;
}
const SVG=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
const TV_IC={mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',star:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'};
// Visuel d'un point « À faire » selon son type
function todoVis(c){
  const a=c.a||{};
  if(c.k==="budget"){const tot=num(S.settings.budgetTotal),sum=k=>S.budget.reduce((s,b)=>s+num(b[k]),0),val=/engag/.test(a.t||"")?sum("engage"):sum("prevu");return ringV(tot?val/tot*100:0)}
  if(c.k==="rdv"){const d=pd(a.r.date);return `<span class="tv-cal"><small>${esc(d.toLocaleDateString("fr-FR",{month:"short"}))}</small><b class="num">${d.getDate()}</b></span>`}
  if(c.k==="late")return `<span class="tv-num bad"><b class="num">${S.tasks.filter(isLate).length}</b></span>`;
  if(c.k==="sugs")return `<span class="tv-num gold">${SVG(TV_IC.mail)}<b class="num">${a.n}</b></span>`;
  const ic={visit:"mic",brief:"heart",push:"bell",next:"check"}[c.k]||"star";
  return `<span class="tv-ic lv-${c.lvl||"info"}">${SVG(TV_IC[ic])}</span>`;
}
// Toucher une carte lance la première action qui ouvre quelque chose (fiche, page, comparateur…), jamais une modification directe
const ROW_NAV=/^(go|fiche|late|task|compare|prefill|chatbrief|chat):/,ROW_WRITE=/^(vstatus|budgetset|taskdone|pushhide):/;
const tdAction=c=>{const q=c.qr.find(x=>ROW_NAV.test(x[1]))||c.qr.find(x=>!ROW_WRITE.test(x[1]));return q?`data-act="qr" data-do="${esc(q[1])}"`:"disabled"};
const CHEV='<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
// Le point le plus prioritaire : visuel à gauche, titre court, une ligne, chevron
function leadCard(c){
  const [t,l]=todoShort(c);
  return `<button class="tdc lead lv-${c.lvl||"info"}" ${tdAction(c)}><span class="tv" aria-hidden="true">${todoVis(c)}</span><span class="tdc-t"><b>${esc(t)}</b><span>${esc(l)}</span></span>${CHEV}</button>`;
}
// Les suivants : petites cartes côte à côte, visuel et quelques mots
function smallCard(c){
  const [t,l]=todoShort(c);
  return `<button class="tdc small lv-${c.lvl||"info"}" ${tdAction(c)} aria-label="${esc(t+" : "+l)}"><span class="tv" aria-hidden="true">${todoVis(c)}</span><b aria-hidden="true">${esc(t)}</b></button>`;
}
// Suggestions de la carte Coach, tirées de l'état de l'app (sans appel à l'IA)
const KEY_FIND={Lieu:"un lieu",Traiteur:"un traiteur",Photographe:"un photographe",Musique:"la musique",Fleuriste:"un fleuriste",Tenues:"nos tenues"};
function coachSuggestions(al){
  const out=[];
  const miss=KEY_VCATS.find(c=>!S.vendors.some(v=>v.cat===c&&v.status==="reserve"));
  if(miss)out.push([`Trouver ${KEY_FIND[miss]||miss}`,`ask:Aide-nous à trouver ${KEY_FIND[miss]||miss} : par où commencer, quels critères compter et combien prévoir, d'après nos envies ?`]);
  const dv=al.find(a=>a.k==="devis");
  if(dv)out.push(["Négocier un devis",`ask:Rédige un mail cordial à ${dv.v.name} pour négocier leur devis de ${eur(dv.px)} : notre enveloppe « ${dv.line.label} » est de ${eur(num(dv.line.prevu))}.`]);
  const wait=S.guests.filter(g=>g.rsvp!=="oui"&&g.rsvp!=="non").length;
  if(wait>=5&&S.tasks.some(t=>t.id==="t22"&&t.status==="done"))out.push(["Relancer les invités",`ask:${wait} invités n'ont pas encore répondu. Rédige un message de relance court et chaleureux à leur envoyer.`]);
  // libellés courts (la question complète part au coach)
  for(const f of [["Par où commencer ?","ask:Par quoi commencer cette semaine ?"],["Notre budget","ask:Où en est notre budget ? Dis-nous ce qui mérite notre attention."],["À réserver","ask:Que nous reste-t-il à réserver, et dans quel ordre ?"]])if(out.length<3)out.push(f);
  return out.slice(0,3);
}
// Point de la semaine sur une ligne ; il ouvre le point complet (ou demande un point s'il n'y en a pas de récent)
const hebdoFresh=()=>{const hb=S.hebdo||{};return !!(hb.at&&Date.now()-hb.at<8*864e5)};
function pointCard(){
  const hb=S.hebdo||{},fresh=hebdoFresh();
  return `<button class="pw" ${fresh?'data-act="hebdoopen"':'data-act="qr" data-do="hebdo"'}><span class="pw-ic" aria-hidden="true">${SPARK}</span><span class="pw-t"><small>Point de la semaine</small><b>${fresh?esc(hb.titre||"Lire le point du coach"):"Faire le point avec le coach"}</b></span>${CHEV}</button>`;
}
function openHebdo(){
  const hb=S.hebdo||{};
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Point de la semaine"><span class="cc-k">Point de la semaine${hb.at?` · ${WEEKDAYS[new Date(hb.at).getDay()]}`:""}</span><h3>${esc(hb.titre||"")}</h3>
    ${Array.isArray(hb.points)?`<ul class="hb-pts">${hb.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${hb.question?`<p class="ch-q">${esc(hb.question)}</p>`:""}
    <div class="acts"><button type="button" class="btn ghost" data-act="qr" data-do="hebdo">Refaire le point</button><div>${hb.question?`<button type="button" class="btn primary" data-act="qr" data-do="prefill:">Répondre au coach</button>`:`<button type="button" class="btn" data-close="1">Fermer</button>`}</div></div></div></div>`;
}
// Ouverture : la photo du couple en plein cadre, sa phrase, les prénoms et le compte à rebours
const GEAR='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
const couplePhrase=()=>{const pr=S.profil||{},fr=(S.briefs&&S.briefs.filRouge)||{};return String(fr.titre||(String(pr.resume||"").match(/^[^.!?]+[.!?]?/)||[""])[0]).trim().replace(/^[«"\s]+|[»"\s]+$/g,"")};
function homeCover(){
  const ph=S.photo&&S.photo.data,insp=!ph&&S.inspirations.find(i=>i.cat==="vision"&&i.thumb);
  const src=ph?`data:image/jpeg;base64,${ph}`:insp?`data:image/jpeg;base64,${insp.thumb}`:"";
  const phrase=couplePhrase(),d=wDate(),n=d?days(today(),d):null,ind=!!S.settings.dateIndicative;
  const logo=(document.querySelector(".brand-mark")||{}).outerHTML||"";
  const count=d?(n>0?`<b class="num">${n}</b> jour${n>1?"s":""}${ind?"*":""}`:n===0?`<b>Jour J</b>`:`<b>Mariés</b>`):"";
  return `<section class="cover ${src?"":"no-img"}" aria-label="${esc(COUPLE())}">
    ${src?`<img class="cv-img" src="${src}" alt="">`:`<span class="cv-mark" aria-hidden="true">${logo}</span>`}
    <div class="cv-top"><span class="cv-brand" aria-hidden="true">${logo}<span>Lamaelle</span></span><button class="cv-set" data-go="reglages" aria-label="Réglages">${SVG(GEAR)}</button></div>
    <div class="cv-bot">
      ${phrase?`<button class="cv-phrase" data-go="envies">« ${esc(phrase)} »</button>`:`<button class="cv-phrase" data-act="qr" data-do="chatbrief">Racontez-nous votre mariage</button>`}
      <div class="cv-line"><div class="cv-who"><span class="cv-names">${esc(P1())} &amp; ${esc(P2())}</span>${!ph&&S.canWrite?`<button class="cv-add" data-act="couplephoto">Ajouter votre photo</button>`:""}</div>
        ${d?`<button class="cv-count" data-act="showdate" aria-label="${esc(`${count.replace(/<[^>]+>/g,"").replace("*","")}, ${fmtLong(d)}${ind?", date indicative":""}`)}">${count}</button>`:`<button class="cv-count set" data-go="reglages">Fixer la date</button>`}</div>
    </div></section>`;
}
// « Votre mariage » : six tuiles, un visuel et un chiffre ; « Commencer » quand c'est vide, jamais de « 0 » seul
const TINTS=["accent","gold","ok","warn","bad"];
const tintOf=s=>TINTS[[...String(s||"")].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%TINTS.length];
const initials=s=>String(s||"").split(/[\s'’-]+/).filter(w=>/^\p{L}/u.test(w)&&!/^(de|du|des|la|le|les|au|aux|et|d|l)$/i.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join("")||"?";
const kEur=x=>x>=1000?`${(x/1000).toLocaleString("fr-FR",{maximumFractionDigits:1})} k€`:eur(x);
function weddingTiles(){
  const pl=(n,s,p)=>`${n} ${n>1?p:s}`;
  const act=S.vendors.filter(v=>v.status!=="ecarte"),res=act.filter(v=>v.status==="reserve").length;
  const late=S.tasks.filter(isLate).length,t0=today();
  const nt=S.tasks.filter(t=>t.status!=="done"&&taskDue(t)&&taskDue(t)>=t0).sort((a,b)=>taskDue(a)-taskDue(b))[0];
  const nr=S.rdv.filter(r=>r.date&&pd(r.date)>=t0).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")))[0];
  const next=[nt&&{t:nt.title,d:taskDue(nt)},nr&&{t:nr.title,d:pd(nr.date)}].filter(Boolean).sort((a,b)=>a.d-b.d)[0];
  const tot=num(S.settings.budgetTotal),prevu=S.budget.reduce((s,b)=>s+num(b.prevu),0),engage=S.budget.reduce((s,b)=>s+num(b.engage),0);
  const ref=tot||prevu,pct=ref?engage/ref*100:0;
  const g=S.guests,ans=g.filter(x=>x.rsvp==="oui"||x.rsvp==="non").length,steps=S.schedule.length,{ready}=briefsState();
  // visuels (décor, masqués aux lecteurs d'écran)
  const avat=act.slice().sort((a,b)=>(b.status==="reserve")-(a.status==="reserve")).slice(0,3).map(v=>`<span class="av t-${tintOf(v.cat)}">${esc(initials(v.name))}</span>`).join("")+(act.length>3?`<span class="av more">+${act.length-3}</span>`:"");
  const nd=Math.min(g.length,40),ad=g.length<=40?ans:Math.round(ans/g.length*40);
  const dots=`<span class="dots">${Array.from({length:nd||12},(_,i)=>`<i class="${i<ad?"on":""}"></i>`).join("")}</span>`;
  const ph=PHASES.map(p=>{const all=S.tasks.filter(t=>t.phase===p.k);return [all.length,all.filter(t=>t.status==="done").length]}),mx=Math.max(1,...ph.map(x=>x[0]));
  const bars=`<span class="bars">${ph.map(([n,dn])=>`<i style="height:${Math.max(8,n/mx*100)}%"><b style="height:${n?dn/n*100:0}%"></b></i>`).join("")}</span>`;
  const frise=`<span class="frise">${"<i></i>".repeat(5)}${SVG(TV_IC.star)}</span>`;
  const sheets=`<span class="sheets"><i></i><i></i></span>`;
  const tile=(o)=>`<button class="wt ${o.empty?"empty":""}" ${o.go} aria-label="${esc(o.aria)}"><span class="wt-vis" aria-hidden="true">${o.vis}</span><span class="wt-big" aria-hidden="true">${o.big}</span><span class="wt-line" aria-hidden="true">${o.empty?`<span class="wt-go">Commencer</span>`:o.line}</span></button>`;
  return `<div class="wt-grid">
    ${tile({empty:!act.length,go:!act.length&&S.canWrite?'data-new="vendors"':'data-go="prestataires"',vis:act.length?`<span class="avs">${avat}</span>`:`<span class="avs"><span class="av"></span><span class="av"></span><span class="av"></span></span>`,big:act.length?`<span class="num">${act.length}</span>`:"Prestataires",line:res?pl(res,"réservé","réservés"):"Prestataires",aria:act.length?`Prestataires : ${act.length} suivis, ${res} réservés`:"Prestataires : commencer"})}
    ${tile({empty:!ref,go:'data-go="budget"',vis:ringV(pct,52,engage>0),big:`<span class="num">${kEur(prevu||tot)}</span>`,line:engage?`<span class="${pct>100?"over":""}">${Math.round(pct)} % engagé</span>`:"Budget prévu",aria:ref?`Budget : ${eur(prevu||tot)} prévus, ${Math.round(pct)} % engagé`:"Budget : commencer"})}
    ${tile({empty:!g.length,go:'data-go="invites"',vis:dots,big:ans?`<span class="num">${ans} / ${g.length}</span>`:`<span class="num">${g.length}</span>`,line:ans?"Invités ont répondu":"Invités · réponses à venir",aria:g.length?`Invités : ${ans} réponses sur ${g.length}`:"Invités : commencer"})}
    ${tile({empty:!S.tasks.length&&!S.rdv.length,go:'data-go="planning"',vis:bars,big:"Planning",line:late?`<span class="over">${late} en retard</span>`:next?`${esc(whenShort(next.d))} · ${esc(next.t)}`:"Rien de daté à venir",aria:`Planning : ${late?`${late} en retard`:next?`prochain, ${next.t}, ${whenShort(next.d)}`:"rien de daté à venir"}`})}
    ${tile({empty:!steps,go:'data-go="jour-j"',vis:frise,big:"Jour J",line:pl(steps,"étape","étapes"),aria:steps?`Jour J : ${pl(steps,"étape","étapes")}`:"Jour J : commencer"})}
    ${tile({empty:false,go:'data-act="docsmenu"',vis:sheets,big:"Briefs",line:ready?"À envoyer":"À préparer",aria:`Documents : briefs ${ready?"à envoyer":"à préparer"}`})}
  </div>`;
}
function vApercu(){
  if(S.pushState===null)setTimeout(()=>refreshPushState().catch(()=>{S.pushState="unsupported"}),0);
  const al=alerts(),cards=todoCards(al),ui=S.ui;
  // la première carte en grand, puis 2 petites côte à côte, puis « + N » (ou toutes si on a déplié)
  const [lead,...others]=cards,smalls=ui.more?others:others.slice(0,2),rest=others.length-smalls.length;
  return `<div class="home v3">${homeCover()}
    <section class="tdx" aria-label="À faire maintenant">${leadCard(lead)}
      ${smalls.length?`<div class="tdc-grid">${smalls.map(smallCard).join("")}</div>`:""}
      ${rest>0||ui.more&&others.length>2?`<button class="link more-pts" data-act="uimore">${ui.more?"Moins":`+ ${rest}`}</button>`:""}</section>
    ${pointCard()}
    <section aria-labelledby="h-wm"><h3 class="home-h" id="h-wm">Votre mariage</h3>${weddingTiles()}</section>
  </div>`;
}
// Tâche ouverte depuis l'accueil : le planning défile jusqu'à elle et la met en évidence
function showTask(id){
  if(S.f.owner!=="all"){S.f.owner="all";saveF()}
  go("planning");
  requestAnimationFrame(()=>{const r=document.querySelector(`#main .row[data-task="${CSS.escape(id)}"]`);if(!r)return;
    r.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});r.classList.add("flash");setTimeout(()=>r.classList.remove("flash"),2600)});
}
/* « Voir les retards » : le planning s'ouvre sur la première tâche en retard, mise en évidence (filtre « Tout » pour ne pas la masquer). */
function showLate(){
  if(S.f.owner!=="all"){S.f.owner="all";saveF()}
  go("planning");
  requestAnimationFrame(()=>{
    const rows=[...document.querySelectorAll("#main .row.late")];
    if(!rows.length)return;
    rows[0].scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    rows.forEach(r=>r.classList.add("flash"));
    setTimeout(()=>rows.forEach(r=>r.classList.remove("flash")),2600);
  });
}
async function runQr(dd){
  const [k,...rest]=dd.split(":"),arg=rest.join(":");
  if(k==="go")return go(arg);
  if(k==="late")return showLate();
  if(k==="task")return showTask(arg);
  if(k==="pushon"){try{await enablePush()}catch(err){toast("Activation impossible : "+(err.message||err))}return render()}
  if(k==="pushhide"){try{localStorage.setItem(PUSH_CARD_KEY,"1")}catch(e){}toast("Vous pourrez les activer dans Réglages");return render()}
  if(k==="fiche")return openFiche(arg);
  if(k==="ask"){openChat("chat");return sendChat(arg)}
  if(k==="prefill")return openChat("chat",arg);
  if(k==="chat")return openChat();
  if(k==="chatbrief")return openChat("brief");
  if(k==="compare"){const [cat,id]=[rest[0],rest[1]];return openCompare(cat,id)}
  if(k==="hebdo"){if(await mergeDoc("meta/hebdo",{requestedAt:Date.now()})){kick("hebdo");toast("Le coach prépare votre point : il arrive dans une minute environ")}return}
  if(!S.canWrite)return;
  if(k==="vstatus"){const [id,st]=rest,v=S.vendors.find(x=>x.id===id);if(!v)return;const prev=v.status;if(await patch("vendors",id,{status:st}))toastUndo(`${v.name} : ${VSTAT[st]}`,()=>patch("vendors",id,{status:prev}));return}
  if(k==="taskdone"){const t=S.tasks.find(x=>x.id===arg);if(!t)return;const prev=t.status||"todo";if(await patch("tasks",arg,{status:"done"}))toastUndo(`Fait : ${t.title}`,()=>patch("tasks",arg,{status:prev}));return}
  if(k==="budgetset"){const [id,amt]=rest,b=S.budget.find(x=>x.id===id);if(!b)return;const prev=b.prevu??null;if(await patch("budget",id,{prevu:num(amt)}))toastUndo(`${b.label} : enveloppe à ${eur(num(amt))}`,()=>patch("budget",id,{prevu:prev}));return}
}

/* Tâches qui se ressemblent beaucoup (titres quasi identiques) : proposées à la fusion, jamais fusionnées d'office. */
const STOPW=new Set("les des une pour avec aux sur par dans".split(" "));
const tWords=t=>new Set(fold(t).replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOPW.has(w)).map(w=>w.replace(/s$/,"")));
function similarTasks(){
  const keep=new Set(S.prefs.notDupes||[]),ts=S.tasks,out=[];
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){
    const a=tWords(ts[i].title),b=tWords(ts[j].title);if(!a.size||!b.size)continue;
    const inter=[...a].filter(x=>b.has(x)).length,sc=inter/Math.min(a.size,b.size);
    const key=[ts[i].id,ts[j].id].sort().join("|");
    if(sc>=.75&&!keep.has(key))out.push({a:ts[i],b:ts[j],key});
  }
  return out;
}
const findGuest=name=>{const n=String(name||"").trim().toLowerCase();return n?S.guests.find(g=>String(g.name||"").trim().toLowerCase()===n):null};

function ring(p,color){
  const r=26,c=2*Math.PI*r,v=Math.max(0,Math.min(1,p||0));
  return `<svg class="ring" width="68" height="68" viewBox="0 0 68 68" aria-hidden="true"><circle class="bgc" cx="34" cy="34" r="${r}"/><circle cx="34" cy="34" r="${r}" stroke="${color}" stroke-linecap="round" stroke-dasharray="${(c*v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 34 34)"/><text x="34" y="34">${Math.round(v*100)}%</text></svg>`;
}
function toastUndo(msg,undo){const el=document.createElement("div");el.className="toast has-act";el.setAttribute("role","status");el.innerHTML=`<span>${esc(msg)}</span><button type="button">Annuler</button>`;el.querySelector("button").onclick=async()=>{el.remove();try{await undo();toast("Annulé")}catch(e){writeErr(e)}};document.body.appendChild(el);setTimeout(()=>el.remove(),6000)}
function toast(msg){const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}

/* ---------- Data writes ---------- */
async function save(col,id,data){
  if(!S.db){toast(S.user?"Connexion en cours, réessayez dans un instant":"Connectez-vous pour enregistrer");return false}
  try{
    if(id){await S.db.collection(col).doc(id).set(data)}
    else{await S.db.collection(col).add(Object.assign({createdAt:Date.now()},data))}
    return true;
  }catch(e){return writeErr(e)}
}
async function patch(col,id,data){
  if(!S.db)return false;
  try{await S.db.collection(col).doc(id).update(data);return true}catch(e){return writeErr(e)}
}
async function remove(col,id){
  if(!S.db)return false;
  try{await S.db.collection(col).doc(id).delete();return true}catch(e){return writeErr(e)}
}
async function setDoc(path,cur,data){
  if(!S.db){toast(S.user?"Connexion en cours, réessayez dans un instant":"Connectez-vous pour enregistrer");return false}
  try{await S.db.doc(path).set(Object.assign({},cur,data));return true}catch(e){return writeErr(e)}
}
function writeErr(e){
  const c=e&&e.code;
  if(c==="permission-denied"&&S.canWrite!==false){S.canWrite=false;render();toast("Accès refusé : ce compte n'est pas autorisé")}
  else if(c==="resource-exhausted")toast("Quota dépassé, réessayez plus tard");
  else if(c==="unavailable")toast("Hors ligne : la modification sera envoyée au retour du réseau");
  else toast("Échec de l'enregistrement, réessayez");
  return false;
}

/* ---------- Hero ---------- */
function renderHero(){
  const d=wDate(),st=S.settings;
  const sub=[];
  if(d){const L=fmtLong(d);sub.push(`<b>${esc(L.charAt(0).toUpperCase()+L.slice(1))}</b>${st.dateIndicative?" <span>(date indicative)</span>":""}`)}
  if(st.lieu||st.ville)sub.push(`<span>${esc([st.lieu,st.ville].filter(Boolean).join(", "))}</span>`);
  if(st.mairie)sub.push(`<span>Mairie de ${esc(st.mairie)}</span>`);
  if(!sub.length)sub.push(`<span>${S.mode==="live"?"Date et lieu à renseigner dans Réglages":"Notre mariage"}</span>`);
  setHTML(document.getElementById("hero-sub"),sub.join(""));
  // prénoms du couple, depuis les réglages (rien avant la connexion)
  setHTML(document.getElementById("names"),S.mode==="live"||S.mode==="demo"?`${esc(P1())}<span class="amp">&amp;</span>${esc(P2())}`:"");
  // photo du couple : ouvre Réglages (le changement de photo se fait dans Réglages > Général)
  const ph=S.photo&&S.photo.data,live=S.mode==="live"||S.mode==="demo";
  setHTML(document.getElementById("hero-photo"),live?`<button class="hero-photo" data-go="reglages" aria-label="Réglages">${ph?`<img src="data:image/jpeg;base64,${ph}" alt="">`:`<span>${esc(P1().charAt(0))}&amp;${esc(P2().charAt(0))}</span>`}</button>`:"");
  const c=document.getElementById("count");
  if(d){
    const n=days(today(),d);
    setHTML(c,n>0?`<div class="count-n">${n}<small>jours</small></div><div class="count-l">${n>60?"environ "+Math.round(n/30.44)+" mois · ":""}${Math.floor(n/7)} semaines avant le grand jour</div>`
      :n===0?`<div class="count-n">Jour J</div><div class="count-l">C'est aujourd'hui</div>`
      :`<div class="count-n" style="font-size:clamp(44px,7vw,80px)">Mariés</div><div class="count-l">depuis ${-n} jour${-n>1?"s":""}</div>`);
  }else setHTML(c,S.mode==="live"?`<button class="count-set" data-go="reglages">Fixer la date</button>`:"");
  const fr=document.getElementById("frieze");
  if(!d){setHTML(fr,"");return}
  const cur=currentPhase(),ci=cur?PH[cur.k].i:0;
  const fill=ci/PHASES.length*100+1;
  setHTML(fr,`<div class="fr-track" role="list" aria-label="Étapes de la préparation"><div class="fr-fill" style="width:${Math.min(100,fill).toFixed(1)}%"></div>${PHASES.map((p,i)=>`<div class="fr-step ${i<ci?"past":i===ci?"now":""}" role="listitem"><span class="fr-dot"></span><span class="fr-lab">${p.short}${i===ci?" · en cours":""}</span></div>`).join("")}</div>`);
}
const ICON={envies:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',coach:'<path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/>',apercu:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',planning:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14l2 2 4-4"/>',invites:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.5 5.5 5.8"/>',prestataires:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',plus:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'};
// Barre du bas (mobile) : 3 onglets. Planning, Budget, Invités et Jour J passent par les tuiles de l'accueil, Réglages par la photo du couple.
const BNAV=[["apercu","Accueil"],["envies","Nos envies"],["prestataires","Prestataires"]];
function renderBnav(){
  const sug=pendingSugs().length,cur=PARENT_VIEW[S.view]||S.view;
  setHTML(document.getElementById("bnav"),BNAV.map(([k,l])=>`<button data-go="${k}" ${cur===k?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${l}${k==="apercu"&&sug?`<span class="badge gold num" title="${sug} à valider">${sug}</span>`:""}</button>`).join(""));
  document.body.classList.add("compact");
  document.body.classList.toggle("on-home",S.view==="apercu");
}
function renderTabs(){
  renderBnav();
  const late=S.tasks.filter(isLate).length,sug=pendingSugs().length;
  setHTML(document.getElementById("tabs"),VIEWS.map(([k,l])=>
    `<button class="tab" data-go="${k}" ${(PARENT_VIEW[S.view]||S.view)===k?'aria-current="page"':""}>${l}${k==="planning"&&late?`<span class="badge num" title="En retard">${late}</span>`:""}${k==="assistant"&&sug?`<span class="badge gold num" title="À valider">${sug}</span>`:""}</button>`).join(""));
}

/* ---------- Dashboard ---------- */
function milestones(){
  const tDone=id=>S.tasks.some(t=>t.id===id&&t.status==="done");
  const vRes=c=>S.vendors.some(v=>v.cat===c&&v.status==="reserve");
  return [
    ["Brief des envies rempli",allProg()>=.7],["Date fixée",!!S.settings.date],["Budget défini",!!num(S.settings.budgetTotal)],
    ["Lieu réservé",vRes("Lieu")||tDone("t05")],["Traiteur réservé",vRes("Traiteur")||tDone("t08")],
    ["Photographe réservé",vRes("Photographe")||tDone("t09")],["Save-the-date envoyés",tDone("t13")],
    ["Tenues choisies",tDone("t15")&&tDone("t16")],["Faire-part envoyés",tDone("t22")],
    ["Dossier mairie déposé",tDone("t29")],["Plan de table finalisé",tDone("t36")]
  ];
}
function payments(){
  const out=[];
  S.vendors.forEach(v=>{
    if(v.status==="ecarte")return;
    const ac=num(v.acompte),px=num(v.prix);
    if(ac&&!v.acomptePaye&&v.status==="reserve")out.push({v,kind:"Acompte",amount:ac,date:pd(v.dateAcompte)});
    if(px&&!v.soldePaye&&v.status==="reserve")out.push({v,kind:"Solde",amount:Math.max(0,px-(v.acomptePaye?ac:0)-(v.acomptePaye?0:ac)),date:pd(v.dateSolde)});
  });
  return out.sort((a,b)=>(a.date?+a.date:9e15)-(b.date?+b.date:9e15));
}
/* Blocs de l'ancien tableau de bord, déplacés : Jalons et Qui fait quoi dans Planning, Paiements à venir dans Budget */
function milestonesPanel(){
  const ms=milestones(),msDone=ms.filter(m=>m[1]).length,nextIdx=ms.findIndex(m=>!m[1]);
  return `<div class="panel"><div class="panel-h"><h3>Jalons</h3><span class="chip ok num">${msDone} / ${ms.length}</span></div>
    <ul class="miles">${ms.map((m,i)=>`<li class="${m[1]?"ok":i===nextIdx?"next":""}"><span class="dot"></span><span>${m[0]}</span>${i===nextIdx?'<span class="chip gold" style="margin-left:auto">Prochain</span>':""}</li>`).join("")}</ul></div>`;
}
function paymentsPanel(){
  const all=payments(),pays=all.slice(0,5),in30=all.filter(p=>p.date&&days(today(),p.date)<=30).reduce((s,p)=>s+p.amount,0);
  return `<div class="panel pay-panel"><div class="panel-h"><h3>Paiements à venir</h3><button class="link" data-go="prestataires">Prestataires</button></div>
    ${pays.length?`<div class="list">${pays.map(p=>`<div class="row click" data-edit="vendors" data-id="${p.v.id}">${p.date?dateBox(p.date,p.date<today()?"bad":"gold"):`<div class="datebox"><b>?</b><span>date</span></div>`}<div class="main"><div class="t">${esc(p.v.name)}</div><div class="m"><span>${p.kind}</span>${p.date?`<span>${relDay(p.date)}</span>`:"<span>date à préciser</span>"}</div></div><div class="end"><b class="num">${eur(p.amount)}</b></div></div>`).join("")}</div>
    <div class="s" style="font-size:13px;color:var(--muted);margin-top:16px">${in30?`<b class="num" style="color:var(--ink)">${eur(in30)}</b> à verser dans les 30 jours`:"Rien à verser dans les 30 jours"}</div>`
    :`<div class="empty" style="padding:14px 0">Les acomptes et soldes des prestataires réservés apparaîtront ici avec leur date.</div>`}</div>`;
}
function whoPanel(){
  const g=S.guests,late=S.tasks.filter(isLate),open=S.tasks.filter(t=>t.status!=="done");
  const cnt=k=>open.filter(t=>(t.owner||"deux")===k).length,lateOf=k=>late.filter(t=>(t.owner||"deux")===k).length;
  const mx=Math.max(1,cnt("claire"),cnt("julien"),cnt("deux"));
  return `<div class="panel"><div class="panel-h"><h3>Qui fait quoi</h3><span class="chip num">${open.length} ouvertes</span></div>
    <div class="who">${[["claire",P1(),"var(--claire)"],["julien",P2(),"var(--julien)"],["deux","Ensemble","var(--muted)"]].map(([k,l,c])=>`<button class="who-row" data-who="${k}" style="background:none;border:0;padding:0;cursor:pointer;text-align:left"><span style="font-weight:600">${l}</span><span class="hb-track"><i style="width:${cnt(k)/mx*100}%;background:${c}"></i></span><span class="num" style="font-size:13px;color:var(--muted)">${cnt(k)}${lateOf(k)?` · <span class="over">${lateOf(k)} en retard</span>`:""}</span></button>`).join("")}</div>
    <div class="mini"><div><b class="num">${g.filter(x=>x.rsvp!=="non"&&x.diner!==false).length}</b><span>couverts</span></div><div><b class="num">${g.filter(x=>x.rsvp!=="non"&&x.regime).length}</b><span>régimes</span></div><div><b class="num">${g.filter(x=>x.enfant&&x.rsvp!=="non").length}</b><span>enfants</span></div></div></div>`;
}

function taskRow(t){
  const due=taskDue(t),late=isLate(t);
  return `<div class="row ${t.status==="done"?"done":""} ${late?"late":""}" data-task="${t.id}">
    <button class="check ${t.status}" data-act="cycle" data-id="${t.id}" aria-label="Marquer comme ${t.status==="done"?"à faire":"fait"}" title="${STATUS[t.status]||STATUS.todo}"></button>
    <div class="main click" data-edit="tasks" data-id="${t.id}" style="cursor:pointer;margin:-12px 0;padding:12px 0">
      <div class="t">${esc(t.title)}</div>
      <div class="m">${due?`<span class="${late?"over":""}">${late?"En retard · ":"Avant le "}${esc(fmtD(due,false))}</span>`:`<span>${esc(PH[t.phase]?.label||"")}</span>`}${t.source==="mail"?'<span class="chip gold" style="padding:0 7px">via e-mail</span>':""}${t.note?`<span>${esc(t.note.slice(0,70))}${t.note.length>70?"…":""}</span>`:""}</div>
    </div>
    <div class="end">${t.status==="doing"?'<span class="chip warn">En cours</span>':""}${ownerChip(t.owner)}</div>
  </div>`;
}

/* ---------- Planning ---------- */
function vPlanning(){
  const f=S.f;
  let ts=S.tasks.slice().sort(byOrder);
  if(f.owner!=="all")ts=ts.filter(t=>(t.owner||"deux")===f.owner||(f.owner!=="deux"&&(t.owner||"deux")==="deux"));
  const d=wDate(),cur=currentPhase();
  const groups=PHASES.map(p=>{
    const all=ts.filter(t=>t.phase===p.k);
    const shown=f.hideDone?all.filter(t=>t.status!=="done"):all;
    if(!all.length)return "";
    const done=all.filter(t=>t.status==="done").length;
    const when=d?`avant le ${fmtD(p.due(d))}`:"";
    return `<section class="phase ${cur&&cur.k===p.k?"current":""}"><div class="phase-h"><div><h3 style="display:inline">${p.label}</h3><span class="when">${esc([p.hint,when].filter(Boolean).join(" · "))}</span>${cur&&cur.k===p.k?' <span class="chip acc" style="margin-left:6px">En cours</span>':""}</div><span class="prog num">${done} / ${all.length}</span></div>
      <div class="list">${shown.length?shown.map(taskRow).join(""):`<div class="empty">Tout est fait pour cette période.</div>`}</div></section>`;
  }).join("");
  const dups=S.canWrite?similarTasks():[];
  const dupH=dups.length?`<div class="dups">${dups.slice(0,3).map(x=>`<div class="banner dup"><b>Doublon possible</b><span>« ${esc(x.a.title)} » et « ${esc(x.b.title)} »</span>
    <div class="dup-acts"><button class="btn sm primary" data-act="dupmerge" data-a="${x.a.id}" data-b="${x.b.id}">Fusionner</button><button class="btn sm" data-act="dupkeep" data-k="${x.key}">Ce sont deux tâches</button></div></div>`).join("")}</div>`:"";
  return `${subnav([["planning","Tâches"],["agenda","Agenda"]])}<div class="vh"><div><h2>Rétroplanning</h2><p>${d?"Les échéances se calculent à partir de la date du mariage. Une échéance précise sur une tâche prend le dessus.":"Fixez la date dans Réglages pour voir les échéances."}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="pdfreport">Rapport PDF</button><button class="btn primary" data-new="tasks" ${S.canWrite?"":"disabled"}>Ajouter une tâche</button></div></div>
  <div class="filters">
    <div class="seg" role="group" aria-label="Filtrer par personne">${[["all","Tout"],["claire",P1()],["julien",P2()],["deux","Ensemble"]].map(([k,l])=>`<button data-f="owner" data-v="${k}" aria-pressed="${f.owner===k}">${l}</button>`).join("")}</div>
    <label class="toggle"><input type="checkbox" id="hide-done" ${f.hideDone?"checked":""}> Masquer les tâches faites</label>
  </div>
  ${dupH}${groups||emptyBlock("Aucune tâche pour l'instant","Ajoutez la première avec le bouton ci-dessus.")}
  <div class="plan-ov ${S.f.overview?"open":""}"><button class="ov-open" data-act="overview" aria-expanded="${!!S.f.overview}"><span><b>Vue d'ensemble</b><span>Jalons et qui fait quoi</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    ${S.f.overview?`<div class="plan-ov-b">${milestonesPanel()}${whoPanel()}</div>`:""}</div>`;
}

/* ---------- Agenda ---------- */
function vAgenda(){
  const all=S.rdv.slice().sort((a,b)=>String((a.date||"9")+(a.time||"")).localeCompare(String((b.date||"9")+(b.time||""))));
  const t=today(),up=all.filter(r=>!r.date||pd(r.date)>=t),past=all.filter(r=>r.date&&pd(r.date)<t).reverse();
  const row=r=>{const d=pd(r.date);return `<div class="row click" data-edit="rdv" data-id="${r.id}">${d?dateBox(d,d<t?"":"gold"):`<div class="datebox"><b>?</b><span>date</span></div>`}<div class="main"><div class="t">${esc(r.title)}</div><div class="m">${d?`<span>${esc(fmtLong(d))}</span>`:""}${r.time?`<span class="num">${esc(r.time)}</span>`:""}${r.avec?`<span>avec ${esc(r.avec)}</span>`:""}${r.lieu?`<span>${esc(r.lieu)}</span>`:""}</div></div><div class="end">${r.qui?ownerChip(r.qui):""}${r.source==="mail"?'<span class="chip gold">via e-mail</span>':""}</div></div>`};
  return `${subnav([["planning","Tâches"],["agenda","Agenda"]])}<div class="vh"><div><h2>Agenda</h2><p>Visites de lieux, dégustations, essayages, rendez-vous mairie et notaire.</p></div>
    <button class="btn primary" data-new="rdv" ${S.canWrite?"":"disabled"}>Ajouter un rendez-vous</button></div>
  <h3 class="sec">À venir · ${up.length}</h3>
  ${up.length?`<div class="list">${up.map(row).join("")}</div>`:emptyBlock("Aucun rendez-vous prévu","Ajoutez la prochaine visite ou dégustation.")}
  ${past.length?`<h3 class="sec" style="margin-top:28px">Passés · ${past.length}</h3><div class="list">${past.map(row).join("")}</div>`:""}`;
}

/* ---------- Budget ---------- */
function vBudget(){
  const tot=num(S.settings.budgetTotal);
  const rows=S.budget.slice().sort((a,b)=>(a.order??999)-(b.order??999)||String(a.label).localeCompare(b.label));
  const sum=k=>rows.reduce((s,b)=>s+num(b[k]),0);
  const prevu=sum("prevu"),engage=sum("engage"),paye=sum("paye");
  const marge=tot?tot-Math.max(prevu,engage):null;
  const resv=S.vendors.filter(v=>v.status==="reserve").reduce((s,v)=>s+num(v.prix),0);
  const strip=`<div class="strip">
    <div class="kpi t1"><div><div class="k">Budget total</div><div class="v num">${tot?eur(tot):"—"}</div><div class="s">${S.canWrite?`<button class="chip acc" data-act="budgettot">${tot?"Modifier":"Le fixer"}</button>`:""}</div></div></div>
    <div class="kpi t2"><div><div class="k">Prévu</div><div class="v num">${eur(prevu)}</div><div class="s">Somme des postes</div></div></div>
    <div class="kpi t3"><div><div class="k">Engagé</div><div class="v num">${eur(engage)}</div><div class="s">Payé ${eur(paye)} · reste ${eur(Math.max(0,engage-paye))}</div></div></div>
    <div class="kpi ${marge!==null&&marge<0?"":"t4"}" style="${marge!==null&&marge<0?"background:var(--bad-soft)":""}"><div><div class="k">Marge</div><div class="v num" style="${marge!==null&&marge<0?"color:var(--bad)":""}">${marge===null?"—":eur(marge)}</div><div class="s">${marge===null?"Selon le budget total":marge<0?"Au-dessus du budget":"Encore disponible"}</div></div></div>
  </div>`;
  const gap=resv-engage;
  const ref=tot||prevu;
  const yes=S.guests.filter(x=>x.rsvp==="oui").length,guestsBase=yes||num(S.settings.invitesCible)||S.guests.length;
  const perGuest=guestsBase?(engage||prevu)/guestsBase:0;
  // Liste (lisible sur téléphone) : poste, part du budget calculée en direct, prévu à droite, engagé/payé en dessous
  const body=rows.map(b=>{
    const p=num(b.prevu),e=num(b.engage),pa=num(b.paye),over=e>p&&p>0;
    const note=budgetNote(b.note),share=ref&&p?`${Math.round(p/ref*100)} % du budget`:"";
    return `<div class="brow" data-edit="budget" data-id="${b.id}" role="button" tabindex="0">
      <div class="brow-main"><div class="brow-t">${esc(b.label)}</div>${share||note?`<div class="brow-s">${esc([share,note].filter(Boolean).join(" · "))}</div>`:""}</div>
      <div class="brow-end"><b class="num">${p?eur(p):'<span class="na">—</span>'}</b>${e||pa?`<span class="num ${over?"over":""}">${e?"engagé "+eur(e):""}${e&&pa?" · ":""}${pa?"payé "+eur(pa):""}</span>`:""}</div></div>`;
  }).join("");
  return `<div class="vh"><div><h2>Budget</h2><p>Prévu = enveloppe du poste · Engagé = devis signés · Payé = acomptes et soldes versés.</p></div>
    <button class="btn primary" data-new="budget" ${S.canWrite?"":"disabled"}>Ajouter un poste</button></div>
  ${strip}
  ${payments().length?paymentsPanel():""}
  ${gap>0?`<div class="banner warn">Les prestataires réservés totalisent ${eur(resv)}, soit ${eur(gap)} de plus que l'engagé du budget. Pensez à reporter les devis signés.</div>`:""}
  ${rows.length?`<div class="list blist2">${body}<div class="brow total"><div class="brow-main"><div class="brow-t">Total</div>${tot||perGuest?`<div class="brow-s">${[tot?`${eur(prevu)} prévus pour ${eur(tot)} de budget`:"",perGuest?`${eur(perGuest)} par invité`:""].filter(Boolean).join(" · ")}</div>`:""}</div><div class="brow-end"><b class="num ${tot&&prevu>tot?"over":""}">${eur(prevu)}</b>${engage||paye?`<span class="num">engagé ${eur(engage)} · payé ${eur(paye)}</span>`:""}</div></div></div>`
  :emptyBlock("Aucun poste de budget","Ajoutez vos postes : lieu, traiteur, photographe…")}`;
}

/* ---------- Guests ---------- */
function guestFiltered(){
  const f=S.f,q=f.gq.trim().toLowerCase();
  return S.guests.filter(g=>(f.gRsvp==="all"||(g.rsvp||"attente")===f.gRsvp)&&(!q||[g.name,g.group,g.table,g.regime].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>String(a.group||"").localeCompare(b.group||"")||String(a.name).localeCompare(b.name));
}
function guestRows(){
  const gs=guestFiltered();
  if(!S.guests.length)return emptyBlock("Pas encore d'invités","Collez une liste de noms avec « Ajout rapide », un nom par ligne.");
  if(!gs.length)return `<div class="list"><div class="empty">Aucun invité ne correspond à ces filtres.</div></div>`;
  const sel=S.selMode;
  const row=g=>{
    const r=g.rsvp||"attente",on=S.sel.has(g.id);
    const ev=g.diner===false?(g.vin!==false?"Vin d'honneur seulement":"Cérémonie seulement"):"";
    const meta=[g.side&&g.side!=="commun"?`<span class="${g.side}">${esc(SIDES[g.side])}</span>`:"",ev?`<span>${esc(ev)}</span>`:"",g.table?`<span>Table ${esc(g.table)}</span>`:"",g.regime?`<span>${esc(g.regime)}</span>`:"",g.note?`<span>${esc(g.note.slice(0,40))}${g.note.length>40?"…":""}</span>`:""].filter(Boolean).join("");
    return `<div class="row g ${on?"on":""}">${sel?`<button class="gcheck" data-act="gsel" data-id="${g.id}" role="checkbox" aria-checked="${on}" aria-label="Sélectionner ${esc(g.name)}"></button>`:""}
      <div class="main click" ${sel?`data-act="gsel" data-id="${g.id}"`:`data-edit="guests" data-id="${g.id}"`}><div class="t">${esc(g.name)}${g.enfant?' <span class="chip sm">Enfant</span>':""}</div>${meta?`<div class="m">${meta}</div>`:""}</div>
      ${sel?"":`<div class="end"><button class="chip ${RSVP_CLS[r]}" data-act="rsvp" data-id="${g.id}" aria-label="Réponse de ${esc(g.name)} : ${RSVP[r]}. Modifier">${RSVP[r]}</button></div>`}</div>`;
  };
  const groups=[...new Set(gs.map(g=>g.group||""))].sort((a,b)=>(a===""?1:b===""?-1:a.localeCompare(b)));
  const body=groups.map(gr=>{const list=gs.filter(g=>(g.group||"")===gr);return `<h4 class="ghead">${esc(gr||"Sans groupe")} <span class="num">${list.length}</span></h4><div class="list">${list.map(row).join("")}</div>`}).join("");
  const bar=sel?`<div class="selbar" role="region" aria-label="Actions sur la sélection"><div class="selbar-h"><b class="num">${S.sel.size} sélectionné${S.sel.size>1?"s":""}</b><button class="link" data-act="gselall">${S.sel.size===gs.length?"Tout désélectionner":"Tout sélectionner"}</button><button class="btn sm" data-act="gselend">Terminé</button></div>
    ${S.sel.size?`<div class="selbar-row"><span class="lab">Groupe</span>${[...GROUPS,""].map(x=>`<button class="chip" data-act="gset" data-k="group" data-v="${esc(x)}">${esc(x||"Aucun")}</button>`).join("")}</div>
    <div class="selbar-row"><span class="lab">Côté</span>${Object.entries(SIDES).map(([k,l])=>`<button class="chip ${k}" data-act="gset" data-k="side" data-v="${k}">${l}</button>`).join("")}</div>`:`<p class="more-note" style="margin:6px 0 0">Touchez les invités à ranger, puis choisissez leur groupe ou leur côté.</p>`}</div>`:"";
  return body+bar;
}
function vInvites(){
  const g=S.guests,f=S.f;
  const yes=g.filter(x=>x.rsvp==="oui").length,no=g.filter(x=>x.rsvp==="non").length;
  const cible=num(S.settings.invitesCible);
  const strip=`<div class="strip">
    <div class="kpi t1"><div><div class="k">Invités</div><div class="v num">${g.length}${cible?`<small>/ ${cible} visés</small>`:""}</div><div class="s">${g.filter(x=>x.enfant).length} enfants</div></div></div>
    <div class="kpi t4"><div><div class="k">Présents</div><div class="v num">${yes}</div><div class="s">${g.length-yes-no} réponses attendues · ${no} absents</div></div></div>
    <div class="kpi t3"><div><div class="k">Au dîner</div><div class="v num">${g.filter(x=>x.rsvp!=="non"&&x.diner!==false).length}</div><div class="s">Présents et en attente</div></div></div>
    <div class="kpi t2"><div><div class="k">${esc(P1())} · ${esc(P2())} · Commun</div><div class="v num" style="font-size:26px">${g.filter(x=>x.side==="claire").length} · ${g.filter(x=>x.side==="julien").length} · ${g.filter(x=>x.side==="commun"||!x.side).length}</div><div class="s">Répartition par côté</div></div></div>
  </div>`;
  return `${subnav([["invites","Liste"],["tables","Plan de table"]])}<div class="vh"><div><h2>Invités</h2><p>Touchez la réponse d'un invité pour la changer. « Ranger » classe plusieurs invités d'un coup par groupe ou par côté.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${g.length&&S.canWrite?`<button class="btn" data-act="gselstart" aria-pressed="${S.selMode}">Ranger</button>`:""}<button class="btn primary" data-new="guests" ${S.canWrite?"":"disabled"}>Ajouter</button></div></div>
  ${strip}
  <div class="filters">
    <input class="search" id="gq" type="search" placeholder="Chercher un nom, un groupe, une table…" value="${esc(f.gq)}" aria-label="Chercher un invité">
    <div class="seg" role="group" aria-label="Réponse">${[["all","Toutes"],["oui","Présents"],["attente","En attente"],["non","Absents"]].map(([k,l])=>`<button data-f="gRsvp" data-v="${k}" aria-pressed="${f.gRsvp===k}">${l}</button>`).join("")}</div>
  </div>
  <p class="links-row">${S.canWrite?`<button class="link" data-act="bulk">Ajout rapide (coller une liste)</button>`:""}${S.dl&&g.length?`<button class="link" data-act="csv">Exporter en CSV</button>`:""}</p>
  <div id="guest-list">${guestRows()}</div>`;
}

function vTables(){
  const seated=S.guests.filter(g=>g.rsvp!=="non"&&g.diner!==false);
  const tables={};
  seated.forEach(g=>{if(g.table){(tables[g.table]=tables[g.table]||[]).push(g)}});
  const names=Object.keys(tables).sort((a,b)=>a.localeCompare(b,"fr",{numeric:true}));
  const none=seated.filter(g=>!g.table).sort((a,b)=>String(a.group||"").localeCompare(b.group||"")||String(a.name).localeCompare(b.name));
  const dl=`<datalist id="tbl-names">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`;
  const cards=names.map(n=>`<div class="seat"><h4>${esc(n)}<span class="num">${tables[n].length} pers.</span></h4><ul>${tables[n].sort((a,b)=>String(a.name).localeCompare(b.name)).map(g=>`<li><span>${esc(g.name)}${g.rsvp!=="oui"?' <span class="chip warn">?</span>':""}</span><button data-act="unseat" data-id="${g.id}" aria-label="Retirer ${esc(g.name)} de la table" title="Retirer de la table">✕</button></li>`).join("")}</ul></div>`).join("");
  return `${subnav([["invites","Liste"],["tables","Plan de table"]])}<div class="vh"><div><h2>Plan de table</h2><p>Invités au dîner, présents ou en attente de réponse. Tapez un nom de table pour en créer une.</p></div></div>
  ${dl}
  <div class="grid2">
    <section><h3 class="sec">Tables · ${names.length}</h3>${names.length?`<div class="seat-grid">${cards}</div>`:emptyBlock("Aucune table","Placez un invité à droite, la table se crée toute seule.")}</section>
    <section><h3 class="sec">À placer · ${none.length}</h3>
      ${none.length?`<div class="list">${none.map(g=>`<div class="row"><div class="main"><div class="t">${esc(g.name)}</div><div class="m"><span>${esc(g.group||"")}</span><span>${esc(SIDES[g.side]||"")}</span></div></div>
        <form class="place" data-seat="${g.id}"><input id="seat-${g.id}" list="tbl-names" placeholder="Table" aria-label="Table de ${esc(g.name)}" ${S.canWrite?"":"disabled"}><button class="btn sm" type="submit" ${S.canWrite?"":"disabled"}>Placer</button></form></div>`).join("")}</div>`
        :`<div class="list"><div class="empty">${seated.length?"Tout le monde a sa place.":"Ajoutez des invités au dîner pour commencer."}</div></div>`}
    </section>
  </div>`;
}

/* ---------- Brief helpers ---------- */
const bId=(c,q)=>c+"--"+q;
const bGet=(c,q)=>S.brief.find(d=>d.id===bId(c,q))||{};
const bMeta=c=>bGet(c,"_meta");
const answered=a=>!!((a.commun&&String(a.commun).trim())||(a.choix&&a.choix.length)||(a.claire&&String(a.claire).trim())||(a.julien&&String(a.julien).trim()));
const catProg=c=>{const qs=QC[c].qs;const n=qs.filter(q=>answered(bGet(c,q[0]))).length;return {n,t:qs.length,p:qs.length?n/qs.length:0}};
// « Lamaelle vous connaît à X % » (jauge de Nos envies), de 0 à 1
const allProg=()=>(env().jaugeNow()||0)/100;
async function saveBrief(c,q,patchObj){
  const cur=Object.assign({},bGet(c,q));delete cur.id;
  const base=q==="_meta"?{cat:c,qid:"_meta"}:{cat:c,qid:q,question:(QC[c].qs.find(x=>x[0]===q)||[])[2]||""};
  const ok=await save("brief",bId(c,q),Object.assign(base,cur,patchObj,{updatedAt:Date.now()}));
  if(ok)mergeDoc("meta/analyse",{profilRequestedAt:Date.now()});
  return ok;
}
const fitCls=s=>s==null?"none":s>=75?"hi":s>=55?"mid":"lo";
const fitBadge=(v,big)=>{const f=v.fit;return f&&f.score!=null?`<div class="fit ${fitCls(f.score)} ${big?"big":""}" title="Note de fit">${Math.round(f.score)}</div>`:`<div class="fit none ${big?"big":""}" title="Pas encore analysé">${big?"À analyser":"—"}</div>`};

/* ---------- Planning des agents ----------
   Les agents tournent dans GitHub Actions (agents/, .github/workflows/agents.yml), toutes les 10 minutes.
   À chaque passage, agents/scheduler.js lit meta/planning et décide si l'agent est dû.
   « Maintenant » = on pose requestedAt dans meta/agent ou meta/analyse : lancé tout de suite par la fonction runAgent (repli : prochain réveil, 10 min). */
const hh=(h)=>`${h}h`;
function planOf(k){return Object.assign({},JOBS[k].def,S.planning[k]||{})}
function planLabel(k){
  const p=planOf(k);
  if(!p.enabled)return "en pause";
  if(p.mode==="hourly")return "toutes les heures";
  if(p.mode==="twice")return `chaque jour vers ${hh(p.h1)} et ${hh(p.h2)}`;
  if(p.mode==="weekly")return `chaque ${JOURS[p.day]} vers ${hh(p.h1)}`;
  return `chaque jour vers ${hh(p.h1)}`;
}
const metaOf=k=>k==="mail"?["meta/agent",S.agent]:["meta/analyse",S.analyse];
async function runNow(k){
  if(!S.canWrite)return;
  const [path,cur]=metaOf(k);
  const ok=await setDoc(path,cur,k==="analyse"?{requestedAt:Date.now(),status:"demandée"}:{requestedAt:Date.now()});
  if(ok){kick(k);toast(k==="mail"?"Lecture de la boîte lancée : propositions dans 1 à 2 minutes":"Analyse lancée : résultats dans 2 à 3 minutes")}
}
// Lancement immédiat côté serveur ; si l'appel échoue, la demande enregistrée est prise au prochain réveil (10 min).
function kick(job){runAgentNow(job).catch(e=>console.warn("[agents] lancement immédiat impossible, prochain réveil :",e&&e.message))}
async function savePlan(k,form){
  const fd=new FormData(form);
  const p={enabled:fd.get("enabled")==="on",mode:fd.get("mode")||"daily",h1:+fd.get("h1"),h2:+fd.get("h2"),day:+fd.get("day")};
  if(p.mode==="twice"&&p.h1===p.h2){toast("Choisissez deux heures différentes");return}
  if(p.mode==="twice"&&p.h2<p.h1){const x=p.h1;p.h1=p.h2;p.h2=x}
  if(await setDoc("meta/planning",S.planning,{[k]:p}))toast("Planning enregistré : "+planLabel(k));
}
function planForm(k){
  const J=JOBS[k],p=planOf(k),dis=S.canWrite?"":"disabled";
  const m=k==="mail"?S.agent:S.analyse;
  const lastRaw=m.lastRunAt||m.lastRun;
  const last=lastRaw?(typeof lastRaw==="number"?new Date(lastRaw):pd(lastRaw)):null;
  const asked=m.requestedAt&&(!m.lastRunAt||m.requestedAt>m.lastRunAt);
  const hours=(name,val)=>`<select name="${name}" id="p-${k}-${name}" ${dis}>${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===val?"selected":""}>${hh(h)}</option>`).join("")}</select>`;
  return `<form class="formpanel form" data-plan="${k}">
    <div class="panel-h" style="margin-bottom:0"><h3>${J.label}</h3><span class="chip ${p.enabled?"ok":""}">${p.enabled?"Actif":"En pause"}</span></div>
    <p class="plan-when">${esc(J.intro)}<br>Planning : <b>${esc(planLabel(k))}</b>${last?` · dernier passage ${esc(relDay(last))}`:""}${asked?" · <b>passage demandé</b>":""}</p>
    <label class="toggle"><input type="checkbox" name="enabled" id="p-${k}-on" ${p.enabled?"checked":""} ${dis}> Passage automatique activé</label>
    <div class="field"><span class="lab">Fréquence</span><div class="seg" role="radiogroup">${MODES.map(([mo,l])=>`<label><input type="radio" name="mode" value="${mo}" ${p.mode===mo?"checked":""} ${dis}><span>${l}</span></label>`).join("")}</div></div>
    <div class="cols2">
      <div class="field not-hourly"><label for="p-${k}-h1">Heure</label>${hours("h1",p.h1)}</div>
      <div class="field only-twice"><label for="p-${k}-h2">Deuxième passage</label>${hours("h2",p.h2)}</div>
      <div class="field only-weekly"><label for="p-${k}-day">Jour</label><select name="day" id="p-${k}-day" ${dis}>${[1,2,3,4,5,6,0].map(d=>`<option value="${d}" ${d===p.day?"selected":""}>${JOURS[d]}</option>`).join("")}</select></div>
    </div>
    <div class="plan-acts"><button class="btn primary" type="submit" ${dis}>Enregistrer le planning</button><button class="btn" type="button" data-act="runnow" data-job="${k}" ${dis||(agentBusy(k)?"disabled":"")}>${busyLabel(k)||(k==="mail"?"Lire la boîte maintenant":"Lancer l'analyse maintenant")}</button></div>
  </form>`;
}
async function fireAnalysis(){return runNow("analyse")}
/** « en cours » (verrou posé par l'agent), « demandée » (bouton touché, passage pas encore fini) ou null */
function agentBusy(k){
  const now=Date.now(),m=k==="mail"?S.agent:S.analyse;
  if((S.locks[k]||0)>now||(k==="analyse"&&m.status==="en cours"&&now-(m.requestedAt||0)<30*60000))return "en cours";
  if(m.requestedAt&&m.requestedAt>(m.lastRunAt||0)&&now-m.requestedAt<30*60000)return "demandée";
  return null;
}
const busyLabel=k=>{const b=agentBusy(k);return b==="en cours"?(k==="mail"?"Lecture en cours…":"Analyse en cours…"):b?(k==="mail"?"Lecture demandée…":"Analyse demandée…"):null};
function analyseBar(ctx){
  const a=S.analyse||{},st=agentBusy("analyse")||(a.status==="en cours"||a.status==="demandée"?null:a.status);
  const last=a.lastRun?new Date(a.lastRun):null;
  const label=st==="en cours"?"Analyse en cours…":st==="demandée"?"Analyse demandée":last?"Dernière analyse "+relDay(last)+" à "+last.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"Aucune analyse pour l'instant";
  const todo=S.vendors.filter(v=>v.status!=="ecarte"&&!(v.fit&&v.fit.score!=null)).length;
  const profilPending=ctx==="envies"&&(a.profilRequestedAt||0)>(S.profil.updatedAt||0);
  return `<div class="ai-bar"><div style="min-width:0"><b>${ctx==="envies"?"Synthèse du coach":"Analyse IA des prestataires"}</b>
    <p>${esc(label)}${ctx!=="envies"&&todo?` · ${todo} prestataire${todo>1?"s":""} à analyser`:""}. ${ctx==="envies"?"L'agent relit vos réponses, repère vos priorités et les points où vous n'êtes pas alignés.":"L'agent cherche les avis en ligne, croise chaque offre avec vos envies et attribue une note de fit sur 100. Il ne refait que les fiches nouvelles ou modifiées (ou toutes si vos envies ont changé)."} Passage automatique ${esc(planLabel("analyse"))}.</p></div>
    ${profilPending?`<p class="ai-pending">Vos réponses ont changé : la synthèse se met à jour toute seule, environ 15 minutes après votre dernière modification.</p>`:""}
    <div class="ai-acts"><button class="btn primary" data-act="fire" ${S.canWrite&&!agentBusy("analyse")?"":"disabled"}>${busyLabel("analyse")||"Demander une analyse"}</button>${ctx!=="envies"&&S.canWrite&&!agentBusy("analyse")?`<button class="link" data-act="fireall">Tout réanalyser</button>`:""}</div></div>`;
}

/* ---------- Annuaire ---------- */
function vPrestataires(){
  const f=S.f;
  let vs=S.vendors.slice();
  const vv=["actifs","reserve","ecarte","tous"].includes(f.vView)?f.vView:"actifs";
  vs=vs.filter(v=>vv==="tous"||(vv==="actifs"?v.status!=="ecarte":v.status===vv));
  const allCats=VCATS.filter(c=>S.vendors.some(v=>v.cat===c));
  if(f.vCat&&f.vCat!=="all"&&allCats.includes(f.vCat))vs=vs.filter(v=>v.cat===f.vCat);
  const cats=VCATS.filter(c=>vs.some(v=>v.cat===c));
  const engaged=S.vendors.filter(v=>v.status==="reserve").reduce((s,v)=>s+num(v.prix),0);
  // seulement les prestataires réservés : l'acompte d'un simple devis n'est pas encore dû
  const toPay=S.vendors.filter(v=>v.status==="reserve"&&num(v.acompte)&&!v.acomptePaye).length;
  const sc=v=>v.status==="ecarte"?-2:(v.fit&&v.fit.score!=null?v.fit.score:-1);
  const groups=cats.map(c=>{
    const list=vs.filter(v=>v.cat===c).sort((a,b)=>sc(b)-sc(a)||VSTAT_RANK[b.status]-VSTAT_RANK[a.status]);
    const tk=METIER2TILE[c],st=tk?env().stateOf(tk):null,m=tk?env().metaOf(tk):{};
    const cmp=S.vendors.filter(v=>v.cat===c&&v.status!=="ecarte").length>=2;
    return `<section class="phase"><div class="cat-h"><h3>${c}</h3><div class="meta">${cmp?`<button class="chip acc" data-act="compare" data-cat="${esc(c)}">Comparer</button>`:""}${m.importance?`<span class="chip acc">${IMPORT[m.importance-1]}</span>`:""}${num(m.budget)?`<span class="chip gold num">Budget ${eur(m.budget)}</span>`:""}${st?`<button class="chip ${["brief","complet"].includes(st)?"ok":st==="esquissee"?"warn":""}" data-bgo="${tk}">Nos envies · ${esc(env().etat(st))}</button>`:""}</div></div>
    <div class="list">${list.map((v,i)=>{const fi=v.fit||{};const av=fi.avis||{};const sc=fi.score!=null?Math.round(fi.score):null;return `<div class="vrow" data-fiche="${v.id}" role="button" tabindex="0">
      <div class="vr-head">${list.length>1?`<span class="rank num">${i+1}.</span>`:""}<span class="t">${esc(v.name)}</span>${sc!=null?`<span class="fit-pill ${fitCls(sc)} num" title="Note de fit sur 100">${sc}<small>/100</small></span>`:`<span class="fit-pill none" title="Pas encore analysé">à analyser</span>`}</div>
      <div class="vr-tags"><span class="chip ${VSTAT_CLS[v.status]||""}">${VSTAT[v.status]||"Repéré"}</span>${v.source==="mail"?'<span class="chip gold">via e-mail</span>':""}</div>
      ${fi.verdict?`<div class="verdict">${esc(fi.verdict)}</div>`:""}
      <div class="m">${v.prix?`<span class="num">${eur(v.prix)}</span>`:""}${av.note?`<span class="stars">★ ${esc(String(av.note).replace(".",","))}${av.nombre?` <span style="color:var(--muted);font-weight:500">(${esc(av.nombre)} avis)</span>`:""}</span>`:""}${num(v.acompte)?(v.status==="reserve"?`<span class="${v.acomptePaye?"":"over"}">Acompte ${eur(v.acompte)} ${v.acomptePaye?"versé":"à verser"}</span>`:`<span>Acompte demandé ${eur(v.acompte)}</span>`):""}${v.tel?`<span class="num">${esc(v.tel)}</span>`:""}</div></div>`}).join("")}</div></section>`;
  }).join("");
  return `<div class="vh"><div><h2>Annuaire des prestataires</h2><p>${S.vendors.length} prestataire${S.vendors.length>1?"s":""} · ${S.vendors.filter(v=>v.status==="reserve").length} réservé${S.vendors.filter(v=>v.status==="reserve").length>1?"s":""} pour ${eur(engaged)}${toPay?` · <span class="over">${toPay} acompte${toPay>1?"s":""} à verser</span>`:""}. Classés par note de fit dans chaque catégorie.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="briefsmenu">Briefs à envoyer</button><button class="btn" data-new="vendors" ${S.canWrite?"":"disabled"}>Ajouter un prestataire</button></div></div>
  ${analyseBar("annuaire")}
  <div class="filters"><div class="seg" role="group" aria-label="Afficher">${[["actifs","En cours"],["reserve","Réservés"],["ecarte","Écartés"],["tous","Tous"]].map(([k,l])=>`<button data-f="vView" data-v="${k}" aria-pressed="${vv===k}">${l}</button>`).join("")}</div>
    ${allCats.length>1?`<div class="chip-row" role="group" aria-label="Catégorie">${[["all","Toutes"],...allCats.map(c=>[c,c])].map(([k,l])=>`<button class="chip ${(f.vCat||"all")===k?"on":""}" data-f="vCat" data-v="${esc(k)}" aria-pressed="${(f.vCat||"all")===k}">${esc(l)}</button>`).join("")}</div>`:""}</div>
  ${groups||emptyBlock(S.vendors.length?"Aucun prestataire avec ce statut":"Aucun prestataire pour l'instant","Notez chaque piste dès le premier contact, ou laissez l'assistant e-mails les ajouter.")}`;
}

/* ---------- Comparateur ---------- */
// Valeur d'une ligne « Libellé : valeur » des notes (capacité, couchages… importés du fichier Excel)
const noteVal=(v,label)=>{const m=fold(v.note).match(new RegExp(fold(label)+"\\s*:?\\s*([^\\n]+)"));return m?m[1].trim():""};
const capMax=v=>{const m=noteVal(v,"Capacité").match(/(\d+)(?:\s*-\s*(\d+))?/);return m?+(m[2]||m[1]):null};
const cmpCats=()=>VCATS.filter(c=>S.vendors.filter(v=>v.cat===c).length>=2);
function openCompare(cat,id){
  const cats=cmpCats();if(!cats.length){toast("Il faut au moins 2 prestataires dans une catégorie pour comparer");return}
  const c=S.cmp;c.cat=cat&&cats.includes(cat)?cat:(c.cat&&cats.includes(c.cat)?c.cat:cats[0]);
  const pool=S.vendors.filter(v=>v.cat===c.cat).sort((a,b)=>(a.status==="ecarte")-(b.status==="ecarte")||((b.fit&&b.fit.score)||-1)-((a.fit&&a.fit.score)||-1));
  c.ids=c.ids.filter(x=>pool.some(v=>v.id===x));
  if(id&&!c.ids.includes(id))c.ids=[id,...c.ids].slice(0,3);
  // Présélection uniquement à l'ouverture d'une catégorie ; ensuite, la sélection est libre (même une seule)
  if(c.seeded!==c.cat){c.seeded=c.cat;if(c.ids.length<2)c.ids=[...new Set([...c.ids,...pool.filter(v=>v.status!=="ecarte").map(v=>v.id)])].slice(0,Math.max(2,c.ids.length))}
  if(!document.querySelector(".cmp-modal")){
    document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal cmp-modal" role="dialog" aria-modal="true" aria-label="Comparer des prestataires"><h3>Comparer</h3><div id="cmp-body"></div></div></div>`;
  }
  document.getElementById("cmp-body").innerHTML=cmpBody(pool);
}
function cmpBody(pool){
  const c=S.cmp,cats=cmpCats(),vs=c.ids.map(x=>pool.find(v=>v.id===x)).filter(Boolean);
  const pick=`<div class="cmp-pick"><div class="chip-row" role="group" aria-label="Catégorie">${cats.map(k=>`<button class="chip ${k===c.cat?"on":""}" data-act="cmpcat" data-cat="${esc(k)}" aria-pressed="${k===c.cat}">${esc(k)}</button>`).join("")}</div>
    <div class="pick-h"><span>À comparer : <b class="num">${c.ids.length}</b>/3</span>${c.ids.length?`<button class="link" data-act="cmpnone">Tout décocher</button>`:""}</div>
    <div class="pick-list" role="group" aria-label="Prestataires à comparer">${pool.map(v=>{const on=c.ids.includes(v.id),f=v.fit||{};return `<button class="pick-row ${on?"on":""} ${v.status==="ecarte"?"off":""}" data-act="cmpv" data-id="${v.id}" role="checkbox" aria-checked="${on}"><span class="gcheck" aria-hidden="true" aria-checked="${on}"></span><span class="pr-n">${esc(v.name)}</span><span class="pr-m">${[v.prix?eur(v.prix):"",f.score!=null?Math.round(f.score)+"/100":"",v.status==="ecarte"?"écarté":""].filter(Boolean).join(" · ")}</span></button>`}).join("")}</div></div>`;
  if(vs.length<2)return pick+`<div class="empty">${vs.length?"Cochez un deuxième prestataire pour lancer la comparaison.":"Cochez 2 ou 3 prestataires."}</div>`;
  const line=budgetLineFor(c.cat),env=line?num(line.prevu):0,guests=S.guests.filter(g=>g.rsvp!=="non"&&g.diner!==false).length;
  // Un bloc par critère, une ligne par prestataire : lisible sur téléphone
  const block=(label,hint,get,fmt,dir)=>{const vals=vs.map(get),ns=vals.filter(x=>x!=null);const best=dir&&ns.length>1?(dir>0?Math.max(...ns):Math.min(...ns)):null;
    if(!ns.length)return "";
    return `<section class="cb"><h4>${label}${hint?`<small>${hint}</small>`:""}</h4>${vs.map((v,i)=>`<div class="cb-row ${vals[i]!=null&&vals[i]===best?"best":""}"><span class="cb-n">${esc(v.name)}</span><span class="cb-v">${vals[i]==null?'<span class="na">—</span>':fmt(vals[i])}${vals[i]!=null&&vals[i]===best?'<span class="cb-best">meilleur</span>':""}</span></div>`).join("")}</section>`};
  const listBlock=(label,get)=>{const any=vs.some(v=>(get(v)||[]).length);if(!any)return "";
    return `<section class="cb"><h4>${label}</h4>${vs.map(v=>{const l=get(v)||[];return `<div class="cb-list"><b>${esc(v.name)}</b>${l.length?`<ul>${l.slice(0,3).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:'<span class="na">—</span>'}</div>`}).join("")}</section>`};
  const crits=[...new Set(vs.flatMap(v=>((v.fit&&v.fit.criteres)||[]).map(x=>x.label)))];
  return pick+`<div class="cmp-blocks">`+[
    block("Note de fit","sur 100",v=>v.fit&&v.fit.score!=null?Math.round(v.fit.score):null,x=>`<b class="num">${x}</b>`,1),
    block("Prix","",v=>num(v.prix)||null,x=>`<b class="num">${eur(x)}</b>`,-1),
    env?block("Écart à l'enveloppe",`poste ${esc(line.label)} : ${eur(env)}`,v=>num(v.prix)?num(v.prix)-env:null,x=>`<span class="num ${x>0?"over":"ok-t"}">${x>0?"+":""}${eur(x)}</span>`,vs.some(v=>num(v.prix)&&num(v.prix)<=env)?-1:0):"",
    c.cat==="Lieu"?block("Capacité",`${guests} invités au dîner`,capMax,x=>`<span class="num ${guests>x?"over":""}">${x} pers.</span>`,1):"",
    c.cat==="Lieu"?block("Couchages","",v=>{const m=noteVal(v,"Couchages").match(/\d+/);return m?+m[0]:null},x=>`<span class="num">${x}</span>`,1):"",
    block("Avis en ligne","",v=>v.fit&&v.fit.avis&&v.fit.avis.note!=null?num(v.fit.avis.note):null,x=>`<span class="stars">★ ${String(x).replace(".",",")}</span>`,1),
    ...crits.map(cl=>block(esc(cl),"sur 100",v=>{const k=((v.fit&&v.fit.criteres)||[]).find(x=>x.label===cl);return k?Math.round(num(k.note)):null},x=>`<span class="num">${x}</span>`,1)),
    listBlock("Points forts",v=>v.fit&&v.fit.forces),
    listBlock("Points de vigilance",v=>v.fit&&v.fit.vigilance),
    vs.some(v=>v.visitNotes)?`<section class="cb"><h4>Notes de visite</h4>${vs.map(v=>`<div class="cb-list"><b>${esc(v.name)}</b><p class="vn">${v.visitNotes?esc(v.visitNotes):'<span class="na">—</span>'}</p></div>`).join("")}</section>`:"",
  ].join("")+`</div><div class="cmp-foot">${vs.map(v=>`<button class="btn sm" data-fiche="${v.id}">Fiche ${esc(v.name.length>18?v.name.slice(0,17)+"…":v.name)}</button>`).join("")}</div>
  ${S.canWrite?`<button class="btn primary cmp-ask" data-act="cmpask">Demander l'avis du coach sur ce choix</button>`:""}`;
}
/* Devis de la fiche : le dernier en détail (écart avec le précédent, validité, prix par invité, inclus, options,
   conditions, lien vers le mail), les précédents repliés. Alimenté par l'agent mail (acceptSug) et le coach (enregistrer_devis). */
function devisSection(v){
  const list=Array.isArray(v.devis)?v.devis:[];
  const add=S.canWrite?`<button class="btn sm" data-act="devisadd" data-id="${v.id}">${list.length?"Ajouter un nouveau devis":"Ajouter le devis"}</button>`:"";
  if(!list.length)return `<div class="fsec"><h4>Devis</h4><p class="plan-when" style="margin:0 0 10px">Aucun devis enregistré. Les devis reçus par mail s'ajoutent ici quand vous les validez ; vous pouvez aussi photographier ou joindre le PDF : le coach le lit et le range sur cette fiche.</p>${add}</div>`;
  const d=list[0],prev=list[1],t=today();
  const delta=prev&&num(prev.montant)?num(d.montant)-num(prev.montant):null;
  const val=d.validite?pd(d.validite):null,left=val?days(t,val):null;
  const valChip=val?(left<0?`<span class="chip bad">Expiré le ${fmtD(val)}</span>`:left<=14?`<span class="chip warn">Valable jusqu'au ${fmtD(val)}</span>`:`<span class="chip">Valable jusqu'au ${fmtD(val)}</span>`):"";
  const kv=[["Acompte",num(d.acompte)?eur(d.acompte)+(d.dateAcompte?" avant le "+fmtD(pd(d.dateAcompte)):""):""],["Solde",d.dateSolde?"avant le "+fmtD(pd(d.dateSolde)):""],
    ["Invités prévus",d.invites?String(d.invites):""],["Par invité",d.invites&&num(d.montant)?"≈ "+eur(Math.round(num(d.montant)/d.invites)):""]].filter(x=>x[1]);
  const src=d.source==="mail"?"reçu par mail":d.source==="coach"?`ajouté avec le coach${d.par?" par "+esc(d.par):""}`:"";
  const mail=d.mailUrl&&/^https:\/\/mail\.google\.com\//.test(d.mailUrl)?`<a class="link" href="${esc(d.mailUrl)}" target="_blank" rel="noopener">Ouvrir le mail${d.fichier?" et le devis joint":""}</a>`:d.fichier?`<span class="plan-when" style="margin:0">Fichier : ${esc(d.fichier)}</span>`:"";
  return `<div class="fsec devis"><h4>Devis${list.length>1?` · ${list.length} versions`:""}</h4>
    <div class="devis-card"><div class="devis-top"><div><b class="num devis-m">${eur(d.montant)}</b>${delta!=null&&delta!==0?`<span class="devis-d ${delta<0?"ok":"bad"}">${delta<0?"−":"+"}${eur(Math.abs(delta))} vs devis précédent</span>`:""}</div>${valChip}</div>
      <p class="devis-src">Devis du ${fmtD(pd(d.recuLe))}${src?` · ${src}`:""}</p>
      ${d.resume?`<p class="devis-r">${esc(d.resume)}</p>`:""}
      ${kv.length?`<div class="kv">${kv.map(([k,x])=>`<div><span>${k}</span><b>${esc(x)}</b></div>`).join("")}</div>`:""}
      ${d.inclus&&d.inclus.length?`<h5>Inclus</h5><ul class="blist">${d.inclus.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
      ${d.options&&d.options.length?`<h5>Options</h5><ul class="blist">${d.options.map(o=>`<li>${esc(o.label)}${num(o.prix)?` · <b class="num">${eur(o.prix)}</b>`:""}</li>`).join("")}</ul>`:""}
      ${d.conditions?`<h5>Conditions</h5><p class="devis-r">${esc(d.conditions)}</p>`:""}
      ${mail}</div>
    ${list.length>1?`<details class="devis-old"><summary>Devis précédents (${list.length-1})</summary>${list.slice(1).map((x,i)=>{const nx=list[i+2],dd=nx&&num(nx.montant)?num(x.montant)-num(nx.montant):null;
      return `<div class="hb-row"><span class="lab">${fmtD(pd(x.recuLe))}${x.source==="mail"?" · mail":""}${x.resume?` — ${esc(x.resume.slice(0,90))}${x.resume.length>90?"…":""}`:""}</span><span class="amt num">${eur(x.montant)}${dd?` <small class="${dd<0?"ok":"bad"}">${dd<0?"−":"+"}${eur(Math.abs(dd))}</small>`:""}</span></div>`}).join("")}</details>`:""}
    <div style="margin-top:10px">${add}</div></div>`;
}
function openFiche(id){
  const v=S.vendors.find(x=>x.id===id);if(!v)return;
  const fi=v.fit||{},av=fi.avis||{};
  const tk=METIER2TILE[v.cat];
  const L=(t)=>Array.isArray(t)&&t.length?`<ul class="blist">${t.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
  const crit=Array.isArray(fi.criteres)&&fi.criteres.length?`<div class="fsec"><h4>Détail de la note</h4><div class="crit">${fi.criteres.map(c=>`<div class="hb-row"><span class="lab">${esc(c.label)}</span><span class="amt num">${Math.round(num(c.note))}/100</span><div class="hb-track"><i class="eng" style="width:${Math.max(0,Math.min(100,num(c.note)))}%;background:var(--${num(c.note)>=75?"ok":num(c.note)>=55?"gold":"bad"})"></i></div>${c.pourquoi?`<div class="why">${esc(c.pourquoi)}</div>`:""}</div>`).join("")}</div></div>`:"";
  const offre=[["Montant",v.prix?eur(v.prix):""],["Acompte",num(v.acompte)?eur(v.acompte)+(v.acomptePaye?" · versé":v.dateAcompte?" · avant le "+fmtD(pd(v.dateAcompte)):""):""],["Solde avant le",v.dateSolde?fmtD(pd(v.dateSolde)):""],["Contact",v.contact||""],["Téléphone",v.tel||""]].filter(x=>x[1]);
  const srcs=Array.isArray(av.sources)?av.sources.filter(s=>s&&/^https?:\/\//.test(s.url||"")):[];
  const layer=document.getElementById("layer");
  layer.innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Fiche ${esc(v.name)}" style="max-width:680px">
    <div class="fiche-top">${fitBadge(v,true)}<div style="min-width:0"><h3>${esc(v.name)}</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${esc(v.cat||"")}</span><span class="chip ${VSTAT_CLS[v.status]||""}">${VSTAT[v.status]||"Repéré"}</span>${fi.confiance?`<span class="chip ${fi.confiance==="bonne"?"ok":fi.confiance==="moyenne"?"warn":""}">Confiance ${esc(fi.confiance)}</span>`:""}</div></div></div>
    ${fi.verdict?`<p style="font-size:16px;margin:0">${esc(fi.verdict)}</p>`:`<div class="banner" style="margin:0">Pas encore analysé. Lancez l'analyse depuis l'annuaire, ou attendez le passage de demain matin.${tk&&!env().essentielFait(tk)?" Répondez aussi à l'essentiel de « "+esc(tileName(tk))+" » dans Nos envies pour une note plus juste.":""}</div>`}
    ${offre.length?`<div class="fsec"><h4>L'offre</h4><div class="kv">${offre.map(([k,val])=>`<div><span>${k}</span><b>${esc(val)}</b></div>`).join("")}</div>${v.note?`<p style="font-size:14px;color:var(--muted);margin:10px 0 0;white-space:pre-line;overflow-wrap:anywhere">${esc(v.note)}</p>`:""}</div>`:""}
    ${devisSection(v)}
    ${crit}
    ${(fi.forces&&fi.forces.length)||(fi.vigilance&&fi.vigilance.length)?`<div class="fsec two"><div class="box-ok"><h4>Points forts</h4>${L(fi.forces)||'<span style="font-size:14px">—</span>'}</div><div class="box-bad"><h4>Points de vigilance</h4>${L(fi.vigilance)||'<span style="font-size:14px">—</span>'}</div></div>`:""}
    ${av.resume||av.note?`<div class="fsec"><h4>Avis en ligne${av.note?` · <span class="stars">★ ${esc(String(av.note).replace(".",","))}/5</span>`:""}${av.nombre?` · ${esc(av.nombre)} avis`:""}</h4>${av.resume?`<p style="margin:0;font-size:14px">${esc(av.resume)}</p>`:""}${srcs.length?`<div class="srcs">${srcs.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre||(()=>{try{return new URL(s.url).hostname}catch(e){return "source"}})())}</a>`).join("")}</div>`:""}</div>`:""}
    <div class="fsec"><h4>Notes de visite</h4>${v.visitNotes?`<p class="vnotes">${esc(v.visitNotes)}</p>`:`<p class="plan-when" style="margin:0 0 8px">Après une visite ou un échange, notez vos impressions : l'IA recalcule la note avec ces informations de première main.</p>`}
      ${(v.fitRequestedAt||0)>((fi.updatedAt)||0)?`<p class="ai-pending">Nouvelle note en cours de calcul (1 à 2 minutes).</p>`:""}
      ${S.canWrite?`<button class="btn sm" data-act="editv" data-id="${v.id}">${v.visitNotes?"Modifier les notes de visite":"Ajouter des notes de visite"}</button>`:""}</div>
    ${v.questionsAPoser&&(v.questionsAPoser.questions||[]).length?`<div class="fsec"><h4>Vos questions à poser</h4><p class="plan-when" style="margin:0 0 6px">Préparées à partir de vos réponses de Nos envies (${esc(tileName(v.questionsAPoser.tuile))}).</p>${L(v.questionsAPoser.questions)}</div>`:""}
    ${fi.questions&&fi.questions.length?`<div class="fsec"><h4>Questions à leur poser</h4>${L(fi.questions)}</div>`:""}
    ${fi.updatedAt?`<p style="font-size:12px;color:var(--muted);margin:16px 0 0">Analyse du ${esc(fmtD(new Date(fi.updatedAt)))}</p>`:""}
    ${ficheBrief(tk&&briefFor(tk)||TILE2BRIEF[tk])}
    <div class="acts">${v.mailUrl&&/^https:\/\/mail\.google\.com\//.test(v.mailUrl)?`<a class="btn ghost" href="${esc(v.mailUrl)}" target="_blank" rel="noopener">Ouvrir le mail</a>`:"<div></div>"}<div>${S.vendors.filter(x=>x.cat===v.cat).length>=2?`<button type="button" class="btn" data-act="compare" data-cat="${esc(v.cat)}" data-id="${v.id}">Comparer</button>`:""}<button type="button" class="btn primary" data-act="editv" data-id="${v.id}">Modifier</button></div></div>
  </div></div>`;
}

/* ---------- Nos envies ---------- */
function inspGallery(c){
  const list=S.inspirations.filter(x=>x.cat===c).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(!list.length&&!S.canWrite)return "";
  return `<div class="insp"><div class="insp-h"><h3>Inspirations</h3>${S.canWrite?`<button class="btn sm" data-act="inspadd">Montrer une photo au coach</button>`:""}</div>
    ${list.length?`<div class="insp-grid">${list.map(x=>`<figure><img src="data:image/jpeg;base64,${x.thumb}" alt="${esc(x.description)}" loading="lazy"><figcaption>${esc(x.description)}${x.pinUrl?` <a href="${esc(x.pinUrl)}" target="_blank" rel="noopener noreferrer">· Pinterest</a>`:x.by?` <span>· ${esc(x.by)}</span>`:""}</figcaption>${S.canWrite?`<button class="link" data-act="inspdel" data-id="${x.id}">Retirer</button>`:""}</figure>`).join("")}</div>`
      :`<p class="plan-when" style="margin:0">Une photo vaut mieux qu'un long discours : montrez au coach un lieu, une déco ou une tenue qui vous plaît, il en tirera vos goûts et la gardera ici.</p>`}</div>`;
}
/* Briefs prestataires : fil rouge commun + un brief par métier, rédigés par l'agent (meta/briefs), exportés en PDF */
// Briefs par tuile (clés de tuile, en premier) ; anciennes clés gardées pour les briefs rédigés avant le nouveau questionnaire
const BRIEF_LABEL=Object.assign(Object.fromEntries(TUILES.filter(t=>t.metiers.length||t.k==="ceremonie").map(t=>[t.k,FR_ENVIES.tuiles[t.k].nom])),{traiteur:"Traiteur",alliances:"Alliances",transport:"Transport",hebergement:"Hébergement",enfants:"Enfants"});
function briefsState(){
  const b=S.briefs||{},now=Date.now();
  const failed=b.status==="erreur"&&(b.failedAt||0)>=(b.requestedAt||0);
  const running=!failed&&((S.locks.briefs||0)>now||((b.requestedAt||0)>Math.max(b.updatedAt||0,b.failedAt||0)&&now-(b.requestedAt||0)<20*60000));
  const ready=!!(b.filRouge&&b.categories&&Object.keys(b.categories).length);
  const lastAnswer=Math.max(0,...S.brief.map(x=>+x.updatedAt||0),...S.inspirations.map(x=>+x.createdAt||0));
  return {b,running,ready,failed,stale:ready&&lastAnswer>(b.updatedAt||0)};
}
function briefsPanel(c){
  const {b,running,ready,stale,failed}=briefsState(),dis=S.canWrite&&!running?"":"disabled";
  const one=ready&&b.categories[c];
  const when=b.updatedAt?new Date(b.updatedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):"";
  return `<div class="briefs-p"><div class="panel-h"><h3>Briefs pour les prestataires</h3>${ready?`<span class="chip ${stale?"warn":"ok"}">${stale?"À mettre à jour":"Prêts"}</span>`:""}</div>
    <p class="plan-when" style="margin:0 0 12px">${running?"Le coach rédige vos briefs : un fil rouge commun puis un brief par prestataire. Environ deux minutes, vous recevrez une notification."
      :ready?`${esc(b.filRouge.titre||"")}${b.filRouge.titre?" · ":""}rédigés le ${esc(when)}.${stale?" Vos réponses ou vos inspirations ont changé depuis.":""} Le même fil rouge ouvre chaque brief : tous vos prestataires partent de la même vision.`
      :"Le coach compile vos réponses et vos inspirations en un fil rouge commun (ambiance, palette, matières, ce que vous ne voulez pas), puis en un brief par prestataire, avec les questions à leur poser. À envoyer en PDF avant chaque échange."}</p>
    <div class="briefs-acts">${ready?`<button class="btn primary" data-act="briefpdf" data-c="all">Tous les briefs (PDF)</button>${c===null?Object.keys(BRIEF_LABEL).filter(k=>b.categories[k]).map(k=>`<button class="chip" data-act="briefpdf" data-c="${k}">${esc(BRIEF_LABEL[k])}</button>`).join(""):""}${one?`<button class="btn" data-act="briefpdf" data-c="${c}">Brief ${esc(BRIEF_LABEL[c])}</button>`:""}`:""}
      ${failed?`<p class="brief-err">La rédaction a échoué : ${esc(/credit balance/i.test(b.lastError||"")?"le crédit Claude est épuisé (à recharger sur console.anthropic.com).":b.lastError||"erreur inconnue.")} Vous pouvez réessayer.</p>`:""}
      ${S.canWrite?`<button class="${ready?"link":"btn primary"}" data-act="briefsgo" ${dis}>${running?"Rédaction en cours…":ready?"Mettre à jour les briefs":"Préparer les briefs"}</button>`:""}</div></div>`;
}
// Briefs là où l'on contacte les prestataires : dans la fiche (brief du métier) et en tête de la page Prestataires (tous)
function ficheBrief(qk){
  if(!qk||!BRIEF_LABEL[qk])return "";
  const {b,running,ready}=briefsState(),one=ready&&b.categories[qk];
  return `<div class="fsec fiche-brief"><h4>Brief à lui envoyer</h4>${one?`<button class="btn" data-act="briefpdf" data-c="${qk}">Brief ${esc(BRIEF_LABEL[qk])} (PDF)</button>`
    :running?`<p class="plan-when" style="margin:0">Le coach rédige vos briefs : environ deux minutes.</p>`
    :S.canWrite?`<p class="plan-when" style="margin:0 0 8px">Le brief résume vos envies pour ce prestataire, avec les questions à lui poser.</p><button class="btn" data-act="briefsgo">Préparer les briefs</button>`:""}</div>`;
}
// Tuile Documents de l'accueil : tous les PDF à partager (briefs, déroulé du jour J, rapport d'organisation)
function openDocsMenu(){
  const rows=scheduleRows().length;
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Documents à partager"><h3>Documents à partager</h3>
    ${briefsPanel(null)}
    <div class="docs-list">
      <div class="doc-row"><div><b>Déroulé du jour J</b><span>${rows?`${rows} étape${rows>1?"s":""}, pour les témoins et les prestataires`:"Ajoutez d'abord les étapes dans Jour J"}</span></div>${rows?`<button class="btn sm" data-act="pdfjourj">PDF</button>`:`<button class="btn sm" data-go="jour-j">Ouvrir</button>`}</div>
      <div class="doc-row"><div><b>Rapport d'organisation</b><span>Planning, budget, prestataires et invités en un document</span></div><button class="btn sm" data-act="pdfreport">PDF</button></div>
    </div>
    <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">Fermer</button></div></div></div></div>`;
}
function openBriefsMenu(){
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Briefs à envoyer">${briefsPanel(null)}
    <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">Fermer</button></div></div></div></div>`;
}
const insp64=x=>x.thumb?"data:image/jpeg;base64,"+x.thumb:null;
function briefBlocks(k){
  const b=S.briefs,x=b.categories[k];if(!x)return [];
  // budget : seulement le « budget cible » que vous avez choisi d'indiquer dans Nos envies (jamais vos lignes de budget)
  const m=Object.assign({},bMeta(k),env().metaOf(OLD2TILE[k]||k)),bud=num(m.budget);
  const d=wDate(),st=S.settings;
  const list=(h,a)=>a&&a.length?[{h3:h},{ul:a}]:[];
  const imgs=S.inspirations.filter(i=>(i.cat===k||inspTile(i)===(OLD2TILE[k]||k))&&i.thumb).slice(0,6).map(i=>({data:insp64(i),caption:i.description}));
  return [{h2:"Brief · "+BRIEF_LABEL[k]},
    {kpis:[["Date",d?fmtD(d):"à fixer",d&&st.dateIndicative?"indicative, à confirmer":""],["Lieu",st.lieu||"à définir",st.ville||""],["Invités",st.invitesCible?String(st.invitesCible):"—","nombre visé"],["Budget",bud?eur(bud):"à discuter",bud?"budget cible":""]]},
    {p:x.intention},...list("Nos essentiels",x.essentiels),...list("L'ambiance, dans le détail",x.details),...list("Ce que nous ne voulons pas",x.aEviter),
    ...list("En accord avec nos autres prestataires",x.liens),...list("Nos questions pour vous",x.questions),
    ...(imgs.length?[{h3:"Nos inspirations"},{imgs}]:[])];
}
function filRougeBlocks(){
  const f=S.briefs.filRouge||{},list=(h,a)=>a&&a.length?[{h3:h},{ul:a}]:[];
  const imgs=S.inspirations.filter(i=>i.cat==="vision"&&i.thumb).slice(0,6).map(i=>({data:insp64(i),caption:i.description}));
  return [{h2:"Notre fil rouge"},...(f.titre?[{h3:f.titre}]:[]),{p:f.ambiance||""},...(f.motsCles&&f.motsCles.length?[{tags:f.motsCles}]:[]),
    ...list("Palette",f.palette),...list("Matières et textures",f.matieres),...list("L'expérience de nos invités",f.experience),...list("Ce que nous ne voulons surtout pas",f.aEviter),
    ...(imgs.length?[{h3:"Nos inspirations"},{imgs}]:[])];
}
function pdfBriefs(k){
  const b=S.briefs;if(!b||!b.categories)return;
  if(k==="all"){const ks=Object.keys(BRIEF_LABEL).filter(x=>b.categories[x]);
    return makePdf(`Briefs prestataires - ${COUPLE()}.pdf`,{docTitle:"Nos briefs prestataires",blocks:[...filRougeBlocks(),...ks.flatMap(x=>[{page:true},...briefBlocks(x)])]})}
  // le métier d'abord (c'est ce que le prestataire lit en premier), puis notre vision d'ensemble, commune à tous les briefs
  const fr=filRougeBlocks();fr[0]={h2:"Notre vision d'ensemble (commune à tous nos prestataires)"};
  makePdf(`Brief ${BRIEF_LABEL[k]} - ${COUPLE()}.pdf`,{docTitle:"Brief · "+BRIEF_LABEL[k],blocks:[...briefBlocks(k).slice(1),...fr]});
}
/* Onglet « Nos envies » : écrans dans src/envies-ui.js, catalogue et règles dans agents/lib/envies (docs/nos-envies-v1.md) */
let ENV=null;
const env=()=>ENV||(ENV=makeEnvies({S,esc,toast,meKey:()=>PARTNER[String(S.user&&S.user.email||"").toLowerCase()]||"claire",prenom,tintOf,wDate,today,couplePhrase,
  briefsReadyCount:()=>{const {b,ready}=briefsState();return ready?Object.keys(b.categories).length:0},briefFor,fitPill,synthHtml,archivedAnswers,moodboard,
  pickPhoto:pickEnviePhoto,dictate,saveEnvie,render,go,saveF,SR,CHEV,BACK_SVG,runReward,saveDoc:(path,data)=>mergeDoc(path,data)}));
// Récompense de fin de niveau (agent « recompense » côté serveur) ; si l'appel échoue, le passage suivant des agents la reprend
async function runReward(tuile,niveau){
  if(!S.canWrite)return;
  await mergeDoc(`recompenses/${tuile}.${niveau}`,{tuile,niveau,status:"demandee",requestedAt:Date.now(),erreur:null});
  runAgentNow("recompense",{tuile,niveau}).catch(()=>{});
}
function vEnvies(){return env().vEnvies()}
// Brief déjà rédigé (catégories de l'agent briefs) correspondant à une tuile
const TILE2BRIEF={lieu:"lieu",repas:"traiteur",cocktail:"traiteur",photo:"photo",video:"video",musique:"musique",fleurs:"fleurs",papeterie:"papeterie",tenues:"tenues",beaute:"beaute",ceremonie:"ceremonie",officiant:"ceremonie",invites:"hebergement"};
function briefFor(k){const {b,ready}=briefsState();if(!ready)return null;if(b.categories[k])return k;const c=TILE2BRIEF[k];return c&&b.categories[c]?c:null}
function fitPill(v){const fi=v.fit||{},sc=fi.score!=null?Math.round(fi.score):null;return sc!=null?`<span class="fit-pill ${fitCls(sc)} num" title="Note de fit sur 100">${sc}<small>/100</small></span>`:`<span class="fit-pill none">à analyser</span>`}
// Réponses des questions archivées lors du passage au nouveau questionnaire (docs/nos-envies-correspondance.md)
const ARCHIVED=["vision--invites","vision--periode","vision--craintes","traiteur--budgetpp","tenues--budget","alliances--artisan"];
function archivedAnswers(){return ARCHIVED.map(id=>{const d=S.brief.find(x=>x.id===id);if(!d)return null;const [c,q]=id.split("--"),Q=(QC[c]?.qs||[]).find(x=>x[0]===q);
  const r=[Array.isArray(d.choix)?d.choix.join(", "):"",d.commun,d.claire,d.julien].filter(x=>x&&String(x).trim()).join(" · ");return r&&Q?{q:Q[2],r}:null}).filter(Boolean)}
// Enregistre une réponse de « Nos envies » (fields : champs remplacés en entier, le reste du document est gardé)
async function saveEnvie(id,data,fields){
  if(!S.db||!S.canWrite)return false;
  try{await S.db.collection("envies").doc(id).set(Object.assign({},data,{by:String(S.user&&S.user.email||""),updatedAt:Date.now()}),{mergeFields:fields});
    // la synthèse du coach se refait après quelques minutes de calme (profilDue), pas à chaque réponse
    clearTimeout(saveEnvie.t);saveEnvie.t=setTimeout(()=>mergeDoc("meta/analyse",{profilRequestedAt:Date.now()}),4000);return true}catch(e){return writeErr(e)}
}
// Photo ajoutée depuis une tuile ou une question : rangée dans les inspirations de la tuile
function pickEnviePhoto(k,label){
  const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;try{const img=await loadImage(f),th=await resizeJpeg(img,480,.72);
    if(await save("inspirations",null,{cat:k,description:label||"",thumb:await b64Of(th),by:prenom()||"",source:"envies"}))toast("Photo ajoutée à vos inspirations")}catch(e){toast("Photo illisible")}};
  inp.click();
}
// Dictée dans un champ texte (même principe que la dictée du coach)
function dictate(btn,ta){
  if(!SR)return;if(btn._rec){btn._rec.stop();return}
  const base=ta.value.trim(),r=new SR();r.lang="fr-FR";r.interimResults=true;r.continuous=false;
  r.onresult=e=>{let t="";for(const x of e.results)t+=x[0].transcript;ta.value=(base?base+" ":"")+t;ta.dispatchEvent(new Event("input",{bubbles:true}))};
  r.onend=()=>{btn._rec=null;btn.classList.remove("rec")};r.onerror=e=>{if(e.error==="not-allowed")toast("Autorisez le micro pour dicter")};
  btn._rec=r;btn.classList.add("rec");r.start();
}
function synthHtml(){
  const pr=S.profil||{};
  const synth=pr.resume?`<div class="synth"><div class="panel-h"><h3>Ce que nous retenons de vous</h3>${pr.completude!=null?`<span class="chip ${pr.completude>=70?"ok":"warn"} num">Brief complet à ${Math.round(pr.completude)} %</span>`:""}</div>
    <p>${esc(pr.resume)}</p>
    ${Array.isArray(pr.divergences)&&pr.divergences.length?`<h3 class="sec" style="margin-top:14px">Points à aligner entre vous</h3>${pr.divergences.map(d=>`<div class="dv"><b>${esc(d.sujet||"")}</b>${d.claire?`<div><span style="color:var(--claire);font-weight:500">${esc(P1())} :</span> ${esc(d.claire)}</div>`:""}${d.julien?`<div><span style="color:var(--julien);font-weight:500">${esc(P2())} :</span> ${esc(d.julien)}</div>`:""}${d.conseil?`<div style="color:var(--muted)">${esc(d.conseil)}</div>`:""}</div>`).join("")}`:""}
    ${Array.isArray(pr.questionsOuvertes)&&pr.questionsOuvertes.length?`<h3 class="sec" style="margin-top:14px">Ce qu'il nous manque pour bien choisir</h3><ul class="blist">${pr.questionsOuvertes.map(q=>`<li>${esc(q)}</li>`).join("")}</ul>`:""}</div>`:"";
  return `${analyseBar("envies")}${synth||`<div class="synth"><p class="plan-when" style="margin:0">La synthèse du coach apparaîtra ici dès que vous aurez répondu à quelques questions : vos priorités, vos points d'accord et ce qu'il reste à trancher.</p></div>`}${briefsPanel(null)}`;
}
/* Moodboard : toutes les inspirations en mur de photos, filtrables par catégorie ; un toucher ouvre la photo en grand */
const inspSorted=()=>S.inspirations.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
// Les inspirations sont rangées par tuile de « Nos envies » (anciennes catégories traduites à l'affichage)
const inspTile=x=>env().inspTile(x),tileName=k=>env().tName(k);
const moodList=()=>{const f=S.f.moodCat||"all";return inspSorted().filter(x=>f==="all"||inspTile(x)===f)};
function moodboard(){
  const all=inspSorted(),f=TUILES.some(t=>t.k===S.f.moodCat)?S.f.moodCat:"all",list=moodList();
  if(!all.length)return `<div class="mood-empty"><b>Votre moodboard est vide</b><p>Ajoutez une photo de lieu, de déco, de tenue ou de fleurs qui vous plaît : le coach la décrit, en tire vos goûts et la range ici. Vous pouvez aussi relier un tableau Pinterest.</p>
    ${S.canWrite?`<div class="eh-acts"><button class="btn primary" data-act="inspadd">Ajouter une photo</button><button class="btn" data-go="reglages-ia">Relier Pinterest</button></div>`:""}</div>`;
  const cats=TUILES.filter(t=>all.some(x=>inspTile(x)===t.k));
  const chips=`<div class="mood-f" role="group" aria-label="Filtrer par tuile"><button class="chip" data-act="moodcat" data-v="all" aria-pressed="${f==="all"}">Tout · ${all.length}</button>${cats.map(t=>`<button class="chip" data-act="moodcat" data-v="${t.k}" aria-pressed="${f===t.k}">${esc(tileName(t.k))} · ${all.filter(x=>inspTile(x)===t.k).length}</button>`).join("")}</div>`;
  const tiles=list.map(x=>`<button class="mood-i" data-act="inspopen" data-id="${x.id}" aria-label="${esc(x.description||"Inspiration")}"><img src="data:image/jpeg;base64,${x.thumb}" alt="" loading="lazy"><span class="mood-c">${esc(tileName(inspTile(x)))}${x.source==="pinterest"?" · Pinterest":""}</span></button>`).join("");
  return `${chips}<div class="mood">${S.canWrite?`<button class="mood-add" data-act="inspadd"><span aria-hidden="true">+</span>Ajouter une photo</button>`:""}${tiles}</div>
    <p class="plan-when mood-n">Touchez une photo pour la voir en grand, la changer de catégorie ou en parler au coach.${S.pinterest&&(S.pinterest.boards||[]).length?"":` <button class="link" data-go="reglages-ia">Relier un tableau Pinterest</button>`}</p>`;
}
/* Visionneuse d'une inspiration : grande photo, description, catégorie, source, en parler au coach */
function openInsp(id,scope){
  const list=scope?inspSorted().filter(x=>x.cat===scope):moodList(),i=list.findIndex(x=>x.id===id),x=list[i];if(!x)return;
  const nav=(d,l)=>list[i+d]?`<button class="lb-arrow ${d<0?"prev":"next"}" data-act="inspopen" data-id="${list[i+d].id}" ${scope?`data-scope="${scope}"`:""} aria-label="${l}">${d<0?"‹":"›"}</button>`:"<span></span>";
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal lb" role="dialog" aria-modal="true" aria-label="Inspiration">
    <div class="lb-img"><img src="data:image/jpeg;base64,${x.thumb}" alt="${esc(x.description||"")}">${nav(-1,"Photo précédente")}${nav(1,"Photo suivante")}</div>
    <p class="lb-n">${i+1} / ${list.length}${x.by?` · ${esc(x.by)}`:""}${x.pinUrl?` · <a href="${esc(x.pinUrl)}" target="_blank" rel="noopener noreferrer">Voir sur Pinterest</a>`:""}</p>
    <p class="lb-d">${esc(x.description||"")}</p>
    ${S.canWrite?`<div class="field"><label for="search-insp-cat">Tuile</label><select id="search-insp-cat" data-inspcat="${x.id}">${TUILES.map(t=>`<option value="${t.k}" ${t.k===inspTile(x)?"selected":""}>${esc(tileName(t.k))}</option>`).join("")}</select></div>
    <div class="lb-acts"><button class="btn primary" data-act="inspask" data-id="${x.id}">En parler au coach</button><button class="link" data-act="inspdel" data-id="${x.id}">Retirer</button></div>`:""}</div></div>`;
}
/* ---------- Day-of ---------- */
const dayKey=t=>{if(!t)return "99";const h=+String(t).slice(0,2);return (h<6?String(h+24):String(h).padStart(2,"0"))+String(t).slice(2)};
const scheduleRows=()=>S.schedule.slice().sort((a,b)=>dayKey(a.time).localeCompare(dayKey(b.time)));
function vJourJ(){
  const rows=scheduleRows();
  const hasTpl=rows.some(r=>r.template);
  return `<div class="vh"><div><h2>Le jour J</h2><p>${wDate()?esc(fmtLong(wDate()))+" · le déroulé à partager avec les témoins et les prestataires.":"Le déroulé heure par heure, à partager avec les témoins et les prestataires."}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${rows.length?`<button class="btn" data-act="pdfjourj">PDF à partager</button>`:""}<button class="btn primary" data-new="schedule" ${S.canWrite?"":"disabled"}>Ajouter un moment</button></div></div>
  ${hasTpl?`<div class="banner">Les moments marqués « modèle » sont un déroulé type. Ajustez les heures ou supprimez-les.</div>`:""}
  ${rows.length?`<div class="tl">${rows.map(r=>`<div class="tl-row" data-edit="schedule" data-id="${r.id}"><div class="tl-time">${esc(r.time||"--:--")}</div>
    <div style="min-width:0"><div style="font-weight:500;font-size:16px">${esc(r.title)}</div><div style="font-size:13px;color:var(--muted)">${esc([r.lieu,r.qui].filter(Boolean).join(" · "))}${r.note?`<div>${esc(r.note)}</div>`:""}</div></div>
    <div>${r.template?'<span class="chip">modèle</span>':""}</div></div>`).join("")}</div>`
    :emptyBlock("Pas encore de déroulé","Ajoutez les grands moments : préparatifs, mairie, cérémonie, vin d'honneur, dîner.")}`;
}

/* ---------- Assistant e-mails ---------- */
function exampleSugs(){
  const t=today(),iso=n=>isoD(addDays(t,n));
  return [
    {id:"ex1",type:"quote",from:"Maison Lebrun Traiteur",subject:"Devis mariage · 120 couverts",receivedAt:iso(-1),summary:"Devis traiteur reçu pour 120 couverts, acompte de 30 % à verser pour bloquer la date.",payload:{name:"Maison Lebrun",cat:"Traiteur",prix:11400,acompte:3420,dateAcompte:iso(20)}},
    {id:"ex2",type:"rdv",from:"Maison Lebrun Traiteur",subject:"Proposition de dégustation",receivedAt:iso(-1),summary:"Dégustation proposée un samedi soir, à confirmer par retour de mail.",payload:{title:"Dégustation traiteur",date:iso(16),time:"18:30",avec:"Maison Lebrun"}},
    {id:"ex3",type:"vendor",from:"Atelier Pivoine",subject:"Re: Demande d'informations fleurs",receivedAt:iso(-2),summary:"Une fleuriste répond à votre demande et propose un premier rendez-vous.",payload:{name:"Atelier Pivoine",cat:"Fleuriste",contact:"contact@atelier-pivoine.example"}},
    {id:"ex4",type:"rsvp",from:"Sophie Martin",subject:"Re: Save the date",receivedAt:iso(-3),summary:"Sophie confirme sa présence, avec un régime végétarien.",payload:{name:"Sophie Martin",rsvp:"oui",regime:"Végétarienne"}}
  ];
}
function payloadKV(s){
  const p=s.payload||{},L={name:"Nom",cat:"Catégorie",prix:"Montant",acompte:"Acompte",dateAcompte:"Acompte avant le",dateSolde:"Solde avant le",contact:"Contact",tel:"Téléphone",title:"Intitulé",date:"Date",time:"Heure",avec:"Avec",lieu:"Lieu",due:"Échéance",owner:"Pour",rsvp:"Réponse",regime:"Régime",vendorName:"Prestataire",amount:"Montant",kind:"Type"};
  const fmt=(k,v)=>["prix","acompte","amount"].includes(k)?eur(v):["dateAcompte","dateSolde","date","due"].includes(k)?fmtD(pd(v)):k==="rsvp"?(RSVP[v]||v):k==="owner"?(OWNERS[v]||v):v;
  const ks=Object.keys(p).filter(k=>p[k]!==""&&p[k]!=null&&L[k]);
  return ks.length?`<div class="kv">${ks.map(k=>`<div><span>${L[k]}</span><b class="num">${esc(fmt(k,p[k]))}</b></div>`).join("")}</div>`:"";
}
function sugCard(s,example){
  const [tl,tc]=SUGTYPE[s.type]||["Information",""];
  const d=pd(s.receivedAt);
  const known=s.type==="quote"||s.type==="payment"?findVendor((s.payload||{}).name||(s.payload||{}).vendorName):s.type==="rsvp"?findGuest((s.payload||{}).name):null;
  return `<article class="sug ${example?"example":""}">
    <div class="sug-top"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip ${tc}">${tl}</span>${example?'<span class="chip">Exemple</span>':""}${known?'<span class="chip">Déjà dans l\'app</span>':""}</div><span class="sug-mail">${d?esc(fmtD(d,false)):""}</span></div>
    <div class="sug-mail"><b>${esc(s.from||"Expéditeur inconnu")}</b> · ${esc(s.subject||"")}</div>
    <div class="sug-sum">${esc(s.summary||"")}</div>
    ${payloadKV(s)}
    <div class="sug-acts">${example?`<button class="btn primary sm" disabled>${SUGACT[s.type]||"Valider"}</button><button class="btn sm" disabled>Ignorer</button>`
      :`<button class="btn primary sm" data-act="accept" data-id="${s.id}" ${S.canWrite?"":"disabled"}>${SUGACT[s.type]||"Valider"}</button><button class="btn sm" data-act="dismiss" data-id="${s.id}" ${S.canWrite?"":"disabled"}>Ignorer</button>${s.type==="quote"&&S.canWrite?`<button class="btn sm" data-act="qr" data-do="${esc(`ask:On a reçu un devis de ${(s.payload||{}).name||s.from} (${(s.payload||{}).prix?eur((s.payload||{}).prix):"montant à voir"}). Compare-le avec nos autres prestataires et notre enveloppe, et dis-nous ce que tu en penses.`)}">Avis du coach</button>`:""}${s.threadUrl&&/^https:\/\/mail\.google\.com\//.test(s.threadUrl)?`<a class="btn ghost sm" href="${esc(s.threadUrl)}" target="_blank" rel="noopener">Ouvrir le mail</a>`:""}`}</div>
  </article>`;
}
function vAssistant(){
  const ag=S.agent,ps=pendingSugs().sort((a,b)=>String(b.receivedAt||"").localeCompare(String(a.receivedAt||"")));
  const hist=S.inbox.filter(s=>s.status&&s.status!=="new"&&s.type!=="ignored").sort((a,b)=>(b.decidedAt||0)-(a.decidedAt||0)).slice(0,12);
  const acc=S.inbox.filter(s=>s.status==="accepted").length;
  const on=ag.status==="actif";
  const dis=S.canWrite?"":"disabled";
  const types=ag.types||{vendor:true,quote:true,task:true,payment:true,rdv:true,rsvp:true};
  return `<div class="ag-head">
    <div style="min-width:0"><span class="pill-live ${on?"on":""}"><i></i>${on?"Actif":"Non connecté"}</span><h3 style="margin-top:10px">Assistant e-mails</h3>
      <p>${on?`Lit la boîte ${esc(ag.mailbox||"dédiée")} ${esc(planLabel("mail"))}. Dernier passage ${ag.lastRun?esc(relDay(pd(ag.lastRun))):"inconnu"}.`:"Il lira la boîte mail dédiée au mariage et vous proposera les prestataires, devis, échéances, rendez-vous et réponses d'invités qu'il y trouve."}</p></div>
    <div style="display:grid;gap:14px;justify-items:end"><div class="ag-stat"><div><b class="num">${ps.length}</b><span>à valider</span></div><div><b class="num">${acc}</b><span>ajoutés</span></div><div><b class="num">${S.inbox.length}</b><span>mails analysés</span></div></div>
      <button class="btn" data-act="runnow" data-job="mail" ${S.canWrite&&!agentBusy("mail")?"":"disabled"}>${busyLabel("mail")||"Lire la boîte maintenant"}</button></div>
  </div>
  <div class="grid2">
    <section>
      <div class="sec-row"><h3 class="sec">${ps.length?`À valider · ${ps.length}`:"Aperçu de ce que l'assistant proposera"}</h3>${ps.length>1&&S.canWrite?`<button class="btn sm primary" data-act="acceptall">Tout valider</button>`:""}</div>
      <div class="sugs">${ps.length?ps.map(s=>sugCard(s,false)).join(""):exampleSugs().map(s=>sugCard(s,true)).join("")}</div>
      ${hist.length?`<h3 class="sec" style="margin-top:28px">Historique</h3><div class="list">${hist.map(s=>`<div class="row"><div class="main"><div class="t">${esc(s.summary||s.subject)}</div><div class="m"><span>${esc((SUGTYPE[s.type]||["Info"])[0])}</span><span>${esc(s.from||"")}</span></div></div><div class="end"><span class="chip ${s.status==="accepted"?"ok":""}">${s.status==="accepted"?"Ajouté":"Ignoré"}</span>${s.status==="dismissed"?`<button class="btn ghost sm" data-act="restore" data-id="${s.id}" ${dis}>Rétablir</button>`:""}</div></div>`).join("")}</div>`:""}
    </section>
    <section>
      <div class="panel" style="margin-bottom:18px"><div class="panel-h"><h3>Comment ça marche</h3></div>
        <ol class="steps">
          <li><div><b>Une boîte dédiée</b>Donnez cette adresse aux prestataires et utilisez-la pour le site et les réponses des invités.</div></li>
          <li><div><b>Une lecture régulière</b>L'assistant lit les nouveaux mails, repère qui écrit, les montants, les dates et ce qui est demandé.</div></li>
          <li><div><b>Vous gardez la main</b>Chaque élément arrive ici comme une proposition. Rien n'entre dans le planning, le budget ou la liste d'invités sans votre validation.</div></li>
        </ol>
      </div>
      <form class="panel form" id="agent-form">
        <div class="panel-h" style="margin-bottom:0"><h3>Réglages de l'assistant</h3></div>
        <div class="field"><label for="a-mailbox">Adresse de la boîte dédiée</label><input type="email" id="a-mailbox" name="mailbox" value="${esc(ag.mailbox||"")}" placeholder="adresse@gmail.com" ${dis}></div>
        <p class="plan-when" style="margin:0">Lecture automatique : <b>${esc(planLabel("mail"))}</b>. <button type="button" class="btn ghost sm" data-go="reglages-ia" style="padding:0 4px;min-height:0">Modifier dans Réglages</button></p>
        <div class="field"><span class="lab">Ce qu'il doit repérer</span><div class="checks">${Object.entries(SUGTYPE).map(([k,[l]])=>`<label><input type="checkbox" id="a-t-${k}" name="t-${k}" ${types[k]!==false?"checked":""} ${dis}> ${l}</label>`).join("")}</div></div>
        <div class="field"><label for="a-notes">Consignes particulières</label><textarea autocomplete="off" id="a-notes" name="consignes" placeholder="Ex. ignorer les newsletters, toujours attribuer les tenues à la bonne personne…" ${dis}>${esc(ag.consignes||"")}</textarea></div>
        <div><button class="btn primary" type="submit" ${dis}>Enregistrer</button></div>
      </form>
    </section>
  </div>`;
}
function devisFromMail(s,p){
  const e={id:s.id,montant:num(p.prix),recuLe:String(s.receivedAt||new Date().toISOString()).slice(0,10),source:"mail",resume:s.summary||""};
  if(p.acompte!=null)e.acompte=num(p.acompte);["dateAcompte","dateSolde","validite","conditions","fichier"].forEach(k=>{if(p[k])e[k]=p[k]});
  if(p.invites)e.invites=num(p.invites);if(Array.isArray(p.inclus)&&p.inclus.length)e.inclus=p.inclus;if(Array.isArray(p.options)&&p.options.length)e.options=p.options;
  if(s.threadUrl)e.mailUrl=s.threadUrl;return e;
}
async function acceptSug(id,quiet){
  const s=S.inbox.find(x=>x.id===id);if(!s)return false;
  const p=Object.assign({},s.payload||{});let ok=true;
  const stamp={source:"mail",sourceId:s.id};
  if(s.type==="vendor"||s.type==="quote"){
    const v=findVendor(p.name||p.vendorName);
    const data={name:p.name||p.vendorName||"Sans nom",cat:VCATS.includes(p.cat)?p.cat:"Autre",contact:p.contact||"",tel:p.tel||""};
    if(p.prix!=null)data.prix=num(p.prix);if(p.acompte!=null)data.acompte=num(p.acompte);if(p.dateAcompte)data.dateAcompte=p.dateAcompte;if(p.dateSolde)data.dateSolde=p.dateSolde;
    // un devis reçu rejoint l'historique des devis de la fiche (le plus récent en premier)
    const entry=s.type==="quote"&&p.prix!=null?devisFromMail(s,p):null;
    if(v){const upd={};Object.keys(data).forEach(k=>{if(data[k]!==""&&data[k]!=null)upd[k]=data[k]});if(s.type==="quote"&&VSTAT_RANK[v.status]<3)upd.status="devis";
      if(entry){upd.devis=[entry,...(v.devis||[]).filter(d=>d.id!==entry.id)].slice(0,12);upd.updatedAt=Date.now()}ok=await patch("vendors",v.id,upd)}
    else ok=await save("vendors",null,Object.assign({status:s.type==="quote"?"devis":"contacte",acomptePaye:false,note:s.summary||"",mailUrl:s.threadUrl||""},data,entry?{devis:[entry]}:{},stamp));
  }else if(s.type==="task"){
    ok=await save("tasks",null,Object.assign({title:p.title||s.subject||"Tâche",phase:PH[p.phase]?p.phase:(currentPhase()||PHASES[0]).k,owner:OWNERS[p.owner]?p.owner:"deux",status:"todo",due:p.due||"",note:p.note||s.summary||"",order:999},stamp));
  }else if(s.type==="payment"){
    const v=findVendor(p.vendorName||p.name);
    if(v){const upd={};if(p.kind==="solde"){if(p.date)upd.dateSolde=p.date}else{if(p.amount!=null)upd.acompte=num(p.amount);if(p.date)upd.dateAcompte=p.date}ok=await patch("vendors",v.id,upd)}
    else ok=await save("tasks",null,Object.assign({title:`Payer ${p.vendorName||"le prestataire"}${p.amount?" ("+eur(p.amount)+")":""}`,phase:(currentPhase()||PHASES[0]).k,owner:"deux",status:"todo",due:p.date||"",note:s.summary||"",order:999},stamp));
  }else if(s.type==="rdv"){
    ok=await save("rdv",null,Object.assign({title:p.title||s.subject||"Rendez-vous",date:p.date||"",time:p.time||"",avec:p.avec||s.from||"",lieu:p.lieu||"",qui:"deux",note:s.summary||""},stamp));
  }else if(s.type==="rsvp"){
    const g=findGuest(p.name);
    const upd={};if(p.rsvp)upd.rsvp=p.rsvp;if(p.regime)upd.regime=p.regime;
    ok=g?await patch("guests",g.id,upd):await save("guests",null,Object.assign({name:p.name||s.from||"Invité",side:"commun",group:"",rsvp:p.rsvp||"attente",regime:p.regime||"",ceremonie:true,vin:true,diner:true,enfant:false},stamp));
  }
  if(ok){await patch("inbox",id,{status:"accepted",decidedAt:Date.now()});if(!quiet)toast("Ajouté")}
  return ok;
}

/* ---------- Settings ---------- */
const IA_FEAT={coach:["Coach","Vos conversations au quotidien"],brief:["Entretien Nos envies","Questions sur vos goûts, photos d'inspiration"],mail:["Lecture des mails","Tri de la boîte, devis et pièces jointes"],analyse:["Analyse des prestataires","Avis en ligne et note de fit"],synthese:["Synthèse et point de la semaine","Résumé de vos envies, point du lundi, briefs prestataires"],pinterest:["Pinterest","Description et rangement des épingles importées"]};
const IA_LVL=[["eco","Éco"],["equilibre","Équilibré"],["max","Max"]];
const IA_EFF={low:"réflexion courte",medium:"réflexion moyenne",high:"réflexion poussée"};
const euro=usd=>(usd*USD_EUR).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});
function iaPanel(){
  const ia=S.ia||{},u=S.usage.cur||{},prev=S.usage.prev||{},budget=+ia.budget||DEFAULT_BUDGET_EUR,dis=S.canWrite?"":"disabled";
  const spent=(u.usd||0)*USD_EUR,pct=Math.min(100,Math.round(spent/budget*100)),tone=pct>=100?"bad":pct>=80?"warn":"ok";
  const rows=FEATURES.map(f=>{
    const lvl=PROFILES[f][(ia.niveaux||{})[f]]?(ia.niveaux||{})[f]:"equilibre",p=PROFILES[f][lvl],st=(u.f||{})[f]||{};
    const hint=`${/opus/.test(p.model)?"Opus 5.5":"Sonnet 5.5"} · ${IA_EFF[p.effort]||p.effort}${p.maxSearches?` · ${p.maxSearches} recherches web`:""}`;
    return `<div class="ia-row"><div class="ia-t"><b>${IA_FEAT[f][0]}</b><span>${IA_FEAT[f][1]}</span></div>
      <div class="ia-c"><b class="num">${euro(st.usd||0)}</b><span>${st.calls||0} appel${(st.calls||0)>1?"s":""}</span></div>
      <div class="ia-l"><div class="seg" role="group" aria-label="Niveau pour ${IA_FEAT[f][0]}">${IA_LVL.map(([k,l])=>`<button type="button" data-act="ialvl" data-feat="${f}" data-v="${k}" aria-pressed="${k===lvl}" ${dis}>${l}</button>`).join("")}</div><span class="ia-h">${hint}</span></div></div>`}).join("");
  const resetDay=new Date(new Date().getFullYear(),new Date().getMonth()+1,1).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  return `<div class="formpanel" style="margin-top:28px" id="ia"><div class="panel-h" style="margin-bottom:6px"><h3>Coût de l'IA</h3><span class="chip ${tone==="ok"?"ok":""}">${pct} % du budget</span></div>
    ${pct>=100?`<div class="banner warn" style="margin:6px 0 12px">Budget du mois atteint : les passages automatiques des agents sont suspendus jusqu'au ${resetDay}. Le coach et les boutons « maintenant » restent disponibles.</div>`:""}
    <div class="ia-sum"><div><span class="ia-k">Ce mois-ci</span><b class="num">${euro(u.usd||0)}</b><span class="ia-k">sur ${budget.toLocaleString("fr-FR")} €</span></div><div><span class="ia-k">Mois dernier</span><b class="num ia-prev">${euro(prev.usd||0)}</b></div></div>
    <div class="ia-bar ${tone}" role="progressbar" aria-label="Budget du mois utilisé" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <div class="ia-rows">${rows}</div>
    <p class="plan-when" style="margin:14px 0 10px"><b>Éco</b> : le modèle Sonnet, environ deux fois moins cher, très bien pour trier des mails ou les questions simples. <b>Équilibré</b> (recommandé) : Opus là où le jugement compte (coach, entretien, synthèse), Sonnet pour les tâches répétitives. <b>Max</b> : Opus partout, avec une réflexion plus poussée.</p>
    <div class="ia-web"><div><b>Le coach et internet</b><span>${(S.ia.web||"ask")==="off"?"Le coach n'utilise jamais internet.":(S.ia.web||"ask")==="libre"?"Le coach cherche sur internet quand il le juge utile (3 recherches par message au plus).":"Le coach propose une recherche (inspiration, idées, avis) ; vous l'autorisez ou non, une à la fois."}</span></div>
      <div class="seg" role="group" aria-label="Accès du coach à internet">${[["off","Jamais"],["ask","Avec notre accord"],["libre","Automatique"]].map(([k,l])=>`<button type="button" data-act="iaweb" data-v="${k}" aria-pressed="${(S.ia.web||"ask")===k}" ${dis}>${l}</button>`).join("")}</div></div>
    <form class="ia-budget" id="ia-form"><label for="search-ia-budget">Budget mensuel (€)</label><input type="number" inputmode="numeric" min="1" step="1" id="search-ia-budget" name="budget" value="${esc(budget)}" ${dis}><button class="btn sm" type="submit" ${dis}>Enregistrer</button></form>
    <p class="plan-when" style="margin:10px 0 0">Estimation calculée à partir des tokens consommés (tarifs publics, 1 $ ≈ ${String(USD_EUR).replace(".",",")} €). La facture exacte est sur console.anthropic.com, où vous pouvez aussi fixer une limite de dépense stricte.</p></div>`;
}
/* Tableaux Pinterest publics → inspirations (agent pinterest-agent.js, meta/pinterest) */
const pinBoard=u=>{try{const x=new URL(String(u||"").trim());if(/^pin\.it$/i.test(x.hostname)&&x.pathname.length>2)return `https://pin.it${x.pathname}`;if(!/(^|\.)pinterest\.[a-z.]+$/i.test(x.hostname))return null;const p=x.pathname.split("/").filter(Boolean);return p.length>=2&&p[0]!=="pin"?`https://www.pinterest.com/${p[0]}/${p[1].replace(/\.rss$/i,"")}/`:null}catch(e){return null}};
const pinName=u=>{if(/^https:\/\/pin\.it\//.test(u))return "Lien partagé (le nom s'affiche après la synchronisation)";const p=new URL(u).pathname.split("/").filter(Boolean),n=decodeURIComponent(p[1]||"").replace(/-/g," ");return n.charAt(0).toUpperCase()+n.slice(1)+" · "+p[0]};
function pinterestPanel(){
  const m=S.pinterest||{},boards=m.boards||[],dis=S.canWrite?"":"disabled",running=(S.locks.pinterest||0)>Date.now()||((m.requestedAt||0)>(m.lastSyncAt||0)&&Date.now()-(m.requestedAt||0)<10*60000);
  const n=S.inspirations.filter(x=>x.source==="pinterest").length;
  const last=m.lastSyncAt?`Dernière synchronisation ${relDay(new Date(m.lastSyncAt))} à ${new Date(m.lastSyncAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}${m.lastImported!=null?` · ${m.lastImported} nouvelle${m.lastImported>1?"s":""} épingle${m.lastImported>1?"s":""}`:""}${m.remaining?` · ${m.remaining} en attente (prochain passage)`:""}.`:"Jamais synchronisé.";
  const opts=c=>{const t=c&&c!=="auto"?(OLD2TILE[c]||c):"auto";return `<option value="auto" ${t==="auto"?"selected":""}>Rangement automatique</option>${TUILES.map(x=>`<option value="${x.k}" ${t===x.k?"selected":""}>${esc(tileName(x.k))}</option>`).join("")}`};
  return `<div class="formpanel" style="margin-top:8px" id="pinterest"><div class="panel-h" style="margin-bottom:6px"><h3>Tableaux Pinterest</h3>${n?`<span class="chip ok">${n} épingle${n>1?"s":""} importée${n>1?"s":""}</span>`:""}</div>
    <p class="plan-when" style="margin:0 0 12px">Sur Pinterest, ouvrez un tableau <b>public</b>, touchez « Partager » puis « Copier le lien » et collez-le ici. Ses nouvelles épingles arrivent dans vos inspirations (Nos envies), décrites et rangées par catégorie par le coach, puis nourrissent votre fil rouge et vos briefs. Synchronisation chaque jour, 12 épingles au plus par passage.</p>
    ${boards.length?`<div class="pin-list">${boards.map((b,i)=>`<div class="pin-row"><div class="pin-t"><a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(pinName(b.url))}</a></div>
      <label class="sr" for="search-pin-cat-${i}">Catégorie de ce tableau</label><select id="search-pin-cat-${i}" data-pincat="${i}" ${dis}>${opts(b.cat)}</select>
      ${S.canWrite?`<button type="button" class="link" data-act="pindel" data-i="${i}">Retirer</button>`:""}</div>`).join("")}</div>`:""}
    ${S.canWrite?`<form class="pin-add" id="pin-form"><label class="sr" for="search-pin-url">Lien du tableau Pinterest</label><input type="url" inputmode="url" autocomplete="off" id="search-pin-url" name="url" placeholder="https://pin.it/… ou lien du tableau"><button class="btn sm" type="submit">Ajouter</button></form>`:""}
    <div class="pin-foot"><span class="plan-when" style="margin:0">${running?"Synchronisation en cours…":esc(last)}${m.status==="erreur"&&m.lastError?` <b style="color:var(--bad)">Problème : ${esc(m.lastError)}</b>`:""}</span>
      ${boards.length&&S.canWrite?`<button class="btn sm primary" data-act="pinsync" ${running?"disabled":""}>${running?"Synchronisation…":"Synchroniser maintenant"}</button>`:""}</div></div>`;
}
function vReglagesIA(){
  return `${subnav([["reglages","Général"],["reglages-ia","Agents IA"]])}<div class="vh"><div><h2>Agents IA</h2><p>Ce que font le coach et les agents, quand ils tournent, ce qu'ils coûtent et ce qu'ils peuvent consulter.</p></div></div>
  <div class="formpanel mail-link"><div class="panel-h" style="margin-bottom:6px"><h3>Assistant e-mails</h3><span class="chip ${S.agent.status==="actif"?"ok":""}">${S.agent.status==="actif"?"Actif":"Non connecté"}</span></div>
    <p class="plan-when" style="margin:0 0 12px">${S.agent.status==="actif"?`Il lit la boîte dédiée et propose devis, rendez-vous et tâches à valider. Dernier passage ${S.agent.lastRun?relDay(pd(S.agent.lastRun)):"inconnu"}.`:"Branchez la boîte mail dédiée : les devis, échéances et réponses d'invités arriveront prêts à être validés."}</p>
    <button class="btn" data-go="assistant">Voir les e-mails analysés${pendingSugs().length?` (${pendingSugs().length} à valider)`:""}</button></div>
  ${pinterestPanel()}
  <div style="margin-top:28px"><h3 class="sec" style="font-size:22px;font-family:var(--f-display)">Planning des agents</h3>
    <p class="plan-when" style="margin:0 0 12px">Les agents vérifient toutes les 10 minutes s'ils ont du travail et tournent selon le planning ci-dessous. Un passage demandé depuis l'app démarre tout de suite.</p>
    <div class="plans">${planForm("mail")}${planForm("analyse")}</div></div>
  ${iaPanel()}`;
}
function vReglages(){
  const s=S.settings,dis=S.canWrite?"":"disabled";
  if(S.pushState===null)setTimeout(()=>refreshPushState().catch(()=>{S.pushState="unsupported";render()}),0);
  return `${subnav([["reglages","Général"],["reglages-ia","Agents IA"]])}<div class="vh"><div><h2>Réglages</h2><p>Les infos de base qui alimentent le compte à rebours et les échéances. Le budget total se règle dans Budget.</p></div></div>
  <form class="formpanel form" id="settings-form">
    <div class="cols2">
      <div class="field"><label for="search-s-p1">Prénom (partenaire 1)</label><input type="text" autocomplete="off" id="search-s-p1" name="prenom1" value="${esc(s.prenom1||"")}" ${dis}></div>
      <div class="field"><label for="search-s-p2">Prénom (partenaire 2)</label><input type="text" autocomplete="off" id="search-s-p2" name="prenom2" value="${esc(s.prenom2||"")}" ${dis}></div>
      <div class="field"><label for="search-s-date">Date du mariage</label><input type="date" id="search-s-date" name="date" value="${esc(s.date||"")}" ${dis}>
        <label class="toggle" style="margin-top:8px"><input type="checkbox" id="search-s-dateind" name="dateIndicative" ${s.dateIndicative?"checked":""} ${dis}> Pas encore fixée : date indicative</label></div>
      <div class="field"><label for="search-s-lieu">Lieu de réception</label><input type="text" autocomplete="off" id="search-s-lieu" name="lieu" value="${esc(s.lieu||"")}" placeholder="Nom du domaine, de la salle…" ${dis}></div>
      <div class="field"><label for="search-s-ville">Ville</label><input type="text" autocomplete="off" id="search-s-ville" name="ville" value="${esc(s.ville||"")}" ${dis}></div>
      <div class="field"><label for="search-s-mairie">Mairie</label><input type="text" autocomplete="off" id="search-s-mairie" name="mairie" value="${esc(s.mairie||"")}" placeholder="Commune où le mariage est célébré" ${dis}></div>
      <div class="field"><label for="search-s-cible">Nombre d'invités visé</label><input type="number" inputmode="numeric" min="0" id="search-s-cible" name="invitesCible" value="${esc(s.invitesCible??"")}" ${dis}></div>
    </div>
    <div class="field"><label for="search-s-notes">Notes communes</label><textarea autocomplete="off" id="search-s-notes" name="notes" ${dis}>${esc(s.notes||"")}</textarea></div>
    <div><button class="btn primary" type="submit" ${dis}>Enregistrer</button></div>
  </form>

  <div class="formpanel" style="margin-top:28px"><div class="panel-h" style="margin-bottom:6px"><h3>Photo du couple</h3></div>
    <div class="photo-row">${coupleAvatar()}<div><p class="plan-when" style="margin:0 0 10px">Affichée en haut de l'app, à côté du compte à rebours ; la toucher ouvre ces réglages. La même pour vous deux.</p>
    ${S.canWrite?`<button class="btn sm" data-act="couplephoto">${S.photo&&S.photo.data?"Changer":"Ajouter une photo"}</button>${S.photo&&S.photo.data?` <button class="btn sm" data-act="couplephotox">Retirer</button>`:""}`:""}</div></div></div>
  ${pushPanel()}
  <div class="formpanel" style="margin-top:28px"><div class="panel-h" style="margin-bottom:6px"><h3>Apparence</h3></div>
    <p class="plan-when" style="margin:0 0 12px">Choix propre à cet appareil. « Automatique » suit le réglage clair ou sombre du téléphone.</p>
    <div class="seg" role="group" aria-label="Thème">${[["auto","Automatique"],["light","Clair"],["dark","Sombre"]].map(([k,l])=>`<button data-act="theme" data-v="${k}" aria-pressed="${themePref()===k}">${l}</button>`).join("")}</div></div>
  <div class="formpanel" style="margin-top:28px"><div class="panel-h" style="margin-bottom:6px"><h3>Compte</h3></div>
    <p class="plan-when" style="margin:0 0 12px">Connecté en tant que <b>${esc(S.user&&S.user.email||"")}</b>.</p>
    <button class="btn" type="button" data-act="logout">Se déconnecter</button></div>
  <div class="help" style="margin-top:28px">
    <h3 class="sec">Travailler à deux</h3>
    <ul>
      <li>${esc(COUPLE())} se connectent chacun avec leur propre compte (Google ou lien par e-mail) : les données sont les mêmes et se mettent à jour en direct sur vos deux téléphones.</li>
      <li>Chaque tâche a un responsable (${esc(P1())}, ${esc(P2())} ou les deux). Le filtre du Planning montre ce qui revient à chacun, tâches communes comprises.</li>
      <li>Pour la mairie, retirez le dossier tôt : les pièces demandées (actes de naissance récents, justificatifs de domicile, liste des témoins) ont une durée de validité.</li>
    </ul>
  </div>`;
}

/* ---------- Documents PDF (impression du navigateur : « Enregistrer en PDF » ou partager) ---------- */
// Fabrique un vrai PDF (module chargé à la demande) puis propose de le partager / l'enregistrer.
async function makePdf(name,spec){
  toast("Préparation du PDF…");
  try{
    const {buildPdf}=await import("./pdf.js");
    const st=S.settings,d=wDate();
    const blob=await buildPdf(Object.assign({title:COUPLE(" & "),subtitle:[d?fmtLong(d).replace(/^./,c=>c.toUpperCase())+(st.dateIndicative?" (date indicative, à confirmer)":""):"",[st.lieu,st.ville].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      footer:`Généré le ${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})} depuis Lamaelle, l'app du mariage de ${COUPLE(" & ")}`},spec));
    showPdf(new File([blob],name,{type:"application/pdf"}));
  }catch(e){console.error(e);toast("Le PDF n'a pas pu être créé")}
}
function showPdf(file){
  S.pdfFile=file;const url=URL.createObjectURL(file);
  const canShare=!!(navigator.canShare&&navigator.canShare({files:[file]}));
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="PDF prêt"><h3>PDF prêt</h3>
    <p class="plan-when" style="margin:-6px 0 16px">${esc(file.name)} · ${Math.max(1,Math.round(file.size/1024))} Ko</p>
    <div class="pdf-acts">${canShare?`<button class="btn primary" data-act="pdfshare">Partager ou enregistrer</button>`:""}
      <a class="btn ${canShare?"":"primary"}" href="${url}" download="${esc(file.name)}" target="_blank" rel="noopener">Ouvrir le PDF</a></div>
    <p class="plan-when" style="margin:14px 0 0">${canShare?"« Partager » permet de l'envoyer (Messages, WhatsApp, mail) ou de l'enregistrer dans Fichiers.":"Le PDF s'ouvre dans un nouvel onglet : utilisez ensuite le bouton de partage pour l'enregistrer."}</p></div></div>`;
}
const dayKeyPdf=r=>dayKey(r.time);
function pdfJourJ(){
  const rows=scheduleRows(),vs=S.vendors.filter(v=>v.status==="reserve");
  makePdf(`Jour J - ${COUPLE()}.pdf`,{docTitle:"Déroulé du jour J",blocks:[
    {table:{head:["Heure","Moment","Lieu","Qui"],widths:[18,null,40,38],boldFirst:true,body:rows.map(r=>[r.time||"—",r.title+(r.note?"\n"+r.note:""),r.lieu||"",r.qui||""])}},
    ...(vs.length?[{h2:"Prestataires"},{table:{head:["Prestataire","Catégorie","Contact"],boldFirst:true,body:vs.map(v=>[v.name,v.cat||"",[v.contact,v.tel].filter(Boolean).join(" · ")])}}]:[]),
  ]});
}
function pdfReport(){
  const st=S.settings,d=wDate(),tot=num(st.budgetTotal),pr=S.profil||{};
  const sum=k=>S.budget.reduce((a,b)=>a+num(b[k]),0),prevu=sum("prevu"),engage=sum("engage"),paye=sum("paye");
  const done=S.tasks.filter(t=>t.status==="done").length,late=S.tasks.filter(isLate);
  const next=S.tasks.filter(t=>t.status!=="done").sort((a,b)=>{const da=taskDue(a),db=taskDue(b);return (da?+da:9e15)-(db?+db:9e15)||byOrder(a,b)}).slice(0,12);
  const g=S.guests,yes=g.filter(x=>x.rsvp==="oui").length,no=g.filter(x=>x.rsvp==="non").length;
  const groups=[...new Set(g.map(x=>x.group||"Sans groupe"))].map(k=>[k,g.filter(x=>(x.group||"Sans groupe")===k).length]).sort((a,b)=>b[1]-a[1]);
  const cats=VCATS.filter(c=>S.vendors.some(v=>v.cat===c));
  const al=alerts(),rdv=S.rdv.filter(r=>r.date&&pd(r.date)>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const n=d?days(today(),d):null;
  const blocks=[
    {kpis:[["Jour J",n!=null?`J-${n}`:"—",d?fmtD(d):"date à fixer"],["Préparation",`${done}/${S.tasks.length}`,late.length?`${late.length} en retard`:"rien en retard"],["Budget",tot?eur(tot):"—",`${eur(prevu)} prévus · ${eur(engage)} engagés`],["Invités",String(g.length),`${yes} présents · ${g.length-yes-no} en attente`]]},
  ];
  if(pr.resume){blocks.push({h2:"La synthèse du coach"},{p:pr.resume});if(Array.isArray(pr.priorites)&&pr.priorites.length)blocks.push({ul:pr.priorites.slice(0,6).map(x=>x.phrase||"")});
    if(Array.isArray(pr.divergences)&&pr.divergences.length)blocks.push({h3:"Points à aligner entre vous"},{ul:pr.divergences.map(x=>(x.sujet||"")+(x.conseil?" : "+x.conseil:""))})}
  if(al.length)blocks.push({h2:"À regarder"},{alerts:al.map(a=>[a.lvl,a.t,a.s])});
  blocks.push({h2:"Prochaines tâches"},{table:{head:["Tâche","Échéance","Qui"],widths:[null,28,24],body:next.map(t=>{const du=taskDue(t);return [t.title+(t.status==="doing"?" (en cours)":"")+(isLate(t)?" — en retard":""),du?fmtD(du):"—",OWNERS[t.owner||"deux"]]})}});
  blocks.push({h2:"Budget"},{table:{head:["Poste","Prévu","Engagé","Payé"],widths:[null,26,26,26],right:[1,2,3],body:S.budget.slice().sort((a,b)=>(a.order??999)-(b.order??999)).map(b=>[b.label+((tot||prevu)&&num(b.prevu)?` (${Math.round(num(b.prevu)/(tot||prevu)*100)} %)`:""),b.prevu?eur(b.prevu):"—",b.engage?eur(b.engage):"—",b.paye?eur(b.paye):"—"]),
    foot:[`Total${tot?` (budget ${eur(tot)}, marge ${eur(tot-Math.max(prevu,engage))})`:""}`,eur(prevu),eur(engage),eur(paye)]}});
  blocks.push({h2:"Prestataires"});
  cats.forEach(c=>{blocks.push({h3:c},{table:{head:["Prestataire","Note","Avis du coach"],widths:[52,16,null],boldFirst:true,body:S.vendors.filter(v=>v.cat===c).sort((a,b)=>((b.fit&&b.fit.score)||-1)-((a.fit&&a.fit.score)||-1)).map(v=>{const f=v.fit||{};
    return [v.name+"\n"+[VSTAT[v.status]||"",v.prix?eur(v.prix):""].filter(Boolean).join(" · "),f.score!=null?`${Math.round(f.score)}/100`:"—",(f.verdict||"Pas encore analysé")+(f.vigilance&&f.vigilance.length?"\nVigilance : "+f.vigilance.slice(0,2).join(" ; "):"")]})}})});
  if(rdv.length)blocks.push({h2:"Rendez-vous à venir"},{ul:rdv.map(r=>`${fmtD(pd(r.date))}${r.time?" "+r.time:""} — ${r.title}${r.lieu?" ("+r.lieu+")":""}`)});
  blocks.push({h2:"Invités"},{p:`${g.length} invités dont ${g.filter(x=>x.enfant).length} enfants · ${yes} présents, ${no} absents, ${g.length-yes-no} en attente · ${g.filter(x=>x.rsvp!=="non"&&x.diner!==false).length} au dîner.`},
    {note:"Par groupe : "+groups.map(([k,v])=>`${k} ${v}`).join(" · ")+(g.some(x=>x.regime)?"\nRégimes : "+g.filter(x=>x.regime).map(x=>x.name+" ("+x.regime+")").join(", "):"")});
  blocks.push({h2:"Nos envies"},{note:`Lamaelle vous connaît à ${Math.round(allProg()*100)} % · `+TUILES.map(t=>`${tileName(t.k)} : ${env().etat(env().stateOf(t.k)).toLowerCase()}`).join(" · ")});
  makePdf(`Rapport - ${COUPLE()} - ${isoD(today())}.pdf`,{docTitle:"Rapport d'organisation · "+fmtD(today()),blocks});
}

/* ---------- Assistant IA intégré ---------- */
const VIEW_LABEL=()=>VIEW_NAMES[S.view]||"Coach";
// Mise en forme légère des réponses : paragraphes, listes à puces, **gras**
function mdLite(t){
  const inline=x=>esc(x).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  const out=[];let list=[];
  const flush=()=>{if(list.length){out.push(`<ul>${list.map(li=>`<li>${inline(li)}</li>`).join("")}</ul>`);list=[]}};
  String(t||"").split(/\n/).forEach(l=>{const m=l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);if(m)list.push(m[1]);else{flush();if(l.trim())out.push(`<p>${inline(l)}</p>`)}});
  flush();return out.join("");
}
// Suggestions de la conversation : en mode chat, celles de coachSuggestions (tirées de l'état de l'app)
const CHAT_SUGG={brief:["Commençons le questionnaire Nos envies","Reprenons là où on s'était arrêtés"]};
// Un mail rédigé par le coach commence par « Objet : … »
function mailOf(t){const m=String(t||"").match(/(?:^|\n)\s*\**Objet\s*:\**\s*(.+)\n([\s\S]+)/i);return m?{subject:m[1].replace(/\*+/g,"").trim(),body:m[2].replace(/\*\*/g,"").trim()}:null}
const mailHref=m=>`mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
/* Intercepteur internet : le coach propose une recherche, l'un des deux l'autorise (une recherche à la fois) */
function webAsk(m,i){
  const w=(m.actions||[]).find(a=>a.web);if(!w)return "";
  const last=S.chat.messages.length-1===i;
  if(m.webDecided||!last||S.chat.busy||!S.canWrite)return m.webDecided?`<div class="webask done">${m.webDecided==="ok"?"Recherche autorisée":"Recherche refusée"} : « ${esc(w.web.requete)} »</div>`:"";
  return `<div class="webask" role="group" aria-label="Recherche sur internet proposée"><b>Le coach propose de chercher sur internet</b>
    <p>« ${esc(w.web.requete)} »</p>${w.web.pourquoi?`<span>${esc(w.web.pourquoi)}</span>`:""}
    <div class="webask-a"><button class="btn sm primary" data-act="webok" data-i="${i}">Autoriser cette recherche</button><button class="link" data-act="webno" data-i="${i}">Non merci</button></div></div>`;
}
// Outil ouvrir_page du coach : un bouton « Ouvrir le budget » dans la conversation (jamais de navigation automatique)
const OPEN_VIEWS=new Set([...VIEWS.map(v=>v[0]),...Object.keys(PARENT_VIEW)]);
function openBtns(m){
  const list=(m.actions||[]).filter(a=>a.open&&(a.open.page==="fiche"?a.open.id:OPEN_VIEWS.has(a.open.page)));
  return list.length?`<div class="open-acts">${list.map(a=>`<button class="btn sm" data-act="chatopen" data-p="${esc(a.open.page)}" data-id="${esc(a.open.id||"")}">${esc(a.label)}</button>`).join("")}</div>`:"";
}
function chatItems(){
  const c=S.chat;
  const msgs=c.messages.map((m,i)=>m.role==="user"?`<div class="cm u">${(m.thumbs||[]).length?`<div class="cm-thumbs">${m.thumbs.map(u=>`<img src="${u}" alt="Photo envoyée">`).join("")}</div>`:""}<div class="bub">${esc(m.text)}</div></div>`
    :`<div class="cm a"><div class="bub">${mdLite(m.text)}${(m.sources||[]).length?`<div class="srcs"><span>Sources</span>${m.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title||x.url)}</a>`).join("")}</div>`:""}</div>${webAsk(m,i)}${openBtns(m)}${mailOf(m.text)?`<div class="mail-acts"><button class="link" data-act="mailcopy" data-i="${i}">Copier le mail</button><a class="link" href="${mailHref(mailOf(m.text))}">Ouvrir dans Mail</a></div>`:""}${(m.actions||[]).filter(a=>!a.web&&!a.open).length?`<div class="acts-done">${m.actions.filter(a=>!a.web&&!a.open).map(a=>`<span class="adone ${m.undone?"undone":""}">✓ ${esc(a.label)}</span>`).join("")}
      ${m.undone?'<span class="undone-l">Annulé</span>':(m.actions.some(a=>a.ops&&a.ops.length)&&S.canWrite?`<button class="link" data-act="chatundo" data-i="${i}">Annuler</button>`:"")}</div>`:""}</div>`);
  const sugg=!c.busy&&(!c.messages.length||c.mode==="brief"&&c.messages.length<2)?`<div class="chat-sugg">${(c.mode==="chat"?coachSuggestions(alerts()).map(([l,d])=>[l,d.replace(/^ask:/,"")]):CHAT_SUGG[c.mode].map(x=>[x,x])).map(([l,x])=>`<button class="chip" data-act="chatsugg" data-t="${esc(x)}">${esc(l)}</button>`).join("")}</div>`
    :!c.busy&&c.mode==="brief"&&S.canWrite?`<div class="chat-sugg"><button class="chip" data-act="chatfile">Montrer une photo au coach</button></div>`:"";
  const intro=!c.messages.length?`<div class="chat-intro"><b>${c.mode==="brief"?"Entretien « Nos envies »":"Bonjour, je suis votre coach mariage"}</b><p>${c.mode==="brief"?"Je vous pose les questions du questionnaire une par une, en langage naturel, et je note vos réponses au fur et à mesure.":"Comme un wedding planner : je connais votre date, votre budget, vos envies et vos prestataires. Posez-moi une question ou demandez-moi d'agir (ajouter une tâche, ranger des invités, noter un devis, préparer une visite). Chaque action s'annule d'un toucher."}</p></div>`:"";
  return [["intro",intro],...msgs.map((h,i)=>["m"+i,h]),["busy",c.busy?`<div class="cm a"><div class="bub typing" role="status"><i></i><i></i><i></i><span class="typing-l">${esc(c.busyLabel||"Je regarde vos données…")}</span></div></div>`:""],["sugg",sugg]].filter(x=>x[1]);
}
/* Met à jour la liste sans la reconstruire : les messages déjà affichés ne bougent pas (sélection,
   position de lecture, images), seuls les nouveaux ou les modifiés sont insérés. */
function patchKeyed(box,items){
  const want=new Set(items.map(x=>x[0])),added=[];
  [...box.children].forEach(n=>{if(!want.has(n.dataset.k))n.remove()});
  let prev=null;
  for(const [k,h] of items){
    let n=[...box.children].find(x=>x.dataset.k===k);
    if(!n||n._h!==h){const t=document.createElement("template");t.innerHTML=h.trim();const nn=t.content.firstElementChild;nn.dataset.k=k;nn._h=h;if(n)n.replaceWith(nn);else added.push(nn);n=nn}
    const at=prev?prev.nextElementSibling:box.firstElementChild;
    if(n!==at)box.insertBefore(n,at);
    prev=n;
  }
  return added;
}
const chatMotion=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
const chatGap=box=>box.scrollHeight-box.scrollTop-box.clientHeight;
function chatPill(){
  const box=document.getElementById("chat-msgs"),pill=document.getElementById("chat-new");if(!box||!pill)return;
  const c=S.chat,far=chatGap(box)>160;
  // la nouvelle réponse est-elle déjà à l'écran ?
  if(c.unseen){const n=[...box.children].find(x=>x.dataset.k===c.unseen);if(!n||n.offsetTop<box.scrollTop+box.clientHeight-40)c.unseen=null}
  pill.hidden=!(c.unseen||far);
  pill.innerHTML=c.unseen?'Nouvelle réponse <span aria-hidden="true">↓</span>':'<span aria-hidden="true">↓</span>';
  pill.setAttribute("aria-label",c.unseen?"Aller à la nouvelle réponse":"Aller en bas de la conversation");
  pill.classList.toggle("round",!c.unseen);
}
function chatJump(){
  const box=document.getElementById("chat-msgs");if(!box)return;const c=S.chat;
  const n=c.unseen&&[...box.children].find(x=>x.dataset.k===c.unseen);
  box.scrollTo({top:n?Math.max(0,n.offsetTop-56):box.scrollHeight,behavior:chatMotion()});
  c.unseen=null;setTimeout(chatPill,400);
}
/* intent : "open" (en bas, sans animation), "send" (on suit son message), "answer" (on montre le début de la
   réponse si l'on suivait la conversation ; sinon on ne bouge pas et on propose « Nouvelle réponse »). */
function renderChat(intent){
  const box=document.getElementById("chat-msgs");if(!box)return;const c=S.chat;
  const pinned=chatGap(box)<80,first=!box.children.length;
  const added=patchKeyed(box,chatItems());
  if(intent==="open"||first){box.scrollTop=box.scrollHeight}
  else if(intent==="send"){c.unseen=null;box.scrollTo({top:box.scrollHeight,behavior:chatMotion()})}
  else if(intent==="answer"){
    const n=added.filter(x=>x.classList.contains("a")).pop()||[...box.children].filter(x=>x.dataset.k&&x.dataset.k[0]==="m").pop();
    if(n){n.classList.add("enter");
      if(pinned){c.unseen=null;box.scrollTo({top:Math.min(Math.max(0,n.offsetTop-56),box.scrollHeight-box.clientHeight),behavior:chatMotion()})}
      else c.unseen=n.dataset.k}
  }
  else if(pinned&&added.length)box.scrollTo({top:box.scrollHeight,behavior:chatMotion()});
  chatPill();
  const b=document.getElementById("chat-send");if(b)b.disabled=S.chat.busy;
  const md=document.getElementById("chat-mode");if(md)md.innerHTML=S.chat.mode==="brief"?`<span class="chip acc">Entretien Nos envies</span><button class="link" data-act="chatmode" data-m="chat">Quitter</button>`:`<button class="link" data-act="chatmode" data-m="brief">Remplir nos envies avec le coach</button>`;
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function toggleMic(btn){
  const c=S.chat;if(c.rec){c.rec.stop();return}
  const ta=document.getElementById("chat-text");const base=ta.value.trim();
  const r=new SR();r.lang="fr-FR";r.interimResults=true;r.continuous=false;
  r.onresult=e=>{let t="";for(const x of e.results)t+=x[0].transcript;ta.value=(base?base+" ":"")+t;ta.dispatchEvent(new Event("input",{bubbles:true}))};
  r.onend=()=>{c.rec=null;btn.classList.remove("rec");btn.setAttribute("aria-label","Dicter")};
  r.onerror=e=>{if(e.error==="not-allowed")toast("Autorisez le micro pour dicter (ou utilisez le micro du clavier)")};
  c.rec=r;btn.classList.add("rec");btn.setAttribute("aria-label","Arrêter la dictée");r.start();
}
const b64Of=blob=>new Promise((ok,ko)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(",")[1]);fr.onerror=ko;fr.readAsDataURL(blob)});
async function loadImage(file){const url=URL.createObjectURL(file);try{return await new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=url})}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}}
async function resizeJpeg(img,max,q){const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement("canvas");cv.width=Math.round(img.naturalWidth*k);cv.height=Math.round(img.naturalHeight*k);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);return new Promise(ok=>cv.toBlob(ok,"image/jpeg",q))}
async function pickFiles(files){
  const c=S.chat;c.atts=c.atts||[];
  for(const file of [...(files||[])]){
    if(c.atts.length>=3){toast("3 pièces jointes au plus par message");break}
    try{
      if(file.type==="application/pdf"){if(file.size>6e6){toast("PDF trop lourd (6 Mo au plus)");continue}c.atts.push({media_type:"application/pdf",data:await b64Of(file),name:file.name||"document.pdf"})}
      else if(/^image\//.test(file.type)){
        const img=await loadImage(file),blob=await resizeJpeg(img,1600,.82),th=await resizeJpeg(img,480,.72);
        c.atts.push({media_type:"image/jpeg",data:await b64Of(blob),thumb:await b64Of(th),name:file.name||"photo.jpg",preview:URL.createObjectURL(th)});
      }else toast("Photo ou PDF uniquement");
    }catch(e){toast("Impossible de lire ce fichier")}
  }
  renderAtt();
}
const pickFile=f=>pickFiles(f?[f]:[]);
function renderAtt(){const box=document.getElementById("chat-att");if(!box)return;const as=S.chat.atts||[];
  box.innerHTML=as.length?`<div class="atts">${as.map((a,i)=>`<div class="att" title="${esc(a.name)}">${a.preview?`<img src="${a.preview}" alt="${esc(a.name)}">`:'<span class="att-pdf">PDF</span>'}<button type="button" class="att-x" data-act="chatattx" data-i="${i}" aria-label="Retirer ${esc(a.name)}">×</button></div>`).join("")}${as.length<3?`<button type="button" class="att-more" data-act="chatfile" aria-label="Ajouter une photo">+</button>`:""}</div>`:"";
  const ta=document.getElementById("chat-text");if(ta)ta.placeholder=as.length?(as.length>1?"Dites au coach ce qu'il doit regarder…":"Dites au coach ce qui vous plaît…"):"Message ou photo…";
  const ms=document.getElementById("chat-msgs");if(ms)ms.scrollTop=ms.scrollHeight}
async function openChat(mode,prefill){
  const c=S.chat,switched=!!mode&&mode!==c.mode;if(switched)c.mode=mode;
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal chat" role="dialog" aria-modal="true" aria-label="Coach mariage">
    <div class="chat-h"><h3>Votre coach</h3><button class="link" data-act="chatreset" ${c.busy?"disabled":""}>Nouvelle conversation</button></div>
    <div class="chat-mode" id="chat-mode"></div>
    <div class="chat-wrap"><div class="chat-msgs" id="chat-msgs" aria-live="polite"></div><button type="button" class="chat-new" id="chat-new" data-act="chatbottom" hidden></button></div>
    <form class="chat-in" id="chat-form"><input type="file" id="chat-file" accept="image/*,application/pdf" multiple hidden>
    <div class="cmp"><div id="chat-att"></div>
    <label class="sr" for="chat-text">Votre message</label><textarea autocomplete="off" name="search_message" enterkeyhint="send" id="chat-text" rows="1" placeholder="Message ou photo…" ${S.canWrite?"":"disabled"}></textarea>
    <div class="cmp-bar"><button type="button" class="ch-ic" data-act="chatfile" aria-label="Joindre une photo ou un PDF" ${S.canWrite?"":"disabled"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
    ${SR?`<button type="button" class="ch-ic" id="chat-mic" data-act="chatmic" aria-label="Dicter" ${S.canWrite?"":"disabled"}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>`:""}
    <button class="cmp-send" id="chat-send" type="submit" aria-label="Envoyer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div></div></form></div></div>`;
  renderChat("open");renderAtt();
  { // suivi de la lecture : bouton « Nouvelle réponse », et bas de conversation conservé quand le clavier se ferme
    const box=document.getElementById("chat-msgs");let pinned=true;
    box.addEventListener("scroll",()=>{pinned=chatGap(box)<80;chatPill()},{passive:true});
    if(window.ResizeObserver)new ResizeObserver(()=>{if(pinned)box.scrollTop=box.scrollHeight}).observe(box);
  }
  if(prefill!=null){const ta=document.getElementById("chat-text");ta.value=prefill;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}
  if(!c.loaded&&S.db&&S.user){try{const d=(await S.db.doc("chats/"+String(S.user.email).toLowerCase()).get()).data();c.loaded=true;if(d&&Array.isArray(d.messages)&&!c.messages.length){c.messages=d.messages;if(d.mode&&!mode)c.mode=d.mode}renderChat("open")}catch(e){}}
  if(mode==="brief"&&(switched||!c.messages.length))sendChat("Commençons le questionnaire Nos envies.");
}
async function sendChat(text,opts={}){
  const c=S.chat;text=String(text||"").trim();const atts=c.atts||[];if((!text&&!atts.length)||c.busy||!S.canWrite)return;
  c.atts=[];renderAtt();
  const nI=atts.filter(a=>a.media_type!=="application/pdf").length,nP=atts.length-nI,tag=[nI?(nI>1?`${nI} photos jointes`:"photo jointe"):"",nP?(nP>1?`${nP} PDF joints`:"PDF joint"):""].filter(Boolean).join(", ");
  c.messages.push({role:"user",text:(text+(tag?` [${tag}]`:"")).trim(),thumbs:atts.filter(a=>a.preview).map(a=>a.preview)});c.busy=true;c.busyLabel="Je regarde vos données…";renderChat("send");
  // Libellé d'attente qui évolue (la réponse prend souvent 10 à 20 secondes)
  const steps=["Je regarde vos données…","Je prépare la réponse…","Encore un instant…"];let k=0;
  const tick=setInterval(()=>{if(!c.busy){clearInterval(tick);return}k=Math.min(k+1,steps.length-1);c.busyLabel=steps[k];const l=document.querySelector(".typing-l");if(l)l.textContent=steps[k]},6000);
  try{const r=await callAssistant({message:text,mode:c.mode,view:VIEW_LABEL(),...(opts.web?{web:true}:{}),...(atts.length?{attachments:atts.map(a=>({media_type:a.media_type,data:a.data,...(a.thumb?{thumb:a.thumb}:{})}))}:{})});c.messages.push({role:"assistant",text:r.text,actions:r.actions||[],sources:r.sources||[]});(r.actions||[]).forEach(a=>a.kick&&kick(a.kick))}
  catch(e){const msg=e&&/functions\/(resource-exhausted|failed-precondition)/.test(e.code||"")||e&&e.code==="functions/unavailable"&&e.message&&!/^unavailable$/i.test(e.message)?e.message:e&&e.code==="functions/permission-denied"?`Coach réservé à ${COUPLE()}.`:e&&/not-found|internal|unavailable/.test(e.code||"")?"Le coach ne répond pas pour l'instant. Réessayez dans un moment.":"Erreur : "+(e&&e.message||e);
    c.messages.push({role:"assistant",text:msg,actions:[],error:true})}
  c.busy=false;renderChat("answer");
}
async function undoChat(i){
  const m=S.chat.messages[i];if(!m||m.undone)return;
  try{
    for(const a of (m.actions||[]).slice().reverse())for(const op of (a.ops||[]).slice().reverse()){
      const ref=S.db.doc(op.path);op.before?await ref.set(op.before):await ref.delete();
    }
    m.undone=true;renderChat();toast("Actions annulées");
    await S.db.doc("chats/"+String(S.user.email).toLowerCase()).set({messages:S.chat.messages.filter(x=>!x.error).map(({thumbs,...x})=>x),mode:S.chat.mode,updatedAt:Date.now()});
  }catch(e){writeErr(e)}
}

/* ---------- Photo du couple (commune aux deux, stockée réduite dans meta/photo) ---------- */
async function setCouplePhoto(file){
  if(!file||!/^image\//.test(file.type)){toast("Choisissez une photo");return}
  try{
    const img=await loadImage(file),side=Math.min(img.naturalWidth,img.naturalHeight),S0=320;
    const cv=document.createElement("canvas");cv.width=cv.height=S0;
    cv.getContext("2d").drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,S0,S0);
    const blob=await new Promise(ok=>cv.toBlob(ok,"image/jpeg",.85));
    if(await setDoc("meta/photo",{},{data:await b64Of(blob),updatedAt:Date.now()}))toast("Photo du couple enregistrée");
  }catch(e){toast("Impossible de lire cette photo")}
}
function pickCouplePhoto(){let i=document.getElementById("couple-file");if(!i){i=document.createElement("input");i.type="file";i.accept="image/*";i.id="couple-file";i.hidden=true;document.body.appendChild(i);i.addEventListener("change",()=>{setCouplePhoto(i.files&&i.files[0]);i.value=""})}i.click()}

const presKey=()=>String(S.user&&S.user.email||"").toLowerCase().replace(/[^a-z0-9]/g,"_");

/* ---------- Notifications push ---------- */
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const b64u=s=>{const p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0))};
const subId=sub=>btoa(sub.endpoint).replace(/[^a-zA-Z0-9]/g,"").slice(-60);
async function refreshPushState(){
  let st;
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))st=isIOS()&&!isStandalone()?"install":"unsupported";
  else if(Notification.permission==="denied")st="denied";
  else{const reg=await navigator.serviceWorker.getRegistration("/");const sub=reg&&await reg.pushManager.getSubscription();st=sub?"on":"off"}
  if(st!==S.pushState){S.pushState=st;if(S.view==="reglages"||S.view==="apercu")render()}
}
async function enablePush(){
  if(!S.push.publicKey){toast("Les notifications seront prêtes après le prochain passage des agents (10 min)");return}
  const perm=await Notification.requestPermission();
  if(perm!=="granted"){await refreshPushState();toast("Notifications refusées");return}
  const reg=await navigator.serviceWorker.register("/sw.js");await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(S.push.publicKey)});
  await save("pushSubs",subId(sub),{sub:JSON.parse(JSON.stringify(sub)),email:S.user&&S.user.email||"",ua:navigator.userAgent.slice(0,160),createdAt:Date.now()});
  reg.showNotification("Notifications activées",{body:"Vous serez prévenus des nouvelles propositions et des analyses terminées.",icon:"/icon.svg"});
  await refreshPushState();
}
async function disablePush(){
  const reg=await navigator.serviceWorker.getRegistration("/");const sub=reg&&await reg.pushManager.getSubscription();
  if(sub){await remove("pushSubs",subId(sub));await sub.unsubscribe()}
  await refreshPushState();toast("Notifications coupées sur ce téléphone");
}
function pushPanel(){
  const st=S.pushState;
  const txt={on:"Activées sur ce téléphone. Vous êtes prévenus des nouvelles propositions de l'assistant et des analyses terminées.",
    off:"Recevez une notification quand l'assistant trouve un devis ou un rendez-vous dans vos mails, ou quand une analyse est terminée.",
    install:"Sur iPhone, les notifications ne marchent que depuis l'app installée : Safari → Partager → « Sur l'écran d'accueil », puis ouvrez l'app depuis son icône et revenez ici.",
    denied:"Les notifications sont bloquées pour cette app. Réautorisez-les dans les réglages du téléphone (Notifications → Mariage), puis revenez ici.",
    unsupported:"Ce navigateur ne gère pas les notifications push.",null:"Vérification…"}[st];
  return `<div class="formpanel" style="margin-top:28px"><div class="panel-h" style="margin-bottom:6px"><h3>Notifications</h3>${st==="on"?'<span class="chip ok">Activées</span>':""}</div>
    <p class="plan-when" style="margin:0 0 12px">${txt}</p>
    ${st==="off"?`<button class="btn primary" data-act="pushon" ${S.canWrite?"":"disabled"}>Activer sur ce téléphone</button>`:st==="on"?`<button class="btn" data-act="pushoff">Couper sur ce téléphone</button>`:""}</div>`;
}
const THEME_KEY="mariage-theme";
const themePref=()=>{try{const t=localStorage.getItem(THEME_KEY);return t==="light"||t==="dark"?t:"auto"}catch(e){return "auto"}};
function applyTheme(t){
  const r=document.documentElement;if(t==="light"||t==="dark")r.dataset.theme=t;else delete r.dataset.theme;
  try{t==="auto"?localStorage.removeItem(THEME_KEY):localStorage.setItem(THEME_KEY,t)}catch(e){}
}
function emptyBlock(t,s){return `<div class="list"><div class="empty"><b>${esc(t)}</b>${esc(s)}</div></div>`}

/* ---------- Render ---------- */
const VIEWFN={"reglages-ia":vReglagesIA,apercu:vApercu,planning:vPlanning,agenda:vAgenda,budget:vBudget,invites:vInvites,tables:vTables,envies:vEnvies,prestataires:vPrestataires,"jour-j":vJourJ,assistant:vAssistant,reglages:vReglages};
function render(){
  renderHero();renderTabs();queueTop();
  // écran de fin de niveau ouvert : il se met à jour quand la récompense arrive (sauf pendant la correction de la phrase)
  if(env().finOpen()&&!(document.activeElement&&document.activeElement.id==="search-qs-phrase"))env().renderQ();
  const main=document.getElementById("main");
  const ae=document.activeElement,aid=ae&&main.contains(ae)?ae.id:null,sel=aid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  if(aid&&aid!=="gq"&&(ae.tagName==="TEXTAREA"||(ae.tagName==="INPUT"&&/^(text|number|email|date|time|search)$/.test(ae.type)))){S.pending=true;return}
  S.pending=false;
  let pre="";
  document.body.classList.toggle("noauth",S.mode==="login"||S.mode==="locked");
  if(S.mode==="login"){setHTML(main,loginView());return}
  if(S.mode==="locked"){setHTML(main,`<div class="lock"><h2>Accès réservé</h2><p style="color:var(--muted);margin:0 0 16px">Cette app est réservée à ${esc(COUPLE())}. Le compte <b>${esc(S.user&&S.user.email||"")}</b> n'est pas autorisé.</p><button class="btn" data-act="logout">Changer de compte</button></div>`);return}
  if(S.mode==="loading")pre=`<div class="banner">Chargement de vos données…</div>`;
  else if(S.mode==="offline")pre=`<div class="banner warn">Connexion à la base impossible. Vérifiez votre réseau puis rechargez la page.</div>`;
  if(S.mode==="live"&&S.stale)pre=`<div class="banner warn">Les données ne répondent pas pour l'instant. Ce qui s'affiche peut ne pas être à jour.</div>`;
  if(S.mode==="live"&&!S.canWrite)pre+=`<div class="banner">Vous consultez en lecture seule.</div>`;
  setHTML(main,pre+(VIEWFN[S.view]||vApercu)());
  if(aid){const el=document.getElementById(aid);if(el){el.focus();if(sel)try{el.setSelectionRange(sel[0],sel[1])}catch(e){}}}
}
// Haut de page : apparence sombre sous la barre d'état tant que l'en-tête est visible (voir styles.css, html.at-top).
let topRaf=0;
function syncTop(){
  topRaf=0;
  const h=document.querySelector(".hero"),b=h&&h.offsetParent!==null?h.getBoundingClientRect().bottom:0;
  const on=b>Math.max(20,parseFloat(getComputedStyle(h||document.body).paddingTop)||0),root=document.documentElement;
  if(root.classList.contains("at-top")===on)return;
  root.classList.toggle("at-top",on);
  const m=document.querySelector('meta[name="theme-color"]');
  if(m)m.content=on?getComputedStyle(root).getPropertyValue("--hero-a").trim()||"#1E2A3A":getComputedStyle(document.body).backgroundColor;
}
const queueTop=()=>{if(!topRaf)topRaf=requestAnimationFrame(syncTop)};
addEventListener("scroll",queueTop,{passive:true,capture:true});
addEventListener("resize",queueTop);
function go(v){if(S.view==="envies"&&v!=="envies")env().leaveTile();closeModal();if(!VIEWFN[v])v="apercu";S.view=v;if(location.hash!=="#"+v){try{history.replaceState(null,"","#"+v)}catch(e){}}render();window.scrollTo(0,0);syncTop()}

/* ---------- Modal editor ---------- */
const SCHEMAS={
  tasks:{one:"la tâche",fields:[
    {k:"title",label:"Intitulé",type:"text",req:1},
    {k:"owner",label:"Qui s'en occupe",type:"seg",options:Object.entries(OWNERS),def:"deux"},
    {k:"status",label:"Statut",type:"seg",options:Object.entries(STATUS),def:"todo"},
    {row:[{k:"phase",label:"Période",type:"select",options:PHASES.map(p=>[p.k,p.label]),def:()=>(currentPhase()||PHASES[0]).k},
          {k:"due",label:"Échéance précise",type:"date"}]},
    {k:"note",label:"Notes",type:"textarea"}]},
  rdv:{one:"le rendez-vous",fields:[
    {k:"title",label:"Rendez-vous",type:"text",req:1,list:["Visite du lieu","Dégustation traiteur","Essayage","Rendez-vous mairie","Rendez-vous notaire","Rendez-vous photographe","Essai coiffure et maquillage"]},
    {row:[{k:"date",label:"Date",type:"date"},{k:"time",label:"Heure",type:"time"}]},
    {row:[{k:"avec",label:"Avec",type:"text"},{k:"lieu",label:"Lieu",type:"text"}]},
    {k:"qui",label:"Qui y va",type:"seg",options:Object.entries(OWNERS),def:"deux"},
    {k:"note",label:"Notes",type:"textarea"}]},
  budget:{one:"le poste",fields:[
    {k:"label",label:"Poste",type:"text",req:1},
    {row:[{k:"prevu",label:"Prévu (€)",type:"number"},{k:"engage",label:"Engagé (€)",type:"number"}]},
    {row:[{k:"paye",label:"Déjà payé (€)",type:"number"},{k:"order",label:"Ordre d'affichage",type:"number"}]},
    {k:"note",label:"Notes",type:"textarea"}]},
  guests:{one:"l'invité",fields:[
    {k:"name",label:"Nom",type:"text",req:1},
    {k:"side",label:"Côté",type:"seg",options:Object.entries(SIDES),def:"commun"},
    {row:[{k:"group",label:"Groupe",type:"text",list:GROUPS},{k:"table",label:"Table",type:"text"}]},
    {k:"rsvp",label:"Réponse",type:"seg",options:Object.entries(RSVP),def:"attente"},
    {k:"_ev",label:"Invité à",type:"checks",options:[["ceremonie","Cérémonie"],["vin","Vin d'honneur"],["diner","Dîner"]]},
    {k:"enfant",label:"Enfant",type:"check"},
    {row:[{k:"regime",label:"Régime alimentaire",type:"text"},{k:"contact",label:"Contact",type:"text"}]},
    {k:"note",label:"Notes",type:"textarea"}]},
  vendors:{one:"le prestataire",fields:[
    {k:"name",label:"Nom",type:"text",req:1},
    {row:[{k:"cat",label:"Catégorie",type:"select",options:VCATS.map(c=>[c,c]),def:"Lieu"},
          {k:"status",label:"Statut",type:"select",options:Object.entries(VSTAT),def:"repere"}]},
    {row:[{k:"prix",label:"Montant du devis (€)",type:"number"},{k:"acompte",label:"Acompte (€)",type:"number"}]},
    {row:[{k:"dateAcompte",label:"Acompte à verser avant le",type:"date"},{k:"dateSolde",label:"Solde à verser avant le",type:"date"}]},
    {k:"acomptePaye",label:"Acompte versé",type:"check"},
    {k:"soldePaye",label:"Solde versé",type:"check"},
    {row:[{k:"contact",label:"Contact (nom, e-mail, site)",type:"text"},{k:"tel",label:"Téléphone",type:"text"}]},
    {k:"note",label:"Notes",type:"textarea"},
    {k:"visitNotes",label:"Notes de visite ou d'échange (l'IA en tient compte et recalcule la note)",type:"textarea"}]},
  schedule:{one:"le moment",fields:[
    {row:[{k:"time",label:"Heure",type:"time"},{k:"title",label:"Moment",type:"text",req:1}]},
    {row:[{k:"lieu",label:"Lieu",type:"text"},{k:"qui",label:"Qui est concerné",type:"text"}]},
    {k:"note",label:"Notes",type:"textarea"}]}
};
const flat=fs=>fs.flatMap(f=>f.row?f.row:[f]);
const defOf=f=>typeof f.def==="function"?f.def():f.def;

function fieldHTML(f,v){
  const id="search-m-"+f.k,dis=S.canWrite?"":"disabled",dv=v??defOf(f);
  if(f.type==="seg")return `<div class="field"><span class="lab">${f.label}</span><div class="seg" role="radiogroup">${f.options.map(([k,l])=>`<label><input type="radio" name="${f.k}" value="${k}" id="${id}-${k}" ${dv===k?"checked":""} ${dis}><span>${l}</span></label>`).join("")}</div></div>`;
  if(f.type==="select")return `<div class="field"><label for="${id}">${f.label}</label><select id="${id}" name="${f.k}" ${dis}>${f.options.map(([k,l])=>`<option value="${esc(k)}" ${dv===k?"selected":""}>${esc(l)}</option>`).join("")}</select></div>`;
  if(f.type==="textarea")return `<div class="field"><label for="${id}">${f.label}</label><textarea autocomplete="off" id="${id}" name="${f.k}" ${dis}>${esc(v||"")}</textarea></div>`;
  if(f.type==="check")return `<div class="field"><label class="toggle" style="color:var(--ink);font-weight:500;font-size:14px"><input type="checkbox" id="${id}" name="${f.k}" ${v?"checked":""} ${dis}> ${f.label}</label></div>`;
  if(f.type==="checks")return `<div class="field"><span class="lab">${f.label}</span><div class="checks">${f.options.map(([k,l])=>`<label><input type="checkbox" id="${id}-${k}" name="${k}" ${v&&v[k]===false?"":"checked"} ${dis}> ${l}</label>`).join("")}</div></div>`;
  const t=f.type==="number"?'type="number" inputmode="decimal" step="any" min="0"':`type="${f.type}"`;
  return `<div class="field"><label for="${id}">${f.label}</label><input ${t} ${f.type==="email"?"":'autocomplete="off"'} id="${id}" name="${f.k}" value="${esc(v??"")}" ${f.req?"required":""} ${f.list?`list="${id}-l"`:""} ${dis}>${f.list?`<datalist id="${id}-l">${f.list.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>`:""}</div>`;
}

function openEditor(col,id){
  const sc=SCHEMAS[col];if(!sc)return;
  const cur=id?(S[col].find(x=>x.id===id)||{}):{};
  const isNew=!id;
  const evObj={ceremonie:cur.ceremonie,vin:cur.vin,diner:cur.diner};
  const body=sc.fields.map(f=>f.row?`<div class="cols2">${f.row.map(x=>fieldHTML(x,cur[x.k])).join("")}</div>`:fieldHTML(f,f.k==="_ev"?evObj:cur[f.k])).join("");
  const title=(isNew?"Ajouter ":"Modifier ")+sc.one;
  const layer=document.getElementById("layer");
  layer.innerHTML=`<div class="ov" data-close="1"><form class="modal form" id="editor" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <h3>${esc(title)}</h3>${cur.source==="mail"?'<div class="banner" style="margin:0">Ajouté depuis un e-mail par l\'assistant.</div>':""}${body}
    <div class="acts"><div>${!isNew&&S.canWrite?`<button type="button" class="btn danger" data-act="del">Supprimer</button>`:""}</div>
    <div><button type="button" class="btn" data-close="1">Annuler</button>${S.canWrite?`<button type="submit" class="btn primary">${isNew?"Ajouter":"Enregistrer"}</button>`:""}</div></div></form></div>`;
  const form=document.getElementById("editor");
  // Pas de curseur automatique sur téléphone : le clavier ne s'ouvre que quand on touche un champ pour le modifier
  if(!window.matchMedia("(pointer:coarse)").matches){const first=form.querySelector("input:not([type=radio]):not([type=checkbox]),select,textarea");if(first)first.focus()}
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const out=Object.assign({},cur);delete out.id;
    flat(sc.fields).forEach(f=>{
      if(f.type==="seg"){const c=form.querySelector(`input[name="${f.k}"]:checked`);out[f.k]=c?c.value:defOf(f)}
      else if(f.type==="check")out[f.k]=form.elements[f.k].checked;
      else if(f.type==="checks")f.options.forEach(([k])=>{out[k]=form.elements[k].checked});
      else if(f.type==="number"){const v=form.elements[f.k].value;out[f.k]=v===""?null:num(v)}
      else out[f.k]=form.elements[f.k].value.trim();
    });
    delete out._ev;delete out.template;
    if(col==="tasks"&&isNew){const same=S.tasks.filter(t=>t.phase===out.phase);out.order=same.reduce((m,t)=>Math.max(m,t.order||0),0)+1}
    if(col==="vendors")out.updatedAt=Date.now();
    if(col==="vendors"&&(out.visitNotes||"")!==(cur.visitNotes||"")&&String(out.visitNotes||"").trim())out.fitRequestedAt=Date.now();
    if(col==="budget"&&isNew&&out.order==null)out.order=S.budget.reduce((m,b)=>Math.max(m,b.order||0),0)+1;
    const btn=form.querySelector("button[type=submit]");btn.disabled=true;
    const ok=await save(col,id,out);
    const refit=out.fitRequestedAt&&out.fitRequestedAt>Date.now()-5000;
    if(ok){closeModal();if(refit)kick("analyse");toast(refit?"Enregistré : la note est recalculée (1 à 2 minutes)":isNew?"Ajouté":"Enregistré")}else btn.disabled=false;
  });
  const del=form.querySelector('[data-act="del"]');
  if(del)del.addEventListener("click",async ev=>{
    ev.stopPropagation();
    if(!del.classList.contains("armed")){del.classList.add("armed");del.textContent="Confirmer la suppression";return}
    del.disabled=true;if(await remove(col,id)){closeModal();toast("Supprimé")}else del.disabled=false;
  });
}
function closeModal(){document.getElementById("layer").innerHTML=""}
function openRsvp(id){
  const g=S.guests.find(x=>x.id===id);if(!g)return;const r=g.rsvp||"attente";
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Réponse de ${esc(g.name)}"><h3>Réponse de ${esc(g.name)}</h3>
    <div class="rsvp-pick">${[["oui","Présent","ok"],["attente","En attente","warn"],["non","Absent","bad"]].map(([k,l,c])=>`<button class="${c}" data-act="setrsvp" data-id="${g.id}" data-v="${k}" aria-pressed="${r===k}">${l}</button>`).join("")}</div></div></div>`;
}
/* Toute fenêtre (fiche, formulaire, menu) reçoit une barre « Retour » fixe en haut, bloque le défilement
   de la page derrière, et se ferme avec le bouton ou le geste « retour » du téléphone. */
let lastScroll=0,modalOpen=false;
["scroll","touchmove"].forEach(ev=>document.addEventListener(ev,()=>{lastScroll=Date.now()},{passive:true,capture:true}));
const BACK_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
new MutationObserver(()=>{
  const layer=document.getElementById("layer"),m=layer.querySelector(".modal");
  if(m&&!m.querySelector(".modal-bar"))m.insertAdjacentHTML("afterbegin",`<div class="modal-bar"><button type="button" class="modal-back" data-close="1">${BACK_SVG}<span>Retour</span></button></div>`);
  document.body.classList.toggle("modal-open",!!m);
  if(m&&!modalOpen){modalOpen=true;try{history.pushState({modal:1},"")}catch(e){}}
  else if(!m&&modalOpen){modalOpen=false;if(history.state&&history.state.modal)history.back()}
}).observe(document.getElementById("layer"),{childList:true});
window.addEventListener("popstate",()=>{if(modalOpen)closeModal()});

function openBulk(){
  const layer=document.getElementById("layer");
  layer.innerHTML=`<div class="ov" data-close="1"><form class="modal form" id="bulk" role="dialog" aria-modal="true" aria-label="Ajout rapide d'invités">
    <h3>Ajout rapide</h3>
    <div class="field"><label for="b-names">Un nom par ligne</label><textarea autocomplete="off" name="search_text" id="b-names" style="min-height:160px" placeholder="Marie Dupont&#10;Paul Dupont&#10;Léa Martin" required></textarea></div>
    <div class="field"><span class="lab">Côté</span><div class="seg" role="radiogroup">${Object.entries(SIDES).map(([k,l])=>`<label><input type="radio" name="side" value="${k}" ${k==="commun"?"checked":""}><span>${l}</span></label>`).join("")}</div></div>
    <div class="field"><label for="b-group">Groupe</label><input type="text" autocomplete="off" id="b-group" list="b-gl" placeholder="Famille, Amis…"><datalist id="b-gl">${GROUPS.map(g=>`<option value="${g}">`).join("")}</datalist></div>
    <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">Annuler</button><button type="submit" class="btn primary">Ajouter</button></div></div></form></div>`;
  const form=document.getElementById("bulk");form.querySelector("textarea").focus();
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const names=form.querySelector("#b-names").value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if(!names.length)return;
    const side=form.querySelector('input[name="side"]:checked').value,group=form.querySelector("#b-group").value.trim();
    const btn=form.querySelector("button[type=submit]");btn.disabled=true;
    let n=0;for(const name of names){if(await save("guests",null,{name,side,group,rsvp:"attente",ceremonie:true,vin:true,diner:true,enfant:false}))n++;else break}
    closeModal();toast(n+" invité"+(n>1?"s":"")+" ajouté"+(n>1?"s":""));
  });
}

async function exportCSV(){
  const cols=[["name","Nom"],["side","Côté"],["group","Groupe"],["rsvp","Réponse"],["ceremonie","Cérémonie"],["vin","Vin d'honneur"],["diner","Dîner"],["enfant","Enfant"],["table","Table"],["regime","Régime"],["contact","Contact"],["note","Notes"]];
  const val=(g,k)=>k==="side"?SIDES[g.side]||"":k==="rsvp"?RSVP[g.rsvp||"attente"]:["ceremonie","vin","diner"].includes(k)?(g[k]===false?"non":"oui"):k==="enfant"?(g.enfant?"oui":""):(g[k]??"");
  const q=s=>`"${String(s).replace(/"/g,'""')}"`;
  const csv="﻿"+[cols.map(c=>q(c[1])).join(";"),...S.guests.slice().sort((a,b)=>String(a.name).localeCompare(b.name)).map(g=>cols.map(([k])=>q(val(g,k))).join(";"))].join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="invites-mariage.csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}

/* ---------- Events ---------- */
document.addEventListener("click",async e=>{
  const t=e.target.closest("[data-go],[data-new],[data-edit],[data-act],[data-f],[data-close],[data-who],[data-fiche],[data-bgo],[data-bcat],[data-bchip],[data-bimp]");
  if(!t)return;
  if(t.dataset.close){if(e.target===t||t.tagName==="BUTTON")closeModal();return}
  if(t.dataset.go){go(t.dataset.go);return}
  if(t.dataset.fiche){openFiche(t.dataset.fiche);return}
  // ouvre la page d'une tuile de « Nos envies » (data-bgo : clé de tuile)
  if(t.dataset.bgo||t.dataset.bcat){S.f.envView="tile";S.f.envTile=t.dataset.bgo||t.dataset.bcat;saveF();go("envies");return}
  if(t.dataset.who){S.f.owner=t.dataset.who;S.f.hideDone=true;saveF();go("planning");return}
  if(t.dataset.new){if(S.canWrite)openEditor(t.dataset.new,null);return}
  if(t.dataset.edit){openEditor(t.dataset.edit,t.dataset.id);return}
  if(t.dataset.f){S.f[t.dataset.f]=t.dataset.v;saveF();if(t.dataset.f.startsWith("g")){renderInvitesPart()}else render();return}
  const a=t.dataset.act,id=t.dataset.id;
  if(a&&env().act(a,t))return; // gestes de « Nos envies » (src/envies-ui.js)
  if(a==="cycle"){if(!S.canWrite)return;const k=S.tasks.find(x=>x.id===id);if(!k)return;await patch("tasks",id,{status:k.status==="done"?"todo":"done"});return}
  if(a==="rsvp"){if(S.canWrite)openRsvp(id);return}
  if(a==="setrsvp"){if(!S.canWrite)return;closeModal();const g=S.guests.find(x=>x.id===id);if(g&&(g.rsvp||"attente")!==t.dataset.v&&await patch("guests",id,{rsvp:t.dataset.v}))toast(`${g.name} : ${RSVP[t.dataset.v]}`);return}
  if(a==="gselstart"){S.selMode=!S.selMode;S.sel.clear();render();return}
  if(a==="gselend"){S.selMode=false;S.sel.clear();render();return}
  if(a==="gsel"){S.sel.has(id)?S.sel.delete(id):S.sel.add(id);renderInvitesPart();return}
  if(a==="gselall"){const ids=guestFiltered().map(g=>g.id);if(S.sel.size===ids.length)S.sel.clear();else ids.forEach(x=>S.sel.add(x));renderInvitesPart();return}
  if(a==="gset"){if(!S.canWrite||!S.sel.size)return;const k=t.dataset.k,v=t.dataset.v,n=S.sel.size;
    try{const b=S.db.batch();S.sel.forEach(x=>b.update(S.db.collection("guests").doc(x),{[k]:v}));await b.commit();S.sel.clear();renderInvitesPart();toast(`${n} invité${n>1?"s":""} : ${k==="group"?(v||"sans groupe"):SIDES[v]}`)}catch(err){writeErr(err)}return}
  if(a==="dupmerge"){if(!S.canWrite)return;const A=S.tasks.find(x=>x.id===t.dataset.a),B=S.tasks.find(x=>x.id===t.dataset.b);if(!A||!B)return;
    const st=A.status==="done"&&B.status==="done"?"done":(A.status==="doing"||B.status==="doing")?"doing":(A.status||"todo");
    const note=[A.note,`Fusionné avec « ${B.title} »${B.note?" : "+B.note:""}`].filter(Boolean).join("\n");
    if(await patch("tasks",A.id,{status:st,note,due:A.due||B.due||null})&&await remove("tasks",B.id))toast("Tâches fusionnées");return}
  if(a==="dupkeep"){if(S.canWrite&&await mergeDoc("meta/prefs",{notDupes:[...(S.prefs.notDupes||[]),t.dataset.k]}))toast("C'est noté");return}
  if(a==="overview"){S.f.overview=!S.f.overview;saveF();render();return}
  if(a==="moodcat"){S.f.moodCat=t.dataset.v;saveF();render();return}
  if(a==="devisadd"){const v=S.vendors.find(x=>x.id===t.dataset.id);if(!v||!S.canWrite)return;closeModal();S.chat.mode="chat";
    await openChat(undefined,`Voici le devis de ${v.name} (id ${v.id}) : lis-le et enregistre-le sur sa fiche. `);setTimeout(()=>document.getElementById("chat-file")?.click(),60);return}
  if(a==="inspopen"){openInsp(t.dataset.id,t.dataset.scope);return}
  if(a==="inspask"){const x=S.inspirations.find(y=>y.id===t.dataset.id);if(!x)return;
    S.chat.atts=[{media_type:"image/jpeg",data:x.thumb,name:"inspiration.jpg",preview:"data:image/jpeg;base64,"+x.thumb}];
    closeModal();await openChat("chat","Que penses-tu de cette inspiration pour notre mariage ? ");renderAtt();return}
  if(a==="chatcat"){const c=t.dataset.c;if(!S.canWrite)return;
    if(!c){openChat("brief");return}
    S.chat.mode="brief";await openChat();sendChat(`Continuons avec la catégorie « ${QC[c].label} ».`);return}
  if(a==="briefpdf"){pdfBriefs(t.dataset.c);return}
  if(a==="briefsmenu"){openBriefsMenu();return}
  if(a==="docsmenu"){openDocsMenu();return}
  if(a==="hebdoopen"){openHebdo();return}
  if(a==="showdate"){const d=wDate();if(d)toast(`${fmtLong(d).replace(/^./,c=>c.toUpperCase())}${S.settings.dateIndicative?" · date indicative":""}`);return}
  if(a==="briefsgo"){if(!S.canWrite||briefsState().running)return;t.disabled=true;t.textContent="Rédaction en cours…";if(await mergeDoc("meta/briefs",{requestedAt:Date.now()})){kick("briefs");toast("Le coach rédige vos briefs : environ deux minutes");render()}return}
  if(a==="budgettot"){const tot=num(S.settings.budgetTotal);
    document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Budget total"><h3>Budget total</h3>
      <form class="form" id="budget-total-form"><div class="field"><label for="search-b-total">Budget total du mariage (€)</label><input type="number" inputmode="numeric" min="0" step="100" id="search-b-total" name="budgetTotal" value="${tot||""}"></div>
      <p class="plan-when" style="margin:0 0 12px">Sert à calculer la marge et la part de chaque poste.</p>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">Annuler</button> <button class="btn primary" type="submit">Enregistrer</button></div></div></form></div></div>`;return}
  if(a==="pinsync"){if(!S.canWrite)return;if(await mergeDoc("meta/pinterest",{requestedAt:Date.now()})){kick("pinterest");toast("Synchronisation lancée : vos épingles arrivent dans Nos envies");render()}return}
  if(a==="pindel"){if(!S.canWrite)return;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Confirmer";return}
    const b=(S.pinterest.boards||[]).slice();b.splice(+t.dataset.i,1);if(await mergeDoc("meta/pinterest",{boards:b}))toast("Tableau retiré (les épingles déjà importées restent)");return}
  if(a==="iaweb"){if(!S.canWrite)return;if(await mergeDoc("meta/ia",{web:t.dataset.v,updatedAt:Date.now()}))toast("Réglage enregistré");return}
  if(a==="ialvl"){if(!S.canWrite)return;if(await mergeDoc("meta/ia",{niveaux:{[t.dataset.feat]:t.dataset.v},updatedAt:Date.now()}))toast("Réglage enregistré : appliqué dès le prochain appel");return}
  if(a==="fireall"){if(!S.canWrite||agentBusy("analyse"))return;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Confirmer : refaire toutes les fiches";return}
    const now=Date.now();if(await mergeDoc("meta/analyse",{requestedAt:now,fullRequestedAt:now,status:"demandée"})){kick("analyse");toast("Toutes les fiches sont refaites : quelques minutes");render()}return}
  if(a==="theme"){applyTheme(t.dataset.v);S.view==="reglages"&&(document.getElementById("main")._h=null);render();return}
  if(a==="unseat"){if(S.canWrite)await patch("guests",id,{table:""});return}
  if(a==="bulk"){if(S.canWrite)openBulk();return}
  if(a==="csv"){exportCSV();return}
  if(a==="qr"){await runQr(t.dataset.do);return}
  if(a==="uimore"){S.ui.more=!S.ui.more;render();return}
  if(a==="couplephoto"){if(S.canWrite)pickCouplePhoto();return}
  if(a==="couplephotox"){if(S.canWrite&&await setDoc("meta/photo",{},{data:"",updatedAt:Date.now()}))toast("Photo retirée");return}
  if(a==="cmpnone"){S.cmp.ids=[];openCompare(S.cmp.cat);return}
  if(a==="homephoto"){openChat("chat");setTimeout(()=>document.getElementById("chat-file")?.click(),50);return}
  if(a==="chatfile"){document.getElementById("chat-file")?.click();return}
  if(a==="chatattx"){(S.chat.atts||[]).splice(+t.dataset.i,1);renderAtt();return}
  if(a==="inspdel"){if(!S.canWrite)return;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Confirmer";return}if(await remove("inspirations",id)){if(document.querySelector(".modal.lb"))closeModal();toast("Inspiration retirée")};return}
  if(a==="inspadd"){openChat("brief");setTimeout(()=>document.getElementById("chat-file")?.click(),60);return}
  if(a==="chatmic"){toggleMic(t);return}
  if(a==="chatopen"){const p=t.dataset.p;if(p==="fiche"){closeModal();openFiche(t.dataset.id)}else go(p);return}
  if(a==="mailcopy"){const m=mailOf((S.chat.messages[+t.dataset.i]||{}).text);if(!m)return;const txt=`Objet : ${m.subject}\n\n${m.body}`;try{await navigator.clipboard.writeText(txt);toast("Mail copié")}catch(e){toast("Copie impossible : sélectionnez le texte")}return}
  if(a==="pdfshare"){try{await navigator.share({files:[S.pdfFile],title:S.pdfFile.name})}catch(e){if(e&&e.name!=="AbortError")toast("Partage impossible : utilisez « Ouvrir le PDF »")}return}
  if(a==="pdfjourj"){pdfJourJ();return}
  if(a==="pdfreport"){pdfReport();return}
  if(a==="chat"){openChat(t.dataset.m||null);return}
  if(a==="chatsugg"){sendChat(t.dataset.t);return}
  if(a==="webok"||a==="webno"){const m=S.chat.messages[+t.dataset.i],w=m&&(m.actions||[]).find(x=>x.web);if(!w||m.webDecided||S.chat.busy)return;
    m.webDecided=a==="webok"?"ok":"no";
    if(a==="webok")sendChat(`Oui, tu peux chercher sur internet : « ${w.web.requete} ».`,{web:true});else renderChat();return}
  if(a==="chatundo"){if(S.canWrite)await undoChat(+t.dataset.i);return}
  if(a==="chatbottom"){chatJump();return}
  if(a==="chatmode"){S.chat.mode=t.dataset.m;renderChat();if(t.dataset.m==="brief")sendChat("Commençons le questionnaire Nos envies.");return}
  if(a==="chatreset"){if(S.chat.busy)return;S.chat.messages=[];renderChat();try{await callAssistant({reset:true})}catch(e){}return}
  if(a==="pushon"){t.disabled=true;try{await enablePush()}catch(err){toast("Activation impossible : "+(err.message||err));t.disabled=false}return}
  if(a==="pushoff"){t.disabled=true;try{await disablePush()}catch(err){toast("Échec : "+(err.message||err));t.disabled=false}return}
  if(a==="compare"){openCompare(t.dataset.cat,t.dataset.id);return}
  if(a==="cmpcat"){S.cmp.ids=[];openCompare(t.dataset.cat);return}
  if(a==="cmpv"){const c=S.cmp;if(c.ids.includes(id))c.ids=c.ids.filter(x=>x!==id);else{if(c.ids.length>=3){toast("3 prestataires au maximum : retirez-en un");return}c.ids.push(id)}openCompare(c.cat);return}
  if(a==="cmpask"){const names=S.cmp.ids.map(x=>(S.vendors.find(v=>v.id===x)||{}).name).filter(Boolean);openChat("chat");sendChat(`Compare ${names.join(", ")} pour nous et dis-nous lequel tu choisirais, et pourquoi.`);return}
  if(a==="acceptall"){if(!S.canWrite)return;const ids=pendingSugs().map(x=>x.id);
    if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent=`Confirmer : valider les ${ids.length}`;setTimeout(()=>{if(t.isConnected){t.classList.remove("armed");t.textContent="Tout valider"}},5000);return}
    t.disabled=true;t.textContent="Validation…";let n=0;for(const x of ids)if(await acceptSug(x,true))n++;
    toast(n===ids.length?`${n} propositions ajoutées`:`${n} sur ${ids.length} ajoutées, les autres restent à valider`);return}
  if(a==="accept"){if(S.canWrite){t.disabled=true;await acceptSug(id)}return}
  if(a==="dismiss"){if(S.canWrite&&await patch("inbox",id,{status:"dismissed",decidedAt:Date.now()}))toast("Ignoré");return}
  if(a==="restore"){if(S.canWrite)await patch("inbox",id,{status:"new"});return}
  if(a==="fire"){t.disabled=true;await fireAnalysis();render();return}
  if(a==="runnow"){t.disabled=true;await runNow(t.dataset.job);render();return}
  if(a==="editv"){openEditor("vendors",id);return}
  if(a==="logout"){dropBoot();await signOut();return}
  if(a==="google"){try{await signInGoogle()}catch(err){toast(authErr(err))}return}
});
function renderInvitesPart(){
  if(S.view!=="invites"){render();return}
  const gl=document.getElementById("guest-list");
  document.querySelectorAll('[data-f^="g"]').forEach(b=>b.setAttribute("aria-pressed",S.f[b.dataset.f]===b.dataset.v));
  if(gl){gl.innerHTML=guestRows();document.getElementById("main")._h=null}
}
document.addEventListener("input",e=>{if(env().input(e.target))return;if(e.target.id==="gq"){S.f.gq=e.target.value;renderInvitesPart()}
  if(e.target.id==="chat-text"){const ta=e.target;ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,180,Math.round((window.visualViewport?.height||innerHeight)*.3))+"px"}});
document.addEventListener("keydown",e=>{if(e.target.id==="chat-text"&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&window.matchMedia("(hover:hover)").matches){e.preventDefault();document.getElementById("chat-form").requestSubmit()}});
document.addEventListener("change",async e=>{
  const el=e.target;
  if(el.dataset.inspcat){if(!S.canWrite)return;if(await patch("inspirations",el.dataset.inspcat,{cat:el.value}))toast("Catégorie changée");return}
  if(el.dataset.pincat!=null){if(!S.canWrite)return;const b=(S.pinterest.boards||[]).map((x,i)=>i===+el.dataset.pincat?{...x,cat:el.value}:x);if(await mergeDoc("meta/pinterest",{boards:b}))toast("Catégorie enregistrée (pour les prochaines épingles)");return}
  if(el.id==="chat-file"){await pickFiles(el.files);el.value="";
    // curseur directement sous la photo pour la commenter (sans faire remonter la conversation)
    const ta=document.getElementById("chat-text");if(ta&&(S.chat.atts||[]).length){ta.focus({preventScroll:true});ta.setSelectionRange(ta.value.length,ta.value.length);ta.scrollIntoView({block:"nearest"})}return}
  if(el.id==="hide-done"){S.f.hideDone=el.checked;saveF();render();return}
  if(el.dataset.bq){const [c,q,fld]=el.dataset.bq.split("|");const val=fld==="desaccord"?el.checked:el.value.trim();if(fld!=="desaccord"&&(bGet(c,q)[fld]||"")===val)return;await saveBrief(c,q,{[fld]:val});if(fld==="desaccord")render();return}
  if(el.dataset.bm){const [c,fld]=el.dataset.bm.split("|");const val=fld==="budget"?(el.value===""?null:num(el.value)):el.value.trim();if((bMeta(c)[fld]??"")===(val??""))return;await saveBrief(c,"_meta",{[fld]:val});return}
});
document.addEventListener("focusout",()=>{setTimeout(()=>{if(S.pending&&!(document.activeElement&&/^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)&&document.getElementById("main").contains(document.activeElement)))render()},60)});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.fiche){e.preventDefault();openFiche(e.target.dataset.fiche)}});
document.addEventListener("submit",async e=>{
  const f=e.target;
  if(env().submit(f)){e.preventDefault();return}
  if(f.id==="chat-form"){e.preventDefault();const ta=document.getElementById("chat-text");const v=ta.value;ta.value="";ta.style.height="";if(window.matchMedia("(pointer:coarse)").matches)ta.blur();await sendChat(v);if(!window.matchMedia("(pointer:coarse)").matches)ta.focus();return}
  if(f.id==="budget-total-form"){e.preventDefault();const v=f.elements.budgetTotal.value;
    if(await setDoc("meta/settings",S.settings,{budgetTotal:v===""?null:num(v),updatedAt:Date.now()})){closeModal();toast("Budget total enregistré");render()}return}
  if(f.id==="pin-form"){e.preventDefault();const u=pinBoard(f.elements.url.value);
    if(!u){toast("Lien non reconnu : sur Pinterest, ouvrez le tableau, touchez Partager puis Copier le lien");return}
    const b=(S.pinterest.boards||[]).slice();if(b.some(x=>x.url===u)){toast("Ce tableau est déjà ajouté");return}
    b.push({url:u,cat:"auto"});if(await mergeDoc("meta/pinterest",{boards:b,requestedAt:Date.now()})){kick("pinterest");f.reset();document.activeElement&&document.activeElement.blur();toast("Tableau ajouté : première synchronisation lancée")}return}
  if(f.id==="ia-form"){e.preventDefault();const v=num(f.elements.budget.value);if(!(v>0)){toast("Indiquez un budget en euros");return}
    if(await mergeDoc("meta/ia",{budget:v,updatedAt:Date.now()})){document.activeElement&&document.activeElement.blur();toast("Budget enregistré")}return}
  if(f.id==="settings-form"){
    e.preventDefault();
    const d={updatedAt:Date.now()};["prenom1","prenom2","date","lieu","ville","mairie","notes"].forEach(k=>d[k]=f.elements[k].value.trim());
    ["invitesCible"].forEach(k=>{const v=f.elements[k].value;d[k]=v===""?null:num(v)});
    d.dateIndicative=!!f.elements.dateIndicative.checked;
    if(await setDoc("meta/settings",S.settings,d)){mergeDoc("meta/analyse",{profilRequestedAt:Date.now()});document.activeElement&&document.activeElement.blur();toast("Réglages enregistrés");render()}
    return;
  }
  if(f.dataset.plan){e.preventDefault();const b=f.querySelector("button[type=submit]");b.disabled=true;await savePlan(f.dataset.plan,f);b.disabled=false;return}
  if(f.id==="agent-form"){
    e.preventDefault();
    const types={};Object.keys(SUGTYPE).forEach(k=>types[k]=f.elements["t-"+k].checked);
    const d={mailbox:f.elements.mailbox.value.trim(),consignes:f.elements.consignes.value.trim(),types};
    if(await setDoc("meta/agent",S.agent,d)){document.activeElement&&document.activeElement.blur();toast("Réglages de l'assistant enregistrés");render()}
    return;
  }
  if(f.id==="login-form"){
    e.preventDefault();const email=f.elements.email.value.trim();if(!email)return;
    const b=f.querySelector("button[type=submit]");b.disabled=true;
    try{await sendEmailLink(email);S.linkSent=email;render()}catch(err){toast(authErr(err));b.disabled=false}
    return;
  }
  if(f.dataset.seat){
    e.preventDefault();const v=f.querySelector("input").value.trim();if(!v)return;
    await patch("guests",f.dataset.seat,{table:v});
  }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("layer").innerHTML)closeModal()});
window.addEventListener("hashchange",()=>{const v=location.hash.slice(1);if(v&&v!==S.view&&VIEWFN[v])go(v)});

/* ---------- Connexion ---------- */
function authErr(e){
  const c=e&&e.code||"";
  if(c.includes("popup-closed")||c.includes("cancelled"))return "Connexion annulée";
  if(c.includes("invalid-email"))return "Adresse e-mail invalide";
  if(c.includes("network"))return "Pas de réseau";
  if(c.includes("unauthorized-domain"))return "Domaine non autorisé dans Firebase Auth";
  return "La connexion n'a pas abouti";
}
function loginView(){
  if(S.linkSent)return `<div class="lock"><h2>Vérifiez votre boîte mail</h2><p style="color:var(--muted);margin:0">Un lien de connexion a été envoyé à <b>${esc(S.linkSent)}</b>. Ouvrez-le sur cet appareil.</p></div>`;
  return `<div class="lock"><h2>Bienvenue</h2><p style="color:var(--muted);margin:0 0 20px">Connectez-vous pour retrouver votre organisation, synchronisée entre vous deux.</p>
    <button class="btn primary" data-act="google" style="width:100%">Continuer avec Google</button>
    <div style="margin:18px 0 12px;color:var(--muted);font-size:14px">ou recevez un lien par e-mail</div>
    <form id="login-form" class="form"><div class="field"><label for="l-email" style="text-align:left">Adresse e-mail</label><input type="email" id="l-email" name="email" autocomplete="email" required></div>
    <button class="btn" type="submit">Recevoir le lien</button></form></div>`;
}

/* ---------- Boot ---------- */
const h=location.hash.slice(1);if(VIEWFN[h])S.view=h;
// Démarrage instantané : la dernière copie des données (gardée sur cet appareil) s'affiche tout de suite,
// pendant que la connexion et la base se confirment ; les écritures attendent que la base soit prête (S.db).
const BOOT_KEY="lamaelle-demarrage",BOOT_FIELDS=[...COLS,"settings","agent","profil","analyse","planning","prefs","hebdo","photo","briefs","pinterest","ia","usage"];
let bootUid=null;
try{const b=JSON.parse(localStorage.getItem(BOOT_KEY)||"null");if(b&&b.uid&&b.d){Object.assign(S,b.d);S.user={email:b.email,uid:b.uid};bootUid=b.uid;S.mode="live"}}catch(e){}
let bootT=0;const saveBoot=()=>{clearTimeout(bootT);bootT=setTimeout(()=>{if(S.mode!=="live"||!S.db||!S.user)return;
  try{const d={};for(const k of BOOT_FIELDS)d[k]=S[k];localStorage.setItem(BOOT_KEY,JSON.stringify({uid:S.user.uid,email:S.user.email,at:Date.now(),d}))}
  catch(e){try{localStorage.removeItem(BOOT_KEY)}catch(_){}}},3000)};
const dropBoot=()=>{try{localStorage.removeItem(BOOT_KEY)}catch(e){}};
// L'app elle-même est gardée sur l'appareil par le service worker (public/sw.js) : ouverture sans attendre le réseau
if(import.meta.env.PROD&&"serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
render();

let unsubs=[];
function stopListeners(){unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[]}
function boot(){
  completeEmailLink().catch(e=>toast(authErr(e)));
  auth.onAuthStateChanged(user=>{
    stopListeners();
    // autre compte (ou déconnexion) que celui de la copie affichée : on l'oublie et on repart de zéro
    if(bootUid&&(!user||user.uid!==bootUid)){dropBoot();location.reload();return}
    bootUid=null;
    S.user=user;S.db=null;S.got=new Set();
    if(!user){S.mode="login";render();return}
    const email=String(user.email||"").toLowerCase();
    if(!ALLOWED.includes(email)){dropBoot();S.mode="locked";S.canWrite=false;render();return}
    S.canWrite=true;S.linkSent=null;S.db=db;S.mode="live";render();
    // includeMetadataChanges : sans lui, Firestore ne prévient pas quand le serveur confirme que la copie
    // locale est déjà à jour (rien n'a changé) ; on croyait alors la base injoignable (faux bandeau).
    const LIVE={includeMetadataChanges:true};
    const need=["settings","agent",...COLS];
    const timer=setTimeout(()=>{if(need.some(k=>!S.got.has(k))){S.stale=true;render()}},10000);
    const mark=(k,snap)=>{if(!snap.metadata.fromCache){S.got.add(k);if(need.every(x=>S.got.has(x))){clearTimeout(timer);S.stale=false}}};
    let raf=0;const later=()=>{saveBoot();if(raf||S.mode!=="live")return;const run=()=>{if(Date.now()-lastScroll<350){raf=setTimeout(run,150);return}raf=0;render()};raf=setTimeout(run,16)};
    const onErr=e=>{if(e&&e.code==="permission-denied"){S.mode="locked";S.canWrite=false;render();return}S.stale=true;later()};
    const meta=(id,key,track)=>unsubs.push(db.doc("meta/"+id).onSnapshot(LIVE,s=>{S[key]=s.exists?Object.assign({},s.data()):{};if(track)mark(key,s);later()},track?onErr:()=>{}));
    meta("settings","settings",true);meta("agent","agent",true);meta("profil","profil");meta("analyse","analyse");meta("planning","planning");meta("prefs","prefs");meta("push","push");meta("presence","presence");meta("hebdo","hebdo");meta("photo","photo");meta("locks","locks");meta("ia","ia");meta("briefs","briefs");meta("pinterest","pinterest");
    { const d=new Date(),prev=monthKey(new Date(d.getFullYear(),d.getMonth()-1,15));
      for(const [k,m] of [["cur",monthKey(d)],["prev",prev]])unsubs.push(db.doc("usage/"+m).onSnapshot(LIVE,x=>{S.usage[k]=x.exists?x.data():{};later()},()=>{})); }
    db.doc("meta/presence").set({[presKey()]:Date.now()},{merge:true}).catch(()=>{});
    COLS.forEach(c=>{
      unsubs.push(db.collection(c).onSnapshot(LIVE,s=>{S[c]=s.docs.map(d=>Object.assign({id:d.id},d.data()));mark(c,s);later()},onErr));
    });
  });
}
boot();
