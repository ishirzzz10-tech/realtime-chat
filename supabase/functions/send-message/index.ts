// ============================================================================
// Edge Function: send-message
// A small serverless "backend" for posting a message. The app can call this
// instead of inserting directly (set EXPO_PUBLIC_USE_EDGE_FUNCTION=true).
//
// Deploy:   supabase functions deploy send-message --no-verify-jwt
// (--no-verify-jwt lets the username-only app call it with just the anon key.)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { content, username, user_id } = await req.json()

    if (
      typeof content !== 'string' || !content.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof user_id !== 'string' || !user_id
    ) {
      return json({ error: 'content, username and user_id are required' }, 400)
    }
    if (content.length > 2000) {
      return json({ error: 'message too long (max 2000 chars)' }, 400)
    }
    if (username.length > 40) {
      return json({ error: 'username too long (max 40 chars)' }, 400)
    }

    // Service-role client runs server-side only — never ships in the app.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('messages')
      .insert({
        content: content.trim(),
        username: username.trim(),
        user_id,
      })
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ message: data }, 200)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
