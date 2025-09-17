const Redis = require('ioredis');
const logger = require('../src/utils/logger');

class RedisConfig {
  static createConnection() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 10000
    });

    // Event listeners
    redis.on('connect', () => {
      logger.info('✅ Redis 연결 성공');
    });

    redis.on('ready', () => {
      logger.info('🔄 Redis 준비 완료');
    });

    redis.on('error', (err) => {
      logger.error('❌ Redis 연결 오류:', err);
    });

    redis.on('close', () => {
      logger.warn('⚠️ Redis 연결이 닫혔습니다');
    });

    redis.on('reconnecting', () => {
      logger.info('🔄 Redis 재연결 시도 중...');
    });

    redis.on('end', () => {
      logger.info('📡 Redis 연결이 종료되었습니다');
    });

    return redis;
  }

  static async testConnection(redis) {
    try {
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error('❌ Redis 연결 테스트 실패:', error);
      return false;
    }
  }

  static async getConnectionInfo(redis) {
    try {
      const info = await redis.info('server');
      const memory = await redis.info('memory');
      
      return {
        connected: await this.testConnection(redis),
        version: info.match(/redis_version:(.+)/)?.[1],
        uptime: info.match(/uptime_in_seconds:(.+)/)?.[1],
        memory: {
          used: memory.match(/used_memory_human:(.+)/)?.[1],
          peak: memory.match(/used_memory_peak_human:(.+)/)?.[1]
        }
      };
    } catch (error) {
      logger.error('❌ Redis 정보 조회 실패:', error);
      return { connected: false };
    }
  }
}

module.exports = RedisConfig;
