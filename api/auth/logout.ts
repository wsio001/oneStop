import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get session ID from cookie
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const sessionId = cookies?.sid;

    if (sessionId) {
      // Delete session from KV
      await kv.del(`session:${sessionId}`);
    }

    // Clear cookie
    res.setHeader(
      'Set-Cookie',
      'sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
}
