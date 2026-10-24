import { type ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SpringPressable } from './motion';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { bg: '#FAF9F3', ink: '#20352E', muted: '#64716B', line: '#DFE5E1', green: '#285B48', orange: '#EDBC54', white: '#FFFFFF', soft: '#EDF2EE', dark: '#243F34', gold: '#F4EDDE' };
export function Page({ children }: { children: ReactNode }) {
  return <SafeAreaView style={ui.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <View style={{ gap: 10, marginBottom: 4 }}><Text style={ui.eyebrow}>{eyebrow.toUpperCase()}</Text><Text style={ui.title}>{title}</Text>{subtitle && <Text style={ui.body}>{subtitle}</Text>}</View>;
}
export function Badge({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return <View style={[ui.badge, gold && { backgroundColor: colors.gold }]}><Text style={[ui.badgeText, gold && { color: '#74501C' }]}>{children}</Text></View>;
}
export function Stat({ value, label, light = false }: { value: string; label: string; light?: boolean }) {
  return <View style={{ flex: 1, gap: 5, alignSelf: 'stretch' }}><Text style={[ui.stat, light && { color: colors.white }]}>{value}</Text><Text style={[ui.small, light && { color: '#C2D7CB' }]}>{label}</Text></View>;
}
export function TextLink({ title, url }: { title: string; url: string }) {
  const [error, setError] = useState(false);
  return <View><Pressable accessibilityRole="link" onPress={() => { setError(false); void Linking.openURL(url).catch(() => setError(true)); }} style={{ paddingVertical: 8, minHeight: 40, justifyContent: 'center' }}><Text style={{ color: colors.green, fontSize: 13, lineHeight: 19, fontWeight: '700', textDecorationLine: 'underline' }}>{title} ↗</Text></Pressable>{error && <Text style={ui.error}>Could not open this link. Please try again.</Text>}</View>;
}
export function Button({ title, onPress, secondary, accent, disabled, busy }: { title: string; onPress: () => void; secondary?: boolean; accent?: boolean; disabled?: boolean; busy?: boolean }) {
  return <SpringPressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }} disabled={disabled || busy} onPress={onPress} style={[ui.button, secondary && ui.secondary, accent && { backgroundColor: colors.orange }, (disabled || busy) && { opacity: .5 }]}>{busy ? <ActivityIndicator color={secondary || accent ? colors.green : colors.white} /> : <Text style={[ui.buttonText, (secondary || accent) && { color: colors.ink }]}>{title}</Text>}</SpringPressable>;
}
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} {...props} style={[ui.input, props.style]} />; }
export function ErrorMessage({ message }: { message: string }) { return message ? <Text accessibilityRole="alert" style={ui.error}>{message}</Text> : null; }
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingTop: 28, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 840, alignSelf: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: colors.green },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.ink, letterSpacing: -0.9 },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: { paddingVertical: 20, borderBottomWidth: 1, borderColor: colors.line, gap: 12 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  button: { backgroundColor: colors.green, paddingHorizontal: 20, paddingVertical: 17, borderRadius: 5, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 17, color: colors.ink, fontSize: 16, minHeight: 54 },
  error: { color: '#A23928', backgroundColor: '#FBE8E0', padding: 14, borderRadius: 3, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  photo: { height: 240, width: '100%', borderRadius: 4, backgroundColor: '#E1E8DD' },
  hero: { padding: 24, borderRadius: 0, backgroundColor: colors.dark, gap: 18, overflow: 'hidden' },
  heroTitle: { color: colors.white, fontWeight: '700', fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
  heroBody: { color: '#C2D7CB', fontSize: 15, lineHeight: 23 },
  badge: { backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, alignSelf: 'flex-start' },
  badgeText: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  stat: { color: colors.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -1 },
  chip: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 3, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  section: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.6 },
});
