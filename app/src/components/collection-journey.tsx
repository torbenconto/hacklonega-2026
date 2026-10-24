import { Text, View } from 'react-native';
import { collectionProgress } from '@/lib/collection';
import type { FishLog } from '@/lib/api';
import { colors, ui } from './fishing-ui';
import { ProgressBar, SpringPressable } from './motion';

export function CollectionJourney({ logs, onIdentify, loading = false }: { logs: FishLog[] | null; onIdentify?: () => void; loading?: boolean }) {
  const journey = logs === null ? null : collectionProgress(logs);
  return <View style={{ gap: 16, paddingVertical: 10 }}>
    <View style={[ui.row, { alignItems: 'flex-end', flexWrap: 'wrap' }]}>
      <View style={{ gap: 4 }}><Text style={ui.eyebrow}>{journey ? `LEVEL ${journey.level}` : 'EXPLORER'}</Text><Text style={[ui.section, { fontSize: 26 }]}>{journey?.rank ?? (loading ? 'Getting your progress…' : 'Progress unavailable')}</Text></View>
      <Text style={[ui.small, { fontWeight: '700' }]}>{journey ? `${journey.xp} XP` : loading ? '' : 'Reload your journal'}</Text>
    </View>
    {journey && <>
      <ProgressBar key={journey.level} progress={journey.levelXP / 300} label={`Level ${journey.level}, ${journey.levelXP} of 300 XP toward the next level`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingVertical: 8 }}>
        {[1, 3, 5, 10, 25].map((goal, i) => {
          const unlocked = journey.discoveries >= goal;
          return <View key={goal} accessibilityLabel={`${goal} species badge, ${unlocked ? 'earned' : 'not earned'}`} style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ height: 42, width: 42, backgroundColor: unlocked ? colors.green : 'transparent', borderWidth: 2, borderColor: unlocked ? colors.green : colors.line, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' }}><Text style={{ transform: [{ rotate: '-45deg' }], color: unlocked ? colors.white : colors.muted, fontSize: 16, fontWeight: '800' }}>{unlocked ? '✓' : goal}</Text></View>
            <Text style={[ui.small, { fontSize: 11, marginTop: 4 }]}>{['First fish', 'Curious', 'Explorer', 'Tracker', 'Naturalist'][i]}</Text>
          </View>;
        })}
      </View>
      <View style={{ gap: 5, borderLeftWidth: 3, borderLeftColor: colors.orange, paddingLeft: 14 }}>
        <Text style={[ui.name, { fontSize: 17 }]}>Discover {journey.nextGoal} species · {journey.discoveries}/{journey.nextGoal}</Text>
        {onIdentify && <SpringPressable accessibilityRole="button" onPress={onIdentify} style={{ paddingVertical: 13, minHeight: 44 }}><Text style={{ color: colors.green, fontWeight: '700' }}>Identify →</Text></SpringPressable>}
      </View>
    </>}
  </View>;
}
