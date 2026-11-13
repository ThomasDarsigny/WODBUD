import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AI_AVATARS, AI_TONES, avatarUrl, savePersona, type AiPersona } from '../../lib/aiPersona'

/**
 * 6.9 : choisir l'avatar (collection « Forge », 6.8) et le ton de
 * l'assistant. Enregistré sur le profil ; le ton s'applique dès la
 * prochaine réponse.
 */
export default function AiPersonaPicker({ value, onSaved, onClose }: {
  value: AiPersona
  onSaved: (p: AiPersona) => void
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  const [draft, setDraft] = useState<AiPersona>(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function save() {
    setBusy(true)
    setError(false)
    try {
      await savePersona(draft)
      onSaved(draft)
      onClose()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wb-ai-persona" role="group" aria-label={t('ai.persona_title')}>
      <p className="wb-set-label">{t('ai.persona_avatar')}</p>
      <div className="wb-ai-avatars">
        {AI_AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            className="wb-ai-avatar-pick"
            aria-pressed={draft.avatar === a}
            aria-label={t(`ai.avatars.${a}`)}
            onClick={() => setDraft((d) => ({ ...d, avatar: a }))}
          >
            <img src={avatarUrl(a)} alt="" width={56} height={56} />
            <span>{t(`ai.avatars.${a}`)}</span>
          </button>
        ))}
      </div>

      <p className="wb-set-label">{t('ai.persona_tone')}</p>
      <div className="wb-links-chips" role="group" aria-label={t('ai.persona_tone')}>
        {AI_TONES.map((tone) => (
          <button key={tone} type="button" className="wb-chip" aria-pressed={draft.tone === tone} onClick={() => setDraft((d) => ({ ...d, tone }))}>
            {t(`ai.tones.${tone}`)}
          </button>
        ))}
      </div>
      <p className="wb-set-hint is-flush">{t(`ai.tone_hint.${draft.tone}`)}</p>

      {error && <p className="wb-rec-error" role="alert">{t('errors.generic')}</p>}
      <div className="wb-review-actions">
        <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onClose}>{t('actions.cancel')}</button>
        <button type="button" className="wb-btn wb-btn--primary wb-btn--sm" disabled={busy} onClick={() => { void save() }}>
          {busy ? t('status.loading') : t('ai.persona_save')}
        </button>
      </div>
    </div>
  )
}
