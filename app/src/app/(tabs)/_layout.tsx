import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Icon } from '@/components/icon';
import { colors } from '@/components/fishing-ui';

export default function MainLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, paddingTop: 8, paddingBottom: 10, minHeight: 68 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="identify" options={{ title: 'Identify', tabBarIcon: ({ color }) => <Icon name="camera" color={color} /> }} />
    <Tabs.Screen name="species" options={{ title: 'Fishdex', tabBarIcon: ({ color }) => <Icon name="book" color={color} /> }} />
    <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 25 }}>✦</Text> }} />
    <Tabs.Screen name="leaderboards" options={{ title: 'Rankings', tabBarIcon: ({ color }) => <View style={{ width: 24, height: 24, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, paddingBottom: 3 }}>{[10, 19, 14].map((height, index) => <View key={index} style={{ width: 5, height, borderRadius: 1, backgroundColor: color }} />)}</View> }} />
    <Tabs.Screen name="history" options={{ title: 'Journal', tabBarIcon: ({ color }) => <Icon name="journal" color={color} /> }} />
    <Tabs.Screen name="regulations" options={{ href: null }} />
  </Tabs>;
}
