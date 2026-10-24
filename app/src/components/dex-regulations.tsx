import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api, type RegulationSummary, type Species, type FishLog } from '@/lib/api';
import { Button, ErrorMessage, TextLink, colors, ui } from './fishing-ui';
import { DailyLimitProgress } from './daily-limit-progress';
import { MeasurementInput } from './measurement-input';

export const OFFICIAL_RULES = 'https://georgiawildlife.com/fishing-regulations';

export function DexRegulations({ species, length: measuredLength, logs }: { species: Species; length?: string; logs?: FishLog[] | null }) {
  const [rules, setRules] = useState<RegulationSummary | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [length, setLength] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api<RegulationSummary>(`/regulations/summary?species_id=${encodeURIComponent(species.species_id)}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setRules(value); })
      .catch(e => { if (!controller.signal.aborted) setError((e as Error).message); });
    return () => controller.abort();
  }, [species.species_id, attempt]);
  const size = rules?.size.length;
  const enteredLength = measuredLength ?? length;
  const inches = Number(enteredLength);
  const valid = enteredLength.trim() !== '' && Number.isFinite(inches) && inches > 0;
  const closed = rules?.season.status === 'closed_year_round';
  const lengthLabel = size?.status === 'minimum' ? `${size.minimum_inches} in min`
    : size?.status === 'maximum' ? `${size.maximum_inches} in max`
    : size?.status === 'range' ? `${size.minimum_inches}–${size.maximum_inches} in`
    : size?.status === 'no_verified_restriction' ? 'No baseline limit' : 'Not reviewed';
  const seasonLabel = closed ? 'Closed all year' : rules?.season.status === 'year_round' ? 'Year-round'
    : rules?.season.status === 'restricted' ? `${rules.season.opens_on}–${rules.season.closes_on}` : 'Not reviewed';
  const outside = valid && ((size?.minimum_inches !== undefined && inches < size.minimum_inches) || (size?.maximum_inches !== undefined && inches > size.maximum_inches));
  return <View style={{ gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
    <View style={ui.row}><Text style={[ui.name, { fontSize: 17 }]}>Georgia rules</Text><Text style={ui.small}>Statewide</Text></View>
    {!rules && !error && <ActivityIndicator accessibilityLabel="Loading fishing rules" color={colors.green} />}
    <ErrorMessage message={error} />
    {!!error && <Button title="Retry rules" secondary onPress={() => { setError(''); setAttempt(value => value + 1); }} />}
    {rules && <>
      {closed && <Text style={ui.error}>Taking this species is prohibited year-round.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          ['Length', lengthLabel],
          ['Daily limit', rules.daily_limit.status === 'specified' ? `${rules.daily_limit.limit} fish` : rules.daily_limit.status === 'no_statewide_limit' ? 'No baseline limit' : 'Not reviewed'],
          ['Season', seasonLabel],
        ].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 85, gap: 5 }}><Text style={ui.small}>{label}</Text><Text style={[ui.name, { fontSize: 16 }]}>{value}</Text></View>)}
      </View>
      {logs !== undefined && <DailyLimitProgress logs={logs} rule={rules.daily_limit} />}
      {!closed && measuredLength === undefined && <MeasurementInput label="Your fish’s length" unit="in" value={length} onChangeText={setLength} />}
      {!closed && !!enteredLength.trim() && <Text accessibilityLiveRegion="polite" style={outside || !valid ? ui.error : ui.small}>{!valid ? 'Length must be above zero.' : outside ? 'Outside the statewide length limit.' : size?.status === 'not_reviewed' ? 'Length rules not reviewed.' : size?.status === 'no_verified_restriction' ? 'No verified statewide length restriction.' : 'Meets the statewide length limit only.'}</Text>}
      <Text style={ui.small}>Statewide only. Check local rules, licenses, and seasons before keeping.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>{expanded ? 'Hide sources' : 'Sources & details'}</Text></Pressable>
      {expanded && <View style={{ gap: 8 }}><Text style={ui.small}>{rules.daily_limit.guidance}</Text>{rules.exception_notes.map(note => <Text key={note} style={ui.small}>{note}</Text>)}{rules.warnings.map(warning => <Text key={warning} style={ui.small}>{warning}</Text>)}{rules.sources.map(source => <TextLink key={source.reference} title={source.reference} url={source.url} />)}<Text style={ui.small}>Reviewed {rules.reviewed_on}</Text><TextLink title="Official Georgia regulations" url={OFFICIAL_RULES} /></View>}
    </>}
  </View>;
}
