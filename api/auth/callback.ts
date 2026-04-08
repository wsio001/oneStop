import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { code, state } = req.query;

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Verify CSRF state
    const storedState = await kv.get(`oauth_state:${state}`);
    if (!storedState) {
      return res.status(400).json({ error: 'Invalid or expired state token' });
    }

    // Delete used state token
    await kv.del(`oauth_state:${state}`);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Missing OAuth credentials' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return res.status(500).json({ error: 'Failed to exchange authorization code' });
    }

    const tokens: TokenResponse = await tokenResponse.json();

    if (!tokens.refresh_token) {
      return res.status(500).json({
        error: 'No refresh token received. User may have already authorized this app.',
      });
    }

    // Generate session ID
    const sessionId = randomUUID();

    // Store session in KV (180 days TTL)
    await kv.set(
      `session:${sessionId}`,
      {
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
      },
      { ex: 15552000 } // 180 days in seconds
    );

    // Set session cookie (180 days)
    res.setHeader(
      'Set-Cookie',
      `sid=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=15552000`
    );

    // Redirect to app
    return res.redirect(302, '/');
  } catch (error) {
    console.error('Auth callback error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
