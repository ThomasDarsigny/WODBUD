import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

/**
 * 6.6 : noter l'entraînement juste après l'effort, d'un toucher (1 à 5).
 * La note va sur la séance ; on peut la changer tant que l'écran est ouvert.
 * Elle nourrit la vue des WODs préférés du centre (6.7).
 */
export default function RateWorkout({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('workouts')
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function rate(value: number) {
    const previous = rating
    setRating(value)
    setSaving(true)
    setError(false)
    const { error: err } = await supabase.from('workout_sessions')
      .update({ rating: value, rated_at: new Date().toISOString() })
      .eq('id', sessionId)
    setSaving(false)
    if (err) { setRating(previous); setError(true) }
  }

  return (
    <div className="wb-rate" role="group" aria-label={t('rating.title')}>
      <p className="wb-rate-title">{t('rating.title')}</p>
      <div className="wb-rate-stars">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            className={`wb-rate-star${rating !== null && v <= rating ? ' is-on' : ''}`}
            aria-pressed={rating === v}
            aria-label={t('rating.star', { count: v })}
            disabled={saving}
            onClick={() => { void rate(v) }}
          >
            ★
          </button>
        ))}
      </div>
      <p className="wb-rate-hint" role="status">
        {error ? t('rating.error') : rating !== null ? t(`rating.label_${rating}`) : t('rating.hint')}
      </p>
    </div>
  )
}
