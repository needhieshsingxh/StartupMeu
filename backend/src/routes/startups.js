const express = require('express');
const mongoose = require('mongoose');
const { Startup, stages } = require('../models/Startup');
const ConnectionRequest = require('../models/ConnectionRequest');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const startupFields = ['name', 'tagline', 'description', 'industry', 'stage', 'location', 'fundingRequired'];

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validateStartup(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Request body must be an object';
  delete body.owner;
  const unknown = Object.keys(body).find((field) => !startupFields.includes(field));
  if (unknown) return `Unknown field: ${unknown}`;

  const required = ['name', 'description', 'industry', 'stage', 'location', 'fundingRequired'];
  for (const field of required) {
    if (!partial || Object.hasOwn(body, field)) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return `${field} is required`;
      }
    }
  }
  for (const field of ['name', 'description', 'industry', 'stage', 'location']) {
    if (Object.hasOwn(body, field) && typeof body[field] !== 'string') return `${field} must be a string`;
  }
  if (typeof body.name === 'string' && (body.name.trim().length < 2 || body.name.trim().length > 100)) {
    return 'Name must be between 2 and 100 characters';
  }
  if (typeof body.description === 'string' && (body.description.trim().length < 20 || body.description.trim().length > 3000)) {
    return 'Description must be between 20 and 3000 characters';
  }
  if (typeof body.industry === 'string' && (!body.industry.trim() || body.industry.trim().length > 80)) {
    return 'Industry must be between 1 and 80 characters';
  }
  if (Object.hasOwn(body, 'stage') && !stages.includes(body.stage)) {
    return `Stage must be one of: ${stages.join(', ')}`;
  }
  if (typeof body.location === 'string' && (!body.location.trim() || body.location.trim().length > 120)) {
    return 'Location must be between 1 and 120 characters';
  }
  if (Object.hasOwn(body, 'fundingRequired') &&
      (typeof body.fundingRequired !== 'number' || !Number.isFinite(body.fundingRequired) || body.fundingRequired < 0)) {
    return 'Funding requirement must be a non-negative number';
  }
  if (Object.hasOwn(body, 'tagline') &&
      (typeof body.tagline !== 'string' || body.tagline.trim().length > 180)) {
    return 'Tagline must be a string of 180 characters or fewer';
  }
  if (partial && Object.keys(body).length === 0) return 'Provide at least one field to update';
  return null;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

router.get('/', asyncHandler(async (req, res) => {
  const { search, industry, stage, location, minFunding, maxFunding } = req.query;
  if (stage && !stages.includes(stage)) return res.status(400).json({ error: `Stage must be one of: ${stages.join(', ')}` });
  const minimum = minFunding === undefined ? undefined : Number(minFunding);
  const maximum = maxFunding === undefined ? undefined : Number(maxFunding);
  if ((minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
      (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0))) {
    return res.status(400).json({ error: 'Funding filters must be non-negative numbers' });
  }
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return res.status(400).json({ error: 'Minimum funding cannot exceed maximum funding' });
  }

  const filter = {};
  if (industry) filter.industry = new RegExp(`^${String(industry).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (stage) filter.stage = stage;
  if (location) filter.location = new RegExp(String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (minimum !== undefined || maximum !== undefined) {
    filter.fundingRequired = {};
    if (minimum !== undefined) filter.fundingRequired.$gte = minimum;
    if (maximum !== undefined) filter.fundingRequired.$lte = maximum;
  }
  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name', 'tagline', 'description', 'industry', 'location'].map((field) => ({ [field]: new RegExp(escaped, 'i') }));
  }
  const startups = await Startup.find(filter).sort({ updatedAt: -1 }).limit(100);
  return res.json({ data: startups });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid startup ID' });
  const startup = await Startup.findById(req.params.id);
  if (!startup) return res.status(404).json({ error: 'Startup not found' });
  return res.json({ data: startup });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const error = validateStartup(req.body);
  if (error) return res.status(400).json({ error });
  const startup = await Startup.create({
    ...req.body,
    owner: req.user._id,
  });
  return res.status(201).json({ data: startup });
}));

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid startup ID' });
  const error = validateStartup(req.body, true);
  if (error) return res.status(400).json({ error });

  const existing = await Startup.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Startup not found' });

  if (!existing.owner || existing.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to modify this startup.' });
  }

  const updates = { ...req.body };
  delete updates.owner;
  delete updates._id;

  const startup = await Startup.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return res.json({ data: startup });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid startup ID' });

  const existing = await Startup.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Startup not found' });

  if (!existing.owner || existing.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to delete this startup.' });
  }

  const startup = await Startup.findByIdAndDelete(req.params.id);
  await ConnectionRequest.deleteMany({ startup: startup._id });
  return res.json({ data: startup });
}));

router.post('/:id/connection-requests', optionalAuth, asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid startup ID' });
  const startup = await Startup.findById(req.params.id).select('_id');
  if (!startup) return res.status(404).json({ error: 'Startup not found' });
  const { investorName, investorEmail, message } = req.body || {};
  if (typeof investorName !== 'string' || investorName.trim().length < 2 || investorName.trim().length > 100) {
    return res.status(400).json({ error: 'Investor name must be between 2 and 100 characters' });
  }
  if (typeof investorEmail !== 'string' || investorEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(investorEmail.trim())) {
    return res.status(400).json({ error: 'Enter a valid investor email address' });
  }
  if (typeof message !== 'string' || message.trim().length < 20 || message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message must be between 20 and 2000 characters' });
  }
  const connectionRequest = await ConnectionRequest.create({
    startup: startup._id,
    investorName: investorName.trim(),
    investorEmail: investorEmail.trim().toLowerCase(),
    message: message.trim(),
  });
  return res.status(201).json({ data: { id: connectionRequest._id, message: 'Connection request sent.' } });
}));

router.get('/:id/connection-requests', requireAuth, asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid startup ID' });
  const startup = await Startup.findById(req.params.id).select('_id owner');
  if (!startup) return res.status(404).json({ error: 'Startup not found' });

  if (!startup.owner || startup.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to view connection requests for this startup.' });
  }

  const requests = await ConnectionRequest.find({ startup: startup._id }).sort({ createdAt: -1 });
  return res.json({ data: requests });
}));

module.exports = router;
