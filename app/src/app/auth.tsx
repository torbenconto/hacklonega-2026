import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, ErrorMessage, Heading, Input, Page, ui } from '@/components/fishing-ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { FishImage } from '@/components/fish-image';

export default function Auth() {
  const { username: activeUser, setUsername } = useSession();
  const [username, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(username.trim())) { setError('Use 1–32 letters, numbers, underscores, or hyphens.'); return; }
    setBusy(true); setError('');
    try {
      const name = username.trim().toLowerCase();
      const user = await api<{ username: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username: name }) });
      setUsername(user.username); router.replace('/(tabs)/identify');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (activeUser) return <Redirect href="/(tabs)/identify" />;
  return <Page><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 18 }}>
    <Heading eyebrow="Reel Georgia / A freshwater field companion" title={'Small catches.\nGreat discoveries.'} subtitle="Meet the fish in Georgia’s waters. Build your Fishdex, celebrate personal bests, and know the rules before you keep." />
    <View style={{ borderRadius: 22, overflow: 'hidden' }}><FishImage speciesId="oncorhynchus_mykiss" name="Rainbow trout" height={185} /></View>
    <Text style={ui.name}>Your journal name</Text><Input accessibilityLabel="Journal username" value={username} onChangeText={setName} placeholder="e.g. river_explorer" autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={32} onSubmitEditing={submit} returnKeyType="go" />
    <Text style={ui.small}>Letters, numbers, underscores, and hyphens. Use the same name to reopen your journal.</Text>
    <ErrorMessage message={error} /><Button title="Open journal" onPress={submit} busy={busy} />
    <Text style={ui.small}>This demo uses a username without a password. Anyone with the name can open its journal.</Text>
  </KeyboardAvoidingView></Page>;
}
