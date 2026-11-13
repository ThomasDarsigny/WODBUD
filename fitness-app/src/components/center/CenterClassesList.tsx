import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { fetchMyCenter, fetchTeam, isLead, isStaff, type TeamMember } from '../../lib/center'
import { useClassStore } from '../../stores/classStore'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { summarizeSlots } from '../../lib/classSlots'
import ClassScheduleEditor from '../dashboard/ClassScheduleEditor'

interface CenterClass {
  class_id: string
  name: string
  schedule: string | null
  coach_id: string
  coach_name: string | null
  members_count: number
  next_plan_date: string | null
}

interface Loaded {
  centerId: string
  center: string
  me: string | null
  list: CenterClass[]
  coaches: TeamMember[]
}

/**
 * Cours du centre, pour le proprio et les chefs : qui anime chaque cours,
 * combien de membres, la prochaine séance prévue (8.1) ; et l'entraîneur à
 * qui confier le cours (8.3). Rien ne s'affiche pour un entraîneur non chef.
 */
export default function CenterClassesList() {
  const { t, i18n } = useTranslation('common')
  const fetchClasses = useClassStore((s) => s.fetchClasses)
  const [data, setData] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Horaire (3.1, 3.5) : les responsables du centre font l'horaire de la salle.
  const slotsByClass = useClassSlotStore((s) => s.byClass)
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)
  const [scheduleOpen, setScheduleOpen] = useState<string | null>(null)
  const centerIds = (data?.list ?? []).map((c) => c.class_id).join(',')
  useEffect(() => { if (centerIds) void fetchSlots(centerIds.split(',')) }, [centerIds, fetchSlots])

  const load = useCallback(async (): Promise<Loaded | null> => {
    const mine = await fetchMyCenter().catch(() => null)
    if (!mine || !isLead(mine.role)) return null
    const [{ data: auth }, rows, team] = await Promise.all([
      getLocalUser(),
      supabase.rpc('get_center_classes', { p_center: mine.center.id }),
      fetchTeam(mine.center.id).catch(() => [] as TeamMember[])
    ])
    if (rows.error) return null
    return {
      centerId: mine.center.id,
      center: mine.center.name,
      me: auth.user?.id ?? null,
      list: (rows.data ?? []).map((r) => ({ ...r, members_count: Number(r.members_count) })) as CenterClass[],
      coaches: team.filter((m) => isStaff(m.role))
    }
  }, [])

  useEffect(() => {
    let alive = true
    load().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [load])

  async function assign(c: CenterClass, coachId: string) {
    if (!data || coachId === c.coach_id) return
    setBusy(c.class_id)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('assign_class_coach', { p_class: c.class_id, p_coach: coachId })
      if (error) throw error
      const who = data.coaches.find((m) => m.user_id === coachId)?.full_name ?? '—'
      setData(await load())
      // Un cours confié ou repris change la liste « mes cours » juste au-dessus.
      void fetchClasses()
      setMessage({ kind: 'ok', text: t('classes.assigned', { name: c.name, coach: who }) })
    } catch {
      setMessage({ kind: 'err', text: t('errors.generic') })
    } finally {
      setBusy(null)
    }
  }

  if (!data) return null

  return (
    <section className="wb-cclasses" aria-label={t('classes.center_title', { name: data.center })}>
      <p className="wb-cclasses-title">{t('classes.center_title', { name: data.center })}</p>
      {message && <p className={message.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{message.text}</p>}
      {data.list.length === 0 ? (
        <p className="wb-cclasses-empty">{t('classes.center_empty')}</p>
      ) : (
        <ul>
          {data.list.map((c) => (
            <li key={c.class_id}>
              <strong>{c.name}</strong>
              <span>{t('classes.center_members', { count: c.members_count })}</span>
              {(slotsByClass[c.class_id] ?? []).length > 0 && <span className="wb-cclasses-sched">{summarizeSlots(slotsByClass[c.class_id] ?? [], i18n.language)}</span>}
              <span className="wb-cclasses-next">
                {c.next_plan_date
                  ? t('classes.center_next', { date: new Date(`${c.next_plan_date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }) })
                  : t('classes.center_nothing_planned')}
              </span>
              <label className="wb-cclasses-coach">
                <span>{t('classes.coach')}</span>
                <select
                  className="wb-input"
                  value={c.coach_id}
                  disabled={busy !== null}
                  onChange={(e) => { void assign(c, e.target.value) }}
                >
                  {!data.coaches.some((m) => m.user_id === c.coach_id) && (
                    <option value={c.coach_id}>{c.coach_name ?? t('classes.center_no_coach')}</option>
                  )}
                  {data.coaches.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_id === data.me ? t('classes.coach_me', { name: m.full_name ?? '—' }) : m.full_name ?? '—'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="wb-cclasses-schedbtn"
                aria-expanded={scheduleOpen === c.class_id}
                onClick={() => setScheduleOpen((cur) => (cur === c.class_id ? null : c.class_id))}
              >
                {scheduleOpen === c.class_id ? t('classes.sched_done') : t('classes.center_schedule')}
              </button>
              {scheduleOpen === c.class_id && <ClassScheduleEditor classId={c.class_id} legacyText={c.schedule} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
