import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types.ts' // généré par Supabase CLI

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)