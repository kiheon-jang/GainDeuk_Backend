require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { requestLogger } = require('./middleware/logging');
const { performanceMonitor } = require('./middleware/monitoring');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// CORS middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179'
  ],
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Performance monitoring
app.use(performanceMonitor.trackApiPerformance());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (개발 환경용 완화된 설정)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: process.env.RATE_LIMIT_MAX || 1000, // 요청 제한 (개발용으로 증가)
  message: {
    success: false,
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 개발 환경에서는 더 관대한 설정
  skip: (req) => {
    // 개발 환경에서는 localhost 요청은 제한하지 않음
    return process.env.NODE_ENV === 'development' && req.ip === '::1';
  }
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'GainDeuk Backend is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/coins', require('./routes/coins'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/health', require('./routes/health'));
app.use('/api/korean-market', require('./routes/koreanMarket'));
app.use('/api/user-profiles', require('./routes/userProfiles'));
app.use('/api/personalization', require('./routes/personalization'));
app.use('/api/social-media', require('./routes/socialMedia'));
app.use('/api/onchain', require('./routes/onChain'));
app.use('/api/signal-persistence', require('./routes/signalPersistence'));
app.use('/api/investment-strategy', require('./routes/investmentStrategy'));
app.use('/api/real-time-optimization', require('./routes/realTimeOptimization'));
app.use('/api/data-quality', require('./routes/dataQuality'));
app.use('/api/performance-monitoring', require('./routes/performanceMonitoring'));
app.use('/api/news', require('./routes/news'));

// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
  const { swaggerUi, specs } = require('./utils/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '요청한 리소스를 찾을 수 없습니다',
    path: req.originalUrl
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
