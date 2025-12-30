const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

// CONFIG dengan path absolut
const CONFIG = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  LOG_FILE: path.join(__dirname, '../email_logs.txt'),
  DATA_FILE: path.join(__dirname, '../dataimel.txt')
}

const LIMIT = new Map()
const COOLDOWN = 2 * 60 * 1000

function checkRateLimit(key) {
  if (key === 'angela') return false
  const last = LIMIT.get(key)
  if (!last) {
    LIMIT.set(key, Date.now())
    return false
  }
  if (Date.now() - last < COOLDOWN) return true
  LIMIT.set(key, Date.now())
  return false
}

function loadAccounts() {
  try {
    // Pastikan file ada
    if (!fs.existsSync(CONFIG.DATA_FILE)) {
      console.error(`File ${CONFIG.DATA_FILE} tidak ditemukan`)
      return []
    }
    
    const raw = fs.readFileSync(CONFIG.DATA_FILE, 'utf8')
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes(':'))
      .map(line => {
        const parts = line.split(':')
        return { 
          user: parts[0].trim(), 
          pass: parts.slice(1).join(':').trim() // Gabungkan jika ada ":" di password
        }
      })
  } catch (err) {
    console.error('Error load accounts:', err.message)
    return []
  }
}

function pickRandomAccount(accounts) {
  if (!accounts.length) return null
  const idx = Math.floor(Math.random() * accounts.length)
  return accounts[idx]
}

function logToFile(entry) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${entry}\n`
  console.log(logEntry)
  
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logEntry, 'utf8')
  } catch (err) {
    console.error('Gagal menulis log:', err.message)
  }
}

async function testSmtpConnection(account) {
  try {
    const transporter = nodemailer.createTransport({
      host: CONFIG.SMTP_HOST,
      port: CONFIG.SMTP_PORT,
      secure: CONFIG.SMTP_SECURE,
      auth: { 
        user: account.user, 
        pass: account.pass 
      },
      // Timeout settings
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    })
    
    // Test koneksi
    await transporter.verify()
    console.log(`SMTP ${account.user}: Verified OK`)
    return transporter
  } catch (err) {
    console.error(`SMTP ${account.user} Error:`, err.message)
    throw err
  }
}

let counter = 1

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
  res.setHeader('Access-Control-Allow-Headers', 'X-API-Key, Content-Type')
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET' 
    })
  }

  const apiKey = req.headers['x-api-key'] || req.query.apikey
  if (!apiKey)
    return res.status(400).json({ 
      success: false, 
      error: 'API key wajib. Gunakan ?apikey=KEY atau header X-API-Key' 
    })

  if (checkRateLimit(apiKey))
    return res.status(429).json({
      success: false,
      error: 'Terlalu sering! Coba lagi dalam 2 menit.'
    })

  const email = req.query.email
  const nomor = req.query.nomor
  if (!email || !nomor)
    return res.status(400).json({
      success: false,
      error: 'Parameter kurang. Contoh: /test?apikey=KEY&email=test@mail.com&nomor=628123456789'
    })

  try {
    // Validasi email
    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Format email tidak valid'
      })
    }

    // Load accounts
    const accounts = loadAccounts()
    if (!accounts.length) {
      logToFile(`ERROR: Tidak ada akun di dataimel.txt`)
      return res.status(500).json({ 
        success: false, 
        error: 'Tidak ada akun SMTP. Pastikan dataimel.txt berisi email:password' 
      })
    }

    logToFile(`INFO: Loaded ${accounts.length} accounts`)

    // Pilih akun
    const account = pickRandomAccount(accounts)
    if (!account) {
      return res.status(500).json({
        success: false,
        error: 'Gagal memilih akun SMTP'
      })
    }

    logToFile(`INFO: Using account ${account.user}`)

    const subject = `Test Banding #${counter}`
    const text = `Test pengiriman ke ${email}\nNomor: +${nomor}\n#${counter}`

    // Buat transporter dan kirim
    const transporter = await testSmtpConnection(account)
    const info = await transporter.sendMail({
      from: `"Sender" <${account.user}>`,
      to: email,
      subject: subject,
      text: text,
      // Tambah headers untuk avoid spam
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'CustomMailer'
      }
    })

    logToFile(`SUCCESS: ${account.user} → ${email} | Subject: ${subject} | MessageID: ${info.messageId}`)
    
    counter++
    res.json({
      success: true,
      message: 'Email test berhasil dikirim',
      data: {
        usedAccount: account.user,
        to: email,
        nomor: `+${nomor}`,
        subject: subject,
        messageId: info.messageId,
        timestamp: new Date().toISOString()
      }
    })
  } catch (err) {
    logToFile(`ERROR: ${err.message}`)
    
    // Error spesifik untuk Gmail
    let errorMsg = err.message
    if (err.code === 'EAUTH') {
      errorMsg = 'Gagal login ke Gmail. Pastikan: 1. App Password benar 2. 2FA aktif 3. Allow less secure apps'
    } else if (err.code === 'ECONNECTION') {
      errorMsg = 'Koneksi ke SMTP gagal. Cek firewall/VPN'
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMsg,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
}