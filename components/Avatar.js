import { StyleSheet, Text, View } from 'react-native'
import { avatarColor } from '../lib/colors'

export default function Avatar({ name = '?', color, size = 40, channel = false, style }) {
  const bg = channel ? '#334155' : color || avatarColor(name)
  const label = channel ? '#' : (name?.[0] || '?').toUpperCase()
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.44 }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
})
