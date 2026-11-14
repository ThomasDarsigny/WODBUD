import { Fragment, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import type { MotionProps } from 'motion/react'
import { PROFILE_PATHS, rememberProfileHint, type LandingProfile } from '../../lib/landingProfile'
import { DEMO_MOVES, demoMoveName } from './demoMoves'
import s from './landing.module.css'

// Mêmes illustrations que l'écran Bienvenue, pour qu'on s'y retrouve après l'inscription.
const ART = { center: 'sifflet', member: 'membre', perso: 'premiere-serie' } as const
/** Les trois fonctionnalités montrées : prises dans les points forts de la page du profil. */
const FEATURES: Record<LandingProfile, number[]> = { center: [0, 3, 4], member: [0, 1, 2], perso: [0, 3, 4] }
/** Durée d'une scène. Les colonnes démarrent décalées, pour ne pas changer toutes ensemble. */
const SCENE_MS = 4200
const OFFSET_MS = 1100
const EASE = [0.16, 1, 0.3, 1] as const

type From = { opacity?: number; x?: number; y?: number; scale?: number }
/** Apparition d'un élément d'une scène, après `delay` secondes ; rien d'animé si l'animation est réduite. */
type Appear = (delay: number, from?: From) => MotionProps
type SceneProps = { a: Appear; reduce: boolean }

const appearFor = (reduce: boolean): Appear => (delay, from = { opacity: 0, y: 10 }) =>
  reduce ? { initial: false } : { initial: from, animate: { opacity: 1, x: 0, y: 0, scale: 1 }, transition: { delay, duration: 0.45, ease: EASE } }

function useMoveName() {
  const { i18n } = useTranslation('common')
  return (key: string) => {
    const m = DEMO_MOVES.find((d) => d.key === key)
    return m ? demoMoveName(m, i18n.language) : key
  }
}

/** Joue `after` une fois, `ms` après l'apparition de la scène (tout de suite si l'animation est réduite). */
function useLater(ms: number, reduce: boolean): boolean {
  const [done, setDone] = useState(reduce)
  useEffect(() => {
    if (reduce) return
    const id = window.setTimeout(() => setDone(true), ms)
    return () => window.clearTimeout(id)
  }, [ms, reduce])
  return done
}

// ── Centre ───────────────────────────────────────────────────────────

const TEAM = [['MA', 'center.role_owner'], ['JL', 'center.role_head_coach'], ['SC', 'center.role_coach']] as const

function CenterTeam({ a }: SceneProps) {
  const { t } = useTranslation('common')
  return (
    <div className={s.scList}>
      {TEAM.map(([initials, role], k) => (
        <motion.div key={initials} className={s.scRow} {...a(0.15 + k * 0.4, { opacity: 0, x: -18 })}>
          <span className={s.scAvatar} data-tone={k}>{initials}</span>
          <span className={s.scRowText}>{t(role)}</span>
          <motion.span className={s.scTick} {...a(0.5 + k * 0.4, { opacity: 0, scale: 0.4 })}>✓</motion.span>
        </motion.div>
      ))}
      <motion.p className={s.scCaption} {...a(1.6)}>{t('landing.chooser.scene.invited')}</motion.p>
    </div>
  )
}

/** Cours de la semaine : colonne, rangée, entraîneur (même couleur que dans l'équipe). */
const WEEK: Array<[number, number, number]> = [[0, 0, 0], [2, 0, 2], [4, 0, 0], [1, 1, 1], [3, 1, 1], [0, 2, 2], [2, 2, 0], [4, 2, 1]]

function CenterWeek({ a }: SceneProps) {
  const { i18n } = useTranslation('common')
  // Le 1er janvier 2024 est un lundi : noms des jours et heures dans la langue de la page.
  const days = [1, 2, 3, 4, 5].map((d) => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(2024, 0, d)))
  const hours = [6, 12, 18].map((h) => new Intl.DateTimeFormat(i18n.language, { hour: 'numeric' }).format(new Date(2024, 0, 1, h)))
  return (
    <div className={s.scWeek}>
      <span />
      {days.map((d) => <span key={d} className={s.scWeekDay}>{d}</span>)}
      {hours.map((h, row) => (
        <Fragment key={h}>
          <span className={s.scWeekHour}>{h}</span>
          {days.map((d, col) => {
            const order = WEEK.findIndex(([c, r]) => c === col && r === row)
            return (
              <span key={d} className={s.scWeekCell}>
                {order >= 0 && (
                  <motion.span className={s.scWeekBlock} data-tone={WEEK[order][2]} {...a(0.15 + order * 0.16, { opacity: 0, scale: 0.5 })}>
                    {TEAM[WEEK[order][2]][0]}
                  </motion.span>
                )}
              </span>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

function CenterShared({ a }: SceneProps) {
  const { t } = useTranslation('common')
  const name = useMoveName()
  const moves = [['thruster', '10'], ['pullup', '8'], ['boxjump', '12']] as const
  return (
    <div className={s.scCard}>
      <motion.div className={s.scCardHead} {...a(0.1)}>
        <strong>AMRAP 12</strong>
        <span>min</span>
      </motion.div>
      {moves.map(([key, reps], k) => (
        <motion.div key={key} className={s.scMove} {...a(0.35 + k * 0.3, { opacity: 0, x: -12 })}>
          <b>{reps}</b> {name(key)}
        </motion.div>
      ))}
      <motion.div className={s.scChip} {...a(1.45, { opacity: 0, scale: 0.7 })}>✓ {t('landing.chooser.scene.shared')}</motion.div>
    </div>
  )
}

// ── Membre ───────────────────────────────────────────────────────────

const QR = ['1110111', '1010101', '1110111', '0001010', '1011101', '0100110', '1110101']

function MemberJoin({ a, reduce }: SceneProps) {
  const { t } = useTranslation('common')
  return (
    <div className={s.scQrWrap}>
      <motion.div className={s.scQr} {...a(0.05, { opacity: 0, scale: 0.85 })}>
        {QR.join('').split('').map((c, i) => <i key={i} className={c === '1' ? s.scQrOn : undefined} />)}
        {!reduce && <span className={s.scScan} />}
      </motion.div>
      <motion.div className={s.scBanner} {...a(1.5, { opacity: 0, y: 12 })}>
        <b>✓</b> {t('landing.chooser.scene.joined')}
      </motion.div>
    </div>
  )
}

function MemberWod({ a }: SceneProps) {
  const { t, i18n } = useTranslation('common')
  const name = useMoveName()
  const at = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }).format(new Date(2024, 0, 1, 6, 0))
  return (
    <div>
      <motion.div className={s.scNotif} {...a(0.1, { opacity: 0, y: -26 })}>
        <span className={s.scNotifIcon}>W</span>
        <span className={s.scNotifText}>
          <strong>{t('landing.chooser.scene.wod_today')}</strong>
          <small>Fran · 21-15-9</small>
        </span>
        <time>{at}</time>
      </motion.div>
      <motion.div className={s.scCard} {...a(0.65)}>
        {(['thruster', 'pullup'] as const).map((key, k) => (
          <motion.div key={key} className={s.scMove} {...a(0.85 + k * 0.25, { opacity: 0, x: -12 })}>
            <b>21-15-9</b> {name(key)}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

function MemberTimer({ a, reduce }: SceneProps) {
  const { t } = useTranslation('common')
  const [sec, setSec] = useState(reduce ? 42 : 0)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setSec((v) => (v >= 42 ? v : v + 1)), 65)
    return () => window.clearInterval(id)
  }, [reduce])
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className={s.scTimer}>
      <motion.div className={s.scRing} {...a(0.05, { opacity: 0, scale: 0.85 })}>
        <svg viewBox="0 0 120 120">
          <circle className={s.scRingTrack} cx="60" cy="60" r={r} />
          <circle className={s.scRingFill} cx="60" cy="60" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - sec / 60)} />
        </svg>
        <span className={s.scRingTime}>00:{String(sec).padStart(2, '0')}</span>
      </motion.div>
      <motion.p className={s.scTimerLabel} {...a(0.4)}>{t('landing.chooser.scene.round', { n: 2, total: 5 })}</motion.p>
    </div>
  )
}

// ── Perso ────────────────────────────────────────────────────────────

function PersoStart({ a, reduce }: SceneProps) {
  const { t } = useTranslation('common')
  const chips = [t('landing.chooser.scene.free'), 'Cindy', 'Helen', 'Murph']
  return (
    <div className={s.scStart}>
      <motion.span className={`${s.scPlay} ${reduce ? '' : s.scPlayPulse}`} {...a(0.05, { opacity: 0, scale: 0.6 })}>▶</motion.span>
      <div className={s.scChips}>
        {chips.map((c, k) => (
          <motion.span key={c} className={k === 0 ? `${s.scChipPlain} ${s.scChipOn}` : s.scChipPlain} {...a(0.45 + k * 0.2, { opacity: 0, y: 8 })}>
            {c}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

function PersoRecords({ a, reduce }: SceneProps) {
  const { t } = useTranslation('common')
  const name = useMoveName()
  const record = useLater(1300, reduce)
  return (
    <div className={s.scRecords}>
      <motion.div className={`${s.scRecord} ${record ? s.scRecordNew : ''}`} {...a(0.1, { opacity: 0, x: -14 })}>
        <span>{name('deadlift')}</span>
        {record && <motion.em className={s.scPr} {...a(0, { opacity: 0, scale: 0.5 })}>{t('landing.chooser.scene.record')}</motion.em>}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={record ? 'new' : 'old'} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {record ? 125 : 120} kg
          </motion.b>
        </AnimatePresence>
      </motion.div>
      {([['press', 45], ['thruster', 50]] as const).map(([key, kg], k) => (
        <motion.div key={key} className={s.scRecord} {...a(0.3 + k * 0.2, { opacity: 0, x: -14 })}>
          <span>{name(key)}</span>
          <b>{kg} kg</b>
        </motion.div>
      ))}
    </div>
  )
}

function PersoRank({ a, reduce }: SceneProps) {
  const { t } = useTranslation('common')
  const up = useLater(1700, reduce)
  return (
    <div className={s.scRank}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={up ? 'machine' : 'regulier'}
          src={`/ranks/${up ? 'machine' : 'regulier'}.svg`}
          alt=""
          width={104}
          height={104}
          className={s.scRankArt}
          initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 1.25 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        />
      </AnimatePresence>
      <div className={s.scRankBar}>
        <motion.span
          initial={reduce ? false : { width: '55%' }}
          animate={{ width: up ? '12%' : '100%' }}
          transition={{ duration: up ? 0.5 : 1.4, ease: EASE }}
        />
      </div>
      <motion.p className={up ? s.scChip : s.scCaption} key={up ? 'up' : 'min'} {...a(0.15, { opacity: 0, y: 6 })}>
        {up ? t('landing.chooser.scene.rank_up') : t('landing.chooser.scene.minutes', { n: 45 })}
      </motion.p>
    </div>
  )
}

const SCENES: Record<LandingProfile, ComponentType<SceneProps>[]> = {
  center: [CenterTeam, CenterWeek, CenterShared],
  member: [MemberJoin, MemberWod, MemberTimer],
  perso: [PersoStart, PersoRecords, PersoRank]
}

/**
 * Une colonne de « WODBUD, c'est pour qui ? » : le profil, une petite scène
 * animée par fonctionnalité clé (elles défilent toutes seules tant que la
 * colonne est à l'écran), la liste de ces fonctionnalités, et le lien vers la
 * page du profil. Toute la colonne est cliquable. Animation réduite : la
 * première scène, immobile, et la liste complète.
 */
export default function ChooserPanel({ profile, index }: { profile: LandingProfile; index: number }) {
  const { t } = useTranslation('common')
  const reduce = Boolean(useReducedMotion())
  const stage = useRef<HTMLDivElement>(null)
  const inView = useInView(stage, { amount: 0.4 })
  const [scene, setScene] = useState(0)
  const [cycle, setCycle] = useState(0)
  const scenes = SCENES[profile]
  const items = t(`landing.highlights.${profile}.items`, { returnObjects: true }) as Array<{ title: string }>
  const titles = FEATURES[profile].map((i) => items[i]?.title ?? '')
  // La première scène de chaque colonne dure un peu plus, d'un décalage différent par colonne.
  const duration = cycle === 0 ? SCENE_MS + index * OFFSET_MS : SCENE_MS

  useEffect(() => {
    if (reduce || !inView) return
    const id = window.setTimeout(() => {
      setScene((v) => (v + 1) % scenes.length)
      setCycle((v) => v + 1)
    }, duration)
    return () => window.clearTimeout(id)
  }, [reduce, inView, duration, scene, scenes.length])

  const Scene = scenes[scene]

  return (
    <motion.article
      className={`${s.panel} ${profile === 'center' ? s.panelMain : ''}`}
      aria-labelledby={`chooser-${profile}`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.1, ease: EASE }}
    >
      <header className={s.panelHead}>
        <img src={`/badges/${ART[profile]}.svg`} alt="" width={52} height={52} />
        <div>
          <h2 id={`chooser-${profile}`}>{t(`landing.chooser.${profile}_title`)}</h2>
          <p>{t(`landing.chooser.${profile}_desc`)}</p>
        </div>
      </header>

      <div ref={stage} className={s.panelStage} aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scene}
            className={s.scene}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Scene a={appearFor(reduce)} reduce={reduce} />
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className={s.panelFeatures}>
        {titles.map((title, k) => (
          <li key={title} className={k === scene ? s.featOn : undefined}>
            <span className={s.featBar} aria-hidden="true">
              {k === scene && !reduce && (
                <span key={`${cycle}-${inView}`} style={{ animationDuration: `${duration}ms`, animationPlayState: inView ? 'running' : 'paused' }} />
              )}
            </span>
            {title}
          </li>
        ))}
      </ul>

      <Link to={PROFILE_PATHS[profile]} viewTransition className={s.panelCta} onClick={() => rememberProfileHint(profile)}>
        {t(`landing.chooser.${profile}_cta`)}
        <span aria-hidden="true">→</span>
      </Link>
    </motion.article>
  )
}
