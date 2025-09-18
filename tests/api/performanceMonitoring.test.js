const request = require('supertest');
const app = require('../../src/app');

describe('Performance Monitoring API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const PerformanceMonitoringService = require('../../src/services/PerformanceMonitoringService');
    PerformanceMonitoringService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const PerformanceMonitoringService = require('../../src/services/PerformanceMonitoringService');
    PerformanceMonitoringService.stopService();
  });

  describe('GET /api/performance-monitoring/status', () => {
    it('성능 모니터링 서비스 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('historySize');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.alerts).toBe('number');
      expect(typeof response.body.data.historySize).toBe('number');
    });
  });

  describe('POST /api/performance-monitoring/start', () => {
    it('성능 모니터링 서비스를 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 서비스를 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/performance-monitoring/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/performance-monitoring/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/performance-monitoring/stop', () => {
    it('성능 모니터링 서비스를 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/performance-monitoring/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/performance-monitoring/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 서비스를 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/performance-monitoring/metrics', () => {
    it('성능 메트릭을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('application');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('timestamp');
      
      // 시스템 메트릭 확인
      expect(response.body.data.system).toHaveProperty('cpu');
      expect(response.body.data.system).toHaveProperty('memory');
      expect(response.body.data.system).toHaveProperty('disk');
      expect(response.body.data.system).toHaveProperty('network');
      
      // 애플리케이션 메트릭 확인
      expect(response.body.data.application).toHaveProperty('responseTime');
      expect(response.body.data.application).toHaveProperty('requestCount');
      expect(response.body.data.application).toHaveProperty('errorRate');
      expect(response.body.data.application).toHaveProperty('activeConnections');
      expect(response.body.data.application).toHaveProperty('memoryUsage');
      expect(response.body.data.application).toHaveProperty('eventLoop');
      expect(response.body.data.application).toHaveProperty('gc');
      
      // 데이터베이스 메트릭 확인
      expect(response.body.data.database).toHaveProperty('connections');
      expect(response.body.data.database).toHaveProperty('queries');
      expect(response.body.data.database).toHaveProperty('responseTime');
    });
  });

  describe('GET /api/performance-monitoring/alerts', () => {
    it('성능 알림 목록을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/performance-monitoring/history', () => {
    it('성능 히스토리를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('히스토리 크기 제한을 지정할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/history')
        .query({ limit: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });
  });

  describe('GET /api/performance-monitoring/report', () => {
    it('성능 리포트를 생성해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/report')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('history');
      
      // 요약 정보 확인
      expect(response.body.data.summary).toHaveProperty('systemHealth');
      expect(response.body.data.summary).toHaveProperty('performanceScore');
      expect(response.body.data.summary).toHaveProperty('recommendations');
      
      expect(typeof response.body.data.summary.systemHealth).toBe('number');
      expect(typeof response.body.data.summary.performanceScore).toBe('number');
      expect(Array.isArray(response.body.data.summary.recommendations)).toBe(true);
    });
  });

  describe('POST /api/performance-monitoring/record-response-time', () => {
    it('응답 시간을 기록해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-response-time')
        .send({
          responseTime: 150
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('기록되었습니다');
    });

    it('responseTime 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-response-time')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('responseTime은 0 이상의 숫자여야 합니다');
    });

    it('음수 responseTime으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-response-time')
        .send({
          responseTime: -100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('responseTime은 0 이상의 숫자여야 합니다');
    });

    it('문자열 responseTime으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-response-time')
        .send({
          responseTime: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('responseTime은 0 이상의 숫자여야 합니다');
    });
  });

  describe('POST /api/performance-monitoring/record-request', () => {
    it('정상 요청을 기록해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-request')
        .send({
          isError: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('기록되었습니다');
    });

    it('에러 요청을 기록해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-request')
        .send({
          isError: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('기록되었습니다');
    });

    it('isError 없이 요청해도 기본값으로 처리해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/record-request')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('기록되었습니다');
    });
  });

  describe('POST /api/performance-monitoring/update-connections', () => {
    it('연결 수를 업데이트해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/update-connections')
        .send({
          count: 25
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('업데이트되었습니다');
    });

    it('count 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/update-connections')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('count는 0 이상의 숫자여야 합니다');
    });

    it('음수 count로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/update-connections')
        .send({
          count: -5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('count는 0 이상의 숫자여야 합니다');
    });

    it('문자열 count로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/performance-monitoring/update-connections')
        .send({
          count: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('count는 0 이상의 숫자여야 합니다');
    });
  });

  describe('GET /api/performance-monitoring/health', () => {
    it('헬스 체크를 수행해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('systemHealth');
      expect(response.body.data).toHaveProperty('performanceScore');
      expect(response.body.data).toHaveProperty('lastCheck');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.systemHealth).toBe('number');
      expect(typeof response.body.data.performanceScore).toBe('number');
    });

    it('서비스가 중지된 상태에서도 헬스 체크가 가능해야 함', async () => {
      const response = await request(app)
        .get('/api/performance-monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.isRunning).toBe(false);
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let response = await request(app)
        .get('/api/performance-monitoring/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 서비스 시작
      response = await request(app)
        .post('/api/performance-monitoring/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/performance-monitoring/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 메트릭 조회
      response = await request(app)
        .get('/api/performance-monitoring/metrics')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.system).toBeDefined();
      expect(response.body.data.application).toBeDefined();
      expect(response.body.data.database).toBeDefined();

      // 5. 응답 시간 기록
      response = await request(app)
        .post('/api/performance-monitoring/record-response-time')
        .send({
          responseTime: 150
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 6. 요청 수 기록
      response = await request(app)
        .post('/api/performance-monitoring/record-request')
        .send({
          isError: false
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 7. 연결 수 업데이트
      response = await request(app)
        .post('/api/performance-monitoring/update-connections')
        .send({
          count: 10
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 8. 알림 조회
      response = await request(app)
        .get('/api/performance-monitoring/alerts')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 9. 히스토리 조회
      response = await request(app)
        .get('/api/performance-monitoring/history')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 10. 리포트 생성
      response = await request(app)
        .get('/api/performance-monitoring/report')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.systemHealth).toBeDefined();
      expect(response.body.data.summary.performanceScore).toBeDefined();

      // 11. 헬스 체크
      response = await request(app)
        .get('/api/performance-monitoring/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();

      // 12. 서비스 중지
      response = await request(app)
        .post('/api/performance-monitoring/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 13. 최종 상태 확인
      response = await request(app)
        .get('/api/performance-monitoring/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
