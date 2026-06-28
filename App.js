import 'react-native-url-polyfill/auto'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { isConfigured } from './lib/supabase'
import { theme } from './lib/colors'
import { AuthProvider, useAuth } from './lib/auth'
import { useNotifications } from './lib/notifications'
import Setup from './components/Setup'
import NameGate from './components/NameGate'
import ConversationsScreen from './screens/ConversationsScreen'
import ChatRoomScreen from './screens/ChatRoomScreen'
import SearchScreen from './screens/SearchScreen'
import ProfileScreen from './screens/ProfileScreen'

const Stack = createNativeStackNavigator()
const navigationRef = createNavigationContainerRef()

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.surface,
    text: theme.text,
    border: theme.border,
    primary: theme.accent,
    notification: theme.accent,
  },
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  )
}

function Root() {
  const { loading, profile } = useAuth()
  useNotifications(profile?.id, navigationRef)

  if (loading) return <Splash />
  if (!profile) return <NameGate />

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="Conversations" component={ConversationsScreen} />
        <Stack.Screen name="Chat" component={ChatRoomScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'New chat' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Setup />
      </SafeAreaProvider>
    )
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
})
