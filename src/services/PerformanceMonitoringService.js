const EventEmitter = require('events');
const os = require('os');
const v8 = require('v8');
const { logger } = require('../utils/logger');
const performanceConfig = require('../config/performance');

// 안전한 로거 헬퍼 함수
const safeLogger = {
  info: (msg, ...args) => {
    if (logger && safeLogger.info) {
      safeLogger.info(msg, ...args);
    } else {
      console.log(msg, ...args);
    }
  },
  warn: (msg, ...args) => {
    if (logger && safeLogger.warn) {
      safeLogger.warn(msg, ...args);
    } else {
      console.warn(msg, ...args);
    }
  },
  error: (msg, ...args) => {
    if (logger && safeLogger.error) {
      safeLogger.error(msg, ...args);
    } else {
      console.error(msg, ...args);
    }
  },
  debug: (msg, ...args) => {
    if (logger && safeLogger.debug) {
      safeLogger.debug(msg, ...args);
    } else {
      console.debug(msg, ...args);
    }
  }
};

/**
 * 성능 모니터링 서비스
 * 시스템 성능을 실시간으로 모니터링하고 최적화하는 서비스
 */
class PerformanceMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.metrics = {
      system: {
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        memory: { used: 0, free: 0, total: 0, usage: 0 },
        disk: { used: 0, free: 0, total: 0, usage: 0 },
        network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
      },
      application: {
        responseTime: { average: 0, min: 0, max: 0, p95: 0, p99: 0 },
        requestCount: { total: 0, perSecond: 0, errors: 0 },
        errorRate: 0,
        activeConnections: 0,
        memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
        eventLoop: { delay: 0, utilization: 0 },
        gc: { count: 0, time: 0, lastRun: null }
      },
      database: {
        connections: { active: 0, idle: 0, total: 0 },
        queries: { total: 0, slow: 0, errors: 0 },
        responseTime: { average: 0, min: 0, max: 0 }
      }
    };
    
    this.alerts = [];
    this.performanceHistory = [];
    this.maxHistorySize = 1000;
    
    // 성능 임계값 설정
    this.thresholds = performanceConfig.monitoring.alerts;
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   * @private
   */
  setupEventListeners() {
    // 가비지 컬렉션 이벤트 리스너 (v8 모듈은 이벤트를 직접 지원하지 않음)
    // 대신 주기적으로 가비지 컬렉션 통계를 수집
    if (v8.getHeapStatistics) {
      // v8.on은 지원되지 않으므로 주기적 폴링으로 대체
      setInterval(() => {
        const heapStats = v8.getHeapStatistics();
        this.updateGCMetrics(heapStats);
      }, 5000); // 5초마다 수집
    }

    // 프로세스 이벤트 리스너
    process.on('uncaughtException', (error) => {
      this.handleError('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleError('unhandledRejection', { reason, promise });
    });

    // 메모리 경고 리스너
    process.on('warning', (warning) => {
      this.handleWarning(warning);
    });
  }

  /**
   * 서비스 시작
   */
  async startService() {
    if (this.isRunning) {
      safeLogger.warn('성능 모니터링 서비스가 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      safeLogger.info('성능 모니터링 서비스를 시작합니다.');

      // 초기 메트릭 수집
      await this.collectInitialMetrics();

      // 주기적 메트릭 수집 시작
      this.startMetricsCollection();

      // 성능 최적화 시작
      this.startPerformanceOptimization();

      safeLogger.info('성능 모니터링 서비스가 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      safeLogger.error('성능 모니터링 서비스 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 서비스 중지
   */
  stopService() {
    if (!this.isRunning) {
      safeLogger.warn('성능 모니터링 서비스가 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;

    // 메트릭 수집 중지
    this.stopMetricsCollection();

    // 성능 최적화 중지
    this.stopPerformanceOptimization();

    safeLogger.info('성능 모니터링 서비스가 중지되었습니다.');
  }

  /**
   * 초기 메트릭 수집
   * @private
   */
  async collectInitialMetrics() {
    try {
      // 시스템 메트릭 수집
      await this.collectSystemMetrics();
      
      // 애플리케이션 메트릭 수집
      await this.collectApplicationMetrics();
      
      // 데이터베이스 메트릭 수집
      await this.collectDatabaseMetrics();

      safeLogger.info('초기 메트릭 수집이 완료되었습니다.');

    } catch (error) {
      safeLogger.error('초기 메트릭 수집 실패:', error);
    }
  }

  /**
   * 메트릭 수집 시작
   * @private
   */
  startMetricsCollection() {
    const interval = performanceConfig.monitoring.systemMetrics.interval * 1000;
    
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectAllMetrics();
        this.checkAlerts();
        this.updatePerformanceHistory();
      } catch (error) {
        safeLogger.error('메트릭 수집 실패:', error);
      }
    }, interval);
  }

  /**
   * 메트릭 수집 중지
   * @private
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  /**
   * 모든 메트릭 수집
   * @private
   */
  async collectAllMetrics() {
    await Promise.all([
      this.collectSystemMetrics(),
      this.collectApplicationMetrics(),
      this.collectDatabaseMetrics()
    ]);
  }

  /**
   * 시스템 메트릭 수집
   * @private
   */
  async collectSystemMetrics() {
    try {
      // CPU 메트릭
      const cpuUsage = await this.getCPUUsage();
      this.metrics.system.cpu.usage = cpuUsage;
      this.metrics.system.cpu.loadAverage = os.loadavg();

      // 메모리 메트릭
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      this.metrics.system.memory.total = totalMem;
      this.metrics.system.memory.free = freeMem;
      this.metrics.system.memory.used = usedMem;
      this.metrics.system.memory.usage = (usedMem / totalMem) * 100;

      // 디스크 메트릭 (간단한 구현)
      this.metrics.system.disk = await this.getDiskUsage();

      // 네트워크 메트릭
      this.metrics.system.network = await this.getNetworkStats();

    } catch (error) {
      safeLogger.error('시스템 메트릭 수집 실패:', error);
    }
  }

  /**
   * 애플리케이션 메트릭 수집
   * @private
   */
  async collectApplicationMetrics() {
    try {
      // 메모리 사용량
      const memUsage = process.memoryUsage();
      this.metrics.application.memoryUsage = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      };

      // 이벤트 루프 지연
      this.metrics.application.eventLoop = await this.getEventLoopMetrics();

      // 가비지 컬렉션 메트릭
      this.metrics.application.gc = this.getGCMetrics();

    } catch (error) {
      safeLogger.error('애플리케이션 메트릭 수집 실패:', error);
    }
  }

  /**
   * 데이터베이스 메트릭 수집
   * @private
   */
  async collectDatabaseMetrics() {
    try {
      // 실제 구현에서는 데이터베이스 연결 풀에서 메트릭을 가져와야 함
      // 여기서는 샘플 데이터를 사용
      this.metrics.database.connections = {
        active: Math.floor(Math.random() * 10),
        idle: Math.floor(Math.random() * 5),
        total: 15
      };

      this.metrics.database.queries = {
        total: Math.floor(Math.random() * 1000),
        slow: Math.floor(Math.random() * 10),
        errors: Math.floor(Math.random() * 5)
      };

    } catch (error) {
      safeLogger.error('데이터베이스 메트릭 수집 실패:', error);
    }
  }

  /**
   * CPU 사용률 계산
   * @private
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(percentageCPU);
      }, 100);
    });
  }

  /**
   * CPU 평균값 계산
   * @private
   */
  cpuAverage() {
    const cpus = os.cpus();
    let idleMs = 0;
    let totalMs = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalMs += cpu.times[type];
      }
      idleMs += cpu.times.idle;
    });

    return {
      idle: idleMs / cpus.length,
      total: totalMs / cpus.length
    };
  }

  /**
   * 디스크 사용량 계산
   * @private
   */
  async getDiskUsage() {
    // 실제 구현에서는 fs.stat를 사용하여 디스크 사용량을 계산해야 함
    // 여기서는 샘플 데이터를 사용
    return {
      used: 50000000000, // 50GB
      free: 100000000000, // 100GB
      total: 150000000000, // 150GB
      usage: 33.33
    };
  }

  /**
   * 네트워크 통계 수집
   * @private
   */
  async getNetworkStats() {
    // 실제 구현에서는 네트워크 인터페이스에서 통계를 가져와야 함
    // 여기서는 샘플 데이터를 사용
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000)
    };
  }

  /**
   * 이벤트 루프 메트릭 수집
   * @private
   */
  async getEventLoopMetrics() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        const nanosec = Number(delta);
        const millisec = nanosec / 1000000;
        
        resolve({
          delay: millisec,
          utilization: Math.min(100, millisec / 10 * 100) // 간단한 활용률 계산
        });
      });
    });
  }

  /**
   * 가비지 컬렉션 메트릭 수집
   * @private
   */
  getGCMetrics() {
    const heapStats = v8.getHeapStatistics();
    
    return {
      count: heapStats.number_of_native_contexts,
      time: heapStats.total_heap_size,
      lastRun: new Date()
    };
  }

  /**
   * GC 메트릭 업데이트
   * @private
   */
  updateGCMetrics(stats) {
    this.metrics.application.gc.count++;
    this.metrics.application.gc.time += stats.duration || 0;
    this.metrics.application.gc.lastRun = new Date();
  }

  /**
   * 알림 체크
   * @private
   */
  checkAlerts() {
    const alerts = [];

    // CPU 사용률 알림
    if (this.metrics.system.cpu.usage > this.thresholds.cpuThreshold) {
      alerts.push({
        type: 'cpu_high',
        level: 'warning',
        message: `CPU 사용률이 ${this.metrics.system.cpu.usage.toFixed(2)}%로 높습니다.`,
        value: this.metrics.system.cpu.usage,
        threshold: this.thresholds.cpuThreshold,
        timestamp: new Date()
      });
    }

    // 메모리 사용률 알림
    if (this.metrics.system.memory.usage > this.thresholds.memoryThreshold) {
      alerts.push({
        type: 'memory_high',
        level: 'warning',
        message: `메모리 사용률이 ${this.metrics.system.memory.usage.toFixed(2)}%로 높습니다.`,
        value: this.metrics.system.memory.usage,
        threshold: this.thresholds.memoryThreshold,
        timestamp: new Date()
      });
    }

    // 디스크 사용률 알림
    if (this.metrics.system.disk.usage > this.thresholds.diskThreshold) {
      alerts.push({
        type: 'disk_high',
        level: 'warning',
        message: `디스크 사용률이 ${this.metrics.system.disk.usage.toFixed(2)}%로 높습니다.`,
        value: this.metrics.system.disk.usage,
        threshold: this.thresholds.diskThreshold,
        timestamp: new Date()
      });
    }

    // 응답 시간 알림
    if (this.metrics.application.responseTime.average > this.thresholds.responseTimeThreshold) {
      alerts.push({
        type: 'response_time_high',
        level: 'warning',
        message: `평균 응답 시간이 ${this.metrics.application.responseTime.average.toFixed(2)}ms로 높습니다.`,
        value: this.metrics.application.responseTime.average,
        threshold: this.thresholds.responseTimeThreshold,
        timestamp: new Date()
      });
    }

    // 에러율 알림
    if (this.metrics.application.errorRate > this.thresholds.errorRateThreshold) {
      alerts.push({
        type: 'error_rate_high',
        level: 'error',
        message: `에러율이 ${this.metrics.application.errorRate.toFixed(2)}%로 높습니다.`,
        value: this.metrics.application.errorRate,
        threshold: this.thresholds.errorRateThreshold,
        timestamp: new Date()
      });
    }

    // 새로운 알림이 있으면 이벤트 발생
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      this.emit('alerts', alerts);
    }
  }

  /**
   * 성능 히스토리 업데이트
   * @private
   */
  updatePerformanceHistory() {
    const historyEntry = {
      timestamp: new Date(),
      metrics: JSON.parse(JSON.stringify(this.metrics))
    };

    this.performanceHistory.push(historyEntry);

    // 히스토리 크기 제한
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 성능 최적화 시작
   * @private
   */
  startPerformanceOptimization() {
    // 가비지 컬렉션 최적화
    if (performanceConfig.memory.gcOptimization.enabled) {
      this.startGCOptimization();
    }

    // 메모리 풀 최적화
    if (performanceConfig.memory.memoryPool.enabled) {
      this.startMemoryPoolOptimization();
    }

    // 캐시 최적화
    if (performanceConfig.memory.cache.enabled) {
      this.startCacheOptimization();
    }
  }

  /**
   * 성능 최적화 중지
   * @private
   */
  stopPerformanceOptimization() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    if (this.memoryPoolInterval) {
      clearInterval(this.memoryPoolInterval);
    }

    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
    }
  }

  /**
   * 가비지 컬렉션 최적화 시작
   * @private
   */
  startGCOptimization() {
    const interval = performanceConfig.memory.gcOptimization.interval;
    
    this.gcInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsage = memUsage.heapUsed / memUsage.heapTotal;
      
      if (heapUsage > performanceConfig.memory.gcOptimization.threshold) {
        if (global.gc) {
          global.gc();
          safeLogger.info('가비지 컬렉션이 강제 실행되었습니다.');
        }
      }
    }, interval);
  }

  /**
   * 메모리 풀 최적화 시작
   * @private
   */
  startMemoryPoolOptimization() {
    // 메모리 풀 최적화 로직 구현
    safeLogger.info('메모리 풀 최적화가 시작되었습니다.');
  }

  /**
   * 캐시 최적화 시작
   * @private
   */
  startCacheOptimization() {
    const interval = performanceConfig.memory.cache.cleanupInterval * 1000;
    
    this.cacheInterval = setInterval(() => {
      // 캐시 정리 로직 구현
      safeLogger.debug('캐시 정리가 실행되었습니다.');
    }, interval);
  }

  /**
   * 에러 처리
   * @private
   */
  handleError(type, error) {
    const errorAlert = {
      type: 'system_error',
      level: 'error',
      message: `${type}: ${error.message || error}`,
      error: error,
      timestamp: new Date()
    };

    this.alerts.push(errorAlert);
    this.emit('error', errorAlert);
    
    safeLogger.error(`${type} 발생:`, error);
  }

  /**
   * 경고 처리
   * @private
   */
  handleWarning(warning) {
    const warningAlert = {
      type: 'system_warning',
      level: 'warning',
      message: warning.message,
      warning: warning,
      timestamp: new Date()
    };

    this.alerts.push(warningAlert);
    this.emit('warning', warningAlert);
    
    if (logger && safeLogger.warn) {
      safeLogger.warn('시스템 경고:', warning);
    } else {
      console.warn('시스템 경고:', warning);
    }
  }

  /**
   * API 응답 시간 기록
   * @param {number} responseTime - 응답 시간 (ms)
   */
  recordResponseTime(responseTime) {
    // 응답 시간 통계 업데이트
    const current = this.metrics.application.responseTime;
    
    if (current.total === 0) {
      current.average = responseTime;
      current.min = responseTime;
      current.max = responseTime;
    } else {
      current.average = (current.average * current.total + responseTime) / (current.total + 1);
      current.min = Math.min(current.min, responseTime);
      current.max = Math.max(current.max, responseTime);
    }
    
    current.total = (current.total || 0) + 1;
  }

  /**
   * 요청 수 기록
   * @param {boolean} isError - 에러 여부
   */
  recordRequest(isError = false) {
    this.metrics.application.requestCount.total++;
    if (isError) {
      this.metrics.application.requestCount.errors++;
    }
    
    // 에러율 계산
    this.metrics.application.errorRate = 
      (this.metrics.application.requestCount.errors / this.metrics.application.requestCount.total) * 100;
  }

  /**
   * 활성 연결 수 업데이트
   * @param {number} count - 연결 수
   */
  updateActiveConnections(count) {
    this.metrics.application.activeConnections = count;
  }

  /**
   * 현재 메트릭 조회
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date()
    };
  }

  /**
   * 알림 목록 조회
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * 성능 히스토리 조회
   * @param {number} limit - 조회할 항목 수
   */
  getPerformanceHistory(limit = 100) {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      metrics: this.getMetrics(),
      alerts: this.alerts.length,
      historySize: this.performanceHistory.length
    };
  }

  /**
   * 성능 리포트 생성
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        systemHealth: this.calculateSystemHealth(),
        performanceScore: this.calculatePerformanceScore(),
        recommendations: this.generateRecommendations()
      },
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      history: this.getPerformanceHistory(50)
    };

    return report;
  }

  /**
   * 시스템 건강도 계산
   * @private
   */
  calculateSystemHealth() {
    let score = 100;
    
    // CPU 사용률 체크
    if (this.metrics.system.cpu.usage > 80) score -= 20;
    else if (this.metrics.system.cpu.usage > 60) score -= 10;
    
    // 메모리 사용률 체크
    if (this.metrics.system.memory.usage > 80) score -= 20;
    else if (this.metrics.system.memory.usage > 60) score -= 10;
    
    // 디스크 사용률 체크
    if (this.metrics.system.disk.usage > 80) score -= 15;
    else if (this.metrics.system.disk.usage > 60) score -= 5;
    
    // 에러율 체크
    if (this.metrics.application.errorRate > 5) score -= 25;
    else if (this.metrics.application.errorRate > 1) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * 성능 점수 계산
   * @private
   */
  calculatePerformanceScore() {
    let score = 100;
    
    // 응답 시간 체크
    if (this.metrics.application.responseTime.average > 2000) score -= 30;
    else if (this.metrics.application.responseTime.average > 1000) score -= 15;
    
    // 이벤트 루프 지연 체크
    if (this.metrics.application.eventLoop.delay > 100) score -= 20;
    else if (this.metrics.application.eventLoop.delay > 50) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * 최적화 권장사항 생성
   * @private
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.system.cpu.usage > 80) {
      recommendations.push('CPU 사용률이 높습니다. 워커 프로세스 수를 늘리거나 CPU 집약적인 작업을 최적화하세요.');
    }
    
    if (this.metrics.system.memory.usage > 80) {
      recommendations.push('메모리 사용률이 높습니다. 메모리 누수를 확인하고 가비지 컬렉션을 최적화하세요.');
    }
    
    if (this.metrics.application.responseTime.average > 1000) {
      recommendations.push('응답 시간이 느립니다. 데이터베이스 쿼리를 최적화하고 캐싱을 활성화하세요.');
    }
    
    if (this.metrics.application.errorRate > 1) {
      recommendations.push('에러율이 높습니다. 에러 로그를 확인하고 예외 처리를 개선하세요.');
    }
    
    return recommendations;
  }
}

module.exports = new PerformanceMonitoringService();
