import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { theme } from '../lib/colors'

function Dot({ delay }) {
  const value = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 380,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 380,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [delay, value])

  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
  const opacity = value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  return <Animated.View style={[styles.dot, { opacity, transform: [{ translateY }] }]} />
}

export default function TypingIndicator({ users }) {
  let label
  if (users.length === 1) {
    label = `${users[0]} is typing`
  } else if (users.length === 2) {
    label = `${users[0]} and ${users[1]} are typing`
  } else {
    label = `${users[0]} and ${users.length - 1} others are typing`
  }

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        <Dot delay={0} />
        <Dot delay={140} />
        <Dot delay={280} />
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  dots: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.muted,
    marginHorizontal: 2,
  },
  text: { color: theme.muted, fontSize: 12.5, fontStyle: 'italic' },
})
