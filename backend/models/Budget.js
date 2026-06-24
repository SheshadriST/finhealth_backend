const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['food', 'transport', 'housing', 'utilities', 'entertainment', 'healthcare', 'education', 'shopping', 'savings', 'debt', 'insurance', 'other'],
    required: true
  },
  limit: { type: Number, required: true, min: 0 },
  spent: { type: Number, default: 0 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  alertThreshold: { type: Number, default: 80, min: 0, max: 100 }, // % at which to alert
  notes: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

// Compound index: unique budget per user/category/month/year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
