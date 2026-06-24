const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const router = express.Router();

// Get budgets for a month
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    // Recalculate spent from transactions
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const spentByCategory = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } }
    ]);
    const spentMap = {};
    spentByCategory.forEach(s => { spentMap[s._id] = s.spent; });
    const budgets = await Budget.find({ userId: req.user._id, month, year });
    const enriched = budgets.map(b => ({
      ...b.toObject(),
      spent: spentMap[b.category] || 0,
      percentage: b.limit > 0 ? Math.min(((spentMap[b.category] || 0) / b.limit) * 100, 100) : 0
    }));
    res.json({ budgets: enriched, month, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update budget
router.post('/', auth, async (req, res) => {
  try {
    const { category, limit, month, year, alertThreshold, notes } = req.body;
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month: m, year: y },
      { limit, alertThreshold, notes, userId: req.user._id, category, month: m, year: y },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json({ message: 'Budget saved', budget });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete budget
router.delete('/:id', auth, async (req, res) => {
  try {
    await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// What-If Scenario calculation
router.post('/whatif', auth, async (req, res) => {
  try {
    const { scenarios, month, year } = req.body;
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    // Current spending
    const currentSpending = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } }
    ]);
    const currentIncome = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'income', date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const budgets = await Budget.find({ userId: req.user._id, month: m, year: y });

    const spentMap = {};
    currentSpending.forEach(s => { spentMap[s._id] = s.spent; });
    const totalIncome = currentIncome[0]?.total || req.user.monthlyIncome || 0;
    const totalCurrentExpenses = Object.values(spentMap).reduce((a, b) => a + b, 0);

    // Apply scenarios
    const projectedSpentMap = { ...spentMap };
    scenarios.forEach(sc => {
      const current = projectedSpentMap[sc.category] || 0;
      if (sc.type === 'add') projectedSpentMap[sc.category] = current + sc.amount;
      else if (sc.type === 'set') projectedSpentMap[sc.category] = sc.amount;
      else if (sc.type === 'reduce') projectedSpentMap[sc.category] = Math.max(0, current - sc.amount);
    });

    const totalProjectedExpenses = Object.values(projectedSpentMap).reduce((a, b) => a + b, 0);

    // Budget impact
    const budgetImpact = budgets.map(b => ({
      category: b.category,
      limit: b.limit,
      currentSpent: spentMap[b.category] || 0,
      projectedSpent: projectedSpentMap[b.category] || 0,
      currentPercentage: ((spentMap[b.category] || 0) / b.limit) * 100,
      projectedPercentage: ((projectedSpentMap[b.category] || 0) / b.limit) * 100,
      willExceed: (projectedSpentMap[b.category] || 0) > b.limit
    }));

    // Suggestions
    const suggestions = [];
    if (totalProjectedExpenses > totalIncome * 0.9) suggestions.push({ type: 'warning', message: 'Projected expenses exceed 90% of income. Consider reducing discretionary spending.' });
    if (totalProjectedExpenses - totalCurrentExpenses > totalIncome * 0.1) suggestions.push({ type: 'info', message: `This scenario adds ₹${(totalProjectedExpenses - totalCurrentExpenses).toLocaleString()} to your monthly expenses.` });
    budgetImpact.filter(b => b.willExceed).forEach(b => suggestions.push({ type: 'danger', message: `${b.category} budget will be exceeded by ₹${(b.projectedSpent - b.limit).toLocaleString()}` }));
    if (totalIncome - totalProjectedExpenses > 0) suggestions.push({ type: 'success', message: `You'll still have ₹${(totalIncome - totalProjectedExpenses).toLocaleString()} remaining after this scenario.` });

    res.json({
      currentExpenses: totalCurrentExpenses,
      projectedExpenses: totalProjectedExpenses,
      income: totalIncome,
      difference: totalProjectedExpenses - totalCurrentExpenses,
      savingsAfter: totalIncome - totalProjectedExpenses,
      budgetImpact,
      suggestions,
      projectedSpentMap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
