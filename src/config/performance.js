/**
 * 성능 최적화 설정
 * 시스템 성능을 향상시키기 위한 다양한 설정값들
 */

const performanceConfig = {
  // 메모리 최적화 설정
  memory: {
    // 가비지 컬렉션 최적화
    gcOptimization: {
      enabled: true,
      // 메모리 사용량이 80% 이상일 때 GC 강제 실행
      threshold: 0.8,
      // GC 실행 간격 (ms)
      interval: 30000
    },
    
    // 메모리 풀 설정
    memoryPool: {
      enabled: true,
      // 객체 풀 크기
      poolSize: 1000,
      // 풀에서 객체를 가져올 때의 타임아웃 (ms)
      timeout: 5000
    },
    
    // 캐시 설정
    cache: {
      // 메모리 캐시 최대 크기 (MB)
      maxSize: 100,
      // 캐시 TTL (초)
      ttl: 300,
      // 캐시 정리 간격 (초)
      cleanupInterval: 60
    }
  },

  // 데이터베이스 최적화 설정
  database: {
    // 연결 풀 설정
    connectionPool: {
      // 최대 연결 수
      maxConnections: 20,
      // 최소 연결 수
      minConnections: 5,
      // 연결 타임아웃 (ms)
      connectionTimeout: 30000,
      // 연결 유지 시간 (ms)
      keepAlive: 300000
    },
    
    // 쿼리 최적화
    queryOptimization: {
      // 쿼리 타임아웃 (ms)
      timeout: 10000,
      // 쿼리 캐시 활성화
      cacheEnabled: true,
      // 쿼리 캐시 TTL (초)
      cacheTtl: 60,
      // 슬로우 쿼리 로깅 (ms)
      slowQueryThreshold: 1000
    },
    
    // 인덱스 최적화
    indexing: {
      // 자동 인덱스 생성
      autoIndex: true,
      // 인덱스 통계 수집
      collectStats: true,
      // 인덱스 통계 수집 간격 (초)
      statsInterval: 3600
    }
  },

  // API 최적화 설정
  api: {
    // 응답 압축
    compression: {
      enabled: true,
      // 압축 레벨 (1-9)
      level: 6,
      // 압축 최소 크기 (bytes)
      threshold: 1024
    },
    
    // 요청 제한
    rateLimiting: {
      enabled: true,
      // 윈도우 크기 (ms)
      windowMs: 60000,
      // 최대 요청 수
      maxRequests: 100,
      // IP별 제한
      perIp: true,
      // 사용자별 제한
      perUser: true
    },
    
    // 응답 캐싱
    responseCaching: {
      enabled: true,
      // 캐시 TTL (초)
      ttl: 300,
      // 캐시 키 생성 함수
      keyGenerator: (req) => `${req.method}:${req.originalUrl}`,
      // 캐시 조건
      condition: (req, res) => res.statusCode === 200
    },
    
    // 요청 크기 제한
    requestSizeLimit: {
      // JSON 요청 최대 크기 (MB)
      json: 10,
      // URL 인코딩 요청 최대 크기 (MB)
      urlencoded: 10,
      // 멀티파트 요청 최대 크기 (MB)
      multipart: 50
    }
  },

  // 실시간 처리 최적화
  realtime: {
    // 이벤트 루프 최적화
    eventLoop: {
      // 이벤트 루프 모니터링
      monitoring: true,
      // 이벤트 루프 지연 임계값 (ms)
      delayThreshold: 100,
      // 이벤트 루프 지연 알림
      alertOnDelay: true
    },
    
    // 비동기 처리 최적화
    asyncProcessing: {
      // 워커 스레드 사용
      useWorkerThreads: true,
      // 워커 스레드 수
      workerThreads: 4,
      // 작업 큐 크기
      queueSize: 1000,
      // 작업 타임아웃 (ms)
      taskTimeout: 30000
    },
    
    // 스트리밍 최적화
    streaming: {
      // 스트림 버퍼 크기
      bufferSize: 65536,
      // 스트림 압축
      compression: true,
      // 스트림 백프레셔
      backpressure: true
    }
  },

  // 로깅 최적화
  logging: {
    // 로그 레벨
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    // 로그 압축
    compression: true,
    // 로그 로테이션
    rotation: {
      enabled: true,
      // 로그 파일 최대 크기 (MB)
      maxSize: 100,
      // 보관할 로그 파일 수
      maxFiles: 10,
      // 로그 압축
      compress: true
    },
    
    // 성능 로깅
    performance: {
      enabled: true,
      // 응답 시간 로깅 임계값 (ms)
      responseTimeThreshold: 1000,
      // 메모리 사용량 로깅 임계값 (MB)
      memoryThreshold: 500,
      // CPU 사용량 로깅 임계값 (%)
      cpuThreshold: 80
    }
  },

  // 모니터링 설정
  monitoring: {
    // 시스템 메트릭 수집
    systemMetrics: {
      enabled: true,
      // 메트릭 수집 간격 (초)
      interval: 30,
      // 수집할 메트릭
      metrics: [
        'cpu',
        'memory',
        'disk',
        'network',
        'eventLoop',
        'gc'
      ]
    },
    
    // 애플리케이션 메트릭
    applicationMetrics: {
      enabled: true,
      // API 응답 시간
      responseTime: true,
      // 요청 수
      requestCount: true,
      // 에러율
      errorRate: true,
      // 활성 연결 수
      activeConnections: true
    },
    
    // 알림 설정
    alerts: {
      enabled: true,
      // CPU 사용률 알림 임계값 (%)
      cpuThreshold: 90,
      // 메모리 사용률 알림 임계값 (%)
      memoryThreshold: 90,
      // 디스크 사용률 알림 임계값 (%)
      diskThreshold: 90,
      // 응답 시간 알림 임계값 (ms)
      responseTimeThreshold: 5000,
      // 에러율 알림 임계값 (%)
      errorRateThreshold: 5
    }
  },

  // 캐싱 전략
  caching: {
    // Redis 캐시 설정
    redis: {
      enabled: true,
      // Redis 서버 설정
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      // 연결 풀 설정
      pool: {
        min: 2,
        max: 10
      },
      // 캐시 TTL (초)
      ttl: 3600
    },
    
    // 메모리 캐시 설정
    memory: {
      enabled: true,
      // 최대 캐시 크기 (MB)
      maxSize: 100,
      // 캐시 TTL (초)
      ttl: 300,
      // LRU 정책 사용
      lru: true
    },
    
    // 캐시 전략
    strategy: {
      // 캐시 우선순위
      priority: ['memory', 'redis'],
      // 캐시 무효화
      invalidation: {
        enabled: true,
        // 자동 무효화
        auto: true,
        // 수동 무효화
        manual: true
      }
    }
  },

  // 보안 최적화
  security: {
    // HTTPS 설정
    https: {
      enabled: process.env.NODE_ENV === 'production',
      // SSL 인증서 경로
      certPath: process.env.SSL_CERT_PATH,
      // SSL 키 경로
      keyPath: process.env.SSL_KEY_PATH
    },
    
    // CORS 설정
    cors: {
      enabled: true,
      // 허용된 오리진
      origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      // 허용된 메서드
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      // 허용된 헤더
      headers: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    // 보안 헤더
    securityHeaders: {
      enabled: true,
      // HSTS
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      },
      // X-Frame-Options
      frameOptions: 'DENY',
      // X-Content-Type-Options
      contentTypeOptions: 'nosniff',
      // X-XSS-Protection
      xssProtection: '1; mode=block'
    }
  },

  // 개발 환경 최적화
  development: {
    // 핫 리로드
    hotReload: {
      enabled: process.env.NODE_ENV === 'development',
      // 감시할 파일 확장자
      watchExtensions: ['.js', '.json'],
      // 감시 제외 디렉토리
      ignorePaths: ['node_modules', '.git', 'logs']
    },
    
    // 디버깅
    debugging: {
      enabled: process.env.NODE_ENV === 'development',
      // 디버그 포트
      port: 9229,
      // 디버그 브레이크포인트
      breakpoints: true
    }
  },

  // 프로덕션 최적화
  production: {
    // 클러스터링
    clustering: {
      enabled: true,
      // 워커 프로세스 수
      workers: require('os').cpus().length,
      // 워커 프로세스 재시작
      restartOnCrash: true,
      // 워커 프로세스 재시작 지연 (ms)
      restartDelay: 1000
    },
    
    // 압축
    compression: {
      enabled: true,
      // gzip 압축
      gzip: true,
      // brotli 압축
      brotli: true,
      // 압축 레벨
      level: 6
    },
    
    // 정적 파일 서빙
    staticFiles: {
      enabled: true,
      // 정적 파일 경로
      path: './public',
      // 캐시 헤더
      cacheControl: 'public, max-age=31536000',
      // 압축
      compression: true
    }
  }
};

module.exports = performanceConfig;
