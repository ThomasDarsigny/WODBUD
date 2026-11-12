import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { fetchMyCenter, isLead } from '../../lib/center'

interface CenterClass {
  class_id: string
  name: string
  schedule: string | null
  coach_id: string
  coach_name: string | null
  members_count: number
  next_plan_date: string | null
}

/**
 * Point 8.1 : le proprio et les chefs voient les cours des autres entraîneurs
 * du centre — qui l'anime, combien de membres, la prochaine séance prévue.
 * Lecture seulement ; rien ne s'affiche pour un entraîneur qui n'est pas chef.
 */
export default function CenterClassesList() {
  const { t, i18n } = useTranslation('common')
  const [data, setData] = useState<{ center: string; list: CenterClass[] } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const mine = await fetchMyCenter().catch(() => null)
      if (!mine || !isLead(mine.role)) return
      const { data: auth } = await getLocalUser()
      const { data: rows, error } = await supabase.rpc('get_center_classes', { p_center: mine.center.id })
      if (error || !alive) return
      const list = (rows ?? [])
        .filter((r) => r.coach_id !== auth.user?.id)
        .map((r) => ({ ...r, members_count: Number(r.members_count) })) as CenterClass[]
      setData({ center: mine.center.name, list })
    })()
    return () => { alive = false }
  }, [])

  if (!data) return null

  return (
    <section className="wb-cclasses" aria-label={t('classes.center_title', { name: data.center })}>
      <p className="wb-cclasses-title">{t('classes.center_title', { name: data.center })}</p>
      {data.list.length === 0 ? (
        <p className="wb-cclasses-empty">{t('classes.center_empty')}</p>
      ) : (
        <ul>
          {data.list.map((c) => (
            <li key={c.class_id}>
              <strong>{c.name}</strong>
              <span>{[c.coach_name ?? t('classes.center_no_coach'), t('classes.center_members', { count: c.members_count })].join(' · ')}</span>
              <span className="wb-cclasses-next">
                {c.next_plan_date
                  ? t('classes.center_next', { date: new Date(`${c.next_plan_date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }) })
                  : t('classes.center_nothing_planned')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
