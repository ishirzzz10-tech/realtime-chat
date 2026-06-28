import { memo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Avatar from './Avatar'
import { theme } from '../lib/colors'

function timeShort(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function RoomListItem({ room, onPress }) {
  const isChannel = room.kind === 'channel'
  const title = room.title || (isChannel ? 'channel' : 'Direct message')
  const preview = room.last_image ? '📷 Photo' : room.last_message || 'No messages yet'
  const unread = Number(room.unread_count) || 0

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={title} color={room.avatar_color} channel={isChannel} size={50} />
      <View style={styles.mid}>
        <View style={styles.lineTop}>
          <Text style={styles.title} numberOfLines={1}>
            {isChannel ? `# ${title}` : title}
          </Text>
          <Text style={styles.time}>{timeShort(room.last_at)}</Text>
        </View>
        <View style={styles.lineBot}>
          <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default memo(RoomListItem)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  mid: { flex: 1, marginLeft: 12 },
  lineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineBot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  title: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '700', marginRight: 8 },
  time: { color: theme.muted, fontSize: 11.5 },
  preview: { flex: 1, color: theme.muted, fontSize: 13.5, marginRight: 8 },
  previewUnread: { color: theme.textDim, fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
