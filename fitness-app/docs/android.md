# App Android (Capacitor)

L'app des boutiques est **la même app que le site**, emballée avec Capacitor 8 :
le site construit (`dist/`) est copié dans le projet Android (`android/`) et servi
depuis le téléphone (`https://localhost`). Android 7 (API 24) à Android 16 ;
cible API 36, comme Google Play l'exige.

Identifiant : **`com.wodbud.app`**. Il devient définitif à la première
publication sur Google Play.

## Prérequis

- **JDK 21** (`JAVA_HOME`) et le **SDK Android** (`ANDROID_HOME`) ; Android
  Studio les installe, avec l'émulateur.
- Node 22 ou plus (exigé par Capacitor).

## Commandes

```bash
npm run android -- build      # construit le site et le recopie dans android/ (cap sync)
npm run android -- apk        # + APK de développement
npm run android -- run        # + l'installe et l'ouvre (téléphone branché ou émulateur)
npm run android -- emulator   # démarre le premier émulateur (--avd <nom> pour un autre)
npm run android -- open       # ouvre le projet dans Android Studio
npm run android -- assets     # icônes et écrans de démarrage, tirés du logo
```

Par défaut l'app parle à la **production**. Avec `--staging`, elle parle à la
préproduction (`.env.staging.local`, voir [preproduction.md](preproduction.md)) :
c'est le choix pour essayer sans toucher aux vraies données. Les erreurs de l'app
arrivent dans le suivi des erreurs avec la version `android-<commit>`.

L'APK de développement est dans
`android/app/build/outputs/apk/debug/app-debug.apk`. Pour l'essayer sur un
téléphone : débogage USB et `npm run android -- run`, ou copier l'APK sur le
téléphone et l'ouvrir (autoriser l'installation depuis cette source).

**Inspecter la page** (versions de développement seulement) : `chrome://inspect`
dans Chrome, téléphone ou émulateur branché.

**Émulateur sous Windows.** Si l'émulateur se ferme au démarrage (« WHPX:
Unexpected VP exit code 4 »), le démarrer à froid avec le rendu logiciel :
`emulator -avd <nom> -no-snapshot -gpu swiftshader_indirect`.

## Ce qui change dans l'app

| Sujet | Dans l'app des boutiques |
|---|---|
| Landing | Absente : l'app ouvre la connexion ou le compte (`WebOnlyLanding`). |
| Liens partagés | Invitations, QR de présence, rang partagé, communautés et retour des courriels pointent vers l'adresse publique du site (`src/lib/publicUrl.ts`), jamais vers `https://localhost`. À passer à `https://wodbud.com` quand le domaine sera branché. |
| Service worker | Aucun : les fichiers sont déjà sur le téléphone, et il servirait l'ancienne version après une mise à jour. |
| Bouton retour | Ferme d'abord la fenêtre ouverte ; sur un accueil, met l'app en arrière-plan ; ailleurs, écran précédent (`src/lib/nativeBack.ts`). |
| Barres système | Bord à bord : la page passe sous les barres et s'en écarte avec `--safe-top` / `--safe-bottom`. Capacitor les remplit (`--safe-area-inset-*`) ; sur les WebView d'avant Chromium 140, il décale plutôt la page lui-même. Icônes claires ou foncées selon le thème de l'app. |
| Démarrage | Logo sur le fond de l'app (clair ou sombre comme le téléphone), retiré au premier rendu. |
| Apple / Google | Masqués : ils refusent la connexion dans une page intégrée. Reviennent avec l'unité A2. |
| Notifications | Les notifications web n'existent pas dans un WebView : les réglages annoncent qu'elles arrivent dans une prochaine version (unité A4). |
| Sauvegarde Android | Désactivée (`allowBackup="false"`) : les jetons de session ne partent pas dans les sauvegardes Google. |

## Icônes et démarrage

`npm run android -- assets` dessine les sources dans `assets/` à partir du logo
(`scripts/android-assets.mjs`) puis les décline à toutes les densités avec
`@capacitor/assets`. **Logo provisoire** (le W du favicon) : quand le nouveau logo
sera choisi, changer `MARK` et les couleurs du script, relancer, et construire.

## Publication sur Google Play (à venir)

1. **Compte Google Play Console** (25 $ US, une fois). Un compte *personnel*
   doit faire tester l'app par 12 personnes pendant 14 jours de suite avant la
   production ; un compte *d'entreprise* (numéro D-U-N-S) en est exempté.
2. **Clé de signature** : la créer une fois (`keytool -genkey …`), la garder hors
   du dépôt **et** sauvegardée ailleurs ; `*.jks`, `*.keystore` et
   `keystore.properties` sont ignorés par git. Google Play garde la clé finale
   (Play App Signing) ; la nôtre ne sert qu'à envoyer les versions.
3. **Version de publication** : `bundleRelease` (fichier `.aab`), `versionCode`
   augmenté à chaque envoi (`android/app/build.gradle`).
4. **Fiche** : icône 512 × 512, captures, description, politique de
   confidentialité (blocs « [À COMPLÉTER] » à remplir), formulaire de sécurité
   des données, lien de suppression de compte (déjà dans l'app).

## Suite prévue

- **A2** Apple et Google : navigateur du système, puis retour dans l'app
  (adresse de retour à ajouter à Supabase Auth : préproduction d'abord).
- **A3** Liens d'invitation et QR qui ouvrent l'app (App Links : fichier
  `assetlinks.json` publié sur le site, empreinte de la clé de signature).
- **A4** Notifications natives (projet Firebase à créer, jetons d'appareil,
  envoi par la fonction `push`).
- **A5** Séance hors ligne : garder sur le téléphone les données qu'utilisait le
  service worker (bibliothèque, WODs, records).
- **A6** Version signée et fiche Google Play, test fermé avec le gym.
