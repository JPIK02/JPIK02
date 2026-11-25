# Lamaelle — Invités v1.1 : correctif du lien invité

Version du 24 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce correctif modifie `docs/invites-v1.md`, **section 4** (le lien pour les adresses). Tout le reste du dossier est inchangé. Enregistre-le dans `docs/invites-v1.1.md`, mets à jour `docs/invites-v1.md` (section 4) et `CLAUDE.md`.

## 1. Le problème

Le formulaire actuel demande l'adresse **et les régimes alimentaires** dans le même écran. Les invités n'ont pas encore reçu de faire-part : on leur demande ce qu'ils mangent avant même de les avoir invités. C'est trop tôt, et ça gâche la surprise du faire-part.

## 2. La règle

**Un seul lien par foyer, dont le contenu change selon le moment** (section 2 de `docs/invites-v1.md`) :

| Moment du foyer | Ce que le lien demande |
|---|---|
| Sur la liste, save-the-date envoyé | **Adresse postale** (obligatoire), e-mail et téléphone (facultatifs). Rien d'autre. |
| Faire-part envoyé | **La réponse** : qui vient, à quels moments (ceux auxquels le foyer est invité), puis les **régimes et allergies** de chaque personne qui vient. L'adresse reste modifiable en bas, repliée. |

- Le moment du lien suit l'étape de suivi du foyer : il bascule automatiquement quand le couple marque le faire-part envoyé.
- Le même lien et le même jeton servent aux deux moments : les invités n'ont pas à en garder deux.

## 3. Écran « adresse » (avant le faire-part)

1. En-tête : « LE MARIAGE DE [PRÉNOMS] », « Bonjour [nom du foyer] ! », phrase « Pour vous envoyer notre faire-part, pouvez-vous nous indiquer votre adresse ? Cela prend une minute. »
2. Champs : adresse postale, e-mail (facultatif), téléphone (facultatif).
3. Bouton « Envoyer ».
4. Confirmation : « Merci ! C'est noté, [prénoms] vous remercient. Vous pouvez revenir modifier vos informations avec ce même lien. »
5. Mention courte sur les données personnelles (inchangée).

**Retirer** de cet écran le bloc « Régimes et allergies » et toute question sur la présence ou les moments.

## 4. Écran « réponse » (après le faire-part)

Livré avec le **lot 3** de `docs/invites-v1.md` (les réponses), pas avant.

1. En-tête : « Bonjour [nom du foyer] ! », date limite de réponse.
2. Pour chaque personne du foyer : vient / ne vient pas, puis les moments auxquels le foyer est invité (cases).
3. Ensuite seulement, pour chaque personne qui vient : régime ou allergie (facultatif, champ court, exemples : végétarien, sans gluten, allergie).
4. Un accompagnant « +1 » sans nom : champ prénom.
5. Confirmation, et possibilité de modifier jusqu'à la date limite.
6. Les réponses arrivent dans la page Invités (moment 2) et le récapitulatif traiteur, sans proposition à valider : c'est l'invité lui-même qui répond.

## 5. Données déjà saisies

Si des régimes ont déjà été saisis par des invités avec le formulaire actuel, **les garder**, rattachés aux personnes. Le formulaire « réponse » les affichera préremplis.

## 6. Critères d'acceptation

- Avant l'envoi du faire-part, le lien ne montre que l'adresse, l'e-mail et le téléphone.
- Après l'envoi du faire-part, le même lien montre la réponse, puis les régimes des personnes qui viennent.
- Aucun régime déjà saisi n'est perdu.
- Écriture toujours via la fonction serveur ; le jeton ne donne accès qu'à son foyer.
