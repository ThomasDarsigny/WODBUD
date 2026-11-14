import { supabase } from './supabase'

/** Sujets du formulaire de contact, dans l'ordre affiché (migration 072). */
export const CONTACT_TOPICS = ['center', 'member', 'question', 'press', 'other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export interface ContactInput {
  name: string
  email: string
  topic: ContactTopic
  message: string
  organization?: string
  locale?: string
}

/** 'ok', 'invalid' (champ manquant, courriel mal formé) ou 'rate_limited' ; une panne réseau lève une erreur. */
export type ContactResult = 'ok' | 'invalid' | 'rate_limited'

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const { data, error } = await supabase.rpc('send_contact_message', {
    p_name: input.name,
    p_email: input.email,
    p_topic: input.topic,
    p_message: input.message,
    p_organization: input.organization || undefined,
    p_locale: input.locale
  })
  if (error) throw error
  return data === 'ok' || data === 'rate_limited' ? data : 'invalid'
}
