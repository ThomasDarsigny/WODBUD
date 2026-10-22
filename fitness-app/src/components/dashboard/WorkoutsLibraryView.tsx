import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EmptyState from '../ui/EmptyState'
import WorkoutMannequin from '../mannequin/WorkoutMannequin'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useSessionStore } from '../../stores/sessionStore'
import { getLocalUser } from '../../lib/currentUser'
import type { WorkoutMethod } from '../../types'
import { METHOD_I18N_KEYS } from '../../types'
import { unlockAudio } from '../../lib/gymCues'

export default function WorkoutsLibraryView() {
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const { savedWorkouts, fetchWorkouts, workoutsFromCache, error } = useWorkoutStore()
  const startSession = useSessionStore((s) => s.startSession)
  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<WorkoutMethod | 'all'>('all')
  const [musclesOpenId, setMusclesOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkouts()
    getLocalUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [fetchWorkouts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return savedWorkouts.filter((w) => {
      const methodLabel = t(METHOD_I18N_KEYS[w.method], { ns: 'common' }).toLowerCase()
      const matchesSearch =
        q.length === 0 ||
        w.name.toLowerCase().includes(q) ||
        methodLabel.includes(q) ||
        w.method.toLowerCase().includes(q)
      const matchesMethod = methodFilter === 'all' || w.method === methodFilter
      return matchesSearch && matchesMethod
    })
  }, [savedWorkouts, search, methodFilter, t])

  return (
    <div className="wb-page wb-page--wide">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('nav.library')}</p>
          <h1>{t('library.title')}</h1>
          <p className="wb-ph-sub">{t('library.subtitle', { count: savedWorkouts.length })}</p>
        </div>
        <Link to="/dashboard/workout" className="wb-btn wb-btn--primary">+ {t('home.new_wod')}</Link>
      </header>

      <div className="wb-search">
        <input
          type="search"
          className="wb-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('library.search_placeholder')}
          aria-label={t('library.search_placeholder')}
        />
      </div>
      <div className="wb-chips" role="group" aria-label={t('library.all_types')}>
        <button type="button" className="wb-chip" aria-pressed={methodFilter === 'all'} onClick={() => setMethodFilter('all')}>
          {t('library.all_types')}
        </button>
        {(Object.keys(METHOD_I18N_KEYS) as WorkoutMethod[]).map((m) => (
          <button key={m} type="button" className="wb-chip" aria-pressed={methodFilter === m} onClick={() => setMethodFilter(methodFilter === m ? 'all' : m)}>
            {t(METHOD_I18N_KEYS[m], { ns: 'common' })}
          </button>
        ))}
      </div>

      {workoutsFromCache && <p className="wb-muted-line">◌ {t('library.from_cache')}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          icon={savedWorkouts.length === 0 ? 'library' : 'search'}
          title={savedWorkouts.length === 0 ? t('library.empty') : t('library.no_results')}
          hint={savedWorkouts.length === 0 ? t('library.empty_hint') : t('library.no_results_hint')}
        />
      ) : (
        <div className="wb-grid wb-grid--auto wb-stagger">
          {filtered.map((w) => {
            const isTemplate = currentUserId != null && w.created_by != null && w.created_by !== currentUserId
            const open = musclesOpenId === w.id
            return (
              <article key={w.id} className="wb-card wb-wod">
                <div className="wb-wod-head">
                  <h2>{w.name}</h2>
                  <span className={`wb-pill${isTemplate ? ' wb-pill--orange' : ''}`}>
                    {isTemplate ? t('library.badge_template') : t('library.badge_mine')}
                  </span>
                </div>
                <div className="wb-wod-tags">
                  <span className="wb-pill wb-pill--orange">{t(METHOD_I18N_KEYS[w.method], { ns: 'common' })}</span>
                  {w.duration_minutes ? <span className="wb-pill">{w.duration_minutes} {t('fields.duration_unit_min', { ns: 'workouts' })}</span> : null}
                  <span className="wb-wod-date">{new Date(w.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}</span>
                </div>
                {w.notes ? <p className="wb-wod-notes">{w.notes}</p> : null}

                <button type="button" className="wb-wod-toggle" onClick={() => setMusclesOpenId(open ? null : w.id)} aria-expanded={open}>
                  <span aria-hidden="true">{open ? '▾' : '▸'}</span> {t('mannequin.title', { ns: 'common' })}
                </button>
                {open && <WorkoutMannequin key={w.id} workoutId={w.id} height={220} />}

                <button
                  type="button"
                  className="wb-btn wb-btn--primary wb-btn--block"
                  onClick={() => { unlockAudio(); startSession(w.id, w.name); navigate('/dashboard/session') }}
                >
                  ▶ {t('session.start', { ns: 'workouts' })}
                </button>
              </article>
            )
          })}
        </div>
      )}

      {error && !workoutsFromCache && <div className="wb-rec-error" role="alert">{error}</div>}
    </div>
  )
}
