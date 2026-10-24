import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/lib/session';
import { colors } from '@/components/fishing-ui';

export default function MainLayout() {
  const { username } = useSession();
  if (!username) return <Redirect href="/auth" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, paddingTop: 8, paddingBottom: 10, minHeight: 68 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '800' } }}>
    <Tabs.Screen name="identify" options={{ title: 'Identify', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>＋</Text> }} />
    <Tabs.Screen name="species" options={{ title: 'Fishdex', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▦</Text> }} />
    <Tabs.Screen name="history" options={{ title: 'Journal', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◷</Text> }} />
    <Tabs.Screen name="regulations" options={{ title: 'Rules', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>☷</Text> }} />
  </Tabs>;
}
