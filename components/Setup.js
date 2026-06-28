import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '../lib/colors'

const STEPS = [
  'Create a free project at supabase.com.',
  'Open the SQL Editor and run supabase/migrations/0001_init.sql.',
  'Open Project Settings → API and copy the Project URL + the anon public key.',
  'Paste them into the .env file (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).',
  'Restart the app with:  npx expo start -c',
]

export default function Setup() {
  const insets = useSafeAreaInsets()
  return (
    <LinearGradient colors={[theme.bgFrom, theme.bgTo]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.center,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.logo}>⚙️</Text>
          <Text style={styles.title}>Connect Supabase</Text>
          <Text style={styles.subtitle}>
            Almost there — point the app at your Supabase project.
          </Text>

          {STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <Text style={styles.note}>
            Supabase is the backend — there's no server to run. This screen
            disappears automatically once valid credentials are detected.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  logo: { fontSize: 44, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 22 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  numText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, color: theme.textDim, fontSize: 15, lineHeight: 21 },
  note: {
    marginTop: 8,
    color: theme.muted,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
  },
})
