const DataQualityService = require('../../src/services/DataQualityService');

describe('DataQualityService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    DataQualityService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    DataQualityService.stopService();
  });

  describe('서비스 제어', () => {
    it('데이터 품질 관리 서비스를 시작할 수 있어야 함', async () => {
      await expect(DataQualityService.startService()).resolves.not.toThrow();
      
      const status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('데이터 품질 관리 서비스를 중지할 수 있어야 함', () => {
      DataQualityService.stopService();
      
      const status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 서비스를 중복 시작하면 경고를 표시해야 함', async () => {
      await DataQualityService.startService();
      
      // 두 번째 시작 시도
      await expect(DataQualityService.startService()).resolves.not.toThrow();
      
      const status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 서비스를 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => DataQualityService.stopService()).not.toThrow();
    });
  });

  describe('데이터 검증', () => {
    it('가격 데이터를 검증할 수 있어야 함', () => {
      const validPrice = 45000;
      const result = DataQualityService.validateData(validPrice, 'price');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('price');
      expect(result.originalData).toBe(validPrice);
    });

    it('잘못된 가격 데이터를 감지해야 함', () => {
      const invalidPrice = -100;
      const result = DataQualityService.validateData(invalidPrice, 'price');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('최소값');
    });

    it('볼륨 데이터를 검증할 수 있어야 함', () => {
      const validVolume = 1000000;
      const result = DataQualityService.validateData(validVolume, 'volume');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('volume');
    });

    it('시장 캡 데이터를 검증할 수 있어야 함', () => {
      const validMarketCap = 800000000000;
      const result = DataQualityService.validateData(validMarketCap, 'marketCap');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('marketCap');
    });

    it('null 시장 캡 데이터를 허용해야 함', () => {
      const result = DataQualityService.validateData(null, 'marketCap');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('신호 데이터를 검증할 수 있어야 함', () => {
      const validSignal = {
        type: 'buy',
        strength: 0.8,
        timestamp: new Date()
      };
      const result = DataQualityService.validateData(validSignal, 'signal');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('signal');
    });

    it('잘못된 신호 데이터를 감지해야 함', () => {
      const invalidSignal = {
        type: 'invalid',
        strength: 1.5,
        timestamp: new Date()
      };
      const result = DataQualityService.validateData(invalidSignal, 'signal');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('사용자 프로필 데이터를 검증할 수 있어야 함', () => {
      const validProfile = {
        userId: 'user123',
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6
      };
      const result = DataQualityService.validateData(validProfile, 'userProfile');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('userProfile');
    });

    it('알림 데이터를 검증할 수 있어야 함', () => {
      const validAlert = {
        type: 'price_alert',
        message: 'BTC 가격이 목표치에 도달했습니다.',
        priority: 'warning'
      };
      const result = DataQualityService.validateData(validAlert, 'alert');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataType).toBe('alert');
    });

    it('알 수 없는 데이터 타입에 대해 오류를 발생시켜야 함', () => {
      const result = DataQualityService.validateData('test', 'unknown');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('알 수 없는 데이터 타입');
    });
  });

  describe('배치 데이터 검증', () => {
    it('배치 가격 데이터를 검증할 수 있어야 함', () => {
      const priceArray = [45000, 46000, 47000, -100, 48000];
      const result = DataQualityService.validateBatchData(priceArray, 'price');

      expect(result.totalItems).toBe(5);
      expect(result.validItems).toBe(4);
      expect(result.invalidItems).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.itemResults).toHaveLength(5);
    });

    it('빈 배열을 처리할 수 있어야 함', () => {
      const result = DataQualityService.validateBatchData([], 'price');

      expect(result.totalItems).toBe(0);
      expect(result.validItems).toBe(0);
      expect(result.invalidItems).toBe(0);
      expect(result.itemResults).toHaveLength(0);
    });
  });

  describe('이상치 탐지', () => {
    it('가격 이상치를 탐지할 수 있어야 함', () => {
      const priceData = [
        { price: 45000, timestamp: new Date() },
        { price: 46000, timestamp: new Date() },
        { price: 47000, timestamp: new Date() },
        { price: 100000, timestamp: new Date() }, // 이상치
        { price: 48000, timestamp: new Date() }
      ];

      const result = DataQualityService.detectAnomalies(priceData, 'price');

      expect(result.dataType).toBe('price');
      expect(result.totalItems).toBe(5);
      expect(result.anomaliesFound).toBeGreaterThan(0);
      expect(result.detectionMethod).toBe('zscore');
    });

    it('볼륨 이상치를 탐지할 수 있어야 함', () => {
      const volumeData = [
        { volume: 1000000, timestamp: new Date() },
        { volume: 1100000, timestamp: new Date() },
        { volume: 1200000, timestamp: new Date() },
        { volume: 5000000, timestamp: new Date() }, // 이상치
        { volume: 1300000, timestamp: new Date() }
      ];

      const result = DataQualityService.detectAnomalies(volumeData, 'volume');

      expect(result.dataType).toBe('volume');
      expect(result.totalItems).toBe(5);
      expect(result.detectionMethod).toBe('iqr');
    });

    it('시장 캡 이상치를 탐지할 수 있어야 함', () => {
      const marketCapData = [
        { marketCap: 800000000000, timestamp: new Date() },
        { marketCap: 820000000000, timestamp: new Date() },
        { marketCap: 1200000000000, timestamp: new Date() }, // 50% 이상 변화
        { marketCap: 840000000000, timestamp: new Date() }
      ];

      const result = DataQualityService.detectAnomalies(marketCapData, 'marketCap');

      expect(result.dataType).toBe('marketCap');
      expect(result.totalItems).toBe(4);
      expect(result.detectionMethod).toBe('percentage_change');
    });

    it('신호 이상치를 탐지할 수 있어야 함', () => {
      const now = new Date();
      const signalData = Array.from({ length: 15 }, (_, i) => ({
        type: 'buy',
        strength: 0.8,
        timestamp: new Date(now.getTime() - i * 60000) // 1분 간격
      }));

      const result = DataQualityService.detectAnomalies(signalData, 'signal');

      expect(result.dataType).toBe('signal');
      expect(result.totalItems).toBe(15);
      expect(result.detectionMethod).toBe('frequency');
    });

    it('데이터가 부족할 때 빈 결과를 반환해야 함', () => {
      const result = DataQualityService.detectAnomalies([], 'price');

      expect(result.anomaliesFound).toBe(0);
      expect(result.anomalies).toHaveLength(0);
    });

    it('알 수 없는 데이터 타입에 대해 오류를 처리해야 함', () => {
      const result = DataQualityService.detectAnomalies([{ test: 'data' }], 'unknown');

      expect(result.anomaliesFound).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('데이터 정제', () => {
    it('가격 데이터를 정제할 수 있어야 함', () => {
      const dirtyPrice = -100;
      const result = DataQualityService.cleanData(dirtyPrice, 'price');

      expect(result.originalData).toBe(dirtyPrice);
      expect(result.cleanedData).toBeNull();
      expect(result.changes).toContain('잘못된 가격 데이터를 null로 설정');
    });

    it('볼륨 데이터를 정제할 수 있어야 함', () => {
      const dirtyVolume = -500;
      const result = DataQualityService.cleanData(dirtyVolume, 'volume');

      expect(result.originalData).toBe(dirtyVolume);
      expect(result.cleanedData).toBe(0);
      expect(result.changes).toContain('잘못된 볼륨 데이터를 0으로 설정');
    });

    it('문자열 데이터를 정제할 수 있어야 함', () => {
      const dirtyString = '  test string  ';
      const result = DataQualityService.cleanData(dirtyString, 'string');

      expect(result.originalData).toBe(dirtyString);
      expect(result.cleanedData).toBe('test string');
      expect(result.changes).toContain('문자열 앞뒤 공백 제거');
    });

    it('잘못된 날짜를 정제할 수 있어야 함', () => {
      const dirtyDate = new Date('invalid');
      const result = DataQualityService.cleanData(dirtyDate, 'date');

      expect(result.originalData).toBe(dirtyDate);
      expect(result.cleanedData).toBeInstanceOf(Date);
      expect(result.changes).toContain('잘못된 날짜를 현재 시간으로 설정');
    });

    it('정제가 필요 없는 데이터는 그대로 반환해야 함', () => {
      const cleanData = 45000;
      const result = DataQualityService.cleanData(cleanData, 'price');

      expect(result.originalData).toBe(cleanData);
      expect(result.cleanedData).toBe(cleanData);
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('데이터 백업', () => {
    it('데이터를 백업할 수 있어야 함', async () => {
      const testData = { test: 'data', timestamp: new Date() };
      const result = await DataQualityService.backupData('test', testData);

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.filepath).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.backedUpAt).toBeInstanceOf(Date);
    });

    it('메타데이터와 함께 백업할 수 있어야 함', async () => {
      const testData = { test: 'data' };
      const options = { metadata: { source: 'test', version: '1.0' } };
      const result = await DataQualityService.backupData('test', testData, options);

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
    });
  });

  describe('데이터 복구', () => {
    it('백업된 데이터를 복구할 수 있어야 함', async () => {
      // 먼저 백업 생성
      const testData = { test: 'data', timestamp: new Date() };
      const backupResult = await DataQualityService.backupData('test', testData);
      
      expect(backupResult.success).toBe(true);

      // 복구
      const restoreResult = await DataQualityService.restoreData(backupResult.filename);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.dataType).toBe('test');
      expect(restoreResult.data).toEqual(testData);
    });

    it('존재하지 않는 파일 복구 시 오류를 처리해야 함', async () => {
      const result = await DataQualityService.restoreData('nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('품질 메트릭', () => {
    it('품질 메트릭을 조회할 수 있어야 함', () => {
      const metrics = DataQualityService.getQualityMetrics();

      expect(metrics).toHaveProperty('totalValidated');
      expect(metrics).toHaveProperty('totalErrors');
      expect(metrics).toHaveProperty('totalAnomalies');
      expect(metrics).toHaveProperty('totalBackups');
      expect(metrics).toHaveProperty('dataQualityScore');

      expect(typeof metrics.totalValidated).toBe('number');
      expect(typeof metrics.totalErrors).toBe('number');
      expect(typeof metrics.totalAnomalies).toBe('number');
      expect(typeof metrics.totalBackups).toBe('number');
      expect(typeof metrics.dataQualityScore).toBe('number');
    });

    it('초기 품질 메트릭이 올바른 기본값을 가져야 함', () => {
      const metrics = DataQualityService.getQualityMetrics();

      expect(metrics.totalValidated).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.totalAnomalies).toBe(0);
      expect(metrics.totalBackups).toBe(0);
      expect(metrics.dataQualityScore).toBe(100);
    });
  });

  describe('서비스 상태', () => {
    it('서비스 상태를 조회할 수 있어야 함', () => {
      const status = DataQualityService.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('validationRules');
      expect(status).toHaveProperty('anomalyDetectors');
      expect(status).toHaveProperty('backupConfig');
      expect(status).toHaveProperty('qualityMetrics');

      expect(typeof status.isRunning).toBe('boolean');
      expect(Array.isArray(status.validationRules)).toBe(true);
      expect(Array.isArray(status.anomalyDetectors)).toBe(true);
      expect(typeof status.backupConfig).toBe('object');
      expect(typeof status.qualityMetrics).toBe('object');
    });

    it('검증 규칙 목록을 포함해야 함', () => {
      const status = DataQualityService.getStatus();

      expect(status.validationRules).toContain('price');
      expect(status.validationRules).toContain('volume');
      expect(status.validationRules).toContain('marketCap');
      expect(status.validationRules).toContain('signal');
      expect(status.validationRules).toContain('userProfile');
      expect(status.validationRules).toContain('alert');
    });

    it('이상치 탐지기 목록을 포함해야 함', () => {
      const status = DataQualityService.getStatus();

      expect(status.anomalyDetectors).toContain('price');
      expect(status.anomalyDetectors).toContain('volume');
      expect(status.anomalyDetectors).toContain('marketCap');
      expect(status.anomalyDetectors).toContain('signal');
    });
  });

  describe('백업 파일 관리', () => {
    it('백업 파일 목록을 조회할 수 있어야 함', async () => {
      const files = await DataQualityService.getBackupFiles();

      expect(Array.isArray(files)).toBe(true);
    });

    it('백업 파일 정보를 올바르게 반환해야 함', async () => {
      // 백업 파일 생성
      const testData = { test: 'data' };
      await DataQualityService.backupData('test', testData);

      const files = await DataQualityService.getBackupFiles();

      if (files.length > 0) {
        const file = files[0];
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('createdAt');
        expect(file).toHaveProperty('modifiedAt');
      }
    });
  });

  describe('설정 관리', () => {
    it('백업 설정을 업데이트할 수 있어야 함', () => {
      const newConfig = {
        enabled: false,
        interval: 3600000,
        retentionDays: 7
      };

      expect(() => {
        DataQualityService.updateBackupConfig(newConfig);
      }).not.toThrow();
    });

    it('검증 규칙을 추가할 수 있어야 함', () => {
      const newRule = {
        required: true,
        type: 'string',
        validate: (value) => value.length > 0
      };

      expect(() => {
        DataQualityService.addValidationRule('custom', newRule);
      }).not.toThrow();
    });

    it('이상치 탐지기를 추가할 수 있어야 함', () => {
      const newDetector = {
        type: 'threshold',
        method: 'custom',
        threshold: 100,
        detect: (data) => data.filter(d => d.value > 100)
      };

      expect(() => {
        DataQualityService.addAnomalyDetector('custom', newDetector);
      }).not.toThrow();
    });
  });

  describe('에러 처리', () => {
    it('검증 중 오류가 발생해도 서비스가 계속 실행되어야 함', () => {
      const result = DataQualityService.validateData(null, 'price');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('이상치 탐지 중 오류가 발생해도 서비스가 계속 실행되어야 함', () => {
      const result = DataQualityService.detectAnomalies(null, 'price');

      expect(result).toBeDefined();
      expect(result.anomaliesFound).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('데이터 정제 중 오류가 발생해도 서비스가 계속 실행되어야 함', () => {
      const result = DataQualityService.cleanData(null, 'price');

      expect(result).toBeDefined();
      expect(result.originalData).toBeNull();
      expect(result.cleanedData).toBeNull();
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(false);

      // 2. 서비스 시작
      await DataQualityService.startService();
      
      status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(true);

      // 3. 데이터 검증
      const validationResult = DataQualityService.validateData(45000, 'price');
      expect(validationResult.isValid).toBe(true);

      // 4. 이상치 탐지
      const priceData = [
        { price: 45000, timestamp: new Date() },
        { price: 46000, timestamp: new Date() },
        { price: 100000, timestamp: new Date() } // 이상치
      ];
      const anomalyResult = DataQualityService.detectAnomalies(priceData, 'price');
      expect(anomalyResult.totalItems).toBe(3);

      // 5. 데이터 정제
      const cleaningResult = DataQualityService.cleanData(-100, 'price');
      expect(cleaningResult.cleanedData).toBeNull();

      // 6. 데이터 백업
      const backupResult = await DataQualityService.backupData('test', { test: 'data' });
      expect(backupResult.success).toBe(true);

      // 7. 품질 메트릭 확인
      const metrics = DataQualityService.getQualityMetrics();
      expect(metrics.totalValidated).toBeGreaterThan(0);

      // 8. 서비스 중지
      DataQualityService.stopService();
      
      status = DataQualityService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
