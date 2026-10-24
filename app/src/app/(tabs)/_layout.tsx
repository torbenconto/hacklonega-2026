import { Redirect, Tabs } from 'expo-router';
import { Icon } from '@/components/icon';
import { useSession } from '@/lib/session';
import { colors } from '@/components/fishing-ui';

export default function MainLayout() {
  const { username } = useSession();
  if (!username) return <Redirect href="/auth" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, paddingTop: 8, paddingBottom: 10, minHeight: 68 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="identify" options={{ title: 'Identify', tabBarIcon: ({ color }) => <Icon name="camera" color={color} /> }} />
    <Tabs.Screen name="species" options={{ title: 'Fishdex', tabBarIcon: ({ color }) => <Icon name="book" color={color} /> }} />
    <Tabs.Screen name="history" options={{ title: 'Journal', tabBarIcon: ({ color }) => <Icon name="journal" color={color} /> }} />
    <Tabs.Screen name="regulations" options={{ href: null }} />
  </Tabs>;
}
