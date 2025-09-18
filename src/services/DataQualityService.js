const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * 데이터 품질 관리 시스템
 * 데이터 검증 및 정제, 이상치 탐지 및 처리, 데이터 백업 및 복구 시스템
 */
class DataQualityService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.validationRules = new Map();
    this.anomalyDetectors = new Map();
    this.backupConfig = {
      enabled: true,
      interval: 24 * 60 * 60 * 1000, // 24시간
      retentionDays: 30,
      backupPath: './backups',
      compressionEnabled: true
    };
    this.qualityMetrics = {
      totalValidated: 0,
      totalErrors: 0,
      totalAnomalies: 0,
      totalBackups: 0,
      lastValidationAt: null,
      lastBackupAt: null,
      dataQualityScore: 100
    };

    // 데이터 검증 규칙 설정
    this.setupValidationRules();
    
    // 이상치 탐지기 설정
    this.setupAnomalyDetectors();
    
    // 백업 디렉토리 생성
    this.ensureBackupDirectory();
  }

  /**
   * 데이터 검증 규칙 설정
   * @private
   */
  setupValidationRules() {
    // 가격 데이터 검증 규칙
    this.validationRules.set('price', {
      required: true,
      type: 'number',
      min: 0,
      max: 1000000,
      precision: 8,
      validate: (value) => {
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (value < 0) return false;
        if (value > 1000000) return false;
        return true;
      }
    });

    // 볼륨 데이터 검증 규칙
    this.validationRules.set('volume', {
      required: true,
      type: 'number',
      min: 0,
      max: 1000000000000,
      validate: (value) => {
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (value < 0) return false;
        return true;
      }
    });

    // 시장 캡 데이터 검증 규칙
    this.validationRules.set('marketCap', {
      required: false,
      type: 'number',
      min: 0,
      max: 10000000000000,
      validate: (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (value < 0) return false;
        return true;
      }
    });

    // 신호 데이터 검증 규칙
    this.validationRules.set('signal', {
      required: true,
      type: 'object',
      validate: (value) => {
        if (typeof value !== 'object' || value === null) return false;
        if (!value.type || !value.strength || !value.timestamp) return false;
        if (!['buy', 'sell', 'hold'].includes(value.type)) return false;
        if (typeof value.strength !== 'number' || value.strength < 0 || value.strength > 1) return false;
        return true;
      }
    });

    // 사용자 프로필 데이터 검증 규칙
    this.validationRules.set('userProfile', {
      required: true,
      type: 'object',
      validate: (value) => {
        if (typeof value !== 'object' || value === null) return false;
        if (!value.userId || !value.investmentStyle || !value.experienceLevel) return false;
        if (!['hodler', 'trader', 'balanced'].includes(value.investmentStyle)) return false;
        if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(value.experienceLevel)) return false;
        if (typeof value.riskTolerance !== 'number' || value.riskTolerance < 0 || value.riskTolerance > 1) return false;
        return true;
      }
    });

    // 알림 데이터 검증 규칙
    this.validationRules.set('alert', {
      required: true,
      type: 'object',
      validate: (value) => {
        if (typeof value !== 'object' || value === null) return false;
        if (!value.type || !value.message || !value.priority) return false;
        if (!['info', 'warning', 'error', 'critical'].includes(value.priority)) return false;
        return true;
      }
    });
  }

  /**
   * 이상치 탐지기 설정
   * @private
   */
  setupAnomalyDetectors() {
    // 가격 이상치 탐지기
    this.anomalyDetectors.set('price', {
      type: 'statistical',
      method: 'zscore',
      threshold: 3,
      windowSize: 100,
      detect: (data) => {
        if (data.length < 10) return [];
        
        const prices = data.map(d => d.price).filter(p => p != null);
        if (prices.length < 10) return [];
        
        const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return [];
        
        return data.filter(d => {
          if (d.price == null) return false;
          const zScore = Math.abs((d.price - mean) / stdDev);
          return zScore > 3;
        });
      }
    });

    // 볼륨 이상치 탐지기
    this.anomalyDetectors.set('volume', {
      type: 'statistical',
      method: 'iqr',
      threshold: 1.5,
      detect: (data) => {
        if (data.length < 10) return [];
        
        const volumes = data.map(d => d.volume).filter(v => v != null).sort((a, b) => a - b);
        if (volumes.length < 10) return [];
        
        const q1Index = Math.floor(volumes.length * 0.25);
        const q3Index = Math.floor(volumes.length * 0.75);
        const q1 = volumes[q1Index];
        const q3 = volumes[q3Index];
        const iqr = q3 - q1;
        
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return data.filter(d => {
          if (d.volume == null) return false;
          return d.volume < lowerBound || d.volume > upperBound;
        });
      }
    });

    // 시장 캡 이상치 탐지기
    this.anomalyDetectors.set('marketCap', {
      type: 'threshold',
      method: 'percentage_change',
      threshold: 50, // 50% 이상 변화
      detect: (data) => {
        if (data.length < 2) return [];
        
        const anomalies = [];
        for (let i = 1; i < data.length; i++) {
          const current = data[i].marketCap;
          const previous = data[i - 1].marketCap;
          
          if (current == null || previous == null) continue;
          if (previous === 0) continue;
          
          const changePercent = Math.abs((current - previous) / previous) * 100;
          if (changePercent > 50) {
            anomalies.push(data[i]);
          }
        }
        
        return anomalies;
      }
    });

    // 신호 이상치 탐지기
    this.anomalyDetectors.set('signal', {
      type: 'pattern',
      method: 'frequency',
      threshold: 10, // 10분 내 10개 이상 신호
      detect: (data) => {
        if (data.length < 10) return [];
        
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        
        const recentSignals = data.filter(d => {
          const signalTime = new Date(d.timestamp);
          return signalTime > tenMinutesAgo;
        });
        
        if (recentSignals.length > 10) {
          return recentSignals;
        }
        
        return [];
      }
    });
  }

  /**
   * 백업 디렉토리 생성
   * @private
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupConfig.backupPath, { recursive: true });
    } catch (error) {
      logger.error('백업 디렉토리 생성 실패:', error);
    }
  }

  /**
   * 서비스 시작
   */
  async startService() {
    if (this.isRunning) {
      logger.warn('데이터 품질 관리 서비스가 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('데이터 품질 관리 서비스를 시작합니다.');

      // 백업 스케줄러 시작
      this.startBackupScheduler();

      // 데이터 품질 모니터링 시작
      this.startQualityMonitoring();

      logger.info('데이터 품질 관리 서비스가 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('데이터 품질 관리 서비스 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 서비스 중지
   */
  stopService() {
    if (!this.isRunning) {
      logger.warn('데이터 품질 관리 서비스가 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;

    // 백업 스케줄러 중지
    this.stopBackupScheduler();

    // 품질 모니터링 중지
    this.stopQualityMonitoring();

    logger.info('데이터 품질 관리 서비스가 중지되었습니다.');
  }

  /**
   * 데이터 검증
   * @param {*} data - 검증할 데이터
   * @param {string} dataType - 데이터 타입
   * @param {Object} options - 검증 옵션
   * @returns {Object} 검증 결과
   */
  validateData(data, dataType, options = {}) {
    try {
      const rule = this.validationRules.get(dataType);
      if (!rule) {
        throw new Error(`알 수 없는 데이터 타입: ${dataType}`);
      }

      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        dataType,
        validatedAt: new Date(),
        originalData: data
      };

      // 필수 필드 검증
      if (rule.required && (data === null || data === undefined)) {
        result.isValid = false;
        result.errors.push(`${dataType} 데이터가 필수입니다.`);
        return result;
      }

      // 타입 검증
      if (rule.type && typeof data !== rule.type) {
        result.isValid = false;
        result.errors.push(`${dataType} 데이터 타입이 올바르지 않습니다. 예상: ${rule.type}, 실제: ${typeof data}`);
        return result;
      }

      // 범위 검증
      if (rule.min !== undefined && data < rule.min) {
        result.isValid = false;
        result.errors.push(`${dataType} 값이 최소값(${rule.min})보다 작습니다.`);
      }

      if (rule.max !== undefined && data > rule.max) {
        result.isValid = false;
        result.errors.push(`${dataType} 값이 최대값(${rule.max})보다 큽니다.`);
      }

      // 정밀도 검증
      if (rule.precision && typeof data === 'number') {
        const decimalPlaces = (data.toString().split('.')[1] || '').length;
        if (decimalPlaces > rule.precision) {
          result.warnings.push(`${dataType} 정밀도가 ${rule.precision}자리를 초과합니다.`);
        }
      }

      // 커스텀 검증
      if (rule.validate && !rule.validate(data)) {
        result.isValid = false;
        result.errors.push(`${dataType} 데이터가 검증 규칙을 통과하지 못했습니다.`);
      }

      // 통계 업데이트
      this.qualityMetrics.totalValidated++;
      if (!result.isValid) {
        this.qualityMetrics.totalErrors++;
      }
      this.qualityMetrics.lastValidationAt = new Date();

      // 품질 점수 계산
      this.calculateQualityScore();

      this.emit('dataValidated', result);

      return result;

    } catch (error) {
      logger.error('데이터 검증 실패:', error);
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        dataType,
        validatedAt: new Date(),
        originalData: data
      };
    }
  }

  /**
   * 배치 데이터 검증
   * @param {Array} dataArray - 검증할 데이터 배열
   * @param {string} dataType - 데이터 타입
   * @param {Object} options - 검증 옵션
   * @returns {Object} 배치 검증 결과
   */
  validateBatchData(dataArray, dataType, options = {}) {
    const results = {
      totalItems: dataArray.length,
      validItems: 0,
      invalidItems: 0,
      errors: [],
      warnings: [],
      itemResults: [],
      validatedAt: new Date()
    };

    dataArray.forEach((data, index) => {
      const result = this.validateData(data, dataType, options);
      results.itemResults.push({
        index,
        result
      });

      if (result.isValid) {
        results.validItems++;
      } else {
        results.invalidItems++;
        results.errors.push(`항목 ${index}: ${result.errors.join(', ')}`);
      }

      results.warnings.push(...result.warnings);
    });

    this.emit('batchDataValidated', results);

    return results;
  }

  /**
   * 이상치 탐지
   * @param {Array} data - 탐지할 데이터 배열
   * @param {string} dataType - 데이터 타입
   * @param {Object} options - 탐지 옵션
   * @returns {Object} 이상치 탐지 결과
   */
  detectAnomalies(data, dataType, options = {}) {
    try {
      const detector = this.anomalyDetectors.get(dataType);
      if (!detector) {
        throw new Error(`알 수 없는 데이터 타입: ${dataType}`);
      }

      const anomalies = detector.detect(data);
      
      const result = {
        dataType,
        totalItems: data.length,
        anomaliesFound: anomalies.length,
        anomalies: anomalies,
        detectionMethod: detector.method,
        threshold: detector.threshold,
        detectedAt: new Date()
      };

      // 통계 업데이트
      this.qualityMetrics.totalAnomalies += anomalies.length;

      this.emit('anomaliesDetected', result);

      return result;

    } catch (error) {
      logger.error('이상치 탐지 실패:', error);
      return {
        dataType,
        totalItems: data.length,
        anomaliesFound: 0,
        anomalies: [],
        error: error.message,
        detectedAt: new Date()
      };
    }
  }

  /**
   * 데이터 정제
   * @param {*} data - 정제할 데이터
   * @param {string} dataType - 데이터 타입
   * @param {Object} options - 정제 옵션
   * @returns {Object} 정제 결과
   */
  cleanData(data, dataType, options = {}) {
    try {
      const cleanedData = { ...data };
      const changes = [];

      // 가격 데이터 정제
      if (dataType === 'price' && typeof data === 'number') {
        if (isNaN(data) || data < 0) {
          cleanedData = null;
          changes.push('잘못된 가격 데이터를 null로 설정');
        } else if (data > 1000000) {
          cleanedData = 1000000;
          changes.push('가격을 최대값으로 제한');
        }
      }

      // 볼륨 데이터 정제
      if (dataType === 'volume' && typeof data === 'number') {
        if (isNaN(data) || data < 0) {
          cleanedData = 0;
          changes.push('잘못된 볼륨 데이터를 0으로 설정');
        }
      }

      // 문자열 데이터 정제
      if (typeof data === 'string') {
        cleanedData = data.trim();
        if (cleanedData !== data) {
          changes.push('문자열 앞뒤 공백 제거');
        }
      }

      // 날짜 데이터 정제
      if (data instanceof Date) {
        if (isNaN(data.getTime())) {
          cleanedData = new Date();
          changes.push('잘못된 날짜를 현재 시간으로 설정');
        }
      }

      const result = {
        originalData: data,
        cleanedData,
        changes,
        cleanedAt: new Date()
      };

      this.emit('dataCleaned', result);

      return result;

    } catch (error) {
      logger.error('데이터 정제 실패:', error);
      return {
        originalData: data,
        cleanedData: data,
        changes: [],
        error: error.message,
        cleanedAt: new Date()
      };
    }
  }

  /**
   * 데이터 백업
   * @param {string} dataType - 백업할 데이터 타입
   * @param {*} data - 백업할 데이터
   * @param {Object} options - 백업 옵션
   * @returns {Object} 백업 결과
   */
  async backupData(dataType, data, options = {}) {
    try {
      if (!this.backupConfig.enabled) {
        return { success: false, message: '백업이 비활성화되어 있습니다.' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${dataType}_${timestamp}.json`;
      const filepath = path.join(this.backupConfig.backupPath, filename);

      const backupData = {
        dataType,
        data,
        backupAt: new Date(),
        version: '1.0.0',
        metadata: options.metadata || {}
      };

      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

      // 통계 업데이트
      this.qualityMetrics.totalBackups++;
      this.qualityMetrics.lastBackupAt = new Date();

      const result = {
        success: true,
        filename,
        filepath,
        size: JSON.stringify(backupData).length,
        backedUpAt: new Date()
      };

      this.emit('dataBackedUp', result);

      return result;

    } catch (error) {
      logger.error('데이터 백업 실패:', error);
      return {
        success: false,
        error: error.message,
        backedUpAt: new Date()
      };
    }
  }

  /**
   * 데이터 복구
   * @param {string} filename - 복구할 파일명
   * @param {Object} options - 복구 옵션
   * @returns {Object} 복구 결과
   */
  async restoreData(filename, options = {}) {
    try {
      const filepath = path.join(this.backupConfig.backupPath, filename);
      
      const fileContent = await fs.readFile(filepath, 'utf8');
      const backupData = JSON.parse(fileContent);

      const result = {
        success: true,
        dataType: backupData.dataType,
        data: backupData.data,
        backupAt: backupData.backupAt,
        restoredAt: new Date()
      };

      this.emit('dataRestored', result);

      return result;

    } catch (error) {
      logger.error('데이터 복구 실패:', error);
      return {
        success: false,
        error: error.message,
        restoredAt: new Date()
      };
    }
  }

  /**
   * 백업 스케줄러 시작
   * @private
   */
  startBackupScheduler() {
    this.backupInterval = setInterval(async () => {
      await this.performScheduledBackup();
    }, this.backupConfig.interval);
  }

  /**
   * 백업 스케줄러 중지
   * @private
   */
  stopBackupScheduler() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
  }

  /**
   * 스케줄된 백업 수행
   * @private
   */
  async performScheduledBackup() {
    try {
      logger.info('스케줄된 백업을 시작합니다.');

      // 백업할 데이터 타입들
      const dataTypes = ['price', 'volume', 'marketCap', 'signal', 'userProfile', 'alert'];

      for (const dataType of dataTypes) {
        // 실제 구현에서는 데이터베이스에서 데이터를 가져와야 함
        const sampleData = this.generateSampleData(dataType);
        await this.backupData(dataType, sampleData);
      }

      // 오래된 백업 파일 정리
      await this.cleanupOldBackups();

      logger.info('스케줄된 백업이 완료되었습니다.');

    } catch (error) {
      logger.error('스케줄된 백업 실패:', error);
    }
  }

  /**
   * 오래된 백업 파일 정리
   * @private
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupConfig.backupPath);
      const cutoffDate = new Date(Date.now() - this.backupConfig.retentionDays * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filepath = path.join(this.backupConfig.backupPath, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          logger.info(`오래된 백업 파일 삭제: ${file}`);
        }
      }
    } catch (error) {
      logger.error('백업 파일 정리 실패:', error);
    }
  }

  /**
   * 품질 모니터링 시작
   * @private
   */
  startQualityMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.performQualityCheck();
    }, 60000); // 1분마다
  }

  /**
   * 품질 모니터링 중지
   * @private
   */
  stopQualityMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * 품질 체크 수행
   * @private
   */
  performQualityCheck() {
    try {
      const qualityScore = this.calculateQualityScore();
      
      if (qualityScore < 80) {
        this.emit('qualityAlert', {
          score: qualityScore,
          message: '데이터 품질이 기준 이하입니다.',
          timestamp: new Date()
        });
      }

      this.emit('qualityCheck', {
        score: qualityScore,
        metrics: { ...this.qualityMetrics },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('품질 체크 실패:', error);
    }
  }

  /**
   * 품질 점수 계산
   * @private
   */
  calculateQualityScore() {
    const totalProcessed = this.qualityMetrics.totalValidated + this.qualityMetrics.totalAnomalies;
    
    if (totalProcessed === 0) {
      this.qualityMetrics.dataQualityScore = 100;
      return 100;
    }

    const errorRate = this.qualityMetrics.totalErrors / totalProcessed;
    const anomalyRate = this.qualityMetrics.totalAnomalies / totalProcessed;
    
    const score = Math.max(0, 100 - (errorRate * 50) - (anomalyRate * 30));
    this.qualityMetrics.dataQualityScore = Math.round(score);
    
    return this.qualityMetrics.dataQualityScore;
  }

  /**
   * 샘플 데이터 생성 (테스트용)
   * @private
   */
  generateSampleData(dataType) {
    const now = new Date();
    
    switch (dataType) {
      case 'price':
        return {
          symbol: 'BTC',
          price: 45000 + Math.random() * 1000,
          timestamp: now
        };
      case 'volume':
        return {
          symbol: 'BTC',
          volume: 1000000 + Math.random() * 500000,
          timestamp: now
        };
      case 'marketCap':
        return {
          symbol: 'BTC',
          marketCap: 800000000000 + Math.random() * 100000000000,
          timestamp: now
        };
      case 'signal':
        return {
          symbol: 'BTC',
          type: ['buy', 'sell', 'hold'][Math.floor(Math.random() * 3)],
          strength: Math.random(),
          timestamp: now
        };
      case 'userProfile':
        return {
          userId: 'user_' + Math.random().toString(36).substr(2, 9),
          investmentStyle: ['hodler', 'trader', 'balanced'][Math.floor(Math.random() * 3)],
          experienceLevel: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)],
          riskTolerance: Math.random()
        };
      case 'alert':
        return {
          type: 'price_alert',
          message: 'BTC 가격이 목표치에 도달했습니다.',
          priority: ['info', 'warning', 'error', 'critical'][Math.floor(Math.random() * 4)],
          timestamp: now
        };
      default:
        return { timestamp: now };
    }
  }

  /**
   * 검증 규칙 추가
   * @param {string} dataType - 데이터 타입
   * @param {Object} rule - 검증 규칙
   */
  addValidationRule(dataType, rule) {
    this.validationRules.set(dataType, rule);
    logger.info(`검증 규칙 추가: ${dataType}`);
  }

  /**
   * 이상치 탐지기 추가
   * @param {string} dataType - 데이터 타입
   * @param {Object} detector - 탐지기
   */
  addAnomalyDetector(dataType, detector) {
    this.anomalyDetectors.set(dataType, detector);
    logger.info(`이상치 탐지기 추가: ${dataType}`);
  }

  /**
   * 백업 설정 업데이트
   * @param {Object} config - 새로운 설정
   */
  updateBackupConfig(config) {
    this.backupConfig = { ...this.backupConfig, ...config };
    logger.info('백업 설정이 업데이트되었습니다.');
  }

  /**
   * 품질 메트릭 조회
   */
  getQualityMetrics() {
    return {
      ...this.qualityMetrics,
      dataQualityScore: this.calculateQualityScore()
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      validationRules: Array.from(this.validationRules.keys()),
      anomalyDetectors: Array.from(this.anomalyDetectors.keys()),
      backupConfig: this.backupConfig,
      qualityMetrics: this.getQualityMetrics()
    };
  }

  /**
   * 백업 파일 목록 조회
   */
  async getBackupFiles() {
    try {
      const files = await fs.readdir(this.backupConfig.backupPath);
      const fileInfos = [];

      for (const file of files) {
        const filepath = path.join(this.backupConfig.backupPath, file);
        const stats = await fs.stat(filepath);
        
        fileInfos.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }

      return fileInfos.sort((a, b) => b.modifiedAt - a.modifiedAt);
    } catch (error) {
      logger.error('백업 파일 목록 조회 실패:', error);
      return [];
    }
  }
}

module.exports = new DataQualityService();
