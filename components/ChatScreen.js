import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

import { supabase, USE_EDGE_FUNCTION } from '../lib/supabase'
import { theme, avatarColor } from '../lib/colors'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

const ROOM = 'room:lobby'
const TYPING_IDLE_MS = 1500

export default function ChatScreen({ username, userId, onLogout }) {
  const [messages, setMessages] = useState([])
  const [online, setOnline] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const insets = useSafeAreaInsets()
  const listRef = useRef(null)
  const channelRef = useRef(null)
  const typingTimeout = useRef(null)

  // --- Initial load + realtime subscription --------------------------------
  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message)
        else setMessages(data ?? [])
        setLoading(false)
      })

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: userId } },
    })

    channel
      // New messages from anyone (including this device).
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
          )
        }
      )
      // Who's online right now.
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const names = Object.values(state)
          .map((metas) => metas[0]?.username)
          .filter(Boolean)
        setOnline([...new Set(names)])
      })
      // Typing indicator (ephemeral, not stored in the DB).
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === userId) return
        setTypingUsers((prev) => {
          const others = prev.filter((u) => u !== payload.username)
          return payload.typing ? [...others, payload.username] : others
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ username, userId })
        }
      })

    channelRef.current = channel

    return () => {
      active = false
      clearTimeout(typingTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [username, userId])

  // Keep the latest message in view.
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60)
    return () => clearTimeout(t)
  }, [messages.length, typingUsers.length])

  const broadcastTyping = useCallback(
    (typing) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username, userId, typing },
      })
    },
    [username, userId]
  )

  function handleChangeText(value) {
    setText(value)
    broadcastTyping(true)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => broadcastTyping(false), TYPING_IDLE_MS)
  }

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText('')
    broadcastTyping(false)
    clearTimeout(typingTimeout.current)

    try {
      if (USE_EDGE_FUNCTION) {
        const { error: err } = await supabase.functions.invoke('send-message', {
          body: { content, username, user_id: userId },
        })
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('messages')
          .insert({ content, username, user_id: userId })
        if (err) throw err
      }
    } catch (e) {
      setError(e?.message ?? 'Failed to send message')
      setText(content) // restore so nothing is lost
    } finally {
      setSending(false)
    }
  }

  const canSend = text.trim().length > 0 && !sending
  const onlineLabel = online.length
    ? `${online.length} online · ${online.join(', ')}`
    : 'connecting…'

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.headerFrom, theme.headerTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>⚡ Realtime Chat</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.subtitle} numberOfLines={1}>
                {onlineLabel}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.meAvatar, { backgroundColor: avatarColor(username) }]}>
              <Text style={styles.meAvatarText}>{username[0]?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onLogout} hitSlop={8}>
              <Text style={styles.change}>change</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Body */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
            <Text style={styles.hint}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={item.user_id === userId} />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyEmoji}>👋</Text>
                <Text style={styles.hint}>No messages yet. Say hi!</Text>
              </View>
            }
          />
        )}

        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        {error ? (
          <TouchableOpacity style={styles.error} onPress={() => setError('')}>
            <Text style={styles.errorText}>{error}  (tap to dismiss)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            placeholder="Type a message…"
            placeholderTextColor={theme.muted}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '800' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.online,
    marginRight: 6,
  },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, flexShrink: 1 },
  headerRight: { alignItems: 'center', marginLeft: 12 },
  meAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  meAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  change: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 3 },

  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  hint: { color: theme.muted, fontSize: 14, marginTop: 8 },
  listContent: { paddingVertical: 12, flexGrow: 1 },

  error: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  errorText: { color: theme.danger, fontSize: 13 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    marginLeft: 8,
    height: 44,
    minWidth: 64,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
