require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./src/db');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

initDb();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" }
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 400, standardHeaders: true }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use('/api', routes);

app.get('/p/:token', (req, res) => res.redirect(`/portal.html?t=${encodeURIComponent(req.params.token)}`));
app.get('/a/:token', (req, res) => res.redirect(`/scan.html?a=${encodeURIComponent(req.params.token)}`));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  next();
});

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 10 MB)' });
  if (err.name === 'MulterError') return res.status(400).json({ error: 'Upload failed: ' + err.message });
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n  SmileCare running → http://localhost:${PORT}\n`);
});