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
    <Heading eyebrow="Fishnerd" title="Your adventure starts here." />
    <View style={{ borderRadius: 22, overflow: 'hidden' }}><FishImage speciesId="oncorhynchus_mykiss" name="Rainbow trout" height={185} /></View>
    <Text style={ui.name}>Journal name</Text><Input accessibilityLabel="Journal username" value={username} onChangeText={setName} placeholder="e.g. river_explorer" autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={32} onSubmitEditing={submit} returnKeyType="go" />
    <ErrorMessage message={error} /><Button title="Open journal" onPress={submit} busy={busy} />
    <Text style={ui.small}>Demo: no password. Anyone with this name can open the journal.</Text>
  </KeyboardAvoidingView></Page>;
}
