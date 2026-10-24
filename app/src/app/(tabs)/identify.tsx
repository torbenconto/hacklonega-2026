import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { api, type Prediction, type Species } from '@/lib/api';
import { preparePhoto } from '@/lib/photos';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { FishImage } from '@/components/fish-image';
import { OFFICIAL_RULES, RegulationCheck } from '@/components/regulation-check';
import { Badge, Button, ErrorMessage, Heading, Input, Page, TextLink, colors, ui } from '@/components/fishing-ui';

type Photo = { uri: string };
export default function Identify() {
  const { username } = useSession();
  const catalog = useCatalog();
  const journal = useJournal();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [selected, setSelected] = useState<Species | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ discovery: boolean; best: boolean } | null>(null);
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const record = selected ? records.get(speciesKey(selected.common_name)) : undefined;

  useEffect(() => () => {
    if (Platform.OS === 'web' && photo?.uri.startsWith('blob:')) URL.revokeObjectURL(photo.uri);
  }, [photo]);

  function reset() {
    setPhoto(null); setResult(null); setSelected(null); setSaved(null);
    setManual(false); setQuery(''); setWeight(''); setLength(''); setError('');
  }

  async function choose(uri: string) {
    const converted = await preparePhoto(uri);
    setPhoto({ uri: converted.uri }); setResult(null); setSelected(null); setSaved(null);
    setManual(false); setQuery(''); setWeight(''); setLength(''); setError('');
  }

  async function pick(camera: boolean) {
    if (busy) return;
    setBusy('Opening photos'); setError('');
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Allow camera access in Settings, or choose a photo from your library.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
      const picked = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!picked.canceled && picked.assets[0]) {
        setBusy('Getting your photo ready…');
        await choose(picked.assets[0].uri);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function demo(item: typeof DEMO_PHOTOS[number]) {
    if (busy) return;
    setBusy('Getting your sample ready…'); setError('');
    try {
      const asset = Asset.fromModule(item.asset);
      await asset.downloadAsync();
      await choose(asset.localUri || asset.uri);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function identify() {
    if (!photo || busy) return;
    setBusy('Looking for your fish…'); setError(''); setResult(null); setSelected(null); setManual(false);
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(photo.uri);
        if (!response.ok) throw new Error('This photo is no longer available. Please select it again.');
        form.append('file', await response.blob(), 'fish.jpg');
      } else {
        form.append('file', { uri: photo.uri, name: 'fish.jpg', type: 'image/jpeg' } as unknown as Blob);
      }
      setResult(await api<Prediction>('/predict?top_k=3', { method: 'POST', body: form }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function save() {
    if (!photo || !selected || !username || saved || busy) return;
    const pounds = Number(weight), inches = Number(length);
    if (!Number.isFinite(pounds) || pounds <= 0 || !Number.isFinite(inches) || inches <= 0) {
      setError('Enter a positive measured weight in pounds and total length in inches.');
      return;
    }
    const milestone = {
      discovery: journal.logs !== null && !record,
      best: !!record && (pounds > record.heaviest.weight_lbs || inches > record.longest.length_inches),
    };
    setBusy('Adding your catch to the journal…'); setError('');
    try {
      await api('/catches', { method: 'POST', body: JSON.stringify({
        species: selected.common_name, weight_lbs: pounds, length_inches: inches,
      }) }, username);
      setSaved(milestone); journal.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  const matches = catalog.species.filter(s => `${s.common_name} ${s.scientific_name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const steps = ['Add a photo', 'Confirm the fish', 'Log your catch'];
  return <Page>
    <Heading eyebrow="Reel Georgia / Scan & discover" title="What’s on your line?" subtitle="Turn a moment on the water into your next discovery." />
    <View style={[ui.row, { gap: 6 }]}>{steps.map((step, index) => {
      const complete = index === 0 ? !!photo : index === 1 ? !!selected : !!saved;
      const active = index === 0 ? !photo : index === 1 ? !!photo && !selected : !!selected;
      return <View key={step} style={{ flex: 1, gap: 8 }}><View style={{ height: 4, borderRadius: 4, backgroundColor: complete ? colors.green : active ? colors.orange : colors.line }} /><Text style={[ui.small, { fontSize: 11, fontWeight: active ? '800' : '400' }]}>{complete ? '✓' : index + 1} {step}</Text></View>;
    })}</View>
    {!photo && <>
      <View style={ui.hero}>
        <Badge gold>YOUR NEXT FIELD DISCOVERY</Badge>
        <Text style={ui.heroTitle}>{'A little curiosity.\nA whole world of fish.'}</Text>
        <Text style={ui.heroBody}>Photograph one fish, side-on, with its whole body in frame. We’ll suggest the closest matches.</Text>
        <Button title="＋ Take a fish photo" accent disabled={!!busy} onPress={() => void pick(true)} />
        <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => void pick(false)} style={{ alignItems: 'center', padding: 10 }}><Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Choose from your photos ↗</Text></Pressable>
      </View>
      <View style={ui.row}><Text style={ui.section}>Give it a try</Text><Badge>REAL PHOTO SAMPLES</Badge></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {DEMO_PHOTOS.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Choose ${item.name}`} disabled={!!busy} onPress={() => void demo(item)} style={{ width: 126, backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' }}>
          <Image source={item.asset} style={{ width: 126, height: 126 }} resizeMode="cover" /><Text style={[ui.small, { padding: 10 }]}>{item.name} ↗</Text>
        </Pressable>)}
      </ScrollView>
      <View style={[ui.card, { backgroundColor: colors.soft }]}><Text style={ui.name}>Collect discoveries. Protect the water.</Text><Text style={ui.small}>A photo can help you learn. It never replaces an official regulation check before keeping a fish.</Text><TextLink title="Read Georgia’s fishing rules" url={OFFICIAL_RULES} /></View>
    </>}
    {photo && <View style={[ui.card, { padding: 12 }]}>
      <Image source={{ uri: photo.uri }} style={[ui.photo, { height: 280 }]} resizeMode="contain" />
      {!saved && <Button title={result ? 'Identify again' : 'Find my fish →'} secondary={!!result} accent={!result} disabled={!!busy} onPress={() => void identify()} />}
      <Button title={saved ? 'Discover another fish' : 'Choose another photo'} secondary disabled={!!busy} onPress={reset} />
    </View>}
    {!!busy && <View accessibilityLiveRegion="polite" style={[ui.card, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}><ActivityIndicator color={colors.green} /><Text style={[ui.body, { flex: 1 }]}>{busy}</Text></View>}
    <ErrorMessage message={error} />
    {result && <View style={{ gap: 14 }}>
      <View style={ui.row}><Text style={ui.section}>{result.status === 'unsupported' ? 'Let’s try a closer photo.' : 'Here’s what we found.'}</Text><Badge>{result.status === 'candidate' ? 'MATCH SUGGESTED' : 'NEEDS A CLOSER LOOK'}</Badge></View>
      <Text style={ui.body}>{result.status === 'unsupported'
        ? 'We don’t have a reliable match. Try a clearer photo, or choose a fish you recognize from the catalog.'
        : result.status === 'uncertain'
          ? 'The first fish is our most likely suggestion, but several look similar. Confirm only a species you recognize.'
          : 'The first fish is the most likely match. Compare it with your photo and select it only if you can confirm the species.'}</Text>
      {result.status !== 'unsupported' && result.candidates.map((s, index) => {
        const checked = selected?.species_id === s.species_id;
        return <Pressable key={s.species_id} accessibilityRole="radio" accessibilityLabel={`${s.common_name}, ${index === 0 ? 'most likely match' : 'alternative match'}`} accessibilityState={{ checked }} disabled={!!busy || !!saved} onPress={() => setSelected(s)} style={[ui.card, { padding: 14, borderWidth: index === 0 || checked ? 2 : 1, borderColor: checked ? colors.green : index === 0 ? colors.orange : colors.line, backgroundColor: checked ? colors.soft : colors.white }]}>
          <Badge gold={index === 0}>{index === 0 ? '★ MOST LIKELY MATCH' : `ALTERNATIVE ${index + 1}`}</Badge>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 85, borderRadius: 12, overflow: 'hidden' }}><FishImage speciesId={s.species_id} name={s.common_name} height={70} /></View><View style={{ flex: 1, gap: 5 }}><Text style={ui.name}>{s.common_name}</Text><Text style={[ui.small, { fontStyle: 'italic' }]}>{s.scientific_name}</Text></View><Text style={{ fontSize: 24, color: colors.green }}>{checked ? '●' : '○'}</Text></View>
        </Pressable>;
      })}
      <Text style={ui.small}>Ranked suggestions, not verified identifications or confidence percentages.</Text>
    </View>}
    {photo && !saved && <>
      <Button title={manual ? 'Hide catalog' : 'Not your fish? Choose from the Fishdex'} secondary disabled={!!busy} onPress={() => setManual(value => !value)} />
      {manual && <View style={ui.card}>
        <Input accessibilityLabel="Find species to confirm" value={query} onChangeText={setQuery} placeholder="Search Georgia’s freshwater fish" />
        <ErrorMessage message={catalog.error} />{catalog.error && <Button title="Retry catalog" secondary onPress={catalog.refresh} />}
        {matches.slice(0, 8).map(s => <Pressable key={s.species_id} disabled={!!busy} accessibilityRole="radio" accessibilityState={{ checked: selected?.species_id === s.species_id }} onPress={() => { setSelected(s); setManual(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}><Text style={[ui.name, { fontSize: 16 }]}>{selected?.species_id === s.species_id ? '● ' : '○ '}{s.common_name}</Text><Text style={ui.small}>{s.scientific_name}</Text></Pressable>)}
        {!matches.length && <Text style={ui.small}>No fish match that search.</Text>}
      </View>}
    </>}
    {selected && !saved && <>
      <View style={ui.card}>
        <Badge gold>{journal.logs !== null && !record ? 'A FIRST FOR YOUR FISHDEX' : 'YOUR CONFIRMED IDENTIFICATION'}</Badge>
        <Text style={ui.section}>{selected.common_name}</Text>
        {record && <Text style={ui.small}>Your best so far: {measurement(record.heaviest.weight_lbs)} lb heaviest · {measurement(record.longest.length_inches)} in longest.</Text>}
        <Text style={ui.body}>Add measured weight and total length. Your record will update automatically.</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}><Text style={ui.small}>Weight · pounds</Text><Input accessibilityLabel="Weight in pounds" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="2.5" editable={!busy} /></View>
          <View style={{ flex: 1, gap: 8 }}><Text style={ui.small}>Length · inches</Text><Input accessibilityLabel="Total length in inches" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="16" editable={!busy} /></View>
        </View>
      </View>
      <RegulationCheck species={selected} length={length} />
      <Button title="Confirm & add to my Fishdex →" accent onPress={() => void save()} disabled={!!busy} />
      <Text style={[ui.small, { textAlign: 'center' }]}>Saving records a catch, not a decision to keep it.</Text>
    </>}
    {saved && <View style={ui.hero}>
      <Badge gold>{saved.discovery ? '✦ NEW FISHDEX DISCOVERY' : saved.best ? '★ NEW PERSONAL BEST' : '✓ CATCH RECORDED'}</Badge>
      <Text style={ui.heroTitle}>{saved.discovery ? 'A new story unlocked.' : saved.best ? 'That one’s a record.' : 'One for the journal.'}</Text>
      <Text style={ui.heroBody}>{selected?.common_name} · {weight} lb · {length} in. {saved.discovery ? 'Your collection just grew.' : 'Your catch and personal bests are up to date.'}</Text>
      <Button title="See my Fishdex →" accent onPress={() => router.navigate('/(tabs)/species')} />
      <Button title="Discover another fish" onPress={reset} />
    </View>}
  </Page>;
}
