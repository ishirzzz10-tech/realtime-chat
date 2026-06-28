import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/colors'
import {
  cachedProfile,
  deleteMessage,
  editMessage,
  getProfiles,
  loadMessages,
  loadReactions,
  markRead,
  pickImage,
  roomMembers,
  sendMessage,
  toggleReaction,
  uploadImage,
} from '../lib/api'
import MessageBubble from '../components/MessageBubble'
import Composer from '../components/Composer'
import TypingIndicator from '../components/TypingIndicator'
import MessageActionsSheet from '../components/MessageActionsSheet'

const TYPING_IDLE_MS = 1500

function addReaction(map, r) {
  const arr = map[r.message_id] ? [...map[r.message_id]] : []
  if (!arr.some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) {
    arr.push({ user_id: r.user_id, emoji: r.emoji })
  }
  return { ...map, [r.message_id]: arr }
}
function removeReaction(map, r) {
  if (!map[r.message_id]) return map
  return { ...map, [r.message_id]: map[r.message_id].filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji)) }
}

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, kind, title } = route.params
  const { profile } = useAuth()
  const myId = profile.id
  const myName = profile.username
  const isDm = kind === 'dm'
  const headerHeight = useHeaderHeight()

  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [members, setMembers] = useState([])
  const [, setProfilesTick] = useState(0)
  const [online, setOnline] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  const listRef = useRef(null)
  const channelRef = useRef(null)
  const typingTimeout = useRef(null)

  const ensureProfiles = useCallback(async (ids) => {
    const need = ids.filter((id) => id && !cachedProfile(id))
    if (need.length) {
      await getProfiles(need)
      setProfilesTick((n) => n + 1)
    }
  }, [])

  // ---- initial load + realtime ---------------------------------------------
  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const [msgs, reacts, mems] = await Promise.all([
          loadMessages(roomId),
          loadReactions(roomId),
          roomMembers(roomId),
        ])
        if (!active) return
        const rmap = {}
        reacts.forEach((r) => {
          ;(rmap[r.message_id] = rmap[r.message_id] || []).push({ user_id: r.user_id, emoji: r.emoji })
        })
        await ensureProfiles([...new Set([...msgs.map((m) => m.sender_id), ...mems.map((m) => m.user_id)])])
        if (!active) return
        setMessages(msgs)
        setReactions(rmap)
        setMembers(mems)
        setLoading(false)
        markRead(roomId)
      } catch (e) {
        if (active) {
          setLoading(false)
          Alert.alert('Could not open chat', e.message)
        }
      }
    })()

    const channel = supabase.channel(`room:${roomId}`, { config: { presence: { key: myId } } })

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const m = payload.new
          await ensureProfiles([m.sender_id])
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
          if (m.sender_id !== myId) markRead(roomId)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => prev.map((x) => (x.id === payload.new.id ? payload.new : x)))
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
        (payload) => setReactions((prev) => addReaction(prev, payload.new)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' },
        (payload) => setReactions((prev) => removeReaction(prev, payload.old)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => setMembers((prev) => prev.map((mm) => (mm.user_id === payload.new.user_id ? payload.new : mm))))
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const names = Object.values(state).map((metas) => metas[0]?.username).filter(Boolean)
        setOnline([...new Set(names)])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === myId) return
        setTypingUsers((prev) => {
          const others = prev.filter((u) => u !== payload.username)
          return payload.typing ? [...others, payload.username] : others
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ username: myName, userId: myId })
      })

    channelRef.current = channel
    return () => {
      active = false
      clearTimeout(typingTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [roomId, myId, myName, ensureProfiles])

  // ---- header (title + presence) -------------------------------------------
  const subtitle = useMemo(() => {
    if (isDm) return online.includes(title) ? 'online' : 'offline'
    return `${online.length} online`
  }, [isDm, online, title])

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <Text style={styles.hTitle} numberOfLines={1}>{kind === 'channel' ? `# ${title}` : title}</Text>
          <Text style={[styles.hSub, { color: subtitle === 'online' || online.length ? theme.online : theme.muted }]}>
            {subtitle}
          </Text>
        </View>
      ),
    })
  }, [navigation, title, kind, subtitle, online.length])

  // ---- auto-scroll ----------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60)
    return () => clearTimeout(t)
  }, [messages.length, typingUsers.length])

  // ---- typing ---------------------------------------------------------------
  const broadcastTyping = useCallback((typing) => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { username: myName, userId: myId, typing } })
  }, [myName, myId])

  function onChangeText(v) {
    setText(v)
    if (editing) return
    broadcastTyping(true)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => broadcastTyping(false), TYPING_IDLE_MS)
  }

  // ---- send / edit / image --------------------------------------------------
  async function handleSend() {
    if (editing) {
      const content = text.trim()
      if (!content) return
      setSending(true)
      try {
        await editMessage(editing.id, content)
        setEditing(null)
        setText('')
      } catch (e) {
        Alert.alert('Could not edit', e.message)
      } finally {
        setSending(false)
      }
      return
    }
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    broadcastTyping(false)
    clearTimeout(typingTimeout.current)
    try {
      await sendMessage(roomId, myId, content)
    } catch (e) {
      Alert.alert('Could not send', e.message)
      setText(content)
    } finally {
      setSending(false)
    }
  }

  async function handleAttach() {
    try {
      const asset = await pickImage()
      if (!asset) return
      setSending(true)
      const path = await uploadImage(roomId, asset)
      await sendMessage(roomId, myId, null, path)
    } catch (e) {
      Alert.alert('Image error', e.message)
    } finally {
      setSending(false)
    }
  }

  // ---- reactions / actions --------------------------------------------------
  function onToggleReaction(messageId, emoji, on) {
    setReactions((prev) =>
      on ? addReaction(prev, { message_id: messageId, user_id: myId, emoji })
         : removeReaction(prev, { message_id: messageId, user_id: myId, emoji }))
    toggleReaction(messageId, myId, emoji, on).catch(() => {})
  }

  function startEdit(m) {
    setEditing(m)
    setText(m.content || '')
  }
  function confirmDelete(m) {
    Alert.alert('Delete message?', 'This removes it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(m.id).catch((e) => Alert.alert('Error', e.message)) },
    ])
  }

  const otherMember = useMemo(() => members.find((m) => m.user_id !== myId), [members, myId])
  const renderItem = useCallback(({ item }) => {
    const mine = item.sender_id === myId
    const sender = cachedProfile(item.sender_id)
    const seen = isDm && otherMember && new Date(otherMember.last_read_at).getTime() >= new Date(item.created_at).getTime()
    return (
      <MessageBubble
        message={item}
        mine={mine}
        sender={sender}
        reactions={reactions[item.id]}
        myId={myId}
        isDm={isDm}
        seen={seen}
        onLongPress={setActionMsg}
        onToggleReaction={onToggleReaction}
      />
    )
  }, [myId, isDm, otherMember, reactions])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          extraData={reactions}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.hint}>No messages yet. Say hi!</Text>
            </View>
          }
        />
      )}

      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

      <Composer
        value={text}
        onChangeText={onChangeText}
        onSend={handleSend}
        onAttach={handleAttach}
        sending={sending}
        editing={!!editing}
        onCancelEdit={() => {
          setEditing(null)
          setText('')
        }}
      />

      <MessageActionsSheet
        visible={!!actionMsg}
        mine={actionMsg?.sender_id === myId}
        onClose={() => setActionMsg(null)}
        onReact={(emoji) => actionMsg && onToggleReaction(actionMsg.id, emoji, true)}
        onEdit={() => actionMsg && startEdit(actionMsg)}
        onDelete={() => actionMsg && confirmDelete(actionMsg)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emoji: { fontSize: 40, marginBottom: 8 },
  hint: { color: theme.muted, fontSize: 14 },
  list: { paddingVertical: 12, flexGrow: 1 },
  hTitle: { color: theme.text, fontSize: 16, fontWeight: '700', maxWidth: 220 },
  hSub: { fontSize: 11, marginTop: 1 },
})
