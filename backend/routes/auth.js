const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

router.get('/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    res.json({ dbState: mongoose.connection.readyState, message: 'connected!' });
  } catch (err) {
    res.json({ error: err.message });
  }
});
// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, monthlyIncome, employmentStatus, creditScore } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password, monthlyIncome: monthlyIncome || 0, employmentStatus: employmentStatus || 'employed', creditScore: creditScore || 650 });
    const token = signToken(user._id);
    res.status(201).json({ message: 'Account created successfully', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid email or password' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id);
    res.json({ message: 'Login successful', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Update profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'monthlyIncome', 'currency', 'creditScore', 'employmentStatus'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
