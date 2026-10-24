import { useEffect, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function SpringPressable({ style, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable {...props} style={[style, animated]} onPressIn={event => { scale.set(withSpring(0.97, { damping: 20, stiffness: 350, reduceMotion: ReduceMotion.System })); onPressIn?.(event); }} onPressOut={event => { scale.set(withSpring(1, { damping: 12, stiffness: 350, reduceMotion: ReduceMotion.System })); onPressOut?.(event); }} />;
}
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeInDown.duration(300).delay(delay).reduceMotion(ReduceMotion.System)} style={style}>{children}</Animated.View>;
}
export function ProgressBar({ progress, initialProgress = 0, rollover = false, color = '#26705C', label }: { progress: number; initialProgress?: number; rollover?: boolean; color?: string; label: string }) {
  const amount = useSharedValue(initialProgress);
  useEffect(() => {
    const target = Math.max(0, Math.min(1, progress));
    amount.set(rollover
      ? withSequence(withTiming(1, { duration: 400, reduceMotion: ReduceMotion.System }), withTiming(0, { duration: 0 }), withTiming(target, { duration: 550, reduceMotion: ReduceMotion.System }))
      : withTiming(target, { duration: 750, reduceMotion: ReduceMotion.System }));
  }, [amount, progress, rollover]);
  const animated = useAnimatedStyle(() => ({ width: `${amount.value * 100}%` }));
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 8, backgroundColor: '#DFE8DF', overflow: 'hidden' }}><Animated.View style={[{ height: '100%', backgroundColor: color }, animated]} /></View>;
}
