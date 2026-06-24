const express = require('express');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const enriched = goals.map(g => {
      const obj = g.toObject();
      obj.progressPercent = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
      const daysLeft = Math.ceil((new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
      obj.daysLeft = daysLeft;
      obj.monthsLeft = Math.ceil(daysLeft / 30);
      obj.requiredMonthly = daysLeft > 0 && g.targetAmount > g.currentAmount
        ? Math.ceil((g.targetAmount - g.currentAmount) / (daysLeft / 30)) : 0;
      return obj;
    });
    res.json({ goals: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ message: 'Goal created', goal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    goal.currentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    const pct = (goal.currentAmount / goal.targetAmount) * 100;
    [25, 50, 75, 100].forEach(m => {
      if (pct >= m && !goal.milestones.find(ms => ms.percentage === m)) {
        goal.milestones.push({ percentage: m, achievedAt: new Date(), note: `Reached ${m}%` });
      }
    });
    if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
    await goal.save();
    res.json({ message: 'Contribution added', goal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Goal deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
