import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { api, type RegulationResult, type Species } from '@/lib/api';
import { Badge, Button, colors, ErrorMessage, TextLink, ui } from './fishing-ui';

export const OFFICIAL_RULES = 'https://georgiawildlife.com/fishing-regulations';

export function RegulationCheck({ species, length }: { species: Species; length: string }) {
  return <CheckContent key={`${species.species_id}:${length}`} species={species} length={length} />;
}

function CheckContent({ species, length }: { species: Species; length: string }) {
  const [result, setResult] = useState<RegulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const inches = Number(length);
  const valid = Number.isFinite(inches) && inches > 0;
  const current = result?.species_id === species.species_id && result.length_inches === inches ? result : null;
  useEffect(() => () => request.current?.abort(), []);

  async function check() {
    if (!valid || busy) return;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setBusy(true); setError('');
    try {
      const response = await api<RegulationResult>('/regulations/check', {
        method: 'POST', signal: controller.signal,
        body: JSON.stringify({ species_id: species.species_id, length_inches: inches }),
      });
      if (!controller.signal.aborted) setResult(response);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <View style={[ui.card, { borderColor: '#D9C493', backgroundColor: '#FFF9EA' }]}>
    <Badge gold>KNOW BEFORE YOU KEEP</Badge>
    <Text style={ui.name}>Length & daily limits</Text>
    <Text style={ui.small}>Check {species.common_name.toLowerCase()} against Georgia’s statewide baseline. Waterbody exceptions still apply.</Text>
    {!valid && <Text style={ui.small}>Enter a measured length above to check this fish.</Text>}
    <Button title={current ? 'Check again' : 'Check this fish’s rules'} onPress={() => void check()} disabled={!valid} busy={busy} secondary />
    <ErrorMessage message={error} />
    {current && <View style={{ gap: 12 }}>
      <Text style={[ui.name, current.length_result === 'below_baseline' && { color: '#9D4328' }]}>{
        current.length_result === 'below_baseline' ? 'Below the baseline minimum' :
        current.length_result === 'meets_baseline' ? 'Meets the baseline length only' :
        current.length_result === 'no_baseline_length_limit' ? 'No statewide baseline length limit' : 'Length rules not reviewed'
      }</Text>
      {current.minimum_length_inches !== null && <Text style={ui.body}>Baseline minimum: {current.minimum_length_inches} inches</Text>}
      <Text style={ui.small}>{current.length_guidance}</Text>
      <View style={[ui.card, { padding: 14, borderColor: '#E8D7B2' }]}><Text style={ui.name}>{current.daily_limit.status === 'specified' ? `${current.daily_limit.limit} fish / day — baseline` : current.daily_limit.status === 'no_statewide_limit' ? 'No statewide daily limit listed' : 'Daily limit not reviewed'}</Text><Text style={ui.small}>{current.daily_limit.guidance}</Text></View>
      {current.exception_notes.map(note => <Text key={note} style={ui.small}>• {note}</Text>)}
      <Text style={[ui.small, { color: '#795323', fontWeight: '700' }]}>This does not authorize keeping a fish. Licenses, seasons, protected species, local rules, and retained-fish counts are not evaluated.</Text>
      {current.sources.map(source => <TextLink key={source.url + source.reference} title={source.reference} url={source.url} />)}
      <Text style={[ui.small, { fontSize: 11 }]}>Rules reviewed {current.reviewed_on} · {current.ruleset_version}</Text>
    </View>}
    <TextLink title="Current official Georgia fishing regulations" url={OFFICIAL_RULES} />
    <Text style={[ui.small, { color: colors.muted }]}>Logging a catch records an observation; it does not mean you kept it.</Text>
  </View>;
}
