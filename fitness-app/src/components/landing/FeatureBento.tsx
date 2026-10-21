import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { TiltCard } from './fx'
import { DEMO_MOVES, demoMoveName } from './demoMoves'
import s from './landing.module.css'

type Tile = { title: string; desc: string }

const METHODS = ['AMRAP', 'EMOM', 'For Time', 'Tabata', 'Rounds', 'Force']

/**
 * Fonctionnalités en grille « bento » : des tuiles de tailles différentes,
 * chacune avec un petit visuel qui montre la chose plutôt qu'un paragraphe.
 * Une tuile = un titre court + une ligne.
 */
export default function FeatureBento() {
  const { t, i18n } = useTranslation('common')
  const reduce = useReducedMotion()
  const b = (key: string) => t(`landing.bento.${key}`, { returnObjects: true }) as Tile & Record<string, string>
  const names = DEMO_MOVES.map((m) => demoMoveName(m, i18n.language))
  const rowA = [...names.slice(0, 6), ...names.slice(0, 6)]
  const rowB = [...names.slice(6), ...names.slice(6)]

  const mann = b('mannequin')
  const lib = b('library')
  const meth = b('methods')
  const votes = b('votes')
  const ranks = b('ranks')
  const ai = b('ai')

  return (
    <div className={s.bento}>
      <TiltCard className={`${s.tile} ${s.tileMann}`} intensity={0.35}>
        <div className={s.tileMannArt} aria-hidden="true" />
        <div className={s.tileBody}>
          <h3>{mann.title}</h3>
          <p>{mann.desc}</p>
          <a href="#try" className={s.tileLink}>{mann.cta} →</a>
        </div>
      </TiltCard>

      <TiltCard className={`${s.tile} ${s.tileLib}`} intensity={0.5}>
        <div className={s.marquee} aria-hidden="true">
          <div className={s.marqueeRow}>{rowA.map((n, i) => <span key={`a${i}`}>{n}</span>)}</div>
          <div className={`${s.marqueeRow} ${s.marqueeRev}`}>{rowB.map((n, i) => <span key={`b${i}`}>{n}</span>)}</div>
        </div>
        <div className={s.tileBody}>
          <h3>{lib.title}</h3>
          <p>{lib.desc}</p>
        </div>
      </TiltCard>

      <TiltCard className={`${s.tile} ${s.tileMeth}`} intensity={0.5}>
        <div className={s.methods} aria-hidden="true">
          {METHODS.map((m, i) => (
            <span key={m} style={{ animationDelay: `${i * 1.1}s` }}>{m}</span>
          ))}
        </div>
        <div className={s.tileBody}>
          <h3>{meth.title}</h3>
          <p>{meth.desc}</p>
        </div>
      </TiltCard>

      <TiltCard className={`${s.tile} ${s.tileVote}`} intensity={0.5}>
        <div className={s.voteArt} aria-hidden="true">
          {[{ label: votes.a, pct: 64 }, { label: votes.b, pct: 36 }].map((o, i) => (
            <div key={o.label} className={s.voteRow}>
              <span>{o.label}</span>
              <div className={s.voteTrack}>
                <motion.span
                  className={i === 0 ? s.voteFillLead : undefined}
                  initial={reduce ? false : { width: '0%' }}
                  whileInView={{ width: `${o.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.2 + i * 0.15 }}
                />
              </div>
              <b>{o.pct}%</b>
            </div>
          ))}
        </div>
        <div className={s.tileBody}>
          <h3>{votes.title}</h3>
          <p>{votes.desc}</p>
        </div>
      </TiltCard>

      <TiltCard className={`${s.tile} ${s.tileRank}`} intensity={0.5}>
        <div className={s.rankArt} aria-hidden="true">
          <span className={s.rankHex}>7</span>
          <div className={s.rankLadder}>
            {Array.from({ length: 10 }, (_, i) => (
              <motion.i
                key={i}
                className={i < 7 ? s.rankOn : undefined}
                initial={reduce ? false : { scaleY: 0.2, opacity: 0.3 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200, damping: 18 }}
                style={{ height: `${30 + i * 7}%` }}
              />
            ))}
          </div>
        </div>
        <div className={s.tileBody}>
          <h3>{ranks.title}</h3>
          <p>{ranks.desc}</p>
        </div>
      </TiltCard>

      <TiltCard className={`${s.tile} ${s.tileAi}`} intensity={0.25}>
        <div className={s.aiArt} aria-hidden="true">
          <div className={s.aiBubbleMe}>{ai.prompt}</div>
          <div className={s.aiBubbleBot}>
            <i /><i /><i />
          </div>
        </div>
        <div className={s.tileBody}>
          <h3>{ai.title}</h3>
          <p>{ai.desc}</p>
        </div>
      </TiltCard>
    </div>
  )
}
