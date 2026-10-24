import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from './api';
import { journalIdentity } from './journal-identity';
import { Button, ErrorMessage, Page, colors, ui } from '@/components/fishing-ui';

const Session = createContext<{ username: string | null; activeQuest: string; setActiveQuest: (value: string) => void }>({ username: null, activeQuest: 'first', setActiveQuest: () => {} });
// Share initialization across Strict Mode effects; persist before registering so
// a lost network response cannot create a different journal on the next launch.
let opening: Promise<string> | null = null;
function openJournal() {
  opening ??= journalIdentity().then(async username => {
    await api('/auth/login', { method: 'POST', body: JSON.stringify({ username }) });
    return username;
  }).catch(error => { opening = null; throw error; });
  return opening;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState('first');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setError(''); setAttempt(value => value + 1); }, []);
  useEffect(() => {
    let alive = true;
    openJournal().then(name => { if (alive) setUsername(name); }).catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [attempt]);
  if (!username) return <Page><View style={{ paddingTop: 80, gap: 18 }}>
    <Text style={ui.eyebrow}>FISHNERD</Text><Text style={ui.title}>A little more outdoors.</Text>
    <Text style={ui.body}>{error ? 'Your journal is ready on this device. Reconnect to open it.' : 'Getting your field journal ready…'}</Text>
    {error ? <><ErrorMessage message={error} /><Button title="Try again" onPress={retry} /></> : <ActivityIndicator color={colors.green} />}
  </View></Page>;
  return <Session.Provider value={{ username, activeQuest, setActiveQuest }}>{children}</Session.Provider>;
}
export const useSession = () => useContext(Session);
