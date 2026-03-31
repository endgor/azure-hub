import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FEEDBACK_TO = 'endgor@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);
  const rateLimit = await checkRateLimit(`feedback:${clientId}`);
  if (!rateLimit.success) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { name, email, message, type } = req.body as {
    name?: string;
    email?: string;
    message?: string;
    type?: string;
  };

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message must be under 2000 characters.' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Honeypot check
  if (req.body.website) {
    return res.status(200).json({ success: true });
  }

  const subject = `[Azure Hub] ${type || 'Feedback'} from ${name || 'Anonymous'}`;
  const body = [
    `**Type:** ${type || 'General'}`,
    `**Name:** ${name || 'Not provided'}`,
    `**Email:** ${email || 'Not provided'}`,
    '',
    '**Message:**',
    message.trim(),
  ].join('\n');

  if (!RESEND_API_KEY) {
    console.log('--- Feedback received (no RESEND_API_KEY configured) ---');
    console.log(subject);
    console.log(body);
    console.log('---');
    return res.status(200).json({ success: true });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Azure Hub <feedback@azurehub.org>',
        to: FEEDBACK_TO,
        reply_to: email || undefined,
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Resend error:', text);
      return res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Feedback send error:', err);
    return res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
  }
}
