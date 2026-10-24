import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';

export default function Welcome() {
  const { username } = useSession();
  return <Redirect href={username ? '/(tabs)/identify' : '/auth'} />;
}
