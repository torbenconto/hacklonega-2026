import { Redirect } from 'expo-router';

export default function Welcome() {
  return <Redirect href="/(tabs)/identify" />;
}
