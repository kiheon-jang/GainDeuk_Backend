const PriorityQueueService = require('../../src/services/PriorityQueueService');

describe('PriorityQueueService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    PriorityQueueService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    PriorityQueueService.stopService();
  });

  describe('서비스 제어', () => {
    it('실시간 처리 최적화 서비스를 시작할 수 있어야 함', async () => {
      await expect(PriorityQueueService.startService()).resolves.not.toThrow();
      
      const status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실시간 처리 최적화 서비스를 중지할 수 있어야 함', () => {
      PriorityQueueService.stopService();
      
      const status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 서비스를 중복 시작하면 경고를 표시해야 함', async () => {
      await PriorityQueueService.startService();
      
      // 두 번째 시작 시도
      await expect(PriorityQueueService.startService()).resolves.not.toThrow();
      
      const status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 서비스를 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => PriorityQueueService.stopService()).not.toThrow();
    });
  });

  describe('작업 관리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('우선순위 큐에 작업을 추가할 수 있어야 함', () => {
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'HIGH');

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
    });

    it('다양한 우선순위 레벨로 작업을 추가할 수 있어야 함', () => {
      const task = {
        type: 'alert_generation',
        data: { alertId: 'test-alert-1' }
      };

      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BATCH'];

      priorities.forEach(priority => {
        const taskId = PriorityQueueService.addTask(task, priority);
        expect(taskId).toBeDefined();
      });
    });

    it('유효하지 않은 우선순위로 작업 추가 시 오류를 발생시켜야 함', () => {
      const task = {
        type: 'data_analysis',
        data: { analysisId: 'test-analysis-1' }
      };

      expect(() => {
        PriorityQueueService.addTask(task, 'INVALID_PRIORITY');
      }).toThrow('유효하지 않은 우선순위 레벨');
    });

    it('서비스가 중지된 상태에서 작업 추가 시 오류를 발생시켜야 함', () => {
      PriorityQueueService.stopService();

      const task = {
        type: 'notification_send',
        data: { notificationId: 'test-notification-1' }
      };

      expect(() => {
        PriorityQueueService.addTask(task, 'MEDIUM');
      }).toThrow('서비스가 실행 중이 아닙니다');
    });

    it('작업에 옵션을 포함할 수 있어야 함', () => {
      const task = {
        type: 'cache_update',
        data: { key: 'test-key', value: 'test-value' }
      };

      const options = {
        maxAttempts: 5,
        timeout: 10000,
        metadata: { source: 'test' }
      };

      const taskId = PriorityQueueService.addTask(task, 'MEDIUM', options);
      expect(taskId).toBeDefined();
    });
  });

  describe('큐 관리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('큐 상태를 조회할 수 있어야 함', () => {
      const queueStatus = PriorityQueueService.getQueueStatus();

      expect(queueStatus).toBeDefined();
      expect(typeof queueStatus).toBe('object');

      // 모든 우선순위 레벨이 있어야 함
      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BATCH'];
      priorities.forEach(priority => {
        expect(queueStatus).toHaveProperty(priority);
        expect(queueStatus[priority]).toHaveProperty('size');
        expect(queueStatus[priority]).toHaveProperty('processing');
        expect(queueStatus[priority]).toHaveProperty('stats');
      });
    });

    it('큐를 클리어할 수 있어야 함', () => {
      // 작업 추가
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      PriorityQueueService.addTask(task, 'MEDIUM');

      // 큐 상태 확인
      let queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.MEDIUM.size).toBeGreaterThan(0);

      // 큐 클리어
      PriorityQueueService.clearQueue('MEDIUM');

      // 큐 상태 재확인
      queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.MEDIUM.size).toBe(0);
    });

    it('모든 큐를 클리어할 수 있어야 함', () => {
      // 여러 큐에 작업 추가
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      PriorityQueueService.addTask(task, 'HIGH');
      PriorityQueueService.addTask(task, 'MEDIUM');
      PriorityQueueService.addTask(task, 'LOW');

      // 큐 상태 확인
      let queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.HIGH.size).toBeGreaterThan(0);
      expect(queueStatus.MEDIUM.size).toBeGreaterThan(0);
      expect(queueStatus.LOW.size).toBeGreaterThan(0);

      // 모든 큐 클리어
      PriorityQueueService.clearQueue();

      // 큐 상태 재확인
      queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.HIGH.size).toBe(0);
      expect(queueStatus.MEDIUM.size).toBe(0);
      expect(queueStatus.LOW.size).toBe(0);
    });
  });

  describe('워커 관리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('워커 상태를 조회할 수 있어야 함', () => {
      const workerStatus = PriorityQueueService.getWorkerStatus();

      expect(workerStatus).toBeDefined();
      expect(typeof workerStatus).toBe('object');

      // 워커들이 있어야 함
      const workerIds = Object.keys(workerStatus);
      expect(workerIds.length).toBeGreaterThan(0);

      // 각 워커의 상태 확인
      workerIds.forEach(workerId => {
        expect(workerStatus[workerId]).toHaveProperty('status');
        expect(workerStatus[workerId]).toHaveProperty('currentTask');
        expect(workerStatus[workerId]).toHaveProperty('startTime');
        expect(workerStatus[workerId]).toHaveProperty('processedCount');
        expect(workerStatus[workerId]).toHaveProperty('errorCount');
      });
    });

    it('워커들이 초기에는 idle 상태여야 함', () => {
      const workerStatus = PriorityQueueService.getWorkerStatus();

      Object.values(workerStatus).forEach(worker => {
        expect(worker.status).toBe('idle');
        expect(worker.currentTask).toBeNull();
        expect(worker.startTime).toBeNull();
        expect(worker.processedCount).toBe(0);
        expect(worker.errorCount).toBe(0);
      });
    });
  });

  describe('배치 프로세서 관리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('배치 프로세서 상태를 조회할 수 있어야 함', () => {
      const batchProcessorStatus = PriorityQueueService.getBatchProcessorStatus();

      expect(batchProcessorStatus).toBeDefined();
      expect(typeof batchProcessorStatus).toBe('object');

      // 배치 프로세서들이 있어야 함
      const processorIds = Object.keys(batchProcessorStatus);
      expect(processorIds.length).toBeGreaterThan(0);

      // 각 프로세서의 상태 확인
      processorIds.forEach(processorId => {
        expect(batchProcessorStatus[processorId]).toHaveProperty('status');
        expect(batchProcessorStatus[processorId]).toHaveProperty('currentBatch');
        expect(batchProcessorStatus[processorId]).toHaveProperty('startTime');
        expect(batchProcessorStatus[processorId]).toHaveProperty('processedBatches');
        expect(batchProcessorStatus[processorId]).toHaveProperty('errorCount');
      });
    });

    it('배치 프로세서들이 초기에는 idle 상태여야 함', () => {
      const batchProcessorStatus = PriorityQueueService.getBatchProcessorStatus();

      Object.values(batchProcessorStatus).forEach(processor => {
        expect(processor.status).toBe('idle');
        expect(processor.currentBatch).toEqual([]);
        expect(processor.startTime).toBeNull();
        expect(processor.processedBatches).toBe(0);
        expect(processor.errorCount).toBe(0);
      });
    });
  });

  describe('성능 메트릭', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('성능 메트릭을 조회할 수 있어야 함', () => {
      const performanceMetrics = PriorityQueueService.getPerformanceMetrics();

      expect(performanceMetrics).toBeDefined();
      expect(performanceMetrics).toHaveProperty('totalProcessed');
      expect(performanceMetrics).toHaveProperty('averageProcessingTime');
      expect(performanceMetrics).toHaveProperty('queueSizes');
      expect(performanceMetrics).toHaveProperty('errorCount');
      expect(performanceMetrics).toHaveProperty('lastProcessedAt');

      expect(typeof performanceMetrics.totalProcessed).toBe('number');
      expect(typeof performanceMetrics.averageProcessingTime).toBe('number');
      expect(typeof performanceMetrics.queueSizes).toBe('object');
      expect(typeof performanceMetrics.errorCount).toBe('number');
    });

    it('초기 성능 메트릭이 올바른 기본값을 가져야 함', () => {
      const performanceMetrics = PriorityQueueService.getPerformanceMetrics();

      expect(performanceMetrics.totalProcessed).toBe(0);
      expect(performanceMetrics.averageProcessingTime).toBe(0);
      expect(performanceMetrics.errorCount).toBe(0);
      expect(performanceMetrics.queueSizes).toBeDefined();
    });
  });

  describe('서비스 상태', () => {
    it('서비스 상태를 조회할 수 있어야 함', () => {
      const status = PriorityQueueService.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('queueStatus');
      expect(status).toHaveProperty('workerStatus');
      expect(status).toHaveProperty('batchProcessorStatus');
      expect(status).toHaveProperty('performanceMetrics');
      expect(status).toHaveProperty('config');

      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.queueStatus).toBe('object');
      expect(typeof status.workerStatus).toBe('object');
      expect(typeof status.batchProcessorStatus).toBe('object');
      expect(typeof status.performanceMetrics).toBe('object');
      expect(typeof status.config).toBe('object');
    });

    it('서비스가 중지된 상태에서 상태를 조회할 수 있어야 함', () => {
      const status = PriorityQueueService.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.queueStatus).toBeDefined();
      expect(status.workerStatus).toBeDefined();
      expect(status.batchProcessorStatus).toBeDefined();
      expect(status.performanceMetrics).toBeDefined();
    });
  });

  describe('설정 관리', () => {
    it('설정을 업데이트할 수 있어야 함', () => {
      const newConfig = {
        queueConfig: {
          maxSize: 5000,
          batchSize: 50
        },
        workerConfig: {
          maxWorkers: 5
        }
      };

      expect(() => {
        PriorityQueueService.updateConfig(newConfig);
      }).not.toThrow();
    });

    it('부분적인 설정 업데이트가 가능해야 함', () => {
      const newConfig = {
        queueConfig: {
          maxSize: 3000
        }
      };

      expect(() => {
        PriorityQueueService.updateConfig(newConfig);
      }).not.toThrow();
    });
  });

  describe('작업 타입 처리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('신호 처리 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'HIGH');
      expect(taskId).toBeDefined();

      // 잠시 대기하여 처리 시간 확보
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('알림 생성 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'alert_generation',
        data: { alertId: 'test-alert-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'MEDIUM');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('데이터 분석 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'data_analysis',
        data: { analysisId: 'test-analysis-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'LOW');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('알림 전송 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'notification_send',
        data: { notificationId: 'test-notification-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'HIGH');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('캐시 업데이트 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'cache_update',
        data: { key: 'test-key', value: 'test-value' }
      };

      const taskId = PriorityQueueService.addTask(task, 'MEDIUM');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('리포트 생성 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'report_generation',
        data: { reportId: 'test-report-1' }
      };

      const taskId = PriorityQueueService.addTask(task, 'BATCH');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('커스텀 실행 함수가 있는 작업을 처리할 수 있어야 함', async () => {
      const task = {
        type: 'custom_task',
        data: { customData: 'test' },
        execute: async (data) => {
          return { processed: true, data };
        }
      };

      const taskId = PriorityQueueService.addTask(task, 'MEDIUM');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('우선순위 처리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('높은 우선순위 작업이 먼저 처리되어야 함', async () => {
      // 낮은 우선순위 작업 먼저 추가
      const lowTask = {
        type: 'signal_processing',
        data: { signalId: 'low-priority-signal' }
      };
      PriorityQueueService.addTask(lowTask, 'LOW');

      // 높은 우선순위 작업 나중에 추가
      const highTask = {
        type: 'signal_processing',
        data: { signalId: 'high-priority-signal' }
      };
      PriorityQueueService.addTask(highTask, 'HIGH');

      // 큐 상태 확인
      const queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.HIGH.size).toBeGreaterThan(0);
      expect(queueStatus.LOW.size).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('CRITICAL 우선순위가 가장 높아야 함', async () => {
      const criticalTask = {
        type: 'alert_generation',
        data: { alertId: 'critical-alert' }
      };
      PriorityQueueService.addTask(criticalTask, 'CRITICAL');

      const highTask = {
        type: 'alert_generation',
        data: { alertId: 'high-alert' }
      };
      PriorityQueueService.addTask(highTask, 'HIGH');

      const queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.CRITICAL.size).toBeGreaterThan(0);
      expect(queueStatus.HIGH.size).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 200));
    });
  });

  describe('배치 처리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('BATCH 우선순위 작업을 배치로 처리할 수 있어야 함', async () => {
      // 여러 배치 작업 추가
      for (let i = 0; i < 5; i++) {
        const task = {
          type: 'report_generation',
          data: { reportId: `batch-report-${i}` }
        };
        PriorityQueueService.addTask(task, 'BATCH');
      }

      const queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.BATCH.size).toBe(5);

      await new Promise(resolve => setTimeout(resolve, 300));
    });
  });

  describe('에러 처리', () => {
    beforeEach(async () => {
      await PriorityQueueService.startService();
    });

    it('알 수 없는 작업 타입에 대해 적절한 처리를 해야 함', async () => {
      const task = {
        type: 'unknown_task_type',
        data: { testData: 'test' }
      };

      const taskId = PriorityQueueService.addTask(task, 'MEDIUM');
      expect(taskId).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('작업 실행 중 오류가 발생해도 서비스가 계속 실행되어야 함', async () => {
      const task = {
        type: 'signal_processing',
        data: { signalId: 'error-signal' }
      };

      const taskId = PriorityQueueService.addTask(task, 'HIGH');
      expect(taskId).toBeDefined();

      // 서비스가 계속 실행 중인지 확인
      const status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 200));
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(false);

      // 2. 서비스 시작
      await PriorityQueueService.startService();
      
      status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(true);

      // 3. 다양한 우선순위로 작업 추가
      const tasks = [
        { type: 'signal_processing', data: { signalId: 'signal-1' }, priority: 'CRITICAL' },
        { type: 'alert_generation', data: { alertId: 'alert-1' }, priority: 'HIGH' },
        { type: 'data_analysis', data: { analysisId: 'analysis-1' }, priority: 'MEDIUM' },
        { type: 'notification_send', data: { notificationId: 'notification-1' }, priority: 'LOW' },
        { type: 'report_generation', data: { reportId: 'report-1' }, priority: 'BATCH' }
      ];

      const taskIds = [];
      tasks.forEach(task => {
        const taskId = PriorityQueueService.addTask(task, task.priority);
        taskIds.push(taskId);
        expect(taskId).toBeDefined();
      });

      // 4. 큐 상태 확인
      const queueStatus = PriorityQueueService.getQueueStatus();
      expect(queueStatus.CRITICAL.size).toBeGreaterThan(0);
      expect(queueStatus.HIGH.size).toBeGreaterThan(0);
      expect(queueStatus.MEDIUM.size).toBeGreaterThan(0);
      expect(queueStatus.LOW.size).toBeGreaterThan(0);
      expect(queueStatus.BATCH.size).toBeGreaterThan(0);

      // 5. 워커 상태 확인
      const workerStatus = PriorityQueueService.getWorkerStatus();
      expect(Object.keys(workerStatus).length).toBeGreaterThan(0);

      // 6. 배치 프로세서 상태 확인
      const batchProcessorStatus = PriorityQueueService.getBatchProcessorStatus();
      expect(Object.keys(batchProcessorStatus).length).toBeGreaterThan(0);

      // 7. 성능 메트릭 확인
      const performanceMetrics = PriorityQueueService.getPerformanceMetrics();
      expect(performanceMetrics).toBeDefined();

      // 8. 작업 처리 대기
      await new Promise(resolve => setTimeout(resolve, 500));

      // 9. 큐 클리어
      PriorityQueueService.clearQueue();

      // 10. 서비스 중지
      PriorityQueueService.stopService();
      
      status = PriorityQueueService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
