import { Text, View, type TextInputProps } from 'react-native';
import { colors, Input, ui } from './fishing-ui';

export function MeasurementInput({ label, unit, ...props }: TextInputProps & { label: string; unit: string }) {
  return <View style={{ flex: 1, minWidth: 110, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 12, paddingTop: 10 }}>
    <Text style={[ui.small, { fontWeight: '600', color: colors.ink }]}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Input accessibilityLabel={`${label} in ${unit}`} keyboardType="decimal-pad" placeholder="0.0" {...props} style={{ flex: 1, borderWidth: 0, borderRadius: 0, padding: 0, paddingVertical: 8, fontSize: 28, minHeight: 56, backgroundColor: 'transparent' }} />
      <Text style={ui.body}>{unit}</Text>
    </View>
  </View>;
}
