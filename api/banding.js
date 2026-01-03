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
      account: account.email
    };
  }
}

// ================= MAIN HANDLER =================
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }
  
  // Get API key
  const apiKey = req.query.apikey || req.headers['x-api-key'];
  
  // Validate API key
  if (!apiKey || !VALID_KEYS.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing API key',
      validKeys: VALID_KEYS.slice(0, 3) + '...'
    });
  }
  
  // Get phone number
  const phone = req.query.nomor;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number required. Use ?nomor=628123456789'
    });
  }
  
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format'
    });
  }
  
  console.log(`📱 Processing WhatsApp appeal for: ${cleanPhone} (Key: ${apiKey})`);
  
  try {
    // Load email accounts
    const accounts = loadAccounts();
    
    if (accounts.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No email accounts configured',
        note: 'Create accounts.txt with email:password format'
      });
    }
    
    console.log(`📧 Loaded ${accounts.length} email accounts`);
    
    // Get random account
    const account = getRandomAccount(accounts);
    
    if (!account) {
      return res.status(500).json({
        success: false,
        error: 'Failed to select email account'
      });
    }
    
    // Send WhatsApp appeal
    const result = await sendWhatsAppAppeal(cleanPhone, account);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'WhatsApp appeal email sent successfully',
        data: {
          phone: cleanPhone,
          from: result.from,
          to: result.to,
          messageId: result.messageId,
          timestamp: result.timestamp,
          note: 'Email sent to WhatsApp support team. Please wait 1-5 minutes.'
        },
        apiInfo: {
          key: apiKey,
          remaining: 'unlimited',
          server: 'Vercel'
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        account: result.account,
        note: 'Failed to send email. Trying fallback...'
      });
    }
    
  } catch (error) {
    console.error('❌ Server error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
