import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!clientId) {
      return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' });
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex');

    // Store state in KV with 10-minute TTL
    await kv.set(`oauth_state:${state}`, { created_at: Date.now() }, { ex: 600 });

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${appUrl}/api/auth/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      access_type: 'offline',
      prompt: 'consent', // CRITICAL: Forces refresh token on every auth
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.redirect(302, authUrl);
  } catch (error) {
    console.error('Auth start error:', error);
    return res.status(500).json({ error: 'Failed to start auth flow' });
  }
}
