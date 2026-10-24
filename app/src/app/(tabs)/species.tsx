import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, type Species } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, ErrorMessage, Heading, Input, Page, colors, ui } from '@/components/fishing-ui';

export default function SpeciesIndex() {
  const { username, setUsername } = useSession();
  const [species, setSpecies] = useState<Species[]>([]);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(30);
  const [selected, setSelected] = useState<Species | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(''); try { const result = await api<{ species: Species[] }>('/species'); setSpecies(result.species); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }
  useEffect(() => {
    let active = true;
    api<{ species: Species[] }>('/species')
      .then(result => { if (active) setSpecies(result.species); })
      .catch(e => { if (active) setError((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = species.filter(s => `${s.common_name} ${s.scientific_name} ${s.family || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <Page>
    <View style={ui.row}><Text style={ui.eyebrow}>REEL GEORGIA</Text><Pressable accessibilityRole="button" onPress={() => { setUsername(null); router.replace('/'); }}><Text style={{ color: colors.green }}>Sign out</Text></Pressable></View>
    <Heading eyebrow={`Hello, ${username}`} title="Meet the locals." subtitle="Your field guide to Georgia’s freshwater fish. Search by name or family to find your next discovery." />
    <Button title="＋ Identify & log a fish" onPress={() => router.navigate('/(tabs)/identify')} />
    <Input accessibilityLabel="Search species" placeholder="Search bass, trout, sunfish…" value={query} onChangeText={value => { setQuery(value); setSelected(null); setVisible(30); }} />
    <ErrorMessage message={error} />{error && <Button title="Try again" secondary onPress={load} />}
    {loading && <ActivityIndicator color={colors.green} />}
    {selected && <Modal transparent animationType="fade" onRequestClose={() => setSelected(null)}><View style={{ flex: 1, backgroundColor: '#173D35AA', justifyContent: 'center', padding: 24 }}><View style={[ui.card, { backgroundColor: '#E8EDDD', width: '100%', maxWidth: 600, alignSelf: 'center' }]}><Text style={ui.eyebrow}>FIELD GUIDE / {selected.taxon_rank || 'SPECIES'}</Text><Text style={ui.name}>{selected.common_name}</Text><Text style={ui.body}>{selected.scientific_name}</Text><Text style={ui.small}>Family: {selected.family || 'Not listed'}</Text><Text style={ui.small}>Included in the Georgia inland freshwater catalog. Presence and regulations vary by waterbody.</Text><Button title="Close details" secondary onPress={() => setSelected(null)} /></View></View></Modal>}
    <Text style={ui.eyebrow}>{filtered.length} CATALOG ENTRIES</Text>
    {!loading && !error && !filtered.length && <Text style={ui.body}>No fish match that search. Try another name.</Text>}
    {filtered.slice(0, visible).map((s, index) => <Pressable key={s.species_id} accessibilityRole="button" onPress={() => setSelected(s)} style={[ui.card, ui.row]}><View style={{ flex: 1, gap: 5 }}><Text style={ui.small}>#{String(index + 1).padStart(3, '0')} · {s.family}</Text><Text style={ui.name}>{s.common_name}</Text><Text style={[ui.small, { fontStyle: 'italic' }]}>{s.scientific_name}</Text></View><Text style={{ color: colors.green, fontSize: 25 }}>↗</Text></Pressable>)}
    {visible < filtered.length && <Button title="Show more species" secondary onPress={() => setVisible(count => count + 30)} />}
  </Page>;
}
