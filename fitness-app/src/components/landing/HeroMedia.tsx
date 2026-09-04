import { useCallback, useEffect, useRef, useState } from 'react'
import s from './landing.module.css'

/**
 * Fond vidéo du hero.
 *
 * Les fichiers sont AUTO-HÉBERGÉS dans `public/hero/` (voir docs/hero-video.md).
 * Pour changer le footage : dépose les fichiers, aucune modification de code.
 * Pour servir depuis un CDN (R2, Bunny...), définis VITE_HERO_VIDEO_URL.
 *
 * Le composant ne montre jamais un rectangle vide : s'il n'y a pas de vidéo,
 * si le fichier est absent, si l'utilisateur a demandé moins d'animations ou
 * s'il est en mode économie de données, il retombe sur le fond animé.
 */

type Source = { src: string; type: string }

const REMOTE = (import.meta.env.VITE_HERO_VIDEO_URL as string | undefined)?.trim()

const DESKTOP: Source[] = [
  { src: '/hero/hero-1080.webm', type: 'video/webm' },
  { src: '/hero/hero-1080.mp4', type: 'video/mp4' },
]

const MOBILE: Source[] = [
  { src: '/hero/hero-720.webm', type: 'video/webm' },
  { src: '/hero/hero-720.mp4', type: 'video/mp4' },
]

const POSTER = '/hero/poster.jpg'
const WIDE_QUERY = '(min-width: 900px)'

/**
 * Décidé une seule fois, au montage. Volontairement pas dans un effet : c'est un
 * calcul pur à partir des APIs du navigateur, et le hero ne doit pas changer de
 * source au redimensionnement (ça relancerait un téléchargement complet).
 */
function pickSources(): Source[] {
  if (typeof window === 'undefined') return []

  // Mouvement réduit ou mode économie de données : on ne charge rien du tout.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return []
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData === true) return []

  if (REMOTE) {
    return [{ src: REMOTE, type: REMOTE.endsWith('.webm') ? 'video/webm' : 'video/mp4' }]
  }
  return window.matchMedia(WIDE_QUERY).matches ? DESKTOP : MOBILE
}

export default function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const failedRef = useRef(0)

  const [sources] = useState<Source[]>(pickSources)
  const [ready, setReady] = useState(false)
  const [dead, setDead] = useState(false)

  // Toutes les sources ont échoué (404, format refusé, réseau) -> on abandonne la vidéo.
  const onSourceError = useCallback(() => {
    failedRef.current += 1
    if (failedRef.current >= sources.length) setDead(true)
  }, [sources.length])

  // Pas de lecture hors écran : ça économise batterie et données sur mobile.
  useEffect(() => {
    const el = videoRef.current
    if (!el || dead || sources.length === 0) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [dead, sources])

  const showVideo = !dead && sources.length > 0

  return (
    <>
      <div className={s.heroBackdrop} aria-hidden="true" />
      {showVideo && (
        <video
          ref={videoRef}
          className={`${s.heroVideo} ${ready ? s.heroVideoReady : ''}`}
          poster={REMOTE ? undefined : POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
          onError={() => setDead(true)}
        >
          {sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} onError={onSourceError} />
          ))}
        </video>
      )}
    </>
  )
}
