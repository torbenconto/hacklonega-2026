import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Page, ui, colors } from '@/components/fishing-ui';

export default function Welcome() {
  return <Page>
    <Text style={ui.eyebrow}>REEL GEORGIA / FIELD JOURNAL</Text>
    <View style={styles.art}><View style={styles.sun} /><Text style={styles.fish}>〜 𓆝 〜</Text><Text style={styles.artLabel}>A LITTLE CURIOSITY. A GREAT CATCH.</Text></View>
    <Text style={ui.title}>Every fish has{ '\n' }a story.</Text>
    <Text style={ui.body}>Discover Georgia’s freshwater fish, identify your next catch, and keep a journal of days on the water.</Text>
    <View style={{ gap: 12, marginTop: 18 }}><Button title="Sign in" onPress={() => router.push('/auth?mode=signin')} /><Button title="Create account" secondary onPress={() => router.push('/auth?mode=create')} /></View>
    <Text style={[ui.small, { textAlign: 'center', marginTop: 8 }]}>Made for Georgia’s waters. And your next adventure.</Text>
  </Page>;
}
const styles = StyleSheet.create({ art: { height: 260, backgroundColor: colors.ink, borderRadius: 28, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginVertical: 18 }, sun: { backgroundColor: colors.orange, width: 116, height: 116, borderRadius: 100, position: 'absolute', top: 32, right: 36 }, fish: { color: '#E5EDD8', fontSize: 76, marginTop: 12 }, artLabel: { color: '#C4D6BD', fontSize: 10, letterSpacing: 2, position: 'absolute', bottom: 24 } });
