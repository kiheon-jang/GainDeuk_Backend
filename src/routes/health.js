const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { performanceMonitor, memoryMonitor, databaseMonitor, apiUsageMonitor } = require('../middleware/monitoring');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 시스템 헬스체크
 *     description: 애플리케이션, 데이터베이스, Redis 연결 상태를 확인합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 시스템이 정상 작동 중
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: 서버 가동 시간 (초)
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         mongodb:
 *                           type: boolean
 *                         redis:
 *                           type: boolean
 *                     api:
 *                       type: object
 *                       properties:
 *                         coingecko:
 *                           type: boolean
 *                         news:
 *                           type: boolean
 *                         whale:
 *                           type: boolean
 *                 performance:
 *                   type: object
 *                   properties:
 *                     requestCount:
 *                       type: number
 *                     averageResponseTime:
 *                       type: number
 *                     slowRequestRate:
 *                       type: number
 *                     errorRate:
 *                       type: number
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapUsed:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     rss:
 *                       type: number
 *                     heapUsage:
 *                       type: number
 *       503:
 *         description: 시스템에 문제가 있음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    const health = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services: {},
      performance: {},
      memory: {},
      errors: []
    };

    // 데이터베이스 연결 상태 확인
    try {
      const mongoose = require('mongoose');
      health.services.database = {
        mongodb: mongoose.connection.readyState === 1,
        redis: false
      };

      // Redis 연결 확인
      try {
        const CacheService = require('../services/CacheService');
        const cacheService = new CacheService();
        health.services.database.redis = await cacheService.ping();
      } catch (error) {
        health.services.database.redis = false;
        health.errors.push('Redis connection failed');
      }
    } catch (error) {
      health.services.database = { mongodb: false, redis: false };
      health.errors.push('Database connection failed');
    }

    // 외부 API 서비스 상태 확인
    try {
      const CoinGeckoService = require('../services/CoinGeckoService');
      const NewsService = require('../services/NewsService');
      const WhaleService = require('../services/WhaleService');

      const coinGeckoService = new CoinGeckoService();
      const newsService = new NewsService();
      const whaleService = new WhaleService();

      health.services.api = {
        coingecko: await coinGeckoService.testConnection(),
        news: true, // 뉴스 서비스는 항상 사용 가능
        whale: await whaleService.testConnection()
      };
    } catch (error) {
      health.services.api = { coingecko: false, news: false, whale: false };
      health.errors.push('External API services failed');
    }

    // 스케줄러 상태 확인
    try {
      health.services.scheduler = {
        enabled: process.env.SCHEDULER_ENABLED === 'true',
        running: global.scheduler ? global.scheduler.isRunning : false,
        jobs: global.scheduler ? global.scheduler.jobs.size : 0
      };
    } catch (error) {
      health.services.scheduler = { enabled: false, running: false, jobs: 0 };
      health.errors.push('Scheduler status check failed');
    }

    // 성능 메트릭
    try {
      health.performance = performanceMonitor.getMetrics();
    } catch (error) {
      health.errors.push('Performance metrics unavailable');
    }

    // 메모리 사용량
    try {
      health.memory = memoryMonitor.getCurrentUsage();
    } catch (error) {
      health.errors.push('Memory monitoring unavailable');
    }

    // 전체 상태 결정
    const allServicesHealthy = Object.values(health.services.database).every(status => status) &&
                              Object.values(health.services.api).every(status => status);

    if (!allServicesHealthy || health.errors.length > 0) {
      health.success = false;
      health.status = 'unhealthy';
    }

    // 응답 시간 추가
    health.responseTime = Date.now() - startTime;

    // 상태 코드 결정
    const statusCode = health.success ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: 상세 헬스체크
 *     description: 시스템의 상세한 상태 정보를 제공합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 상세 헬스체크 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 system:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                     nodeVersion:
 *                       type: string
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *                 database:
 *                   type: object
 *                 performance:
 *                   type: object
 *                 queues:
 *                   type: object
 *                 cache:
 *                   type: object
 */
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      database: {},
      performance: {},
      queues: {},
      cache: {},
      errors: []
    };

    // 데이터베이스 상세 정보
    try {
      const mongoose = require('mongoose');
      detailedHealth.database.mongodb = {
        connected: mongoose.connection.readyState === 1,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      };

      // Redis 상세 정보
      try {
        const CacheService = require('../services/CacheService');
        const cacheService = new CacheService();
        const cacheStats = await cacheService.getCacheStats();
        
        detailedHealth.database.redis = {
          connected: await cacheService.ping(),
          stats: cacheStats
        };
      } catch (error) {
        detailedHealth.database.redis = { connected: false, error: error.message };
      }
    } catch (error) {
      detailedHealth.database = { error: error.message };
    }

    // 성능 상세 정보
    try {
      detailedHealth.performance = performanceMonitor.getMetrics();
      detailedHealth.performance.metricsHistory = performanceMonitor.getMetricsHistory(50);
    } catch (error) {
      detailedHealth.performance = { error: error.message };
    }

    // 큐 상태 (스케줄러가 실행 중인 경우)
    try {
      if (global.scheduler) {
        detailedHealth.queues = global.scheduler.getStatus();
      } else {
        detailedHealth.queues = { status: 'not_initialized' };
      }
    } catch (error) {
      detailedHealth.queues = { error: error.message };
    }

    // 캐시 상세 정보
    try {
      const CacheService = require('../services/CacheService');
      const cacheService = new CacheService();
      detailedHealth.cache = await cacheService.getCacheStats();
    } catch (error) {
      detailedHealth.cache = { error: error.message };
    }

    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: 준비 상태 확인
 *     description: 애플리케이션이 요청을 처리할 준비가 되었는지 확인합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 준비 완료
 *       503:
 *         description: 준비되지 않음
 */
router.get('/ready', async (req, res) => {
  try {
    // 필수 서비스들이 준비되었는지 확인
    const mongoose = require('mongoose');
    const isDatabaseReady = mongoose.connection.readyState === 1;
    
    let isRedisReady = false;
    try {
      const CacheService = require('../services/CacheService');
      const cacheService = new CacheService();
      isRedisReady = await cacheService.ping();
    } catch (error) {
      isRedisReady = false;
    }

    if (isDatabaseReady && isRedisReady) {
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        services: {
          database: isDatabaseReady,
          redis: isRedisReady
        }
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: 생존 상태 확인
 *     description: 애플리케이션이 살아있는지 확인합니다.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 애플리케이션이 살아있음
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
