import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useJournal } from '@/hooks/use-journal';
import { useSession } from '@/lib/session';
import { fishingQuests } from '@/lib/quests';
import { collectionProgress } from '@/lib/collection';
import { Badge, Button, ErrorMessage, Heading, Page, colors, ui } from '@/components/fishing-ui';
import { ProgressBar, Reveal, SpringPressable } from '@/components/motion';

export default function Quests() {
  const journal = useJournal();
  const { activeQuest, setActiveQuest } = useSession();
  const [expanded, setExpanded] = useState<string | null>(activeQuest);
  const [filter, setFilter] = useState<'In progress' | 'Completed'>('In progress');
  const quests = journal.logs === null ? [] : fishingQuests(journal.logs);
  const completed = quests.filter(q => q.current >= q.target);
  const journey = journal.logs === null ? null : collectionProgress(journal.logs);
  return <Page>
    <Heading eyebrow="A reason to get outside" title="Little quests. Big stories." subtitle="Pick a goal for your next trip. Your saved catches take care of the progress." />
    <View style={{ backgroundColor: colors.green, borderRadius: 20, padding: 22, gap: 16 }}>
      <View style={ui.row}><Text style={[ui.heroTitle, { flex: 1 }]}>{journey?.rank ?? 'Your next adventure'}</Text><Text style={{ color: colors.orange, fontSize: 28 }}>✦</Text></View>
      <Text style={ui.heroBody}>{journey ? `Level ${journey.level} · ${journey.xp} XP · ${completed.length} of ${quests.length} quests complete` : 'Loading your field notes…'}</Text>
      {journey && <ProgressBar progress={journey.levelXP / 300} color={colors.orange} label={`${journey.levelXP} of 300 XP toward your next level`} />}
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['In progress', 'Completed'] as const).map(tab => <SpringPressable key={tab} accessibilityRole="button" accessibilityState={{ selected: filter === tab }} onPress={() => setFilter(tab)} style={[ui.chip, filter === tab && ui.chipActive, { borderRadius: 24 }]}><Text style={{ color: filter === tab ? colors.white : colors.ink, fontWeight: '700' }}>{tab}{tab === 'Completed' ? ` (${completed.length})` : ''}</Text></SpringPressable>)}</View>
    <ErrorMessage message={journal.error} />{journal.error && <Button title="Reload quests" onPress={journal.refresh} />}
    {journal.loading && <ActivityIndicator color={colors.green} />}
    {quests.filter(q => (q.current >= q.target) === (filter === 'Completed')).map((q, index) => {
      const done = q.current >= q.target;
      const open = expanded === q.id;
      const tracked = activeQuest === q.id && !done;
      return <Reveal key={q.id} delay={index * 40} style={{ padding: 20, borderRadius: 18, borderWidth: tracked ? 2 : 1, borderColor: tracked ? colors.green : colors.line, backgroundColor: colors.white, gap: 14 }}>
        <SpringPressable accessibilityRole="button" accessibilityLabel={`${q.title}, ${q.current} of ${q.target}. ${open ? 'Hide' : 'Show'} quest details`} accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : q.id)} style={{ gap: 12 }}>
          <View style={ui.row}><Text style={[ui.eyebrow, { flex: 1 }]}>{done ? '✓ COMPLETED' : tracked ? '↗ YOUR NEXT ADVENTURE' : `QUEST ${String(index + 1).padStart(2, '0')}`}</Text><Text style={ui.small}>{open ? '−' : '+'}</Text></View>
          <Text style={ui.name}>{q.title}</Text><Text style={ui.small}>{q.subtitle}</Text>
          <ProgressBar progress={q.current / q.target} label={`${q.title}: ${q.current} of ${q.target}`} />
          <Text style={[ui.small, { fontWeight: '700', color: colors.green }]}>{q.current} / {q.target} {q.unit}</Text>
        </SpringPressable>
        {open && <View style={{ gap: 12 }}><Text style={ui.body}>{q.detail}</Text>
          {done ? <Badge gold>FIELD NOTES COMPLETE</Badge> : <>
            <Button title={tracked ? q.actionLabel : 'Make this my next quest'} onPress={() => { setActiveQuest(q.id); if (tracked) router.navigate(q.action === 'species' ? '/(tabs)/species' : '/(tabs)/identify'); }} />
            {!tracked && <Button title={q.actionLabel} secondary onPress={() => { setActiveQuest(q.id); router.navigate(q.action === 'species' ? '/(tabs)/species' : '/(tabs)/identify'); }} />}
          </>}
        </View>}
      </Reveal>;
    })}
    {!!quests.length && filter === 'Completed' && !completed.length && <View style={ui.card}><Text style={ui.name}>Your first story is waiting.</Text><Text style={ui.body}>Complete a quest and it will land here. Start with one saved catch.</Text><Button title="See my quests" onPress={() => setFilter('In progress')} /></View>}
    {!!quests.length && filter === 'In progress' && completed.length === quests.length && <View style={ui.card}><Text style={ui.name}>Every quest, a story told.</Text><Text style={ui.body}>Keep discovering fish and growing your journal.</Text><Button title="Find another fish" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
  </Page>;
}
