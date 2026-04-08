import type { VercelRequest } from '@vercel/node';
import { kv } from '@vercel/kv';

type Session = {
  refresh_token: string;
  access_token: string;
  expires_at: number;
};

export async function getSessionFromRequest(req: VercelRequest): Promise<string | null> {
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies?.sid || null;
}

export async function getValidAccessToken(sessionId: string): Promise<string | null> {
  const session = await kv.get<Session>(`session:${sessionId}`);

  if (!session) {
    return null;
  }

  // Check if access token is still valid (with 60s buffer)
  const now = Date.now();
  if (session.expires_at > now + 60000) {
    return session.access_token;
  }

  // Token expired or about to expire - refresh it
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing OAuth credentials');
    return null;
  }

  try {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: session.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      console.error('Token refresh failed:', await refreshResponse.text());
      return null;
    }

    const tokens = await refreshResponse.json();

    // Update session with new access token
    const updatedSession: Session = {
      ...session,
      access_token: tokens.access_token,
      expires_at: now + tokens.expires_in * 1000,
    };

    await kv.set(`session:${sessionId}`, updatedSession, { ex: 15552000 });

    return tokens.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
