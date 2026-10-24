import Constants from 'expo-constants';
import { Platform } from 'react-native';

const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : `http://${host || 'localhost'}:8000`)).replace(/\/$/, '');

export type Species = { species_id: string; common_name: string; scientific_name: string; family?: string; taxon_rank?: string };
export type Prediction = { status: string; reason: string; notice: string; candidates: (Species & { similarity: number })[] };
export type FishLog = { id: number; species: string; weight_lbs: number; length_inches: number; created_at: string };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}, username?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(username ? { 'X-Username': username } : {}), ...options.headers },
    });
  } catch {
    throw new Error(`Cannot reach the fishing server at ${API_URL}. Check that the backend is running and your device is on the same network.`);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(typeof error.detail === 'string' ? error.detail : error.detail?.[0]?.msg || `Request failed (${response.status}).`, response.status);
  }
  return response.json();
}

