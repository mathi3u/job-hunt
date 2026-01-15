import { createClient } from '@supabase/supabase-js'
import type { Job } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
