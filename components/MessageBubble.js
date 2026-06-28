import { memo, useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Avatar from './Avatar'
import { theme, avatarColor } from '../lib/colors'
import { signedUrl } from '../lib/api'

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function MessageBubble({ message, mine, sender, reactions = [], myId, onLongPress, onToggleReaction, seen, isDm }) {
  const [imgUrl, setImgUrl] = useState(null)
  const name = sender?.username || 'unknown'
  const color = sender?.avatar_color || avatarColor(name)
  const deleted = !!message.deleted_at

  useEffect(() => {
    let on = true
    if (message.image_path && !deleted) {
      signedUrl(message.image_path).then((u) => on && setImgUrl(u))
    }
    return () => {
      on = false
    }
  }, [message.image_path, deleted])

  const grouped = {}
  reactions.forEach((r) => {
    ;(grouped[r.emoji] = grouped[r.emoji] || []).push(r.user_id)
  })
  const chips = Object.entries(grouped)

  return (
    <View style={[styles.row, mine ? styles.mineRow : styles.otherRow]}>
      {!mine && <Avatar name={name} color={color} size={30} style={styles.avatar} />}
      <View style={[styles.col, mine && styles.colMine]}>
        <Pressable
          onLongPress={() => !deleted && onLongPress?.(message)}
          delayLongPress={250}
          style={[styles.bubble, mine ? styles.mine : styles.other, deleted && styles.deletedBubble]}
        >
          {!mine && !deleted && <Text style={[styles.author, { color }]}>{name}</Text>}

          {deleted ? (
            <Text style={styles.deletedText}>🚫 message deleted</Text>
          ) : (
            <>
              {imgUrl ? <Image source={{ uri: imgUrl }} style={styles.image} resizeMode="cover" /> : null}
              {message.content ? (
                <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
              ) : null}
            </>
          )}

          <View style={styles.meta}>
            {message.edited_at && !deleted ? (
              <Text style={[styles.edited, mine && styles.metaMine]}>edited</Text>
            ) : null}
            <Text style={[styles.time, mine && styles.metaMine]}>{formatTime(message.created_at)}</Text>
            {mine && isDm && !deleted ? (
              <Text style={[styles.tick, seen && styles.tickSeen]}>{seen ? '✓✓' : '✓'}</Text>
            ) : null}
          </View>
        </Pressable>

        {chips.length > 0 && (
          <View style={[styles.reactions, mine && styles.reactionsMine]}>
            {chips.map(([emoji, users]) => {
              const reacted = users.includes(myId)
              return (
                <Text
                  key={emoji}
                  onPress={() => onToggleReaction?.(message.id, emoji, !reacted)}
                  style={[styles.chip, reacted && styles.chipOn]}
                >
                  {emoji} {users.length}
                </Text>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(MessageBubble)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4, paddingHorizontal: 12 },
  mineRow: { justifyContent: 'flex-end' },
  otherRow: { justifyContent: 'flex-start' },
  avatar: { marginRight: 8 },
  col: { maxWidth: '80%', alignItems: 'flex-start' },
  colMine: { alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { backgroundColor: theme.accent, borderBottomRightRadius: 5 },
  other: { backgroundColor: theme.surface, borderBottomLeftRadius: 5 },
  deletedBubble: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  author: { fontSize: 12.5, fontWeight: '700', marginBottom: 2 },
  text: { color: theme.text, fontSize: 15.5, lineHeight: 21 },
  textMine: { color: theme.onAccent },
  deletedText: { color: theme.muted, fontStyle: 'italic', fontSize: 14 },
  image: { width: 200, height: 200, borderRadius: 12, marginBottom: 4, backgroundColor: theme.surface2 },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3, gap: 5 },
  edited: { fontSize: 10, color: theme.muted, fontStyle: 'italic' },
  time: { fontSize: 10.5, color: theme.muted },
  metaMine: { color: 'rgba(255,255,255,0.75)' },
  tick: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  tickSeen: { color: '#7dd3fc' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, gap: 4 },
  reactionsMine: { justifyContent: 'flex-end' },
  chip: {
    fontSize: 12.5,
    color: theme.textDim,
    backgroundColor: theme.surface2,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: '#3b2f6b', color: '#fff', borderWidth: 1, borderColor: theme.accentSoft },
})
