import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import ClassLeaderboard from '../rank/ClassLeaderboard'
import type { Class } from '../../types'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { formatSlotTime, nextOccurrence, summarizeSlots, type ClassSlot } from '../../lib/classSlots'
import { checkIn, fetchMyAttendance, selfCheckInSlot } from '../../lib/attendance'
import { localDate } from '../../lib/scheduledWorkouts'

/**
 * Carte d'un cours pour l'athlète : horaire, prochain cours, « Je suis là »
 * autour de l'heure du cours (3.2), classement replié. Sur l'accueil et dans
 * « Groupes » (3.6).
 */
const NO_SLOTS: ClassSlot[] = []

export default function AthleteClassCard({ cls, currentUserId }: { cls: Class; currentUserId: string | null }) {
  const { t, i18n } = useTranslation('common')
  const slots = useClassSlotStore((s) => s.byClass[cls.id] ?? NO_SLOTS)
  const next = nextOccurrence(slots)
  const lang = i18n.language
  const when = next
    ? next.ongoing
      ? t('classes.sched_ongoing', { time: formatSlotTime(next.slot.start_time, lang) })
      : t('classes.sched_next', { when: `${new Date(`${next.date}T12:00:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatSlotTime(next.slot.start_time, lang)}` })
    : null
  // Présence (3.2) : de 30 min avant à 30 min après le cours du jour.
  const today = localDate()
  const liveSlot = selfCheckInSlot(slots, today)
  const hasLiveSlot = Boolean(liveSlot)
  const [present, setPresent] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState(false)
  useEffect(() => {
    if (!hasLiveSlot || !currentUserId) return
    let alive = true
    fetchMyAttendance(cls.id, currentUserId, today).then((row) => { if (alive) setPresent(Boolean(row)) }).catch(() => { if (alive) setPresent(false) })
    return () => { alive = false }
  }, [hasLiveSlot, currentUserId, cls.id, today])
  async function imHere() {
    setChecking(true)
    setCheckError(false)
    try {
      const result = await checkIn(cls.id, today, null)
      if (result === 'ok' || result === 'already') setPresent(true)
      else setCheckError(true)
    } catch {
      setCheckError(true)
    } finally {
      setChecking(false)
    }
  }
  // Replié par défaut : le classement se charge seulement si on le demande,
  // ce qui évite autant de requêtes que de cours à l'ouverture de l'écran.
  const [showBoard, setShowBoard] = useState(false)

  return (
    <div className="wb-card wb-class-card">
      <div className="wb-class-head">
        <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
        <div>
          <strong>{cls.name}</strong>
          {slots.length ? <span>{summarizeSlots(slots, lang)}</span> : cls.schedule && <span>{cls.schedule}</span>}
        </div>
      </div>
      {when && <p className={`wb-class-next${next?.ongoing ? ' is-live' : ''}`}>{when}</p>}
      {liveSlot && present === true && (
        <p className="wb-class-present">✓ {t('attendance.self_done', { time: formatSlotTime(liveSlot.start_time, lang) })}</p>
      )}
      {liveSlot && present === false && (
        <button type="button" className="wb-btn wb-btn--primary wb-class-here" disabled={checking} onClick={() => { void imHere() }}>
          {t('attendance.self_cta')}
        </button>
      )}
      {checkError && <p className="wb-rec-error" role="alert">{t('attendance.err_error')}</p>}
      {cls.description && <p className="wb-cardio-hint">{cls.description}</p>}
      <button type="button" className="wb-wod-toggle" onClick={() => setShowBoard((v) => !v)} aria-expanded={showBoard}>
        <span aria-hidden="true">{showBoard ? '▾' : '▸'}</span> {showBoard ? t('leaderboard.hide') : t('leaderboard.title')}
      </button>
      {showBoard && <ClassLeaderboard classId={cls.id} currentUserId={currentUserId} />}
    </div>
  )
}
