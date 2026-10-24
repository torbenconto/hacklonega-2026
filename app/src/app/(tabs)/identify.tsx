import { CatchCelebration, type SavedMilestone } from '@/components/catch-celebration';
import { Reveal, SpringPressable } from '@/components/motion';
import { CameraCapture } from '@/components/camera-capture';
import { MeasurementInput } from '@/components/measurement-input';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';
import { api, type Prediction, type Species } from '@/lib/api';
import { preparePhoto } from '@/lib/photos';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { collectionProgress, measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { FishImage } from '@/components/fish-image';
import { RegulationCheck } from '@/components/regulation-check';
import { Button, ErrorMessage, Input, Page, colors, ui } from '@/components/fishing-ui';

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
  const [saved, setSaved] = useState<SavedMilestone | null>(null);
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

  async function pick() {
    if (busy) return;
    setBusy('Opening library…'); setError('');
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (!picked.canceled && picked.assets[0]) await choose(picked.assets[0].uri);
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
      setError('Enter weight and length above zero.');
      return;
    }
    const progressKnown = journal.logs !== null && !journal.loading;
    const milestone = {
      discovery: progressKnown && !record,
      xpBefore: !progressKnown || journal.logs === null ? null : collectionProgress(journal.logs).xp,
      weightBest: progressKnown && record && pounds > record.heaviest.weight_lbs ? record.heaviest.weight_lbs : null,
      lengthBest: progressKnown && record && inches > record.longest.length_inches ? record.longest.length_inches : null,
      best: progressKnown && !!record && (pounds > record.heaviest.weight_lbs || inches > record.longest.length_inches),
    };
    setBusy('Saving catch…'); setError('');
    try {
      await api('/catches', { method: 'POST', body: JSON.stringify({
        species: selected.common_name, weight_lbs: pounds, length_inches: inches,
      }) }, username);
      setSaved(milestone); journal.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  const matches = catalog.species.filter(s => `${s.common_name} ${s.scientific_name}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (saved && selected) return <CatchCelebration species={selected} milestone={saved} weight={weight} length={length} onAgain={reset} />;
  if (!photo) return <CameraCapture busy={busy} error={error} onCapture={choose} onLibrary={() => void pick()} onDemo={item => void demo(item)} />;
  return <Page>
    <View style={ui.row}><Text style={ui.section}>Identify</Text><Button title="Retake" secondary disabled={!!busy} onPress={reset} /></View>
    <Image source={{ uri: photo.uri }} style={{ width: '100%', height: result ? 170 : 300, backgroundColor: colors.soft }} resizeMode="contain" />
    {!result && <Button title="Identify fish" onPress={() => void identify()} busy={!!busy} />}
    {!!busy && !!result && <ActivityIndicator accessibilityLabel={busy} color={colors.green} />}
    {!selected && <ErrorMessage message={error} />}
    {result && <View style={{ gap: 10 }}>
      <Text style={ui.name}>{result.status === 'unsupported' ? 'No clear match. Try another photo.' : result.status === 'uncertain' ? 'Not sure. Which fish is it?' : 'Which fish is it?'}</Text>
      {result.status !== 'unsupported' && result.candidates.map((s, index) => {
        const checked = selected?.species_id === s.species_id;
        return <SpringPressable key={s.species_id} accessibilityRole="radio" accessibilityLabel={`${s.common_name}${index === 0 ? ', best match' : ''}`} accessibilityState={{ checked }} disabled={!!busy} onPress={() => setSelected(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: checked ? colors.soft : 'transparent' }}>
          <View style={{ width: 70 }}><FishImage speciesId={s.species_id} name={s.common_name} height={60} /></View>
          <View style={{ flex: 1, gap: 3 }}><Text style={[ui.name, { fontSize: 17 }]}>{s.common_name}</Text><Text style={ui.small}>{index === 0 ? 'Best match' : s.scientific_name}</Text></View>
          <Text style={{ fontSize: 24, color: colors.green }}>{checked ? '●' : '○'}</Text>
        </SpringPressable>;
      })}
    </View>}
    <Button title={manual ? 'Close species list' : 'Choose species'} secondary disabled={!!busy} onPress={() => setManual(value => !value)} />
    {manual && <View style={{ gap: 8 }}>
      <Input accessibilityLabel="Search species" value={query} onChangeText={setQuery} placeholder="Search fish" />
      <ErrorMessage message={catalog.error} />{catalog.error && <Button title="Retry" secondary onPress={catalog.refresh} />}
      {matches.slice(0, 8).map(s => <SpringPressable key={s.species_id} disabled={!!busy} accessibilityRole="radio" accessibilityState={{ checked: selected?.species_id === s.species_id }} onPress={() => { setSelected(s); setManual(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line }}><Text style={[ui.name, { fontSize: 16 }]}>{selected?.species_id === s.species_id ? '● ' : '○ '}{s.common_name}</Text></SpringPressable>)}
      {!catalog.loading && !matches.length && <Text style={ui.small}>No matches.</Text>}
    </View>}
    {selected && <Reveal key={selected.species_id} style={{ gap: 16 }}>
      {!result?.candidates.some(candidate => candidate.species_id === selected.species_id) && <Text style={ui.name}>{selected.common_name}</Text>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MeasurementInput label="Weight" unit="lb" value={weight} onChangeText={setWeight} editable={!busy} />
        <MeasurementInput label="Total length" unit="in" value={length} onChangeText={setLength} editable={!busy} />
      </View>
      {record && <Text style={ui.small}>Your best: {measurement(record.heaviest.weight_lbs)} lb · {measurement(record.longest.length_inches)} in</Text>}
      <RegulationCheck species={selected} length={length} />
      <ErrorMessage message={error} />
      <Button title="Save catch" onPress={() => void save()} busy={!!busy} />
    </Reveal>}
  </Page>;
}
