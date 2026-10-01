const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE = 'sc_session';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set and at least 32 chars in production');
}

function hashPassword(pw) { return bcrypt.hashSync(pw, 12); }
function verifyPassword(pw, hash) { return bcrypt.compareSync(pw, hash); }

function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: EXPIRES });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Session expired' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

module.exports = {
  hashPassword, verifyPassword,
  signToken, setSessionCookie, clearSessionCookie,
  requireAuth, requireRole, randomToken,
  COOKIE
};