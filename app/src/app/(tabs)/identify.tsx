import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { router } from 'expo-router';
import { api, type Prediction, type Species } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, ErrorMessage, Heading, Input, Page, colors, ui } from '@/components/fishing-ui';

type Photo = { uri: string };
export default function Identify() {
  const { username } = useSession();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [selected, setSelected] = useState<Species | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [catalog, setCatalog] = useState<Species[]>([]);
  const [query, setQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  async function choose(uri: string) {
    // Team demo PNGs are 15–42 MB. Convert every photo to a bounded JPEG
    // before sending it to the existing backend's 10 MiB / 20 MP endpoint.
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    try {
      const converted = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: .85 });
      setPhoto({ uri: converted.uri }); setResult(null); setSelected(null);
      setSaved(false); setQuery(''); setWeight(''); setLength(''); setError('');
    } finally { rendered.release(); context.release(); }
  }
  async function pick(camera: boolean) {
    setError('');
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError('Camera access is needed to take a photo. Enable it in Settings, or upload a photo instead.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: .8, allowsEditing: true };
      const picked = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!picked.canceled && picked.assets[0]) {
        const asset = picked.assets[0];
        setBusy('Preparing photo');
        await choose(asset.uri);
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  async function demo(item: typeof DEMO_PHOTOS[number]) {
    setBusy('Preparing demo photo'); setError('');
    try {
      const asset = Asset.fromModule(item.asset);
      await asset.downloadAsync();
      await choose(asset.localUri || asset.uri);
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  async function identify() {
    if (!photo) return;
    setBusy('Identifying your fish… First use may take a few minutes while the model loads.'); setError('');
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        form.append('file', await (await fetch(photo.uri)).blob(), 'fish.jpg');
      } else {
        form.append('file', { uri: photo.uri, name: 'fish.jpg', type: 'image/jpeg' } as unknown as Blob);
      }
      const prediction = await api<Prediction>('/predict?top_k=3', { method: 'POST', body: form });
      setResult(prediction); setSelected(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  async function save() {
    if (!photo || !selected || !username || saved) return;
    const pounds = Number(weight), inches = Number(length);
    if (!Number.isFinite(pounds) || pounds <= 0 || !Number.isFinite(inches) || inches <= 0) { setError('Enter a positive weight in pounds and length in inches to save your catch.'); return; }
    setBusy('Saving to your journal'); setError('');
    try { await api('/catches', { method: 'POST', body: JSON.stringify({ species: selected.common_name, weight_lbs: pounds, length_inches: inches }) }, username); setSaved(true); }
    catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  async function browse() {
    setBusy('Loading species'); setError('');
    try { setCatalog((await api<{ species: Species[] }>('/species')).species); }
    catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  return <Page>
    <Heading eyebrow="The fish finder" title="What’s your catch?" subtitle="One clear photo is all it takes to explore a possible match. You confirm the species before it goes in your journal." />
    <View style={ui.card}><Text style={ui.eyebrow}>01 / ADD A PHOTO</Text><Button title="Take a photo" disabled={!!busy} onPress={() => void pick(true)} /><Button title="Upload a photo" secondary disabled={!!busy} onPress={() => void pick(false)} /><Text style={ui.small}>JPEG, PNG, or WebP · Up to 10 MiB / 20 MP</Text></View>
    {!photo && <View style={{ gap: 12 }}><Text style={ui.name}>Just exploring? Try a demo.</Text>{DEMO_PHOTOS.map(item => <View key={item.id} style={ui.card}><Pressable accessibilityRole="button" accessibilityLabel={`Choose ${item.name}`} disabled={!!busy} onPress={() => void demo(item)}><Image source={item.asset} style={[ui.photo, { height: 160 }]} resizeMode="cover" /><Text style={[ui.name, { marginTop: 12 }]}>{item.name} ↗</Text></Pressable></View>)}</View>}
    {photo && <View style={ui.card}><Image source={{ uri: photo.uri }} style={ui.photo} resizeMode="contain" /><Button title="Identify this fish" disabled={!!busy || saved} onPress={identify} /><Button title="Choose another photo" secondary disabled={!!busy} onPress={() => { setPhoto(null); setResult(null); setSelected(null); setSaved(false); setCatalog([]); setError(''); }} /></View>}
    {!!busy && <View style={[ui.card, ui.row]}><ActivityIndicator color={colors.green} /><Text style={[ui.body, { flex: 1 }]}>{busy}</Text></View>}
    <ErrorMessage message={error} />
    {result && <View style={ui.card}><Text style={ui.eyebrow}>02 / REVIEW THE MATCH</Text><Text style={ui.name}>{result.status === 'candidate' ? 'A possible match.' : 'Let’s take a closer look.'}</Text><Text style={ui.body}>{result.reason}</Text><Text style={ui.small}>Select the species you recognize. These are suggestions, and similarity scores are not probabilities.</Text>{result.candidates.map(s => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected?.species_id === s.species_id }} disabled={!!busy || saved} key={s.species_id} onPress={() => setSelected(s)} style={[ui.card, { borderColor: selected?.species_id === s.species_id ? colors.green : colors.line, backgroundColor: selected?.species_id === s.species_id ? '#E8EDDD' : colors.white }]}><Text style={ui.name}>{selected?.species_id === s.species_id ? '● ' : '○ '}{s.common_name}</Text><Text style={ui.small}>{s.scientific_name} · Similarity {s.similarity.toFixed(3)}</Text></Pressable>)}<Text style={ui.small}>{result.notice}</Text></View>}
    {photo && !saved && <><Button title="Choose a species from the catalog" secondary disabled={!!busy} onPress={browse} />{catalog.length > 0 && <View style={ui.card}><Input accessibilityLabel="Find species to confirm" value={query} onChangeText={setQuery} placeholder="Search the Georgia catalog" />{(query.trim() ? catalog.filter(s => `${s.common_name} ${s.scientific_name}`.toLowerCase().includes(query.toLowerCase())) : catalog).slice(0, 15).map(s => <Pressable key={s.species_id} accessibilityRole="radio" accessibilityState={{ checked: selected?.species_id === s.species_id }} onPress={() => setSelected(s)} style={{ paddingVertical: 10 }}><Text style={ui.name}>{selected?.species_id === s.species_id ? '● ' : '○ '}{s.common_name}</Text><Text style={ui.small}>{s.scientific_name}</Text></Pressable>)}<Text style={ui.small}>Search to narrow the list. Only save a species you can confirm.</Text></View>}</>}
    {selected && !saved && <View style={ui.card}><Text style={ui.name}>Your identification: {selected.common_name}</Text><Text style={ui.body}>Add your measurements to save this confirmed catch to your fishing history.</Text><Text style={ui.small}>Weight (lbs)</Text><Input accessibilityLabel="Weight in pounds" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 2.5" /><Text style={ui.small}>Total length (inches)</Text><Input accessibilityLabel="Length in inches" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="e.g. 16" /><Button title="Confirm & log this fish" onPress={save} disabled={!!busy} /></View>}
    {saved && <View style={[ui.card, { backgroundColor: '#E8EDDD' }]}><Text style={ui.name}>A new story in your journal.</Text><Text style={ui.body}>{selected?.common_name} was saved to your account.</Text><Button title="View fishing history →" onPress={() => router.navigate('/(tabs)/history')} /></View>}
  </Page>;
}
