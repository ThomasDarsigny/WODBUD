// @ts-ignore Edge Function Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get(name: string): string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

/**
 * Suppression de compte, en deux appels.
 *
 * 1) `{ confirm: false }` (ou omis) — lit l'ampleur de ce qui va disparaître
 *    et la renvoie, sans rien supprimer. Le client l'affiche avant de
 *    demander confirmation.
 * 2) `{ confirm: true }` — supprime réellement.
 *
 * Une seule opération suffit à tout effacer : `profiles.id` référence
 * `auth.users(id) on delete cascade`, et toutes les tables qui comptent
 * (classes, communities, workouts, exercise_votes, workout_sessions,
 * class_members, community_members, vote_sessions, rank_shares,
 * user_badges, scheduled_workouts) cascadent depuis profiles ou
 * directement depuis auth.users. `admin.deleteUser()` fait un DELETE FROM
 * auth.users en dur (pas un ban) par défaut — c'est ce déclencheur qu'on
 * utilise, plutôt que de supprimer les tables une par une et risquer d'en
 * oublier une ou de se tromper dans l'ordre.
 *
 * Garde-fou : un admin ne peut pas s'auto-supprimer. L'app n'a aujourd'hui
 * aucun moyen de désigner un autre admin depuis l'interface — le laisser
 * faire retirerait toute capacité de curation de la bibliothèque
 * d'exercices, pour tout le monde, sans recours.
 *
 * Cas particulier : un coach qui supprime son compte supprime aussi ses
 * classes et les communautés qu'il a créées (cascade), ce qui retire ses
 * athlètes de ces classes, efface les votes qui s'y rattachaient, et
 * retire les membres des communautés qu'il avait créées. Le résumé le dit
 * explicitement — c'est la seule chose qu'on ne peut pas cacher sans
 * tromper la personne qui supprime son compte.
 */

interface Impact {
  classesOwned: number
  athletesAffected: number
  votesSessionsOwned: number
  workoutsCreated: number
  sessionsLogged: number
  scheduledCount: number
  communitiesOwned: number
  communityMembersAffected: number
}

async function computeImpact(
  adminClient: ReturnType<typeof createClient>,
  userId: string
): Promise<Impact> {
  const { data: classes } = await adminClient
    .from('classes')
    .select('id')
    .eq('coach_id', userId)
  const classIds = (classes ?? []).map((c: { id: string }) => c.id)

  let athletesAffected = 0
  if (classIds.length > 0) {
    const { data: members } = await adminClient
      .from('class_members')
      .select('athlete_id')
      .in('class_id', classIds)
    athletesAffected = new Set((members ?? []).map((m: { athlete_id: string }) => m.athlete_id)).size
  }

  const [{ count: votesSessionsOwned }, { count: workoutsCreated }, { count: sessionsLogged }, { count: scheduledCount }] =
    await Promise.all([
      adminClient.from('vote_sessions').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
      adminClient.from('workouts').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      adminClient.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      adminClient.from('scheduled_workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ])

  const { data: ownedCommunities } = await adminClient
    .from('communities')
    .select('id')
    .eq('created_by', userId)
  const communityIds = (ownedCommunities ?? []).map((c: { id: string }) => c.id)

  let communityMembersAffected = 0
  if (communityIds.length > 0) {
    const { data: communityMembers } = await adminClient
      .from('community_members')
      .select('user_id')
      .in('community_id', communityIds)
      .neq('user_id', userId) // le créateur n'est pas "affecté" par la perte de sa propre communauté
    communityMembersAffected = new Set((communityMembers ?? []).map((m: { user_id: string }) => m.user_id)).size
  }

  return {
    classesOwned: classIds.length,
    athletesAffected,
    votesSessionsOwned: votesSessionsOwned ?? 0,
    workoutsCreated: workoutsCreated ?? 0,
    sessionsLogged: sessionsLogged ?? 0,
    scheduledCount: scheduledCount ?? 0,
    communitiesOwned: communityIds.length,
    communityMembersAffected
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Secrets Supabase manquants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const {
      data: { user },
      error: userError
    } = await adminClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (adminRow) {
      return new Response(
        JSON.stringify({ error: 'Un compte admin ne peut pas être auto-supprimé. Retire ce rôle ou fais désigner un autre admin d\'abord.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const confirm = body?.confirm === true

    const impact = await computeImpact(adminClient, user.id)

    if (!confirm) {
      return new Response(JSON.stringify({ impact }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, false)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('delete-account error:', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
