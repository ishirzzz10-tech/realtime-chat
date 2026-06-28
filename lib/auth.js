import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { avatarColor } from './colors'
import { cacheProfile } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (data) cacheProfile(data)
    setProfile(data ?? null)
    return data ?? null
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) setProfile(null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  // Pick a username -> anonymous sign-in -> create profile -> join #general.
  const signInWithUsername = useCallback(async (username) => {
    const name = username.trim()
    if (!name) throw new Error('Please enter a name')

    let { data: sess } = await supabase.auth.getSession()
    if (!sess.session) {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        if (/disabled/i.test(error.message)) {
          throw new Error('Anonymous sign-in is disabled. Enable it in Supabase → Authentication → Providers → Anonymous.')
        }
        throw error
      }
      sess = { session: data.session }
    }

    const uid = sess.session.user.id
    const { error: upErr } = await supabase
      .from('profiles')
      .upsert({ id: uid, username: name, avatar_color: avatarColor(name) })
    if (upErr) {
      if (upErr.code === '23505') throw new Error('That username is taken — try another.')
      throw upErr
    }
    await supabase.rpc('join_general')
    setSession(sess.session)
    return loadProfile(uid)
  }, [loadProfile])

  const renameProfile = useCallback(async (username) => {
    const name = username.trim()
    if (!name) throw new Error('Please enter a name')
    const { error } = await supabase.from('profiles')
      .update({ username: name, avatar_color: avatarColor(name) })
      .eq('id', session.user.id)
    if (error) {
      if (error.code === '23505') throw new Error('That username is taken — try another.')
      throw error
    }
    return loadProfile(session.user.id)
  }, [session, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, signInWithUsername, renameProfile, signOut,
               reloadProfile: () => loadProfile(session?.user?.id) }}>
      {children}
    </AuthContext.Provider>
  )
}
