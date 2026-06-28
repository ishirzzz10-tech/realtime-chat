import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

// True once real credentials are present in .env. Until then the app shows the
// "Connect Supabase" setup screen instead of trying to connect.
export const isConfigured = Boolean(url && anonKey)

// Optional: send messages via the Edge Function instead of a direct insert.
export const USE_EDGE_FUNCTION =
  String(process.env.EXPO_PUBLIC_USE_EDGE_FUNCTION).toLowerCase() === 'true'

// createClient requires a syntactically valid URL/key, so we fall back to
// harmless placeholders when unconfigured. The client is never actually used
// in that state because the UI is gated behind `isConfigured`.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
