import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type LeaderboardData, type LeaderboardEntry } from '@/lib/api';
import { useSession } from '@/lib/session';
import { measurement } from '@/lib/collection';
import { Badge, Button, ErrorMessage, Heading, Page, colors, ui } from '@/components/fishing-ui';

export default function Leaderboards() {
  const { username } = useSession();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setLoading(true); setError(''); setData(null);
    if (!username) { setLoading(false); return; }
    api<LeaderboardData>('/leaderboards', { signal: controller.signal }, username)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [username]);
  useFocusEffect(load);
  const board = data?.xp;
  const format = (score: number) => `${measurement(score)} XP`;

  const medals: Record<number, { name: string; icon: string; background: string; ink: string }> = {
    1: { name: 'Gold', icon: '🥇', background: '#FFF2CB', ink: '#795409' },
    2: { name: 'Silver', icon: '🥈', background: '#E8EDF2', ink: '#4D5D6D' },
    3: { name: 'Bronze', icon: '🥉', background: '#F6E5D8', ink: '#895431' },
  };

  function row(entry: LeaderboardEntry, index: number) {
    const medal = medals[entry.rank];
    return <View key={`${entry.display_name}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: index ? 1 : 0, borderColor: colors.line, backgroundColor: entry.is_you ? colors.soft : colors.white }}>
      <View accessibilityLabel={medal ? `${medal.name}, rank ${entry.rank}` : `Rank ${entry.rank}`} style={{ width: 48, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: medal?.background ?? colors.soft }}>
        {medal && <Text style={{ fontSize: 22 }}>{medal.icon}</Text>}
        <Text style={{ fontSize: medal ? 12 : 18, fontWeight: '800', color: medal?.ink ?? colors.muted }}>{entry.rank}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>{entry.display_name}{entry.is_you ? ' · You' : ''}</Text>
      </View>
      <Text style={{ color: colors.green, fontWeight: '800', fontSize: 16, flexShrink: 0 }}>{format(entry.score)}</Text>
    </View>;
  }

  return <Page>
    <Heading eyebrow="On the water, together" title="XP Leaderboard" subtitle="A little friendly competition. A good reason for one more cast." />
    {data && <View style={{ backgroundColor: colors.green, borderRadius: 16, padding: 20, gap: 10 }}>
      <Text style={[ui.eyebrow, { color: '#C2D7CB' }]}>YOUR ANGLER NAME</Text>
      <Text style={[ui.heroTitle, { fontSize: 23 }]}>{data.display_name}</Text>
      <Text style={ui.heroBody}>Automatically generated and yours to keep.</Text>
    </View>}
    <View style={{ gap: 6 }}><Text style={ui.section}>Every catch counts.</Text><Text style={ui.body}>Earn XP with every saved catch and climb the rankings.</Text></View>
    <ErrorMessage message={error} />
    {loading && <ActivityIndicator accessibilityLabel="Loading leaderboard" color={colors.green} />}
    {!!error && <Button title="Try again" onPress={() => { load(); }} />}
    {board && <>
      {board.personal && <View style={{ gap: 8, padding: 16, borderRadius: 12, backgroundColor: colors.gold }}>
        <Badge gold>YOUR STANDING</Badge>
        <Text style={ui.name}>#{board.personal.rank} · {format(board.personal.score)}</Text>
      </View>}
      <View style={ui.row}><Text style={[ui.eyebrow, { flex: 1 }]}>ALL TIME · {board.total.toLocaleString()} ANGLERS</Text><Button title="Refresh" secondary onPress={() => { load(); }} /></View>
      {board.entries.length ? <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>{board.entries.slice(0, 10).map(row)}</View> : <View style={[ui.card, { paddingTop: 0 }]}><Text style={ui.name}>The first spot is waiting.</Text><Text style={ui.body}>Save a catch to earn XP and join this board.</Text><Button title="Log a catch" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
      <Text style={ui.small}>Based on saved catches from all anglers. Showing up to 10 anglers. Equal XP is ordered consistently to give each angler a unique place.</Text>
    </>}
  </Page>;
}
