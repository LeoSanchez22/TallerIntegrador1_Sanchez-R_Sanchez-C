import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const emptyAuthApi = {
  getSession: async () => ({ data: { session: null }, error: null }),
  refreshSession: async () => ({ data: { session: null }, error: null }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  resetPasswordForEmail: async () => ({ data: null, error: null }),
  updateUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({
    data: {
      subscription: { unsubscribe: () => undefined },
    },
  }),
}

const safeSupabase = {
  auth: emptyAuthApi,
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (safeSupabase as any)
