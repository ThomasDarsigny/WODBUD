# Vidéo du hero (landing page)

La landing affiche une vidéo de fond derrière le titre. Elle est **auto-hébergée** :
aucun lien vers un CDN externe, pour ne pas dépendre d'un hébergeur qui peut couper
l'accès du jour au lendemain (c'est exactement ce qui est arrivé avec les URLs Pexels,
passées en 403).

## Ce qui est en place

| Fichier | Sert à | Poids |
|---|---|---|
| `hero-1080.webm` | écrans ≥ 900 px, navigateurs VP9 | 1,35 Mo |
| `hero-1080.mp4` | écrans ≥ 900 px, repli universel | 2,11 Mo |
| `hero-720.webm` | mobile, VP9 | 707 Ko |
| `hero-720.mp4` | mobile, repli universel | 833 Ko |
| `poster.jpg` | 1re image, avant le décodage | 52 Ko |

Clip Pexels 6388882 — battle ropes dans un box industriel, plan-séquence.
Fenêtre 8 s → 17 s (la caméra y est quasi fixe), **8,36 s**, sans piste audio.

**La boucle est raccordée.** Les 0,6 dernières secondes de la fenêtre sont fondues
dans les 0,6 premières (`xfade`), donc la fin et le début de la vidéo publiée tombent
sur la même image source : aucun saut au bouclage.

Un deuxième clip avait été envisagé (Pexels 18573489) et écarté : logo Gymshark en
pleine poitrine, panneau LED sur trépied visible dans le cadre, montage à partir de
8,8 s, et surtout un éclairage inversé pour cette mise en page — sa zone la plus
lumineuse (luma 75) tombait à gauche, sous le voile à 93 %, pendant que la partie
réellement visible à droite était sa plus sombre (luma 40). Le A fait l'inverse : 58 à
gauche, 62 à droite.

## Remplacer le footage

Les noms de fichiers sont figés — le code les cherche exactement comme ça. Écrase les
fichiers, rien d'autre à toucher. Si l'un manque, la page retombe sur le fond animé
sans rien casser.

Le footage idéal : une personne qui s'entraîne, plan large ou moyen, mouvement continu,
**sans coupe**. La boucle est muette et le texte est posé à gauche — garde l'action à
droite du cadre et évite les gros plans de visage, qui attirent l'œil loin du titre.

Ton propre footage reste le meilleur choix : zéro question de licence, et ça montre le
vrai contexte de l'app. Pour du stock, télécharge le fichier et dépose-le ici — ne mets
**jamais** une URL de CDN tiers dans le code, c'est du hotlinking et ça casse quand
l'hébergeur le décide. Vérifie la licence au moment du téléchargement, elles changent.

## Encodage

Les commandes réellement utilisées. `LOOP` fond la fin dans le début ; ajuste les
bornes (`8.36`, `8.96`) si tu changes la durée de la fenêtre — elles valent
`T - d` et `T`, avec `T` la durée de la fenêtre et `d` le fondu.

```bash
SRC=source.mp4
LOOP="[0:v]trim=0:0.6,setpts=PTS-STARTPTS[head];\
[0:v]trim=8.36:8.96,setpts=PTS-STARTPTS[tail];\
[0:v]trim=0.6:8.36,setpts=PTS-STARTPTS[body];\
[tail][head]xfade=transition=fade:duration=0.6:offset=0[bl];\
[bl][body]concat=n=2:v=1[v]"

# 1080p mp4
ffmpeg -ss 8.0 -t 8.96 -i "$SRC" -filter_complex "$LOOP" -map "[v]" -an \
  -c:v libx264 -profile:v main -crf 26 -preset slow -pix_fmt yuv420p \
  -movflags +faststart public/hero/hero-1080.mp4

# 720p mp4
ffmpeg -ss 8.0 -t 8.96 -i "$SRC" -filter_complex "$LOOP;[v]scale=1280:720[vs]" -map "[vs]" -an \
  -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p \
  -movflags +faststart public/hero/hero-720.mp4

# WebM VP9 (~20 à 35 % plus léger)
ffmpeg -ss 8.0 -t 8.96 -i "$SRC" -filter_complex "$LOOP" -map "[v]" -an \
  -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -cpu-used 4 public/hero/hero-1080.webm
ffmpeg -ss 8.0 -t 8.96 -i "$SRC" -filter_complex "$LOOP;[v]scale=1280:720[vs]" -map "[vs]" -an \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -cpu-used 4 public/hero/hero-720.webm

# poster : la 1re image de la vidéo publiée, pas de la source
ffmpeg -i public/hero/hero-1080.mp4 -frames:v 1 -q:v 4 public/hero/poster.jpg
```

`-an` coupe l'audio : la vidéo est muette de toute façon, autant ne pas transporter la
piste. `-movflags +faststart` déplace l'index au début du fichier, pour que la lecture
démarre avant la fin du téléchargement.

Le service worker ne précharge **pas** ces fichiers : `globPatterns` dans
`vite.config.ts` ne liste que `js,css,html,ico,png,svg,woff2`. L'installation de la PWA
reste à ~929 Ko. Si tu ajoutes `mp4` à ce glob, chaque installation tirera 4,9 Mo.

## Servir depuis un CDN

Si le fichier devient gros ou que tu veux le sortir du dépôt git, mets l'URL dans
`VITE_HERO_VIDEO_URL` (Vercel → Settings → Environment Variables). Elle prend le
dessus sur les fichiers locaux. À n'utiliser que pour un domaine que tu contrôles
(R2, Bunny), pas pour hotlinker une banque d'images.

## Comportement du composant

`src/components/landing/HeroMedia.tsx` :

- **une seule** résolution est téléchargée, choisie au montage via `matchMedia`
  (avant : deux `<source>` de résolutions différentes, ce qui n'est pas une échelle —
  le navigateur prend le premier qu'il sait lire, donc tout le monde tirait le 1080p) ;
- `prefers-reduced-motion: reduce` ou `navigator.connection.saveData` → pas de vidéo
  du tout, fond animé seul ;
- fichier absent ou illisible → bascule silencieuse sur le fond animé ;
- vidéo mise en pause dès que le hero sort de l'écran (batterie, données) ;
- fondu à l'apparition, une fois la vidéo décodée.
