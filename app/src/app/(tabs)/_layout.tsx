import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/lib/session';
import { colors } from '@/components/fishing-ui';

export default function MainLayout() {
  const { username } = useSession();
  if (!username) return <Redirect href="/" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 12, fontWeight: '700' } }}>
    <Tabs.Screen name="species" options={{ title: 'Species', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>≋</Text> }} />
    <Tabs.Screen name="identify" options={{ title: 'Log a fish', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>＋</Text> }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◷</Text> }} />
  </Tabs>;
}
