import {db,auth,signInGoogle,sendEmailLink,completeEmailLink,signOut,ALLOWED} from "./firebase.js";
// Ne touche au DOM que si le contenu a changé : remplacer la page pendant un défilement
// coupe l'élan sur iPhone et remet les barres horizontales au début.
const setHTML=(el,h)=>{if(el&&el._h!==h){el._h=h;el.innerHTML=h}};


/* ---------- Constants ---------- */
const VIEWS=[
  ["apercu","Accueil"],["planning","Planning"],["agenda","Agenda"],["budget","Budget"],["invites","Invités"],
  ["tables","Plan de table"],["envies","Nos envies"],["prestataires","Annuaire"],["jour-j","Jour J"],["assistant","E-mails"],["reglages","Réglages"]
];
const JOBS={
  mail:{label:"Lecture de la boîte mail",intro:"L'assistant lit les nouveaux mails et prépare des propositions à valider.",def:{enabled:true,mode:"daily",h1:7,h2:19,day:1}},
  analyse:{label:"Analyse des prestataires",intro:"L'agent cherche les avis en ligne et met à jour les notes de fit et la synthèse de vos envies.",def:{enabled:true,mode:"daily",h1:8,h2:20,day:1}}
};
const JOURS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MODES=[["hourly","Toutes les heures"],["daily","1 fois par jour"],["twice","2 fois par jour"],["weekly","1 fois par semaine"]];
const OWNERS={claire:"Claire",julien:"Julien",deux:"Les deux"};
const STATUS={todo:"À faire",doing:"En cours",done:"Fait"};
const SIDES={claire:"Claire",julien:"Julien",commun:"Commun"};
const RSVP={attente:"En attente",oui:"Présent",non:"Absent"};
const RSVP_CLS={attente:"warn",oui:"ok",non:"bad"};
const VSTAT={repere:"Repéré",contacte:"Contacté",devis:"Devis reçu",reserve:"Réservé",ecarte:"Écarté"};
const VSTAT_CLS={repere:"",contacte:"acc",devis:"warn",reserve:"ok",ecarte:"bad"};
const VSTAT_RANK={ecarte:0,repere:1,contacte:2,devis:3,reserve:4};
const VCATS=["Lieu","Traiteur","Photographe","Vidéaste","Musique","Fleuriste","Tenues","Alliances","Coiffure & maquillage","Papeterie","Transport","Officiant","Hébergement","Animation enfants","Autre"];
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
const COLS=["tasks","budget","guests","vendors","schedule","rdv","inbox","brief"];
const S={
  db:null,dl:true,user:null,mode:"loading",canWrite:true,pending:false,
  settings:{},agent:{},profil:{},analyse:{},planning:{},tasks:[],budget:[],guests:[],vendors:[],schedule:[],rdv:[],inbox:[],brief:[],
  got:new Set(),stale:false,view:"apercu",
  f:{owner:"all",hideDone:false,gSide:"all",gRsvp:"all",gq:"",vStat:"all",bcat:"vision"}
};

/* ---------- Interview (senior wedding planner brief) ---------- */
// [id, type t=texte libre | m=choix multiples | c=choix unique, question, options]
const QCATS=[
 {k:"vision",label:"Votre mariage",intro:"Avant de parler prestataires, parlons de vous. Ces réponses guident tous les choix qui suivent : c'est la boussole du projet.",qs:[
  ["ambiance","t","Si vous deviez décrire l'ambiance de votre mariage en trois mots ?"],
  ["style","m","Quel style vous ressemble ?",["Champêtre","Bohème","Élégant et chic","Château classique","Moderne et épuré","Guinguette festive","Intime","Grande fête"]],
  ["invites","t","Combien d'invités imaginez-vous, au minimum et au maximum ?"],
  ["format","m","Quel format ?",["Une journée","Week-end complet","Brunch du lendemain","Cérémonie laïque","Cérémonie religieuse","Mariage civil seul"]],
  ["periode","t","Saison et période idéales ? Des dates à éviter (examens, vacances, événements familiaux) ?"],
  ["moments","t","Les trois moments que vous voulez absolument réussir ?"],
  ["craintes","t","Qu'est-ce qui vous inquiète le plus pour ce jour-là ?"],
  ["souvenirs","t","Un mariage où vous étiez invités : ce que vous avez adoré, ce que vous ne voulez surtout pas reproduire ?"],
  ["juliette","t","Quelle place voulez-vous donner à Juliette dans la journée ?"],
  ["recit","t","Le lendemain, qu'aimeriez-vous que vos invités racontent de votre mariage ?"],
  ["arbitrage","t","Budget : sur quoi voulez-vous mettre le paquet, et où êtes-vous prêts à économiser ?"]]},
 {k:"lieu",label:"Lieu",vcat:"Lieu",intro:"Le lieu fixe la date, la capacité, le style et une bonne partie du budget. C'est la décision qui conditionne toutes les autres.",qs:[
  ["region","t","Dans quelle région, et à quelle distance maximum de chez vous et de la majorité des invités ?"],
  ["type","m","Quel type de lieu vous fait rêver ?",["Château","Domaine ou manoir","Ferme ou grange","Bord de mer","Lieu urbain","Jardin privé"]],
  ["exclu","c","Privatisation exclusive du week-end ?",["Indispensable","Souhaitable","Indifférent"]],
  ["dodo","t","Combien de personnes doivent pouvoir dormir sur place ?"],
  ["traiteur","c","Liberté de choisir votre traiteur ?",["Indispensable","Préférable","Peu importe"]],
  ["pluie","t","Plan B en cas de pluie : quel niveau d'exigence (salle de repli, tente, rien) ?"],
  ["horaires","t","Heure de fin de soirée et limite de son acceptables ?"],
  ["acces","t","Accessibilité : personnes âgées, mobilité réduite, parking, gare proche ?"]]},
 {k:"traiteur",label:"Traiteur",vcat:"Traiteur",intro:"Le repas est ce dont les invités se souviennent le plus, en bien comme en mal. On cherche le bon format autant que la bonne cuisine.",qs:[
  ["format","m","Format du repas ?",["Assis, servi à l'assiette","Buffet","Grandes tablées à partager","Food trucks","Cocktail dînatoire"]],
  ["cuisine","t","Quelle cuisine : terroir, gastronomique, du monde, végétale ? Des plats incontournables ?"],
  ["cocktail","t","Vin d'honneur : durée, nombre de pièces, ateliers ou animations culinaires ?"],
  ["regimes","t","Régimes et allergies déjà connus chez les invités ?"],
  ["boissons","c","Les vins et champagnes ?",["Fournis par nous (droit de bouchon)","Fournis par le traiteur","À voir selon le prix"]],
  ["dessert","m","Dessert ?",["Pièce montée","Wedding cake","Buffet de desserts","Dessert à l'assiette"]],
  ["brunch","c","Un brunch le lendemain ?",["Oui","Non","Peut-être"]],
  ["budgetpp","t","Budget cible par personne, boissons comprises ?"]]},
 {k:"photo",label:"Photographe",vcat:"Photographe",intro:"Les photos sont la seule chose qui reste vraiment. Le style compte plus que le matériel : il faut que vous vous reconnaissiez dans son regard.",qs:[
  ["style","m","Quel style photo ?",["Reportage naturel","Posé et classique","Artistique, éditorial","Argentique","Lumineux et pastel","Contrasté et intense"]],
  ["couverture","t","Couverture souhaitée : des préparatifs jusqu'à quelle heure ?"],
  ["couple","m","Séance couple ?",["Avant le jour J","Pendant le jour J","Le lendemain (day after)","Pas de séance"]],
  ["groupes","t","Photos de groupe : avec qui, combien, combien de temps leur accorder ?"],
  ["aise","c","Êtes-vous à l'aise devant l'objectif ?",["Très à l'aise","Moyennement","Pas du tout"]],
  ["livrables","t","Livrables attendus : album, tirages, nombre de photos, délai de livraison acceptable ?"],
  ["refs","t","Des photographes dont vous aimez le travail (Instagram, sites) ?"]]},
 {k:"video",label:"Vidéaste",vcat:"Vidéaste",intro:"Une vidéo réussie fait revivre les voix et les émotions. Encore faut-il savoir ce que vous voulez revoir dans dix ans.",qs:[
  ["envie","c","Une vidéo, vraiment ?",["Indispensable","Si le budget le permet","Non"]],
  ["format","m","Quels formats ?",["Film court (3 à 5 min)","Film long","Discours en intégralité","Images de drone","Teaser réseaux sociaux"]],
  ["style","t","Style : cinématographique, documentaire, avec les voix et les sons du jour ?"],
  ["discretion","t","Quelle discrétion attendez-vous pendant la cérémonie ?"]]},
 {k:"musique",label:"Musique",vcat:"Musique",intro:"La musique fait l'énergie de la soirée. On cherche quelqu'un qui lit une salle, pas seulement une playlist.",qs:[
  ["formule","m","Quelle formule ?",["DJ","Groupe live","Musiciens pour la cérémonie","Musique au cocktail","Playlist maison"]],
  ["styles","t","Les styles qui doivent passer, et ceux à bannir ?"],
  ["ouverture","t","Ouverture de bal : une chanson en tête, une danse préparée ?"],
  ["animation","c","Animation ?",["Discrète, la musique suffit","Ambianceur qui fait participer","Entre les deux"]],
  ["moments","t","Les moments musicaux clés : entrée, sortie de cérémonie, gâteau, chanson signature ?"],
  ["fin","t","Jusqu'à quelle heure la fête doit-elle durer ?"]]},
 {k:"fleurs",label:"Fleurs et déco",vcat:"Fleuriste",intro:"Fleurs et décoration créent l'atmosphère dès la première photo. On part de vos couleurs et de ce que le lieu offre déjà.",qs:[
  ["palette","t","Votre palette de couleurs ?"],
  ["aimees","t","Les fleurs que vous aimez, celles à éviter (allergies, odeurs) ?"],
  ["style","m","Quel style ?",["Fleurs des champs","Luxuriant","Épuré","Fleurs séchées","Feuillages et végétal"]],
  ["quoi","m","Que faut-il fleurir ?",["Bouquet de la mariée","Boutonnières","Arche ou allée de cérémonie","Centres de table","Voiture","Coiffure","Espace cocktail"]],
  ["deco","t","Au-delà des fleurs : lumières, guirlandes, bougies, signalétique ?"],
  ["diy","c","Faire une partie vous-mêmes ?",["Oui, avec plaisir","Un peu","Non, tout déléguer"]]]},
 {k:"tenues",label:"Tenues",vcat:"Tenues",intro:"Il faut se sentir soi-même, en plus beau. Les délais de fabrication et de retouches imposent de s'y prendre tôt.",qs:[
  ["claire","t","Claire : la tenue rêvée, les silhouettes et matières à éviter ?"],
  ["julien","t","Julien : costume, smoking, couleur, sur mesure ou prêt-à-porter ?"],
  ["soiree","c","Une deuxième tenue pour la soirée ?",["Oui","Non","Peut-être"]],
  ["accessoires","t","Accessoires : voile, chaussures, bijoux, montre, boutons de manchette ?"],
  ["cortege","t","Des tenues coordonnées pour les témoins, le cortège ou Juliette ?"],
  ["budget","t","Budget tenues pour chacun de vous ?"]]},
 {k:"alliances",label:"Alliances",vcat:"Alliances",intro:"Les seuls objets du mariage que vous porterez tous les jours.",qs:[
  ["metal","m","Quel métal ?",["Or jaune","Or blanc","Or rose","Platine","Mélange"]],
  ["assorties","c","Assorties ou chacun son style ?",["Assorties","Chacun son style","Un détail commun"]],
  ["artisan","c","Où les faire ?",["Créateur ou artisan","Bijouterie classique","Peu importe"]],
  ["gravure","t","Une gravure ? Laquelle ?"]]},
 {k:"beaute",label:"Coiffure et maquillage",vcat:"Coiffure & maquillage",intro:"L'objectif : être soi-même en mieux, et tenir de 9h à 2h du matin.",qs:[
  ["pour","m","Pour qui ?",["Claire","Témoins","Mamans","Juliette"]],
  ["style","t","Style recherché : naturel, glamour, bohème ? Des photos d'inspiration ?"],
  ["domicile","c","Prestation sur place indispensable ?",["Oui","Non"]],
  ["retouches","c","Des retouches pendant la journée ?",["Oui","Non","Pour la soirée seulement"]]]},
 {k:"papeterie",label:"Papeterie",vcat:"Papeterie",intro:"Le faire-part est la première image de votre mariage que les invités reçoivent.",qs:[
  ["supports","m","Quels supports ?",["Save-the-date","Faire-part","Site internet","Menus","Marque-places","Plan de table","Livret de cérémonie","Remerciements"]],
  ["papier","c","Papier, numérique ou les deux ?",["Papier","Numérique","Les deux"]],
  ["identite","t","Identité visuelle : monogramme, illustration du lieu, couleurs ?"],
  ["reponses","c","Comment les invités répondent-ils ?",["Site internet","E-mail","Carte réponse"]]]},
 {k:"transport",label:"Transport",vcat:"Transport",intro:"Ce qui ne se voit pas mais se ressent : personne ne doit se perdre ni conduire après la fête.",qs:[
  ["voiture","t","Voiture des mariés : vintage, décapotable, aucune ?"],
  ["navettes","t","Navettes pour les invités : depuis la gare, les hôtels, retour de nuit ?"],
  ["trajets","t","Les distances entre mairie, cérémonie et réception ?"]]},
 {k:"ceremonie",label:"Cérémonie",vcat:"Officiant",intro:"Le cœur émotionnel de la journée. On construit un moment qui vous ressemble, au bon rythme.",qs:[
  ["type","m","Quelle(s) cérémonie(s) ?",["Civile seule","Laïque","Religieuse"]],
  ["officiant","c","Pour la cérémonie laïque, qui officie ?",["Un officiant professionnel","Un proche","Pas de cérémonie laïque"]],
  ["message","t","Ce que vous voulez transmettre : votre histoire, des valeurs, des rituels ?"],
  ["intervenants","t","Qui prendra la parole ?"],
  ["duree","c","Durée idéale ?",["20 min","30 min","45 min"]],
  ["roles","t","Le rôle des témoins et de Juliette pendant la cérémonie ?"]]},
 {k:"hebergement",label:"Hébergement",vcat:"Hébergement",intro:"Bien loger les invités, c'est leur permettre de profiter jusqu'au bout.",qs:[
  ["combien","t","Combien d'invités devront dormir sur place ou à proximité ?"],
  ["qui","c","Qui paie l'hébergement ?",["Nous","Les invités","Partagé"]],
  ["priorite","t","Pour qui réserver en priorité (famille proche, personnes âgées) ?"],
  ["noces","t","Votre nuit de noces : sur place ou ailleurs ?"]]},
 {k:"enfants",label:"Enfants",vcat:"Animation enfants",intro:"Des enfants heureux, ce sont des parents qui profitent de la fête.",qs:[
  ["nombre","t","Nombre d'enfants attendus et tranches d'âge ?"],
  ["formule","m","Quelle formule ?",["Baby-sitters","Animateurs","Coin enfants","Repas enfants à part","Espace sieste"]],
  ["horaire","t","Jusqu'à quelle heure les enfants restent-ils à la fête ?"],
  ["juliette","t","Le jour J et le soir, qui s'occupe de Juliette ?"]]}
];
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
const findGuest=name=>{const n=String(name||"").trim().toLowerCase();return n?S.guests.find(g=>String(g.name||"").trim().toLowerCase()===n):null};

function ring(p,color){
  const r=26,c=2*Math.PI*r,v=Math.max(0,Math.min(1,p||0));
  return `<svg class="ring" width="68" height="68" viewBox="0 0 68 68" aria-hidden="true"><circle class="bgc" cx="34" cy="34" r="${r}"/><circle cx="34" cy="34" r="${r}" stroke="${color}" stroke-linecap="round" stroke-dasharray="${(c*v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 34 34)"/><text x="34" y="34">${Math.round(v*100)}%</text></svg>`;
}
function toast(msg){const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}

/* ---------- Data writes ---------- */
async function save(col,id,data){
  if(!S.db){toast("Connectez-vous pour enregistrer");return false}
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
  if(!S.db){toast("Connectez-vous pour enregistrer");return false}
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
  if(d){const L=fmtLong(d);sub.push(`<b>${esc(L.charAt(0).toUpperCase()+L.slice(1))}</b>`)}
  if(st.lieu||st.ville)sub.push(`<span>${esc([st.lieu,st.ville].filter(Boolean).join(", "))}</span>`);
  if(st.mairie)sub.push(`<span>Mairie de ${esc(st.mairie)}</span>`);
  if(!sub.length)sub.push(`<span>${S.mode==="live"?"Date et lieu à renseigner dans Réglages":"Notre mariage"}</span>`);
  setHTML(document.getElementById("hero-sub"),sub.join(""));
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
const ICON={apercu:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',planning:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14l2 2 4-4"/>',invites:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.5 5.5 5.8"/>',prestataires:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',plus:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'};
const BNAV=[["apercu","Accueil"],["planning","Planning"],["invites","Invités"],["prestataires","Annuaire"]];
function renderBnav(){
  const late=S.tasks.filter(isLate).length,sug=pendingSugs().length;
  const inMain=BNAV.some(b=>b[0]===S.view);
  setHTML(document.getElementById("bnav"),BNAV.map(([k,l])=>`<button data-go="${k}" ${S.view===k?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${l}${k==="planning"&&late?`<span class="badge num">${late}</span>`:""}</button>`).join("")
   +`<button data-act="more" ${inMain?"":'aria-current="page"'}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON.plus}</svg>${inMain?"Plus":esc((VIEWS.find(v=>v[0]===S.view)||[])[1]||"Plus")}${sug?`<span class="badge gold num">${sug}</span>`:""}</button>`);
  document.body.classList.toggle("compact",S.view!=="apercu");
}
function openMore(){
  const sug=pendingSugs().length;
  document.getElementById("layer").innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Toutes les sections"><h3>Toutes les sections</h3>
    <div class="sheet-grid">${VIEWS.map(([k,l])=>`<button data-go="${k}" ${S.view===k?'aria-current="page"':""}><span>${l}</span>${k==="assistant"&&sug?`<span class="badge gold num">${sug}</span>`:""}</button>`).join("")}</div>
    <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">Fermer</button></div></div></div></div>`;
}
function renderTabs(){
  renderBnav();
  const late=S.tasks.filter(isLate).length,sug=pendingSugs().length;
  setHTML(document.getElementById("tabs"),VIEWS.map(([k,l])=>
    `<button class="tab" data-go="${k}" ${S.view===k?'aria-current="page"':""}>${l}${k==="planning"&&late?`<span class="badge num" title="En retard">${late}</span>`:""}${k==="assistant"&&sug?`<span class="badge gold num" title="À valider">${sug}</span>`:""}</button>`).join(""));
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
    if(ac&&!v.acomptePaye)out.push({v,kind:"Acompte",amount:ac,date:pd(v.dateAcompte)});
    if(px&&!v.soldePaye&&v.status==="reserve")out.push({v,kind:"Solde",amount:Math.max(0,px-(v.acomptePaye?ac:0)-(v.acomptePaye?0:ac)),date:pd(v.dateSolde)});
  });
  return out.sort((a,b)=>(a.date?+a.date:9e15)-(b.date?+b.date:9e15));
}
function vApercu(){
  const g=S.guests,yes=g.filter(x=>x.rsvp==="oui").length,no=g.filter(x=>x.rsvp==="non").length,wait=g.length-yes-no;
  const tot=num(S.settings.budgetTotal);
  const engage=S.budget.reduce((s,b)=>s+num(b.engage),0),paye=S.budget.reduce((s,b)=>s+num(b.paye),0),prevu=S.budget.reduce((s,b)=>s+num(b.prevu),0);
  const ref=tot||prevu;
  const done=S.tasks.filter(t=>t.status==="done").length,late=S.tasks.filter(isLate);
  const keyRes=KEY_VCATS.filter(c=>S.vendors.some(v=>v.cat===c&&v.status==="reserve")).length;
  const d=wDate(),cur=currentPhase();

  const kpis=`
    <div class="kpi t1 c3">${ring(S.tasks.length?done/S.tasks.length:0,"var(--accent)")}<div><div class="k">Préparation</div><div class="v num">${done}<small>/ ${S.tasks.length} tâches</small></div><div class="s">${late.length?`<span class="over">${late.length} en retard</span>`:"Rien en retard"}</div></div></div>
    <div class="kpi t2 c3">${ring(g.length?yes/g.length:0,"var(--julien)")}<div><div class="k">Invités</div><div class="v num">${yes}<small>/ ${g.length} présents</small></div><div class="s">${wait} réponse${wait>1?"s":""} attendue${wait>1?"s":""}</div></div></div>
    <div class="kpi t3 c3">${ring(ref?engage/ref:0,"var(--gold)")}<div><div class="k">Budget engagé</div><div class="v num">${eur(engage)}</div><div class="s">${ref?"sur "+eur(ref)+(tot?"":" prévus"):"Budget à fixer"}</div></div></div>
    <div class="kpi t4 c3">${ring(keyRes/KEY_VCATS.length,"var(--ok)")}<div><div class="k">Prestataires clés</div><div class="v num">${keyRes}<small>/ ${KEY_VCATS.length} réservés</small></div><div class="s">${KEY_VCATS.filter(c=>!S.vendors.some(v=>v.cat===c&&v.status==="reserve")).slice(0,2).join(", ")||"Tout est réservé"}</div></div></div>`;

  // Focus: late + next 21 days, else next open
  const horizon=addDays(today(),21);
  let focus=S.tasks.filter(t=>t.status!=="done"&&(isLate(t)||(taskDue(t)&&taskDue(t)<=horizon)));
  if(!focus.length)focus=S.tasks.filter(t=>t.status!=="done"&&(!cur||t.phase===cur.k));
  focus=focus.sort((a,b)=>{const da=taskDue(a),db=taskDue(b);if(da&&db&&+da!==+db)return da-db;return byOrder(a,b)}).slice(0,7);
  const focusH=`<div class="panel c7"><div class="panel-h"><h3>À faire maintenant</h3><button class="link" data-go="planning">Tout le planning</button></div>
    <div class="list">${focus.length?focus.map(taskRow).join(""):`<div class="empty"><b>Rien d'urgent</b>Profitez-en pour avancer sur la période suivante.</div>`}</div></div>`;

  const ms=milestones(),msDone=ms.filter(m=>m[1]).length,nextIdx=ms.findIndex(m=>!m[1]);
  const milesH=`<div class="panel c5"><div class="panel-h"><h3>Jalons</h3><span class="chip ok num">${msDone} / ${ms.length}</span></div>
    <ul class="miles">${ms.map((m,i)=>`<li class="${m[1]?"ok":i===nextIdx?"next":""}"><span class="dot"></span><span>${m[0]}</span>${i===nextIdx?'<span class="chip gold" style="margin-left:auto">Prochain</span>':""}</li>`).join("")}</ul></div>`;

  const pays=payments().slice(0,5),in30=payments().filter(p=>p.date&&days(today(),p.date)<=30).reduce((s,p)=>s+p.amount,0);
  const payH=`<div class="panel c4"><div class="panel-h"><h3>Paiements à venir</h3><button class="link" data-go="prestataires">Prestataires</button></div>
    ${pays.length?`<div class="list">${pays.map(p=>`<div class="row click" data-edit="vendors" data-id="${p.v.id}">${p.date?dateBox(p.date,p.date<today()?"bad":"gold"):`<div class="datebox"><b>?</b><span>date</span></div>`}<div class="main"><div class="t">${esc(p.v.name)}</div><div class="m"><span>${p.kind}</span>${p.date?`<span>${relDay(p.date)}</span>`:"<span>date à préciser</span>"}</div></div><div class="end"><b class="num">${eur(p.amount)}</b></div></div>`).join("")}</div>
    <div class="s" style="font-size:13px;color:var(--muted);margin-top:22px">${in30?`<b class="num" style="color:var(--ink)">${eur(in30)}</b> à verser dans les 30 jours`:"Rien à verser dans les 30 jours"}</div>`
    :`<div class="empty" style="padding:14px 0">Les acomptes et soldes des prestataires apparaîtront ici avec leur date.</div>`}</div>`;

  const up=S.rdv.filter(r=>r.date&&pd(r.date)>=today()).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||""))).slice(0,4);
  const rdvH=`<div class="panel c4"><div class="panel-h"><h3>Prochains rendez-vous</h3><button class="link" data-go="agenda">Agenda</button></div>
    ${up.length?`<div class="list">${up.map(r=>`<div class="row click" data-edit="rdv" data-id="${r.id}">${dateBox(pd(r.date))}<div class="main"><div class="t">${esc(r.title)}</div><div class="m">${r.time?`<span class="num">${esc(r.time)}</span>`:""}${r.avec?`<span>${esc(r.avec)}</span>`:""}<span>${relDay(pd(r.date))}</span></div></div></div>`).join("")}</div>`
    :`<div class="empty" style="padding:14px 0">Visites, dégustations, essayages : ajoutez-les dans l'Agenda.<div style="margin-top:10px"><button class="btn sm" data-new="rdv" ${S.canWrite?"":"disabled"}>Ajouter un rendez-vous</button></div></div>`}</div>`;

  const open=S.tasks.filter(t=>t.status!=="done");
  const cnt=k=>open.filter(t=>(t.owner||"deux")===k).length,lateOf=k=>late.filter(t=>(t.owner||"deux")===k).length;
  const mx=Math.max(1,cnt("claire"),cnt("julien"),cnt("deux"));
  const whoH=`<div class="panel c4"><div class="panel-h"><h3>Qui fait quoi</h3><span class="chip num">${open.length} ouvertes</span></div>
    <div class="who">${[["claire","Claire","var(--claire)"],["julien","Julien","var(--julien)"],["deux","Ensemble","var(--muted)"]].map(([k,l,c])=>`<button class="who-row" data-who="${k}" style="background:none;border:0;padding:0;cursor:pointer;text-align:left"><span style="font-weight:600">${l}</span><span class="hb-track"><i style="width:${cnt(k)/mx*100}%;background:${c}"></i></span><span class="num" style="font-size:13px;color:var(--muted)">${cnt(k)}${lateOf(k)?` · <span class="over">${lateOf(k)} en retard</span>`:""}</span></button>`).join("")}</div>
    <div class="mini"><div><b class="num">${g.filter(x=>x.rsvp!=="non"&&x.diner!==false).length}</b><span>couverts</span></div><div><b class="num">${g.filter(x=>x.rsvp!=="non"&&x.regime).length}</b><span>régimes</span></div><div><b class="num">${g.filter(x=>x.enfant&&x.rsvp!=="non").length}</b><span>enfants</span></div></div></div>`;

  const lines=S.budget.filter(b=>num(b.prevu)||num(b.engage)).sort((a,b)=>Math.max(num(b.prevu),num(b.engage))-Math.max(num(a.prevu),num(a.engage))).slice(0,6);
  const bmx=Math.max(1,...lines.map(b=>Math.max(num(b.prevu),num(b.engage))));
  const guestsBase=yes||num(S.settings.invitesCible)||g.length;
  const perGuest=guestsBase?(engage||prevu)/guestsBase:0;
  const budH=`<div class="panel c7"><div class="panel-h"><h3>Budget par poste</h3><button class="link" data-go="budget">Détail</button></div>
    ${lines.length?`<div class="hbars">${lines.map(b=>{const p=num(b.prevu),e=num(b.engage),ov=p&&e>p;return `<div class="hb-row"><span class="lab">${esc(b.label)}</span><span class="amt num">${e?eur(e):"—"} / ${p?eur(p):"—"}</span><div class="hb-track"><i class="plan" style="width:${p/bmx*100}%"></i><i class="eng ${ov?"over":""}" style="width:${e/bmx*100}%"></i></div></div>`}).join("")}</div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Engagé</span><span><i style="border:1.5px solid var(--accent)"></i>Prévu</span><span><i style="background:var(--bad)"></i>Dépassement</span></div>`
    :`<div class="empty" style="padding:14px 0">Renseignez les montants prévus dans Budget pour voir la répartition.</div>`}
    <div class="mini"><div><b class="num">${eur(paye)}</b><span>déjà payé</span></div><div><b class="num">${eur(Math.max(0,engage-paye))}</b><span>reste à payer</span></div><div><b class="num">${perGuest?eur(perGuest):"—"}</b><span>par invité</span></div></div></div>`;

  const ps=pendingSugs(),ag=S.agent;
  const agH=`<div class="panel c5"><div class="panel-h"><h3>Assistant e-mails</h3><span class="chip ${ag.status==="actif"?"ok":""}">${ag.status==="actif"?"Actif":"Non connecté"}</span></div>
    ${ps.length?`<div class="list">${ps.slice(0,3).map(s=>`<div class="row click" data-go="assistant"><div class="main"><div class="t">${esc(s.summary||s.subject)}</div><div class="m"><span>${esc((SUGTYPE[s.type]||["Info"])[0])}</span><span>${esc(s.from||"")}</span></div></div></div>`).join("")}</div>
      <div style="margin-top:22px"><button class="btn primary sm" data-go="assistant">Valider ${ps.length} proposition${ps.length>1?"s":""}</button></div>`
    :`<p style="margin:0;color:var(--muted);font-size:14px">${ag.status==="actif"?"Aucune nouvelle proposition. Dernier passage "+(ag.lastRun?relDay(pd(ag.lastRun)):"inconnu")+".":"Branchez la boîte mail dédiée : les devis, échéances et réponses d'invités arriveront ici, prêts à être validés."}</p>
      <div style="margin-top:14px"><button class="btn sm" data-go="assistant">Voir l'assistant</button></div>`}</div>`;

  return `<div class="vh"><div><h2>${cur?esc(cur.label.charAt(0).toUpperCase()+cur.label.slice(1)):"Tableau de bord"}</h2><p>${cur?esc((cur.hint?cur.hint+" · ":"")+"à boucler avant le "+fmtD(cur.due(d))):"Commencez par fixer la date et le budget dans Réglages."}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-new="rdv" ${S.canWrite?"":"disabled"}>Rendez-vous</button><button class="btn primary" data-new="tasks" ${S.canWrite?"":"disabled"}>Nouvelle tâche</button></div></div>
  <div class="dash">${kpis}${focusH}${milesH}${payH}${rdvH}${whoH}${budH}${agH}</div>`;
}

function taskRow(t){
  const due=taskDue(t),late=isLate(t);
  return `<div class="row ${t.status==="done"?"done":""}">
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
  return `<div class="vh"><div><h2>Rétroplanning</h2><p>${d?"Les échéances se calculent à partir de la date du mariage. Une échéance précise sur une tâche prend le dessus.":"Fixez la date dans Réglages pour voir les échéances."}</p></div>
    <button class="btn primary" data-new="tasks" ${S.canWrite?"":"disabled"}>Ajouter une tâche</button></div>
  <div class="filters">
    <div class="seg" role="group" aria-label="Filtrer par personne">${[["all","Tout"],["claire","Claire"],["julien","Julien"],["deux","Ensemble"]].map(([k,l])=>`<button data-f="owner" data-v="${k}" aria-pressed="${f.owner===k}">${l}</button>`).join("")}</div>
    <label class="toggle"><input type="checkbox" id="hide-done" ${f.hideDone?"checked":""}> Masquer les tâches faites</label>
  </div>
  ${groups||emptyBlock("Aucune tâche pour l'instant","Ajoutez la première avec le bouton ci-dessus.")}`;
}

/* ---------- Agenda ---------- */
function vAgenda(){
  const all=S.rdv.slice().sort((a,b)=>String((a.date||"9")+(a.time||"")).localeCompare(String((b.date||"9")+(b.time||""))));
  const t=today(),up=all.filter(r=>!r.date||pd(r.date)>=t),past=all.filter(r=>r.date&&pd(r.date)<t).reverse();
  const row=r=>{const d=pd(r.date);return `<div class="row click" data-edit="rdv" data-id="${r.id}">${d?dateBox(d,d<t?"":"gold"):`<div class="datebox"><b>?</b><span>date</span></div>`}<div class="main"><div class="t">${esc(r.title)}</div><div class="m">${d?`<span>${esc(fmtLong(d))}</span>`:""}${r.time?`<span class="num">${esc(r.time)}</span>`:""}${r.avec?`<span>avec ${esc(r.avec)}</span>`:""}${r.lieu?`<span>${esc(r.lieu)}</span>`:""}</div></div><div class="end">${r.qui?ownerChip(r.qui):""}${r.source==="mail"?'<span class="chip gold">via e-mail</span>':""}</div></div>`};
  return `<div class="vh"><div><h2>Agenda</h2><p>Visites de lieux, dégustations, essayages, rendez-vous mairie et notaire.</p></div>
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
    <div class="kpi t1"><div><div class="k">Budget total</div><div class="v num">${tot?eur(tot):"—"}</div><div class="s">${tot?"Fixé dans Réglages":`<button class="chip acc" data-go="reglages">Le fixer</button>`}</div></div></div>
    <div class="kpi t2"><div><div class="k">Prévu</div><div class="v num">${eur(prevu)}</div><div class="s">Somme des postes</div></div></div>
    <div class="kpi t3"><div><div class="k">Engagé</div><div class="v num">${eur(engage)}</div><div class="s">Payé ${eur(paye)} · reste ${eur(Math.max(0,engage-paye))}</div></div></div>
    <div class="kpi ${marge!==null&&marge<0?"":"t4"}" style="${marge!==null&&marge<0?"background:var(--bad-soft)":""}"><div><div class="k">Marge</div><div class="v num" style="${marge!==null&&marge<0?"color:var(--bad)":""}">${marge===null?"—":eur(marge)}</div><div class="s">${marge===null?"Selon le budget total":marge<0?"Au-dessus du budget":"Encore disponible"}</div></div></div>
  </div>`;
  const gap=resv-engage;
  const body=rows.map(b=>{
    const over=num(b.engage)>num(b.prevu)&&num(b.prevu)>0;
    return `<tr data-edit="budget" data-id="${b.id}"><td><div style="font-weight:500">${esc(b.label)}</div>${b.note?`<div style="font-size:13px;color:var(--muted)">${esc(b.note)}</div>`:""}</td>
      <td class="r">${b.prevu?eur(b.prevu):'<span style="color:var(--muted)">—</span>'}</td><td class="r ${over?"over":""}">${b.engage?eur(b.engage):"—"}</td><td class="r">${b.paye?eur(b.paye):"—"}</td><td class="r">${num(b.engage)-num(b.paye)>0?eur(num(b.engage)-num(b.paye)):"—"}</td></tr>`;
  }).join("");
  return `<div class="vh"><div><h2>Budget</h2><p>Prévu = enveloppe du poste · Engagé = devis signés · Payé = acomptes et soldes versés.</p></div>
    <button class="btn primary" data-new="budget" ${S.canWrite?"":"disabled"}>Ajouter un poste</button></div>
  ${strip}
  ${gap>0?`<div class="banner warn">Les prestataires réservés totalisent ${eur(resv)}, soit ${eur(gap)} de plus que l'engagé du budget. Pensez à reporter les devis signés.</div>`:""}
  ${rows.length?`<div class="tbl-wrap"><table><thead><tr><th>Poste</th><th class="r">Prévu</th><th class="r">Engagé</th><th class="r">Payé</th><th class="r">Reste à payer</th></tr></thead><tbody>${body}</tbody>
    <tfoot><tr><td>Total</td><td class="r">${eur(prevu)}</td><td class="r">${eur(engage)}</td><td class="r">${eur(paye)}</td><td class="r">${eur(Math.max(0,engage-paye))}</td></tr></tfoot></table></div>`
  :emptyBlock("Aucun poste de budget","Ajoutez vos postes : lieu, traiteur, photographe…")}`;
}

/* ---------- Guests ---------- */
function guestFiltered(){
  const f=S.f,q=f.gq.trim().toLowerCase();
  return S.guests.filter(g=>(f.gSide==="all"||g.side===f.gSide)&&(f.gRsvp==="all"||(g.rsvp||"attente")===f.gRsvp)&&(!q||[g.name,g.group,g.table,g.regime].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>String(a.group||"").localeCompare(b.group||"")||String(a.name).localeCompare(b.name));
}
function guestRows(){
  const gs=guestFiltered();
  if(!S.guests.length)return emptyBlock("Pas encore d'invités","Collez une liste de noms avec « Ajout rapide », un nom par ligne.");
  if(!gs.length)return `<div class="list"><div class="empty">Aucun invité ne correspond à ces filtres.</div></div>`;
  return `<div class="list">${gs.map(g=>{
    const r=g.rsvp||"attente";
    const ev=[g.ceremonie!==false?"Cérémonie":null,g.vin!==false?"Vin d'honneur":null,g.diner!==false?"Dîner":null].filter(Boolean).join(" · ");
    return `<div class="row"><div class="main click" data-edit="guests" data-id="${g.id}" style="cursor:pointer;margin:-12px 0;padding:12px 0">
      <div class="t">${esc(g.name)}${g.enfant?' <span class="chip">Enfant</span>':""}</div>
      <div class="m"><span>${esc(g.group||"Sans groupe")}</span><span>${esc(ev||"Aucun moment")}</span>${g.table?`<span>Table ${esc(g.table)}</span>`:""}${g.regime?`<span>${esc(g.regime)}</span>`:""}</div></div>
      <div class="end"><span class="chip ${g.side==="claire"?"claire":g.side==="julien"?"julien":""}">${esc(SIDES[g.side]||"Commun")}</span>
      <button class="chip ${RSVP_CLS[r]}" data-act="rsvp" data-id="${g.id}" title="Changer la réponse">${RSVP[r]}</button></div></div>`;
  }).join("")}</div>`;
}
function vInvites(){
  const g=S.guests,f=S.f;
  const yes=g.filter(x=>x.rsvp==="oui").length,no=g.filter(x=>x.rsvp==="non").length;
  const cible=num(S.settings.invitesCible);
  const strip=`<div class="strip">
    <div class="kpi t1"><div><div class="k">Invités</div><div class="v num">${g.length}${cible?`<small>/ ${cible} visés</small>`:""}</div><div class="s">${g.filter(x=>x.enfant).length} enfants</div></div></div>
    <div class="kpi t4"><div><div class="k">Présents</div><div class="v num">${yes}</div><div class="s">${g.length-yes-no} réponses attendues · ${no} absents</div></div></div>
    <div class="kpi t3"><div><div class="k">Au dîner</div><div class="v num">${g.filter(x=>x.rsvp!=="non"&&x.diner!==false).length}</div><div class="s">Présents et en attente</div></div></div>
    <div class="kpi t2"><div><div class="k">Claire · Julien · Commun</div><div class="v num" style="font-size:26px">${g.filter(x=>x.side==="claire").length} · ${g.filter(x=>x.side==="julien").length} · ${g.filter(x=>x.side==="commun"||!x.side).length}</div><div class="s">Répartition par côté</div></div></div>
  </div>`;
  return `<div class="vh"><div><h2>Invités</h2><p>Touchez la réponse d'un invité pour passer d'En attente à Présent, puis Absent.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${S.dl&&g.length?`<button class="btn" data-act="csv">Exporter (CSV)</button>`:""}<button class="btn" data-act="bulk" ${S.canWrite?"":"disabled"}>Ajout rapide</button><button class="btn primary" data-new="guests" ${S.canWrite?"":"disabled"}>Ajouter un invité</button></div></div>
  ${strip}
  <div class="filters">
    <input class="search" id="gq" type="search" placeholder="Chercher un nom, un groupe, une table…" value="${esc(f.gq)}" aria-label="Chercher un invité">
    <div class="seg" role="group" aria-label="Côté">${[["all","Tous"],["claire","Claire"],["julien","Julien"],["commun","Commun"]].map(([k,l])=>`<button data-f="gSide" data-v="${k}" aria-pressed="${f.gSide===k}">${l}</button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Réponse">${[["all","Toutes"],["oui","Présents"],["attente","En attente"],["non","Absents"]].map(([k,l])=>`<button data-f="gRsvp" data-v="${k}" aria-pressed="${f.gRsvp===k}">${l}</button>`).join("")}</div>
  </div>
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
  return `<div class="vh"><div><h2>Plan de table</h2><p>Invités au dîner, présents ou en attente de réponse. Tapez un nom de table pour en créer une.</p></div></div>
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
const allProg=()=>{let n=0,t=0;QCATS.forEach(c=>{const p=catProg(c.k);n+=p.n;t+=p.t});return t?n/t:0};
async function saveBrief(c,q,patchObj){
  const cur=Object.assign({},bGet(c,q));delete cur.id;
  const base=q==="_meta"?{cat:c,qid:"_meta"}:{cat:c,qid:q,question:(QC[c].qs.find(x=>x[0]===q)||[])[2]||""};
  return save("brief",bId(c,q),Object.assign(base,cur,patchObj,{updatedAt:Date.now()}));
}
const fitCls=s=>s==null?"none":s>=75?"hi":s>=55?"mid":"lo";
const fitBadge=(v,big)=>{const f=v.fit;return f&&f.score!=null?`<div class="fit ${fitCls(f.score)} ${big?"big":""}" title="Note de fit">${Math.round(f.score)}</div>`:`<div class="fit none ${big?"big":""}" title="Pas encore analysé">${big?"À analyser":"—"}</div>`};

/* ---------- Planning des agents ----------
   Les agents tournent dans GitHub Actions (agents/, .github/workflows/agents.yml), toutes les 10 minutes.
   À chaque passage, agents/scheduler.js lit meta/planning et décide si l'agent est dû.
   « Maintenant » = on pose requestedAt dans meta/agent ou meta/analyse : pris en compte au prochain passage (10 à 15 min). */
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
  if(ok)toast(k==="mail"?"Demande enregistrée : lecture dans les 10 à 15 minutes":"Analyse demandée : elle démarre dans les 10 à 15 minutes");
}
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
    <div class="plan-acts"><button class="btn primary" type="submit" ${dis}>Enregistrer le planning</button><button class="btn" type="button" data-act="runnow" data-job="${k}" ${dis}>${k==="mail"?"Lire la boîte au prochain passage":"Lancer l'analyse au prochain passage"}</button></div>
  </form>`;
}
async function fireAnalysis(){return runNow("analyse")}
function analyseBar(ctx){
  const a=S.analyse||{},st=a.status;
  const last=a.lastRun?new Date(a.lastRun):null;
  const label=st==="en cours"?"Analyse en cours…":st==="demandée"?"Analyse demandée":last?"Dernière analyse "+relDay(last)+" à "+last.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"Aucune analyse pour l'instant";
  const todo=S.vendors.filter(v=>v.status!=="ecarte"&&!(v.fit&&v.fit.score!=null)).length;
  return `<div class="ai-bar"><div style="min-width:0"><b>${ctx==="envies"?"Synthèse du wedding planner":"Analyse IA des prestataires"}</b>
    <p>${esc(label)}${ctx!=="envies"&&todo?` · ${todo} prestataire${todo>1?"s":""} à analyser`:""}. ${ctx==="envies"?"L'agent relit vos réponses, repère vos priorités et les points où vous n'êtes pas alignés.":"L'agent cherche les avis en ligne, croise chaque offre avec vos envies et attribue une note de fit sur 100."} Passage automatique ${esc(planLabel("analyse"))}.</p></div>
    <button class="btn primary" data-act="fire" ${S.canWrite&&st!=="en cours"?"":"disabled"}>Demander une analyse</button></div>`;
}

/* ---------- Annuaire ---------- */
function vPrestataires(){
  const f=S.f;
  let vs=S.vendors.slice();
  if(f.vStat!=="all")vs=vs.filter(v=>v.status===f.vStat);
  const cats=VCATS.filter(c=>vs.some(v=>v.cat===c));
  const engaged=S.vendors.filter(v=>v.status==="reserve").reduce((s,v)=>s+num(v.prix),0);
  const toPay=S.vendors.filter(v=>v.status!=="ecarte"&&num(v.acompte)&&!v.acomptePaye).length;
  const sc=v=>v.status==="ecarte"?-2:(v.fit&&v.fit.score!=null?v.fit.score:-1);
  const groups=cats.map(c=>{
    const list=vs.filter(v=>v.cat===c).sort((a,b)=>sc(b)-sc(a)||VSTAT_RANK[b.status]-VSTAT_RANK[a.status]);
    const qk=VCAT2Q[c],p=qk?catProg(qk):null,m=qk?bMeta(qk):{};
    return `<section class="phase"><div class="cat-h"><h3>${c}</h3><div class="meta">${m.importance?`<span class="chip acc">${IMPORT[m.importance-1]}</span>`:""}${num(m.budget)?`<span class="chip gold num">Budget ${eur(m.budget)}</span>`:""}${p?`<button class="chip ${p.p>=.7?"ok":p.p>0?"warn":""}" data-bgo="${qk}">Brief ${Math.round(p.p*100)} %</button>`:""}</div></div>
    <div class="list">${list.map((v,i)=>{const fi=v.fit||{};const av=fi.avis||{};return `<div class="vrow" data-fiche="${v.id}" role="button" tabindex="0">${list.length>1?`<span class="rank">${i+1}</span>`:""}${fitBadge(v)}
      <div class="main" style="flex:1;min-width:0"><div class="t" style="font-weight:500">${esc(v.name)}</div>
        ${fi.verdict?`<div class="verdict">${esc(fi.verdict)}</div>`:""}
        <div class="m" style="font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:2px 10px">${v.prix?`<span class="num">${eur(v.prix)}</span>`:""}${av.note?`<span class="stars">★ ${esc(String(av.note).replace(".",","))}${av.nombre?` <span style="color:var(--muted);font-weight:500">(${esc(av.nombre)} avis)</span>`:""}</span>`:""}${num(v.acompte)?`<span class="${v.acomptePaye?"":"over"}">Acompte ${eur(v.acompte)} ${v.acomptePaye?"versé":"à verser"}</span>`:""}${v.tel?`<span class="num">${esc(v.tel)}</span>`:""}</div></div>
      <div class="end" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${v.source==="mail"?'<span class="chip gold">via e-mail</span>':""}<span class="chip ${VSTAT_CLS[v.status]||""}">${VSTAT[v.status]||"Repéré"}</span></div></div>`}).join("")}</div></section>`;
  }).join("");
  return `<div class="vh"><div><h2>Annuaire des prestataires</h2><p>${S.vendors.length} prestataire${S.vendors.length>1?"s":""} · ${S.vendors.filter(v=>v.status==="reserve").length} réservé${S.vendors.filter(v=>v.status==="reserve").length>1?"s":""} pour ${eur(engaged)}${toPay?` · <span class="over">${toPay} acompte${toPay>1?"s":""} à verser</span>`:""}. Classés par note de fit dans chaque catégorie.</p></div>
    <button class="btn" data-new="vendors" ${S.canWrite?"":"disabled"}>Ajouter un prestataire</button></div>
  ${analyseBar("annuaire")}
  <div class="filters"><div class="seg" role="group" aria-label="Statut">${[["all","Tous"],...Object.entries(VSTAT)].map(([k,l])=>`<button data-f="vStat" data-v="${k}" aria-pressed="${f.vStat===k}">${l}</button>`).join("")}</div></div>
  ${groups||emptyBlock(S.vendors.length?"Aucun prestataire avec ce statut":"Aucun prestataire pour l'instant","Notez chaque piste dès le premier contact, ou laissez l'assistant e-mails les ajouter.")}`;
}

function openFiche(id){
  const v=S.vendors.find(x=>x.id===id);if(!v)return;
  const fi=v.fit||{},av=fi.avis||{};
  const qk=VCAT2Q[v.cat];
  const L=(t)=>Array.isArray(t)&&t.length?`<ul class="blist">${t.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
  const crit=Array.isArray(fi.criteres)&&fi.criteres.length?`<div class="fsec"><h4>Détail de la note</h4><div class="crit">${fi.criteres.map(c=>`<div class="hb-row"><span class="lab">${esc(c.label)}</span><span class="amt num">${Math.round(num(c.note))}/100</span><div class="hb-track"><i class="eng" style="width:${Math.max(0,Math.min(100,num(c.note)))}%;background:var(--${num(c.note)>=75?"ok":num(c.note)>=55?"gold":"bad"})"></i></div>${c.pourquoi?`<div class="why">${esc(c.pourquoi)}</div>`:""}</div>`).join("")}</div></div>`:"";
  const offre=[["Montant",v.prix?eur(v.prix):""],["Acompte",num(v.acompte)?eur(v.acompte)+(v.acomptePaye?" · versé":v.dateAcompte?" · avant le "+fmtD(pd(v.dateAcompte)):""):""],["Solde avant le",v.dateSolde?fmtD(pd(v.dateSolde)):""],["Contact",v.contact||""],["Téléphone",v.tel||""]].filter(x=>x[1]);
  const srcs=Array.isArray(av.sources)?av.sources.filter(s=>s&&/^https?:\/\//.test(s.url||"")):[];
  const layer=document.getElementById("layer");
  layer.innerHTML=`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Fiche ${esc(v.name)}" style="max-width:680px">
    <div class="fiche-top">${fitBadge(v,true)}<div style="min-width:0"><h3>${esc(v.name)}</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${esc(v.cat||"")}</span><span class="chip ${VSTAT_CLS[v.status]||""}">${VSTAT[v.status]||"Repéré"}</span>${fi.confiance?`<span class="chip ${fi.confiance==="bonne"?"ok":fi.confiance==="moyenne"?"warn":""}">Confiance ${esc(fi.confiance)}</span>`:""}</div></div></div>
    ${fi.verdict?`<p style="font-size:16px;margin:0">${esc(fi.verdict)}</p>`:`<div class="banner" style="margin:0">Pas encore analysé. Lancez l'analyse depuis l'annuaire, ou attendez le passage de demain matin.${qk&&catProg(qk).p<.5?" Remplissez aussi la partie « "+esc(QC[qk].label)+" » de Nos envies pour une note plus juste.":""}</div>`}
    ${offre.length?`<div class="fsec"><h4>L'offre</h4><div class="kv">${offre.map(([k,val])=>`<div><span>${k}</span><b>${esc(val)}</b></div>`).join("")}</div>${v.note?`<p style="font-size:14px;color:var(--muted);margin:10px 0 0;white-space:pre-line;overflow-wrap:anywhere">${esc(v.note)}</p>`:""}</div>`:""}
    ${crit}
    ${(fi.forces&&fi.forces.length)||(fi.vigilance&&fi.vigilance.length)?`<div class="fsec two"><div class="box-ok"><h4>Points forts</h4>${L(fi.forces)||'<span style="font-size:14px">—</span>'}</div><div class="box-bad"><h4>Points de vigilance</h4>${L(fi.vigilance)||'<span style="font-size:14px">—</span>'}</div></div>`:""}
    ${av.resume||av.note?`<div class="fsec"><h4>Avis en ligne${av.note?` · <span class="stars">★ ${esc(String(av.note).replace(".",","))}/5</span>`:""}${av.nombre?` · ${esc(av.nombre)} avis`:""}</h4>${av.resume?`<p style="margin:0;font-size:14px">${esc(av.resume)}</p>`:""}${srcs.length?`<div class="srcs">${srcs.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre||(()=>{try{return new URL(s.url).hostname}catch(e){return "source"}})())}</a>`).join("")}</div>`:""}</div>`:""}
    ${fi.questions&&fi.questions.length?`<div class="fsec"><h4>Questions à leur poser</h4>${L(fi.questions)}</div>`:""}
    ${fi.updatedAt?`<p style="font-size:12px;color:var(--muted);margin:16px 0 0">Analyse du ${esc(fmtD(new Date(fi.updatedAt)))}</p>`:""}
    <div class="acts">${v.mailUrl&&/^https:\/\/mail\.google\.com\//.test(v.mailUrl)?`<a class="btn ghost" href="${esc(v.mailUrl)}" target="_blank" rel="noopener">Ouvrir le mail</a>`:"<div></div>"}<div><button type="button" class="btn" data-close="1">Fermer</button><button type="button" class="btn primary" data-act="editv" data-id="${v.id}">Modifier</button></div></div>
  </div></div>`;
}

/* ---------- Nos envies ---------- */
function vEnvies(){
  const c=QC[S.f.bcat]?S.f.bcat:"vision",cat=QC[c],m=bMeta(c),dis=S.canWrite?"":"disabled";
  const pr=S.profil||{};
  const nav=`<nav class="env-nav" aria-label="Catégories du questionnaire">${QCATS.map(x=>{const p=catProg(x.k);return `<button data-bcat="${x.k}" aria-current="${x.k===c}"><span>${x.label}</span><span class="pbar" title="${p.n}/${p.t}"><i style="width:${p.p*100}%"></i></span></button>`}).join("")}</nav>`;
  const qhtml=cat.qs.map(([id,type,q,opts],i)=>{
    const a=bGet(c,id),done=answered(a),base=`q-${c}-${id}`;
    const choix=Array.isArray(a.choix)?a.choix:[];
    const chips=opts?`<div class="opts" role="group" aria-label="${esc(q)}">${opts.map(o=>`<button class="opt" data-bchip="${c}|${id}|${type}" data-o="${esc(o)}" aria-pressed="${choix.includes(o)}" ${dis}>${esc(o)}</button>`).join("")}</div>`:"";
    const main=`<textarea id="${base}-commun" data-bq="${c}|${id}|commun" placeholder="${opts?"Une précision ?":"Votre réponse commune…"}" ${opts?'style="min-height:44px"':""} ${dis}>${esc(a.commun||"")}</textarea>`;
    const duo=a.desaccord?`<div class="duo"><div class="field"><span style="color:var(--claire)">Claire</span><textarea id="${base}-claire" data-bq="${c}|${id}|claire" ${dis}>${esc(a.claire||"")}</textarea></div><div class="field"><span style="color:var(--julien)">Julien</span><textarea id="${base}-julien" data-bq="${c}|${id}|julien" ${dis}>${esc(a.julien||"")}</textarea></div></div>`:"";
    return `<div class="q ${done?"done":""}"><label class="ql" for="${base}-commun"><span class="n">${i+1}.</span><span>${esc(q)}</span></label>${chips}${main}
      <label class="diff"><input type="checkbox" id="${base}-dz" data-bq="${c}|${id}|desaccord" ${a.desaccord?"checked":""} ${dis}> Nos avis diffèrent</label>${duo}</div>`;
  }).join("");
  const metaH=c==="vision"?"":`<div class="q"><div class="ql" style="font-weight:500">Pour conclure sur ${esc(cat.label.toLowerCase())}</div>
    <div class="field"><span class="lab">Importance pour vous</span><div class="seg" role="group">${IMPORT.map((l,i)=>`<button data-bimp="${c}|${i+1}" aria-pressed="${m.importance===i+1}" ${dis}>${l}</button>`).join("")}</div></div>
    <div class="duo"><div class="field"><label for="q-${c}-_m-budget" class="lab">Budget cible (€)</label><input type="number" min="0" step="50" inputmode="numeric" id="q-${c}-_m-budget" data-bm="${c}|budget" value="${esc(m.budget??"")}" ${dis}></div><div></div></div>
    <div class="field"><label for="q-${c}-_m-reussite" class="lab">Ce qui en fera une vraie réussite</label><textarea id="q-${c}-_m-reussite" data-bm="${c}|reussite" ${dis}>${esc(m.reussite||"")}</textarea></div>
    <div class="field"><label for="q-${c}-_m-redhibitoire" class="lab">Ce qui serait rédhibitoire</label><textarea id="q-${c}-_m-redhibitoire" data-bm="${c}|redhibitoire" ${dis}>${esc(m.redhibitoire||"")}</textarea></div></div>`;
  const synth=pr.resume?`<div class="synth"><div class="panel-h"><h3>Ce que nous retenons de vous</h3>${pr.completude!=null?`<span class="chip ${pr.completude>=70?"ok":"warn"} num">Brief complet à ${Math.round(pr.completude)} %</span>`:""}</div>
    <p>${esc(pr.resume)}</p>
    ${Array.isArray(pr.divergences)&&pr.divergences.length?`<h3 class="sec" style="margin-top:14px">Points à aligner entre vous</h3>${pr.divergences.map(d=>`<div class="dv"><b>${esc(d.sujet||"")}</b>${d.claire?`<div><span style="color:var(--claire);font-weight:500">Claire :</span> ${esc(d.claire)}</div>`:""}${d.julien?`<div><span style="color:var(--julien);font-weight:500">Julien :</span> ${esc(d.julien)}</div>`:""}${d.conseil?`<div style="color:var(--muted)">${esc(d.conseil)}</div>`:""}</div>`).join("")}`:""}
    ${Array.isArray(pr.questionsOuvertes)&&pr.questionsOuvertes.length?`<h3 class="sec" style="margin-top:14px">Ce qu'il nous manque pour bien choisir</h3><ul class="blist">${pr.questionsOuvertes.map(q=>`<li>${esc(q)}</li>`).join("")}</ul>`:""}</div>`:"";
  const tot=allProg();
  return `<div class="vh"><div><h2>Nos envies</h2><p>Le questionnaire de votre wedding planner. Répondez ensemble ; quand vos avis diffèrent, chacun écrit le sien. Tout s'enregistre dès que vous quittez un champ.</p></div><span class="chip ${tot>=.7?"ok":"gold"} num" style="font-size:13px;padding:6px 12px">${Math.round(tot*100)} % rempli</span></div>
  ${analyseBar("envies")}${synth}
  <div class="env">${nav}<section style="min-width:0">
    <div class="env-head"><h3>${esc(cat.label)}</h3><p>${esc(cat.intro)}</p></div>
    <div class="qs">${qhtml}${metaH}</div>
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:18px;flex-wrap:wrap">${(()=>{const i=QCATS.findIndex(x=>x.k===c);return `${i>0?`<button class="btn" data-bcat="${QCATS[i-1].k}">← ${esc(QCATS[i-1].label)}</button>`:"<span></span>"}${i<QCATS.length-1?`<button class="btn primary" data-bcat="${QCATS[i+1].k}">${esc(QCATS[i+1].label)} →</button>`:""}`})()}</div>
  </section></div>`;
}

/* ---------- Day-of ---------- */
function vJourJ(){
  const rows=S.schedule.slice().sort((a,b)=>String(a.time||"99").localeCompare(String(b.time||"99")));
  const hasTpl=rows.some(r=>r.template);
  return `<div class="vh"><div><h2>Le jour J</h2><p>${wDate()?esc(fmtLong(wDate()))+" · le déroulé à partager avec les témoins et les prestataires.":"Le déroulé heure par heure, à partager avec les témoins et les prestataires."}</p></div>
    <button class="btn primary" data-new="schedule" ${S.canWrite?"":"disabled"}>Ajouter un moment</button></div>
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
      :`<button class="btn primary sm" data-act="accept" data-id="${s.id}" ${S.canWrite?"":"disabled"}>${SUGACT[s.type]||"Valider"}</button><button class="btn sm" data-act="dismiss" data-id="${s.id}" ${S.canWrite?"":"disabled"}>Ignorer</button>${s.threadUrl&&/^https:\/\/mail\.google\.com\//.test(s.threadUrl)?`<a class="btn ghost sm" href="${esc(s.threadUrl)}" target="_blank" rel="noopener">Ouvrir le mail</a>`:""}`}</div>
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
      <button class="btn" data-act="runnow" data-job="mail" ${S.canWrite?"":"disabled"}>Lire la boîte au prochain passage</button></div>
  </div>
  <div class="grid2">
    <section>
      <h3 class="sec">${ps.length?`À valider · ${ps.length}`:"Aperçu de ce que l'assistant proposera"}</h3>
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
        <p class="plan-when" style="margin:0">Lecture automatique : <b>${esc(planLabel("mail"))}</b>. <button type="button" class="btn ghost sm" data-go="reglages" style="padding:0 4px;min-height:0">Modifier dans Réglages</button></p>
        <div class="field"><span class="lab">Ce qu'il doit repérer</span><div class="checks">${Object.entries(SUGTYPE).map(([k,[l]])=>`<label><input type="checkbox" id="a-t-${k}" name="t-${k}" ${types[k]!==false?"checked":""} ${dis}> ${l}</label>`).join("")}</div></div>
        <div class="field"><label for="a-notes">Consignes particulières</label><textarea id="a-notes" name="consignes" placeholder="Ex. ignorer les newsletters, toujours attribuer les tenues à la bonne personne…" ${dis}>${esc(ag.consignes||"")}</textarea></div>
        <div><button class="btn primary" type="submit" ${dis}>Enregistrer</button></div>
      </form>
    </section>
  </div>`;
}
async function acceptSug(id){
  const s=S.inbox.find(x=>x.id===id);if(!s)return;
  const p=Object.assign({},s.payload||{});let ok=true;
  const stamp={source:"mail",sourceId:s.id};
  if(s.type==="vendor"||s.type==="quote"){
    const v=findVendor(p.name||p.vendorName);
    const data={name:p.name||p.vendorName||"Sans nom",cat:VCATS.includes(p.cat)?p.cat:"Autre",contact:p.contact||"",tel:p.tel||""};
    if(p.prix!=null)data.prix=num(p.prix);if(p.acompte!=null)data.acompte=num(p.acompte);if(p.dateAcompte)data.dateAcompte=p.dateAcompte;if(p.dateSolde)data.dateSolde=p.dateSolde;
    if(v){const upd={};Object.keys(data).forEach(k=>{if(data[k]!==""&&data[k]!=null)upd[k]=data[k]});if(s.type==="quote"&&VSTAT_RANK[v.status]<3)upd.status="devis";ok=await patch("vendors",v.id,upd)}
    else ok=await save("vendors",null,Object.assign({status:s.type==="quote"?"devis":"contacte",acomptePaye:false,note:s.summary||"",mailUrl:s.threadUrl||""},data,stamp));
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
  if(ok){await patch("inbox",id,{status:"accepted",decidedAt:Date.now()});toast("Ajouté")}
}

/* ---------- Settings ---------- */
function vReglages(){
  const s=S.settings,dis=S.canWrite?"":"disabled";
  return `<div class="vh"><div><h2>Réglages</h2><p>Les infos de base qui alimentent le compte à rebours, les échéances et le budget.</p></div></div>
  <form class="formpanel form" id="settings-form">
    <div class="cols2">
      <div class="field"><label for="s-date">Date du mariage</label><input type="date" id="s-date" name="date" value="${esc(s.date||"")}" ${dis}></div>
      <div class="field"><label for="s-budget">Budget total (€)</label><input type="number" inputmode="numeric" min="0" step="100" id="s-budget" name="budgetTotal" value="${esc(s.budgetTotal??"")}" ${dis}></div>
      <div class="field"><label for="s-lieu">Lieu de réception</label><input type="text" id="s-lieu" name="lieu" value="${esc(s.lieu||"")}" placeholder="Nom du domaine, de la salle…" ${dis}></div>
      <div class="field"><label for="s-ville">Ville</label><input type="text" id="s-ville" name="ville" value="${esc(s.ville||"")}" ${dis}></div>
      <div class="field"><label for="s-mairie">Mairie</label><input type="text" id="s-mairie" name="mairie" value="${esc(s.mairie||"")}" placeholder="Commune où le mariage est célébré" ${dis}></div>
      <div class="field"><label for="s-cible">Nombre d'invités visé</label><input type="number" inputmode="numeric" min="0" id="s-cible" name="invitesCible" value="${esc(s.invitesCible??"")}" ${dis}></div>
    </div>
    <div class="field"><label for="s-notes">Notes communes</label><textarea id="s-notes" name="notes" ${dis}>${esc(s.notes||"")}</textarea></div>
    <div><button class="btn primary" type="submit" ${dis}>Enregistrer</button></div>
  </form>
  <div style="margin-top:34px"><h3 class="sec" style="font-size:22px;font-family:var(--f-display)">Agents IA</h3>
    <p class="plan-when" style="margin:0 0 12px">Les agents vérifient toutes les 10 minutes (GitHub Actions) s'ils ont du travail et ne tournent que selon le planning ci-dessous. Un passage demandé démarre dans les 10 à 15 minutes.</p>
    <div class="plans">${planForm("mail")}${planForm("analyse")}</div></div>
  <div class="formpanel" style="margin-top:28px"><div class="panel-h" style="margin-bottom:6px"><h3>Compte</h3></div>
    <p class="plan-when" style="margin:0 0 12px">Connecté en tant que <b>${esc(S.user&&S.user.email||"")}</b>.</p>
    <button class="btn" type="button" data-act="logout">Se déconnecter</button></div>
  <div class="help" style="margin-top:28px">
    <h3 class="sec">Travailler à deux</h3>
    <ul>
      <li>Claire et Julien se connectent chacun avec leur propre compte (Google ou lien par e-mail) : les données sont les mêmes et se mettent à jour en direct sur vos deux téléphones.</li>
      <li>Chaque tâche a un responsable (Claire, Julien ou les deux). Le filtre du Planning montre ce qui revient à chacun, tâches communes comprises.</li>
      <li>Pour la mairie, retirez le dossier tôt : les pièces demandées (actes de naissance récents, justificatifs de domicile, liste des témoins) ont une durée de validité.</li>
    </ul>
  </div>`;
}

function emptyBlock(t,s){return `<div class="list"><div class="empty"><b>${esc(t)}</b>${esc(s)}</div></div>`}

/* ---------- Render ---------- */
const VIEWFN={apercu:vApercu,planning:vPlanning,agenda:vAgenda,budget:vBudget,invites:vInvites,tables:vTables,envies:vEnvies,prestataires:vPrestataires,"jour-j":vJourJ,assistant:vAssistant,reglages:vReglages};
function render(){
  renderHero();renderTabs();
  const main=document.getElementById("main");
  const ae=document.activeElement,aid=ae&&main.contains(ae)?ae.id:null,sel=aid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  if(aid&&aid!=="gq"&&(ae.tagName==="TEXTAREA"||(ae.tagName==="INPUT"&&/^(text|number|email|date|time|search)$/.test(ae.type)))){S.pending=true;return}
  S.pending=false;
  let pre="";
  document.body.classList.toggle("noauth",S.mode==="login"||S.mode==="locked");
  if(S.mode==="login"){setHTML(main,loginView());return}
  if(S.mode==="locked"){setHTML(main,`<div class="lock"><h2>Accès réservé</h2><p style="color:var(--muted);margin:0 0 16px">Cette app est réservée à Claire et Julien. Le compte <b>${esc(S.user&&S.user.email||"")}</b> n'est pas autorisé.</p><button class="btn" data-act="logout">Changer de compte</button></div>`);return}
  if(S.mode==="loading")pre=`<div class="banner">Chargement de vos données…</div>`;
  else if(S.mode==="offline")pre=`<div class="banner warn">Connexion à la base impossible. Vérifiez votre réseau puis rechargez la page.</div>`;
  if(S.mode==="live"&&S.stale)pre=`<div class="banner warn">Les données ne répondent pas pour l'instant. Ce qui s'affiche peut ne pas être à jour.</div>`;
  if(S.mode==="live"&&!S.canWrite)pre+=`<div class="banner">Vous consultez en lecture seule.</div>`;
  setHTML(main,pre+(VIEWFN[S.view]||vApercu)());
  if(aid){const el=document.getElementById(aid);if(el){el.focus();if(sel)try{el.setSelectionRange(sel[0],sel[1])}catch(e){}}}
}
function go(v){closeModal();if(!VIEWFN[v])v="apercu";S.view=v;if(location.hash!=="#"+v){try{history.replaceState(null,"","#"+v)}catch(e){}}render();window.scrollTo(0,0)}

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
    {k:"note",label:"Notes",type:"textarea"}]},
  schedule:{one:"le moment",fields:[
    {row:[{k:"time",label:"Heure",type:"time"},{k:"title",label:"Moment",type:"text",req:1}]},
    {row:[{k:"lieu",label:"Lieu",type:"text"},{k:"qui",label:"Qui est concerné",type:"text"}]},
    {k:"note",label:"Notes",type:"textarea"}]}
};
const flat=fs=>fs.flatMap(f=>f.row?f.row:[f]);
const defOf=f=>typeof f.def==="function"?f.def():f.def;

function fieldHTML(f,v){
  const id="m-"+f.k,dis=S.canWrite?"":"disabled",dv=v??defOf(f);
  if(f.type==="seg")return `<div class="field"><span class="lab">${f.label}</span><div class="seg" role="radiogroup">${f.options.map(([k,l])=>`<label><input type="radio" name="${f.k}" value="${k}" id="${id}-${k}" ${dv===k?"checked":""} ${dis}><span>${l}</span></label>`).join("")}</div></div>`;
  if(f.type==="select")return `<div class="field"><label for="${id}">${f.label}</label><select id="${id}" name="${f.k}" ${dis}>${f.options.map(([k,l])=>`<option value="${esc(k)}" ${dv===k?"selected":""}>${esc(l)}</option>`).join("")}</select></div>`;
  if(f.type==="textarea")return `<div class="field"><label for="${id}">${f.label}</label><textarea id="${id}" name="${f.k}" ${dis}>${esc(v||"")}</textarea></div>`;
  if(f.type==="check")return `<div class="field"><label class="toggle" style="color:var(--ink);font-weight:500;font-size:14px"><input type="checkbox" id="${id}" name="${f.k}" ${v?"checked":""} ${dis}> ${f.label}</label></div>`;
  if(f.type==="checks")return `<div class="field"><span class="lab">${f.label}</span><div class="checks">${f.options.map(([k,l])=>`<label><input type="checkbox" id="${id}-${k}" name="${k}" ${v&&v[k]===false?"":"checked"} ${dis}> ${l}</label>`).join("")}</div></div>`;
  const t=f.type==="number"?'type="number" inputmode="decimal" step="any" min="0"':`type="${f.type}"`;
  return `<div class="field"><label for="${id}">${f.label}</label><input ${t} id="${id}" name="${f.k}" value="${esc(v??"")}" ${f.req?"required":""} ${f.list?`list="${id}-l"`:""} ${dis}>${f.list?`<datalist id="${id}-l">${f.list.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>`:""}</div>`;
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
  const first=form.querySelector("input:not([type=radio]):not([type=checkbox]),select,textarea");if(first)first.focus();
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
    if(col==="budget"&&isNew&&out.order==null)out.order=S.budget.reduce((m,b)=>Math.max(m,b.order||0),0)+1;
    const btn=form.querySelector("button[type=submit]");btn.disabled=true;
    const ok=await save(col,id,out);
    if(ok){closeModal();toast(isNew?"Ajouté":"Enregistré")}else btn.disabled=false;
  });
  const del=form.querySelector('[data-act="del"]');
  if(del)del.addEventListener("click",async ev=>{
    ev.stopPropagation();
    if(!del.classList.contains("armed")){del.classList.add("armed");del.textContent="Confirmer la suppression";return}
    del.disabled=true;if(await remove(col,id)){closeModal();toast("Supprimé")}else del.disabled=false;
  });
}
function closeModal(){document.getElementById("layer").innerHTML=""}
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
    <div class="field"><label for="b-names">Un nom par ligne</label><textarea id="b-names" style="min-height:160px" placeholder="Marie Dupont&#10;Paul Dupont&#10;Léa Martin" required></textarea></div>
    <div class="field"><span class="lab">Côté</span><div class="seg" role="radiogroup">${Object.entries(SIDES).map(([k,l])=>`<label><input type="radio" name="side" value="${k}" ${k==="commun"?"checked":""}><span>${l}</span></label>`).join("")}</div></div>
    <div class="field"><label for="b-group">Groupe</label><input type="text" id="b-group" list="b-gl" placeholder="Famille, Amis…"><datalist id="b-gl">${GROUPS.map(g=>`<option value="${g}">`).join("")}</datalist></div>
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
  if(t.dataset.bgo){S.f.bcat=t.dataset.bgo;saveF();go("envies");return}
  if(t.dataset.bcat){S.f.bcat=t.dataset.bcat;saveF();render();const n=document.querySelector(".env");if(n&&n.getBoundingClientRect().top<0)n.scrollIntoView({behavior:"smooth"});return}
  if(t.dataset.bchip){if(!S.canWrite)return;const [c,q,type]=t.dataset.bchip.split("|"),o=t.dataset.o;const cur=Array.isArray(bGet(c,q).choix)?bGet(c,q).choix.slice():[];let next;if(type==="c")next=cur.includes(o)?[]:[o];else next=cur.includes(o)?cur.filter(x=>x!==o):cur.concat(o);t.setAttribute("aria-pressed",next.includes(o));await saveBrief(c,q,{choix:next});return}
  if(t.dataset.bimp){if(!S.canWrite)return;const [c,n]=t.dataset.bimp.split("|");await saveBrief(c,"_meta",{importance:+n});return}
  if(t.dataset.who){S.f.owner=t.dataset.who;S.f.hideDone=true;saveF();go("planning");return}
  if(t.dataset.new){if(S.canWrite)openEditor(t.dataset.new,null);return}
  if(t.dataset.edit){openEditor(t.dataset.edit,t.dataset.id);return}
  if(t.dataset.f){S.f[t.dataset.f]=t.dataset.v;saveF();if(t.dataset.f.startsWith("g")){renderInvitesPart()}else render();return}
  const a=t.dataset.act,id=t.dataset.id;
  if(a==="cycle"){if(!S.canWrite)return;const k=S.tasks.find(x=>x.id===id);if(!k)return;await patch("tasks",id,{status:k.status==="done"?"todo":"done"});return}
  if(a==="rsvp"){if(!S.canWrite)return;const g=S.guests.find(x=>x.id===id);if(!g)return;const order=["attente","oui","non"];await patch("guests",id,{rsvp:order[(order.indexOf(g.rsvp||"attente")+1)%3]});return}
  if(a==="unseat"){if(S.canWrite)await patch("guests",id,{table:""});return}
  if(a==="bulk"){if(S.canWrite)openBulk();return}
  if(a==="csv"){exportCSV();return}
  if(a==="accept"){if(S.canWrite){t.disabled=true;await acceptSug(id)}return}
  if(a==="dismiss"){if(S.canWrite&&await patch("inbox",id,{status:"dismissed",decidedAt:Date.now()}))toast("Ignoré");return}
  if(a==="restore"){if(S.canWrite)await patch("inbox",id,{status:"new"});return}
  if(a==="more"){openMore();return}
  if(a==="fire"){t.disabled=true;await fireAnalysis();t.disabled=false;return}
  if(a==="runnow"){t.disabled=true;await runNow(t.dataset.job);t.disabled=false;return}
  if(a==="editv"){openEditor("vendors",id);return}
  if(a==="logout"){await signOut();return}
  if(a==="google"){try{await signInGoogle()}catch(err){toast(authErr(err))}return}
});
function renderInvitesPart(){
  if(S.view!=="invites"){render();return}
  const gl=document.getElementById("guest-list");
  document.querySelectorAll('[data-f^="g"]').forEach(b=>b.setAttribute("aria-pressed",S.f[b.dataset.f]===b.dataset.v));
  if(gl){gl.innerHTML=guestRows();document.getElementById("main")._h=null}
}
document.addEventListener("input",e=>{if(e.target.id==="gq"){S.f.gq=e.target.value;renderInvitesPart()}});
document.addEventListener("change",async e=>{
  const el=e.target;
  if(el.id==="hide-done"){S.f.hideDone=el.checked;saveF();render();return}
  if(el.dataset.bq){const [c,q,fld]=el.dataset.bq.split("|");const val=fld==="desaccord"?el.checked:el.value.trim();if(fld!=="desaccord"&&(bGet(c,q)[fld]||"")===val)return;await saveBrief(c,q,{[fld]:val});if(fld==="desaccord")render();return}
  if(el.dataset.bm){const [c,fld]=el.dataset.bm.split("|");const val=fld==="budget"?(el.value===""?null:num(el.value)):el.value.trim();if((bMeta(c)[fld]??"")===(val??""))return;await saveBrief(c,"_meta",{[fld]:val});return}
});
document.addEventListener("focusout",()=>{setTimeout(()=>{if(S.pending&&!(document.activeElement&&/^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)&&document.getElementById("main").contains(document.activeElement)))render()},60)});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.fiche){e.preventDefault();openFiche(e.target.dataset.fiche)}});
document.addEventListener("submit",async e=>{
  const f=e.target;
  if(f.id==="settings-form"){
    e.preventDefault();
    const d={};["date","lieu","ville","mairie","notes"].forEach(k=>d[k]=f.elements[k].value.trim());
    ["budgetTotal","invitesCible"].forEach(k=>{const v=f.elements[k].value;d[k]=v===""?null:num(v)});
    if(await setDoc("meta/settings",S.settings,d)){document.activeElement&&document.activeElement.blur();toast("Réglages enregistrés");render()}
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
render();

let unsubs=[];
function stopListeners(){unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[]}
function boot(){
  completeEmailLink().catch(e=>toast(authErr(e)));
  auth.onAuthStateChanged(user=>{
    stopListeners();
    S.user=user;S.db=null;S.got=new Set();
    if(!user){S.mode="login";render();return}
    const email=String(user.email||"").toLowerCase();
    if(!ALLOWED.includes(email)){S.mode="locked";S.canWrite=false;render();return}
    S.canWrite=true;S.linkSent=null;S.db=db;S.mode="live";render();
    // includeMetadataChanges : sans lui, Firestore ne prévient pas quand le serveur confirme que la copie
    // locale est déjà à jour (rien n'a changé) ; on croyait alors la base injoignable (faux bandeau).
    const LIVE={includeMetadataChanges:true};
    const need=["settings","agent",...COLS];
    const timer=setTimeout(()=>{if(need.some(k=>!S.got.has(k))){S.stale=true;render()}},10000);
    const mark=(k,snap)=>{if(!snap.metadata.fromCache){S.got.add(k);if(need.every(x=>S.got.has(x))){clearTimeout(timer);S.stale=false}}};
    let raf=0;const later=()=>{if(raf||S.mode!=="live")return;const run=()=>{if(Date.now()-lastScroll<700){raf=setTimeout(run,250);return}raf=0;render()};raf=setTimeout(run,16)};
    const onErr=e=>{if(e&&e.code==="permission-denied"){S.mode="locked";S.canWrite=false;render();return}S.stale=true;later()};
    const meta=(id,key,track)=>unsubs.push(db.doc("meta/"+id).onSnapshot(LIVE,s=>{S[key]=s.exists?Object.assign({},s.data()):{};if(track)mark(key,s);later()},track?onErr:()=>{}));
    meta("settings","settings",true);meta("agent","agent",true);meta("profil","profil");meta("analyse","analyse");meta("planning","planning");
    COLS.forEach(c=>{
      unsubs.push(db.collection(c).onSnapshot(LIVE,s=>{S[c]=s.docs.map(d=>Object.assign({id:d.id},d.data()));mark(c,s);later()},onErr));
    });
  });
}
boot();
