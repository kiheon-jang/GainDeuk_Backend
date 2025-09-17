const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    });

    this.defaultTTL = {
      coinData: parseInt(process.env.CACHE_TTL_COIN_DATA) || 300,      // 5분
      signals: parseInt(process.env.CACHE_TTL_SIGNALS) || 900,         // 15분
      news: parseInt(process.env.CACHE_TTL_NEWS) || 1800,              // 30분
      whaleData: parseInt(process.env.CACHE_TTL_WHALE_DATA) || 600,    // 10분
      apiCalls: 86400,                                                 // 24시간
      sentiment: 1800,                                                 // 30분
      global: 3600                                                     // 1시간
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.redis.on('connect', () => {
      logger.success('Redis 연결 성공');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis 연결 오류:', err);
    });

    this.redis.on('close', () => {
      logger.warning('Redis 연결이 닫혔습니다');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis 재연결 시도 중...');
    });
  }

  // 기본 캐시 메서드
  async set(key, value, ttl = null) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error: error.message });
      return false;
    }
  }

  async ttl(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error:', { key, error: error.message });
      return -1;
    }
  }

  // 코인 데이터 캐싱
  async setCoinData(coinId, data, ttl = this.defaultTTL.coinData) {
    const key = `coin:${coinId}`;
    return await this.set(key, data, ttl);
  }

  async getCoinData(coinId) {
    const key = `coin:${coinId}`;
    return await this.get(key);
  }

  async setBatchData(page, data, ttl = this.defaultTTL.coinData) {
    const key = `batch:${page}`;
    return await this.set(key, data, ttl);
  }

  async getBatchData(page) {
    const key = `batch:${page}`;
    return await this.get(key);
  }

  // 신호 데이터 캐싱
  async setSignal(coinId, signal, ttl = this.defaultTTL.signals) {
    const key = `signal:${coinId}`;
    return await this.set(key, signal, ttl);
  }

  async getSignal(coinId) {
    const key = `signal:${coinId}`;
    return await this.get(key);
  }

  async setSignalsList(signals, ttl = this.defaultTTL.signals) {
    const key = 'signals:list';
    return await this.set(key, signals, ttl);
  }

  async getSignalsList() {
    const key = 'signals:list';
    return await this.get(key);
  }

  // 뉴스 및 감정분석 캐싱
  async setNewsData(coinSymbol, news, ttl = this.defaultTTL.news) {
    const key = `news:${coinSymbol.toLowerCase()}`;
    return await this.set(key, news, ttl);
  }

  async getNewsData(coinSymbol) {
    const key = `news:${coinSymbol.toLowerCase()}`;
    return await this.get(key);
  }

  async setSentiment(coinSymbol, sentiment, ttl = this.defaultTTL.sentiment) {
    const key = `sentiment:${coinSymbol.toLowerCase()}`;
    const data = {
      score: sentiment,
      timestamp: Date.now()
    };
    return await this.set(key, data, ttl);
  }

  async getSentiment(coinSymbol) {
    const key = `sentiment:${coinSymbol.toLowerCase()}`;
    const data = await this.get(key);
    
    if (!data) return null;
    
    // 30분이 지났으면 null 반환
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      await this.del(key);
      return null;
    }
    
    return data.score;
  }

  // 고래 데이터 캐싱
  async setWhaleData(coinSymbol, whaleData, ttl = this.defaultTTL.whaleData) {
    const key = `whale:${coinSymbol.toLowerCase()}`;
    return await this.set(key, whaleData, ttl);
  }

  async getWhaleData(coinSymbol) {
    const key = `whale:${coinSymbol.toLowerCase()}`;
    return await this.get(key);
  }

  // API 호출 횟수 추적
  async incrementApiCalls(endpoint) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `api_calls:${endpoint}:${today}`;
    
    try {
      const count = await this.redis.incr(key);
      await this.redis.expire(key, this.defaultTTL.apiCalls);
      return count;
    } catch (error) {
      logger.error('API calls increment error:', { endpoint, error: error.message });
      return 0;
    }
  }

  async getApiCallsToday(endpoint) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `api_calls:${endpoint}:${today}`;
    
    try {
      const count = await this.redis.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      logger.error('API calls get error:', { endpoint, error: error.message });
      return 0;
    }
  }

  async incrementApiCallsToday(endpoint) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `api_calls:${endpoint}:${today}`;
    
    try {
      const count = await this.redis.incr(key);
      // 24시간 후 만료
      await this.redis.expire(key, 86400);
      return count;
    } catch (error) {
      logger.error('API calls increment error:', { endpoint, error: error.message });
      return 0;
    }
  }

  async getApiCallsThisMonth(endpoint) {
    const month = new Date().toISOString().slice(0, 7);
    const pattern = `api_calls:${endpoint}:${month}-*`;
    
    try {
      const keys = await this.redis.keys(pattern);
      let totalCalls = 0;
      
      for (const key of keys) {
        const count = await this.redis.get(key);
        totalCalls += parseInt(count) || 0;
      }
      
      return totalCalls;
    } catch (error) {
      logger.error('API calls month error:', { endpoint, error: error.message });
      return 0;
    }
  }

  // 글로벌 데이터 캐싱
  async setGlobalData(data, ttl = this.defaultTTL.global) {
    const key = 'global:data';
    return await this.set(key, data, ttl);
  }

  async getGlobalData() {
    const key = 'global:data';
    return await this.get(key);
  }

  // 통계 데이터 캐싱
  async setStats(stats, ttl = this.defaultTTL.signals) {
    const key = 'stats:overview';
    return await this.set(key, stats, ttl);
  }

  async getStats() {
    const key = 'stats:overview';
    return await this.get(key);
  }

  // 검색 결과 캐싱
  async setSearchResults(query, results, ttl = 300) {
    const key = `search:${query.toLowerCase()}`;
    return await this.set(key, results, ttl);
  }

  async getSearchResults(query) {
    const key = `search:${query.toLowerCase()}`;
    return await this.get(key);
  }

  // 캐시 패턴 삭제
  async deletePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache pattern delete error:', { pattern, error: error.message });
      return 0;
    }
  }

  // 캐시 정리
  async cleanup() {
    try {
      const patterns = [
        'coin:*',
        'signal:*',
        'news:*',
        'whale:*',
        'sentiment:*',
        'search:*'
      ];

      let totalDeleted = 0;
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          // TTL이 없거나 24시간 이상 지난 키 삭제
          if (ttl === -1 || ttl < -86400) {
            await this.redis.del(key);
            totalDeleted++;
          }
        }
      }

      logger.info(`Cache cleanup completed: ${totalDeleted} keys deleted`);
      return totalDeleted;
    } catch (error) {
      logger.error('Cache cleanup error:', error);
      return 0;
    }
  }

  // 캐시 통계
  async getCacheStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: {
          used: info.match(/used_memory_human:(.+)/)?.[1],
          peak: info.match(/used_memory_peak_human:(.+)/)?.[1],
          fragmentation: info.match(/mem_fragmentation_ratio:(.+)/)?.[1]
        },
        keyspace: keyspace,
        totalKeys: await this.redis.dbsize()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // 연결 상태 확인
  async ping() {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error);
      return false;
    }
  }

  // 패턴으로 캐시 삭제
  async clearPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Clear pattern error:', error);
      return 0;
    }
  }

  // 연결 종료
  async disconnect() {
    try {
      await this.redis.disconnect();
      logger.info('Redis 연결이 종료되었습니다');
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    }
  }
}

module.exports = CacheService;
