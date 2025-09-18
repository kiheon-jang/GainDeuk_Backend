const EventEmitter = require('events');
const { logger } = require('../utils/logger');

/**
 * 실시간 처리 최적화 시스템
 * 긴급 신호 우선 처리, 배치 처리 최적화, 병렬 처리 및 우선순위 큐를 구현
 */
class PriorityQueueService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.queues = new Map();
    this.workers = new Map();
    this.batchProcessors = new Map();
    this.performanceMetrics = {
      totalProcessed: 0,
      averageProcessingTime: 0,
      queueSizes: {},
      errorCount: 0,
      lastProcessedAt: null
    };

    // 우선순위 레벨 정의
    this.priorityLevels = {
      CRITICAL: 0,    // 긴급 신호 (즉시 처리)
      HIGH: 1,        // 높은 우선순위 (1초 이내)
      MEDIUM: 2,      // 중간 우선순위 (5초 이내)
      LOW: 3,         // 낮은 우선순위 (30초 이내)
      BATCH: 4        // 배치 처리 (1분 이내)
    };

    // 큐 설정
    this.queueConfig = {
      maxSize: 10000,
      batchSize: 100,
      processingInterval: 100, // 100ms
      retryAttempts: 3,
      retryDelay: 1000
    };

    // 워커 설정
    this.workerConfig = {
      maxWorkers: 10,
      workerTimeout: 30000, // 30초
      idleTimeout: 60000    // 1분
    };

    // 배치 처리 설정
    this.batchConfig = {
      maxBatchSize: 1000,
      batchTimeout: 5000, // 5초
      parallelBatches: 5
    };

    // 성능 모니터링 설정
    this.monitoringConfig = {
      metricsInterval: 10000, // 10초
      alertThresholds: {
        queueSize: 5000,
        processingTime: 5000,
        errorRate: 0.1
      }
    };

    this.setupQueues();
    this.setupWorkers();
    this.setupBatchProcessors();
    this.setupMonitoring();
  }

  /**
   * 큐 설정
   * @private
   */
  setupQueues() {
    Object.keys(this.priorityLevels).forEach(priority => {
      this.queues.set(priority, {
        items: [],
        processing: false,
        stats: {
          totalProcessed: 0,
          totalErrors: 0,
          averageProcessingTime: 0,
          lastProcessedAt: null
        }
      });
    });
  }

  /**
   * 워커 설정
   * @private
   */
  setupWorkers() {
    for (let i = 0; i < this.workerConfig.maxWorkers; i++) {
      const workerId = `worker-${i}`;
      this.workers.set(workerId, {
        id: workerId,
        status: 'idle',
        currentTask: null,
        startTime: null,
        processedCount: 0,
        errorCount: 0
      });
    }
  }

  /**
   * 배치 프로세서 설정
   * @private
   */
  setupBatchProcessors() {
    for (let i = 0; i < this.batchConfig.parallelBatches; i++) {
      const processorId = `batch-processor-${i}`;
      this.batchProcessors.set(processorId, {
        id: processorId,
        status: 'idle',
        currentBatch: [],
        startTime: null,
        processedBatches: 0,
        errorCount: 0
      });
    }
  }

  /**
   * 모니터링 설정
   * @private
   */
  setupMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, this.monitoringConfig.metricsInterval);
  }

  /**
   * 서비스 시작
   */
  async startService() {
    if (this.isRunning) {
      logger.warn('실시간 처리 최적화 서비스가 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('실시간 처리 최적화 서비스를 시작합니다.');

      // 큐 처리 시작
      this.startQueueProcessing();

      // 배치 처리 시작
      this.startBatchProcessing();

      // 워커 모니터링 시작
      this.startWorkerMonitoring();

      logger.info('실시간 처리 최적화 서비스가 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('실시간 처리 최적화 서비스 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 서비스 중지
   */
  stopService() {
    if (!this.isRunning) {
      logger.warn('실시간 처리 최적화 서비스가 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;

    // 큐 처리 중지
    this.stopQueueProcessing();

    // 배치 처리 중지
    this.stopBatchProcessing();

    // 워커 모니터링 중지
    this.stopWorkerMonitoring();

    // 모니터링 중지
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('실시간 처리 최적화 서비스가 중지되었습니다.');
  }

  /**
   * 우선순위 큐에 작업 추가
   * @param {Object} task - 처리할 작업
   * @param {string} priority - 우선순위 레벨
   * @param {Object} options - 추가 옵션
   * @returns {string} 작업 ID
   */
  addTask(task, priority = 'MEDIUM', options = {}) {
    if (!this.isRunning) {
      throw new Error('서비스가 실행 중이 아닙니다.');
    }

    if (!this.priorityLevels.hasOwnProperty(priority)) {
      throw new Error(`유효하지 않은 우선순위 레벨: ${priority}`);
    }

    const taskId = this.generateTaskId();
    const queueItem = {
      id: taskId,
      task,
      priority,
      priorityLevel: this.priorityLevels[priority],
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || this.queueConfig.retryAttempts,
      timeout: options.timeout || this.workerConfig.workerTimeout,
      metadata: options.metadata || {},
      callback: options.callback || null
    };

    const queue = this.queues.get(priority);
    
    // 큐 크기 확인
    if (queue.items.length >= this.queueConfig.maxSize) {
      logger.warn(`큐 ${priority}가 가득참. 오래된 작업 제거`);
      queue.items.shift(); // 가장 오래된 작업 제거
    }

    // 우선순위에 따라 정렬된 위치에 삽입
    this.insertTaskInPriorityOrder(queue.items, queueItem);
    
    logger.debug(`작업 ${taskId}가 ${priority} 큐에 추가됨`);
    
    this.emit('taskAdded', { taskId, priority, queueSize: queue.items.length });
    
    return taskId;
  }

  /**
   * 우선순위 순서로 작업 삽입
   * @private
   */
  insertTaskInPriorityOrder(items, newItem) {
    let insertIndex = items.length;
    
    for (let i = 0; i < items.length; i++) {
      if (newItem.priorityLevel < items[i].priorityLevel) {
        insertIndex = i;
        break;
      }
    }
    
    items.splice(insertIndex, 0, newItem);
  }

  /**
   * 큐 처리 시작
   * @private
   */
  startQueueProcessing() {
    this.queueProcessingInterval = setInterval(() => {
      this.processQueues();
    }, this.queueConfig.processingInterval);
  }

  /**
   * 큐 처리 중지
   * @private
   */
  stopQueueProcessing() {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }
  }

  /**
   * 큐들 처리
   * @private
   */
  async processQueues() {
    if (!this.isRunning) return;

    // 우선순위 순서로 큐 처리
    const priorityOrder = Object.keys(this.priorityLevels).sort(
      (a, b) => this.priorityLevels[a] - this.priorityLevels[b]
    );

    for (const priority of priorityOrder) {
      const queue = this.queues.get(priority);
      
      if (queue.processing || queue.items.length === 0) {
        continue;
      }

      // 사용 가능한 워커 찾기
      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) {
        continue;
      }

      // 작업 처리 시작
      this.processQueue(queue, availableWorker, priority);
    }
  }

  /**
   * 특정 큐 처리
   * @private
   */
  async processQueue(queue, worker, priority) {
    queue.processing = true;
    worker.status = 'busy';
    worker.startTime = new Date();

    try {
      const batchSize = priority === 'BATCH' ? this.batchConfig.maxBatchSize : 1;
      const tasks = queue.items.splice(0, batchSize);

      if (tasks.length === 0) {
        queue.processing = false;
        worker.status = 'idle';
        return;
      }

      logger.debug(`${priority} 큐에서 ${tasks.length}개 작업 처리 시작`);

      // 작업 처리
      if (priority === 'BATCH') {
        await this.processBatchTasks(tasks, worker);
      } else {
        await this.processSingleTasks(tasks, worker);
      }

      // 통계 업데이트
      queue.stats.totalProcessed += tasks.length;
      queue.stats.lastProcessedAt = new Date();
      this.performanceMetrics.totalProcessed += tasks.length;

    } catch (error) {
      logger.error(`${priority} 큐 처리 중 오류:`, error);
      queue.stats.totalErrors++;
      this.performanceMetrics.errorCount++;
    } finally {
      queue.processing = false;
      worker.status = 'idle';
      worker.startTime = null;
    }
  }

  /**
   * 단일 작업들 처리
   * @private
   */
  async processSingleTasks(tasks, worker) {
    for (const queueItem of tasks) {
      try {
        const startTime = Date.now();
        
        // 작업 실행
        const result = await this.executeTask(queueItem, worker);
        
        const processingTime = Date.now() - startTime;
        this.updateProcessingTime(processingTime);

        // 성공 콜백 호출
        if (queueItem.callback) {
          queueItem.callback(null, result);
        }

        this.emit('taskCompleted', {
          taskId: queueItem.id,
          priority: queueItem.priority,
          processingTime,
          result
        });

        worker.processedCount++;

      } catch (error) {
        logger.error(`작업 ${queueItem.id} 처리 실패:`, error);
        
        // 재시도 로직
        if (queueItem.attempts < queueItem.maxAttempts) {
          queueItem.attempts++;
          queueItem.retryAt = new Date(Date.now() + this.queueConfig.retryDelay);
          
          // 재시도 큐에 추가
          const retryQueue = this.queues.get(queueItem.priority);
          this.insertTaskInPriorityOrder(retryQueue.items, queueItem);
          
          logger.debug(`작업 ${queueItem.id} 재시도 예약 (${queueItem.attempts}/${queueItem.maxAttempts})`);
        } else {
          // 최대 재시도 횟수 초과
          if (queueItem.callback) {
            queueItem.callback(error);
          }

          this.emit('taskFailed', {
            taskId: queueItem.id,
            priority: queueItem.priority,
            error: error.message,
            attempts: queueItem.attempts
          });

          worker.errorCount++;
        }
      }
    }
  }

  /**
   * 배치 작업들 처리
   * @private
   */
  async processBatchTasks(tasks, worker) {
    try {
      const startTime = Date.now();
      
      // 배치 작업들을 병렬로 처리
      const batchPromises = tasks.map(queueItem => this.executeTask(queueItem, worker));
      const results = await Promise.allSettled(batchPromises);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);

      // 결과 처리
      results.forEach((result, index) => {
        const queueItem = tasks[index];
        
        if (result.status === 'fulfilled') {
          if (queueItem.callback) {
            queueItem.callback(null, result.value);
          }
          
          this.emit('taskCompleted', {
            taskId: queueItem.id,
            priority: queueItem.priority,
            processingTime: processingTime / tasks.length,
            result: result.value
          });
          
          worker.processedCount++;
        } else {
          this.handleTaskError(queueItem, result.reason, worker);
        }
      });

    } catch (error) {
      logger.error('배치 작업 처리 중 오류:', error);
      throw error;
    }
  }

  /**
   * 작업 실행
   * @private
   */
  async executeTask(queueItem, worker) {
    const { task } = queueItem;
    
    // 타임아웃 설정
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('작업 타임아웃')), queueItem.timeout);
    });

    // 작업 실행
    const taskPromise = this.runTask(task, worker);
    
    return Promise.race([taskPromise, timeoutPromise]);
  }

  /**
   * 실제 작업 실행
   * @private
   */
  async runTask(task, worker) {
    // 작업 타입에 따른 처리
    switch (task.type) {
      case 'signal_processing':
        return await this.processSignal(task.data);
      case 'alert_generation':
        return await this.generateAlert(task.data);
      case 'data_analysis':
        return await this.analyzeData(task.data);
      case 'notification_send':
        return await this.sendNotification(task.data);
      case 'cache_update':
        return await this.updateCache(task.data);
      case 'report_generation':
        return await this.generateReport(task.data);
      default:
        // 기본 작업 실행
        if (typeof task.execute === 'function') {
          return await task.execute(task.data);
        } else {
          throw new Error(`알 수 없는 작업 타입: ${task.type}`);
        }
    }
  }

  /**
   * 신호 처리
   * @private
   */
  async processSignal(data) {
    // 실제 신호 처리 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return { processed: true, signalId: data.signalId };
  }

  /**
   * 알림 생성
   * @private
   */
  async generateAlert(data) {
    // 실제 알림 생성 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    return { alertId: data.alertId, generated: true };
  }

  /**
   * 데이터 분석
   * @private
   */
  async analyzeData(data) {
    // 실제 데이터 분석 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    return { analysisId: data.analysisId, completed: true };
  }

  /**
   * 알림 전송
   * @private
   */
  async sendNotification(data) {
    // 실제 알림 전송 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
    return { notificationId: data.notificationId, sent: true };
  }

  /**
   * 캐시 업데이트
   * @private
   */
  async updateCache(data) {
    // 실제 캐시 업데이트 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
    return { cacheKey: data.key, updated: true };
  }

  /**
   * 리포트 생성
   * @private
   */
  async generateReport(data) {
    // 실제 리포트 생성 로직 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    return { reportId: data.reportId, generated: true };
  }

  /**
   * 작업 오류 처리
   * @private
   */
  handleTaskError(queueItem, error, worker) {
    logger.error(`작업 ${queueItem.id} 처리 실패:`, error);
    
    // 재시도 로직
    if (queueItem.attempts < queueItem.maxAttempts) {
      queueItem.attempts++;
      queueItem.retryAt = new Date(Date.now() + this.queueConfig.retryDelay);
      
      // 재시도 큐에 추가
      const retryQueue = this.queues.get(queueItem.priority);
      this.insertTaskInPriorityOrder(retryQueue.items, queueItem);
      
      logger.debug(`작업 ${queueItem.id} 재시도 예약 (${queueItem.attempts}/${queueItem.maxAttempts})`);
    } else {
      // 최대 재시도 횟수 초과
      if (queueItem.callback) {
        queueItem.callback(error);
      }

      this.emit('taskFailed', {
        taskId: queueItem.id,
        priority: queueItem.priority,
        error: error.message,
        attempts: queueItem.attempts
      });

      worker.errorCount++;
    }
  }

  /**
   * 배치 처리 시작
   * @private
   */
  startBatchProcessing() {
    this.batchProcessingInterval = setInterval(() => {
      this.processBatches();
    }, this.batchConfig.batchTimeout);
  }

  /**
   * 배치 처리 중지
   * @private
   */
  stopBatchProcessing() {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
    }
  }

  /**
   * 배치들 처리
   * @private
   */
  async processBatches() {
    if (!this.isRunning) return;

    const batchQueue = this.queues.get('BATCH');
    if (batchQueue.items.length === 0) return;

    // 사용 가능한 배치 프로세서 찾기
    const availableProcessor = this.getAvailableBatchProcessor();
    if (!availableProcessor) return;

    // 배치 처리 시작
    this.processBatch(batchQueue, availableProcessor);
  }

  /**
   * 배치 처리
   * @private
   */
  async processBatch(queue, processor) {
    processor.status = 'busy';
    processor.startTime = new Date();

    try {
      const batchSize = Math.min(this.batchConfig.maxBatchSize, queue.items.length);
      const tasks = queue.items.splice(0, batchSize);

      if (tasks.length === 0) {
        processor.status = 'idle';
        return;
      }

      logger.debug(`배치 프로세서 ${processor.id}에서 ${tasks.length}개 작업 처리 시작`);

      // 배치 작업들을 병렬로 처리
      const batchPromises = tasks.map(queueItem => this.executeTask(queueItem, { id: processor.id }));
      const results = await Promise.allSettled(batchPromises);

      // 결과 처리
      results.forEach((result, index) => {
        const queueItem = tasks[index];
        
        if (result.status === 'fulfilled') {
          if (queueItem.callback) {
            queueItem.callback(null, result.value);
          }
          
          this.emit('taskCompleted', {
            taskId: queueItem.id,
            priority: queueItem.priority,
            result: result.value
          });
        } else {
          this.handleTaskError(queueItem, result.reason, { id: processor.id });
        }
      });

      processor.processedBatches++;
      queue.stats.totalProcessed += tasks.length;

    } catch (error) {
      logger.error(`배치 처리 중 오류:`, error);
      processor.errorCount++;
      queue.stats.totalErrors++;
    } finally {
      processor.status = 'idle';
      processor.startTime = null;
    }
  }

  /**
   * 워커 모니터링 시작
   * @private
   */
  startWorkerMonitoring() {
    this.workerMonitoringInterval = setInterval(() => {
      this.monitorWorkers();
    }, 5000); // 5초마다 모니터링
  }

  /**
   * 워커 모니터링 중지
   * @private
   */
  stopWorkerMonitoring() {
    if (this.workerMonitoringInterval) {
      clearInterval(this.workerMonitoringInterval);
    }
  }

  /**
   * 워커들 모니터링
   * @private
   */
  monitorWorkers() {
    this.workers.forEach(worker => {
      if (worker.status === 'busy' && worker.startTime) {
        const processingTime = Date.now() - worker.startTime.getTime();
        
        // 타임아웃 확인
        if (processingTime > this.workerConfig.workerTimeout) {
          logger.warn(`워커 ${worker.id} 타임아웃. 작업 중단`);
          worker.status = 'idle';
          worker.startTime = null;
          worker.errorCount++;
        }
      }
    });
  }

  /**
   * 사용 가능한 워커 찾기
   * @private
   */
  getAvailableWorker() {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
    return null;
  }

  /**
   * 사용 가능한 배치 프로세서 찾기
   * @private
   */
  getAvailableBatchProcessor() {
    for (const processor of this.batchProcessors.values()) {
      if (processor.status === 'idle') {
        return processor;
      }
    }
    return null;
  }

  /**
   * 처리 시간 업데이트
   * @private
   */
  updateProcessingTime(processingTime) {
    const currentAvg = this.performanceMetrics.averageProcessingTime;
    const totalProcessed = this.performanceMetrics.totalProcessed;
    
    this.performanceMetrics.averageProcessingTime = 
      (currentAvg * (totalProcessed - 1) + processingTime) / totalProcessed;
  }

  /**
   * 메트릭 수집
   * @private
   */
  collectMetrics() {
    this.performanceMetrics.queueSizes = {};
    
    this.queues.forEach((queue, priority) => {
      this.performanceMetrics.queueSizes[priority] = queue.items.length;
    });

    this.performanceMetrics.lastProcessedAt = new Date();
  }

  /**
   * 알림 확인
   * @private
   */
  checkAlerts() {
    const { alertThresholds } = this.monitoringConfig;
    
    // 큐 크기 알림
    Object.entries(this.performanceMetrics.queueSizes).forEach(([priority, size]) => {
      if (size > alertThresholds.queueSize) {
        this.emit('alert', {
          type: 'queueSize',
          priority,
          size,
          threshold: alertThresholds.queueSize
        });
      }
    });

    // 처리 시간 알림
    if (this.performanceMetrics.averageProcessingTime > alertThresholds.processingTime) {
      this.emit('alert', {
        type: 'processingTime',
        value: this.performanceMetrics.averageProcessingTime,
        threshold: alertThresholds.processingTime
      });
    }

    // 오류율 알림
    const errorRate = this.performanceMetrics.errorCount / 
      Math.max(this.performanceMetrics.totalProcessed, 1);
    
    if (errorRate > alertThresholds.errorRate) {
      this.emit('alert', {
        type: 'errorRate',
        value: errorRate,
        threshold: alertThresholds.errorRate
      });
    }
  }

  /**
   * 작업 ID 생성
   * @private
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus() {
    const status = {};
    
    this.queues.forEach((queue, priority) => {
      status[priority] = {
        size: queue.items.length,
        processing: queue.processing,
        stats: { ...queue.stats }
      };
    });

    return status;
  }

  /**
   * 워커 상태 조회
   */
  getWorkerStatus() {
    const status = {};
    
    this.workers.forEach(worker => {
      status[worker.id] = {
        status: worker.status,
        currentTask: worker.currentTask,
        startTime: worker.startTime,
        processedCount: worker.processedCount,
        errorCount: worker.errorCount
      };
    });

    return status;
  }

  /**
   * 배치 프로세서 상태 조회
   */
  getBatchProcessorStatus() {
    const status = {};
    
    this.batchProcessors.forEach(processor => {
      status[processor.id] = {
        status: processor.status,
        currentBatch: processor.currentBatch,
        startTime: processor.startTime,
        processedBatches: processor.processedBatches,
        errorCount: processor.errorCount
      };
    });

    return status;
  }

  /**
   * 성능 메트릭 조회
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      queueSizes: { ...this.performanceMetrics.queueSizes }
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueStatus: this.getQueueStatus(),
      workerStatus: this.getWorkerStatus(),
      batchProcessorStatus: this.getBatchProcessorStatus(),
      performanceMetrics: this.getPerformanceMetrics(),
      config: {
        queueConfig: this.queueConfig,
        workerConfig: this.workerConfig,
        batchConfig: this.batchConfig,
        monitoringConfig: this.monitoringConfig
      }
    };
  }

  /**
   * 큐 클리어
   */
  clearQueue(priority) {
    if (priority && this.queues.has(priority)) {
      const queue = this.queues.get(priority);
      queue.items = [];
      logger.info(`${priority} 큐가 클리어되었습니다.`);
    } else {
      // 모든 큐 클리어
      this.queues.forEach((queue, priority) => {
        queue.items = [];
      });
      logger.info('모든 큐가 클리어되었습니다.');
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig) {
    if (newConfig.queueConfig) {
      this.queueConfig = { ...this.queueConfig, ...newConfig.queueConfig };
    }
    if (newConfig.workerConfig) {
      this.workerConfig = { ...this.workerConfig, ...newConfig.workerConfig };
    }
    if (newConfig.batchConfig) {
      this.batchConfig = { ...this.batchConfig, ...newConfig.batchConfig };
    }
    if (newConfig.monitoringConfig) {
      this.monitoringConfig = { ...this.monitoringConfig, ...newConfig.monitoringConfig };
    }
    
    logger.info('설정이 업데이트되었습니다.');
  }
}

module.exports = new PriorityQueueService();
