const STORAGE_KEY = 'diagramai_request_log';
const MAX_PER_MINUTE = 5;
const MAX_PER_DAY = 50;

export class RateLimitError extends Error {
  readonly scope: 'minute' | 'day';
  readonly waitSeconds: number;

  constructor(scope: 'minute' | 'day', waitSeconds: number) {
    const wait =
      scope === 'minute'
        ? `${waitSeconds}s`
        : `${Math.ceil(waitSeconds / 3600)}h`;
    super(
      scope === 'minute'
        ? `Too many requests — limit is ${MAX_PER_MINUTE} per minute. Try again in ${wait}.`
        : `Daily limit of ${MAX_PER_DAY} diagrams reached. Try again in ${wait}.`,
    );
    this.name = 'RateLimitError';
    this.scope = scope;
    this.waitSeconds = waitSeconds;
  }
}

function loadTimestamps(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function saveTimestamps(timestamps: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function checkAndRecord(): void {
  const now = Date.now();
  const all = loadTimestamps();

  const last24h = all.filter(t => t > now - 86_400_000);
  const lastMinute = last24h.filter(t => t > now - 60_000);

  if (lastMinute.length >= MAX_PER_MINUTE) {
    const oldest = Math.min(...lastMinute);
    const waitSeconds = Math.ceil((oldest + 60_000 - now) / 1000);
    throw new RateLimitError('minute', waitSeconds);
  }

  if (last24h.length >= MAX_PER_DAY) {
    const oldest = Math.min(...last24h);
    const waitSeconds = Math.ceil((oldest + 86_400_000 - now) / 1000);
    throw new RateLimitError('day', waitSeconds);
  }

  last24h.push(now);
  saveTimestamps(last24h);
}

export function getRemainingRequests(): { minute: number; day: number } {
  const now = Date.now();
  const all = loadTimestamps();
  const last24h = all.filter(t => t > now - 86_400_000);
  const lastMinute = last24h.filter(t => t > now - 60_000);
  return {
    minute: Math.max(0, MAX_PER_MINUTE - lastMinute.length),
    day: Math.max(0, MAX_PER_DAY - last24h.length),
  };
}
