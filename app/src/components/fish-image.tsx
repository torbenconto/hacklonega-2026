import { useEffect, useId, useMemo } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import artwork from '@/lib/fish-art.json';
import { fishSilhouette, namespaceFishSvg } from '@/lib/fish-art';
import { ui } from './fishing-ui';

type Props = {
  speciesId: string;
  name: string;
  height?: number;
  unlocked?: boolean;
  reveal?: boolean;
  animated?: boolean;
};
const fishArt = artwork as Record<string, string>;

export function FishImage({ speciesId, ...props }: Props) {
  return <FishArtwork key={speciesId} speciesId={speciesId} {...props} />;
}

function FishArtwork({ speciesId, name, height = 140, unlocked = false, reveal = false, animated = true }: Props) {
  const instance = useId();
  const reduced = useReducedMotion();
  const xml = fishArt[speciesId];
  const colorXml = useMemo(() => xml ? namespaceFishSvg(xml, `${instance}-color`) : null, [xml, instance]);
  const blackXml = useMemo(() => xml ? namespaceFishSvg(fishSilhouette(xml), `${instance}-black`) : null, [xml, instance]);
  const color = useSharedValue(unlocked && !reveal ? 1 : 0);
  const swim = useSharedValue(0);
  useEffect(() => {
    color.set(unlocked
      ? withDelay(reveal && !reduced ? 450 : 0, withTiming(1, { duration: 850, reduceMotion: ReduceMotion.System }))
      : 0);
    return () => cancelAnimation(color);
  }, [color, unlocked, reveal, reduced]);
  useEffect(() => {
    swim.set(unlocked && animated && !reduced
      ? withRepeat(withSequence(withTiming(-3, { duration: 1700 }), withTiming(3, { duration: 1700 })), -1, true, undefined, ReduceMotion.System)
      : 0);
    return () => cancelAnimation(swim);
  }, [swim, unlocked, animated, reduced]);
  const swimming = useAnimatedStyle(() => ({ transform: [{ translateY: swim.value }, { rotate: `${swim.value * 0.4}deg` }] }));
  const colors = useAnimatedStyle(() => ({ opacity: color.value }));
  const silhouette = useAnimatedStyle(() => ({ opacity: 1 - color.value }));
  return <View accessible accessibilityRole="image" accessibilityLabel={`${name}, ${unlocked ? 'unlocked illustration' : 'locked silhouette'}`} style={{ height, width: '100%', justifyContent: 'center' }}>
    {colorXml && blackXml ? <Animated.View accessible={false} style={[{ height: '100%', width: '100%' }, swimming]}>
      <Animated.View style={[{ height: '100%', width: '100%' }, silhouette]}><SvgXml xml={blackXml} width="100%" height="100%" accessible={false} /></Animated.View>
      {unlocked && <Animated.View accessible={false} pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, colors]}><SvgXml xml={colorXml} width="100%" height="100%" accessible={false} /></Animated.View>}
    </Animated.View> : <Text style={ui.small}>Illustration unavailable</Text>}
  </View>;
}
