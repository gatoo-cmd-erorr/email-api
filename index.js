module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(`
    <html>
      <head>
        <title>Email API Service</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          .container { max-width: 800px; margin: 0 auto; }
          .endpoint { background: #f5f5f5; padding: 15px; margin: 10px; border-radius: 5px; }
          code { background: #eee; padding: 2px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📧 Email API Service</h1>
          <p>API untuk mengirim email melalui SMTP</p>
          
          <div class="endpoint">
            <h3>Endpoint Test:</h3>
            <code>GET /test?apikey=KEY&email=target@mail.com&nomor=628123456789</code>
          </div>
          
          <div style="margin-top: 30px;">
            <p>API Keys yang valid: angela, totoy, ALOK, putz, peler, Lz666Era, BALMOND</p>
          </div>
        </div>
      </body>
    </html>
  `)
}