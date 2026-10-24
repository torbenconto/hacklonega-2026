import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { api, type FishLog } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, ErrorMessage, Heading, Page, colors, ui } from '@/components/fishing-ui';

export default function History() {
  const { username } = useSession();
  const [logs, setLogs] = useState<FishLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loadHistory = useCallback(() => {
    let active = true;
    async function load() {
      if (!username) return;
      setLoading(true); setError('');
      try {
        const rows = await api<FishLog[]>('/catches', {}, username);
        if (active) setLogs(rows);
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [username]);
  useFocusEffect(loadHistory);
  return <Page><Heading eyebrow="Your fishing history" title="Days worth keeping." subtitle="Your confirmed catches, saved to your account on the fishing server." />
    <View style={[ui.card, ui.row]}><View><Text style={[ui.title, { fontSize: 30 }]}>{logs.length}</Text><Text style={ui.small}>FISH LOGGED</Text></View><View><Text style={[ui.title, { fontSize: 30 }]}>{new Set(logs.map(l => l.species)).size}</Text><Text style={ui.small}>SPECIES DISCOVERED</Text></View></View>
    <Button title="Refresh history" secondary disabled={loading} onPress={() => { loadHistory(); }} /><ErrorMessage message={error} />{loading && <ActivityIndicator color={colors.green} />}
    {!loading && !error && !logs.length && <View style={ui.card}><Text style={ui.name}>Your first catch is waiting.</Text><Text style={ui.body}>Take a photo, upload one, or try a demo fish to start your journal.</Text><Button title="Log your first fish" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
    {logs.map(log => <View key={log.id} style={ui.card}><Text style={ui.eyebrow}>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text><Text style={ui.name}>{log.species}</Text><View style={ui.row}><Text style={ui.body}>{log.length_inches} inches</Text><Text style={ui.body}>{log.weight_lbs} lbs</Text></View><Text style={ui.small}>Journal entry #{log.id}</Text></View>)}
  </Page>;
}
