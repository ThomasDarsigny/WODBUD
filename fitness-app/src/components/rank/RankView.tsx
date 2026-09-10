import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRankStore } from '../../stores/rankStore'
import { computeProgress, formatMinutes, rankDisplay, rankMotto } from '../../lib/ranks'
import RankBadge from './RankBadge'
import { field } from '../../styles/ui'
import BadgeGrid from '../badges/BadgeGrid'
import { useNotificationStore } from '../../stores/notificationStore'

export default function RankView() {
  // Ouvrir cet écran, c'est avoir vu ses badges et son rang : les pastilles
  // s'éteignent ici, et nulle part ailleurs.
  const markProgressSeen = useNotificationStore((s) => s.markProgressSeen)
  useEffect(() => { void markProgressSeen() }, [markProgressSeen])

  const { t, i18n } = useTranslation(['common'])
  const { ranks, profile, shareToken, loading, sharing, error, fetchAll, createShare, revokeShare } = useRankStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => { void fetchAll() }, [fetchAll])

  const lang = i18n.language
  const minutes = profile?.total_minutes ?? 0
  const progress = useMemo(() => computeProgress(ranks, minutes), [ranks, minutes])

  const shareUrl = shareToken ? `${window.location.origin}/rang/${shareToken}` : null

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard refusée (contexte non sécurisé) : le champ reste sélectionnable.
    }
  }

  if (loading && ranks.length === 0) {
    return (
      <div style={{ padding: 'var(--page-pad)', color: 'var(--muted)', fontFamily: 'var(--font-d)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.8125rem' }}>
        {t('rank.loading')}
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 880 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '0.35rem' }}>
          {t('rank.tag')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.03em', margin: 0 }}>
          {t('rank.title')}
        </h1>
      </div>

      {/* Insigne + progression */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.75rem', marginBottom: '1.25rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {progress.current && <RankBadge rank={progress.current} lang={lang} size={140} />}

        <div style={{ flex: 1, minWidth: 240 }}>
          {progress.current && rankMotto(progress.current, lang) && (
            <p style={{ fontFamily: 'var(--font-b)', fontStyle: 'italic', color: 'var(--muted)', margin: '0 0 1.1rem', fontSize: '1rem' }}>
              « {rankMotto(progress.current, lang)} »
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <StatBlock value={formatMinutes(minutes)} label={t('rank.total_minutes')} />
            <StatBlock value={t('rank.days', { count: profile?.current_streak ?? 0 })} label={t('rank.current_streak')} />
            <StatBlock value={t('rank.days', { count: profile?.longest_streak ?? 0 })} label={t('rank.longest_streak')} />
          </div>

          {progress.next ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('rank.next')} — {rankDisplay(progress.next, lang)}
                </span>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                  {t('rank.remaining', { amount: formatMinutes(progress.remaining) })}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--black)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round(progress.ratio * 100)}%`,
                  background: progress.next.color,
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </>
          ) : (
            <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)', margin: 0 }}>
              ★ {t('rank.max')}
            </p>
          )}

          {minutes === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.9rem', marginBottom: 0 }}>
              {t('rank.empty_hint')}
            </p>
          )}
        </div>
      </div>

      {/* Échelle complète */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1.2rem' }}>
          {t('rank.ladder')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {ranks.map((r) => {
            const reached = minutes >= r.min_minutes
            const isCurrent = progress.current?.key === r.key
            return (
              <div
                key={r.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.6rem 0.8rem',
                  border: `1px solid ${isCurrent ? r.color : 'var(--border)'}`,
                  background: isCurrent ? `${r.color}14` : 'transparent',
                  opacity: reached ? 1 : 0.45
                }}
              >
                <span style={{ width: 22, height: 22, flexShrink: 0, border: `2px solid ${reached ? r.color : 'var(--border)'}`, background: reached ? `${r.color}33` : 'transparent', display: 'inline-block', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: reached ? r.color : 'var(--muted)' }}>
                  {rankDisplay(r, lang)}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0 }}>
                  {reached ? t('rank.reached') : t('rank.from', { amount: formatMinutes(r.min_minutes) })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Badges — les rangs mesurent le temps cumulé, les badges des faits
          ponctuels. Les deux vivent sur la page « progression », mais restent
          visuellement distincts : hexagone pour le rang, jeton pour le badge. */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1.2rem' }}>
          {t('badges.title')}
        </h2>
        <BadgeGrid />
      </div>

      {/* Partage */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 0.6rem' }}>
          {t('rank.share_title')}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0 0 1.1rem', lineHeight: 1.5 }}>
          {t('rank.share_hint')}
        </p>

        {shareUrl ? (
          <>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{ ...field, marginBottom: 'var(--s3)' }}
            />
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <SmallButton onClick={handleCopy} variant="primary">
                {copied ? `✓ ${t('rank.share_copied')}` : t('rank.share_copy')}
              </SmallButton>
              <SmallButton onClick={() => { void revokeShare() }} variant="ghost" disabled={sharing}>
                {t('rank.share_revoke')}
              </SmallButton>
            </div>
          </>
        ) : (
          <SmallButton onClick={() => { void createShare() }} variant="primary" disabled={sharing}>
            {t('rank.share_create')}
          </SmallButton>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '0.9rem', padding: '0.65rem 0.9rem', background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', padding: '0.55rem 0.85rem', minWidth: 96 }}>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 900, color: 'var(--white)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.15rem' }}>
        {label}
      </div>
    </div>
  )
}

function SmallButton({ children, onClick, variant, disabled }: {
  children: ReactNode
  onClick: () => void
  variant: 'primary' | 'ghost'
  disabled?: boolean
}) {
  const palette = variant === 'primary'
    ? { color: 'var(--black)', background: 'var(--orange)', border: '1px solid var(--orange)' }
    : { color: 'var(--white)', background: 'transparent', border: '1px solid var(--border)' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', padding: '0.6rem 1.1rem',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, ...palette
      }}
    >
      {children}
    </button>
  )
}
