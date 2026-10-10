// Reports operator-facing events to the server, which forwards them to the Discord webhook
// (the webhook URL itself only exists on the server). Fire-and-forget: failures never affect the UI.

export type DiscordEventKind = 'enrollment' | 'assignment' | 'completion' | 'inquiry' | 'admin_action' | 'suspicious';

export function notifyDiscord(kind: DiscordEventKind, data: Record<string, string | number | boolean | undefined>): void {
  if (typeof fetch === 'undefined') return;
  fetch('/api/notify/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data }),
    keepalive: true,
  }).catch(() => {});
}

export async function getDiscordStatus(): Promise<{ configured: boolean } | null> {
  try {
    const res = await fetch('/api/notify/status');
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function sendDiscordTest(actorName: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const res = await fetch('/api/notify/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'test', data: { actorName } }),
    });
    const data = await res.json().catch(() => ({}));
    return { sent: !!data.sent, reason: data.reason || (res.ok ? undefined : `http_${res.status}`) };
  } catch {
    return { sent: false, reason: 'network' };
  }
}
