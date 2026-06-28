// ============================================================================
// Edge Function: notify-on-message
// Fired by a DB trigger after every message INSERT. Looks up the room's other
// members, grabs their Expo push tokens, and sends a push via the Expo Push API
// — this is what powers WhatsApp-style "app is closed" notifications.
//
// It re-reads the message from the DB by id (service role), so it only ever
// notifies about real messages even though it's called without a JWT.
//
// Deployed with verify_jwt = false (the database trigger calls it).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}))
    const messageId = payload.message_id ?? payload.record?.id
    if (!messageId) return json({ error: 'missing message_id' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: msg } = await supabase
      .from('messages')
      .select('id, room_id, sender_id, content, image_path, deleted_at')
      .eq('id', messageId)
      .single()
    if (!msg || msg.deleted_at) return json({ skipped: true })

    const [{ data: sender }, { data: room }, { data: members }] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', msg.sender_id).single(),
      supabase.from('rooms').select('kind, name').eq('id', msg.room_id).single(),
      supabase.from('room_members').select('user_id').eq('room_id', msg.room_id).neq('user_id', msg.sender_id),
    ])

    const recipientIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    if (!recipientIds.length) return json({ recipients: 0 })

    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', recipientIds)

    const tokens = [...new Set((tokenRows ?? []).map((t: { token: string }) => t.token))]
      .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'))
    if (!tokens.length) return json({ tokens: 0 })

    const isChannel = room?.kind === 'channel'
    const senderName = sender?.username ?? 'Someone'
    const title = isChannel ? `# ${room?.name ?? 'channel'}` : senderName
    const body = msg.image_path && !msg.content
      ? '📷 Photo'
      : isChannel
        ? `${senderName}: ${msg.content ?? ''}`
        : (msg.content ?? '')

    const data = {
      roomId: msg.room_id,
      kind: room?.kind ?? 'dm',
      title: isChannel ? (room?.name ?? '') : senderName,
    }

    const pushes = tokens.map((to) => ({ to, sound: 'default', title, body, data, channelId: 'default' }))
    for (let i = 0; i < pushes.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(pushes.slice(i, i + 100)),
      })
    }
    return json({ sent: pushes.length })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
