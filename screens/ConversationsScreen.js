import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../lib/auth'
import { listMyRooms } from '../lib/api'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/colors'
import Avatar from '../components/Avatar'
import RoomListItem from '../components/RoomListItem'

export default function ConversationsScreen({ navigation }) {
  const { profile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setRooms(await listMyRooms())
    } catch (e) {
      // ignore — likely transient; pull-to-refresh available
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Live refresh when anything in my rooms changes (RLS scopes this to me).
  useEffect(() => {
    const ch = supabase
      .channel('overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => {
    navigation.setOptions({
      title: 'Chats',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} hitSlop={8}>
          <Avatar name={profile?.username} color={profile?.avatar_color} size={32} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Search')} hitSlop={8}>
          <Text style={styles.headerAdd}>＋</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, profile])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    )
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(r) => r.room_id}
      renderItem={({ item }) => (
        <RoomListItem
          room={item}
          onPress={() =>
            navigation.navigate('Chat', {
              roomId: item.room_id,
              kind: item.kind,
              title: item.title,
            })
          }
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      contentContainerStyle={rooms.length === 0 && styles.emptyWrap}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>Tap ＋ to search people or open #general.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.ctaText}>Find people</Text>
          </TouchableOpacity>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  headerAdd: { color: theme.accentSoft, fontSize: 28, fontWeight: '600' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 78 },
  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 46, marginBottom: 10 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center', marginBottom: 18 },
  cta: { backgroundColor: theme.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  ctaText: { color: '#fff', fontWeight: '700' },
})
