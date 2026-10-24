import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import manifest from '@/lib/fish-images.json';
import { TextLink, ui } from './fishing-ui';

type Reference = { uri: string; source: string; credit: string; license: string; licenseUrl: string };
export const fishImages = manifest as Record<string, Reference>;

function ReferenceImage({ speciesId, name, height }: { speciesId: string; name: string; height: number }) {
  const reference = fishImages[speciesId];
  const [failed, setFailed] = useState(false);
  return <View style={{ height, width: '100%', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {reference && !failed
      ? <Image source={{ uri: reference.uri }} accessibilityLabel={`Reference image of ${name}`} style={{ height: '100%', width: '100%' }} resizeMode="contain" onError={() => setFailed(true)} />
      : <View style={{ alignItems: 'center', gap: 8 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 0, height: 0, borderTopWidth: 17, borderBottomWidth: 17, borderLeftWidth: 22, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#BCD0BC' }} /><View style={{ height: 37, width: 72, borderRadius: 30, backgroundColor: '#BCD0BC' }} /></View><Text style={[ui.small, { fontSize: 10 }]}>{reference ? 'Image unavailable' : 'Reference image pending'}</Text></View>}
  </View>;
}

export function FishImage(props: { speciesId: string; name: string; height?: number }) {
  return <ReferenceImage key={props.speciesId} {...props} height={props.height ?? 140} />;
}

export function FishCredit({ speciesId }: { speciesId: string }) {
  const reference = fishImages[speciesId];
  if (!reference) return null;
  return <View><Text style={[ui.small, { fontSize: 11 }]}>Reference: {reference.credit} · {reference.license}</Text><TextLink title="Image source & license" url={reference.source} /></View>;
}
