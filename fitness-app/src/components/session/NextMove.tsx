import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../../stores/sessionStore'
import { unlockAudio } from '../../lib/gymCues'
import { formatClock } from '../../lib/sessionTimer'
import { useRestTimer } from './RestBar'

/**
 * Le prochain mouvement du WOD, sous le chrono (constat 06 de l'audit) :
 * nom, répétitions et charge en grand, et « Fait » pour passer au suivant
 * (une série à la fois quand il y en a plusieurs). Dans la carte de la
 * séance et dans le mode salle.
 */
export default function NextMove({ variant }: { variant: 'card' | 'gym' }) {
  const { t } = useTranslation(['workouts', 'common'])
  const items = useSessionStore((s) => s.items)
  const doneIds = useSessionStore((s) => s.doneExerciseIds)
  const setsDone = useSessionStore((s) => s.setsDone)
  const completeSet = useSessionStore((s) => s.completeSet)

  if (items.length === 0) return null
  const index = items.findIndex((i) => !doneIds.includes(i.id))
  if (index === -1) {
    return <p className={`wb-next wb-next--${variant} is-done`} role="status">✓ {t('session.all_moves_done')}</p>
  }

  const next = items[index]
  const total = Math.max(1, next.sets ?? 1)
  const done = Math.min(total, setsDone[next.id] ?? 0)
  const detail = [next.reps, next.weight].filter(Boolean).join(' · ')

  return (
    <div className={`wb-next wb-next--${variant}`}>
      <p className="wb-next-label">
        {t('session.next_up')} <span>{index + 1}/{items.length}</span>
      </p>
      <p className="wb-next-name">{next.name}</p>
      {detail && <p className="wb-next-detail">{detail}</p>}
      <button
        type="button"
        className="wb-next-done"
        onClick={() => { unlockAudio(); completeSet(next.id) }}
        aria-label={total > 1 ? t('session.set_done_for', { n: done + 1, total, name: next.name }) : t('session.move_done_for', { name: next.name })}
      >
        ✓ {total > 1 ? t('session.set_done', { n: done + 1, total }) : t('session.move_done')}
      </button>
    </div>
  )
}

/** Repos en cours, dans le mode salle (la barre de repos est cachée dessous). */
export function GymRest() {
  const { t } = useTranslation(['workouts', 'common'])
  const skipRest = useSessionStore((s) => s.skipRest)
  const { rest, second, item } = useRestTimer()
  if (!rest) return null
  return (
    <div className="wb-gym-rest" role="timer" aria-live="off" aria-label={t('session.rest_label')}>
      <span>{t('session.rest')}{item ? ` · ${item.name}` : ''}</span>
      <strong>{formatClock(second * 1000)}</strong>
      <button type="button" onClick={skipRest}>{t('session.rest_skip')}</button>
    </div>
  )
}
