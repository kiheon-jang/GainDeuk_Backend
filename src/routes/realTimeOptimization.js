const express = require('express');
const PriorityQueueService = require('../services/PriorityQueueService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 작업 ID
 *         type:
 *           type: string
 *           enum: [signal_processing, alert_generation, data_analysis, notification_send, cache_update, report_generation]
 *           description: 작업 타입
 *         data:
 *           type: object
 *           description: 작업 데이터
 *         priority:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW, BATCH]
 *           description: 우선순위 레벨
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성 시간
 *         attempts:
 *           type: number
 *           description: 시도 횟수
 *         maxAttempts:
 *           type: number
 *           description: 최대 시도 횟수
 *         timeout:
 *           type: number
 *           description: 타임아웃 (ms)
 *         metadata:
 *           type: object
 *           description: 메타데이터
 *     
 *     QueueStatus:
 *       type: object
 *       properties:
 *         size:
 *           type: number
 *           description: 큐 크기
 *         processing:
 *           type: boolean
 *           description: 처리 중 여부
 *         stats:
 *           type: object
 *           properties:
 *             totalProcessed:
 *               type: number
 *               description: 총 처리된 작업 수
 *             totalErrors:
 *               type: number
 *               description: 총 오류 수
 *             averageProcessingTime:
 *               type: number
 *               description: 평균 처리 시간
 *             lastProcessedAt:
 *               type: string
 *               format: date-time
 *               description: 마지막 처리 시간
 *     
 *     WorkerStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 워커 ID
 *         status:
 *           type: string
 *           enum: [idle, busy]
 *           description: 워커 상태
 *         currentTask:
 *           type: string
 *           description: 현재 작업 ID
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: 시작 시간
 *         processedCount:
 *           type: number
 *           description: 처리된 작업 수
 *         errorCount:
 *           type: number
 *           description: 오류 수
 *     
 *     PerformanceMetrics:
 *       type: object
 *       properties:
 *         totalProcessed:
 *           type: number
 *           description: 총 처리된 작업 수
 *         averageProcessingTime:
 *           type: number
 *           description: 평균 처리 시간
 *         queueSizes:
 *           type: object
 *           description: 큐별 크기
 *         errorCount:
 *           type: number
 *           description: 총 오류 수
 *         lastProcessedAt:
 *           type: string
 *           format: date-time
 *           description: 마지막 처리 시간
 */

/**
 * @swagger
 * /api/real-time-optimization/status:
 *   get:
 *     summary: 실시간 처리 최적화 서비스 상태 조회
 *     tags: [Real Time Optimization]
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
 *                     queueStatus:
 *                       type: object
 *                       additionalProperties:
 *                         $ref: '#/components/schemas/QueueStatus'
 *                     workerStatus:
 *                       type: object
 *                       additionalProperties:
 *                         $ref: '#/components/schemas/WorkerStatus'
 *                     performanceMetrics:
 *                       $ref: '#/components/schemas/PerformanceMetrics'
 */
router.get('/status', async (req, res) => {
  try {
    const status = PriorityQueueService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('실시간 처리 최적화 서비스 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '실시간 처리 최적화 서비스 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/start:
 *   post:
 *     summary: 실시간 처리 최적화 서비스 시작
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 시작됨
 *       409:
 *         description: 서비스가 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await PriorityQueueService.startService();

    res.json({
      success: true,
      message: '실시간 처리 최적화 서비스가 시작되었습니다.'
    });

  } catch (error) {
    logger.error('실시간 처리 최적화 서비스 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '실시간 처리 최적화 서비스가 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '실시간 처리 최적화 서비스 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/stop:
 *   post:
 *     summary: 실시간 처리 최적화 서비스 중지
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 중지됨
 */
router.post('/stop', async (req, res) => {
  try {
    PriorityQueueService.stopService();

    res.json({
      success: true,
      message: '실시간 처리 최적화 서비스가 중지되었습니다.'
    });

  } catch (error) {
    logger.error('실시간 처리 최적화 서비스 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: '실시간 처리 최적화 서비스 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/tasks:
 *   post:
 *     summary: 우선순위 큐에 작업 추가
 *     tags: [Real Time Optimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *               - priority
 *             properties:
 *               task:
 *                 type: object
 *                 required:
 *                   - type
 *                   - data
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [signal_processing, alert_generation, data_analysis, notification_send, cache_update, report_generation]
 *                     description: 작업 타입
 *                   data:
 *                     type: object
 *                     description: 작업 데이터
 *                   execute:
 *                     type: string
 *                     description: 실행 함수 (선택사항)
 *               priority:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW, BATCH]
 *                 description: 우선순위 레벨
 *               options:
 *                 type: object
 *                 properties:
 *                   maxAttempts:
 *                     type: number
 *                     description: 최대 시도 횟수
 *                   timeout:
 *                     type: number
 *                     description: 타임아웃 (ms)
 *                   metadata:
 *                     type: object
 *                     description: 메타데이터
 *                   callback:
 *                     type: string
 *                     description: 콜백 함수 (선택사항)
 *     responses:
 *       200:
 *         description: 작업이 성공적으로 추가됨
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
 *                     taskId:
 *                       type: string
 *                       description: 생성된 작업 ID
 *                     priority:
 *                       type: string
 *                       description: 우선순위
 *                     queueSize:
 *                       type: number
 *                       description: 큐 크기
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 오류
 */
router.post('/tasks', async (req, res) => {
  try {
    const { task, priority, options = {} } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        message: 'task가 필요합니다.'
      });
    }

    if (!priority) {
      return res.status(400).json({
        success: false,
        message: 'priority가 필요합니다.'
      });
    }

    if (!task.type || !task.data) {
      return res.status(400).json({
        success: false,
        message: 'task.type과 task.data가 필요합니다.'
      });
    }

    const taskId = PriorityQueueService.addTask(task, priority, options);

    res.json({
      success: true,
      data: {
        taskId,
        priority,
        queueSize: PriorityQueueService.getQueueStatus()[priority]?.size || 0
      }
    });

  } catch (error) {
    logger.error('작업 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '작업 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/tasks/batch:
 *   post:
 *     summary: 여러 작업을 배치로 추가
 *     tags: [Real Time Optimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - task
 *                     - priority
 *                   properties:
 *                     task:
 *                       type: object
 *                       description: 작업 정보
 *                     priority:
 *                       type: string
 *                       description: 우선순위
 *                     options:
 *                       type: object
 *                       description: 추가 옵션
 *               defaultPriority:
 *                 type: string
 *                 description: 기본 우선순위
 *               defaultOptions:
 *                 type: object
 *                 description: 기본 옵션
 *     responses:
 *       200:
 *         description: 배치 작업이 성공적으로 추가됨
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
 *                     addedTasks:
 *                       type: number
 *                       description: 추가된 작업 수
 *                     failedTasks:
 *                       type: number
 *                       description: 실패한 작업 수
 *                     taskIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 생성된 작업 ID들
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 오류 정보
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/tasks/batch', async (req, res) => {
  try {
    const { tasks, defaultPriority = 'MEDIUM', defaultOptions = {} } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tasks는 비어있지 않은 배열이어야 합니다.'
      });
    }

    const results = {
      addedTasks: 0,
      failedTasks: 0,
      taskIds: [],
      errors: []
    };

    for (let i = 0; i < tasks.length; i++) {
      try {
        const taskItem = tasks[i];
        const task = taskItem.task;
        const priority = taskItem.priority || defaultPriority;
        const options = { ...defaultOptions, ...taskItem.options };

        if (!task || !task.type || !task.data) {
          results.failedTasks++;
          results.errors.push({
            index: i,
            error: 'task.type과 task.data가 필요합니다.'
          });
          continue;
        }

        const taskId = PriorityQueueService.addTask(task, priority, options);
        results.addedTasks++;
        results.taskIds.push(taskId);

      } catch (error) {
        results.failedTasks++;
        results.errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('배치 작업 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '배치 작업 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/queues:
 *   get:
 *     summary: 큐 상태 조회
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 큐 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/QueueStatus'
 */
router.get('/queues', async (req, res) => {
  try {
    const queueStatus = PriorityQueueService.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus
    });

  } catch (error) {
    logger.error('큐 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '큐 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/queues/{priority}:
 *   get:
 *     summary: 특정 우선순위 큐 상태 조회
 *     tags: [Real Time Optimization]
 *     parameters:
 *       - in: path
 *         name: priority
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW, BATCH]
 *         description: 우선순위 레벨
 *     responses:
 *       200:
 *         description: 큐 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QueueStatus'
 *       404:
 *         description: 큐를 찾을 수 없음
 */
router.get('/queues/:priority', async (req, res) => {
  try {
    const { priority } = req.params;
    const queueStatus = PriorityQueueService.getQueueStatus();

    if (!queueStatus[priority]) {
      return res.status(404).json({
        success: false,
        message: `우선순위 '${priority}' 큐를 찾을 수 없습니다.`
      });
    }

    res.json({
      success: true,
      data: queueStatus[priority]
    });

  } catch (error) {
    logger.error('큐 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '큐 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/queues/{priority}/clear:
 *   post:
 *     summary: 특정 우선순위 큐 클리어
 *     tags: [Real Time Optimization]
 *     parameters:
 *       - in: path
 *         name: priority
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW, BATCH]
 *         description: 우선순위 레벨
 *     responses:
 *       200:
 *         description: 큐가 성공적으로 클리어됨
 */
router.post('/queues/:priority/clear', async (req, res) => {
  try {
    const { priority } = req.params;
    PriorityQueueService.clearQueue(priority);

    res.json({
      success: true,
      message: `${priority} 큐가 클리어되었습니다.`
    });

  } catch (error) {
    logger.error('큐 클리어 실패:', error);
    res.status(500).json({
      success: false,
      message: '큐 클리어에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/workers:
 *   get:
 *     summary: 워커 상태 조회
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 워커 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/WorkerStatus'
 */
router.get('/workers', async (req, res) => {
  try {
    const workerStatus = PriorityQueueService.getWorkerStatus();

    res.json({
      success: true,
      data: workerStatus
    });

  } catch (error) {
    logger.error('워커 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '워커 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/workers/{workerId}:
 *   get:
 *     summary: 특정 워커 상태 조회
 *     tags: [Real Time Optimization]
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: 워커 ID
 *     responses:
 *       200:
 *         description: 워커 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WorkerStatus'
 *       404:
 *         description: 워커를 찾을 수 없음
 */
router.get('/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const workerStatus = PriorityQueueService.getWorkerStatus();

    if (!workerStatus[workerId]) {
      return res.status(404).json({
        success: false,
        message: `워커 '${workerId}'를 찾을 수 없습니다.`
      });
    }

    res.json({
      success: true,
      data: workerStatus[workerId]
    });

  } catch (error) {
    logger.error('워커 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '워커 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/performance:
 *   get:
 *     summary: 성능 메트릭 조회
 *     tags: [Real Time Optimization]
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
router.get('/performance', async (req, res) => {
  try {
    const performanceMetrics = PriorityQueueService.getPerformanceMetrics();

    res.json({
      success: true,
      data: performanceMetrics
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
 * /api/real-time-optimization/batch-processors:
 *   get:
 *     summary: 배치 프로세서 상태 조회
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 배치 프로세서 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [idle, busy]
 *                       currentBatch:
 *                         type: array
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       processedBatches:
 *                         type: number
 *                       errorCount:
 *                         type: number
 */
router.get('/batch-processors', async (req, res) => {
  try {
    const batchProcessorStatus = PriorityQueueService.getBatchProcessorStatus();

    res.json({
      success: true,
      data: batchProcessorStatus
    });

  } catch (error) {
    logger.error('배치 프로세서 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '배치 프로세서 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/config:
 *   get:
 *     summary: 서비스 설정 조회
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 서비스 설정 정보
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
 *                     queueConfig:
 *                       type: object
 *                     workerConfig:
 *                       type: object
 *                     batchConfig:
 *                       type: object
 *                     monitoringConfig:
 *                       type: object
 */
router.get('/config', async (req, res) => {
  try {
    const status = PriorityQueueService.getStatus();
    const config = status.config;

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '설정 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/config:
 *   put:
 *     summary: 서비스 설정 업데이트
 *     tags: [Real Time Optimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queueConfig:
 *                 type: object
 *                 properties:
 *                   maxSize:
 *                     type: number
 *                   batchSize:
 *                     type: number
 *                   processingInterval:
 *                     type: number
 *                   retryAttempts:
 *                     type: number
 *                   retryDelay:
 *                     type: number
 *               workerConfig:
 *                 type: object
 *                 properties:
 *                   maxWorkers:
 *                     type: number
 *                   workerTimeout:
 *                     type: number
 *                   idleTimeout:
 *                     type: number
 *               batchConfig:
 *                 type: object
 *                 properties:
 *                   maxBatchSize:
 *                     type: number
 *                   batchTimeout:
 *                     type: number
 *                   parallelBatches:
 *                     type: number
 *               monitoringConfig:
 *                 type: object
 *                 properties:
 *                   metricsInterval:
 *                     type: number
 *                   alertThresholds:
 *                     type: object
 *     responses:
 *       200:
 *         description: 설정이 성공적으로 업데이트됨
 */
router.put('/config', async (req, res) => {
  try {
    const newConfig = req.body;
    PriorityQueueService.updateConfig(newConfig);

    res.json({
      success: true,
      message: '설정이 업데이트되었습니다.'
    });

  } catch (error) {
    logger.error('설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '설정 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/real-time-optimization/health:
 *   get:
 *     summary: 서비스 헬스 체크
 *     tags: [Real Time Optimization]
 *     responses:
 *       200:
 *         description: 서비스 헬스 상태
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
 *                     queueHealth:
 *                       type: object
 *                     workerHealth:
 *                       type: object
 *                     performanceHealth:
 *                       type: object
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 */
router.get('/health', async (req, res) => {
  try {
    const status = PriorityQueueService.getStatus();
    const performanceMetrics = status.performanceMetrics;
    
    // 헬스 체크 로직
    let healthStatus = 'healthy';
    const healthDetails = {
      isRunning: status.isRunning,
      queueHealth: {},
      workerHealth: {},
      performanceHealth: {},
      lastCheck: new Date()
    };

    // 큐 헬스 체크
    Object.entries(status.queueStatus).forEach(([priority, queue]) => {
      healthDetails.queueHealth[priority] = {
        size: queue.size,
        processing: queue.processing,
        healthy: queue.size < 1000 // 큐 크기가 1000 미만이면 건강
      };
      
      if (queue.size >= 1000) {
        healthStatus = 'degraded';
      }
    });

    // 워커 헬스 체크
    Object.entries(status.workerStatus).forEach(([workerId, worker]) => {
      healthDetails.workerHealth[workerId] = {
        status: worker.status,
        healthy: worker.errorCount < 10 // 오류 수가 10 미만이면 건강
      };
      
      if (worker.errorCount >= 10) {
        healthStatus = 'degraded';
      }
    });

    // 성능 헬스 체크
    healthDetails.performanceHealth = {
      totalProcessed: performanceMetrics.totalProcessed,
      averageProcessingTime: performanceMetrics.averageProcessingTime,
      errorCount: performanceMetrics.errorCount,
      healthy: performanceMetrics.averageProcessingTime < 5000 // 평균 처리 시간이 5초 미만이면 건강
    };

    if (performanceMetrics.averageProcessingTime >= 5000) {
      healthStatus = 'degraded';
    }

    if (!status.isRunning) {
      healthStatus = 'unhealthy';
    }

    res.json({
      success: true,
      data: {
        status: healthStatus,
        ...healthDetails
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
