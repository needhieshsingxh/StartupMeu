const mongoose = require('mongoose');

const stages = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth'];

const startupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Startup name is required'],
    trim: true,
    minlength: [2, 'Startup name must be at least 2 characters'],
    maxlength: [100, 'Startup name must be 100 characters or fewer'],
  },
  tagline: { type: String, trim: true, maxlength: [180, 'Tagline must be 180 characters or fewer'], default: '' },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [3000, 'Description must be 3000 characters or fewer'],
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    trim: true,
    maxlength: [80, 'Industry must be 80 characters or fewer'],
  },
  stage: { type: String, required: [true, 'Funding stage is required'], enum: stages },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [120, 'Location must be 120 characters or fewer'],
  },
  fundingRequired: {
    type: Number,
    required: [true, 'Funding requirement is required'],
    min: [0, 'Funding requirement cannot be negative'],
    max: [1000000000000, 'Funding requirement is too large'],
  },
}, { timestamps: true });

startupSchema.index({ industry: 1, stage: 1, location: 1 });

module.exports = { Startup: mongoose.model('Startup', startupSchema), stages };
