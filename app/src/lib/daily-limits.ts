import type { DailyLimit, FishLog } from './api';

export const FISHING_TIME_ZONE = 'America/New_York';
export function fishingDay(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: FISHING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function dailyProgress(logs: FishLog[], rule: DailyLimit, now = new Date()) {
  const day = fishingDay(now);
  const today = logs.filter(log => rule.group !== null && log.daily_limit?.group === rule.group && fishingDay(log.created_at) === day);
  const count = today.filter(log => log.disposition === 'kept').length;
  const released = today.filter(log => log.disposition === 'released').length;
  const unknown = today.length - count - released;
  const limit = rule.status === 'specified' ? rule.limit : null;
  return { count, released, unknown, limit, remaining: limit === null ? null : Math.max(0, limit - count), over: limit !== null && count > limit };
}
export function todayGroups(logs: FishLog[], now = new Date()) {
  const groups = new Map<string, DailyLimit>();
  for (const log of logs) {
    if (log.daily_limit?.group && fishingDay(log.created_at) === fishingDay(now)) groups.set(log.daily_limit.group, log.daily_limit);
  }
  return [...groups.values()];
}
