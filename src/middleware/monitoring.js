const logger = require('../utils/logger');

/**
 * 성능 모니터링 미들웨어
 * API 응답 시간과 성능 메트릭을 추적합니다.
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      startTime: Date.now()
    };
    
    this.slowRequestThreshold = 500; // 500ms
    this.maxMetricsHistory = 1000;
    this.metricsHistory = [];
  }

  /**
   * API 성능 추적 미들웨어
   */
  trackApiPerformance() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // 요청 카운트 증가
      this.metrics.requestCount++;
      
      // 응답 완료 시 메트릭 업데이트
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // 총 응답 시간 누적
        this.metrics.totalResponseTime += duration;
        
        // 느린 요청 카운트
        if (duration > this.slowRequestThreshold) {
          this.metrics.slowRequests++;
          logger.warning('Slow API Request', {
            method: req.method,
            url: req.url,
            duration: `${duration}ms`,
            threshold: `${this.slowRequestThreshold}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        }
        
        // 에러 카운트
        if (res.statusCode >= 400) {
          this.metrics.errorCount++;
        }
        
        // 메트릭 히스토리에 추가
        this.addToHistory({
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        // 성능 로깅
        logger.info('API Performance', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          avgResponseTime: this.getAverageResponseTime(),
          slowRequestRate: this.getSlowRequestRate(),
          errorRate: this.getErrorRate()
        });
      });
      
      next();
    };
  }

  /**
   * 메트릭 히스토리에 추가
   */
  addToHistory(metric) {
    this.metricsHistory.push(metric);
    
    // 히스토리 크기 제한
    if (this.metricsHistory.length > this.maxMetricsHistory) {
      this.metricsHistory.shift();
    }
  }

  /**
   * 평균 응답 시간 계산
   */
  getAverageResponseTime() {
    if (this.metrics.requestCount === 0) return 0;
    return Math.round(this.metrics.totalResponseTime / this.metrics.requestCount);
  }

  /**
   * 느린 요청 비율 계산
   */
  getSlowRequestRate() {
    if (this.metrics.requestCount === 0) return 0;
    return Math.round((this.metrics.slowRequests / this.metrics.requestCount) * 100);
  }

  /**
   * 에러 비율 계산
   */
  getErrorRate() {
    if (this.metrics.requestCount === 0) return 0;
    return Math.round((this.metrics.errorCount / this.metrics.requestCount) * 100);
  }

  /**
   * 현재 메트릭 조회
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime: Math.round(uptime / 1000), // 초 단위
      averageResponseTime: this.getAverageResponseTime(),
      slowRequestRate: this.getSlowRequestRate(),
      errorRate: this.getErrorRate(),
      requestsPerSecond: this.metrics.requestCount / (uptime / 1000)
    };
  }

  /**
   * 메트릭 히스토리 조회
   */
  getMetricsHistory(limit = 100) {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      startTime: Date.now()
    };
    this.metricsHistory = [];
    
    logger.info('Performance metrics reset');
  }

  /**
   * 느린 요청 임계값 설정
   */
  setSlowRequestThreshold(threshold) {
    this.slowRequestThreshold = threshold;
    logger.info(`Slow request threshold set to ${threshold}ms`);
  }

  /**
   * 메트릭 히스토리 크기 설정
   */
  setMaxMetricsHistory(max) {
    this.maxMetricsHistory = max;
    logger.info(`Max metrics history set to ${max}`);
  }
}

/**
 * 메모리 사용량 모니터링
 */
class MemoryMonitor {
  constructor() {
    this.memoryThresholds = {
      warning: 100 * 1024 * 1024, // 100MB
      critical: 200 * 1024 * 1024  // 200MB
    };
    
    this.checkInterval = 30000; // 30초
    this.intervalId = null;
  }

  /**
   * 메모리 모니터링 시작
   */
  startMonitoring() {
    if (this.intervalId) {
      logger.warning('Memory monitoring is already running');
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    logger.info('Memory monitoring started');
  }

  /**
   * 메모리 모니터링 중지
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Memory monitoring stopped');
    }
  }

  /**
   * 메모리 사용량 확인
   */
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    const external = usage.external;
    const rss = usage.rss;

    const memoryInfo = {
      heapUsed: Math.round(heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(heapTotal / 1024 / 1024), // MB
      external: Math.round(external / 1024 / 1024), // MB
      rss: Math.round(rss / 1024 / 1024), // MB
      heapUsage: Math.round((heapUsed / heapTotal) * 100) // %
    };

    // 메모리 사용량 로깅
    if (heapUsed > this.memoryThresholds.critical) {
      logger.error('Critical memory usage detected', memoryInfo);
    } else if (heapUsed > this.memoryThresholds.warning) {
      logger.warning('High memory usage detected', memoryInfo);
    } else {
      logger.info('Memory usage normal', memoryInfo);
    }

    return memoryInfo;
  }

  /**
   * 메모리 임계값 설정
   */
  setThresholds(warning, critical) {
    this.memoryThresholds.warning = warning;
    this.memoryThresholds.critical = critical;
    logger.info(`Memory thresholds updated: warning=${warning}MB, critical=${critical}MB`);
  }

  /**
   * 현재 메모리 사용량 조회
   */
  getCurrentUsage() {
    return this.checkMemoryUsage();
  }
}

/**
 * 데이터베이스 연결 모니터링
 */
class DatabaseMonitor {
  constructor() {
    this.connectionStatus = {
      mongodb: false,
      redis: false
    };
    
    this.checkInterval = 60000; // 1분
    this.intervalId = null;
  }

  /**
   * 데이터베이스 모니터링 시작
   */
  startMonitoring() {
    if (this.intervalId) {
      logger.warning('Database monitoring is already running');
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkConnections();
    }, this.checkInterval);

    logger.info('Database monitoring started');
  }

  /**
   * 데이터베이스 모니터링 중지
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Database monitoring stopped');
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnections() {
    // MongoDB 연결 확인
    try {
      const mongoose = require('mongoose');
      this.connectionStatus.mongodb = mongoose.connection.readyState === 1;
    } catch (error) {
      this.connectionStatus.mongodb = false;
    }

    // Redis 연결 확인
    try {
      const CacheService = require('../services/CacheService');
      const cacheService = new CacheService();
      this.connectionStatus.redis = await cacheService.ping();
    } catch (error) {
      this.connectionStatus.redis = false;
    }

    // 연결 상태 로깅
    const allConnected = Object.values(this.connectionStatus).every(status => status);
    
    if (!allConnected) {
      logger.warning('Database connection issues detected', this.connectionStatus);
    } else {
      logger.info('All database connections healthy', this.connectionStatus);
    }

    return this.connectionStatus;
  }

  /**
   * 현재 연결 상태 조회
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }
}

/**
 * API 사용량 모니터링
 */
class ApiUsageMonitor {
  constructor() {
    this.usage = new Map();
    this.limits = new Map();
  }

  /**
   * API 사용량 추적
   */
  trackApiUsage(service, endpoint) {
    const key = `${service}:${endpoint}`;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        daily: new Map(),
        hourly: new Map(),
        total: 0
      });
    }
    
    const serviceUsage = this.usage.get(key);
    
    // 일별 사용량
    if (!serviceUsage.daily.has(today)) {
      serviceUsage.daily.set(today, 0);
    }
    serviceUsage.daily.set(today, serviceUsage.daily.get(today) + 1);
    
    // 시간별 사용량
    if (!serviceUsage.hourly.has(hour)) {
      serviceUsage.hourly.set(hour, 0);
    }
    serviceUsage.hourly.set(hour, serviceUsage.hourly.get(hour) + 1);
    
    // 총 사용량
    serviceUsage.total++;
    
    // 사용량 로깅
    logger.info('API Usage Tracked', {
      service,
      endpoint,
      daily: serviceUsage.daily.get(today),
      hourly: serviceUsage.hourly.get(hour),
      total: serviceUsage.total
    });
  }

  /**
   * API 제한 설정
   */
  setApiLimit(service, endpoint, dailyLimit, hourlyLimit) {
    const key = `${service}:${endpoint}`;
    this.limits.set(key, { dailyLimit, hourlyLimit });
  }

  /**
   * API 사용량 조회
   */
  getApiUsage(service, endpoint) {
    const key = `${service}:${endpoint}`;
    return this.usage.get(key) || { daily: new Map(), hourly: new Map(), total: 0 };
  }

  /**
   * API 제한 확인
   */
  checkApiLimit(service, endpoint) {
    const key = `${service}:${endpoint}`;
    const usage = this.getApiUsage(service, endpoint);
    const limit = this.limits.get(key);
    
    if (!limit) return { allowed: true, remaining: Infinity };
    
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    
    const dailyUsage = usage.daily.get(today) || 0;
    const hourlyUsage = usage.hourly.get(hour) || 0;
    
    const dailyRemaining = Math.max(0, limit.dailyLimit - dailyUsage);
    const hourlyRemaining = Math.max(0, limit.hourlyLimit - hourlyUsage);
    
    const allowed = dailyRemaining > 0 && hourlyRemaining > 0;
    
    return {
      allowed,
      dailyRemaining,
      hourlyRemaining,
      dailyUsage,
      hourlyUsage
    };
  }
}

// 싱글톤 인스턴스 생성
const performanceMonitor = new PerformanceMonitor();
const memoryMonitor = new MemoryMonitor();
const databaseMonitor = new DatabaseMonitor();
const apiUsageMonitor = new ApiUsageMonitor();

module.exports = {
  PerformanceMonitor,
  MemoryMonitor,
  DatabaseMonitor,
  ApiUsageMonitor,
  performanceMonitor,
  memoryMonitor,
  databaseMonitor,
  apiUsageMonitor
};
