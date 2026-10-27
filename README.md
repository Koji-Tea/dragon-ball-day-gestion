# Dragon Ball Day – Gestion

Application de gestion de la convention Dragon Ball Day (association Dragon Ball Day, www.dragonballdays.ch) : éditions, tâches, contacts, et bientôt invités, logement, transport, artistes, sponsors, partenaires, programme, fournisseurs, bénévoles, membres, comptabilité et billetterie Infomaniak.

Construite sur la même base que [Koji Tea – Gestion](https://github.com/Koji-Tea/koji-tea-gestion) : une application web installable (PWA), sans serveur, qui fonctionne aussi hors connexion.

- **En ligne :** https://gestion.dragonballdays.ch (GitHub Pages depuis la branche `main`, comme Koji Tea ; le domaine reste chez Infomaniak avec un enregistrement CNAME `gestion` → `koji-tea.github.io`).
- **Données :** Firebase (Firestore + Authentication), projet séparé de Koji Tea.
- **Mode essai :** tant que `firebase-config.js` vaut `null`, tout reste dans le navigateur. Pratique pour découvrir l’app.

## Rôles

| Rôle | Ce qu’il peut faire |
| --- | --- |
| Administrateur·rice | Tout, y compris l’équipe et les réglages |
| Comité | Tous les modules, sans la gestion de l’équipe |
| Trésorier·ère | Consulte tout, gère ses tâches (et la comptabilité à l’étape 3) |
| Responsable de pôle | Consulte tout, gère les modules qui lui sont confiés |
| Bénévole | Voit l’édition (et son planning à l’étape 4) |

Le **premier compte qui se connecte devient administrateur**. Ensuite, l’admin ajoute l’équipe depuis Réglages > Équipe et rôles : la personne reçoit un e-mail pour choisir son mot de passe. Les droits sont vérifiés par la base elle-même (`firestore.rules`), pas seulement par l’interface.

## Organisation du code

```
index.html            la page (connexion + coque)
css/app.css           les couleurs du logo et la mise en page
js/outils.js          petits outils, icônes, boules de cristal, personnages
js/donnees.js         rôles, droits, stockage Firebase / local, équipe
js/modules.js         moteur de modules : un module = une liste de champs
js/vues/*.js          un fichier par écran (accueil, tâches, contacts, éditions, réglages)
js/app.js             navigation et actions
firestore.rules       règles d’accès (à garder d’accord avec js/donnees.js)
sw.js                 hors connexion (changer la version à chaque mise en ligne)
tools/                préparation des images
```

Ajouter un module : le décrire avec `defineMod({...})` (voir `js/vues/contacts.js`), ajouter sa collection dans `COLS` (`js/donnees.js`) et dans `firestore.rules`, puis une entrée dans `NAV` (`js/app.js`) et dans `sw.js`.

## Mettre en ligne

Chaque fusion dans `main` est publiée automatiquement par GitHub Pages (le fichier `CNAME` donne l’adresse). Penser à changer la version dans `sw.js` pour que les téléphones prennent la nouvelle version.

Une seule fois : mettre la configuration Firebase dans `firebase-config.js` et copier `firestore.rules` dans Console Firebase > Firestore Database > Règles, puis Publier.

## Images

Les personnages sont dessinés par Lolo. Pour les régénérer depuis les originaux : `python3 tools/preparer_images.py DOSSIER_DES_ORIGINAUX` (nécessite Pillow).
