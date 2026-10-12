const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: true,
    index: true,
  },
  investorName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  investorEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
  },
  message: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
}, { timestamps: true });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
