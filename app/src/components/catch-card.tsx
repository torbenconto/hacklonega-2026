import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { api, type FishLog, type Species } from '@/lib/api';
import { useSession } from '@/lib/session';
import { measurement, parseMeasurement } from '@/lib/collection';
import { CatchDisposition } from './catch-disposition';
import { MeasurementInput } from './measurement-input';
import { FishImage } from './fish-image';
import { Reveal, SpringPressable } from './motion';
import { Badge, Button, ErrorMessage, Input, colors, ui } from './fishing-ui';

export function CatchCard({ log, species, best, longest, onSaved }: { log: FishLog; species?: Species; best?: boolean; longest?: boolean; onSaved: () => void }) {
  const { username } = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(log.species);
  const [weight, setWeight] = useState(log.weight_lbs == null ? '' : String(log.weight_lbs));
  const [length, setLength] = useState(log.length_inches == null ? '' : String(log.length_inches));
  const [disposition, setDisposition] = useState(log.disposition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function edit() {
    setName(log.species); setWeight(log.weight_lbs == null ? '' : String(log.weight_lbs)); setLength(log.length_inches == null ? '' : String(log.length_inches));
    setDisposition(log.disposition); setError(''); setEditing(true);
  }
  async function save() {
    if (!username || saving) return;
    let weightLbs: number | null, lengthInches: number | null;
    try {
      if (!name.trim()) throw new Error('Enter a species.');
      weightLbs = parseMeasurement(weight); lengthInches = parseMeasurement(length);
    } catch (e) { setError((e as Error).message); return; }
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
        <Text style={ui.small}>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })} · {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })}</Text>
        <Text style={ui.name}>{log.species}</Text>
        <Text style={ui.body}>{measurement(log.weight_lbs, 'lb')} · {measurement(log.length_inches, 'in')}<Text style={ui.small}> · {log.disposition === 'kept' ? 'Kept' : log.disposition === 'released' ? 'Released' : 'Outcome not recorded'}</Text></Text>
        {best && <Badge gold>★ HEAVIEST CATCH</Badge>}
        {longest && <Badge gold>★ LONGEST CATCH</Badge>}
        {!editing && <SpringPressable accessibilityRole="button" accessibilityLabel={`Edit ${log.species} catch`} onPress={edit} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 4, backgroundColor: colors.soft }}><Text style={{ color: colors.green, fontSize: 13, fontWeight: '600' }}>Edit catch</Text></SpringPressable>}
      </View>
    </View>
    {editing && <View style={{ gap: 12 }}>
      <Text style={ui.section}>Edit catch</Text>
      <Text style={ui.small}>Species</Text>
      <Input accessibilityLabel="Catch species" value={name} onChangeText={setName} editable={!saving} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MeasurementInput label="Weight (optional)" unit="lb" placeholder="N/A" value={weight} onChangeText={setWeight} editable={!saving} />
        <MeasurementInput label="Length (optional)" unit="in" placeholder="N/A" value={length} onChangeText={setLength} editable={!saving} />
      </View>
      <CatchDisposition value={disposition} onChange={setDisposition} disabled={saving} />
      <ErrorMessage message={error} />
      <View style={ui.row}><Button title="Cancel" secondary disabled={saving} onPress={() => setEditing(false)} /><Button title="Save changes" busy={saving} onPress={() => void save()} /></View>
    </View>}
  </Reveal>;
}
