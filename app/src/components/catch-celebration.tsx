import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import type { Species } from '@/lib/api';
import { measurement } from '@/lib/collection';
import { FishImage } from './fish-image';
import { Button, colors, Page, ui } from './fishing-ui';
import { Reveal } from './motion';
import { XpGain } from './xp-gain';

export type SavedMilestone = { completedQuests?: string[]; discovery: boolean; best: boolean; xpBefore: number | null; weightBest: number | null; lengthBest: number | null; weightImproved: boolean; lengthImproved: boolean };
function Spark({ index, gold }: { index: number; gold: boolean }) {
  const travel = useSharedValue(0);
  useEffect(() => { travel.set(withDelay(180, withTiming(1, { duration: 1100, reduceMotion: ReduceMotion.System }))); }, [travel]);
  const angle = index * Math.PI * 2 / 14;
  const animated = useAnimatedStyle(() => ({ opacity: 1 - travel.value, transform: [{ translateX: Math.cos(angle) * (35 + 115 * travel.value) }, { translateY: Math.sin(angle) * (35 + 95 * travel.value) + 30 * travel.value * travel.value }, { rotate: `${index * 37 + travel.value * 160}deg` }] }));
  return <Animated.View style={[{ position: 'absolute', left: '50%', top: '50%', width: index % 2 ? 7 : 11, height: index % 2 ? 15 : 6, backgroundColor: gold ? ['#CC8A2F', '#E7BE62', '#4E8B77'][index % 3] : ['#3E8D78', '#77AAA0', '#E3B34E'][index % 3] }, animated]} />;
}
export function CatchCelebration({ species, milestone, weight, length, onAgain }: { species: Species; milestone: SavedMilestone; weight: string; length: string; onAgain: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.45);
  const tilt = useSharedValue(reduced ? 0 : -10);
  useEffect(() => {
    scale.set(withSpring(1, { damping: 11, stiffness: 150, reduceMotion: ReduceMotion.System }));
    tilt.set(withSpring(0, { damping: 10, stiffness: 120, reduceMotion: ReduceMotion.System }));
  }, [scale, tilt]);
  const fishStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }] }));
  const gained = milestone.xpBefore === null ? null : milestone.discovery ? 100 : 20;
  const total = gained === null || milestone.xpBefore === null ? null : milestone.xpBefore + gained;
  const level = total === null ? null : Math.floor(total / 300) + 1;
  const levelUp = level !== null && milestone.xpBefore !== null && level > Math.floor(milestone.xpBefore / 300) + 1;
  return <Page key="celebration">
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 12, paddingTop: 16 }}>
      <Reveal><Text style={[ui.title, { fontSize: 38, lineHeight: 44, textAlign: 'center' }]}>{milestone.discovery ? 'New fish!' : milestone.best ? 'New personal best!' : 'Catch saved!'}</Text></Reveal>
      <View style={{ height: 230, width: '100%', maxWidth: 360, alignItems: 'center', justifyContent: 'center' }}>
        <View accessible={false} style={{ position: 'absolute', height: 190, width: 190, borderRadius: 95, backgroundColor: milestone.best ? colors.gold : colors.soft }} />
        {!reduced && (milestone.discovery || milestone.best || levelUp) && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', width: '100%', height: '100%' }}>{Array.from({ length: 14 }, (_, i) => <Spark key={i} index={i} gold={milestone.best} />)}</View>}
        <Animated.View style={[{ width: '88%' }, fishStyle]}><FishImage speciesId={species.species_id} name={species.common_name} height={170} unlocked reveal={milestone.discovery} /></Animated.View>
      </View>
      <Reveal delay={180} style={{ alignItems: 'center', gap: 6 }}><Text style={[ui.section, { textAlign: 'center', fontSize: 26 }]}>{species.common_name}</Text><Text style={ui.body}>Weight: {measurement(weight.trim() ? Number(weight) : null, 'lb')} · Length: {measurement(length.trim() ? Number(length) : null, 'in')}</Text></Reveal>
    </View>
    {milestone.best && <Reveal delay={260} style={{ gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      {milestone.weightImproved && <Text style={ui.body}>Heaviest catch: {milestone.weightBest === null ? 'First measured weight' : measurement(milestone.weightBest, 'lb')} → <Text style={{ fontWeight: '800', color: colors.ink }}>{measurement(Number(weight), 'lb')}</Text></Text>}
      {milestone.lengthImproved && <Text style={ui.body}>Longest catch: {milestone.lengthBest === null ? 'First measured length' : measurement(milestone.lengthBest, 'in')} → <Text style={{ fontWeight: '800', color: colors.ink }}>{measurement(Number(length), 'in')}</Text></Text>}
    </Reveal>}
    <Reveal delay={320} style={{ gap: 12 }}>
      {gained !== null && milestone.xpBefore !== null && <XpGain key={`${milestone.xpBefore}-${gained}`} before={milestone.xpBefore} gained={gained} />}
      {gained === null && <Text style={ui.small}>Your catch is saved. Reload your journal to see your updated explorer progress.</Text>}
      {!!milestone.completedQuests?.length && <View style={{ padding: 18, borderRadius: 16, backgroundColor: colors.gold, gap: 8 }}><Text style={ui.eyebrow}>✦ QUEST COMPLETE</Text>{milestone.completedQuests.map(title => <Text key={title} style={ui.name}>{title}</Text>)}<Button title="Choose my next quest" secondary onPress={() => router.navigate('/(tabs)/quests')} /></View>}
      <Button title={milestone.discovery ? 'Meet your new fish' : 'See this fish in my dex'} onPress={() => router.push({ pathname: '/fish/[id]', params: { id: species.species_id } })} />
      <Button title="Find another fish" secondary onPress={onAgain} />
    </Reveal>
  </Page>;
}
