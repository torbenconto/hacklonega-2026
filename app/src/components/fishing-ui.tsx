import { type ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { bg: '#F5F4EC', ink: '#163E36', muted: '#62766E', line: '#DAE2D8', green: '#26634E', orange: '#E6AC59', white: '#FFFFFF', soft: '#EAF0E5', dark: '#123B33', gold: '#FAE8BE' };
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
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, accent && { backgroundColor: colors.orange }, (disabled || busy) && { opacity: .5 }, pressed && { opacity: .75 }]}>{busy ? <ActivityIndicator color={secondary || accent ? colors.green : colors.white} /> : <Text style={[ui.buttonText, (secondary || accent) && { color: colors.ink }]}>{title}</Text>}</Pressable>;
}
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} {...props} style={[ui.input, props.style]} />; }
export function ErrorMessage({ message }: { message: string }) { return message ? <Text accessibilityRole="alert" style={ui.error}>{message}</Text> : null; }
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingTop: 28, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 960, alignSelf: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: colors.green },
  title: { fontSize: 42, lineHeight: 47, fontWeight: '800', color: colors.ink, letterSpacing: -1.8 },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: { backgroundColor: colors.white, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.line, gap: 10 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  button: { backgroundColor: colors.green, paddingHorizontal: 20, paddingVertical: 17, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 17, color: colors.ink, fontSize: 16, minHeight: 54 },
  error: { color: '#A23928', backgroundColor: '#FBE8E0', padding: 14, borderRadius: 12, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  photo: { height: 240, width: '100%', borderRadius: 16, backgroundColor: '#E1E8DD' },
  hero: { padding: 24, borderRadius: 26, backgroundColor: colors.dark, gap: 18, overflow: 'hidden' },
  heroTitle: { color: colors.white, fontWeight: '800', fontSize: 30, lineHeight: 35, letterSpacing: -0.8 },
  heroBody: { color: '#C2D7CB', fontSize: 15, lineHeight: 23 },
  badge: { backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  stat: { color: colors.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -1 },
  chip: { minHeight: 42, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  section: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
});
