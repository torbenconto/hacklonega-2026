import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, router } from 'expo-router';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { colors, Button, ErrorMessage, Page, ui } from './fishing-ui';
import { Icon } from './icon';
import { SpringPressable } from './motion';

type Props = {
  busy: string;
  error: string;
  quest?: { title: string; current: number; target: number };
  onCapture: (uri: string) => Promise<void>;
  onLibrary: () => void;
  onDemo: (item: typeof DEMO_PHOTOS[number]) => void;
};
export function CameraCapture({ busy, error, quest, onCapture, onLibrary, onDemo }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraError, setCameraError] = useState('');
  const camera = useRef<CameraView>(null);
  const lock = useRef(false);
  const { height } = useWindowDimensions();
  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => { setActive(false); setReady(false); };
  }, []));
  async function enableCamera() {
    try {
      setCameraError('');
      const response = await requestPermission();
      if (!response.granted) setCameraError('Camera access is off. Choose a photo or enable access in Settings.');
    } catch { setCameraError('Camera unavailable. You can still choose a photo.'); }
  }
  async function snap() {
    if (busy || lock.current) return;
    if (!permission?.granted) { await enableCamera(); return; }
    if (!ready || !camera.current) return;
    lock.current = true; setTaking(true); setCameraError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      await onCapture(photo.uri);
    } catch { setCameraError('Couldn’t take that photo. Try again or choose one from your library.'); }
    finally { lock.current = false; setTaking(false); }
  }
  const working = !!busy || taking;
  return <Page>
    <View style={ui.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="fish" size={26} /><Text style={{ color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.6 }}>fishnerd</Text></View>
      <View style={{ backgroundColor: colors.soft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }}><Text style={ui.eyebrow}>CAMERA</Text></View>
    </View>
    <Text style={ui.title}>Identify a fish</Text>
    <View style={{ height: Math.min(480, Math.max(290, height * 0.44)), borderRadius: 24, overflow: 'hidden', backgroundColor: colors.dark }}>
      {permission?.granted && active && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="picture" onCameraReady={() => { setReady(true); setCameraError(''); }} onMountError={() => { setReady(false); setCameraError('Camera unavailable here. Try Library or a sample photo below.'); }} />}
      {permission?.granted && !cameraError && <View pointerEvents="none" style={{ position: 'absolute', top: '24%', bottom: '24%', left: '9%', right: '9%' }}>
        {([['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']] as const).map(([vertical, horizontal]) => <View key={vertical + horizontal} style={{ position: 'absolute', [vertical]: 0, [horizontal]: 0, width: 28, height: 28, borderColor: '#FFFFFFBB', [vertical === 'top' ? 'borderTopWidth' : 'borderBottomWidth']: 2, [horizontal === 'left' ? 'borderLeftWidth' : 'borderRightWidth']: 2 }} />)}
      </View>}
      {(!permission?.granted || !!cameraError) && <View style={{ flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <View style={{ padding: 18, borderRadius: 40, backgroundColor: '#FFFFFF12' }}><Icon name="camera" color={colors.orange} size={36} /></View>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{cameraError ? 'Camera unavailable' : 'Take a fish photo'}</Text>
        <Text style={{ color: '#D3DFD8', lineHeight: 21, textAlign: 'center' }}>{cameraError || 'Open your camera, or choose a photo you already have.'}</Text>
        {!permission?.granted && permission?.canAskAgain !== false && <Button title="Open camera" accent disabled={working} onPress={() => void enableCamera()} />}
        {Platform.OS !== 'web' && permission?.canAskAgain === false && <Button title="Open Settings" accent onPress={() => { void Linking.openSettings().catch(() => setCameraError('Open your device Settings to allow camera access.')); }} />}
      </View>}
      {!!permission?.granted && !cameraError && <View pointerEvents="none" style={{ position: 'absolute', bottom: 20, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, backgroundColor: '#20352ECC' }}><Text style={{ color: colors.white, fontSize: 12 }}>Side on · whole fish · good light</Text></View>}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 20 }}>
      <SpringPressable accessibilityRole="button" accessibilityLabel="Choose from photo library" disabled={working} onPress={onLibrary} style={{ minHeight: 68, minWidth: 76, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: working ? 0.5 : 1 }}><View style={{ width: 30, height: 25, borderWidth: 2, borderColor: colors.green, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}><View style={{ height: 9, width: 14, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.green, transform: [{ rotate: '45deg' }], marginTop: 8 }} /></View><Text style={[ui.small, { fontWeight: '700', color: colors.green }]}>Library</Text></SpringPressable>
      <SpringPressable accessibilityRole="button" accessibilityLabel="Take fish photo" accessibilityState={{ disabled: working || (!!permission?.granted && !ready), busy: working }} disabled={working || (!!permission?.granted && !ready)} onPress={() => void snap()} style={{ height: 80, width: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.green, padding: 5, opacity: working || (!!permission?.granted && !ready) ? 0.5 : 1 }}><View style={{ flex: 1, borderRadius: 34, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>{working ? <ActivityIndicator color={colors.white} /> : <Icon name="camera" size={28} color={colors.white} />}</View></SpringPressable>
      <SpringPressable accessibilityRole="button" accessibilityLabel="Flip camera" disabled={working || !permission?.granted || !ready} onPress={() => { setReady(false); setFacing(value => value === 'back' ? 'front' : 'back'); }} style={{ minHeight: 68, minWidth: 76, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: working || !ready ? 0.4 : 1 }}><Text style={{ fontSize: 32, lineHeight: 35, color: colors.green }}>↻</Text><Text style={[ui.small, { fontWeight: '700', color: colors.green }]}>Flip</Text></SpringPressable>
    </View>
    {!!busy && <Text accessibilityLiveRegion="polite" style={[ui.small, { textAlign: 'center' }]}>{busy}</Text>}
    <ErrorMessage message={error} />
    {quest && <SpringPressable accessibilityRole="button" accessibilityLabel={`Your quest: ${quest.title}, ${quest.current} of ${quest.target}. View quests`} onPress={() => router.navigate('/(tabs)/quests')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, backgroundColor: colors.soft }}>
      <Text style={{ fontSize: 28, color: colors.green }}>✦</Text><View style={{ flex: 1, gap: 3 }}><Text style={ui.eyebrow}>CURRENT QUEST</Text><Text style={[ui.name, { fontSize: 16 }]}>{quest.title}</Text></View><Text style={{ color: colors.green, fontWeight: '700' }}>{quest.current}/{quest.target} →</Text>
    </SpringPressable>}
    <View style={{ gap: 12, paddingTop: 4 }}><View style={ui.row}><Text style={ui.section}>Sample photos</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>{DEMO_PHOTOS.map((item, index) => <SpringPressable key={item.id} accessibilityRole="button" accessibilityLabel={`Try sample fish ${index + 1}`} disabled={working} onPress={() => onDemo(item)} style={{ width: 112, gap: 6, opacity: working ? 0.5 : 1 }}><Image source={item.asset} style={{ width: 112, height: 84, borderRadius: 12 }} resizeMode="cover" /><Text style={[ui.small, { fontSize: 12 }]}>Sample {index + 1}</Text></SpringPressable>)}</ScrollView>
    </View>
  </Page>;
}
