import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Personnalité de l'assistant IA (6.8, 6.9) : un avatar de la collection
 * « Forge » (public/avatars/<id>.svg) et un ton. Gardés sur le profil (061).
 */
export const AI_AVATARS = ['forge', 'titan', 'zen', 'sergent', 'eclair', 'robot', 'kettlebell', 'flamme'] as const
export type AiAvatar = (typeof AI_AVATARS)[number]
export const AI_TONES = ['motivating', 'calm', 'military', 'funny'] as const
export type AiTone = (typeof AI_TONES)[number]

export interface AiPersona { avatar: AiAvatar; tone: AiTone }

export const DEFAULT_PERSONA: AiPersona = { avatar: 'forge', tone: 'motivating' }

export const avatarUrl = (a: AiAvatar) => `/avatars/${a}.svg`

const isAvatar = (v: unknown): v is AiAvatar => typeof v === 'string' && (AI_AVATARS as readonly string[]).includes(v)
const isTone = (v: unknown): v is AiTone => typeof v === 'string' && (AI_TONES as readonly string[]).includes(v)

export async function fetchPersona(): Promise<AiPersona> {
  const { data } = await getLocalUser()
  if (!data.user) return DEFAULT_PERSONA
  const { data: row } = await supabase.from('profiles').select('ai_avatar, ai_tone').eq('id', data.user.id).maybeSingle()
  return {
    avatar: isAvatar(row?.ai_avatar) ? row.ai_avatar : DEFAULT_PERSONA.avatar,
    tone: isTone(row?.ai_tone) ? row.ai_tone : DEFAULT_PERSONA.tone
  }
}

export async function savePersona(p: AiPersona): Promise<void> {
  const { data } = await getLocalUser()
  if (!data.user) throw new Error('not_authenticated')
  const { error } = await supabase.from('profiles').update({ ai_avatar: p.avatar, ai_tone: p.tone }).eq('id', data.user.id)
  if (error) throw error
}
