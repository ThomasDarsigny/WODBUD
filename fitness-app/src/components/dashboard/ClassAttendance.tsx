import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { localDate } from '../../lib/scheduledWorkouts'
import { shiftDate } from '../../lib/planWeek'
import { slotsOn, formatSlotTime, type ClassSlot } from '../../lib/classSlots'
import { checkInPath, expectedSessions, fetchAttendanceBetween, markPresent, openCheckIn, removeAttendance, type Attendance } from '../../lib/attendance'
import type { ClassMember } from '../../types'
import { Avatar } from '../community/communityUi'

const NO_MEMBERS: ClassMember[] = []
const NO_SLOTS: ClassSlot[] = []
const WINDOW_DAYS = 30
const POLL_MS = 10_000

/**
 * Présences du cours (3.2) : le QR de la séance à afficher à la salle, la
 * liste des membres à cocher, et l'assiduité de chacun sur 30 jours.
 */
export default function ClassAttendance({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const members = useClassStore((s) => s.members[classId] ?? NO_MEMBERS)
  const slots = useClassSlotStore((s) => s.byClass[classId] ?? NO_SLOTS)
  const today = localDate()
  const from = shiftDate(today, -(WINDOW_DAYS - 1))
  const [day, setDay] = useState(today)
  const [rows, setRows] = useState<Attendance[] | null>(null)
  const [qr, setQr] = useState<{ code: string; expires_at: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => fetchAttendanceBetween(classId, from, today), [classId, from, today])

  useEffect(() => {
    let alive = true
    load().then((r) => { if (alive) setRows(r) }).catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [load])

  // QR affiché : la liste suit les scans sans recharger la page.
  useEffect(() => {
    if (!qr) return
    const id = window.setInterval(() => { load().then(setRows).catch(() => {}) }, POLL_MS)
    return () => window.clearInterval(id)
  }, [qr, load])

  const ofDay = useMemo(() => new Map((rows ?? []).filter((r) => r.session_date === day).map((r) => [r.user_id, r])), [rows, day])
  const countBy = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1)
    return m
  }, [rows])
  const expected = expectedSessions(slots, from, today)
  const daySlots = slotsOn(slots, day)
  const name = (m: ClassMember) => m.profile?.full_name || t('attendance.member')
  const sorted = [...members].sort((a, b) => name(a).localeCompare(name(b), lang))
  const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })

  async function showQr() {
    setError(null)
    try { setQr(await openCheckIn(classId)) } catch { setError(t('errors.generic')) }
  }

  async function toggle(m: ClassMember) {
    const current = ofDay.get(m.athlete_id)
    setBusy(m.athlete_id)
    setError(null)
    try {
      if (current) {
        await removeAttendance(current.id)
        setRows((r) => (r ?? []).filter((x) => x.id !== current.id))
      } else {
        const row = await markPresent(classId, m.athlete_id, day)
        setRows((r) => [...(r ?? []), row])
      }
    } catch {
      setError(t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  const url = qr ? `${window.location.origin}${checkInPath(classId, qr.code)}` : ''
  const expires = qr ? new Date(qr.expires_at) : null
  const until = expires ? formatSlotTime(`${expires.getHours()}:${expires.getMinutes()}`, lang) : ''

  return (
    <section className="wb-att" aria-labelledby={`att-${classId}`}>
      <div className="wb-att-head">
        <h2 id={`att-${classId}`} className="wb-sched-title">{t('attendance.title')}</h2>
        <div className="wb-att-day">
          <button type="button" className="wb-week-arrow" disabled={day <= from} onClick={() => setDay(shiftDate(day, -1))} aria-label={t('attendance.day_prev')}>‹</button>
          <strong>{day === today ? t('attendance.today') : fmtDay(day)}</strong>
          <button type="button" className="wb-week-arrow" disabled={day >= today} onClick={() => setDay(shiftDate(day, 1))} aria-label={t('attendance.day_next')}>›</button>
        </div>
      </div>

      <p className="wb-att-summary">
        {rows === null ? t('status.loading') : t('attendance.summary', { count: ofDay.size, total: members.length })}
        {daySlots.length > 0 && <span> · {daySlots.map((s) => formatSlotTime(s.start_time, lang)).join(', ')}</span>}
        {slots.length > 0 && daySlots.length === 0 && <span> · {t('attendance.no_class_day')}</span>}
      </p>

      {day === today && (
        qr ? (
          <div className="wb-att-qr">
            <div className="wb-att-qr-code"><QRCodeSVG value={url} size={220} marginSize={2} title={t('attendance.qr_title')} /></div>
            <div className="wb-att-qr-text">
              <p>{t('attendance.qr_hint', { time: until })}</p>
              <p className="wb-set-hint" style={{ margin: 0 }}>{t('attendance.qr_live')}</p>
              <div className="wb-review-actions" style={{ justifyContent: 'flex-start' }}>
                <a href={`/tv/${classId}`} target="_blank" rel="noopener" className="wb-btn wb-btn--secondary wb-btn--sm">{t('tv.open')}</a>
                <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={() => setQr(null)}>{t('attendance.qr_hide')}</button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="wb-btn wb-btn--primary wb-btn--sm wb-att-qr-open" onClick={() => { void showQr() }}>{t('attendance.qr_show')}</button>
        )
      )}

      {error && <p className="wb-rec-error" role="alert">{error}</p>}

      {members.length === 0 ? (
        <p className="wb-set-hint" style={{ margin: 0 }}>{t('attendance.no_members')}</p>
      ) : (
        <ul className="wb-att-list">
          {sorted.map((m) => {
            const row = ofDay.get(m.athlete_id)
            const count = countBy.get(m.athlete_id) ?? 0
            return (
              <li key={m.athlete_id} className={`wb-att-row${row ? ' is-present' : ''}`}>
                <Avatar name={name(m)} url={null} size={32} />
                <span className="wb-att-who">
                  <strong>{name(m)}</strong>
                  <small>{expected > 0 ? t('attendance.rate', { count, total: expected }) : t('attendance.rate_free', { count })}</small>
                </span>
                {row && <span className="wb-pill wb-att-method">{t(`attendance.method_${row.method}`)}</span>}
                <button
                  type="button"
                  className="wb-att-toggle"
                  aria-pressed={Boolean(row)}
                  aria-label={t('attendance.mark_for', { name: name(m) })}
                  disabled={busy === m.athlete_id}
                  onClick={() => { void toggle(m) }}
                >
                  {row ? '✓' : ''}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
