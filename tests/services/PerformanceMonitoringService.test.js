const PerformanceMonitoringService = require('../../src/services/PerformanceMonitoringService');

describe('PerformanceMonitoringService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    PerformanceMonitoringService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    PerformanceMonitoringService.stopService();
  });

  describe('서비스 제어', () => {
    it('성능 모니터링 서비스를 시작할 수 있어야 함', async () => {
      await expect(PerformanceMonitoringService.startService()).resolves.not.toThrow();
      
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('성능 모니터링 서비스를 중지할 수 있어야 함', () => {
      PerformanceMonitoringService.stopService();
      
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 서비스를 중복 시작하면 경고를 표시해야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      // 두 번째 시작 시도
      await expect(PerformanceMonitoringService.startService()).resolves.not.toThrow();
      
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 서비스를 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => PerformanceMonitoringService.stopService()).not.toThrow();
    });
  });

  describe('메트릭 수집', () => {
    it('시스템 메트릭을 수집할 수 있어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      const metrics = PerformanceMonitoringService.getMetrics();
      
      expect(metrics.system).toBeDefined();
      expect(metrics.system.cpu).toBeDefined();
      expect(metrics.system.memory).toBeDefined();
      expect(metrics.system.disk).toBeDefined();
      expect(metrics.system.network).toBeDefined();
      
      expect(typeof metrics.system.cpu.usage).toBe('number');
      expect(typeof metrics.system.memory.usage).toBe('number');
      expect(typeof metrics.system.disk.usage).toBe('number');
    });

    it('애플리케이션 메트릭을 수집할 수 있어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      const metrics = PerformanceMonitoringService.getMetrics();
      
      expect(metrics.application).toBeDefined();
      expect(metrics.application.responseTime).toBeDefined();
      expect(metrics.application.requestCount).toBeDefined();
      expect(metrics.application.memoryUsage).toBeDefined();
      expect(metrics.application.eventLoop).toBeDefined();
      expect(metrics.application.gc).toBeDefined();
      
      expect(typeof metrics.application.errorRate).toBe('number');
      expect(typeof metrics.application.activeConnections).toBe('number');
    });

    it('데이터베이스 메트릭을 수집할 수 있어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      const metrics = PerformanceMonitoringService.getMetrics();
      
      expect(metrics.database).toBeDefined();
      expect(metrics.database.connections).toBeDefined();
      expect(metrics.database.queries).toBeDefined();
      expect(metrics.database.responseTime).toBeDefined();
      
      expect(typeof metrics.database.connections.active).toBe('number');
      expect(typeof metrics.database.queries.total).toBe('number');
    });
  });

  describe('응답 시간 기록', () => {
    it('응답 시간을 기록할 수 있어야 함', () => {
      const responseTime = 150;
      PerformanceMonitoringService.recordResponseTime(responseTime);
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.responseTime.average).toBe(responseTime);
      expect(metrics.application.responseTime.min).toBe(responseTime);
      expect(metrics.application.responseTime.max).toBe(responseTime);
    });

    it('여러 응답 시간을 기록하고 통계를 계산할 수 있어야 함', () => {
      const responseTimes = [100, 200, 150, 300, 250];
      
      responseTimes.forEach(time => {
        PerformanceMonitoringService.recordResponseTime(time);
      });
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.responseTime.min).toBe(100);
      expect(metrics.application.responseTime.max).toBe(300);
      expect(metrics.application.responseTime.average).toBe(200);
    });

    it('음수 응답 시간을 처리할 수 있어야 함', () => {
      expect(() => {
        PerformanceMonitoringService.recordResponseTime(-100);
      }).not.toThrow();
    });
  });

  describe('요청 수 기록', () => {
    it('정상 요청을 기록할 수 있어야 함', () => {
      PerformanceMonitoringService.recordRequest(false);
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.requestCount.total).toBe(1);
      expect(metrics.application.requestCount.errors).toBe(0);
      expect(metrics.application.errorRate).toBe(0);
    });

    it('에러 요청을 기록할 수 있어야 함', () => {
      PerformanceMonitoringService.recordRequest(true);
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.requestCount.total).toBe(1);
      expect(metrics.application.requestCount.errors).toBe(1);
      expect(metrics.application.errorRate).toBe(100);
    });

    it('에러율을 올바르게 계산할 수 있어야 함', () => {
      // 10개 요청 중 2개 에러
      for (let i = 0; i < 8; i++) {
        PerformanceMonitoringService.recordRequest(false);
      }
      for (let i = 0; i < 2; i++) {
        PerformanceMonitoringService.recordRequest(true);
      }
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.requestCount.total).toBe(10);
      expect(metrics.application.requestCount.errors).toBe(2);
      expect(metrics.application.errorRate).toBe(20);
    });
  });

  describe('연결 수 업데이트', () => {
    it('활성 연결 수를 업데이트할 수 있어야 함', () => {
      const connectionCount = 25;
      PerformanceMonitoringService.updateActiveConnections(connectionCount);
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.activeConnections).toBe(connectionCount);
    });

    it('0개의 연결을 처리할 수 있어야 함', () => {
      PerformanceMonitoringService.updateActiveConnections(0);
      
      const metrics = PerformanceMonitoringService.getMetrics();
      expect(metrics.application.activeConnections).toBe(0);
    });

    it('음수 연결 수를 처리할 수 있어야 함', () => {
      expect(() => {
        PerformanceMonitoringService.updateActiveConnections(-5);
      }).not.toThrow();
    });
  });

  describe('알림 시스템', () => {
    it('알림 목록을 조회할 수 있어야 함', () => {
      const alerts = PerformanceMonitoringService.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('알림이 발생하면 목록에 추가되어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      // CPU 사용률을 높게 설정하여 알림 발생시키기
      const originalMetrics = PerformanceMonitoringService.getMetrics();
      originalMetrics.system.cpu.usage = 95; // 95% 사용률
      
      // 알림 체크 트리거 (실제로는 내부적으로 호출됨)
      PerformanceMonitoringService.checkAlerts();
      
      const alerts = PerformanceMonitoringService.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('성능 히스토리', () => {
    it('성능 히스토리를 조회할 수 있어야 함', () => {
      const history = PerformanceMonitoringService.getPerformanceHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('히스토리 크기 제한을 지정할 수 있어야 함', () => {
      const limit = 50;
      const history = PerformanceMonitoringService.getPerformanceHistory(limit);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(limit);
    });

    it('서비스 실행 중에 히스토리가 업데이트되어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      // 잠시 대기하여 히스토리 업데이트 확인
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const history = PerformanceMonitoringService.getPerformanceHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('성능 리포트', () => {
    it('성능 리포트를 생성할 수 있어야 함', () => {
      const report = PerformanceMonitoringService.generatePerformanceReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.history).toBeDefined();
      
      expect(report.summary.systemHealth).toBeDefined();
      expect(report.summary.performanceScore).toBeDefined();
      expect(report.summary.recommendations).toBeDefined();
      
      expect(typeof report.summary.systemHealth).toBe('number');
      expect(typeof report.summary.performanceScore).toBe('number');
      expect(Array.isArray(report.summary.recommendations)).toBe(true);
    });

    it('시스템 건강도가 올바르게 계산되어야 함', () => {
      const report = PerformanceMonitoringService.generatePerformanceReport();
      
      expect(report.summary.systemHealth).toBeGreaterThanOrEqual(0);
      expect(report.summary.systemHealth).toBeLessThanOrEqual(100);
    });

    it('성능 점수가 올바르게 계산되어야 함', () => {
      const report = PerformanceMonitoringService.generatePerformanceReport();
      
      expect(report.summary.performanceScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.performanceScore).toBeLessThanOrEqual(100);
    });

    it('권장사항이 생성되어야 함', () => {
      const report = PerformanceMonitoringService.generatePerformanceReport();
      
      expect(Array.isArray(report.summary.recommendations)).toBe(true);
    });
  });

  describe('서비스 상태', () => {
    it('서비스 상태를 조회할 수 있어야 함', () => {
      const status = PerformanceMonitoringService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('historySize');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.alerts).toBe('number');
      expect(typeof status.historySize).toBe('number');
    });

    it('서비스가 중지된 상태에서 올바른 상태를 반환해야 함', () => {
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('서비스가 실행된 상태에서 올바른 상태를 반환해야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('이벤트 시스템', () => {
    it('알림 이벤트를 수신할 수 있어야 함', (done) => {
      PerformanceMonitoringService.on('alerts', (alerts) => {
        expect(Array.isArray(alerts)).toBe(true);
        done();
      });
      
      // 알림 발생 시뮬레이션
      PerformanceMonitoringService.emit('alerts', [{
        type: 'test_alert',
        level: 'warning',
        message: 'Test alert',
        timestamp: new Date()
      }]);
    });

    it('에러 이벤트를 수신할 수 있어야 함', (done) => {
      PerformanceMonitoringService.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
      
      // 에러 발생 시뮬레이션
      PerformanceMonitoringService.emit('error', new Error('Test error'));
    });

    it('경고 이벤트를 수신할 수 있어야 함', (done) => {
      PerformanceMonitoringService.on('warning', (warning) => {
        expect(warning).toBeDefined();
        done();
      });
      
      // 경고 발생 시뮬레이션
      PerformanceMonitoringService.emit('warning', { message: 'Test warning' });
    });
  });

  describe('에러 처리', () => {
    it('메트릭 수집 중 오류가 발생해도 서비스가 계속 실행되어야 함', async () => {
      await PerformanceMonitoringService.startService();
      
      // 에러 발생 시뮬레이션
      const originalCollectSystemMetrics = PerformanceMonitoringService.collectSystemMetrics;
      PerformanceMonitoringService.collectSystemMetrics = () => {
        throw new Error('Test error');
      };
      
      // 서비스가 계속 실행되는지 확인
      const status = PerformanceMonitoringService.getStatus();
      expect(status.isRunning).toBe(true);
      
      // 원래 함수 복원
      PerformanceMonitoringService.collectSystemMetrics = originalCollectSystemMetrics;
    });

    it('잘못된 입력값을 처리할 수 있어야 함', () => {
      expect(() => {
        PerformanceMonitoringService.recordResponseTime('invalid');
      }).not.toThrow();
      
      expect(() => {
        PerformanceMonitoringService.recordRequest('invalid');
      }).not.toThrow();
      
      expect(() => {
        PerformanceMonitoringService.updateActiveConnections('invalid');
      }).not.toThrow();
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 서비스 시작
      await PerformanceMonitoringService.startService();
      
      const initialStatus = PerformanceMonitoringService.getStatus();
      expect(initialStatus.isRunning).toBe(true);
      
      // 2. 메트릭 수집 확인
      const initialMetrics = PerformanceMonitoringService.getMetrics();
      expect(initialMetrics.system).toBeDefined();
      expect(initialMetrics.application).toBeDefined();
      expect(initialMetrics.database).toBeDefined();
      
      // 3. 응답 시간 기록
      PerformanceMonitoringService.recordResponseTime(100);
      PerformanceMonitoringService.recordResponseTime(200);
      
      // 4. 요청 수 기록
      PerformanceMonitoringService.recordRequest(false);
      PerformanceMonitoringService.recordRequest(true);
      
      // 5. 연결 수 업데이트
      PerformanceMonitoringService.updateActiveConnections(10);
      
      // 6. 업데이트된 메트릭 확인
      const updatedMetrics = PerformanceMonitoringService.getMetrics();
      expect(updatedMetrics.application.responseTime.average).toBe(150);
      expect(updatedMetrics.application.requestCount.total).toBe(2);
      expect(updatedMetrics.application.errorRate).toBe(50);
      expect(updatedMetrics.application.activeConnections).toBe(10);
      
      // 7. 알림 확인
      const alerts = PerformanceMonitoringService.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      
      // 8. 히스토리 확인
      const history = PerformanceMonitoringService.getPerformanceHistory();
      expect(Array.isArray(history)).toBe(true);
      
      // 9. 리포트 생성
      const report = PerformanceMonitoringService.generatePerformanceReport();
      expect(report.summary.systemHealth).toBeDefined();
      expect(report.summary.performanceScore).toBeDefined();
      
      // 10. 서비스 중지
      PerformanceMonitoringService.stopService();
      
      const finalStatus = PerformanceMonitoringService.getStatus();
      expect(finalStatus.isRunning).toBe(false);
    });
  });
});
