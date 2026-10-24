import { Redirect, useLocalSearchParams } from 'expo-router';

// Preserve old links while keeping rules inside the field guide.
export default function Regulations() {
  const { species_id } = useLocalSearchParams<{ species_id?: string }>();
  return <Redirect href={species_id ? { pathname: '/fish/[id]', params: { id: species_id } } : '/(tabs)/species'} />;
}
