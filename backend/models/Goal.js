const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  targetDate: { type: Date, required: true },
  category: { type: String, enum: ['emergency_fund', 'vacation', 'home', 'car', 'education', 'retirement', 'other'], default: 'other' },
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: '🎯' },
  autoContribute: { type: Number, default: 0 }, // monthly auto-contribution
  milestones: [{
    percentage: Number,
    achievedAt: Date,
    note: String
  }]
}, { timestamps: true });

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });
module.exports = mongoose.model('Goal', goalSchema);
