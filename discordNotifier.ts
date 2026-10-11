import 'dotenv/config'; // imports are hoisted above server.ts's dotenv.config(), so load .env here too

// Discord webhook notifications for operators.
// The webhook URL is a secret (anyone holding it can post to the channel), so it only lives in the
// DISCORD_WEBHOOK_URL environment variable on the server — never in the client bundle or Firestore.

export type DiscordCategory = 'enrollment' | 'completion' | 'inquiry' | 'security';

export interface DiscordImage {
  /** ASCII file name; referenced from the embed as attachment://<filename>. */
  filename: string;
  data: Buffer;
  contentType: string;
}

export interface DiscordMessage {
  category: DiscordCategory | 'test';
  title: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  /** Extra footer text after "TDSNT LMS", e.g. where to follow up. */
  note?: string;
  /** Photos shown in the message (Discord renders up to 4 as a gallery). */
  images?: DiscordImage[];
  /** Messages with the same key are sent once per DEDUPE_MS. */
  dedupeKey?: string;
}

/** Header line and colour per category, so the channel can be scanned at a glance. */
const CATEGORY_META: Record<DiscordMessage['category'], { author: string; color: number }> = {
  enrollment: { author: '📚 수강 알림', color: 0x3b82f6 },
  completion: { author: '🎓 수료 알림', color: 0x22c55e },
  inquiry: { author: '💬 문의 알림', color: 0xf59e0b },
  security: { author: '🚨 보안 알림', color: 0xef4444 },
  test: { author: '🔧 시스템 알림', color: 0x8b5cf6 },
};

export const DISCORD_MAX_IMAGES = 4;
export const DISCORD_MAX_IMAGE_BYTES = 8 * 1024 * 1024; // stays under the webhook upload limit

const DEDUPE_MS = 24 * 60 * 60 * 1000;
const recentKeys = new Map<string, number>();

const webhookUrl = () => (process.env.DISCORD_WEBHOOK_URL || '').trim();
const appUrl = () => {
  const url = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(url) ? url : '';
};

export const isDiscordConfigured = () => /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//.test(webhookUrl());

const clip = (s: unknown, max: number, multiline = false) => {
  const raw = String(s ?? '');
  const text = (multiline ? raw.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : raw.replace(/\s+/g, ' ')).trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function buildPayload(message: DiscordMessage) {
  const meta = CATEGORY_META[message.category];
  const site = appUrl();
  const images = (message.images || []).slice(0, DISCORD_MAX_IMAGES);

  const main: Record<string, unknown> = {
    author: { name: meta.author },
    title: clip(message.title, 240),
    description: message.description ? clip(message.description, 1500, true) : undefined,
    color: meta.color,
    url: site || undefined,
    fields: (message.fields || [])
      .filter((f) => f.value !== '' && f.value != null)
      .slice(0, 12)
      .map((f) => ({ name: clip(f.name, 100), value: clip(f.value, 900, true) || '-', inline: f.inline ?? true })),
    image: images[0] ? { url: `attachment://${images[0].filename}` } : undefined,
    footer: {
      text: `🏫 TDSNT LMS${message.note ? ` · ${clip(message.note, 120)}` : ''}`,
      icon_url: site ? `${site}/favicon-32x32.png` : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  // Extra embeds that share the main embed's url are shown by Discord as one photo gallery.
  const gallery = images.slice(1).map((img) => ({ url: site || undefined, color: meta.color, image: { url: `attachment://${img.filename}` } }));

  return {
    payload: {
      username: 'TDSNT LMS 알림',
      avatar_url: site ? `${site}/android-chrome-192x192.png` : undefined,
      allowed_mentions: { parse: [] as string[] }, // user-written text can never ping @everyone or roles
      embeds: [main, ...gallery],
    },
    images,
  };
}

// Sends go out one at a time so a burst cannot trip Discord's per-webhook rate limit.
let queue: Promise<unknown> = Promise.resolve();

async function post(message: DiscordMessage): Promise<boolean> {
  const { payload, images } = buildPayload(message);

  for (let attempt = 0; attempt < 2; attempt++) {
    let init: RequestInit;
    if (images.length) {
      // A request body can only be read once, so the form is rebuilt for every attempt.
      const form = new FormData();
      form.append('payload_json', JSON.stringify(payload));
      images.forEach((img, i) => form.append(`files[${i}]`, new Blob([new Uint8Array(img.data)], { type: img.contentType }), img.filename));
      init = { method: 'POST', body: form };
    } else {
      init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    const res = await fetch(webhookUrl(), init);
    if (res.ok) return true;
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { retry_after?: number };
      await new Promise((r) => setTimeout(r, Math.min(10_000, Math.ceil((data.retry_after || 1) * 1000))));
      continue;
    }
    console.warn(`[Discord] webhook responded ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
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

  /** How many hits the key has inside the window, without recording one. */
  count(key: string): number {
    const now = Date.now();
    return (this.hits.get(key) || []).filter((t) => now - t < this.windowMs).length;
  }
}
