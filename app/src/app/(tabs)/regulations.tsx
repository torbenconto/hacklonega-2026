import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useCatalog } from '@/hooks/use-catalog';
import { FishImage } from '@/components/fish-image';
import { OFFICIAL_RULES, RegulationCheck } from '@/components/regulation-check';
import { Badge, Button, ErrorMessage, Heading, Input, Page, TextLink, colors, ui } from '@/components/fishing-ui';

export default function Regulations() {
  const { species_id } = useLocalSearchParams<{ species_id?: string }>();
  return <RegulationsContent key={species_id || 'all'} initialSpeciesId={species_id} />;
}

function RegulationsContent({ initialSpeciesId }: { initialSpeciesId?: string }) {
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const [length, setLength] = useState('');
  const selected = catalog.species.find(s => s.species_id === initialSpeciesId) || null;
  const options = catalog.species.filter(s => `${s.common_name} ${s.scientific_name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <Page>
    <Heading eyebrow="Conservation comes first" title="Know before you keep." subtitle="Make checking the rules part of every catch. Georgia’s statewide baseline is a starting point; your waterbody can have different rules." />
    <View style={ui.hero}><Badge gold>GEORGIA FRESHWATER</Badge><Text style={ui.heroTitle}>A good day on the water starts informed.</Text><Text style={ui.heroBody}>Confirm the species. Measure the fish. Check your location’s rules and your license before deciding what to keep.</Text></View>
    <View style={ui.card}><Text style={ui.section}>Your pre-fishing checklist</Text>{[
      ['01', 'License & trout requirements', 'Check the license and any additional requirements that apply to you.'],
      ['02', 'Waterbody & season', 'Look up special waters, closures, border-water rules, and current seasons.'],
      ['03', 'Species, size & daily limits', 'Confirm the species and review combined limits as well as fish already retained.'],
    ].map(([number, title, body]) => <View key={number} style={{ flexDirection: 'row', gap: 14, paddingVertical: 7 }}><Text style={[ui.eyebrow, { color: '#A27431', paddingTop: 4 }]}>{number}</Text><View style={{ flex: 1, gap: 4 }}><Text style={[ui.name, { fontSize: 16 }]}>{title}</Text><Text style={ui.small}>{body}</Text></View></View>)}<TextLink title="Open current official Georgia rules" url={OFFICIAL_RULES} /><TextLink title="Licenses, fishing resources & closures" url="https://georgiawildlife.com/fishing/angler-resources" /></View>
    <Text style={ui.section}>Check a fish</Text><Text style={ui.body}>Choose a species you have confirmed, then enter its measured total length.</Text>
    <ErrorMessage message={catalog.error} />{catalog.error && <Button title="Reload species" secondary onPress={catalog.refresh} />}{catalog.loading && <ActivityIndicator color={colors.green} />}
    {selected ? <View style={ui.card}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 90, borderRadius: 12, overflow: 'hidden' }}><FishImage speciesId={selected.species_id} name={selected.common_name} height={70} /></View><View style={{ flex: 1, gap: 4 }}><Text style={ui.name}>{selected.common_name}</Text><Text style={ui.small}>{selected.scientific_name}</Text></View></View><Button title="Choose a different fish" secondary onPress={() => { router.setParams({ species_id: undefined }); setQuery(''); setLength(''); }} /></View> : <View style={ui.card}><Input accessibilityLabel="Find species for regulation check" value={query} onChangeText={setQuery} placeholder="Find a fish: bass, trout, catfish…" />{options.slice(0, 8).map(s => <Pressable key={s.species_id} accessibilityRole="button" onPress={() => { router.setParams({ species_id: s.species_id }); setLength(''); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={[ui.name, { fontSize: 16 }]}>{s.common_name}</Text><Text style={ui.small}>{s.scientific_name}</Text></Pressable>)}{!catalog.loading && !options.length && <Text style={ui.small}>No fish match that search.</Text>}<Text style={ui.small}>Search to narrow the full Georgia catalog.</Text></View>}
    {selected && <><Text style={ui.name}>Total length (inches)</Text><Input accessibilityLabel="Measured total length in inches" value={length} onChangeText={setLength} placeholder="e.g. 14.5" keyboardType="decimal-pad" /><RegulationCheck species={selected} length={length} /></>}
    <View style={[ui.card, { backgroundColor: colors.soft }]}><Text style={ui.name}>Protect the next discovery.</Text><Text style={ui.body}>Learn without taking a fish home. Photograph responsibly, minimize handling, and leave habitats as you found them.</Text><Text style={ui.small}>Some catalog entries are protected or provisional. An unreviewed rule never means unrestricted harvest.</Text></View>
  </Page>;
}
