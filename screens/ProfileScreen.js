import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../lib/auth'
import { theme } from '../lib/colors'
import Avatar from '../components/Avatar'

export default function ProfileScreen() {
  const { profile, renameProfile, signOut } = useAuth()
  const [name, setName] = useState(profile?.username || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const changed = name.trim() && name.trim() !== profile?.username

  async function save() {
    if (!changed || busy) return
    setBusy(true)
    setMsg('')
    try {
      await renameProfile(name)
      setMsg('Saved ✓')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.container}>
      <Avatar name={name || '?'} color={profile?.avatar_color} size={88} style={styles.avatar} />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(t) => {
          setName(t)
          setMsg('')
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={40}
      />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <TouchableOpacity style={[styles.save, !changed && styles.saveOff]} onPress={save} disabled={!changed || busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signout} onPress={signOut}>
        <Text style={styles.signoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Others find you by your username. Signing out clears this anonymous identity on this device.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, alignItems: 'center' },
  avatar: { marginTop: 16, marginBottom: 24 },
  label: { alignSelf: 'flex-start', color: theme.muted, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    width: '100%',
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  msg: { alignSelf: 'flex-start', color: theme.accentSoft, marginTop: 8, fontSize: 13 },
  save: {
    width: '100%',
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveOff: { opacity: 0.4 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  signout: { marginTop: 14, paddingVertical: 12 },
  signoutText: { color: theme.danger, fontWeight: '700', fontSize: 15 },
  note: { color: theme.muted, fontSize: 12.5, textAlign: 'center', marginTop: 18, lineHeight: 18 },
})
