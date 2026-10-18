import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getLocalUser } from '../lib/currentUser'

/**
 * Lien d'invitation /communities/:id.
 *
 * L'app n'a pas de rôle fixe : on ouvre l'espace athlète pour qui est
 * inscrit à un cours sans en coacher, l'espace coach sinon.
 */
export default function CommunityInviteRedirect() {
  const { t } = useTranslation('common')
  const { id = '' } = useParams<{ id: string }>()
  const [area, setArea] = useState<'/athlete' | '/dashboard' | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user } } = await getLocalUser()
      if (!user) { if (mounted) setArea('/dashboard'); return }
      const [{ count: coaching }, { count: enrolled }] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('coach_id', user.id),
        supabase.from('class_members').select('class_id', { count: 'exact', head: true }).eq('athlete_id', user.id)
      ])
      if (mounted) setArea(!coaching && enrolled ? '/athlete' : '/dashboard')
    })().catch(() => { if (mounted) setArea('/dashboard') })
    return () => { mounted = false }
  }, [])

  if (!area) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--black)', color: 'var(--muted)' }}>
        {t('status.redirect')}
      </div>
    )
  }
  return <Navigate to={`${area}/communities/${id}`} replace />
}
