// Lightweight helpers to create/join a video meeting using Daily or Whereby
// Configure via env:
// - VITE_DAILY_API_KEY
// - VITE_WHEREBY_API_KEY
// - VITE_WHEREBY_ROOM_PREFIX (optional)

export type VideoProvider = 'daily' | 'whereby';

export interface CreateRoomOptions {
  provider: VideoProvider;
  title?: string;
  startAudioOff?: boolean;
  startVideoOff?: boolean;
  expireMinutes?: number; // time-limited rooms for safety
}

function randomSlug(len = 6) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function createVideoRoom(opts: CreateRoomOptions): Promise<{ url: string; provider: VideoProvider }> {
  const { provider } = opts;

  if (provider === 'daily') {
    const apiKey = import.meta.env.VITE_DAILY_API_KEY as string | undefined;
    if (!apiKey) {
      // Fallback to Daily demo domain link pattern if no API key (not secure, for demos only)
      const slug = randomSlug(8);
      return { url: `https://demo.daily.co/${slug}`, provider: 'daily' };
    }

    const body: any = {
      name: `room-${randomSlug(8)}`,
      properties: {
        enable_chat: true,
        start_video_off: !!opts.startVideoOff,
        start_audio_off: !!opts.startAudioOff,
      },
    };

    if (opts.expireMinutes && opts.expireMinutes > 0) {
      body.properties.exp = Math.floor(Date.now() / 1000) + opts.expireMinutes * 60;
    }

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Daily API error', err);
      // Fallback to demo URL to avoid hard failure in demos
      return { url: `https://demo.daily.co/${randomSlug(8)}`, provider: 'daily' };
    }

    const data = await res.json();
    return { url: data.url as string, provider: 'daily' };
  }

  // Whereby
  const wherebyKey = import.meta.env.VITE_WHEREBY_API_KEY as string | undefined;
  if (!wherebyKey) {
    // Fallback to public Whereby room URL format; embed parameter handled by component
    const prefix = (import.meta.env.VITE_WHEREBY_ROOM_PREFIX as string | undefined) || 'beatcancer';
    return { url: `https://whereby.com/${prefix}-${randomSlug(6)}`, provider: 'whereby' };
  }

  const res = await fetch('https://api.whereby.dev/v1/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wherebyKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      isLocked: false,
      approve: true,
      roomName: `bc-${randomSlug(8)}`,
      endDate: new Date(Date.now() + (opts.expireMinutes || 120) * 60 * 1000).toISOString(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Whereby API error', err);
    const prefix = (import.meta.env.VITE_WHEREBY_ROOM_PREFIX as string | undefined) || 'beatcancer';
    return { url: `https://whereby.com/${prefix}-${randomSlug(6)}`, provider: 'whereby' };
  }

  const data = await res.json();
  return { url: (data.meeting?.roomUrl ?? data.roomUrl) as string, provider: 'whereby' };
}

export function getEmbeddableUrl(url: string): string {
  if (!url) return url;
  const u = new URL(url);
  if (u.hostname.includes('whereby.com')) {
    if (!u.searchParams.has('embed')) u.searchParams.set('embed', '');
    return u.toString();
  }
  if (u.hostname.includes('daily.co')) {
    // Daily supports iframe via daily.co embed; pass via plain URL
    return u.toString();
  }
  return url;
}
