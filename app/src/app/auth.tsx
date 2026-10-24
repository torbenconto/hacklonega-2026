import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, ErrorMessage, Heading, Input, Page, ui } from '@/components/fishing-ui';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function Auth() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const create = mode === 'create';
  const { setUsername } = useSession();
  const [username, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!(create ? /^[A-Za-z_ ]{1,32}$/ : /^[A-Za-z0-9_ -]{1,32}$/).test(username) || !username.trim()) { setError('Use 1–32 letters (A–Z), underscores, or spaces.'); return; }
    setBusy(true); setError('');
    try {
      const name = username.trim().toLowerCase();
      let existing: { username: string } | null = null;
      try { existing = await api<{ username: string }>('/auth/me', {}, name); }
      catch (e) { if (!(e instanceof ApiError) || e.status !== 401) throw e; }
      if (create && existing) throw new Error('That username already exists. Sign in instead.');
      if (!create && !existing) throw new Error('Username not found. Create an account first.');
      const user = existing || await api<{ username: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username: name }) });
      setUsername(user.username); router.replace('/(tabs)/species');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Page><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 18 }}>
    <Button title="← Back" secondary onPress={() => router.back()} />
    <Heading eyebrow="Your field journal" title={create ? 'Make it yours.' : 'Welcome back.'} subtitle={create ? 'Choose a username to start your fishing journal.' : 'Enter your username to pick up where you left off.'} />
    <Text style={ui.name}>Username</Text><Input accessibilityLabel="Username" value={username} onChangeText={setName} placeholder="e.g. River Explorer" autoCapitalize="none" autoCorrect={false} maxLength={32} onSubmitEditing={submit} returnKeyType="go" />
    <Text style={ui.small}>Letters, underscores, and spaces only. Usernames are case-insensitive.</Text>
    <ErrorMessage message={error} /><Button title={create ? 'Create account' : 'Sign in'} onPress={submit} busy={busy} />
    <Button title={create ? 'Already have an account? Sign in' : 'New here? Create an account'} secondary onPress={() => { setError(''); router.replace(`/auth?mode=${create ? 'signin' : 'create'}`); }} />
    <Text style={ui.small}>Hackathon accounts use only a username. Anyone who knows yours can access this journal.</Text>
  </KeyboardAvoidingView></Page>;
}
