import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { colors, ErrorMessage, ui } from './fishing-ui';
import { Icon } from './icon';
import { SpringPressable } from './motion';

type Props = {
  busy: string;
  error: string;
  onCapture: (uri: string) => Promise<void>;
  onLibrary: () => void;
  onDemo: (item: typeof DEMO_PHOTOS[number]) => void;
};
export function CameraCapture({ busy, error, onCapture, onLibrary, onDemo }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const camera = useRef<CameraView>(null);
  const lock = useRef(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const demoY = useRef(0);
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewportHeight = Math.max(420, height - insets.top - insets.bottom - 72);
  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => { setActive(false); setReady(false); };
  }, []));
  async function snap() {
    if (busy || lock.current) return;
    if (!permission?.granted) {
      try {
        setCameraError('');
        const response = await requestPermission();
        if (!response.granted) setCameraError('Camera access is off. Use Library or enable access in Settings.');
      } catch { setCameraError('Camera unavailable. Choose a photo from Library.'); }
      return;
    }
    if (!ready || !camera.current) return;
    lock.current = true; setTaking(true); setCameraError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      await onCapture(photo.uri);
    } catch { setCameraError('Couldn’t take that photo. Try again or use Library.'); }
    finally { lock.current = false; setTaking(false); }
  }
  const working = !!busy || taking;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#101916' }}>
    {active && <StatusBar style="light" />}
    <ScrollView ref={scroll} contentContainerStyle={{ width: '100%', maxWidth: 840, alignSelf: 'center' }}>
      <View style={{ height: viewportHeight, backgroundColor: '#101916' }}>
        <View style={{ height: 52, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.white, fontSize: 21, fontWeight: '700' }}>fishnerd</Text><Text style={{ color: '#B6C8BE', fontSize: 13 }}>Identify</Text></View>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#182820' }}>
          {permission?.granted && active && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" onCameraReady={() => { setReady(true); setCameraError(''); }} onMountError={() => { setReady(false); setCameraError('Camera unavailable. Choose a photo from Library.'); }} />}
          {!permission?.granted && <Pressable accessibilityRole="button" accessibilityLabel="Enable camera" disabled={working} onPress={() => void snap()} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><Icon name="camera" color="#B6C8BE" size={44} /><Text style={{ color: colors.white, fontSize: 15 }}>Tap to enable camera</Text></Pressable>}
          <View pointerEvents="none" style={{ position: 'absolute', left: '10%', right: '10%', top: '20%', bottom: '20%', borderWidth: 1, borderColor: '#FFFFFF55' }} />
          {!!(cameraError || error) && <View style={{ position: 'absolute', bottom: 20, left: 24, right: 24, gap: 8 }}><Text accessibilityRole="alert" style={{ color: colors.white, fontSize: 14, lineHeight: 21 }}>{cameraError || error}</Text>{Platform.OS !== 'web' && permission?.canAskAgain === false && <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => setCameraError('Open your device Settings to enable camera access.')); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.orange, fontWeight: '700' }}>Open Settings</Text></Pressable>}</View>}
          {permission?.granted && !cameraError && !error && <Text pointerEvents="none" style={{ position: 'absolute', bottom: 18, alignSelf: 'center', backgroundColor: '#101916AA', color: colors.white, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13 }}>Fit the whole fish</Text>}
        </View>
        <View style={{ height: 146, justifyContent: 'center', paddingHorizontal: 24, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <SpringPressable accessibilityRole="button" accessibilityLabel="Choose from photo library" disabled={working} onPress={onLibrary} style={{ width: 74, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 7 }}><View style={{ width: 29, height: 25, borderWidth: 2, borderColor: '#B6C8BE', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 13, height: 9, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#B6C8BE', transform: [{ rotate: '45deg' }], marginTop: 8 }} /></View><Text style={{ color: colors.white, fontSize: 12 }}>Library</Text></SpringPressable>
            <SpringPressable accessibilityRole="button" accessibilityLabel="Take fish photo" accessibilityState={{ disabled: working || (!!permission?.granted && !ready), busy: working }} disabled={working || (!!permission?.granted && !ready)} onPress={() => void snap()} style={{ height: 80, width: 80, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 40, padding: 5, opacity: working || (!!permission?.granted && !ready) ? 0.5 : 1 }}><View style={{ flex: 1, borderRadius: 34, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>{working && <ActivityIndicator color={colors.green} />}</View></SpringPressable>
            <SpringPressable accessibilityRole="button" accessibilityLabel="View demo photos" disabled={working} onPress={() => scroll.current?.scrollTo({ y: demoY.current, animated: !reduced })} style={{ width: 74, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 7 }}><Image source={DEMO_PHOTOS[0].asset} style={{ height: 30, width: 36, borderRadius: 3 }} /><Text style={{ color: colors.white, fontSize: 12 }}>Demos ↓</Text></SpringPressable>
          </View>
          {!!busy && <Text accessibilityLiveRegion="polite" style={{ color: '#B6C8BE', textAlign: 'center', fontSize: 12 }}>{busy}</Text>}
        </View>
      </View>
      <View onLayout={event => { demoY.current = event.nativeEvent.layout.y; }} style={{ backgroundColor: colors.bg, padding: 20, gap: 16 }}>
        <ErrorMessage message={error} />
        <Text style={ui.section}>Demo photos</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{DEMO_PHOTOS.map(item => <SpringPressable key={item.id} accessibilityRole="button" accessibilityLabel={`Try ${item.name}`} disabled={working} onPress={() => onDemo(item)} style={{ width: '47%', gap: 8 }}><Image source={item.asset} style={{ width: '100%', height: 150 }} resizeMode="cover" /><Text style={ui.small}>{item.name}</Text></SpringPressable>)}</View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
