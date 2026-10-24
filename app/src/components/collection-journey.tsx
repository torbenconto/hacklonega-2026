import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { collectionProgress } from '@/lib/collection';
import type { FishLog } from '@/lib/api';
import { colors, ui } from './fishing-ui';
import { ProgressBar, SpringPressable } from './motion';

export function CollectionJourney({ logs, onIdentify, loading = false, showDiscoveryGoal = true }: { logs: FishLog[] | null; onIdentify?: () => void; loading?: boolean; showDiscoveryGoal?: boolean }) {
  const journey = logs === null ? null : collectionProgress(logs);
  return <View style={{ gap: 14, paddingVertical: 10 }}>
    <View style={styles.levelCard}>
      <View style={styles.header}>
        {journey && <View style={styles.levelBadge}>
          <Text style={styles.badgeLabel}>LEVEL</Text>
          <Text style={styles.levelNumber}>{journey.level}</Text>
        </View>}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[ui.eyebrow, { color: '#C2D7CB' }]}>YOUR ANGLER JOURNEY</Text>
          <Text style={styles.rank}>{journey?.rank ?? (loading ? 'Getting your progress…' : 'Progress unavailable')}</Text>
          <Text style={styles.lightText}>{journey ? `${journey.xp.toLocaleString()} total XP earned` : loading ? 'Loading your field notes' : 'Reload your journal'}</Text>
        </View>
      </View>
      {journey && <View style={{ gap: 10 }}>
        <View style={styles.progressLabels}>
          <Text style={styles.lightText}>Progress to level {journey.level + 1}</Text>
          <Text style={styles.xpValue}>{journey.levelXP} / 300 XP</Text>
        </View>
        <View style={styles.progressTrack}>
          <ProgressBar key={journey.level} progress={journey.levelXP / 300} color={colors.orange} label={`Level ${journey.level}, ${journey.levelXP} of 300 XP toward the next level`} />
        </View>
        <Text style={styles.lightText}>{300 - journey.levelXP} XP to your next level</Text>
      </View>}
    </View>
    {journey && showDiscoveryGoal && <>
      <View style={styles.goalCard}>
        <View style={styles.header}>
          <View accessible={false} style={styles.goalIcon}><Text style={{ color: '#74501C', fontSize: 30, fontWeight: '800' }}>◎</Text></View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[ui.eyebrow, { color: '#74501C' }]}>NEXT DISCOVERY GOAL</Text>
            <Text style={styles.goalTitle}>Discover {journey.nextGoal} species</Text>
            <Text style={ui.small}>{journey.nextGoal - journey.discoveries} more to reach your milestone</Text>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <View style={styles.progressLabels}>
            <Text style={[ui.small, { color: colors.ink }]}>Unique species discovered</Text>
            <Text style={styles.goalValue}>{journey.discoveries} / {journey.nextGoal}</Text>
          </View>
          <View style={styles.progressTrack}>
            <ProgressBar progress={journey.discoveries / journey.nextGoal} color={colors.green} label={`${journey.discoveries} of ${journey.nextGoal} unique species discovered`} />
          </View>
        </View>
        <SpringPressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/quests')} style={styles.questButton}>
          <Text style={styles.questText}>Choose your next quest</Text><Text style={styles.questText}>↗</Text>
        </SpringPressable>
        {onIdentify && <SpringPressable accessibilityRole="button" onPress={onIdentify} style={styles.identifyButton}><Text style={{ color: colors.green, fontWeight: '700' }}>Identify a fish →</Text></SpringPressable>}
      </View>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  levelCard: { backgroundColor: colors.dark, borderRadius: 18, padding: 20, gap: 22, borderWidth: 1, borderColor: colors.green },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelBadge: { minWidth: 72, minHeight: 82, padding: 10, backgroundColor: colors.orange, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  badgeLabel: { color: colors.dark, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  levelNumber: { color: colors.dark, fontSize: 36, lineHeight: 41, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rank: { color: colors.white, fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  lightText: { color: '#C2D7CB', fontSize: 12, lineHeight: 18 },
  progressLabels: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 4 },
  xpValue: { color: colors.orange, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { overflow: 'hidden', borderRadius: 8 },
  goalCard: { backgroundColor: colors.gold, borderRadius: 18, padding: 20, gap: 18, borderWidth: 1, borderColor: '#E5D8BA' },
  goalIcon: { height: 52, width: 52, borderRadius: 16, backgroundColor: '#EBDDAD', alignItems: 'center', justifyContent: 'center' },
  goalTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 },
  goalValue: { color: colors.green, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  questButton: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  questText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  identifyButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
