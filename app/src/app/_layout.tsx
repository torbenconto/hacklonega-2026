import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '@/lib/session';

export default function Layout() {
  return <SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></SessionProvider>;
}
