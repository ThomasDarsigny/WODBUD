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
2. **Base d'exercices des centres** : création par les chefs, photo ou vidéo de référence, détection des doublons, file de validation WODBUD (corriger, publier, notifier l'auteur).
3. **Import CSV / PDF / photos par les centres**, avec comptage des occurrences pour la liste des vidéos à tourner.
4. **Filtre par équipement** dans le créateur de WOD.
5. **Progression / régression** : liens entre exercices, puis l'action « trop facile / à adapter ».
6. **Engagement** : suggestions et support, invitations, note de l'entraînement, avatar de l'IA.
7. **Landing** : page de choix du profil, trois pages ciblées, nouvelle phrase, animations premium.

## À définir avec le client
- [ ] **Facturation** : qui paie et comment (par membre, par entraîneur, prix fixe).
- [ ] **Forfaits d'abonnement** (« balancer les bundles ») : ce qui est inclus dans chaque palier.
- [ ] **Coach en direct** qui dit quoi faire pendant la séance : forme à trouver.
- [ ] **Avant / pendant / après l'entraînement** : ce dont on a besoin à chaque étape.
- [ ] **Cours privés** : ce qu'un cours privé veut dire dans l'app.
- [ ] **Mention du centre auteur** dans la base commune (« Proposé par CrossFit X »).

## Toujours en suspens (technique)
- [ ] Supabase : activer « Confirm email » et « Leaked password protection ».
- [ ] Clés : `ANTHROPIC_API_KEY` (assistant IA), `GEMINI_API_KEY` (OCR), clés R2 (vidéos).
- [ ] Emballage App Store / Play Store avec Capacitor, et notifications natives (Apple, Firebase).
- [ ] Logo officiel d'Apple sur le bouton « Continuer avec Apple ».
- [ ] Suivi des erreurs et statistiques d'usage.
- [ ] Modification non commitée dans `OcrImportSection.tsx`.
