const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ================= CONFIG =================
const CONFIG = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 587, // Pakai port 587 untuk STARTTLS
  SMTP_SECURE: false,
  DATA_FILE: path.join(__dirname, '../accounts.txt') // File berisi email:password
};

// ================= VALID API KEYS =================
const VALID_KEYS = [
  'gabriel'
];

// ================= LOAD EMAIL ACCOUNTS =================
function loadAccounts() {
  try {
    if (!fs.existsSync(CONFIG.DATA_FILE)) {
      console.error('❌ accounts.txt not found');
      return [];
    }
    
    const content = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes(':'))
      .map(line => {
        const parts = line.split(':');
        return {
          email: parts[0].trim(),
          password: parts.slice(1).join(':').trim()
        };
      })
      .filter(acc => acc.email && acc.password);
  } catch (err) {
    console.error('❌ Error loading accounts:', err.message);
    return [];
  }
}

// ================= PICK RANDOM ACCOUNT =================
function getRandomAccount(accounts) {
  if (!accounts.length) return null;
  const index = Math.floor(Math.random() * accounts.length);
  return accounts[index];
}

// ================= SEND WHATSAPP APPEAL EMAIL =================
async function sendWhatsAppAppeal(phone, account) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: CONFIG.SMTP_HOST,
      port: CONFIG.SMTP_PORT,
      secure: CONFIG.SMTP_SECURE,
      auth: {
        user: account.email,
        pass: account.password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Verify connection
    await transporter.verify();
    console.log(`✅ SMTP Connected: ${account.email}`);

    // Email content for WhatsApp Appeal
    const mailOptions = {
      from: `"WhatsApp User" <${account.email}>`,
      to: 'support@support.whatsapp.com',
      replyTo: account.email,
      subject: `Account Appeal Request - ${phone}`,
      text: `Dear WhatsApp Support Team,

I am writing to appeal for my WhatsApp account associated with phone number: ${phone}.

My account appears to be restricted or facing issues. I have not violated any terms of service and believe this may be an error.

Could you please review my account status and assist in resolving this matter?

Thank you for your assistance.

Sincerely,
WhatsApp User

Phone: ${phone}
Date: ${new Date().toISOString()}`,
      
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #25D366; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>WhatsApp Account Appeal</h2>
    </div>
    <div class="content">
      <p>Dear WhatsApp Support Team,</p>
      
      <p>I am writing to appeal for my WhatsApp account associated with:</p>
      
      <p><strong>Phone Number:</strong> ${phone}</p>
      
      <p>My account appears to be restricted or facing access issues. 
      I confirm that I have not violated WhatsApp's Terms of Service 
      and believe this situation may be unintended.</p>
      
      <p>Could you please review my account status and assist in 
      resolving this matter? I would greatly appreciate your 
      prompt attention to this issue.</p>
      
      <p>Thank you for your assistance and support.</p>
      
      <br>
      <p>Sincerely,<br>
      WhatsApp User</p>
      
      <hr>
      <div class="footer">
        <p><em>This is an automated appeal request.</em></p>
        <p>Request ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    </div>
  </div>
</body>
</html>`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent: ${info.messageId} from ${account.email}`);
    
    return {
      success: true,
      messageId: info.messageId,
      from: account.email,
      to: 'support@support.whatsapp.com',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Email error from ${account.email}:`, error.message);
    return {
      success: false,
      error: error.message,
// api/fix.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // nanti set di env Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apikey, phone } = req.body;

  // Ganti dengan key rahasia bot kamu
  if (apikey !== 'gabriel123') {
    return res.status(401).json({ error: 'Invalid key' });
  }

  try {
    await resend.emails.send({
      from: 'no-reply@yourdomain.com', // atau 'onboarding@resend.dev' (default Resend)
      to: 'support@whatsapp.com',
      subject: 'Request Review - Banned WhatsApp Account',
      text: `Hello WhatsApp Support,\n\nMy phone number: +${phone}\nMy account is banned/restricted.\nPlease review and restore access.\n\nThank you.`,
    });

    res.status(200).json({ success: true, message: 'Appeal sent!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
