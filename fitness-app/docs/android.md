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
| Hors ligne | Le client Supabase garde lui-même ses lectures (`src/lib/restCache.ts`), comme le service worker du site : réseau d'abord, la copie après 4 s ou sans réseau, 200 réponses, 7 jours, une copie par compte. Voir « Séance hors ligne » plus bas. |
| Bouton retour | Ferme d'abord la fenêtre ouverte ; sur un accueil, met l'app en arrière-plan ; ailleurs, écran précédent (`src/lib/nativeBack.ts`). |
| Barres système | Bord à bord : la page passe sous les barres et s'en écarte avec `--safe-top` / `--safe-bottom`. Capacitor les remplit (`--safe-area-inset-*`) ; sur les WebView d'avant Chromium 140, il décale plutôt la page lui-même. Icônes claires ou foncées selon le thème de l'app. |
| Démarrage | Logo sur le fond de l'app (clair ou sombre comme le téléphone), retiré au premier rendu. |
| Apple / Google | Masqués : ils refusent la connexion dans une page intégrée. Reviennent avec l'unité A2. |
| Notifications | Firebase Cloud Messaging au lieu des notifications web (absentes d'un WebView) : voir « Notifications » plus bas. Sans `google-services.json` à la construction, les réglages annoncent qu'elles arrivent dans une prochaine version. |
| Sauvegarde Android | Désactivée (`allowBackup="false"`) : les jetons de session ne partent pas dans les sauvegardes Google. |

## Séance hors ligne (A5)

Au sous-sol d'une box, le réseau tombe. Sur le site comme dans l'app :

- **Séances programmées** : la dernière liste lue est gardée par compte et
  refiltrée pour le jour où on l'ouvre (`fetchUpcoming`, `visibleUpcoming`).
- **Contenu des WODs** : mouvements, séries, charges, repos et format du chrono
  de chaque séance pas encore faite des 7 prochains jours sont lus à l'avance
  dès que la liste arrive (`src/lib/sessionPack.ts`), puis à chaque séance. Au
  lancement, le contenu gardé s'affiche tout de suite et le réseau le met à jour
  s'il répond.
- **Garde des routes** : la dernière réponse sur le rôle et l'administration
  sert si le réseau manque (affichage seulement : la base décide toujours).
- **Pas d'attente** : supabase-js réessaie trois fois (1 s, 2 s, 4 s) une
  lecture qui échoue ; quand une copie existe, ces lectures ne réessaient pas.
- **Séance terminée** : file d'attente déjà en place (`sessionUpload.ts`),
  envoyée au retour du réseau, dans les 12 h.
- **Déconnexion** : tout le hors-ligne est effacé (`clearOffline`,
  `clearRestCache`), sauf les séances pas encore envoyées.

Limite : les photos d'exercices ne sont pas gardées dans l'app (le service worker
du site les garde) ; un WOD jamais ouvert ni programmé n'a pas de contenu hors
ligne, et la séance le dit.

## Liens qui ouvrent l'app (A3)

Invitation à un cours (`/join/…`) ou à un centre (`/rejoindre/…`), lien de
communauté (`/communities/…`) et QR de présence (`/presence/…`) : sur un
téléphone qui a l'app, Android les ouvre **dans l'app**, sur la même page et
avec sa session ; sans l'app, le site s'ouvre comme avant.

- **Android** : filtre d'intention `autoVerify` dans `AndroidManifest.xml` ; le
  domaine vient de `appLinksHost` (`android/app/build.gradle`), le même que
  `PUBLIC_SITE_URL` (`src/lib/publicUrl.ts`).
- **Site** : `public/.well-known/assetlinks.json` prouve que le site et l'app
  vont ensemble. Android le lit à l'installation de l'app : il doit être **en
  ligne sur le site de production**, donc sur `main`. Il contient l'empreinte
  SHA-256 de la clé qui signe l'app : pour l'instant la clé de développement de
  l'ordinateur de Thomas (`gradlew signingReport`) ; à la publication, ajouter
  celle de Google Play (Play Console → Intégrité de l'app → Signature).
- **App** : `appUrlOpen` (Capacitor) → `inAppPath` (`src/lib/nativeLinks.ts`)
  n'accepte que les liens https du site (ou de wodbud.com plus tard) et ouvre la
  page ; aussi au démarrage de l'app par un lien.
- **wodbud.com** : le jour où il est branché, l'ajouter à `appLinksHost` (une
  deuxième balise `<data android:host>`) ; le fichier y sera servi pareil.

Vérifier sur un téléphone : `adb shell pm get-app-links com.wodbud.app`
(« verified » pour le domaine). Pour essayer avant que le fichier soit en
ligne : `adb shell pm set-app-links-user-selection --user cur --package
com.wodbud.app true <domaine>`, puis
`adb shell am start -a android.intent.action.VIEW -d "https://<domaine>/join/<code>"`.

## Notifications (A4)

Les mêmes messages que les notifications web (vote ouvert, séance programmée,
rappel du matin, invitation, exercice publié, nouveautés), envoyés par la
fonction Edge `push` :

- **Inscription** : dans les réglages, « Activer » demande la permission
  (Android 13+), crée le canal « WODBUD », obtient le jeton Firebase et
  l'enregistre par `register_device_token` (migration 073, `device_tokens`).
  Le compte connecté sur le téléphone devient propriétaire du jeton ; 10
  appareils au plus par compte. Le jeton est réinscrit à chaque ouverture
  (Firebase le renouvelle parfois) et retiré à la déconnexion.
- **Envoi** : `supabase/functions/push/fcm.ts` (API HTTP v1, compte de service,
  jeton OAuth gardé une heure), testé par `fcm.test.ts`. Un jeton que FCM
  déclare périmé est supprimé.
- **Affichage** : app fermée ou en arrière-plan, Android affiche la
  notification (petite icône blanche `ic_stat_wodbud`, couleur de la marque) ;
  la toucher ouvre sa page. App ouverte, une bannière en haut de l'écran
  (`NativePushBanner`) la montre 6 s.

**À faire une fois (Thomas)** :

1. Créer un projet sur https://console.firebase.google.com (gratuit), y ajouter
   une app Android avec le nom de package `com.wodbud.app`.
2. Télécharger `google-services.json` et le poser dans
   `fitness-app/android/app/` (ignoré par git : il ne va pas dans le dépôt
   public). La construction suivante active les notifications.
3. Paramètres du projet → Comptes de service → « Générer une nouvelle clé
   privée » : un fichier JSON. Le coller tel quel comme secret
   `FCM_SERVICE_ACCOUNT` des fonctions Edge (tableau de bord Supabase → Edge
   Functions → Secrets), d'abord en préproduction, puis en production. Ne pas
   le mettre dans le dépôt ni l'envoyer par courriel.

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
- **A6** Version signée et fiche Google Play, test fermé avec le gym.
