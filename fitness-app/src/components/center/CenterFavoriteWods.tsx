import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { fetchMyCenter, isStaff } from '../../lib/center'

interface Fav {
  workout_id: string
  title: string
  author_name: string | null
  ratings: number
  average: number | null
  sessions: number
  last_done: string | null
}

/**
 * 6.7 : les WODs préférés du centre, pour l'équipe. Des moyennes seulement,
 * jamais qui a noté quoi ; sous 3 notes, la base ne donne pas de moyenne.
 */
export default function CenterFavoriteWods() {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<Fav[] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const c = await fetchMyCenter().catch(() => null)
      if (!c || !isStaff(c.role)) return
      const { data, error } = await supabase.rpc('get_center_favorite_wods', { p_center: c.center.id })
      if (!alive) return
      setItems(error ? [] : (data ?? []).map((r) => ({
        ...r,
        ratings: Number(r.ratings),
        sessions: Number(r.sessions),
        average: r.average === null ? null : Number(r.average)
      })) as Fav[])
    })()
    return () => { alive = false }
  }, [])

  if (items === null) return null

  return (
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{t('favorites.title')}</h2></div>
      {items.length === 0 ? (
        <div className="wb-card wb-review-empty">{t('favorites.empty')}</div>
      ) : (
        <ul className="wb-card wb-list wb-fav">
          {items.slice(0, 8).map((f, i) => (
            <li key={f.workout_id}>
              <span className="wb-fav-rank" aria-hidden="true">{i + 1}</span>
              <span className="wb-row-main">
                <strong>{f.title}</strong>
                <span>{[f.author_name, t('favorites.sessions', { count: f.sessions })].filter(Boolean).join(' · ')}</span>
              </span>
              {f.average !== null ? (
                <span className="wb-fav-score" aria-label={t('favorites.score_label', { average: f.average, count: f.ratings })}>
                  ★ {f.average.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <small>{t('favorites.ratings', { count: f.ratings })}</small>
                </span>
              ) : (
                <span className="wb-fav-few">{t('favorites.too_few', { count: f.ratings })}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="wb-set-hint" style={{ margin: '0.5rem 0 0' }}>{t('favorites.privacy')}</p>
    </section>
  )
}
