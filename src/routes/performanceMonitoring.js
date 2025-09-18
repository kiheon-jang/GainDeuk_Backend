const express = require('express');
const PerformanceMonitoringService = require('../services/PerformanceMonitoringService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/performance-monitoring:
 *   get:
 *     summary: 성능 모니터링 서비스 개요
 *     description: 시스템 성능 모니터링 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 성능 모니터링 서비스 개요 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                       example: "performance-monitoring"
 *                     description:
 *                       type: string
 *                       example: "시스템 성능 모니터링 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/metrics", "/health", "/alerts", "/reports", "/dashboard"]
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T07:37:48.372Z"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "maintenance"]
 *                       example: "active"
 */

// 루트 엔드포인트 - 성능 모니터링 서비스 개요
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        module: 'performance-monitoring',
        description: '시스템 성능 모니터링 서비스',
        availableEndpoints: [
          '/metrics',
          '/health',
          '/alerts',
          '/reports',
          '/dashboard'
        ],
        lastUpdate: new Date().toISOString(),
        status: 'active'
      }
    });

  } catch (error) {
    logger.error('성능 모니터링 서비스 개요 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     PerformanceMetrics:
 *       type: object
 *       properties:
 *         system:
 *           type: object
 *           properties:
 *             cpu:
 *               type: object
 *               properties:
 *                 usage:
 *                   type: number
 *                   description: CPU 사용률 (%)
 *                 loadAverage:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: 로드 평균
 *             memory:
 *               type: object
 *               properties:
 *                 used:
 *                   type: number
 *                   description: 사용된 메모리 (bytes)
 *                 free:
 *                   type: number
 *                   description: 사용 가능한 메모리 (bytes)
 *                 total:
 *                   type: number
 *                   description: 총 메모리 (bytes)
 *                 usage:
 *                   type: number
 *                   description: 메모리 사용률 (%)
 *             disk:
 *               type: object
 *               properties:
 *                 used:
 *                   type: number
 *                   description: 사용된 디스크 공간 (bytes)
 *                 free:
 *                   type: number
 *                   description: 사용 가능한 디스크 공간 (bytes)
 *                 total:
 *                   type: number
 *                   description: 총 디스크 공간 (bytes)
 *                 usage:
 *                   type: number
 *                   description: 디스크 사용률 (%)
 *             network:
 *               type: object
 *               properties:
 *                 bytesIn:
 *                   type: number
 *                   description: 수신 바이트 수
 *                 bytesOut:
 *                   type: number
 *                   description: 송신 바이트 수
 *                 packetsIn:
 *                   type: number
 *                   description: 수신 패킷 수
 *                 packetsOut:
 *                   type: number
 *                   description: 송신 패킷 수
 *         application:
 *           type: object
 *           properties:
 *             responseTime:
 *               type: object
 *               properties:
 *                 average:
 *                   type: number
 *                   description: 평균 응답 시간 (ms)
 *                 min:
 *                   type: number
 *                   description: 최소 응답 시간 (ms)
 *                 max:
 *                   type: number
 *                   description: 최대 응답 시간 (ms)
 *                 p95:
 *                   type: number
 *                   description: 95th percentile 응답 시간 (ms)
 *                 p99:
 *                   type: number
 *                   description: 99th percentile 응답 시간 (ms)
 *             requestCount:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: 총 요청 수
 *                 perSecond:
 *                   type: number
 *                   description: 초당 요청 수
 *                 errors:
 *                   type: number
 *                   description: 에러 요청 수
 *             errorRate:
 *               type: number
 *               description: 에러율 (%)
 *             activeConnections:
 *               type: number
 *               description: 활성 연결 수
 *             memoryUsage:
 *               type: object
 *               properties:
 *                 heapUsed:
 *                   type: number
 *                   description: 힙 사용량 (bytes)
 *                 heapTotal:
 *                   type: number
 *                   description: 총 힙 크기 (bytes)
 *                 external:
 *                   type: number
 *                   description: 외부 메모리 사용량 (bytes)
 *                 rss:
 *                   type: number
 *                   description: RSS 메모리 사용량 (bytes)
 *             eventLoop:
 *               type: object
 *               properties:
 *                 delay:
 *                   type: number
 *                   description: 이벤트 루프 지연 (ms)
 *                 utilization:
 *                   type: number
 *                   description: 이벤트 루프 활용률 (%)
 *             gc:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: 가비지 컬렉션 횟수
 *                 time:
 *                   type: number
 *                   description: 가비지 컬렉션 시간
 *                 lastRun:
 *                   type: string
 *                   format: date-time
 *                   description: 마지막 GC 실행 시간
 *         database:
 *           type: object
 *           properties:
 *             connections:
 *               type: object
 *               properties:
 *                 active:
 *                   type: number
 *                   description: 활성 연결 수
 *                 idle:
 *                   type: number
 *                   description: 유휴 연결 수
 *                 total:
 *                   type: number
 *                   description: 총 연결 수
 *             queries:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: 총 쿼리 수
 *                 slow:
 *                   type: number
 *                   description: 느린 쿼리 수
 *                 errors:
 *                   type: number
 *                   description: 에러 쿼리 수
 *             responseTime:
 *               type: object
 *               properties:
 *                 average:
 *                   type: number
 *                   description: 평균 응답 시간 (ms)
 *                 min:
 *                   type: number
 *                   description: 최소 응답 시간 (ms)
 *                 max:
 *                   type: number
 *                   description: 최대 응답 시간 (ms)
 *     
 *     PerformanceAlert:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: 알림 타입
 *         level:
 *           type: string
 *           enum: [info, warning, error, critical]
 *           description: 알림 레벨
 *         message:
 *           type: string
 *           description: 알림 메시지
 *         value:
 *           type: number
 *           description: 현재 값
 *         threshold:
 *           type: number
 *           description: 임계값
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 알림 발생 시간
 *     
 *     PerformanceReport:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 리포트 생성 시간
 *         summary:
 *           type: object
 *           properties:
 *             systemHealth:
 *               type: number
 *               description: 시스템 건강도 (0-100)
 *             performanceScore:
 *               type: number
 *               description: 성능 점수 (0-100)
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *               description: 최적화 권장사항
 *         metrics:
 *           $ref: '#/components/schemas/PerformanceMetrics'
 *         alerts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PerformanceAlert'
 *         history:
 *           type: array
 *           description: 성능 히스토리
 */

/**
 * @swagger
 * /api/performance-monitoring/status:
 *   get:
 *     summary: 성능 모니터링 서비스 상태 조회
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 서비스 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       description: 서비스 실행 여부
 *                     metrics:
 *                       $ref: '#/components/schemas/PerformanceMetrics'
 *                     alerts:
 *                       type: number
 *                       description: 알림 수
 *                     historySize:
 *                       type: number
 *                       description: 히스토리 크기
 */
router.get('/status', async (req, res) => {
  try {
    const status = PerformanceMonitoringService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('성능 모니터링 서비스 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 모니터링 서비스 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/start:
 *   post:
 *     summary: 성능 모니터링 서비스 시작
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 시작됨
 *       409:
 *         description: 서비스가 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await PerformanceMonitoringService.startService();

    res.json({
      success: true,
      message: '성능 모니터링 서비스가 시작되었습니다.'
    });

  } catch (error) {
    logger.error('성능 모니터링 서비스 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '성능 모니터링 서비스가 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '성능 모니터링 서비스 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/stop:
 *   post:
 *     summary: 성능 모니터링 서비스 중지
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 중지됨
 */
router.post('/stop', async (req, res) => {
  try {
    PerformanceMonitoringService.stopService();

    res.json({
      success: true,
      message: '성능 모니터링 서비스가 중지되었습니다.'
    });

  } catch (error) {
    logger.error('성능 모니터링 서비스 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 모니터링 서비스 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/metrics:
 *   get:
 *     summary: 현재 성능 메트릭 조회
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 성능 메트릭 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceMetrics'
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = PerformanceMonitoringService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('성능 메트릭 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 메트릭 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/alerts:
 *   get:
 *     summary: 성능 알림 목록 조회
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 성능 알림 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PerformanceAlert'
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = PerformanceMonitoringService.getAlerts();

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    logger.error('성능 알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 알림 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/history:
 *   get:
 *     summary: 성능 히스토리 조회
 *     tags: [Performance Monitoring]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 조회할 항목 수
 *     responses:
 *       200:
 *         description: 성능 히스토리
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   description: 성능 히스토리 배열
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const history = PerformanceMonitoringService.getPerformanceHistory(limit);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('성능 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 히스토리 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/report:
 *   get:
 *     summary: 성능 리포트 생성
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 성능 리포트
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceReport'
 */
router.get('/report', async (req, res) => {
  try {
    const report = PerformanceMonitoringService.generatePerformanceReport();

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('성능 리포트 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '성능 리포트 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/record-response-time:
 *   post:
 *     summary: API 응답 시간 기록
 *     tags: [Performance Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responseTime
 *             properties:
 *               responseTime:
 *                 type: number
 *                 description: 응답 시간 (ms)
 *     responses:
 *       200:
 *         description: 응답 시간이 성공적으로 기록됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/record-response-time', async (req, res) => {
  try {
    const { responseTime } = req.body;

    if (typeof responseTime !== 'number' || responseTime < 0) {
      return res.status(400).json({
        success: false,
        message: 'responseTime은 0 이상의 숫자여야 합니다.'
      });
    }

    PerformanceMonitoringService.recordResponseTime(responseTime);

    res.json({
      success: true,
      message: '응답 시간이 기록되었습니다.'
    });

  } catch (error) {
    logger.error('응답 시간 기록 실패:', error);
    res.status(500).json({
      success: false,
      message: '응답 시간 기록에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/record-request:
 *   post:
 *     summary: 요청 수 기록
 *     tags: [Performance Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isError:
 *                 type: boolean
 *                 default: false
 *                 description: 에러 여부
 *     responses:
 *       200:
 *         description: 요청 수가 성공적으로 기록됨
 */
router.post('/record-request', async (req, res) => {
  try {
    const { isError = false } = req.body;

    PerformanceMonitoringService.recordRequest(isError);

    res.json({
      success: true,
      message: '요청 수가 기록되었습니다.'
    });

  } catch (error) {
    logger.error('요청 수 기록 실패:', error);
    res.status(500).json({
      success: false,
      message: '요청 수 기록에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/update-connections:
 *   post:
 *     summary: 활성 연결 수 업데이트
 *     tags: [Performance Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - count
 *             properties:
 *               count:
 *                 type: number
 *                 description: 연결 수
 *     responses:
 *       200:
 *         description: 연결 수가 성공적으로 업데이트됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/update-connections', async (req, res) => {
  try {
    const { count } = req.body;

    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({
        success: false,
        message: 'count는 0 이상의 숫자여야 합니다.'
      });
    }

    PerformanceMonitoringService.updateActiveConnections(count);

    res.json({
      success: true,
      message: '연결 수가 업데이트되었습니다.'
    });

  } catch (error) {
    logger.error('연결 수 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '연결 수 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance-monitoring/health:
 *   get:
 *     summary: 성능 모니터링 헬스 체크
 *     tags: [Performance Monitoring]
 *     responses:
 *       200:
 *         description: 헬스 체크 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     isRunning:
 *                       type: boolean
 *                     systemHealth:
 *                       type: number
 *                     performanceScore:
 *                       type: number
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 */
router.get('/health', async (req, res) => {
  try {
    const status = PerformanceMonitoringService.getStatus();
    const report = PerformanceMonitoringService.generatePerformanceReport();
    
    // 헬스 체크 로직
    let healthStatus = 'healthy';
    
    if (!status.isRunning) {
      healthStatus = 'unhealthy';
    } else if (report.summary.systemHealth < 70) {
      healthStatus = 'degraded';
    } else if (report.summary.systemHealth < 50) {
      healthStatus = 'unhealthy';
    }

    res.json({
      success: true,
      data: {
        status: healthStatus,
        isRunning: status.isRunning,
        systemHealth: report.summary.systemHealth,
        performanceScore: report.summary.performanceScore,
        lastCheck: new Date()
      }
    });

  } catch (error) {
    logger.error('헬스 체크 실패:', error);
    res.status(500).json({
      success: false,
      message: '헬스 체크에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
