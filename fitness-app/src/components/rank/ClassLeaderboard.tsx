import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchClassLeaderboard, type LeaderboardPeriod, type LeaderboardRow } from '../../lib/leaderboard'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { label, text } from '../../styles/ui'

/**
 * Classement d'un cours, par minutes actives — de la semaine, du mois ou cumulées.
 *
 * La semaine est l'onglet par défaut : le total depuis l'inscription place
 * toujours les anciens devant, la semaine remet tout le monde à zéro le lundi.
 *
 * Le podium n'est pas décoré : dans une box, le tableau blanc est un tableau,
 * pas une cérémonie. Seule la première place et la ligne de l'utilisateur
 * courant sont marquées — assez pour se situer, pas assez pour humilier
 * le dernier.
 */
export default function ClassLeaderboard({ classId, currentUserId }: {
  classId: string
  currentUserId?: string | null
}) {
  const { t } = useTranslation('common')
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  // L'état retient POUR QUEL cours et quelle période il a été chargé. Le coach
  // peut changer de cours sans que le composant soit démonté : sans cette clé,
  // on afficherait l'ancien classement pendant le chargement du suivant.
  // Dériver `loading` évite aussi un setState synchrone dans l'effet.
  const [loaded, setLoaded] = useState<{ key: string; rows: LeaderboardRow[] } | null>(null)
  const key = `${classId}:${period}`
  const ready = loaded?.key === key
  const rows = ready ? loaded.rows : []

  useEffect(() => {
    let cancelled = false
    fetchClassLeaderboard(classId, period)
      .then((r) => { if (!cancelled) setLoaded({ key, rows: r }) })
      .catch(() => { if (!cancelled) setLoaded({ key, rows: [] }) })
    return () => { cancelled = true }
  }, [classId, period, key])

  // Semaine ou mois qui commence : tout le monde est inscrit mais à 0. Un
  // classement de zéros ex æquo n'apprend rien, l'état vide le dit mieux.
  const nobodyYet = period !== 'all' && rows.length > 0 && rows.every((r) => r.minutes === 0)

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
        {(['week', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            style={{
              ...label,
              display: 'inline-block',
              whiteSpace: 'nowrap',
              padding: '0.45rem 0.7rem',
              cursor: 'pointer',
              color: period === p ? 'var(--orange)' : 'var(--muted)',
              background: 'transparent',
              border: `1px solid ${period === p ? 'var(--orange)' : 'var(--border)'}`
            }}
          >
            {t(`leaderboard.period_${p}`)}
          </button>
        ))}
      </div>

      {!ready ? (
        <Skeleton height={44} lines={4} />
      ) : rows.length === 0 || nobodyYet ? (
        <EmptyState
          compact
          icon="rank"
          title={t(nobodyYet ? `leaderboard.empty_${period}` : 'leaderboard.empty')}
          hint={t(nobodyYet ? `leaderboard.empty_${period}_hint` : 'leaderboard.empty_hint')}
        />
      ) : (
        <Board rows={rows} currentUserId={currentUserId} />
      )}
    </div>
  )
}

function Board({ rows, currentUserId }: { rows: LeaderboardRow[]; currentUserId?: string | null }) {
  const { t } = useTranslation('common')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
      {rows.map((row) => {
        const isMe = currentUserId != null && row.userId === currentUserId
        const isFirst = row.position === 1
        return (
          <div
            key={row.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s4)',
              padding: 'var(--s3) var(--s4)',
              background: isMe ? 'rgba(255, 90, 31, 0.08)' : 'var(--dark)',
              borderLeft: `2px solid ${isMe ? 'var(--orange)' : 'transparent'}`
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: text.h2,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                color: isFirst ? 'var(--orange)' : 'var(--muted)',
                minWidth: '1.8rem',
                textAlign: 'right',
                flexShrink: 0
              }}
            >
              {row.position}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-d)',
                  fontSize: text.lg,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isMe ? 'var(--orange)' : 'var(--white)'
                }}
              >
                {row.displayName || t('leaderboard.anonymous')}
                {isMe && ` — ${t('leaderboard.you')}`}
              </span>
              {row.currentStreak > 0 && (
                <span style={{ ...label, display: 'block', marginTop: 2 }}>
                  {t('leaderboard.streak', { count: row.currentStreak })}
                </span>
              )}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: text.lg,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--white)',
                flexShrink: 0
              }}
            >
              {t('leaderboard.minutes', { minutes: row.minutes })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
