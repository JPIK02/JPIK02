# Source unique du catalogue « Nos envies » (inventaire v1.3, docs/nos-envies-questions.md).
# Génère agents/lib/envies/catalogue.js (données, identifiants stables) et agents/lib/envies/fr.js (textes).
# Usage : python3 scripts/envies-spec.py   (depuis mariage-app/). Ne pas modifier les fichiers générés à la main.
# Une question : (niveau, format, id, libellé, sert à, choix, options)
#   niveau : E (l'essentiel), D (les détails), P (les questions d'un pro)
#   choix  : « A · B · C » ; curseur CU « Pôle 1 ↔ Pôle 2 » ; ceci ou cela CC « A / B » ; vide si aucun
#   options : FR (question propre à la France), arrivee=n, pp (par partenaire), secret, chFR=[libellés propres à la France]
import json, re, unicodedata, os

LANGUES = "Français · Anglais · Espagnol · Italien · Allemand · Portugais · Néerlandais · Arabe · Autre"

FAMILLES = [("coeur", "Le cœur"), ("table", "À table"), ("souvenirs", "Les souvenirs"), ("ambiance", "L'ambiance"),
            ("vous", "Vous deux"), ("invites", "Vos invités"), ("aide", "Se faire aider")]

# (clé, famille, remonte (mois avant le mariage ; 99 = dès l'arrivée), métiers rattachés, nom, pourquoi maintenant)
TUILES = [
 ("mariage", "coeur", 99, [], "Votre mariage", "Votre fil rouge guide tout le reste : style, priorités, ambiance."),
 ("lieu", "coeur", 24, ["Lieu"], "Lieu", "Le lieu fixe la date, la capacité et le budget : il se réserve en premier."),
 ("ceremonie", "coeur", 12, [], "Cérémonie", "Les cérémonies se préparent environ un an avant."),
 ("officiant", "coeur", 10, ["Officiant"], "Officiant", "Les officiants laïques se réservent environ 10 mois avant."),
 ("cocktail", "table", 10, ["Traiteur"], "Vin d'honneur", "Le vin d'honneur se construit avec le traiteur, environ 10 mois avant."),
 ("repas", "table", 10, ["Traiteur"], "Repas", "Les bons traiteurs se réservent environ 10 mois avant."),
 ("bar", "table", 8, ["Bar"], "Bar et boissons", "Les boissons se décident environ 8 mois avant, avec le traiteur ou le lieu."),
 ("gateau", "table", 6, ["Pâtissier"], "Gâteau et desserts", "Le gâteau se choisit environ 6 mois avant, après la dégustation."),
 ("photo", "souvenirs", 14, ["Photographe"], "Photo", "Les bons photographes se réservent environ 14 mois avant."),
 ("video", "souvenirs", 12, ["Vidéaste"], "Vidéo", "Les vidéastes se réservent environ un an avant."),
 ("musique", "ambiance", 12, ["Musique"], "Musique et soirée", "DJ et groupes se réservent environ un an avant."),
 ("fleurs", "ambiance", 9, ["Fleuriste"], "Fleurs et déco", "Les fleuristes se réservent environ 9 mois avant."),
 ("papeterie", "ambiance", 8, ["Papeterie"], "Papeterie", "Les faire-part partent environ 6 mois avant : on les prépare dès maintenant."),
 ("tenues", "vous", 12, ["Tenues", "Alliances"], "Tenues et alliances", "Une tenue se commande environ un an avant, retouches comprises."),
 ("beaute", "vous", 6, ["Coiffure & maquillage"], "Beauté et préparatifs", "Coiffure et maquillage se réservent environ 6 mois avant, essai compris."),
 ("voyage", "vous", 9, ["Agence de voyage"], "Voyage de noces", "Un voyage de noces se réserve environ 9 mois avant pour les bons prix."),
 ("invites", "invites", 8, ["Transport", "Hébergement", "Animation enfants"], "Enfants, logement, transport", "Logement et navettes se réservent environ 8 mois avant."),
 ("lendemain", "invites", 6, ["Traiteur"], "Le lendemain", "Le lendemain s'organise environ 6 mois avant."),
 ("planner", "aide", 20, ["Wedding planner"], "Wedding planner", "Un wedding planner se choisit tôt, environ 20 mois avant."),
]

Q = {
"mariage": [
 ("E","CP","style","Quel style vous ressemble ?","Tout le reste","Champêtre · Bohème · Élégant et chic · Château classique · Moderne et épuré · Guinguette festive · Intime · Grande fête",{"arrivee":1}),
 ("E","CL","paquet","Où voulez-vous mettre le paquet ?","Répartir le budget","Lieu · Repas · Musique · Fleurs et décor · Photo et vidéo · Effet de surprise",{"arrivee":5}),
 ("E","TL","recit","Le lendemain, qu'aimeriez-vous que vos invités racontent ?","Le fil rouge des briefs","",{"arrivee":7}),
 ("D","CM","duree","Sur combien de temps ?","Lieu, hébergement","Une journée · Un week-end · Un brunch le lendemain",{"arrivee":3}),
 ("D","TL","pasvoulu","Ce que vous ne voulez surtout pas","Écarter des prestataires","",{"arrivee":6}),
 ("D","CU","ambiance","L'ambiance générale","Ton des briefs","Solennel ↔ Décontracté",{}),
 ("D","JPA","moments","Moments forts","Déroulé du jour J","Discours de proches · Première danse · Surprise pour les invités · Feu d'artifice ou spectacle · Moment rien qu'à deux",{}),
 ("P","TL","traditions","Traditions familiales ou culturelles à faire vivre","Cérémonie, repas, musique","",{}),
 ("P","CM","langues","Langues parlées par les invités","Cérémonie, papeterie, animation",LANGUES,{}),
 ("P","TL","parfait","Ce qui vous ferait dire « c'était parfait »","Synthèse du coach","",{}),
],
"lieu": [
 ("E","CP","type","Quel type de lieu vous fait rêver ?","Cibler la recherche","Château · Domaine ou manoir · Ferme ou grange · Bord de mer · Lieu urbain · Jardin privé",{"arrivee":2}),
 ("E","CM","distance","Jusqu'où vos invités sont prêts à venir ?","Zone de recherche","Moins d'une heure · 1 à 3 heures · Destination lointaine",{}),
 ("E","CC","dedans","Dedans, dehors, ou les deux ?","Plan B météo","Dedans / Dehors",{}),
 ("D","CM","ensemble","Tout au même endroit ?","Logistique","Oui, tout sur place · Cérémonie ailleurs · Soirée ailleurs",{}),
 ("D","JPA","dormir","Qui dort sur place ?","Capacité de couchage","Les mariés · Les proches · Tous les invités",{}),
 ("D","JPA","exclusif","Le lieu rien que pour vous ce jour-là","Exclusivité","",{}),
 ("D","CU","imposes","Prestataires imposés par le lieu","Écarter des lieux","Ça nous va ↔ Liberté totale indispensable",{}),
 ("D","CU","caractere","Le caractère du lieu","Note de fit","Brut et authentique ↔ Raffiné et soigné",{}),
 ("P","CM","heure","Jusqu'à quelle heure faire la fête ?","Contraintes de son","Minuit · 2 h · 4 h · Sans limite",{}),
 ("P","CM","mobilite","Invités à mobilité réduite ou âgés","Accessibilité","Oui · Non",{}),
 ("P","JPA","tente","Une tente en cas de pluie","Plan B","",{}),
],
"ceremonie": [
 ("E","CM","types","Quelles cérémonies ?","Officiant, lieux","Civile (en mairie) · Religieuse · Laïque · Pas encore décidé",{}),
 ("E","CU","ambiance","Quelle ambiance ?","Brief officiant","Solennelle ↔ Légère et drôle",{}),
 ("E","CM","duree","Combien de temps ?","Déroulé","20 min · 45 min · Une heure ou plus",{}),
 ("D","CM","officie","Qui officie la cérémonie laïque ?","Active ou grise la tuile Officiant","Un officiant professionnel · Un proche · Nous deux",{}),
 ("D","JPA","vivre","Ce que vous voulez y vivre","Contenu","Lectures · Discours de proches · Vœux écrits par vous · Rituel symbolique · Musique live · Enfants d'honneur",{}),
 ("D","CM","entree","Votre entrée","Déroulé, musique","Accompagné(e) d'un parent · Ensemble · Chacun de son côté · Surprise",{}),
 ("D","JPA","sortie","La sortie","Déco, photo","Pétales · Bulles · Haie d'honneur · Musique entraînante",{}),
 ("P","CH","places","Places assises","Location de chaises","",{}),
 ("P","CM","micro","Micro pour l'officiant et les discours","Sonorisation","Oui · Non · À voir",{}),
 ("P","CM","redaction","Rédaction de la cérémonie","Brief officiant","L'officiant écrit · On co-écrit · On écrit tout",{}),
],
"officiant": [
 ("E","CC","qui","Qui voyez-vous officier ?","Type de prestataire","Un officiant professionnel / Un proche accompagné par un pro",{}),
 ("E","CU","ton","Le ton","Note de fit","Émouvant ↔ Plein d'humour",{}),
 ("E","JPA","histoire","Votre histoire racontée","Brief officiant","",{}),
 ("D","CM","rencontres","Rencontres de préparation","Devis","Une · Deux ou trois · Autant que nécessaire",{}),
 ("D","JPA","proches","Proches à faire intervenir","Déroulé","Lectures · Témoignages · Chanson · Surprise",{}),
 ("D","CP","rituel","Un rituel symbolique","Brief, matériel","Sable · Ruban · Arbre planté · Bougie · Aucun",{}),
 ("D","CM","langues","Langues de la cérémonie","Choix de l'officiant",LANGUES,{}),
 ("P","CH","discours","Durée de son discours","Déroulé","",{}),
 ("P","JPA","repetition","Répétition la veille","Planning","",{}),
 ("P","CM","son","Son et micro fournis","Comparaison des devis","Par l'officiant · Par le lieu · Par le DJ",{}),
],
"cocktail": [
 ("E","CM","invites","Qui est invité ?","Quantités","Tous les invités · Un cercle plus large que le dîner",{}),
 ("E","CM","duree","Combien de temps ?","Traiteur, animation","Une heure · Deux heures · Plus",{}),
 ("E","CC","ambiance","L'ambiance","Mobilier","Debout et animé / Coins salon posés",{}),
 ("D","CU","quantite","Quantité","Devis traiteur","Mise en bouche légère ↔ Copieux, presque un repas",{}),
 ("D","JPA","stands","Stands culinaires","Devis traiteur","Huîtres · Plancha · Fromages · Découpe · Bar à…",{}),
 ("D","JPA","animations","Animations","Prestataires annexes","Jeux d'extérieur · Photobooth · Musique live · Rien, on discute",{}),
 ("D","JPA","signature","Une boisson signature","Bar","",{}),
 ("P","CM","photos","Photos de groupe pendant le cocktail","Déroulé photographe","Oui · Non",{}),
 ("P","CM","ombre","Ombre ou chauffage selon la saison","Location","Oui · Non · À voir",{}),
],
"repas": [
 ("E","CM","format","Quel format ?","Type de traiteur","Assis, servi à l'assiette · Buffet · Grandes tablées · Food trucks · Cocktail dînatoire",{"arrivee":4}),
 ("E","CP","cuisine","Quelle cuisine ?","Cibler les traiteurs","Terroir · Gastronomique · Du monde · Street food · Végétale",{}),
 ("E","CC","plutot","Plutôt…","Note de fit","Raffiné / Généreux",{}),
 ("D","CM","regimes","Régimes à prévoir","Lien avec Invités","Végétarien · Sans gluten · Halal · Casher · Enfants",{}),
 ("D","JPA","local","Produits locaux et de saison","Note de fit","",{}),
 ("D","CU","rythme","Le rythme du repas","Déroulé","Enlevé, place à la fête ↔ On prend notre temps",{}),
 ("D","JPA","fromages","Plateau de fromages","Menu","",{"FR":1}),
 ("D","TL","plat","Un plat qui compte pour vous","Menu","",{}),
 ("P","CH","degustation","Dégustation : combien de personnes ?","Devis","",{}),
 ("P","CM","service","Vaisselle, nappage, service inclus ?","Comparaison des devis","Indispensable · Peut se louer à part",{}),
 ("P","CH","prestataires","Repas des prestataires (photographe, DJ…)","Devis","",{}),
],
"bar": [
 ("E","CU","ambiance","L'ambiance","Quantités","Sobre ↔ La fête jusqu'au bout",{}),
 ("E","JPA","boissons","Ce qu'on boit","Devis","Champagne · Vin · Bière · Cocktails · Sans alcool élaborés",{}),
 ("E","CC","fournisseur","Qui fournit ?","Droit de bouchon","Le traiteur / Nous-mêmes",{}),
 ("D","JPA","ouvert","Bar ouvert toute la soirée","Budget","",{}),
 ("D","JPA","barman","Un barman qui anime","Prestataire annexe","",{}),
 ("D","CM","vins","Choix des vins","Brief","Accords avec le repas · On choisit · Conseil d'un caviste",{}),
 ("D","JPA","cafe","Café et digestifs","Devis","",{}),
 ("P","CU","bouchon","Droit de bouchon acceptable","Comparaison des lieux","Non ↔ Oui, si raisonnable",{}),
 ("P","CM","reprise","Reprise des bouteilles non ouvertes","Contrat","Important · Indifférent",{}),
],
"gateau": [
 ("E","CP","forme","Quelle forme ?","Pâtissier ou traiteur","Pièce montée · Wedding cake · Buffet de desserts · Pas de gâteau",{"chFR":["Pièce montée"]}),
 ("E","CM","saveurs","Les saveurs qui vous font envie","Brief","Chocolat · Fruits · Vanille · Caramel · Agrumes",{}),
 ("E","CU","moment","Le moment du gâteau","Déroulé","Discret ↔ Spectacle",{}),
 ("D","CP","style","Le style du gâteau","Lien avec la déco","Épuré · Fleuri · Rustique · Spectaculaire",{}),
 ("D","JPA","nuit","Un en-cas de nuit","Devis","Crêpes · Bar à bonbons · Salé de minuit",{}),
 ("D","TL","recette","Une recette de famille","Brief","",{}),
 ("P","CM","chaleur","Chaleur et conservation","Faisabilité","Été · Extérieur · Aucune contrainte",{}),
 ("P","CH","parts","Nombre de parts","Devis","",{}),
],
"photo": [
 ("E","CC","style","Quel style ?","Cibler les photographes","Naturel, sur le vif / Posé, éditorial",{}),
 ("E","CC","lumiere","Quelle lumière ?","Note de fit","Lumineux, couleurs vives / Sombre, effet film",{}),
 ("E","CM","jusqua","Jusqu'à quand ?","Devis","Cérémonie seule · Jusqu'au repas · Jusqu'à la première danse · Toute la soirée",{}),
 ("D","CU","aise","Devant l'objectif, vous êtes…","Brief, choix du style","Très mal à l'aise ↔ Comme des poissons dans l'eau",{}),
 ("D","JPA","groupes","Photos de groupe","Déroulé","Famille proche · Tous les invités · Amis par groupe · Les enfants",{}),
 ("D","CM","seance","Séance photo à deux","Devis","Avant le mariage · Le jour même · Le lendemain · Non",{}),
 ("D","CM","livrables","Ce que vous voulez recevoir","Devis","Galerie en ligne · Album papier · Tirages",{}),
 ("P","TL","incontournables","Les photos à ne pas manquer","Liste pour le photographe","",{}),
 ("P","TL","personnes","Les personnes à ne pas oublier","Liste pour le photographe","",{}),
 ("P","CM","diffusion","Diffusion des photos par le photographe","Contrat","Oui · Avec notre accord · Non",{}),
],
"video": [
 ("E","JPA","envie","Une vidéo ?","Grise la tuile si « Jamais »","",{}),
 ("E","CM","format","Quel format ?","Devis","Clip de 3 min · Film de 15 à 20 min · Cérémonie complète · Formats réseaux sociaux",{}),
 ("E","CC","style","Quel style ?","Note de fit","Cinéma, émotion / Documentaire, brut",{}),
 ("D","JPA","garder","Ce qu'on garde","Brief","Discours en entier · Messages des invités · Images de drone · Son de la cérémonie",{}),
 ("D","CM","musique","Musique du film","Brief","Au choix du vidéaste · On choisit",{}),
 ("P","CM","delai","Délai de livraison acceptable","Comparaison","Un mois · Trois mois · Six mois",{}),
 ("P","JPA","equipe","Même équipe que la photo","Coordination","",{}),
],
"musique": [
 ("E","CP","genres","Quelle musique ?","Cibler les DJ et groupes","Années 80-90 · Électro · Rock · Chanson française · Latino · Jazz et soul · Musiques du monde",{}),
 ("E","CC","qui","Qui joue ?","Type de prestataire","DJ / Groupe live",{}),
 ("E","CU","energie","L'énergie","Note de fit","Ambiance lounge ↔ Piste pleine jusqu'à l'aube",{}),
 ("D","JPA","live","Musique live ailleurs","Devis","Cérémonie · Cocktail · Dîner",{}),
 ("D","JPA","ouverture","Ouverture du bal","Déroulé","Première danse · Danse chorégraphiée · Tout le monde d'un coup",{}),
 ("D","CU","animateur","L'animateur","Note de fit","Invisible ↔ Animateur au micro",{}),
 ("D","JPA","jeux","Jeux et animations","Brief","Jeux de soirée · Karaoké · Aucun",{}),
 ("P","TL","incontournables","Titres incontournables","Playlist","",{}),
 ("P","TL","interdits","Titres interdits","Playlist","",{}),
 ("P","CM","son","Son et lumières inclus","Comparaison des devis","Indispensable · Le lieu les fournit",{}),
],
"fleurs": [
 ("E","CP","couleurs","Vos couleurs","Tout le visuel","Blanc et vert sauge · Terracotta et sable · Bleu nuit et or · Rose poudré · Pastels · Couleurs vives · Noir et blanc",{}),
 ("E","CP","style","Style de fleurs","Cibler les fleuristes","Champêtre · Romantique · Épuré · Exotique · Fleurs séchées",{}),
 ("E","CU","dosage","Le dosage","Devis","Une touche discrète ↔ Immersion totale",{}),
 ("D","JPA","fleurir","Ce qu'il faut fleurir","Devis","Bouquet · Boutonnières · Arche de cérémonie · Centres de table · Voiture",{}),
 ("D","CC","centres","Centres de table","Brief","Bas, on se voit / Hauts, spectaculaires",{}),
 ("D","JPA","lumieres","Lumières","Location","Guirlandes · Bougies · Lustres · Néon",{}),
 ("D","CU","diy","Faire soi-même","Devis","Tout par un pro ↔ On adore bricoler",{}),
 ("P","JPA","saison","Fleurs de saison et locales","Note de fit","",{}),
 ("P","JPA","reutiliser","Réutiliser la déco de la cérémonie au dîner","Budget","",{}),
 ("P","CM","montage","Montage et démontage","Devis","Par le prestataire · Par nous et nos proches",{}),
],
"papeterie": [
 ("E","CP","style","Quel style ?","Cibler les graphistes","Classique · Illustré · Minimaliste · Botanique · Fantaisie",{}),
 ("E","CC","support","Papier ou numérique ?","Devis","Papier / Numérique",{}),
 ("E","CM","pieces","Les pièces","Devis","« Réservez la date » · Faire-part · Livret de cérémonie · Menus · Plan de table · Marque-places",{}),
 ("D","JPA","site","Un site de mariage","Prestataire ou outil","",{}),
 ("D","JPA","finitions","Finitions","Devis","Dorure · Papier recyclé · Cachet de cire · Illustration du lieu",{}),
 ("P","CH","quantite","Quantité de faire-part","Devis","",{}),
 ("P","CM","langues","Langues","Brief",LANGUES,{}),
],
"tenues": [
 ("E","CP","style","Le style de ta tenue","Cibler les boutiques","Classique · Bohème · Moderne · Rétro · Décalé",{"pp":1,"secret":1}),
 ("E","CM","ou","Où la trouver ?","Recherche","Sur-mesure · Créateur · Boutique · Seconde main · Location",{"pp":1,"secret":1}),
 ("E","CM","nombre","Une ou deux tenues ?","Budget","Une · Une pour la soirée en plus",{"pp":1,"secret":1}),
 ("D","CU","confort","Le confort","Brief","L'allure avant tout ↔ Je dois pouvoir danser",{"pp":1,"secret":1}),
 ("D","JPA","temoins","Tenues des témoins et enfants d'honneur","Brief","Assorties · Thème de couleur · Libres",{}),
 ("D","CM","code","Code vestimentaire des invités","Faire-part","Aucun · Couleur · Thème · Chic exigé",{}),
 ("D","CP","alliances","Les alliances","Recherche bijoutier","Classiques · Gravées · Assorties · Différentes",{}),
 ("P","CH","retouches","Retouches : marge avant le jour J","Planning","",{"pp":1,"secret":1}),
 ("P","CM","essayages","Qui t'accompagne aux essayages ?","Brief, rendez-vous","Personne · Un parent · Des amis · Un témoin",{"pp":1,"secret":1}),
],
"beaute": [
 ("E","CU","rendu","Le rendu","Cibler les professionnels","Très naturel ↔ Sophistiqué",{}),
 ("E","CM","qui","Qui se prépare avec un pro ?","Devis","Les mariés · Les témoins · Les mères · D'autres proches",{}),
 ("E","CM","ou","Où ?","Logistique","Sur le lieu · À la maison · À l'hôtel · En salon",{}),
 ("D","CP","coiffure","Coiffure","Brief","Attachée · Lâchée · Courte, coiffée · Accessoires",{}),
 ("D","JPA","essai","Un essai avant","Devis","",{}),
 ("D","JPA","retouches","Retouches pendant la journée","Devis","",{}),
 ("P","CU","ambiance","Ambiance des préparatifs","Déroulé, photo","Calme et seul(e) ↔ Entouré(e), en musique",{}),
 ("P","CH","fin","Heure de fin des préparatifs","Déroulé","",{}),
],
"voyage": [
 ("E","CP","type","Quel voyage ?","Cibler les agences, recherche","Plage · Nature et aventure · Villes · Road trip · Croisière · Pas tout de suite",{}),
 ("E","CM","quand","Quand ?","Planning","Juste après · Quelques mois après · Un an après",{}),
 ("E","CM","duree","Combien de temps ?","Budget","Une semaine · Deux semaines · Trois ou plus",{}),
 ("D","CU","rythme","Le rythme","Brief","Repos total ↔ On bouge tous les jours",{}),
 ("D","CP","dormir","Où dormir","Brief","Hôtel de charme · Villa · Lodge · Au fil de la route",{}),
 ("D","CM","distance","Jusqu'où partir","Recherche","Europe · Long-courrier · Peu importe",{}),
 ("D","JPA","liste","Liste de mariage « voyage »","Lien avec Invités","",{}),
 ("P","CM","papiers","Papiers à vérifier","Planning","Passeports à renouveler · Visa · Vaccins conseillés",{}),
 ("P","JPA","assurance","Assurance annulation","Devis","",{}),
 ("P","CC","agence","Agence ou en autonomie","Type de prestataire","Une agence s'occupe de tout / On organise nous-mêmes",{}),
],
"invites": [
 ("E","CM","enfants","Les enfants","Garde, menus","Tous invités · Ceux de la famille · Aucun",{}),
 ("E","CM","logement","Le logement des invités","Recherche","On s'en occupe · On propose des adresses · Chacun gère",{}),
 ("E","CM","transport","Le transport","Prestataire","Navettes · Covoiturage organisé · Chacun gère",{}),
 ("D","JPA","garde","Garde et animation des enfants","Prestataire","",{}),
 ("D","JPA","retour","Retour de nuit en sécurité","Prestataire","Navettes · Taxis réservés · Dormir sur place",{}),
 ("D","CU","table","Le plan de table","Plan de table","Par groupes qui se connaissent ↔ On mélange tout le monde",{}),
 ("D","JPA","cadeau","Un cadeau pour les invités","Budget","",{}),
 ("D","JPA","voiture","La voiture des mariés","Transport des mariés","Voiture de collection · Décapotable · Calèche · Voiture d'un proche",{}),
 ("P","CM","liste","Liste de mariage ou cagnotte","Faire-part","Liste · Cagnotte · Voyage · Rien",{}),
 ("P","TL","loin","Invités venant de loin à accueillir","Logistique","",{}),
],
"lendemain": [
 ("E","CM","format","Quel format ?","Traiteur","Brunch · Barbecue · Pique-nique · Rien",{}),
 ("E","CM","qui","Qui vient ?","Quantités","Tous les invités · Ceux qui dorment sur place · Les proches",{}),
 ("E","CU","ambiance","L'ambiance","Brief","Repos total ↔ On continue la fête",{}),
 ("D","CM","lieu","Même lieu","Lieu","Oui · Ailleurs",{}),
 ("D","JPA","activites","Activités","Brief","Baignade · Jeux · Balade · Rien",{}),
 ("P","JPA","traiteur","Même traiteur que la veille","Devis","",{}),
 ("P","CM","rangement","Rangement et état des lieux","Contrat","Par le lieu · Par nous",{}),
],
"planner": [
 ("E","JPA","accompagnement","Quel accompagnement ?","Type de prestataire ; tout « Jamais » grise la tuile","Organisation complète · Coordination du jour J · Conseils ponctuels",{}),
 ("E","CM","poids","Ce qui vous pèse le plus","Brief, note de fit","Trouver les prestataires · Tenir le budget · La logistique · Le jour J · Les familles",{}),
 ("E","CU","role","Son rôle","Note de fit","Il exécute nos choix ↔ Il décide avec nous",{}),
 ("D","CM","presence","Présence le jour J","Devis","Toute la journée · Jusqu'au dîner · Pas nécessaire",{}),
 ("D","CM","etapes","Points d'étape","Brief","Chaque semaine · Chaque mois · À la demande",{}),
 ("D","CC","contact","Contact avec les prestataires","Brief","Il gère tout / On garde la main",{}),
 ("D","JPA","inviter","L'inviter dans Lamaelle","Accès du planner à l'espace","",{}),
 ("P","CM","remuneration","Mode de rémunération","Comparaison des devis","Forfait · Pourcentage du budget · À comprendre",{}),
 ("P","CU","reseau","Son réseau de prestataires","Note de fit","On veut les nôtres ↔ On fait confiance à son réseau",{}),
 ("P","CH","equipe","Taille de l'équipe le jour J","Devis","",{}),
],
}

NIV = {"E": "essentiel", "D": "details", "P": "pro"}

def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "x"

def cut(s, sep):
    return [x.strip() for x in s.split(sep) if x.strip()] if s else []

cat_tuiles, cat_q, fr_q = [], [], {}
for i, (k, fam, rem, met, nom, pq) in enumerate(TUILES):
    cat_tuiles.append({"k": k, "famille": fam, "ordre": i, "remonte": rem, "metiers": met})
    counts = {"E": 0, "D": 0, "P": 0}
    for (n, f, qid, lab, sert, ch, opt) in Q[k]:
        counts[n] += 1
        qd = {"id": f"{k}.{qid}", "tuile": k, "niveau": NIV[n], "ordre": counts[n], "format": f}
        tx = {"libelle": lab, "sertA": sert}
        if f == "CU":
            a, b = cut(ch, "↔")
            tx["poles"] = [a, b]
            tx["crans"] = [a, "Plutôt " + a[0].lower() + a[1:], "Entre les deux", "Plutôt " + b[0].lower() + b[1:], b]
        else:
            labels = cut(ch, "/") if f == "CC" else cut(ch, "·")
            if labels:
                ids, seen = [], set()
                for l in labels:
                    cid = slug(l)
                    while cid in seen: cid += "-2"
                    seen.add(cid); ids.append(cid)
                qd["choix"] = [({"id": c, "pays": ["FR"]} if l in opt.get("chFR", []) else {"id": c}) for c, l in zip(ids, labels)]
                tx["choix"] = dict(zip(ids, labels))
        if opt.get("FR"): qd["pays"] = ["FR"]
        if opt.get("arrivee"): qd["arrivee"] = opt["arrivee"]
        if opt.get("pp"): qd["parPartenaire"] = True
        if opt.get("secret"): qd["secret"] = True
        cat_q.append(qd)
        fr_q[qd["id"]] = tx
    assert counts["E"] <= 3 and counts["D"] <= 5 and counts["P"] <= 4, (k, counts)

METIERS_MULTIPLES = ["Hébergement", "Transport", "Coiffure & maquillage"]
# Nom d'une tuile hors de France (le texte d'interface ne porte jamais de mention de pays)
NOM_HORS_FR = {"cocktail": {"nomHorsFR": "Cocktail"}}
fr = {
 "familles": dict(FAMILLES),
 "tuiles": {k: {"nom": nom, "pourquoi": pq, **NOM_HORS_FR.get(k, {})} for (k, fam, rem, met, nom, pq) in TUILES},
 "niveaux": {
  "essentiel": {"nom": "L'essentiel", "phrase": "Trois questions pour orienter la recherche et noter les prestataires."},
  "details": {"nom": "Les détails", "phrase": "De quoi rédiger le brief à envoyer aux prestataires."},
  "pro": {"nom": "Les questions d'un pro", "phrase": "Pour préparer le rendez-vous avec le prestataire."}},
 "jpa": {"j": "Jamais", "p": "Pourquoi pas", "a": "Absolument"},
 "cc": {"lesDeux": "Les deux"},
 "cu": {"differents": "Nous ne sommes pas pareils", "nsp": "Aucune idée"},
 "etats": {"decouvrir": "À découvrir", "esquissee": "Esquissée", "brief": "Brief prêt", "complet": "Brief prêt · complet",
           "moment": "C'est le moment", "gris": "Pas pour nous", "chacun": "Chacun la sienne", "enCours": "En cours"},
 "questions": fr_q,
}

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "agents", "lib", "envies")
os.makedirs(out, exist_ok=True)
head = "// Fichier généré par scripts/envies-spec.py : ne pas modifier à la main.\n"
with open(os.path.join(out, "catalogue.js"), "w") as f:
    f.write(head + "// Catalogue « Nos envies » v1.3 : 19 tuiles, questions par niveau, identifiants stables (données, sans texte).\n")
    f.write("export const FAMILLES = " + json.dumps([k for k, _ in FAMILLES], ensure_ascii=False) + ";\n")
    f.write("export const NIVEAUX = [\"essentiel\", \"details\", \"pro\"];\n")
    f.write("// Métiers où l'on peut réserver plusieurs prestataires (docs/prestataires-v1.md, 6.1)\n")
    f.write("export const METIERS_MULTIPLES = " + json.dumps(METIERS_MULTIPLES, ensure_ascii=False) + ";\n")
    f.write("export const TUILES = " + json.dumps(cat_tuiles, ensure_ascii=False, indent=1) + ";\n")
    f.write("export const QUESTIONS = " + json.dumps(cat_q, ensure_ascii=False, indent=1) + ";\n")
with open(os.path.join(out, "fr.js"), "w") as f:
    f.write(head + "// Textes français de « Nos envies » (questions, choix, « Sert à », tuiles, niveaux). Une langue = un fichier.\n")
    f.write("export const FR = " + json.dumps(fr, ensure_ascii=False, indent=1) + ";\n")
print(len(cat_tuiles), "tuiles,", len(cat_q), "questions,", sum(1 for q in cat_q if q["niveau"] == "essentiel"), "essentielles")
