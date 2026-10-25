import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { rankDisplay, rankMotto, type Rank } from '../../lib/ranks'
import { playCue, readSoundPref } from '../../lib/gymCues'
import { RankEmblem, rankArtUrl } from './RankBadge'
import { useBackToClose } from '../../hooks/useBackToClose'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Montée en rang, en plein écran.
 *
 * Mise en scène en trois temps : l'ancien insigne se dissout, un éclat de
 * lumière, le nouvel insigne surgit au milieu des rayons et des particules
 * à sa couleur ; puis viennent le nom et la devise. Moins de deux secondes,
 * et tout reste lisible si l'on coupe les animations.
 */
export default function RankUpCelebration({ from, to, onClose, onSeeRank }: {
  from: Rank | null
  to: Rank
  onClose: () => void
  onSeeRank?: () => void
}) {
  useBackToClose(true, onClose)
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const name = rankDisplay(to, i18n.language)

  // La mise en scène attend que les deux insignes soient décodés : sinon
  // l'ancien se « dissout » avant même d'être apparu. Plafond de 700 ms.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const urls = [from && rankArtUrl(from), rankArtUrl(to)].filter((u): u is string => Boolean(u))
    const decode = (u: string) => { const img = new Image(); img.src = u; return img.decode().catch(() => {}) }
    Promise.race([Promise.all(urls.map(decode)), new Promise((r) => setTimeout(r, 700))])
      .then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [from, to])
  const motto = rankMotto(to, i18n.language)

  useEffect(() => {
    closeRef.current?.focus()
    try { navigator.vibrate?.([90, 60, 90, 60, 240]) } catch { /* non pris en charge */ }
    playCue('done', readSoundPref())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Particules à la couleur du rang : positions déterministes (pas de hasard au rendu).
  const sparks = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const a = (i / 34) * Math.PI * 2 + (i % 4) * 0.21
    const d = 120 + ((i * 47) % 90)
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 4 + (i % 3) * 3, c: i % 3 === 0 ? '#fff4d6' : to.color, delay: 0.62 + (i % 6) * 0.025 }
  }), [to.color])

  const delay = (s: number) => (reduce ? 0 : s)
  const appear = (s: number, y = 14) => reduce
    ? { initial: false as const }
    : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: s, ease: EASE } }

  return createPortal(
    <div className="wb-rankup" role="dialog" aria-modal="true" aria-label={`${t('session.new_rank')} : ${name}`} style={{ ['--rank' as string]: to.color }}>
      <div className="wb-rankup-glow" aria-hidden="true" />
      <div className="wb-rankup-rays" aria-hidden="true" />

      {ready && (<>
      <div className="wb-rankup-stage">
        {/* L'ancien insigne se dissout. */}
        {from && !reduce && (
          <motion.div
            className="wb-rankup-emblem"
            initial={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            animate={{ scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeIn' }}
          >
            <RankEmblem rank={from} size={150} />
          </motion.div>
        )}

        {/* Éclat. */}
        {!reduce && (
          <motion.div
            className="wb-rankup-flash"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.3, 1.6] }}
            transition={{ duration: 0.7, delay: 0.5, times: [0, 0.35, 1] }}
          />
        )}

        {/* Particules. */}
        {!reduce && sparks.map((p, i) => (
          <motion.span
            key={i}
            className="wb-rankup-spark"
            aria-hidden="true"
            style={{ width: p.s, height: p.s, background: p.c }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 1.3, delay: p.delay, ease: 'easeOut', times: [0, 0.2, 1] }}
          />
        ))}

        {/* Le nouvel insigne surgit. */}
        <motion.div
          className="wb-rankup-emblem is-new"
          style={{ ['--art' as string]: `url(/ranks/${to.key}.svg)` }}
          initial={reduce ? false : { scale: 0.2, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: delay(0.6) }}
        >
          <RankEmblem rank={to} size={190} />
        </motion.div>
      </div>

      <div className="wb-rankup-text">
        <motion.p className="wb-rankup-tag" {...appear(delay(0.95))}>{t('session.new_rank')}</motion.p>
        <motion.h2 {...appear(delay(1.05), 20)}>{name}</motion.h2>
        {motto && <motion.p className="wb-rankup-motto" {...appear(delay(1.2))}>« {motto} »</motion.p>}
        <motion.div className="wb-rankup-actions" {...appear(delay(1.35))}>
          <button ref={closeRef} type="button" className="wb-btn wb-btn--primary wb-btn--lg" onClick={onClose}>
            {t('session.rankup_continue')}
          </button>
          {onSeeRank && (
            <button type="button" className="wb-btn wb-btn--ghost" onClick={onSeeRank}>
              {t('session.done_rank')}
            </button>
          )}
        </motion.div>
      </div>
      </>)}
    </div>,
    document.body
  )
}
