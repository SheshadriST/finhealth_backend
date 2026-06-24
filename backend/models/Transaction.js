const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['salary', 'freelance', 'investment', 'food', 'transport'
      , 'housing', 'utilities', 'entertainment', 'healthcare', 'education'
      , 'shopping', 'savings', 'debt', 'insurance', 'other'],
    required: true
  },
  description: { type: String, trim: true, maxlength: 200 },
  date: { type: Date, default: Date.now },
  tags: [{ type: String, trim: true }],
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', null], default: null },
  merchant: { type: String, trim: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'], default: 'other' }
}, { timestamps: true });

// Compound indexes (it should increase performance in large data set)
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, date: -1, type: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
