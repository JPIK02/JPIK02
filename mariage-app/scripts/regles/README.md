# Test des règles Firestore (tenue secrète)

Vérifie dans l'émulateur que l'espace privé de chacun (`prive/<claire|julien>/…`) et sa conversation avec le coach
(`chats/<e-mail>`) sont fermés à l'autre, et que l'espace commun reste ouvert au couple. Il faut Java.

```
cd scripts/regles
npm i --no-save @firebase/rules-unit-testing@3 firebase@10 firebase-tools@15.34.1
python3 prepare.py        # copie des règles avec des adresses de test (test.rules, à ne pas committer)
npx firebase emulators:exec --only firestore --project demo-lamaelle "node regles.test.mjs"
```
p1@test.fr est le compte de Julien (premier de la liste), p2 et p3 ceux de Claire.
