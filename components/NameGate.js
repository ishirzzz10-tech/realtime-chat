import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, avatarColor } from '../lib/colors'

export default function NameGate({ onJoin }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <LinearGradient colors={[theme.bgFrom, theme.bgTo]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.logo}>⚡</Text>
          <Text style={styles.title}>Realtime Chat</Text>
          <Text style={styles.subtitle}>Pick a display name to join the room.</Text>

          {trimmed ? (
            <View style={[styles.avatar, { backgroundColor: avatarColor(trimmed) }]}>
              <Text style={styles.avatarText}>{trimmed[0].toUpperCase()}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarText}>?</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.muted}
            maxLength={40}
            autoFocus
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => trimmed && onJoin(trimmed)}
          />

          <TouchableOpacity
            style={[styles.button, !trimmed && styles.buttonDisabled]}
            disabled={!trimmed}
            activeOpacity={0.85}
            onPress={() => onJoin(trimmed)}
          >
            <Text style={styles.buttonText}>Join chat</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  logo: { fontSize: 48, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 24, textAlign: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  avatarEmpty: { backgroundColor: theme.surface2 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  input: {
    width: '100%',
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.onAccent, fontSize: 16, fontWeight: '700' },
})
