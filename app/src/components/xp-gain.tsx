import { useEffect, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, ui } from './fishing-ui';

const LEVEL_XP = 300;
const START_DELAY = 650; // Wait for the XP section to finish appearing.
const DURATION = 1500;
const LEVEL_PAUSE = 450;

function feedback(success = false) {
  if (Platform.OS === 'web' || AppState.currentState !== 'active') return;
  const effect = Platform.OS === 'android'
    ? Haptics.performAndroidHapticsAsync(success ? Haptics.AndroidHaptics.Confirm : Haptics.AndroidHaptics.Segment_Frequent_Tick)
    : success
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.selectionAsync();
  void effect.catch(() => {});
}

function LevelSpark({ index }: { index: number }) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.set(withTiming(1, { duration: 950, reduceMotion: ReduceMotion.System }));
    return () => cancelAnimation(travel);
  }, [travel]);
  const angle = index * Math.PI * 2 / 12;
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - travel.value,
    transform: [
      { translateX: Math.cos(angle) * (24 + travel.value * 95) },
      { translateY: Math.sin(angle) * (20 + travel.value * 48) },
      { rotate: `${index * 30 + travel.value * 120}deg` },
      { scale: 1 - travel.value * 0.5 },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: '50%', top: '50%', width: 6, height: index % 2 ? 12 : 6, borderRadius: 2, backgroundColor: index % 2 ? colors.orange : '#78BFA4' }, animated]} />;
}

function LevelUp({ level, reduced }: { level: number; reduced: boolean }) {
  const scale = useSharedValue(reduced ? 1 : 0.65);
  const burst = useSharedValue(0);
  useEffect(() => {
    scale.set(withSpring(1, { damping: 9, stiffness: 220, reduceMotion: ReduceMotion.System }));
    burst.set(withTiming(1, { duration: 850, reduceMotion: ReduceMotion.System }));
    return () => { cancelAnimation(scale); cancelAnimation(burst); };
  }, [burst, scale]);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - burst.value) * 0.8, transform: [{ scale: 0.7 + burst.value * 1.6 }] }));
  return <View accessibilityLiveRegion="polite" accessibilityLabel={`Level up! Level ${level}`} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
    {!reduced && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.orange }, ringStyle]} />
      {Array.from({ length: 12 }, (_, index) => <LevelSpark key={index} index={index} />)}
    </View>}
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 20, backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.orange }, badgeStyle]}>
      <Text accessible={false} style={{ color: colors.orange, fontSize: 34 }}>↑</Text>
      <View style={{ gap: 2 }}><Text style={[ui.eyebrow, { color: colors.orange }]}>LEVEL UP</Text><Text style={{ color: colors.white, fontSize: 28, fontWeight: '800' }}>Level {level}</Text></View>
    </Animated.View>
  </View>;
}

export function XpGain({ before, gained }: { before: number; gained: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState({ earned: reduced ? gained : 0, atBoundary: false });
  useEffect(() => {
    let frame = 0;
    let started: number | null = null;
    let lastTick = 0;
    let lastFeedback = -Infinity;
    let crossedLevel = false;
    const toBoundary = LEVEL_XP - before % LEVEL_XP;
    const crossesLevel = gained >= toBoundary;
    const boundaryTime = DURATION * toBoundary / gained;
    const duration = DURATION + (crossesLevel ? LEVEL_PAUSE : 0);
    const tick = (now: number) => {
      if (started === null) started = now;
      const elapsed = now - started;
      const atBoundary = crossesLevel && elapsed >= boundaryTime && elapsed < boundaryTime + LEVEL_PAUSE;
      const activeElapsed = elapsed - (crossesLevel ? Math.max(0, Math.min(LEVEL_PAUSE, elapsed - boundaryTime)) : 0);
      const earned = atBoundary ? toBoundary : Math.min(gained, Math.floor(gained * activeElapsed / DURATION));
      setDisplay({ earned, atBoundary });
      // Ticks follow five-XP steps, capped to keep the feedback comfortable.
      const step = Math.floor(earned / 5);
      if (elapsed >= duration) {
        setDisplay({ earned: gained, atBoundary: false });
        feedback(true);
        return;
      }
      if (crossesLevel && earned >= toBoundary && !crossedLevel) {
        crossedLevel = true;
        lastTick = step;
        lastFeedback = now;
        feedback(true);
      } else if (!atBoundary && step > lastTick && now - lastFeedback >= 80) {
        lastTick = step;
        lastFeedback = now;
        feedback();
      }
      frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      if (reduced) feedback(true);
      else frame = requestAnimationFrame(tick);
    }, START_DELAY);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [before, gained, reduced]);

  const total = before + display.earned;
  const level = Math.floor(total / LEVEL_XP) + 1;
  const levelUp = level > Math.floor(before / LEVEL_XP) + 1;
  const levelXP = display.atBoundary ? LEVEL_XP : total % LEVEL_XP;
  return <>
    {levelUp && <LevelUp key={level} level={level} reduced={reduced} />}
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={{ color: colors.green, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }}>+{display.earned} XP</Text>
      <Text style={ui.eyebrow}>{`LEVEL ${level} · ${total} XP`}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel="XP toward your next level" accessibilityValue={{ min: 0, max: LEVEL_XP, now: levelXP }} style={{ height: 8, backgroundColor: '#DFE8DF', overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${levelXP / LEVEL_XP * 100}%`, backgroundColor: '#26705C' }} />
    </View>
  </>;
}
