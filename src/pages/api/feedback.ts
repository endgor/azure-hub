import type { NextApiRequest, NextApiResponse } from 'next';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FEEDBACK_TO = 'endgor@gmail.com';
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const MAX_TYPE_LENGTH = 50;

/**
 * Replaces /^[^\s@]+@[^\s@]+\.[^\s@]+$/, whose adjacent unbounded quantifiers
 * trip CodeQL's js/polynomial-redos on an endpoint that took unbounded input.
 * Linear time, and a strict subset of the old pattern: fuzzing 500k inputs
 * found nothing it accepts that the regex rejected. It is slightly tighter on
 * malformed domains — the regex let "_@..-" through, this does not.
 */
function isValidEmail(value: string): boolean {
  if (value.length > MAX_EMAIL_LENGTH || /\s/.test(value)) return false;

  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;

  const domain = value.slice(at + 1);
  const dot = domain.indexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await isRateLimited('FEEDBACK_RATE_LIMITER', getClientIp(req))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many messages. Please try again in a minute.' });
  }

  const { name, email, message, type, website } = req.body as {
    name?: string;
    email?: string;
    message?: string;
    type?: string;
    website?: string;
  };

  // Honeypot: real users never see this field, so any value means a bot.
  // Answer 200 so the bot can't tell it was rejected.
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message must be under 2000 characters.' });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if ((name && name.length > MAX_NAME_LENGTH) || (type && type.length > MAX_TYPE_LENGTH)) {
    return res.status(400).json({ error: 'Name or type is too long.' });
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
    if (process.env.NODE_ENV === 'production') {
      console.error('Feedback not delivered: RESEND_API_KEY is not configured.');
      return res.status(503).json({
        error: 'Feedback is temporarily unavailable. Please open a GitHub issue instead.',
      });
    }

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
        from: 'Azure Hub <onboarding@resend.dev>',
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
