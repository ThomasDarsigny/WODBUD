import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useSessionStore } from '../../stores/sessionStore'
import { supabase } from '../../lib/supabase'
import type { WorkoutMethod } from '../../types'
import { METHOD_I18N_KEYS } from '../../types'

export default function WorkoutsLibraryView() {
  const { t } = useTranslation(['common', 'workouts'])
  const { savedWorkouts, fetchWorkouts, workoutsFromCache, error } = useWorkoutStore()
  const startSession = useSessionStore((s) => s.startSession)
  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<WorkoutMethod | 'all'>('all')

  useEffect(() => {
    fetchWorkouts()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
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
    <div style={{ padding: 'var(--page-pad)', minHeight: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
          {t('nav.library')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2.05rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
          {t('library.title')}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.45rem' }}>
          {t('library.subtitle', { count: savedWorkouts.length })}
        </p>
      </div>

      {/* Search + method filters */}
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('library.search_placeholder')}
          style={{
            width: '100%',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            color: 'var(--white)',
            padding: '0.65rem 0.9rem',
            fontFamily: 'var(--font-b)',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <FilterChip label={t('library.all_types')} active={methodFilter === 'all'} onClick={() => setMethodFilter('all')} />
          {(Object.keys(METHOD_I18N_KEYS) as WorkoutMethod[]).map((m) => (
            <FilterChip
              key={m}
              label={t(METHOD_I18N_KEYS[m], { ns: 'common' })}
              active={methodFilter === m}
              onClick={() => setMethodFilter(methodFilter === m ? 'all' : m)}
            />
          ))}
        </div>
      </div>

      {workoutsFromCache && (
        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '0.75rem', fontFamily: 'var(--font-d)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          ◌ {t('library.from_cache')}
        </p>
      )}

      {filtered.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '2.3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
          {savedWorkouts.length === 0 ? t('library.empty') : t('library.no_results')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((w) => {
            const isTemplate = currentUserId != null && w.created_by != null && w.created_by !== currentUserId
            return (
              <div key={w.id} style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--white)', margin: 0 }}>
                    {w.name}
                  </p>
                  <span style={{
                    fontFamily: 'var(--font-d)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: isTemplate ? 'var(--orange)' : 'var(--muted)',
                    border: `1px solid ${isTemplate ? 'rgba(255,77,0,0.35)' : 'var(--border)'}`,
                    background: isTemplate ? 'rgba(255,77,0,0.08)' : 'transparent',
                    padding: '0.12rem 0.4rem', whiteSpace: 'nowrap', flexShrink: 0
                  }}>
                    {isTemplate ? t('library.badge_template') : t('library.badge_mine')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid var(--border)', padding: '0.16rem 0.43rem' }}>
                    {t(METHOD_I18N_KEYS[w.method], { ns: 'common' })}
                  </span>
                  {w.duration_minutes ? (
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.16rem 0.43rem' }}>
                      {w.duration_minutes} {t('fields.duration_unit_min', { ns: 'workouts' })}
                    </span>
                  ) : null}
                </div>

                {w.notes ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>{w.notes}</p>
                ) : null}

                <p style={{ color: 'var(--muted)', fontSize: '0.68rem', margin: 0, opacity: 0.7 }}>
                  {new Date(w.created_at).toLocaleDateString()}
                </p>

                <button
                  onClick={() => {
                    startSession(w.id, w.name)
                    navigate('/dashboard/session')
                  }}
                  style={{
                    marginTop: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.72rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)',
                    background: 'var(--orange)', border: 'none', padding: '0.5rem 0.9rem', cursor: 'pointer'
                  }}
                >
                  ▶ {t('session.start', { ns: 'workouts' })}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && !workoutsFromCache && (
        <div style={{ marginTop: '0.9rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-d)',
        fontSize: '0.66rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'var(--black)' : 'var(--muted)',
        background: active ? 'var(--orange)' : 'transparent',
        border: `1px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
        padding: '0.35rem 0.7rem',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  )
}
