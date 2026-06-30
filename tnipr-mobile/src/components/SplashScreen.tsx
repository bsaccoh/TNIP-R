import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme';

const NUM_RINGS = 4;
const BASE_SIZE = 72;

export default function AppSplashScreen() {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#0F1117' : '#EEF2FF';
  const textColor = dark ? '#F1F5F9' : '#1A202C';
  const subColor = dark ? '#64748B' : '#94A3B8';

  // One animated value per ring
  const rings = useRef(
    Array.from({ length: NUM_RINGS }, () => new Animated.Value(0)),
  ).current;

  // Icon pulse
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered ring animations — each ring expands and fades
    const createRingAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const anims = rings.map((r, i) => createRingAnim(r, i * 500));
    anims.forEach((a) => a.start());

    // Subtle icon pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();

    return () => {
      anims.forEach((a) => a.stop());
      pulse.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Signal rings */}
      <View style={styles.ringContainer}>
        {rings.map((anim, i) => {
          const maxSize = BASE_SIZE + 60 + i * 44;
          const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
          const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] });
          return (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: maxSize,
                  height: maxSize,
                  borderRadius: maxSize / 2,
                  borderColor: palette.primary,
                  borderWidth: 1.5 - i * 0.2,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          );
        })}

        {/* Central icon */}
        <Animated.View style={[styles.iconCircle, { backgroundColor: palette.primary, transform: [{ scale: iconScale }] }]}>
          <Ionicons name="cellular" size={32} color="#fff" />
        </Animated.View>
      </View>

      {/* Branding */}
      <Text style={[styles.appName, { color: textColor }]}>TNIP-R</Text>
      <Text style={[styles.tagline, { color: subColor }]}>Drive Tester Portal</Text>

      {/* Loading indicator */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <BounceDot key={i} delay={i * 200} dark={dark} />
        ))}
      </View>
    </View>
  );
}

function BounceDot({ delay, dark }: { delay: number; dark: boolean }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -8, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0,  duration: 350, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: dark ? '#2D3148' : palette.primary + '60', transform: [{ translateY: y }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  iconCircle: {
    width: BASE_SIZE, height: BASE_SIZE, borderRadius: BASE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: palette.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  appName: { fontSize: 36, fontWeight: '800', letterSpacing: 1, marginTop: 24 },
  tagline: { fontSize: 14, letterSpacing: 0.4, marginTop: 6 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 48 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
