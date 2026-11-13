# Feuille de route — après la rencontre client (novembre 2026)

Priorité du client : **le côté centres (business)**, puisque ce sont eux qui paient.
Fil conducteur : *WODBUD, c'est comme avoir un entraîneur chef* — pour le centre comme pour ses entraîneurs.

## Décisions prises

### Profils et rôles
- Trois profils : **centre**, **membre d'un centre**, **perso**. Ils remplacent coach / athlète à l'écran Bienvenue (le rôle n'est demandé qu'à l'inscription).
- Rôles dans un centre :
  - **proprio-chef** : le créateur du centre, avec tous les droits (gestion et programmation) ;
  - **entraîneur chef** : nommé par le proprio, crée des exercices et programme ;
  - **entraîneur** : donne les cours et suit ses membres ;
  - **membre**.
- Les entraîneurs ne s'inscrivent pas seuls : leur centre les invite avec leur rôle.

### Équipement
- Demandé à la création de **tous** les comptes : l'inventaire du centre, ou ce qu'on a à la maison en perso. Modifiable dans les réglages.
- Sert à filtrer et à proposer en priorité les exercices faisables avec l'équipement disponible.

### Base d'exercices
- L'entraîneur chef crée un exercice : il est **utilisable tout de suite dans son centre**.
- L'équipe WODBUD le relit (nom, muscles, consignes), **peut le corriger**, puis le publie dans la base commune.
- **L'auteur est notifié** quand son exercice est ajouté à la base commune.
- Champs obligatoires : muscles et équipement, points techniques, niveau.
  - Pas d'erreurs fréquentes ni de précautions.
  - La vidéo officielle est ajoutée par WODBUD.
- **Vidéos explicatives : WODBUD seulement.**
- Le chef joint une **photo ou une vidéo de référence** (60 s max, filmée au téléphone) :
  - aucun lien, pour la sécurité ;
  - privée : seule l'équipe WODBUD la voit pendant la validation ;
  - compressée en 720p dans l'app avant l'envoi, stockée dans R2 ;
  - supprimable après la validation.
  - Coût estimé : ~20 Mo par vidéo, donc 1 000 vidéos ≈ 20 Go ≈ 0,15 $ US par mois au-delà des 10 Go gratuits. Grille de prix à revérifier chez Cloudflare.
- **Doublons** : à la création comme à l'import, l'app détecte les noms semblables (« Squat bulgare » / « Bulgarian split squat ») et propose de relier à l'exercice existant.
- **Notifier les utilisateurs** lors des mises à jour importantes de la base (ex. nouvelles vidéos).

### Import par les centres
- L'admin ou le chef importe ses exercices en **CSV, PDF ou photos**.
- L'app relie ce qui existe déjà et crée le reste dans son centre.
- Chaque occurrence est comptée : l'exercice qui revient le plus souvent passe en tête de la **liste des vidéos à tourner** par WODBUD.

### Progression / régression
- Les exercices sont reliés entre eux : variante plus dure, variante plus facile, adaptations.
- L'entraîneur chef trouve un exercice trop facile ou inadapté et choisit :
  - **progression** : +5 % de charge (haut du corps) ou +10 % (bas du corps), ou une variante plus dure ;
  - **régression / adaptation** : selon la zone (épaule, genou, dos…), l'app propose des exercices qui la sollicitent moins.

### Engagement
- **Suggestions** : les membres écrivent à leur centre ; tout le monde peut écrire au **support WODBUD** depuis les réglages.
- **Invitations** :
  - le bouton Inviter ouvre le partage natif (Messages, WhatsApp…) avec le lien prérempli ;
  - si la personne a déjà WODBUD, elle reçoit une notification push.
- **Votes** : ajouter la **note de l'entraînement** après une séance, pour que le centre voie les WODs préférés.
- **Avatar de l'IA** : 6 à 8 avatars dans le style « Forge », et un ton au choix (motivant, calme, militaire, humoristique).

### Landing
- Une **première page demande le profil**, puis **trois pages séparées** (ex. `/centres`, `/membres`, `/perso`), plus faciles à référencer et à cibler en publicité.
- Après « Fini le bricolage. » : une phrase sur le **gain de temps et les maux de tête en moins**.
- Mettre davantage en avant les avantages de WODBUD, avec des **animations premium**.

## Plan proposé (le côté centres d'abord)

1. ✅ **Centres et rôles** (fait : migration 048) : modèle de données (centre, membres avec rôle, invitations d'entraîneurs), écran Bienvenue Centre / Membre / Perso, équipement à l'inscription. Tout le reste en dépend.
2. ✅ **Base d'exercices des centres** (fait : migration 049) : création par les chefs, photo ou vidéo de référence, détection des doublons, file de validation WODBUD (corriger, publier, notifier l'auteur).
3. ✅ **Import CSV / PDF / photos par les centres** (fait : migration 050), avec comptage des occurrences pour la liste des vidéos à tourner.
### 4. Filtre par équipement
- [x] 4.1 Liste d'équipement complète, par familles, et équipement requis renseigné sur les exercices de la base commune (migration 051).
- [x] 4.2 Lire l'équipement disponible dans le créateur de WOD (celui du centre, sinon celui du compte).
- [x] 4.3 Afficher d'abord les exercices faisables, avec une pastille « Équipement manquant » sur les autres.
- [x] 4.4 Ajouter le filtre « Seulement ce que j'ai » dans le créateur.
- [x] 4.5 Ajouter le même filtre dans la bibliothèque d'exercices.
- [x] 4.6 Signaler à la relecture WODBUD les exercices importés sans équipement (et sans niveau ni consignes) ; publication bloquée tant que c'est incomplet.

### 5. Progression / régression
- [x] 5.1 Base de données : relier deux exercices (plus dur, plus facile, adaptation pour une zone du corps).
- [x] 5.2 Écran pour que WODBUD et les chefs créent ces liens (section « Variantes » de la fiche d'exercice).
- [x] 5.3 Afficher les variantes liées sur la fiche d'un exercice (pour tout le monde, aussi dans le créateur ; un nom ouvre la fiche de la variante).
- [x] 5.4 Calcul de la charge : +5 % haut du corps, +10 % bas du corps, arrondi aux disques (kg ou lb ; haltères et kettlebells selon le râtelier ; toujours au moins un saut).
- [x] 5.5 Action « Trop facile » dans le créateur : nouvelle charge ou variante plus dure (le remplacement garde séries, reps, repos et notes).
- [x] 5.6 Action « À adapter » : choisir la zone (épaule, genou, dos…) et recevoir des exercices qui la sollicitent moins (adaptations reliées par WODBUD ou le centre ; sans lien, l'app le dit plutôt que de deviner).

### 6. Engagement
- [x] 6.1 Bouton Inviter avec le partage du téléphone (communautés, cours et équipe du centre ; message prérempli, sinon lien copié).
- [x] 6.2 Notification push quand la personne invitée a déjà WODBUD (par son courriel ; même réponse que le compte existe ou non ; anti-spam — migration 056).
- [x] 6.3 Formulaire de support vers WODBUD dans les réglages, et boîte de réception dans l'admin (répondre par courriel, marquer traité — migration 057).
- [x] 6.4 Boîte à suggestions : un membre écrit à son centre (dans ses réglages ; en son nom ou anonyme ; il voit si c'est traité — migration 058).
- [x] 6.5 Boîte de réception des suggestions pour le centre (accueil de l'équipe ; nom masqué si anonyme ; traiter ou rouvrir).
- [x] 6.6 Noter l'entraînement à la fin d'une séance (5 étoiles sur l'écran de bilan d'une séance faite à partir d'un WOD — migration 059).
- [x] 6.7 Vue des WODs préférés pour le centre (accueil de l'équipe ; moyenne à partir de 3 notes, anonyme — migration 060).
- [x] 6.8 Dessiner 6 à 8 avatars « Forge » pour l'IA (8 avatars générés par `scripts/avatars/build-avatars.mjs` dans `public/avatars`).
- [x] 6.9 Choix de l'avatar et du ton (motivant, calme, militaire, humoristique), appliqué à l'assistant (bouton « Personnaliser » ; `ai-coach` lit le ton — migration 061).

### 7. Landing
- [x] 7.1 Ajouter la phrase après « Fini le bricolage. » (gain de temps, moins de maux de tête).
- [x] 7.2 Première page qui demande le profil (`/` : trois portes ; le profil choisi est proposé en premier dans Bienvenue).
- [x] 7.3 Page `/centres` (la priorité du client) : haut de page dédié et section « Pour ton centre » (7 fonctions livrées).
- [x] 7.4 Page `/membres` : haut de page dédié et section « Pour toi, membre » (lien d'invitation, WOD du jour, séance guidée, records, rangs, votes).
- [x] 7.5 Page `/perso` : section « Pour toi » limitée à ce qu'un compte perso a vraiment (séance libre ou WOD prêt, minuteur, journal, records, rangs, communautés).
- [x] 7.6 Prérendu et référencement des trois pages (une page HTML par adresse avec titre, description, Open Graph et canonique ; sitemap).
- [x] 7.7 Section des avantages avec animations premium (entrée en cascade avec flou, icône à ressort et onde, halo et liseré qui suivent la souris, inclinaison ; sobre au toucher et si l'appareil demande moins d'animations).

### 8. Travail d'équipe dans un centre
- [x] 8.1 Le proprio et les chefs voient tous les cours du centre (entraîneur, membres, prochaine séance ; lecture seulement — migration 053).
- [x] 8.2 Les WODs sont partagés dans l'équipe du centre (automatique, lecture seulement ; filtre « Équipe » et nom de l'auteur dans la bibliothèque — migration 054).
- [x] 8.3 Un chef peut assigner un cours à un entraîneur (choix dans « Cours du centre » ; migration 055).

### Comptes perso (provisoire)
- [x] Les comptes perso ont le créateur de WOD, leurs WODs, la bibliothèque d'exercices (filtre « Seulement ce que j'ai ») et l'assistant IA dans leur espace. Décision provisoire : à revoir avec le client.

## Transformation (audit du 12 novembre 2026)

Rapport : audit produit publié le 12 novembre. Branche de travail : `sprint`. Une unité à la fois, validée dans le navigateur, puis rapport avant la suivante.

### Phase 0 · Mise en sécurité
- [x] 0.1 Un compte ne modifie que ses propres champs de profil ; minutes, séries et segment restent aux déclencheurs (migration 062).
- [x] 0.2 Plus aucune fonction exécutable sans compte, sauf les trois d'invitation et de partage ; les futures fonctions ne sont plus exposées à `anon` ni à `public` par défaut (migration 063).
- [x] 0.3 Dix tables héritées `app_*` supprimées après export hors dépôt (migration 064).
- [ ] 0.4 Activer « Leaked password protection » dans Supabase Auth (réglage du tableau de bord).
- [ ] 0.5 Domaine et clés (ANTHROPIC_API_KEY, R2) : reportés à plus tard, décision du 12 novembre.

### Phase 1 · La boucle athlète : score et tableau blanc
- [x] 1.1 Modèle de score par méthode (temps avec cap, rounds + reps, charge, répétitions) et RX / adapté (migration 065, `lib/scores.ts` testé).
- [x] 1.2 Saisie du score en fin de séance (écran de bilan ; champs selon la méthode du WOD ; RX ou adapté ; modifiable).
- [x] 1.3 WOD du jour de ma classe en tête de l'accueil athlète (contenu du WOD, notes du coach, « Faire ce WOD » ; une fois fait : « Fait » et mon score).
- [x] 1.4 Tableau blanc par séance de cours : scores classés (RX d'abord), bravos 👏🔥💪 ; depuis la carte du jour (athlète) et la planification (coach) — migration 066.
- [x] 1.5 Benchmarks livrés par WODBUD (13, migration 067 ; filtre ★ dans la bibliothèque) et « La dernière fois / Ton meilleur » sur la carte du jour et la saisie du score.

### Phase 2 · Programmer comme un entraîneur chef
- [x] 2.1 Créateur en un écran : liste d'exercices d'abord, filtres repliés, « + » direct sur chaque ligne, tiroir « N exercices dans le WOD » sur téléphone, `h1` et champs étiquetés ; ligne et filtres extraits en composants.
- [x] 2.2 Calendrier par cours : semaine du lundi au dimanche, « + » sur un jour (recherche, benchmarks d'abord, note), tableau blanc et suppression par séance, « Dupliquer vers la semaine suivante » (sans doublons, sans notification) ; la liste reste disponible.
- [x] 2.3 Cycles : un WOD de base répété N semaines (2 à 12) le même jour, charge +5 % haut / +10 % bas par semaine (arrondi aux disques) ou identique, aperçu semaine par semaine avant de créer ; copies du WOD et séances de cours créées, une seule notification. Modèles réutilisables : la bibliothèque et les benchmarks en tiennent lieu pour l'instant.
- [ ] 2.4 « Proposer un WOD » par l'IA dans le créateur (sortie structurée, exercices de la bibliothèque seulement). Reportée : attend la clé `ANTHROPIC_API_KEY` (voir « Toujours en suspens »).
- [x] 2.5 Garde-fou de volume hebdomadaire par muscle : dans le calendrier, muscle principal deux jours de suite ou 3 jours et plus dans la semaine ; avertissement (non bloquant) au moment de programmer un WOD ; cardio exclu ; règles testées.

### Phase 3 · Faire tourner la salle
- [x] 3.1 Horaire récurrent : créneaux par cours (jour, heure, durée ; au plus 28) réglés par le coach ou les responsables du centre (migration 068) ; heures affichées dans le calendrier de la semaine, jours de cours sans WOD signalés, cycles qui commencent au prochain jour de cours ; « Prochain cours » sur l'accueil athlète. Le texte libre reste affiché tant qu'aucun créneau n'existe.
- [x] 3.2 Présences : QR de la séance affiché par le coach (code valable 3 h, illisible hors des fonctions), « Je suis là » sur la carte du cours de 30 min avant à 30 min après, cases à cocher pour le coach ; une présence par membre, cours et jour ; assiduité sur 30 jours rapportée aux jours d'horaire ; QR scanné sans être connecté : retour à la page après la connexion (migration 069).
- [x] 3.3 Mode TV : `/tv/<cours>` en plein écran pour l'écran de la salle — WOD du jour lisible à 5 mètres (mouvements, charges, notes du coach), QR de présence renouvelé seul et arrivées en direct, tableau blanc des scores, alternance automatique toutes les 30 s, raccourcis W / B / F / ← →, écran gardé allumé ; ouvert depuis la fiche du cours ou le QR des présences. Aucune migration.
- [x] 3.4 Menu coach à cinq entrées (13 avant) : Aujourd'hui · Cours (cours, votes, tableau blanc) · Programmer (créateur, bibliothèque, exercices) · Mon entraînement (séance, journal, records, rang) · Plus (communautés, assistant IA, paramètres). Onglets de section en haut de chaque page du groupe ; barre du bas du téléphone alignée (quatre groupes + « Plus ») ; adresses inchangées ; modèle de menu testé.
- [x] 3.5 Accueil coach centré sur la salle : « Aujourd'hui à la salle » (chaque cours du jour, ses heures, son WOD ou « Rien de programmé », ses présents ; raccourcis Programmer, Mode TV, Présences, Tableau blanc ; sinon le prochain cours), « À faire » (jours de cours sans WOD sur 7 jours, membres à relancer, votes en cours), puis Mes cours et « Mon entraînement » en bas. Lien direct vers un onglet d'un cours (`?c=…&tab=planning`). Responsables du centre : horaire des cours du centre réglable depuis leur liste.
- [x] 3.6 Groupes (option A, présentation seulement) : une entrée « Groupes » remplace « Cours » chez le coach (onglets Aperçu, Cours, Communautés, Votes) et « Communautés » chez l'athlète ; la page « Mes groupes » montre les cours (fiche pour le coach ; carte horaire, présence et classement pour l'athlète) et les communautés rejointes, avec « Nouveau cours » / « Nouvelle communauté » (`?new=1`) et « Découvrir des communautés ». Les tables restent séparées en base.
- [ ] 3.6 B Fusion en base (les communautés deviennent des cours sans coach ni horaire ; migration des membres, défis et WODs partagés ; invitations revues) : plus tard, si l'usage le confirme.

### Phase 4 · Qualité et système
- [x] 4.1 Tests de bout en bout Playwright : cinq parcours (connexion et accueil coach, créer un WOD, programmer une semaine et un cycle, présences, mode TV et tableau blanc), sur ordinateur et sur téléphone ; Supabase entièrement simulé (aucun secret, heure figée) ; job CI à chaque push, avec les tests unitaires désormais lancés aussi en CI et une vérification des types qui vérifie vraiment (`tsc -b`). Mode d'emploi : docs/tests.md.
- [ ] 4.2 Composants partagés à la place des styles en ligne (691 au départ), page par page, rendu comparé avant / après et parcours Playwright à chaque étape :
  - [x] Composants `Modal` (rôle dialog relié au titre, Échap, retour Android, focus rendu au déclencheur) et `Field` (étiquette reliée au champ) ; classes `wb-*` pour boutons et champs.
  - [x] ClassesView : 71 → 0 style en ligne ; fenêtres « Créer un cours » et « Créer un vote » accessibles au clavier ; chaînes en dur traduites ; parcours e2e de création d'un cours.
  - [x] Créateur de WOD : 65 → 0 style en ligne ; alertes « repos 48 h » et « cardio » sur un `AlertDialog` partagé (rôle alertdialog, focus sur Annuler, Échap, focus rendu au « + ») ; « + » en aria-disabled pendant l'ajout pour ne plus perdre le focus ; lignes d'exercice étiquetées (répétitions, séries, détails, retirer) ; parcours e2e de l'alerte 48 h. Correctif : collision de classes .wb-pick* introduite à l'étape précédente (lignes de la bibliothèque) et vérification de mise en page ajoutée au parcours « créer un WOD ».
  - [x] Paramètres : 42 → 0 style en ligne ; étiquettes reliées aux champs (nom, courriel, mot de passe), groupes de puces annoncés, ✕ des liens sociaux étiqueté, bordures de champs contrastées ; fenêtre de suppression du compte sur `Modal` (teinte danger, Échap, impossible à fermer pendant la suppression) ; bouton désactivé enfin visible comme tel ; parcours e2e.
  - [x] Vote de l'athlète : 33 → 1 (la couleur de l'option, passée en variable CSS) ; options en groupe annoncé, confirmation en zone vivante, états vides sur EmptyState ; parcours e2e.
  - [x] Page d'invitation : 32 → 0 ; même gabarit que la page de présence, étiquettes reliées aux champs (elles ne l'étaient pas), autocomplete (nom, courriel, nouveau / mot de passe actuel), erreurs annoncées ; parcours e2e (connexion puis cours rejoint, lien invalide).
  - [ ] Fiche et formulaire d'exercice (25 + 31), planning (26), puis le reste.
- [ ] 4.3 Jetons sémantiques (couleurs, espacements) et plancher typographique.
- [ ] 4.4 Thème clair.
- [ ] 4.5 Suivi des erreurs.
- [ ] 4.6 Environnement de préproduction (branche Supabase ou projet séparé).

## À définir avec le client
- [ ] **Facturation** : qui paie et comment (par membre, par entraîneur, prix fixe).
- [ ] **Forfaits d'abonnement** (« balancer les bundles ») : ce qui est inclus dans chaque palier.
- [ ] **Coach en direct** qui dit quoi faire pendant la séance : forme à trouver.
- [ ] **Avant / pendant / après l'entraînement** : ce dont on a besoin à chaque étape.
- [ ] **Cours privés** : ce qu'un cours privé veut dire dans l'app.
- [ ] **Mention du centre auteur** dans la base commune (« Proposé par CrossFit X »).

## Toujours en suspens (technique)
- [ ] Supabase : activer « Confirm email » et « Leaked password protection ».
- [ ] Clés : `ANTHROPIC_API_KEY` (assistant IA et lecture des feuilles — Gemini n'est plus utilisé), clés R2 (vidéos).
- [ ] Emballage App Store / Play Store avec Capacitor, et notifications natives (Apple, Firebase).
- [ ] Logo officiel d'Apple sur le bouton « Continuer avec Apple ».
- [ ] Suivi des erreurs et statistiques d'usage.
- [ ] Essai d'une invitation avec deux vrais comptes (membre et entraîneur).
- [ ] Essai de la lecture de feuilles réelles avec Claude, une fois la clé ajoutée.
- [ ] Unité 2.4 « Proposer un WOD » par l'IA dans le créateur, une fois la clé `ANTHROPIC_API_KEY` posée : sortie structurée, exercices de la bibliothèque seulement, garde-fou de volume appliqué.
- [ ] Retirer les données de test en production (centre « Box Test WODBUD », ses exercices et mentions).
- [ ] Retirer les exercices parasites de la base commune (`test`, `test 1`, `test 2` ×2, `simple test`, `avant-bras`, `biceps`, `epaules`).
