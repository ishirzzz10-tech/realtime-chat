import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme, avatarColor } from '../lib/colors'

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function MessageBubble({ message, mine }) {
  const color = avatarColor(message.username)
  const initial = (message.username?.[0] || '?').toUpperCase()

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      {!mine && (
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}

      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!mine && <Text style={[styles.author, { color }]}>{message.username}</Text>}
        <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  )
}

export default memo(MessageBubble)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: theme.accent,
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: theme.surface,
    borderBottomLeftRadius: 5,
  },
  author: { fontSize: 12.5, fontWeight: '700', marginBottom: 2 },
  text: { color: theme.text, fontSize: 15.5, lineHeight: 21 },
  textMine: { color: theme.onAccent },
  time: { fontSize: 10.5, color: theme.muted, marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
})
