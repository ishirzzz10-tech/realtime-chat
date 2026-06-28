import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'

function rid() {
  return 'xxxxxxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))
}

// ---- profiles cache (for rendering message senders) -----------------------
const profileCache = new Map()
export function cacheProfile(p) { if (p?.id) profileCache.set(p.id, p) }
export function cachedProfile(id) { return profileCache.get(id) }

export async function getProfiles(ids) {
  const want = [...new Set(ids.filter(Boolean))]
  const missing = want.filter((id) => !profileCache.has(id))
  if (missing.length) {
    const { data } = await supabase.from('profiles').select('id, username, avatar_color').in('id', missing)
    ;(data ?? []).forEach(cacheProfile)
  }
  const out = {}
  want.forEach((id) => { if (profileCache.has(id)) out[id] = profileCache.get(id) })
  return out
}

// ---- directory / rooms ----------------------------------------------------
export async function searchUsers(query, myId) {
  const q = query.trim()
  let req = supabase.from('profiles').select('id, username, avatar_color').order('username').limit(40)
  if (q) req = req.ilike('username', `%${q}%`)
  const { data, error } = await req
  if (error) throw error
  ;(data ?? []).forEach(cacheProfile)
  return (data ?? []).filter((u) => u.id !== myId)
}

export async function getOrCreateDm(otherUserId) {
  const { data, error } = await supabase.rpc('get_or_create_dm', { other_user: otherUserId })
  if (error) throw error
  return data
}

export async function createChannel(name) {
  const { data, error } = await supabase.rpc('create_channel', { p_name: name })
  if (error) throw error
  return data
}

export async function joinChannel(roomId) {
  const { error } = await supabase.rpc('join_channel', { p_room: roomId })
  if (error) throw error
}

export async function browseChannels() {
  const { data, error } = await supabase
    .from('rooms').select('id, name, created_at').eq('kind', 'channel').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function listMyRooms() {
  const { data, error } = await supabase.rpc('my_rooms')
  if (error) throw error
  return data ?? []
}

export async function markRead(roomId) {
  await supabase.rpc('mark_room_read', { p_room: roomId })
}

export async function roomMembers(roomId) {
  const { data, error } = await supabase
    .from('room_members').select('user_id, last_read_at').eq('room_id', roomId)
  if (error) throw error
  return data ?? []
}

// ---- messages -------------------------------------------------------------
export async function loadMessages(roomId, limit = 200) {
  const { data, error } = await supabase
    .from('messages').select('*').eq('room_id', roomId)
    .order('created_at', { ascending: true }).limit(limit)
  if (error) throw error
  return data ?? []
}

export async function sendMessage(roomId, senderId, content, imagePath = null) {
  const body = content?.trim() || null
  if (!body && !imagePath) return
  const { error } = await supabase.from('messages')
    .insert({ room_id: roomId, sender_id: senderId, content: body, image_path: imagePath })
  if (error) throw error
}

export async function editMessage(id, content) {
  const { error } = await supabase.from('messages')
    .update({ content: content.trim(), edited_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteMessage(id) {
  const { error } = await supabase.from('messages')
    .update({ deleted_at: new Date().toISOString(), content: null, image_path: null }).eq('id', id)
  if (error) throw error
}

// ---- reactions ------------------------------------------------------------
export async function loadReactions(roomId) {
  const { data, error } = await supabase
    .from('reactions').select('message_id, user_id, emoji, messages!inner(room_id)')
    .eq('messages.room_id', roomId)
  if (error) throw error
  return (data ?? []).map(({ message_id, user_id, emoji }) => ({ message_id, user_id, emoji }))
}

export async function toggleReaction(messageId, userId, emoji, on) {
  if (on) {
    const { error } = await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('reactions').delete()
      .match({ message_id: messageId, user_id: userId, emoji })
    if (error) throw error
  }
}

// ---- images (Storage) -----------------------------------------------------
export async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('Photo library permission is needed to share images.')
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 })
  if (res.canceled) return null
  return res.assets[0]
}

export async function uploadImage(roomId, asset) {
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
  const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
  const path = `${roomId}/${rid()}.${ext}`
  const { error } = await supabase.storage.from('chat-images')
    .upload(path, decode(base64), { contentType: asset.mimeType || 'image/jpeg' })
  if (error) throw error
  return path
}

const urlCache = new Map()
export async function signedUrl(path) {
  if (!path) return null
  if (urlCache.has(path)) return urlCache.get(path)
  const { data, error } = await supabase.storage.from('chat-images').createSignedUrl(path, 3600)
  if (error) return null
  urlCache.set(path, data.signedUrl)
  return data.signedUrl
}
