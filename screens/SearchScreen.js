import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../lib/auth'
import { browseChannels, createChannel, getOrCreateDm, joinChannel, searchUsers } from '../lib/api'
import { theme } from '../lib/colors'
import Avatar from '../components/Avatar'

export default function SearchScreen({ navigation }) {
  const { profile } = useAuth()
  const [mode, setMode] = useState('people')
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [channels, setChannels] = useState([])
  const [newChannel, setNewChannel] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode !== 'people') return
    const t = setTimeout(async () => {
      try {
        setPeople(await searchUsers(q, profile.id))
      } catch (e) {
        // ignore
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, mode, profile.id])

  useEffect(() => {
    if (mode === 'channels') browseChannels().then(setChannels).catch(() => {})
  }, [mode])

  async function openDm(user) {
    try {
      const roomId = await getOrCreateDm(user.id)
      navigation.replace('Chat', { roomId, kind: 'dm', title: user.username })
    } catch (e) {
      Alert.alert('Could not open chat', e.message)
    }
  }

  async function openChannel(c) {
    try {
      await joinChannel(c.id)
      navigation.replace('Chat', { roomId: c.id, kind: 'channel', title: c.name })
    } catch (e) {
      Alert.alert('Could not join', e.message)
    }
  }

  async function makeChannel() {
    const name = newChannel.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const id = await createChannel(name)
      navigation.replace('Chat', { roomId: id, kind: 'channel', title: name })
    } catch (e) {
      Alert.alert('Could not create channel', e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Tab label="People" active={mode === 'people'} onPress={() => setMode('people')} />
        <Tab label="Channels" active={mode === 'channels'} onPress={() => setMode('channels')} />
      </View>

      {mode === 'people' ? (
        <>
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Search by username…"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <FlatList
            data={people}
            keyExtractor={(u) => u.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userRow} onPress={() => openDm(item)}>
                <Avatar name={item.username} color={item.avatar_color} size={42} />
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.go}>Message ›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.hint}>{q ? 'No users found.' : 'Type a username to find anyone.'}</Text>
            }
          />
        </>
      ) : (
        <>
          <View style={styles.createRow}>
            <TextInput
              style={[styles.input, styles.createInput]}
              value={newChannel}
              onChangeText={setNewChannel}
              placeholder="New channel name…"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.createBtn} onPress={makeChannel} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
            </TouchableOpacity>
          </View>
          <FlatList
            data={channels}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userRow} onPress={() => openChannel(item)}>
                <Avatar name={item.name} channel size={42} />
                <Text style={styles.username}># {item.name}</Text>
                <Text style={styles.go}>Open ›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.hint}>No channels yet — create one above.</Text>}
          />
        </>
      )}
    </View>
  )
}

function Tab({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.surface, alignItems: 'center' },
  tabActive: { backgroundColor: theme.accent },
  tabText: { color: theme.muted, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  input: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  createRow: { flexDirection: 'row', alignItems: 'center' },
  createInput: { flex: 1 },
  createBtn: {
    marginRight: 12,
    marginBottom: 8,
    backgroundColor: theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  username: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '600', marginLeft: 12 },
  go: { color: theme.accentSoft, fontSize: 14, fontWeight: '600' },
  hint: { color: theme.muted, textAlign: 'center', marginTop: 30, fontSize: 14 },
})
