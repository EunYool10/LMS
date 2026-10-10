import 'dotenv/config'; // imports are hoisted above server.ts's dotenv.config(), so load .env here too

// Discord webhook notifications for operators.
// The webhook URL is a secret (anyone holding it can post to the channel), so it only lives in the
// DISCORD_WEBHOOK_URL environment variable on the server — never in the client bundle or Firestore.

export type DiscordCategory = 'enrollment' | 'completion' | 'inquiry' | 'security';

export interface DiscordMessage {
  category: DiscordCategory | 'test';
  title: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  /** Messages with the same key are sent once per DEDUPE_MS. */
  dedupeKey?: string;
}

const COLORS: Record<DiscordMessage['category'], number> = {
  enrollment: 0x1d68e0,
  completion: 0x16a34a,
  inquiry: 0xf59e0b,
  security: 0xe11d48,
  test: 0x64748b,
};

const DEDUPE_MS = 24 * 60 * 60 * 1000;
const recentKeys = new Map<string, number>();

const webhookUrl = () => (process.env.DISCORD_WEBHOOK_URL || '').trim();

export const isDiscordConfigured = () => /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//.test(webhookUrl());

const clip = (s: unknown, max: number, multiline = false) => {
  const raw = String(s ?? '');
  const text = (multiline ? raw.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : raw.replace(/\s+/g, ' ')).trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// Sends go out one at a time so a burst cannot trip Discord's per-webhook rate limit.
let queue: Promise<unknown> = Promise.resolve();

async function post(message: DiscordMessage): Promise<boolean> {
  const appUrl = (process.env.APP_URL || '').trim();
  const body = {
    username: 'TDSNT LMS 알림',
    allowed_mentions: { parse: [] as string[] }, // user-written text can never ping @everyone or roles
    embeds: [
      {
        title: clip(message.title, 240),
        description: message.description ? clip(message.description, 1000, true) : undefined,
        color: COLORS[message.category],
        url: /^https?:\/\//.test(appUrl) ? appUrl : undefined,
        fields: (message.fields || [])
          .filter((f) => f.value !== '' && f.value != null)
          .slice(0, 10)
          .map((f) => ({ name: clip(f.name, 100), value: clip(f.value, 500) || '-', inline: f.inline ?? true })),
        footer: { text: 'TDSNT LMS' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(webhookUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return true;
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { retry_after?: number };
      await new Promise((r) => setTimeout(r, Math.min(10_000, Math.ceil((data.retry_after || 1) * 1000))));
      continue;
    }
    console.warn(`[Discord] webhook responded ${res.status}`);
    return false;
  }
  return false;
}

/** Queues a message. Resolves to whether Discord accepted it (false when not configured or deduplicated). */
export function sendDiscord(message: DiscordMessage): Promise<boolean> {
  if (!isDiscordConfigured()) return Promise.resolve(false);

  if (message.dedupeKey) {
    const now = Date.now();
    for (const [k, at] of recentKeys) if (now - at > DEDUPE_MS) recentKeys.delete(k);
    if (recentKeys.has(message.dedupeKey)) return Promise.resolve(false);
    recentKeys.set(message.dedupeKey, now);
  }

  const result = queue.then(() => post(message)).catch((err) => {
    console.warn('[Discord] send failed:', err?.message || err);
    return false;
  });
  queue = result;
  return result;
}

/** Sliding-window counter used for rate limits and "N times within M minutes" detections. */
export class WindowCounter {
  private hits = new Map<string, number[]>();
  constructor(private windowMs: number) {}

  /** Records a hit and returns how many hits the key has inside the window. */
  hit(key: string): number {
    const now = Date.now();
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    }
    return list.length;
  }
}
