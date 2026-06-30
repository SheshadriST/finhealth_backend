require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust proxy 
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';

app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allow = ALLOWED_ORIGIN === '*' ? (origin || '*') : ALLOWED_ORIGIN;
  res.set('Access-Control-Allow-Origin', allow);
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allow = ALLOWED_ORIGIN === '*' ? (origin || '*') : ALLOWED_ORIGIN;
  res.set('Access-Control-Allow-Origin', allow);
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/goals', require('./routes/goals'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// MongoDB connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.log('⚠️  Running without database — demo mode active');
  }
};

connectDB();

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`FinHealth API running on port ${PORT}`));
}

module.exports = app;
