import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRankStore } from '../../stores/rankStore'
import { computeProgress, formatMinutes, rankDisplay, rankMotto } from '../../lib/ranks'
import { RankEmblem } from './RankBadge'
import RankUpCelebration from './RankUpCelebration'
import { useSearchParams } from 'react-router-dom'
import BadgeGrid from '../badges/BadgeGrid'
import { useNotificationStore } from '../../stores/notificationStore'
import { AnimatedNumber } from '../ui/motion'

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

  // Développement seulement : /dashboard/rank?apercu-montee=<clé> rejoue la
  // célébration de montée en rang sans avoir à cumuler les minutes.
  const [params, setParams] = useSearchParams()
  const previewKey = import.meta.env.DEV ? params.get('apercu-montee') : null
  const previewTo = previewKey ? ranks.find((r) => r.key === previewKey) ?? null : null
  const previewFrom = previewTo ? ranks.find((r) => r.position === previewTo.position - 1) ?? null : null

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
    return <div className="wb-page"><p className="wb-muted-line">{t('rank.loading')}</p></div>
  }

  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{t('rank.tag')}</p>
          <h1>{t('rank.title')}</h1>
        </div>
      </header>

      {/* Insigne + progression */}
      <section className="wb-card wb-card--accent wb-rank-hero">
        <div className="wb-rank-top">
          {/* L'insigne seul : le nom est déjà écrit en grand juste à côté. */}
          {progress.current && <RankEmblem rank={progress.current} lang={lang} size={120} />}
          <div className="wb-rank-id">
            {progress.current && <strong style={{ color: progress.current.color }}>{rankDisplay(progress.current, lang)}</strong>}
            {progress.current && rankMotto(progress.current, lang) && <span>« {rankMotto(progress.current, lang)} »</span>}
          </div>
        </div>

        {progress.next ? (
          <div className="wb-rank-next">
            <div className="wb-rank-next-row">
              <span>{t('rank.next')} — <b style={{ color: progress.next.color }}>{rankDisplay(progress.next, lang)}</b></span>
              <span className="wb-rank-left">{t('rank.remaining', { amount: formatMinutes(progress.remaining) })}</span>
            </div>
            <div className="wb-rank-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(progress.ratio * 100)}%`, background: progress.next.color }} />
            </div>
          </div>
        ) : (
          <p className="wb-rank-max">★ {t('rank.max')}</p>
        )}

        {minutes === 0 && <p className="wb-run-note">{t('rank.empty_hint')}</p>}
      </section>

      <div className="wb-stats">
        <StatBlock value={<AnimatedNumber value={minutes} format={formatMinutes} />} label={t('rank.total_minutes')} />
        <StatBlock value={t('rank.days', { count: profile?.current_streak ?? 0 })} label={t('rank.current_streak')} />
        <StatBlock value={t('rank.days', { count: profile?.longest_streak ?? 0 })} label={t('rank.longest_streak')} />
      </div>

      {/* Échelle complète */}
      <section className="wb-home-sec">
        <div className="wb-sec"><h2>{t('rank.ladder')}</h2></div>
        <ul className="wb-list">
          {ranks.map((r) => {
            const reached = minutes >= r.min_minutes
            const isCurrent = progress.current?.key === r.key
            return (
              <li key={r.key} className={`wb-ladder${reached ? ' is-reached' : ''}${isCurrent ? ' is-current' : ''}`} style={isCurrent ? { background: `${r.color}14` } : undefined}>
                <RankEmblem rank={r} size={34} dimmed={!reached} />
                <span className="wb-ladder-name" style={{ color: reached ? r.color : undefined }}>{rankDisplay(r, lang)}</span>
                <span className="wb-ladder-side">{reached ? t('rank.reached') : t('rank.from', { amount: formatMinutes(r.min_minutes) })}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Badges — les rangs mesurent le temps cumulé, les badges des faits
          ponctuels : hexagone pour le rang, jeton pour le badge. */}
      <section className="wb-home-sec">
        <div className="wb-sec"><h2>{t('badges.title')}</h2></div>
        <div className="wb-card"><BadgeGrid /></div>
      </section>

      {/* Partage */}
      <section className="wb-card wb-rank-share">
        <p className="wb-card-title">{t('rank.share_title')}</p>
        <p className="wb-cardio-hint">{t('rank.share_hint')}</p>
        {shareUrl ? (
          <>
            <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="wb-input" />
            <div className="wb-rank-share-actions">
              <button type="button" className="wb-btn wb-btn--primary" onClick={handleCopy}>
                {copied ? `✓ ${t('rank.share_copied')}` : t('rank.share_copy')}
              </button>
              <button type="button" className="wb-btn wb-btn--ghost" onClick={() => { void revokeShare() }} disabled={sharing}>
                {t('rank.share_revoke')}
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="wb-btn wb-btn--primary" onClick={() => { void createShare() }} disabled={sharing}>
            {t('rank.share_create')}
          </button>
        )}
      </section>

      {error && <div className="wb-rec-error" role="alert">{error}</div>}

      {previewTo && <RankUpCelebration from={previewFrom} to={previewTo} onClose={() => setParams({})} />}
    </div>
  )
}

function StatBlock({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="wb-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
