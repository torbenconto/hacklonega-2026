import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { api, type FishLog, type Species } from '@/lib/api';
import { useSession } from '@/lib/session';
import { measurement } from '@/lib/collection';
import { CatchDisposition } from './catch-disposition';
import { MeasurementInput } from './measurement-input';
import { FishImage } from './fish-image';
import { Reveal } from './motion';
import { Badge, Button, ErrorMessage, Input, colors, ui } from './fishing-ui';

export function CatchCard({ log, species, best, onSaved }: { log: FishLog; species?: Species; best?: boolean; onSaved: () => void }) {
  const { username } = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(log.species);
  const [weight, setWeight] = useState(String(log.weight_lbs));
  const [length, setLength] = useState(String(log.length_inches));
  const [disposition, setDisposition] = useState(log.disposition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function edit() {
    setName(log.species); setWeight(String(log.weight_lbs)); setLength(String(log.length_inches));
    setDisposition(log.disposition); setError(''); setEditing(true);
  }
  async function save() {
    if (!username || saving) return;
    const weightLbs = Number(weight), lengthInches = Number(length);
    if (!name.trim() || !Number.isFinite(weightLbs) || weightLbs <= 0 || !Number.isFinite(lengthInches) || lengthInches <= 0) {
      setError('Enter a species and positive weight and length.'); return;
    }
    setSaving(true); setError('');
    try {
      await api<FishLog>(`/catches/${log.id}`, { method: 'PATCH', body: JSON.stringify({
        species: name.trim(), weight_lbs: weightLbs, length_inches: lengthInches,
        ...(disposition === 'kept' || disposition === 'released' ? { disposition } : {}),
      }) }, username);
      setEditing(false); onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }
  return <Reveal style={[ui.card, { paddingVertical: 12 }]}>
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {log.photo_data ? <Image accessibilityLabel={`Your ${log.species} catch photo`} source={{ uri: log.photo_data }} style={{ width: 100, height: 140, borderRadius: 8, alignSelf: 'center', backgroundColor: colors.soft }} resizeMode="cover" /> : <View style={{ width: 100, justifyContent: 'center' }}>{species && <FishImage speciesId={species.species_id} name={species.common_name} height={100} unlocked animated={false} />}<Text style={[ui.small, { textAlign: 'center' }]}>No saved photo</Text></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <Text style={ui.eyebrow}>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}</Text>
        <Text style={ui.small}>{new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })}</Text>
        <Text style={ui.name}>{log.species}</Text>
        <Text style={ui.body}>{measurement(log.weight_lbs)} lb · {measurement(log.length_inches)} in</Text>
        <Text style={ui.small}>{log.disposition === 'kept' ? 'Kept' : log.disposition === 'released' ? 'Released' : 'Outcome not recorded'}</Text>
        {best && <Badge gold>★ HEAVIEST CATCH</Badge>}
      </View>
    </View>
    {!editing && <View style={{ alignSelf: 'flex-end' }}><Button title="Edit catch" secondary onPress={edit} /></View>}
    {editing && <View style={{ gap: 12 }}>
      <Text style={ui.section}>Edit catch</Text>
      <Text style={ui.small}>Species</Text>
      <Input accessibilityLabel="Catch species" value={name} onChangeText={setName} editable={!saving} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MeasurementInput label="Weight" unit="lb" value={weight} onChangeText={setWeight} editable={!saving} />
        <MeasurementInput label="Length" unit="in" value={length} onChangeText={setLength} editable={!saving} />
      </View>
      <CatchDisposition value={disposition} onChange={setDisposition} disabled={saving} />
      <ErrorMessage message={error} />
      <View style={ui.row}><Button title="Cancel" secondary disabled={saving} onPress={() => setEditing(false)} /><Button title="Save changes" busy={saving} onPress={() => void save()} /></View>
    </View>}
  </Reveal>;
}
