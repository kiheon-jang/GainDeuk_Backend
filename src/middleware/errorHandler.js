const logger = require('../utils/logger');

// 전역 에러 핸들러 미들웨어
const errorHandler = (err, req, res, next) => {
  // 기본 에러 정보
  const error = {
    success: false,
    error: '서버 오류가 발생했습니다',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // 개발 환경에서는 상세 에러 정보 포함
  if (process.env.NODE_ENV === 'development') {
    error.details = err.message;
    error.stack = err.stack;
  }

  // 에러 타입별 처리
  if (err.name === 'ValidationError') {
    // Mongoose 검증 에러
    error.error = '데이터 검증 오류';
    error.details = Object.values(err.errors).map(e => e.message);
    res.status(400);
  } else if (err.name === 'CastError') {
    // Mongoose 캐스트 에러 (잘못된 ID 형식 등)
    error.error = '잘못된 데이터 형식';
    error.details = `Invalid ${err.path}: ${err.value}`;
    res.status(400);
  } else if (err.name === 'MongoError' && err.code === 11000) {
    // MongoDB 중복 키 에러
    error.error = '중복된 데이터';
    error.details = '이미 존재하는 데이터입니다';
    res.status(409);
  } else if (err.name === 'JsonWebTokenError') {
    // JWT 에러
    error.error = '인증 토큰 오류';
    error.details = '유효하지 않은 토큰입니다';
    res.status(401);
  } else if (err.name === 'TokenExpiredError') {
    // JWT 만료 에러
    error.error = '토큰 만료';
    error.details = '토큰이 만료되었습니다';
    res.status(401);
  } else if (err.status) {
    // 커스텀 HTTP 상태 코드가 있는 에러
    res.status(err.status);
    error.error = err.message || error.error;
  } else {
    // 기타 서버 에러
    res.status(500);
  }

  // 에러 로깅
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // 에러 응답
  res.json(error);
};

// 404 핸들러
const notFoundHandler = (req, res) => {
  const error = {
    success: false,
    error: '요청한 리소스를 찾을 수 없습니다',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  logger.warning('404 Not Found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json(error);
};

// 비동기 에러 래퍼
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 프로세스 에러 핸들러
const processErrorHandler = () => {
  // 처리되지 않은 Promise 거부
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise
    });
  });

  // 처리되지 않은 예외
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });
    
    // 서버 종료
    process.exit(1);
  });

  // 경고 이벤트
  process.on('warning', (warning) => {
    logger.warning('Process Warning:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  processErrorHandler
};
