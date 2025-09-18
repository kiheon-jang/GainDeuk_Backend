const request = require('supertest');
const app = require('../../src/app');

describe('Data Quality API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const DataQualityService = require('../../src/services/DataQualityService');
    DataQualityService.stopService();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const DataQualityService = require('../../src/services/DataQualityService');
    DataQualityService.stopService();
  });

  describe('GET /api/data-quality/status', () => {
    it('데이터 품질 서비스 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('validationRules');
      expect(response.body.data).toHaveProperty('anomalyDetectors');
      expect(response.body.data).toHaveProperty('backupConfig');
      expect(response.body.data).toHaveProperty('qualityMetrics');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(Array.isArray(response.body.data.validationRules)).toBe(true);
      expect(Array.isArray(response.body.data.anomalyDetectors)).toBe(true);
      expect(typeof response.body.data.backupConfig).toBe('object');
      expect(typeof response.body.data.qualityMetrics).toBe('object');
    });
  });

  describe('POST /api/data-quality/start', () => {
    it('데이터 품질 서비스를 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 서비스를 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/data-quality/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/data-quality/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/data-quality/stop', () => {
    it('데이터 품질 서비스를 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/data-quality/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/data-quality/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 서비스를 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/data-quality/validate', () => {
    it('데이터를 검증해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: 45000,
          dataType: 'price'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('warnings');
      expect(response.body.data).toHaveProperty('dataType');
      expect(response.body.data).toHaveProperty('validatedAt');
      expect(response.body.data).toHaveProperty('originalData');

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.dataType).toBe('price');
      expect(response.body.data.originalData).toBe(45000);
    });

    it('잘못된 데이터를 감지해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: -100,
          dataType: 'price'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('data 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate')
        .send({
          dataType: 'price'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('data가 필요합니다');
    });

    it('dataType 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: 45000
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dataType이 필요합니다');
    });
  });

  describe('POST /api/data-quality/validate-batch', () => {
    it('배치 데이터를 검증해야 함', async () => {
      const priceArray = [45000, 46000, 47000, -100, 48000];
      
      const response = await request(app)
        .post('/api/data-quality/validate-batch')
        .send({
          dataArray: priceArray,
          dataType: 'price'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalItems');
      expect(response.body.data).toHaveProperty('validItems');
      expect(response.body.data).toHaveProperty('invalidItems');
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('warnings');
      expect(response.body.data).toHaveProperty('itemResults');
      expect(response.body.data).toHaveProperty('validatedAt');

      expect(response.body.data.totalItems).toBe(5);
      expect(response.body.data.validItems).toBe(4);
      expect(response.body.data.invalidItems).toBe(1);
      expect(response.body.data.itemResults).toHaveLength(5);
    });

    it('dataArray가 배열이 아니면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate-batch')
        .send({
          dataArray: 'not an array',
          dataType: 'price'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('배열이어야 합니다');
    });

    it('dataType 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/validate-batch')
        .send({
          dataArray: [45000, 46000]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dataType이 필요합니다');
    });
  });

  describe('POST /api/data-quality/detect-anomalies', () => {
    it('이상치를 탐지해야 함', async () => {
      const priceData = [
        { price: 45000, timestamp: new Date() },
        { price: 46000, timestamp: new Date() },
        { price: 47000, timestamp: new Date() },
        { price: 100000, timestamp: new Date() }, // 이상치
        { price: 48000, timestamp: new Date() }
      ];

      const response = await request(app)
        .post('/api/data-quality/detect-anomalies')
        .send({
          data: priceData,
          dataType: 'price'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dataType');
      expect(response.body.data).toHaveProperty('totalItems');
      expect(response.body.data).toHaveProperty('anomaliesFound');
      expect(response.body.data).toHaveProperty('anomalies');
      expect(response.body.data).toHaveProperty('detectionMethod');
      expect(response.body.data).toHaveProperty('threshold');
      expect(response.body.data).toHaveProperty('detectedAt');

      expect(response.body.data.dataType).toBe('price');
      expect(response.body.data.totalItems).toBe(5);
      expect(response.body.data.detectionMethod).toBe('zscore');
    });

    it('data가 배열이 아니면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/detect-anomalies')
        .send({
          data: 'not an array',
          dataType: 'price'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('배열이어야 합니다');
    });

    it('dataType 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/detect-anomalies')
        .send({
          data: [{ price: 45000 }]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dataType이 필요합니다');
    });
  });

  describe('POST /api/data-quality/clean', () => {
    it('데이터를 정제해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/clean')
        .send({
          data: -100,
          dataType: 'price'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('originalData');
      expect(response.body.data).toHaveProperty('cleanedData');
      expect(response.body.data).toHaveProperty('changes');
      expect(response.body.data).toHaveProperty('cleanedAt');

      expect(response.body.data.originalData).toBe(-100);
      expect(response.body.data.cleanedData).toBeNull();
      expect(response.body.data.changes.length).toBeGreaterThan(0);
    });

    it('data 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/clean')
        .send({
          dataType: 'price'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('data가 필요합니다');
    });

    it('dataType 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/clean')
        .send({
          data: -100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dataType이 필요합니다');
    });
  });

  describe('POST /api/data-quality/backup', () => {
    it('데이터를 백업해야 함', async () => {
      const testData = { test: 'data', timestamp: new Date() };
      
      const response = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: testData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('filepath');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('backedUpAt');

      expect(response.body.data.success).toBe(true);
      expect(response.body.data.filename).toBeDefined();
      expect(response.body.data.size).toBeGreaterThan(0);
    });

    it('메타데이터와 함께 백업할 수 있어야 함', async () => {
      const testData = { test: 'data' };
      const options = { metadata: { source: 'test', version: '1.0' } };
      
      const response = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: testData,
          options
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('dataType 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/backup')
        .send({
          data: { test: 'data' }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('dataType이 필요합니다');
    });

    it('data 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('data가 필요합니다');
    });
  });

  describe('POST /api/data-quality/restore', () => {
    it('데이터를 복구해야 함', async () => {
      // 먼저 백업 생성
      const testData = { test: 'data', timestamp: new Date() };
      const backupResponse = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: testData
        })
        .expect(200);

      const filename = backupResponse.body.data.filename;

      // 복구
      const response = await request(app)
        .post('/api/data-quality/restore')
        .send({
          filename
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('dataType');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('backupAt');
      expect(response.body.data).toHaveProperty('restoredAt');

      expect(response.body.data.success).toBe(true);
      expect(response.body.data.dataType).toBe('test');
      expect(response.body.data.data).toEqual(testData);
    });

    it('filename 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/data-quality/restore')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('filename이 필요합니다');
    });
  });

  describe('GET /api/data-quality/backup-files', () => {
    it('백업 파일 목록을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/backup-files')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('백업 파일 정보를 올바르게 반환해야 함', async () => {
      // 백업 파일 생성
      const testData = { test: 'data' };
      await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: testData
        })
        .expect(200);

      const response = await request(app)
        .get('/api/data-quality/backup-files')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 0) {
        const file = response.body.data[0];
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('createdAt');
        expect(file).toHaveProperty('modifiedAt');
      }
    });
  });

  describe('GET /api/data-quality/metrics', () => {
    it('품질 메트릭을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalValidated');
      expect(response.body.data).toHaveProperty('totalErrors');
      expect(response.body.data).toHaveProperty('totalAnomalies');
      expect(response.body.data).toHaveProperty('totalBackups');
      expect(response.body.data).toHaveProperty('dataQualityScore');

      expect(typeof response.body.data.totalValidated).toBe('number');
      expect(typeof response.body.data.totalErrors).toBe('number');
      expect(typeof response.body.data.totalAnomalies).toBe('number');
      expect(typeof response.body.data.totalBackups).toBe('number');
      expect(typeof response.body.data.dataQualityScore).toBe('number');
    });
  });

  describe('GET /api/data-quality/validation-rules', () => {
    it('검증 규칙 목록을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/validation-rules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('price');
      expect(response.body.data).toContain('volume');
      expect(response.body.data).toContain('marketCap');
      expect(response.body.data).toContain('signal');
      expect(response.body.data).toContain('userProfile');
      expect(response.body.data).toContain('alert');
    });
  });

  describe('GET /api/data-quality/anomaly-detectors', () => {
    it('이상치 탐지기 목록을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/anomaly-detectors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('price');
      expect(response.body.data).toContain('volume');
      expect(response.body.data).toContain('marketCap');
      expect(response.body.data).toContain('signal');
    });
  });

  describe('GET /api/data-quality/backup-config', () => {
    it('백업 설정을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/backup-config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('interval');
      expect(response.body.data).toHaveProperty('retentionDays');
      expect(response.body.data).toHaveProperty('backupPath');
      expect(response.body.data).toHaveProperty('compressionEnabled');

      expect(typeof response.body.data.enabled).toBe('boolean');
      expect(typeof response.body.data.interval).toBe('number');
      expect(typeof response.body.data.retentionDays).toBe('number');
      expect(typeof response.body.data.backupPath).toBe('string');
      expect(typeof response.body.data.compressionEnabled).toBe('boolean');
    });
  });

  describe('PUT /api/data-quality/backup-config', () => {
    it('백업 설정을 업데이트해야 함', async () => {
      const newConfig = {
        enabled: false,
        interval: 3600000,
        retentionDays: 7
      };

      const response = await request(app)
        .put('/api/data-quality/backup-config')
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('업데이트되었습니다');
    });
  });

  describe('GET /api/data-quality/health', () => {
    it('서비스 헬스 체크를 수행해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('qualityScore');
      expect(response.body.data).toHaveProperty('lastCheck');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.qualityScore).toBe('number');
    });

    it('서비스가 중지된 상태에서도 헬스 체크가 가능해야 함', async () => {
      const response = await request(app)
        .get('/api/data-quality/health')
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
        .get('/api/data-quality/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 서비스 시작
      response = await request(app)
        .post('/api/data-quality/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/data-quality/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 데이터 검증
      response = await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: 45000,
          dataType: 'price'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);

      // 5. 배치 데이터 검증
      const priceArray = [45000, 46000, 47000, -100, 48000];
      response = await request(app)
        .post('/api/data-quality/validate-batch')
        .send({
          dataArray: priceArray,
          dataType: 'price'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalItems).toBe(5);

      // 6. 이상치 탐지
      const priceData = [
        { price: 45000, timestamp: new Date() },
        { price: 46000, timestamp: new Date() },
        { price: 100000, timestamp: new Date() } // 이상치
      ];
      response = await request(app)
        .post('/api/data-quality/detect-anomalies')
        .send({
          data: priceData,
          dataType: 'price'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalItems).toBe(3);

      // 7. 데이터 정제
      response = await request(app)
        .post('/api/data-quality/clean')
        .send({
          data: -100,
          dataType: 'price'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cleanedData).toBeNull();

      // 8. 데이터 백업
      const testData = { test: 'data', timestamp: new Date() };
      response = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: testData
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);

      // 9. 데이터 복구
      const filename = response.body.data.filename;
      response = await request(app)
        .post('/api/data-quality/restore')
        .send({
          filename
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);

      // 10. 품질 메트릭 조회
      response = await request(app)
        .get('/api/data-quality/metrics')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValidated).toBeGreaterThan(0);

      // 11. 백업 파일 목록 조회
      response = await request(app)
        .get('/api/data-quality/backup-files')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 12. 검증 규칙 조회
      response = await request(app)
        .get('/api/data-quality/validation-rules')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 13. 이상치 탐지기 조회
      response = await request(app)
        .get('/api/data-quality/anomaly-detectors')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 14. 백업 설정 조회
      response = await request(app)
        .get('/api/data-quality/backup-config')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 15. 백업 설정 업데이트
      const newConfig = { enabled: false };
      response = await request(app)
        .put('/api/data-quality/backup-config')
        .send(newConfig)
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 16. 헬스 체크
      response = await request(app)
        .get('/api/data-quality/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();

      // 17. 서비스 중지
      response = await request(app)
        .post('/api/data-quality/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 18. 최종 상태 확인
      response = await request(app)
        .get('/api/data-quality/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
