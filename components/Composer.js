import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { theme } from '../lib/colors'

export default function Composer({
  value,
  onChangeText,
  onSend,
  onAttach,
  sending,
  editing,
  onCancelEdit,
}) {
  const canSend = value.trim().length > 0 && !sending

  return (
    <View style={styles.wrap}>
      {editing ? (
        <View style={styles.editBar}>
          <Text style={styles.editText}>✏️ Editing message</Text>
          <TouchableOpacity onPress={onCancelEdit} hitSlop={8}>
            <Text style={styles.editCancel}>cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.row}>
        {!editing && (
          <TouchableOpacity style={styles.attach} onPress={onAttach} disabled={sending} hitSlop={6}>
            <Text style={styles.attachIcon}>＋</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={editing ? 'Edit your message…' : 'Type a message…'}
          placeholderTextColor={theme.muted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.send, !canSend && styles.sendOff]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>{editing ? '✓' : 'Send'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bg,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  editText: { color: theme.accentSoft, fontSize: 12.5, fontWeight: '600' },
  editCancel: { color: theme.muted, fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8 },
  attach: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: { color: theme.accentSoft, fontSize: 28, fontWeight: '600' },
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
  send: {
    marginLeft: 8,
    height: 44,
    minWidth: 60,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
