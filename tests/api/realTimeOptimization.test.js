const request = require('supertest');
const app = require('../../src/app');

describe('Real Time Optimization API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const PriorityQueueService = require('../../src/services/PriorityQueueService');
    PriorityQueueService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const PriorityQueueService = require('../../src/services/PriorityQueueService');
    PriorityQueueService.stopService();
  });

  describe('GET /api/real-time-optimization/status', () => {
    it('실시간 처리 최적화 서비스 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('queueStatus');
      expect(response.body.data).toHaveProperty('workerStatus');
      expect(response.body.data).toHaveProperty('batchProcessorStatus');
      expect(response.body.data).toHaveProperty('performanceMetrics');
      expect(response.body.data).toHaveProperty('config');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.queueStatus).toBe('object');
      expect(typeof response.body.data.workerStatus).toBe('object');
      expect(typeof response.body.data.batchProcessorStatus).toBe('object');
      expect(typeof response.body.data.performanceMetrics).toBe('object');
      expect(typeof response.body.data.config).toBe('object');
    });
  });

  describe('POST /api/real-time-optimization/start', () => {
    it('실시간 처리 최적화 서비스를 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 서비스를 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/real-time-optimization/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/real-time-optimization/stop', () => {
    it('실시간 처리 최적화 서비스를 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/real-time-optimization/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 서비스를 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/real-time-optimization/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/real-time-optimization/tasks', () => {
    beforeEach(async () => {
      // 서비스 시작
      await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);
    });

    it('우선순위 큐에 작업을 추가해야 함', async () => {
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      const response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task,
          priority: 'HIGH'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('taskId');
      expect(response.body.data).toHaveProperty('priority');
      expect(response.body.data).toHaveProperty('queueSize');
      expect(response.body.data.priority).toBe('HIGH');
      expect(typeof response.body.data.taskId).toBe('string');
    });

    it('다양한 우선순위로 작업을 추가할 수 있어야 함', async () => {
      const task = {
        type: 'alert_generation',
        data: { alertId: 'test-alert-1' }
      };

      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BATCH'];

      for (const priority of priorities) {
        const response = await request(app)
          .post('/api/real-time-optimization/tasks')
          .send({
            task,
            priority
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.priority).toBe(priority);
      }
    });

    it('작업에 옵션을 포함할 수 있어야 함', async () => {
      const task = {
        type: 'data_analysis',
        data: { analysisId: 'test-analysis-1' }
      };

      const options = {
        maxAttempts: 5,
        timeout: 10000,
        metadata: { source: 'test' }
      };

      const response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task,
          priority: 'MEDIUM',
          options
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();
    });

    it('task 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          priority: 'HIGH'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('task가 필요합니다');
    });

    it('priority 없이 요청 시 400 에러를 반환해야 함', async () => {
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      const response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('priority가 필요합니다');
    });

    it('task.type과 task.data 없이 요청 시 400 에러를 반환해야 함', async () => {
      const task = {
        // type과 data가 누락됨
      };

      const response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task,
          priority: 'HIGH'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('task.type과 task.data가 필요합니다');
    });
  });

  describe('POST /api/real-time-optimization/tasks/batch', () => {
    beforeEach(async () => {
      // 서비스 시작
      await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);
    });

    it('여러 작업을 배치로 추가해야 함', async () => {
      const tasks = [
        {
          task: {
            type: 'signal_processing',
            data: { signalId: 'batch-signal-1' }
          },
          priority: 'HIGH'
        },
        {
          task: {
            type: 'alert_generation',
            data: { alertId: 'batch-alert-1' }
          },
          priority: 'MEDIUM'
        },
        {
          task: {
            type: 'data_analysis',
            data: { analysisId: 'batch-analysis-1' }
          },
          priority: 'LOW'
        }
      ];

      const response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({ tasks })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('addedTasks');
      expect(response.body.data).toHaveProperty('failedTasks');
      expect(response.body.data).toHaveProperty('taskIds');
      expect(response.body.data).toHaveProperty('errors');

      expect(response.body.data.addedTasks).toBe(3);
      expect(response.body.data.failedTasks).toBe(0);
      expect(response.body.data.taskIds).toHaveLength(3);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('기본 우선순위와 옵션을 사용할 수 있어야 함', async () => {
      const tasks = [
        {
          task: {
            type: 'signal_processing',
            data: { signalId: 'default-signal-1' }
          }
          // priority와 options가 없음
        },
        {
          task: {
            type: 'alert_generation',
            data: { alertId: 'default-alert-1' }
          }
        }
      ];

      const defaultOptions = {
        maxAttempts: 3,
        timeout: 5000
      };

      const response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({
          tasks,
          defaultPriority: 'MEDIUM',
          defaultOptions
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addedTasks).toBe(2);
    });

    it('빈 작업 배열로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({ tasks: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });

    it('작업 배열 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });

    it('일부 작업이 실패해도 성공한 작업들은 처리되어야 함', async () => {
      const tasks = [
        {
          task: {
            type: 'signal_processing',
            data: { signalId: 'valid-signal-1' }
          },
          priority: 'HIGH'
        },
        {
          task: {
            // type과 data가 누락됨
          },
          priority: 'MEDIUM'
        },
        {
          task: {
            type: 'alert_generation',
            data: { alertId: 'valid-alert-1' }
          },
          priority: 'LOW'
        }
      ];

      const response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({ tasks })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addedTasks).toBe(2);
      expect(response.body.data.failedTasks).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });

  describe('GET /api/real-time-optimization/queues', () => {
    it('큐 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/queues')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
      
      // 모든 우선순위 레벨이 있어야 함
      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BATCH'];
      priorities.forEach(priority => {
        expect(response.body.data).toHaveProperty(priority);
        expect(response.body.data[priority]).toHaveProperty('size');
        expect(response.body.data[priority]).toHaveProperty('processing');
        expect(response.body.data[priority]).toHaveProperty('stats');
      });
    });
  });

  describe('GET /api/real-time-optimization/queues/:priority', () => {
    it('특정 우선순위 큐 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/queues/HIGH')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('processing');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('존재하지 않는 우선순위 요청 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/queues/INVALID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });

  describe('POST /api/real-time-optimization/queues/:priority/clear', () => {
    beforeEach(async () => {
      // 서비스 시작
      await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);
    });

    it('특정 우선순위 큐를 클리어해야 함', async () => {
      // 먼저 작업 추가
      const task = {
        type: 'signal_processing',
        data: { signalId: 'test-signal-1' }
      };

      await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task,
          priority: 'MEDIUM'
        })
        .expect(200);

      // 큐 클리어
      const response = await request(app)
        .post('/api/real-time-optimization/queues/MEDIUM/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('클리어되었습니다');
    });
  });

  describe('GET /api/real-time-optimization/workers', () => {
    it('워커 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/workers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');

      // 워커들이 있어야 함
      const workerIds = Object.keys(response.body.data);
      expect(workerIds.length).toBeGreaterThan(0);

      // 각 워커의 상태 확인
      workerIds.forEach(workerId => {
        expect(response.body.data[workerId]).toHaveProperty('status');
        expect(response.body.data[workerId]).toHaveProperty('currentTask');
        expect(response.body.data[workerId]).toHaveProperty('startTime');
        expect(response.body.data[workerId]).toHaveProperty('processedCount');
        expect(response.body.data[workerId]).toHaveProperty('errorCount');
      });
    });
  });

  describe('GET /api/real-time-optimization/workers/:workerId', () => {
    it('특정 워커 상태를 반환해야 함', async () => {
      // 먼저 워커 목록 조회
      const workersResponse = await request(app)
        .get('/api/real-time-optimization/workers')
        .expect(200);

      const workerIds = Object.keys(workersResponse.body.data);
      expect(workerIds.length).toBeGreaterThan(0);

      const firstWorkerId = workerIds[0];

      // 특정 워커 상태 조회
      const response = await request(app)
        .get(`/api/real-time-optimization/workers/${firstWorkerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('currentTask');
      expect(response.body.data).toHaveProperty('startTime');
      expect(response.body.data).toHaveProperty('processedCount');
      expect(response.body.data).toHaveProperty('errorCount');
    });

    it('존재하지 않는 워커 요청 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/workers/nonexistent-worker')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });

  describe('GET /api/real-time-optimization/performance', () => {
    it('성능 메트릭을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProcessed');
      expect(response.body.data).toHaveProperty('averageProcessingTime');
      expect(response.body.data).toHaveProperty('queueSizes');
      expect(response.body.data).toHaveProperty('errorCount');
      expect(response.body.data).toHaveProperty('lastProcessedAt');

      expect(typeof response.body.data.totalProcessed).toBe('number');
      expect(typeof response.body.data.averageProcessingTime).toBe('number');
      expect(typeof response.body.data.queueSizes).toBe('object');
      expect(typeof response.body.data.errorCount).toBe('number');
    });
  });

  describe('GET /api/real-time-optimization/batch-processors', () => {
    it('배치 프로세서 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/batch-processors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');

      // 배치 프로세서들이 있어야 함
      const processorIds = Object.keys(response.body.data);
      expect(processorIds.length).toBeGreaterThan(0);

      // 각 프로세서의 상태 확인
      processorIds.forEach(processorId => {
        expect(response.body.data[processorId]).toHaveProperty('status');
        expect(response.body.data[processorId]).toHaveProperty('currentBatch');
        expect(response.body.data[processorId]).toHaveProperty('startTime');
        expect(response.body.data[processorId]).toHaveProperty('processedBatches');
        expect(response.body.data[processorId]).toHaveProperty('errorCount');
      });
    });
  });

  describe('GET /api/real-time-optimization/config', () => {
    it('서비스 설정을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queueConfig');
      expect(response.body.data).toHaveProperty('workerConfig');
      expect(response.body.data).toHaveProperty('batchConfig');
      expect(response.body.data).toHaveProperty('monitoringConfig');

      expect(typeof response.body.data.queueConfig).toBe('object');
      expect(typeof response.body.data.workerConfig).toBe('object');
      expect(typeof response.body.data.batchConfig).toBe('object');
      expect(typeof response.body.data.monitoringConfig).toBe('object');
    });
  });

  describe('PUT /api/real-time-optimization/config', () => {
    it('서비스 설정을 업데이트해야 함', async () => {
      const newConfig = {
        queueConfig: {
          maxSize: 5000,
          batchSize: 50
        },
        workerConfig: {
          maxWorkers: 5
        }
      };

      const response = await request(app)
        .put('/api/real-time-optimization/config')
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('업데이트되었습니다');
    });

    it('부분적인 설정 업데이트가 가능해야 함', async () => {
      const newConfig = {
        queueConfig: {
          maxSize: 3000
        }
      };

      const response = await request(app)
        .put('/api/real-time-optimization/config')
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/real-time-optimization/health', () => {
    it('서비스 헬스 체크를 수행해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('queueHealth');
      expect(response.body.data).toHaveProperty('workerHealth');
      expect(response.body.data).toHaveProperty('performanceHealth');
      expect(response.body.data).toHaveProperty('lastCheck');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.queueHealth).toBe('object');
      expect(typeof response.body.data.workerHealth).toBe('object');
      expect(typeof response.body.data.performanceHealth).toBe('object');
    });

    it('서비스가 중지된 상태에서도 헬스 체크가 가능해야 함', async () => {
      const response = await request(app)
        .get('/api/real-time-optimization/health')
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
        .get('/api/real-time-optimization/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 서비스 시작
      response = await request(app)
        .post('/api/real-time-optimization/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/real-time-optimization/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 큐 상태 조회
      response = await request(app)
        .get('/api/real-time-optimization/queues')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 5. 워커 상태 조회
      response = await request(app)
        .get('/api/real-time-optimization/workers')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 6. 배치 프로세서 상태 조회
      response = await request(app)
        .get('/api/real-time-optimization/batch-processors')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 7. 작업 추가
      const task = {
        type: 'signal_processing',
        data: { signalId: 'integration-test-signal' }
      };

      response = await request(app)
        .post('/api/real-time-optimization/tasks')
        .send({
          task,
          priority: 'HIGH'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();

      // 8. 배치 작업 추가
      const batchTasks = [
        {
          task: {
            type: 'alert_generation',
            data: { alertId: 'batch-alert-1' }
          },
          priority: 'MEDIUM'
        },
        {
          task: {
            type: 'data_analysis',
            data: { analysisId: 'batch-analysis-1' }
          },
          priority: 'LOW'
        }
      ];

      response = await request(app)
        .post('/api/real-time-optimization/tasks/batch')
        .send({ tasks: batchTasks })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.addedTasks).toBe(2);

      // 9. 성능 메트릭 조회
      response = await request(app)
        .get('/api/real-time-optimization/performance')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 10. 설정 조회
      response = await request(app)
        .get('/api/real-time-optimization/config')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 11. 설정 업데이트
      const newConfig = {
        queueConfig: {
          maxSize: 5000
        }
      };

      response = await request(app)
        .put('/api/real-time-optimization/config')
        .send(newConfig)
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 12. 헬스 체크
      response = await request(app)
        .get('/api/real-time-optimization/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();

      // 13. 큐 클리어
      response = await request(app)
        .post('/api/real-time-optimization/queues/HIGH/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 14. 서비스 중지
      response = await request(app)
        .post('/api/real-time-optimization/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 15. 최종 상태 확인
      response = await request(app)
        .get('/api/real-time-optimization/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
