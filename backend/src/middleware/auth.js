const jwt = require('jsonwebtoken');
const User = require('../models/User');

const MIN_JWT_SECRET_LENGTH = 32;
const KNOWN_INSECURE_SECRETS = new Set([
  'your_jwt_secret_key_minimum_32_characters',
  'replace_with_a_secure_random_jwt_secret_at_least_32_characters_long',
  'dev_jwt_secret_local_development_key_12345678',
  'dev-jwt-secret-do-not-use-in-production',
  'secret',
  'jwt_secret',
  'changeme',
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT_SECRET is required. Configure a secure secret in environment variables.');
  }

  const trimmed = secret.trim();
  if (trimmed.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET is insecure: minimum length of ${MIN_JWT_SECRET_LENGTH} characters required.`);
  }

  if (KNOWN_INSECURE_SECRETS.has(trimmed.toLowerCase())) {
    throw new Error('JWT_SECRET is using an insecure placeholder. Please generate a strong random secret.');
  }

  return trimmed;
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid authentication token payload.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user) req.user = user;
      }
    } catch {
      // Optional auth ignores invalid/expired tokens and proceeds as guest
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuth, optionalAuth, getJwtSecret };
