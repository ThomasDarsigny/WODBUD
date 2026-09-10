import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchClassLeaderboard, type LeaderboardRow } from '../../lib/leaderboard'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { label, text } from '../../styles/ui'

/**
 * Classement d'un cours, par minutes actives cumulées.
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
  // L'état retient POUR QUEL cours il a été chargé. Le coach peut changer de
  // cours sans que le composant soit démonté : sans cette clé, on afficherait
  // le classement du cours précédent pendant le chargement du suivant.
  // Dériver `loading` évite aussi un setState synchrone dans l'effet.
  const [loaded, setLoaded] = useState<{ classId: string; rows: LeaderboardRow[] } | null>(null)
  const ready = loaded?.classId === classId
  const rows = ready ? loaded.rows : []

  useEffect(() => {
    let cancelled = false
    fetchClassLeaderboard(classId)
      .then((r) => { if (!cancelled) setLoaded({ classId, rows: r }) })
      .catch(() => { if (!cancelled) setLoaded({ classId, rows: [] }) })
    return () => { cancelled = true }
  }, [classId])

  if (!ready) return <Skeleton height={44} lines={4} />

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon="rank"
        title={t('leaderboard.empty')}
        hint={t('leaderboard.empty_hint')}
      />
    )
  }

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
              {t('leaderboard.minutes', { minutes: row.totalMinutes })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
