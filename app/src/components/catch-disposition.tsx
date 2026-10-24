import { Pressable, Text, View } from 'react-native';
import { colors } from './fishing-ui';

export function CatchDisposition({ value, onChange, disabled = false }: { value?: 'kept' | 'released' | 'unknown'; onChange: (value: 'kept' | 'released') => void; disabled?: boolean }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel="Catch outcome" style={{ flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 10, padding: 3, gap: 3 }}>
    {(['kept', 'released'] as const).map(option => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option === 'kept' ? 'Kept' : 'Released'} accessibilityState={{ checked: value === option, disabled }} disabled={disabled} onPress={() => onChange(option)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, borderRadius: 8, backgroundColor: value === option ? colors.white : 'transparent', opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: value === option ? colors.green : colors.muted }}>{option === 'kept' ? 'Kept' : 'Released'}</Text>
    </Pressable>)}
  </View>;
}
