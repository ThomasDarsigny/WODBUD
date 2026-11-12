import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { readUnit } from '../../lib/records'
import { formatScore } from '../../lib/scores'
import { fetchWhiteboard, react, REACTIONS, type Reaction, type WhiteboardRow } from '../../lib/whiteboard'
import { useSpaceBase } from '../../hooks/useSpaceBase'
import Skeleton from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'

interface PlanHead { title: string; className: string; date: string; notes: string | null }

/**
 * Le tableau blanc (1.4) : pour une séance programmée dans un cours, qui l'a
 * faite et avec quel score, RX d'abord puis du meilleur au moins bon, avec
 * un « bravo » par personne. Le coach et les membres du cours seulement.
 */
export default function WhiteboardView() {
  const { planId = '' } = useParams()
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const base = useSpaceBase()
  const unit = readUnit()
  const [head, setHead] = useState<PlanHead | null>(null)
  const [rows, setRows] = useState<WhiteboardRow[] | null>(null)
  const [me, setMe] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: auth }, { data: plan }, list] = await Promise.all([
        getLocalUser(),
        supabase.from('class_plans').select('title, notes, scheduled_date, workouts(title), classes(name)').eq('id', planId).maybeSingle(),
        fetchWhiteboard(planId).catch(() => [] as WhiteboardRow[])
      ])
      if (!alive) return
      setMe(auth.user?.id ?? null)
      if (plan) {
        const w = Array.isArray(plan.workouts) ? plan.workouts[0] : plan.workouts
        const c = Array.isArray(plan.classes) ? plan.classes[0] : plan.classes
        setHead({ title: plan.title ?? w?.title ?? t('journal.free_session', { ns: 'workouts' }), className: c?.name ?? '', date: plan.scheduled_date, notes: plan.notes })
      }
      setRows(list)
    })()
    return () => { alive = false }
  }, [planId, t])

  async function toggle(row: WhiteboardRow, emoji: Reaction) {
    if (row.athleteId === me || busy) return
    const next = row.myReaction === emoji ? null : emoji
    setBusy(row.scoreId)
    try {
      await react(row.scoreId, next)
      setRows((list) => (list ?? []).map((r) => r.scoreId === row.scoreId
        ? { ...r, myReaction: next, reactions: r.reactions + (next ? (r.myReaction ? 0 : 1) : -1) }
        : r))
    } finally {
      setBusy(null)
    }
  }

  const date = head ? new Date(`${head.date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <div className="wb-page">
      <Link to={base} className="wb-rec-back">‹ {t('whiteboard.back')}</Link>
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('whiteboard.tag')}{head?.className ? ` · ${head.className}` : ''}</p>
          <h1>{head?.title ?? t('whiteboard.title')}</h1>
          {head && <p className="wb-ph-sub">{date}</p>}
        </div>
      </header>
      {head?.notes && <p className="wb-today-notes">{head.notes}</p>}

      {rows === null ? (
        <Skeleton height={64} lines={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon="rank" title={t('whiteboard.empty')} hint={t('whiteboard.empty_hint')} />
      ) : (
        <ol className="wb-card wb-list wb-board">
          {rows.map((r, i) => (
            <li key={r.scoreId} className={`wb-board-row${r.athleteId === me ? ' is-me' : ''}`}>
              <span className="wb-board-rank">{i + 1}</span>
              {r.avatarUrl ? <img className="wb-board-avatar" src={r.avatarUrl} alt="" width={36} height={36} /> : <span className="wb-board-avatar wb-board-avatar--empty" aria-hidden="true">{(r.fullName ?? '?').charAt(0).toUpperCase()}</span>}
              <span className="wb-row-main">
                <strong>{r.fullName ?? t('whiteboard.anonymous')}{r.athleteId === me ? ` (${t('whiteboard.me')})` : ''}</strong>
                {r.note && <span>{r.note}</span>}
              </span>
              <span className="wb-board-score">
                <b>{formatScore(r, unit)}</b>
                <span className={`wb-pill${r.rx === 'rx' ? ' wb-pill--orange' : ''}`}>{t(`score.rx_${r.rx}`, { ns: 'workouts' })}</span>
              </span>
              <span className="wb-board-react" role="group" aria-label={t('whiteboard.react')}>
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`wb-board-emoji${r.myReaction === e ? ' is-on' : ''}`}
                    aria-pressed={r.myReaction === e}
                    disabled={r.athleteId === me || busy === r.scoreId}
                    onClick={() => { void toggle(r, e) }}
                  >
                    {e}
                  </button>
                ))}
                {r.reactions > 0 && <small>{r.reactions}</small>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
