import { randomUUID } from 'crypto';
import { playLooping, SoundHandle } from './sound';

export interface Alarm {
  id: string;
  label?: string;
  triggerAt: Date;
  status: 'active' | 'ringing';
  createdAt: Date;
}

interface AlarmEntry extends Alarm {
  timeoutId: ReturnType<typeof setTimeout>;
  sound: SoundHandle | null;
}

const store = new Map<string, AlarmEntry>();

export function listAlarms(): Alarm[] {
  return [...store.values()].map(toPublic);
}

export function createAlarm(triggerAt: Date, label?: string): Alarm {
  const now = new Date();
  const delay = triggerAt.getTime() - now.getTime();

  if (delay <= 0) {
    throw new Error('Trigger time must be in the future');
  }

  const id = randomUUID();

  const entry: AlarmEntry = {
    id,
    label,
    triggerAt,
    status: 'active',
    createdAt: now,
    timeoutId: setTimeout(() => trigger(id), delay),
    sound: null,
  };

  store.set(id, entry);
  return toPublic(entry);
}

export function deleteAlarm(id: string): boolean {
  const entry = store.get(id);
  if (!entry) return false;

  clearTimeout(entry.timeoutId);
  entry.sound?.stop();
  store.delete(id);
  return true;
}

function trigger(id: string) {
  const entry = store.get(id);
  if (!entry) return;

  entry.status = 'ringing';
  entry.sound = playLooping(process.env.ALARM_SOUND_PATH!);
}

function toPublic(entry: AlarmEntry): Alarm {
  return {
    id: entry.id,
    label: entry.label,
    triggerAt: entry.triggerAt,
    status: entry.status,
    createdAt: entry.createdAt,
  };
}

// --- Parsing helpers ---

export function parseDuration(input: string): number {
  const normalized = input.toLowerCase().trim();
  let totalMs = 0;

  const patterns: [RegExp, number][] = [
    [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/, 3600_000],
    [/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)/, 60_000],
    [/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)/, 1_000],
  ];

  for (const [re, multiplier] of patterns) {
    const match = normalized.match(re);
    if (match) totalMs += parseFloat(match[1]) * multiplier;
  }

  if (totalMs === 0) {
    throw new Error(
      `Cannot parse duration "${input}". Use formats like "2 minutes", "1h30m", "90s".`
    );
  }

  return totalMs;
}

export function parseTime(input: string): Date {
  const normalized = input.trim().toLowerCase();

  // Matches: "7:30pm", "7:30 pm", "19:30", "7pm", "7 am"
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) {
    throw new Error(
      `Cannot parse time "${input}". Use formats like "7:30pm", "19:30", "7am".`
    );
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (meridiem === 'pm' && hours !== 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time "${input}".`);
  }

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  // Roll to tomorrow if the time has already passed
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}
