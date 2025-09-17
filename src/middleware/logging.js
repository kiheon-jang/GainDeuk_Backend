const logger = require('../utils/logger');

/**
 * 요청 로깅 미들웨어
 * HTTP 요청의 상세 정보를 로깅합니다.
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 요청 정보 로깅
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });

  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // 응답 정보 로깅
    logger.apiRequest(req, res, duration);
    
    // 에러 상태 코드별 추가 로깅
    if (statusCode >= 400) {
      logger.warning('HTTP Error Response', {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });
    }
  });

  next();
};

/**
 * 에러 로깅 미들웨어
 * 애플리케이션 에러를 상세히 로깅합니다.
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    },
    timestamp: new Date().toISOString()
  });

  next(err);
};

/**
 * 데이터베이스 작업 로깅 미들웨어
 * MongoDB 작업을 로깅합니다.
 */
const dbLogger = (operation, collection, duration, success = true) => {
  logger.dbOperation(operation, collection, duration, success);
};

/**
 * 외부 API 호출 로깅 미들웨어
 * 외부 API 호출을 로깅합니다.
 */
const apiCallLogger = (service, endpoint, duration, success = true, statusCode = null) => {
  logger.apiCall(service, endpoint, duration, success, statusCode);
};

/**
 * 스케줄러 작업 로깅 미들웨어
 * 스케줄러 작업을 로깅합니다.
 */
const schedulerLogger = (task, status, duration = null, meta = {}) => {
  logger.scheduler(task, status, duration, meta);
};

/**
 * 보안 이벤트 로깅 미들웨어
 * 보안 관련 이벤트를 로깅합니다.
 */
const securityLogger = (event, details = {}) => {
  logger.warning('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
    severity: 'medium'
  });
};

/**
 * 성능 메트릭 로깅 미들웨어
 * 성능 관련 메트릭을 로깅합니다.
 */
const performanceLogger = (metric, value, unit = 'ms') => {
  logger.info('Performance Metric', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString()
  });
};

/**
 * 비즈니스 로직 로깅 미들웨어
 * 비즈니스 로직 실행을 로깅합니다.
 */
const businessLogger = (action, details = {}) => {
  logger.info('Business Logic', {
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * 캐시 작업 로깅 미들웨어
 * 캐시 작업을 로깅합니다.
 */
const cacheLogger = (operation, key, hit = null, duration = null) => {
  const level = hit === true ? 'info' : hit === false ? 'warning' : 'info';
  
  logger[level]('Cache Operation', {
    operation,
    key,
    hit,
    duration: duration ? `${duration}ms` : undefined,
    timestamp: new Date().toISOString()
  });
};

/**
 * 알림 로깅 미들웨어
 * 알림 관련 이벤트를 로깅합니다.
 */
const alertLogger = (type, details = {}) => {
  logger.info('Alert Event', {
    type,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * 신호 분석 로깅 미들웨어
 * 신호 분석 과정을 로깅합니다.
 */
const signalLogger = (coinSymbol, score, details = {}) => {
  logger.info('Signal Analysis', {
    coinSymbol,
    score,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * 데이터 수집 로깅 미들웨어
 * 데이터 수집 과정을 로깅합니다.
 */
const dataCollectionLogger = (source, count, duration = null) => {
  logger.info('Data Collection', {
    source,
    count,
    duration: duration ? `${duration}ms` : undefined,
    timestamp: new Date().toISOString()
  });
};

/**
 * 시스템 상태 로깅 미들웨어
 * 시스템 상태를 로깅합니다.
 */
const systemStatusLogger = (component, status, details = {}) => {
  const level = status === 'healthy' ? 'info' : 'warning';
  
  logger[level]('System Status', {
    component,
    status,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * 사용자 활동 로깅 미들웨어
 * 사용자 활동을 로깅합니다.
 */
const userActivityLogger = (userId, action, details = {}) => {
  logger.info('User Activity', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * API 사용량 로깅 미들웨어
 * API 사용량을 로깅합니다.
 */
const apiUsageLogger = (endpoint, count, limit) => {
  const percentage = Math.round((count / limit) * 100);
  const level = percentage >= 90 ? 'warning' : 'info';
  
  logger[level]('API Usage', {
    endpoint,
    count,
    limit,
    percentage: `${percentage}%`,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  requestLogger,
  errorLogger,
  dbLogger,
  apiCallLogger,
  schedulerLogger,
  securityLogger,
  performanceLogger,
  businessLogger,
  cacheLogger,
  alertLogger,
  signalLogger,
  dataCollectionLogger,
  systemStatusLogger,
  userActivityLogger,
  apiUsageLogger
};
