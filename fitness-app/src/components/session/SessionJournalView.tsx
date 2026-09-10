import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchJournal, groupByMonth, type JournalEntry } from '../../lib/journal'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { label, text } from '../../styles/ui'

/**
 * Journal des séances.
 *
 * Regroupé par mois plutôt qu'en liste plate : « 6 séances en septembre »
 * répond à la question qu'on se pose vraiment en ouvrant un historique —
 * est-ce que je m'entraîne assez régulièrement — là où une suite de dates
 * demande de compter soi-même.
 */
const KIND_ICON: Record<JournalEntry['kind'], NavIconName> = {
  wod: 'workout',
  cardio: 'session',
  free: 'exercises'
}

export default function SessionJournalView() {
  const { t, i18n } = useTranslation(['workouts', 'common'])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchJournal()
      .then((rows) => { if (!cancelled) setEntries(rows) })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('errors.generic', { ns: 'common' }))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  const months = useMemo(
    () => groupByMonth(entries, i18n.language),
    [entries, i18n.language]
  )
  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + (e.active_minutes || 0), 0),
    [entries]
  )

  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 880 }}>
      <div style={{ marginBottom: 'var(--s6)' }}>
        <p style={{ ...label, color: 'var(--orange)', letterSpacing: '0.28em', marginBottom: 'var(--s1)' }}>
          {t('journal.tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: text.h1, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, margin: 0 }}>
          {t('journal.title')}
        </h1>
        {!loading && entries.length > 0 && (
          <p style={{ color: 'var(--muted)', marginTop: 'var(--s2)', marginBottom: 0 }}>
            {t('journal.summary', { count: entries.length, minutes: totalMinutes })}
          </p>
        )}
      </div>

      {loading ? (
        <Skeleton height={68} lines={4} />
      ) : error ? (
        <div style={{ border: '1px solid rgba(255,90,31,0.35)', background: 'rgba(255,90,31,0.08)', padding: 'var(--s4)', color: 'var(--orange)' }}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="session"
          title={t('journal.empty')}
          hint={t('journal.empty_hint')}
        />
      ) : (
        months.map((month) => (
          <section key={month.key} style={{ marginBottom: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s3)', marginBottom: 'var(--s3)', flexWrap: 'wrap' }}>
              <h2 style={{ ...label, color: 'var(--white)', fontSize: text.sm, margin: 0 }}>
                {month.label}
              </h2>
              <span style={{ ...label, fontVariantNumeric: 'tabular-nums', display: 'inline' }}>
                {t('journal.month_summary', { count: month.entries.length, minutes: month.minutes })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
              {month.entries.map((e) => (
                <article
                  key={e.id}
                  style={{ background: 'var(--dark)', padding: 'var(--s4)', display: 'flex', gap: 'var(--s4)', alignItems: 'flex-start' }}
                >
                  <span style={{ color: 'var(--orange)', display: 'flex', marginTop: 2, flexShrink: 0 }}>
                    <NavIcon name={KIND_ICON[e.kind]} size={20} />
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-d)', fontSize: text.h2, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
                      {e.title ?? t('journal.free_session')}
                    </p>
                    <p style={{ ...label, display: 'block', marginTop: 'var(--s1)' }}>
                      {new Date(e.performed_at).toLocaleDateString(i18n.language, {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })}
                    </p>
                    {e.notes && (
                      <p style={{ fontSize: text.sm, color: 'var(--muted)', lineHeight: 1.5, margin: 'var(--s2) 0 0' }}>
                        {e.notes}
                      </p>
                    )}
                  </div>

                  <span style={{ fontFamily: 'var(--font-d)', fontSize: text.h2, fontWeight: 900, color: 'var(--white)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {t('journal.minutes', { minutes: e.active_minutes })}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
