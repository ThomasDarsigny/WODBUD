import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '../../stores/classStore'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { useCommunityStore } from '../../stores/communityStore'
import { getLocalUser } from '../../lib/currentUser'
import { formatSlotTime, nextOccurrence, summarizeSlots } from '../../lib/classSlots'
import NavIcon from '../navigation/NavIcon'
import Skeleton from '../ui/Skeleton'
import AthleteClassCard from '../athlete/AthleteClassCard'

/**
 * Groupes (phase 3, 3.6 A) : les cours et les communautés au même endroit.
 * Les deux restent distincts en base ; seule la présentation est commune.
 * Coach : ses cours (vers leur fiche). Athlète : les cours dont il est
 * membre (carte avec horaire, présence, classement). Puis les communautés
 * rejointes, et de quoi en découvrir d'autres.
 */
export default function GroupsView() {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const base = useLocation().pathname.startsWith('/athlete') ? '/athlete' : '/dashboard'
  const coach = base === '/dashboard'
  const { classes, loading: classesLoading, fetchClasses, fetchMyClasses } = useClassStore()
  const slotsByClass = useClassSlotStore((s) => s.byClass)
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)
  const { communities, loading: communitiesLoading, fetchCommunities } = useCommunityStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([coach ? fetchClasses() : fetchMyClasses(), fetchCommunities()]).finally(() => { if (alive) setLoaded(true) })
    getLocalUser().then(({ data }) => { if (alive) setUserId(data.user?.id ?? null) })
    return () => { alive = false }
  }, [coach, fetchClasses, fetchMyClasses, fetchCommunities])

  const classIds = classes.map((c) => c.id).join(',')
  useEffect(() => { if (classIds) void fetchSlots(classIds.split(',')) }, [classIds, fetchSlots])

  const mine = useMemo(() => communities.filter((c) => c.is_member), [communities])
  const busy = !loaded || classesLoading || communitiesLoading
  const nextLabel = (classId: string) => {
    const next = nextOccurrence(slotsByClass[classId] ?? [])
    if (!next) return null
    if (next.ongoing) return t('classes.sched_ongoing', { time: formatSlotTime(next.slot.start_time, lang) })
    const day = new Date(`${next.date}T12:00:00`).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })
    return t('classes.sched_next', { when: `${day} · ${formatSlotTime(next.slot.start_time, lang)}` })
  }

  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('groups.tag')}</p>
          <h1>{t('groups.title')}</h1>
          <p className="wb-ph-sub">{t(coach ? 'groups.subtitle_coach' : 'groups.subtitle_athlete')}</p>
        </div>
        <div className="wb-groups-actions">
          {coach && <Link to="/dashboard/classes?new=1" className="wb-btn wb-btn--primary">+ {t('groups.new_class')}</Link>}
          <Link to={`${base}/communities?new=1`} className={`wb-btn ${coach ? 'wb-btn--secondary' : 'wb-btn--primary'}`}>+ {t('groups.new_community')}</Link>
        </div>
      </header>

      <section className="wb-home-sec" aria-labelledby="groups-classes">
        <div className="wb-sec">
          <h2 id="groups-classes"><span className="wb-groups-kind">{t('groups.kind_class')}</span></h2>
          {coach && classes.length > 0 && <Link to="/dashboard/classes">{t('home.see_all')}</Link>}
        </div>
        {busy && classes.length === 0 ? (
          <Skeleton height={72} />
        ) : classes.length === 0 ? (
          <div className="wb-empty">
            <strong>{t(coach ? 'groups.no_class_coach' : 'groups.no_class_athlete')}</strong>
            <p>{t(coach ? 'groups.no_class_coach_hint' : 'groups.no_class_athlete_hint')}</p>
          </div>
        ) : coach ? (
          <ul className="wb-list">
            {classes.map((c) => {
              const slots = slotsByClass[c.id] ?? []
              const next = nextLabel(c.id)
              return (
                <li key={c.id}>
                  <Link to={`/dashboard/classes?c=${c.id}`} className="wb-row">
                    <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
                    <span className="wb-row-main">
                      <strong>{c.name}</strong>
                      <span>{[slots.length ? summarizeSlots(slots, lang) : c.schedule, next].filter(Boolean).join(' · ') || t('groups.no_schedule')}</span>
                    </span>
                    <span className="wb-row-chev" aria-hidden="true">›</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="wb-groups-cards">
            {classes.map((c) => <AthleteClassCard key={c.id} cls={c} currentUserId={userId} />)}
          </div>
        )}
      </section>

      <section className="wb-home-sec" aria-labelledby="groups-communities">
        <div className="wb-sec">
          <h2 id="groups-communities"><span className="wb-groups-kind is-community">{t('groups.kind_community')}</span></h2>
          <Link to={`${base}/communities`}>{t('groups.discover')}</Link>
        </div>
        {busy && mine.length === 0 ? (
          <Skeleton height={72} />
        ) : mine.length === 0 ? (
          <div className="wb-empty">
            <strong>{t('groups.no_community')}</strong>
            <p>{t('groups.no_community_hint')}</p>
            <Link to={`${base}/communities`} className="wb-btn wb-btn--ghost wb-btn--sm">{t('groups.discover')}</Link>
          </div>
        ) : (
          <ul className="wb-list">
            {mine.map((c) => (
              <li key={c.id}>
                <Link to={`${base}/communities/${c.id}`} className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="community" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{c.name}</strong>
                    <span>{t('community.member_count', { count: c.member_count ?? 0 })}{c.created_by === userId ? ` · ${t('groups.you_created')}` : ''}</span>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
