import Constants from 'expo-constants';
import { Platform } from 'react-native';

const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : `http://${host || 'localhost'}:8000`)).replace(/\/$/, '');

export type Species = { species_id: string; common_name: string; scientific_name: string; family?: string; taxon_rank?: string };
export type Prediction = { status: 'candidate' | 'uncertain' | 'unsupported'; reason: string; notice: string; candidates: (Species & { similarity: number })[] };
export type FishLog = { id: number; species: string; weight_lbs: number | null; length_inches: number | null; created_at: string; photo_data?: string | null; disposition?: 'kept' | 'released' | 'unknown'; daily_limit?: DailyLimit };
export type DailyLimit = { group: string | null; status: 'specified' | 'no_statewide_limit' | 'not_evaluated'; limit: number | null; guidance: string };
export type RegulationResult = {
  species_id: string;
  length_inches: number | null;
  weight_lbs: number | null;
  length_result: 'below_baseline' | 'meets_baseline' | 'no_baseline_length_limit' | 'not_evaluated';
  minimum_length_inches: number | null;
  length_guidance: string;
  daily_limit: DailyLimit;
  exception_notes: string[];
  warnings: string[];
  sources: { url: string; reference: string }[];
  reviewed_on: string;
  ruleset_version: string;
  legal_status: 'undetermined';
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}, username?: string): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(() => controller.abort(), path.startsWith('/predict') ? 180_000 : 20_000);
  try {
    const url = Platform.OS === 'web' && !process.env.EXPO_PUBLIC_API_URL
      ? `/api/backend?path=${encodeURIComponent(path)}`
      : `${API_URL}${path}`;
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(username ? { 'X-Username': username } : {}), ...options.headers },
    });
  } catch {
    throw new Error(controller.signal.aborted
      ? 'The request took too long. Please try again.'
      : 'Cannot reach the fishing server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(typeof error.detail === 'string' ? error.detail : error.detail?.[0]?.msg || `Request failed (${response.status}).`, response.status);
  }
  return response.json();
}


export type RegulationSummary = {
  species_id: string;
  scope: 'statewide_baseline';
  season: { status: 'year_round' | 'restricted' | 'closed_year_round' | 'not_reviewed'; opens_on?: string; closes_on?: string };
  size: {
    length: { status: string; minimum_inches?: number; maximum_inches?: number };
    weight: { status: string; minimum_lbs?: number; maximum_lbs?: number };
  };
  daily_limit: RegulationResult['daily_limit'];
  exception_notes: string[];
  warnings: string[];
  sources: RegulationResult['sources'];
  reviewed_on: string;
};
