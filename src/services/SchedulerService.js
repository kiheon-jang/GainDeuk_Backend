const cron = require('node-cron');
const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');
const CoinGeckoService = require('./CoinGeckoService');
const SignalCalculatorService = require('./SignalCalculatorService');
const CacheService = require('./CacheService');
const AlertService = require('./AlertService');

class SchedulerService {
  constructor() {
    this.coinGeckoService = new CoinGeckoService();
    this.signalCalculator = new SignalCalculatorService();
    this.cacheService = new CacheService();
    this.alertService = new AlertService();
    
    // Redis 연결 설정
    this.redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    };

    // Queue 설정
    this.queues = {
      signalProcessing: new Queue('signal-processing', { connection: this.redisConnection }),
      alertProcessing: new Queue('alert-processing', { connection: this.redisConnection }),
      dataCollection: new Queue('data-collection', { connection: this.redisConnection })
    };

    // 스케줄러 상태
    this.isRunning = false;
    this.jobs = new Map();
    this.workers = new Map();

    this.setupWorkers();
  }

  // 스케줄러 시작
  startScheduler() {
    if (this.isRunning) {
      logger.warning('Scheduler is already running');
      return;
    }

    try {
      // 상위 100개 코인 - 5분마다
      this.scheduleJob('high-priority', '*/5 * * * *', () => {
        this.processHighPriorityCoins();
      });

      // 상위 500개 코인 - 15분마다
      this.scheduleJob('medium-priority', '*/15 * * * *', () => {
        this.processMediumPriorityCoins();
      });

      // 전체 코인 - 1시간마다
      this.scheduleJob('low-priority', '0 * * * *', () => {
        this.processAllCoins();
      });

      // 캐시 정리 - 6시간마다
      this.scheduleJob('cache-cleanup', '0 */6 * * *', () => {
        this.cleanupCache();
      });

      // 통계 업데이트 - 30분마다
      this.scheduleJob('stats-update', '*/30 * * * *', () => {
        this.updateStats();
      });

      // 헬스체크 - 1분마다
      this.scheduleJob('health-check', '* * * * *', () => {
        this.performHealthCheck();
      });

      this.isRunning = true;
      logger.success('Scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start scheduler:', error);
      throw error;
    }
  }

  // 스케줄러 중지
  stopScheduler() {
    if (!this.isRunning) {
      logger.warning('Scheduler is not running');
      return;
    }

    try {
      // 모든 작업 중지
      this.jobs.forEach((job, name) => {
        if (job.stop) {
          job.stop();
        } else if (job.destroy) {
          job.destroy();
        }
        logger.info(`Stopped job: ${name}`);
      });

      // 모든 워커 중지
      this.workers.forEach((worker, name) => {
        worker.close();
        logger.info(`Stopped worker: ${name}`);
      });

      this.jobs.clear();
      this.workers.clear();
      this.isRunning = false;

      logger.success('Scheduler stopped successfully');
    } catch (error) {
      logger.error('Failed to stop scheduler:', error);
      throw error;
    }
  }

  // 작업 스케줄링
  scheduleJob(name, cronExpression, task) {
    try {
      const job = cron.schedule(cronExpression, async () => {
        const startTime = Date.now();
        logger.scheduler(name, 'started');
        
        try {
          await task();
          const duration = Date.now() - startTime;
          logger.scheduler(name, 'completed', duration);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.scheduler(name, 'failed', duration, { error: error.message });
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.jobs.set(name, job);
      job.start();
      
      logger.info(`Scheduled job: ${name} (${cronExpression})`);
    } catch (error) {
      logger.error(`Failed to schedule job ${name}:`, error);
      throw error;
    }
  }

  // 워커 설정
  setupWorkers() {
    // 신호 처리 워커
    const signalWorker = new Worker('signal-processing', async (job) => {
      const { coinData } = job.data;
      return await this.processSignalJob(coinData);
    }, { connection: this.redisConnection });

    signalWorker.on('completed', (job) => {
      logger.info(`Signal processing job completed: ${job.id}`);
    });

    signalWorker.on('failed', (job, err) => {
      logger.error(`Signal processing job failed: ${job.id}`, err);
    });

    this.workers.set('signal-processing', signalWorker);

    // 알림 처리 워커
    const alertWorker = new Worker('alert-processing', async (job) => {
      const { signal } = job.data;
      return await this.processAlertJob(signal);
    }, { connection: this.redisConnection });

    alertWorker.on('completed', (job) => {
      logger.info(`Alert processing job completed: ${job.id}`);
    });

    alertWorker.on('failed', (job, err) => {
      logger.error(`Alert processing job failed: ${job.id}`, err);
    });

    this.workers.set('alert-processing', alertWorker);

    // 데이터 수집 워커
    const dataWorker = new Worker('data-collection', async (job) => {
      const { type, params } = job.data;
      return await this.processDataCollectionJob(type, params);
    }, { connection: this.redisConnection });

    dataWorker.on('completed', (job) => {
      logger.info(`Data collection job completed: ${job.id}`);
    });

    dataWorker.on('failed', (job, err) => {
      logger.error(`Data collection job failed: ${job.id}`, err);
    });

    this.workers.set('data-collection', dataWorker);
  }

  // 상위 100개 코인 처리
  async processHighPriorityCoins() {
    try {
      logger.info('Processing high priority coins (top 100)');
      
      // CoinGecko에서 상위 100개 코인 데이터 가져오기
      const marketData = await this.coinGeckoService.getMarketDataBatch(1, 100);
      
      if (!marketData || marketData.length === 0) {
        logger.warning('No market data received for high priority coins');
        return;
      }

      // 신호 계산을 Queue에 추가
      const signalJobs = marketData.map(coin => ({
        name: 'signal-processing',
        data: { coinData: coin },
        opts: { priority: 1, delay: 0 }
      }));

      await this.queues.signalProcessing.addBulk(signalJobs);
      
      logger.success(`Queued ${signalJobs.length} high priority signal jobs`);
    } catch (error) {
      logger.error('Failed to process high priority coins:', error);
    }
  }

  // 상위 500개 코인 처리
  async processMediumPriorityCoins() {
    try {
      logger.info('Processing medium priority coins (top 500)');
      
      const marketData = await this.coinGeckoService.getMarketDataBatch(1, 500);
      
      if (!marketData || marketData.length === 0) {
        logger.warning('No market data received for medium priority coins');
        return;
      }

      // 신호 계산을 Queue에 추가
      const signalJobs = marketData.map(coin => ({
        name: 'signal-processing',
        data: { coinData: coin },
        opts: { priority: 2, delay: 5000 } // 5초 지연
      }));

      await this.queues.signalProcessing.addBulk(signalJobs);
      
      logger.success(`Queued ${signalJobs.length} medium priority signal jobs`);
    } catch (error) {
      logger.error('Failed to process medium priority coins:', error);
    }
  }

  // 전체 코인 처리
  async processAllCoins() {
    try {
      logger.info('Processing all coins');
      
      // 여러 페이지로 나누어 처리
      const totalPages = 10; // 250개씩 10페이지 = 2500개
      const allJobs = [];

      for (let page = 1; page <= totalPages; page++) {
        try {
          const marketData = await this.coinGeckoService.getMarketDataBatch(page, 250);
          
          if (marketData && marketData.length > 0) {
            const signalJobs = marketData.map(coin => ({
              name: 'signal-processing',
              data: { coinData: coin },
              opts: { priority: 3, delay: page * 10000 } // 페이지별 10초 지연
            }));
            
            allJobs.push(...signalJobs);
          }

          // 페이지 간 지연
          await this.sleep(2000);
        } catch (error) {
          logger.error(`Failed to process page ${page}:`, error);
        }
      }

      if (allJobs.length > 0) {
        await this.queues.signalProcessing.addBulk(allJobs);
        logger.success(`Queued ${allJobs.length} signal jobs for all coins`);
      }
    } catch (error) {
      logger.error('Failed to process all coins:', error);
    }
  }

  // 신호 처리 작업
  async processSignalJob(coinData) {
    try {
      const signal = await this.signalCalculator.calculateSignal(
        coinData.id,
        coinData.symbol,
        coinData.name,
        coinData
      );

      // 데이터베이스에 저장
      const Signal = require('../models/Signal');
      await Signal.create(signal);

      // 캐시에 저장
      await this.cacheService.setSignal(coinData.id, signal);

      // 강한 신호인 경우 알림 처리
      if (signal.finalScore >= 80 || signal.finalScore <= 20) {
        await this.queues.alertProcessing.add('alert-processing', {
          signal: signal
        }, { priority: 1 });
      }

      return signal;
    } catch (error) {
      logger.error(`Failed to process signal job for ${coinData.symbol}:`, error);
      throw error;
    }
  }

  // 알림 처리 작업
  async processAlertJob(signal) {
    try {
      // AlertService를 사용하여 알림 처리
      const result = await this.alertService.processSignalAlert(signal);
      
      if (result.sent > 0) {
        logger.success(`Alert sent for ${signal.symbol}: ${result.sent}/${result.processed} alerts`);
      }
      
      return { success: true, signal, alerts: result };
    } catch (error) {
      logger.error(`Failed to process alert job for ${signal.symbol}:`, error);
      throw error;
    }
  }

  // 데이터 수집 작업
  async processDataCollectionJob(type, params) {
    try {
      switch (type) {
        case 'news':
          const NewsService = require('./NewsService');
          const newsService = new NewsService();
          return await newsService.getCoinSentiment(params.symbol);
          
        case 'whale':
          const WhaleService = require('./WhaleService');
          const whaleService = new WhaleService();
          return await whaleService.getWhaleActivityScore(params.symbol);
          
        case 'global':
          return await this.coinGeckoService.getGlobalData();
          
        default:
          throw new Error(`Unknown data collection type: ${type}`);
      }
    } catch (error) {
      logger.error(`Failed to process data collection job ${type}:`, error);
      throw error;
    }
  }

  // 캐시 정리
  async cleanupCache() {
    try {
      logger.info('Starting cache cleanup');
      
      const deletedCount = await this.cacheService.cleanup();
      
      logger.success(`Cache cleanup completed: ${deletedCount} keys deleted`);
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  // 통계 업데이트
  async updateStats() {
    try {
      logger.info('Updating statistics');
      
      const Signal = require('../models/Signal');
      const stats = await Signal.getSignalStats();
      
      if (stats && stats.length > 0) {
        await this.cacheService.setStats(stats[0]);
        logger.success('Statistics updated');
      }
    } catch (error) {
      logger.error('Failed to update statistics:', error);
    }
  }

  // 헬스체크
  async performHealthCheck() {
    try {
      const health = {
        timestamp: new Date(),
        scheduler: this.isRunning,
        queues: {},
        workers: {},
        database: false,
        redis: false
      };

      // 데이터베이스 연결 확인
      try {
        const mongoose = require('mongoose');
        health.database = mongoose.connection.readyState === 1;
      } catch (error) {
        health.database = false;
      }

      // Redis 연결 확인
      try {
        health.redis = await this.cacheService.ping();
      } catch (error) {
        health.redis = false;
      }

      // Queue 상태 확인
      for (const [name, queue] of Object.entries(this.queues)) {
        try {
          const waiting = await queue.getWaiting();
          const active = await queue.getActive();
          const completed = await queue.getCompleted();
          const failed = await queue.getFailed();
          
          health.queues[name] = {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
          };
        } catch (error) {
          health.queues[name] = { error: error.message };
        }
      }

      // 워커 상태 확인
      for (const [name, worker] of Object.entries(this.workers)) {
        health.workers[name] = {
          running: worker.isRunning(),
          paused: worker.isPaused()
        };
      }

      // 캐시에 헬스체크 결과 저장
      await this.cacheService.set('health:check', health, 60);

      // 문제가 있으면 로그
      if (!health.database || !health.redis) {
        logger.warning('Health check issues detected:', health);
      }

    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  // 수동 작업 실행
  async runJob(jobName) {
    try {
      switch (jobName) {
        case 'high-priority':
          await this.processHighPriorityCoins();
          break;
        case 'medium-priority':
          await this.processMediumPriorityCoins();
          break;
        case 'low-priority':
          await this.processAllCoins();
          break;
        case 'cache-cleanup':
          await this.cleanupCache();
          break;
        case 'stats-update':
          await this.updateStats();
          break;
        case 'health-check':
          await this.performHealthCheck();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      
      logger.success(`Manual job execution completed: ${jobName}`);
    } catch (error) {
      logger.error(`Manual job execution failed: ${jobName}`, error);
      throw error;
    }
  }

  // 스케줄러 상태 조회
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      workers: Array.from(this.workers.keys()),
      queues: Object.keys(this.queues)
    };
  }

  // 유틸리티 메서드
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SchedulerService;
