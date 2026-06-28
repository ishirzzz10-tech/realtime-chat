import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { supabase } from './supabase'

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function registerForPush(userId) {
  // Push needs a real device + a build (won't fully work in Expo Go on SDK 53+).
  if (!Device.isDevice) return null

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
  try {
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data
    await supabase.from('push_tokens').upsert({ user_id: userId, token, platform: Platform.OS })
    return token
  } catch (e) {
    // Most common cause: no EAS projectId yet (run `eas init`). Non-fatal.
    console.log('Push registration skipped:', e?.message)
    return null
  }
}

/**
 * Registers for push when signed in, and navigates to the right room when a
 * notification is tapped. Pass the navigation container ref.
 */
export function useNotifications(userId, navigationRef) {
  const responseSub = useRef(null)

  useEffect(() => {
    if (!userId) return
    registerForPush(userId)

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data
      if (data?.roomId && navigationRef?.current?.isReady()) {
        navigationRef.current.navigate('Chat', {
          roomId: data.roomId,
          title: data.title ?? 'Chat',
          kind: data.kind ?? 'dm',
        })
      }
    })
    return () => responseSub.current?.remove()
  }, [userId, navigationRef])
}
