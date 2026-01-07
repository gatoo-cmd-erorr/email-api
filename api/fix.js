import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apikey, phone } = req.body;

  // Ganti 'gabriel123' dengan key rahasia kamu sendiri (biar aman)
  if (apikey !== 'gabriel123') {
    return res.status(401).json({ error: 'Invalid apikey' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'appeal@resend.dev',  // default Resend, atau ganti kalau punya domain
      to: ['support@whatsapp.com'],
      subject: 'Request Review - Banned WhatsApp Account',
      text: `Hello WhatsApp Support Team,

My phone number: +${phone}

My account has been banned or shows a red indicator.
I believe this is a mistake as I have not violated any terms.

Please review and restore my account access.

Thank you.
`,
    });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(200).json({ success: true, message: 'Appeal sent successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
