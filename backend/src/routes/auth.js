const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, getJwtSecret } = require('../middleware/auth');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters long.' });
  }

  const allowedRoles = ['founder', 'investor'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be either founder or investor.' });
  }

  const userRole = role === 'investor' ? 'investor' : 'founder';

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: userRole,
  });

  const token = generateToken(user);
  return res.status(201).json({
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    },
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  return res.status(200).json({
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    },
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  return res.json({
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
}));

module.exports = router;
