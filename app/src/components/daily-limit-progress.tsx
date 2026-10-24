import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { DailyLimit, FishLog } from '@/lib/api';
import { dailyProgress, todayGroups } from '@/lib/daily-limits';
import { colors, ui } from './fishing-ui';

function useToday() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function Progress({ logs, rule, now }: { logs: FishLog[]; rule: DailyLimit; now: Date }) {
  const { count, released, unknown, limit, over } = dailyProgress(logs, rule, now);
  const ratio = limit !== null && limit > 0 ? count / limit : 0;
  const tint = over || (limit !== null && count >= limit) ? '#A23928' : ratio >= 0.8 ? '#A87116' : colors.green;
  return <View style={{ gap: 5 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12 }}>
      <Text style={[ui.small, { textTransform: 'capitalize', color: colors.ink }]}>{rule.group?.replaceAll('_', ' ') || 'Daily limit'}</Text>
      <Text accessibilityLiveRegion="polite" style={[ui.small, { color: tint, fontWeight: '600' }]}>{count}{limit !== null ? ` / ${limit}` : ''} kept · {released} released{over ? ' · Over limit' : limit !== null && count === limit ? ' · Limit reached' : ''}</Text>
    </View>
    {limit !== null && limit > 0 ? <View accessibilityRole="progressbar" accessibilityLabel={`${rule.group?.replaceAll('_', ' ')} kept today`} accessibilityValue={{ min: 0, max: limit, now: Math.min(count, limit), text: `${count} of ${limit} kept; ${released} released${unknown ? `; ${unknown} unmarked` : ''}` }} style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, ratio * 100)}%`, backgroundColor: tint }} /></View> : <Text style={ui.small}>{rule.status === 'no_statewide_limit' ? 'No statewide count limit' : 'Limit not reviewed'}</Text>}
    {unknown > 0 && <Text style={ui.small}>{unknown} unmarked · Set kept / released in Journal</Text>}
  </View>;
}
export function DailyLimitProgress({ logs, rule }: { logs: FishLog[] | null; rule?: DailyLimit }) {
  const now = useToday();
  if (logs === null) return null;
  const groups = rule ? [rule] : todayGroups(logs, now);
  if (!groups.length) return null;
  return <View style={{ gap: 9 }}>
    {!rule && <Text style={ui.small}>Kept today · Statewide limits</Text>}
    {groups.map((group, index) => <Progress key={group.group ?? index} logs={logs} rule={group} now={now} />)}
  </View>;
}
