const express = require('express');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const router = express.Router();

// Get transactions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit = 50, page = 1 } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ date: -1 }).limit(parseInt(limit)).skip(skip),
      Transaction.countDocuments(query)
    ]);
    res.json({ transactions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add transaction
router.post('/', auth, async (req, res) => {
  try {
    //const tx = await Transaction.create({ ...req.body, userId: req.user._id });
    // Update budget spent
    const transactionData = {
      ...req.body,
      userId: req.user._id,
      amount: parseFloat(req.body.amount || 0)
    };
    const tx = await Transaction.create(transactionData);
    if (tx.type === 'expense') {
      const now = new Date(tx.date);
      await Budget.findOneAndUpdate(
        { userId: req.user._id, category: tx.category, month: now.getMonth() + 1, year: now.getFullYear() },
        { $inc: { spent: tx.amount } }
      );
    }
    res.status(201).json({ message: 'Transaction added', transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.type === 'expense') {
      const d = new Date(tx.date);
      await Budget.findOneAndUpdate(
        { userId: req.user._id, category: tx.category, month: d.getMonth() + 1, year: d.getFullYear() },
        { $inc: { spent: -tx.amount } }
      );
    }
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics: spending by category
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year) || now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const [byCategory, monthlyTrend, totals] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start, $lte: end }, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, date: { $gte: new Date(y, 0, 1), $lte: end } } },
        { $group: { _id: { month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.month': 1 } }
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start, $lte: end } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ])
    ]);

    const income = totals.find(t => t._id === 'income')?.total || 0;
    const expenses = totals.find(t => t._id === 'expense')?.total || 0;
    res.json({ byCategory, monthlyTrend, income, expenses, net: income - expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get daily spending for heat map
router.get('/analytics/heatmap', auth, async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const data = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ heatmap: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
