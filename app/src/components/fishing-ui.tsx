import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { bg: '#F5F4EC', ink: '#173D35', muted: '#687B72', line: '#D8DFD2', green: '#245B46', orange: '#E8AA64', white: '#FFFFFF' };
export function Page({ children }: { children: ReactNode }) {
  return <SafeAreaView style={ui.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <View style={{ gap: 10, marginBottom: 22 }}><Text style={ui.eyebrow}>{eyebrow.toUpperCase()}</Text><Text style={ui.title}>{title}</Text>{subtitle && <Text style={ui.body}>{subtitle}</Text>}</View>;
}
export function Button({ title, onPress, secondary, disabled, busy }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, (disabled || busy) && { opacity: .5 }, pressed && { opacity: .75 }]}>{busy ? <ActivityIndicator color={secondary ? colors.green : colors.white} /> : <Text style={[ui.buttonText, secondary && { color: colors.ink }]}>{title}</Text>}</Pressable>;
}
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} {...props} style={[ui.input, props.style]} />; }
export function ErrorMessage({ message }: { message: string }) { return message ? <Text accessibilityRole="alert" style={ui.error}>{message}</Text> : null; }
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 24, paddingTop: 30, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: colors.green },
  title: { fontSize: 36, lineHeight: 41, fontWeight: '800', color: colors.ink, letterSpacing: -1.3 },
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
});
