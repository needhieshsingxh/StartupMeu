const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const startupRoutes = require('./routes/startups');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});
app.use('/api/startups', startupRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  if (error?.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join('. ');
    return res.status(400).json({ error: message });
  }
  if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid field value' });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
