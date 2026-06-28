import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '../lib/colors'
import { useAuth } from '../lib/auth'
import Avatar from './Avatar'

export default function NameGate() {
  const { signInWithUsername } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const trimmed = name.trim()

  async function join() {
    if (!trimmed || busy) return
    setBusy(true)
    setError('')
    try {
      await signInWithUsername(trimmed)
      // On success this screen unmounts (profile becomes set).
    } catch (e) {
      setError(e.message || 'Could not sign in')
      setBusy(false)
    }
  }

  return (
    <LinearGradient colors={[theme.bgFrom, theme.bgTo]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.logo}>⚡</Text>
          <Text style={styles.title}>Realtime Chat</Text>
          <Text style={styles.subtitle}>Pick a username. Others can find you by it.</Text>

          <Avatar name={trimmed || '?'} size={76} style={styles.avatar} />

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your username"
            placeholderTextColor={theme.muted}
            maxLength={40}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="go"
            editable={!busy}
            onSubmitEditing={join}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!trimmed || busy) && styles.buttonDisabled]}
            disabled={!trimmed || busy}
            activeOpacity={0.85}
            onPress={join}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join chat</Text>}
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
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 22, textAlign: 'center' },
  avatar: { marginBottom: 22 },
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
    marginBottom: 12,
  },
  error: { color: theme.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
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
