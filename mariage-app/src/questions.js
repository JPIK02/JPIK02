// Questionnaire « Nos envies » : partagé par l'app (src/app.js) et l'assistant IA (functions/, copié au déploiement).
// [id, type t=texte libre | m=choix multiples | c=choix unique, question, options]
export const QCATS=[
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
