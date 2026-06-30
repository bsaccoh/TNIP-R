import { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated, StatusBar, useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, radius, space } from '@/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: 'cellular' as const,
    iconBg: palette.primary,
    accentBg: '#0D2E6E',
    title: 'Welcome to TNIP-R',
    subtitle: 'The National Telecom Inspection & Regulatory Platform for drive test data collection and analysis.',
    light: false,
  },
  {
    key: '2',
    icon: 'navigate' as const,
    iconBg: palette.success,
    accentBg: '#E8F5E9',
    title: 'Record Drive Tests',
    subtitle: 'Capture GPS-tagged signal samples in real time as you drive. RSRP, SINR, throughput — all logged automatically.',
    light: true,
  },
  {
    key: '3',
    icon: 'stats-chart' as const,
    iconBg: palette.purple,
    accentBg: '#EDE7F6',
    title: 'Analyse & Compare',
    subtitle: 'Track KPIs across operators, technologies and time periods. Pinpoint coverage gaps on an interactive map.',
    light: true,
  },
  {
    key: '4',
    icon: 'cloud-upload' as const,
    iconBg: palette.accent,
    accentBg: '#E1F5FE',
    title: 'Upload & Sync',
    subtitle: 'Import Excel and CSV files from field teams. Auto-sync to the NTNIP server over WiFi or mobile data.',
    light: true,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    router.replace('/login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
    const bg = dark ? '#0F1117' : item.accentBg;
    const textPrimary = dark ? '#F1F5F9' : (item.light ? '#1A202C' : '#FFFFFF');
    const textSec = dark ? '#94A3B8' : (item.light ? '#475569' : 'rgba(255,255,255,0.75)');

    return (
      <View style={[styles.slide, { width, backgroundColor: bg }]}>
        {/* Decorative blob behind icon */}
        <View style={[styles.blob, { backgroundColor: item.iconBg + (dark ? '25' : '18') }]} />

        {/* Icon circle */}
        <View style={[styles.iconWrap, { backgroundColor: item.iconBg + (dark ? '30' : '22'), borderColor: item.iconBg + '44' }]}>
          <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={52} color="#fff" />
          </View>
        </View>

        <Text style={[styles.slideTitle, { color: textPrimary }]}>{item.title}</Text>
        <Text style={[styles.slideSubtitle, { color: textSec }]}>{item.subtitle}</Text>
      </View>
    );
  };

  // Dot indicators
  const dots = SLIDES.map((_, i) => {
    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
    const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
    return (
      <Animated.View
        key={i}
        style={[styles.dot, { width: dotWidth, opacity, backgroundColor: SLIDES[index].iconBg }]}
      />
    );
  });

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const dark2 = dark;

  return (
    <View style={[styles.container, { backgroundColor: dark2 ? '#0F1117' : slide.accentBg }]}>
      <StatusBar barStyle={(!dark2 && slide.light) ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish}>
          <Text style={[styles.skipText, { color: dark2 ? '#64748B' : (slide.light ? '#64748B' : 'rgba(255,255,255,0.6)') }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />

      {/* Bottom bar */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dotsRow}>{dots}</View>

        {/* Next / Get Started */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: slide.iconBg }]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Ionicons name={isLast ? 'arrow-forward-circle' : 'chevron-forward'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { position: 'absolute', top: 56, right: space.xl, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, fontWeight: '600' },

  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: 120,
  },
  blob: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    top: '10%',
  },
  iconWrap: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 320,
  },

  bottom: {
    paddingHorizontal: space.xl,
    paddingBottom: 44,
    gap: space.lg,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 16,
    width: width - space.xl * 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
