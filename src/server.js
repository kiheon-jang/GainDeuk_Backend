const app = require('./app');
const DatabaseConfig = require('../config/database');
const RedisConfig = require('../config/redis');
const logger = require('./utils/logger');
const SchedulerService = require('./services/SchedulerService');
const NewsSchedulerService = require('./services/NewsSchedulerService');
const { processErrorHandler } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 3000;

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


async function startServer() {
  try {
    logger.info('🚀 GainDeuk Backend 서버 시작 중...');

    // 프로세스 에러 핸들러 초기화
    processErrorHandler();

    // Database connections
    await DatabaseConfig.connect();
    global.redis = RedisConfig.createConnection();

    // Start scheduler if enabled
    logger.info(`SCHEDULER_ENABLED: ${process.env.SCHEDULER_ENABLED}`);
    if (process.env.SCHEDULER_ENABLED === 'true') {
      global.scheduler = new SchedulerService();
      global.scheduler.startScheduler();
      logger.info('📅 스케줄러가 시작되었습니다');
      
      // Start news scheduler
      global.newsScheduler = new NewsSchedulerService();
      await global.newsScheduler.startScheduler();
      logger.info('📰 뉴스 스케줄러가 시작되었습니다');
    } else {
      logger.info('📅 스케줄러가 비활성화되어 있습니다');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✅ GainDeuk Backend가 포트 ${PORT}에서 실행 중입니다`);
      logger.info(`🌐 API URL: http://localhost:${PORT}`);
      logger.info(`📚 API 문서: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 헬스 체크: http://localhost:${PORT}/api/health`);
      logger.info(`📊 환경: ${process.env.NODE_ENV}`);
    });

    // Store server reference for graceful shutdown
    global.server = server;

    // Server error handler
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ 포트 ${PORT}이 이미 사용 중입니다`);
      } else {
        logger.error('❌ 서버 오류:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`📡 ${signal} 신호 수신. 우아한 종료 시작...`);
  
  try {
    // Stop accepting new requests
    if (global.server) {
      global.server.close(() => {
        logger.info('✅ HTTP 서버가 종료되었습니다');
      });
    }
    
    // Stop scheduler
    if (global.scheduler) {
      global.scheduler.stopScheduler();
      logger.info('✅ 스케줄러가 중지되었습니다');
    }
    
    // Stop news scheduler
    if (global.newsScheduler) {
      global.newsScheduler.stopScheduler();
      logger.info('✅ 뉴스 스케줄러가 중지되었습니다');
    }
    
    // Close database connections
    await DatabaseConfig.disconnect();
    
    if (global.redis) {
      global.redis.disconnect();
      logger.info('✅ Redis 연결이 종료되었습니다');
    }
    
    logger.info('✅ 우아한 종료가 완료되었습니다');
    process.exit(0);
  } catch (error) {
    logger.error('❌ 종료 중 오류 발생:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
