import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../lib/colors'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export default function MessageActionsSheet({ visible, mine, onClose, onReact, onEdit, onDelete }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.emojiRow}>
            {QUICK_EMOJIS.map((e) => (
              <Text
                key={e}
                style={styles.emoji}
                onPress={() => {
                  onReact(e)
                  onClose()
                }}
              >
                {e}
              </Text>
            ))}
          </View>

          {mine && (
            <>
              <Text
                style={styles.action}
                onPress={() => {
                  onEdit()
                  onClose()
                }}
              >
                ✏️   Edit message
              </Text>
              <Text
                style={[styles.action, { color: theme.danger }]}
                onPress={() => {
                  onDelete()
                  onClose()
                }}
              >
                🗑️   Delete message
              </Text>
            </>
          )}

          <Text style={[styles.action, styles.cancel]} onPress={onClose}>
            Cancel
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 12,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  emoji: { fontSize: 30 },
  action: { color: theme.text, fontSize: 16, paddingVertical: 14, paddingHorizontal: 10 },
  cancel: { color: theme.muted, textAlign: 'center', marginTop: 4 },
})
