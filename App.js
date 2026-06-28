import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { isConfigured } from './lib/supabase'
import { theme } from './lib/colors'
import NameGate from './components/NameGate'
import ChatScreen from './components/ChatScreen'
import Setup from './components/Setup'

const USER_ID_KEY = 'chat_user_id'
const USERNAME_KEY = 'chat_username'

// Lightweight RFC4122-ish v4 id. Math.random is fine here — this is just a
// stable per-device identity, not a security token.
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState(null)
  const [username, setUsername] = useState(null)

  // Load (or create) the device identity once on startup.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        let id = await AsyncStorage.getItem(USER_ID_KEY)
        if (!id) {
          id = uuid()
          await AsyncStorage.setItem(USER_ID_KEY, id)
        }
        const name = await AsyncStorage.getItem(USERNAME_KEY)
        if (!active) return
        setUserId(id)
        setUsername(name)
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleJoin(name) {
    await AsyncStorage.setItem(USERNAME_KEY, name)
    setUsername(name)
  }

  async function handleLogout() {
    await AsyncStorage.removeItem(USERNAME_KEY)
    setUsername(null)
  }

  let screen
  if (!ready) {
    screen = (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  } else if (!isConfigured) {
    screen = <Setup />
  } else if (!username) {
    screen = <NameGate onJoin={handleJoin} />
  } else {
    screen = <ChatScreen username={username} userId={userId} onLogout={handleLogout} />
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
})
