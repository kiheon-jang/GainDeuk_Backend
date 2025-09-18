const express = require('express');
const DataQualityService = require('../services/DataQualityService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/data-quality:
 *   get:
 *     summary: 데이터 품질 관리 서비스 개요
 *     description: 데이터 품질 검증 및 이상치 탐지 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 데이터 품질 서비스 개요 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                       example: "data-quality"
 *                     description:
 *                       type: string
 *                       example: "데이터 품질 검증 및 이상치 탐지 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/validate", "/anomalies", "/health", "/metrics", "/reports"]
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T07:37:48.372Z"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "maintenance"]
 *                       example: "active"
 */

// 루트 엔드포인트 - 데이터 품질 서비스 개요
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        module: 'data-quality',
        description: '데이터 품질 검증 및 이상치 탐지 서비스',
        availableEndpoints: [
          '/validate',
          '/anomalies',
          '/health',
          '/metrics',
          '/reports'
        ],
        lastUpdate: new Date().toISOString(),
        status: 'active'
      }
    });

  } catch (error) {
    logger.error('데이터 품질 서비스 개요 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ValidationResult:
 *       type: object
 *       properties:
 *         isValid:
 *           type: boolean
 *           description: 검증 성공 여부
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           description: 검증 오류 목록
 *         warnings:
 *           type: array
 *           items:
 *             type: string
 *           description: 검증 경고 목록
 *         dataType:
 *           type: string
 *           description: 데이터 타입
 *         validatedAt:
 *           type: string
 *           format: date-time
 *           description: 검증 시간
 *         originalData:
 *           description: 원본 데이터
 *     
 *     AnomalyDetectionResult:
 *       type: object
 *       properties:
 *         dataType:
 *           type: string
 *           description: 데이터 타입
 *         totalItems:
 *           type: number
 *           description: 전체 항목 수
 *         anomaliesFound:
 *           type: number
 *           description: 발견된 이상치 수
 *         anomalies:
 *           type: array
 *           description: 이상치 목록
 *         detectionMethod:
 *           type: string
 *           description: 탐지 방법
 *         threshold:
 *           type: number
 *           description: 임계값
 *         detectedAt:
 *           type: string
 *           format: date-time
 *           description: 탐지 시간
 *     
 *     DataCleaningResult:
 *       type: object
 *       properties:
 *         originalData:
 *           description: 원본 데이터
 *         cleanedData:
 *           description: 정제된 데이터
 *         changes:
 *           type: array
 *           items:
 *             type: string
 *           description: 변경 사항 목록
 *         cleanedAt:
 *           type: string
 *           format: date-time
 *           description: 정제 시간
 *     
 *     BackupResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 백업 성공 여부
 *         filename:
 *           type: string
 *           description: 백업 파일명
 *         filepath:
 *           type: string
 *           description: 백업 파일 경로
 *         size:
 *           type: number
 *           description: 파일 크기
 *         backedUpAt:
 *           type: string
 *           format: date-time
 *           description: 백업 시간
 *     
 *     QualityMetrics:
 *       type: object
 *       properties:
 *         totalValidated:
 *           type: number
 *           description: 총 검증된 항목 수
 *         totalErrors:
 *           type: number
 *           description: 총 오류 수
 *         totalAnomalies:
 *           type: number
 *           description: 총 이상치 수
 *         totalBackups:
 *           type: number
 *           description: 총 백업 수
 *         lastValidationAt:
 *           type: string
 *           format: date-time
 *           description: 마지막 검증 시간
 *         lastBackupAt:
 *           type: string
 *           format: date-time
 *           description: 마지막 백업 시간
 *         dataQualityScore:
 *           type: number
 *           description: 데이터 품질 점수
 */

/**
 * @swagger
 * /api/data-quality/status:
 *   get:
 *     summary: 데이터 품질 관리 서비스 상태 조회
 *     tags: [Data Quality]
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
 *                     validationRules:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용 가능한 검증 규칙
 *                     anomalyDetectors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용 가능한 이상치 탐지기
 *                     backupConfig:
 *                       type: object
 *                       description: 백업 설정
 *                     qualityMetrics:
 *                       $ref: '#/components/schemas/QualityMetrics'
 */
router.get('/status', async (req, res) => {
  try {
    const status = DataQualityService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('데이터 품질 서비스 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 품질 서비스 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/start:
 *   post:
 *     summary: 데이터 품질 관리 서비스 시작
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 시작됨
 *       409:
 *         description: 서비스가 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await DataQualityService.startService();

    res.json({
      success: true,
      message: '데이터 품질 관리 서비스가 시작되었습니다.'
    });

  } catch (error) {
    logger.error('데이터 품질 서비스 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '데이터 품질 관리 서비스가 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '데이터 품질 관리 서비스 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/stop:
 *   post:
 *     summary: 데이터 품질 관리 서비스 중지
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 중지됨
 */
router.post('/stop', async (req, res) => {
  try {
    DataQualityService.stopService();

    res.json({
      success: true,
      message: '데이터 품질 관리 서비스가 중지되었습니다.'
    });

  } catch (error) {
    logger.error('데이터 품질 서비스 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 품질 관리 서비스 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/validate:
 *   post:
 *     summary: 데이터 검증
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - dataType
 *             properties:
 *               data:
 *                 description: 검증할 데이터
 *               dataType:
 *                 type: string
 *                 enum: [price, volume, marketCap, signal, userProfile, alert]
 *                 description: 데이터 타입
 *               options:
 *                 type: object
 *                 description: 검증 옵션
 *     responses:
 *       200:
 *         description: 데이터 검증 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ValidationResult'
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/validate', async (req, res) => {
  try {
    const { data, dataType, options = {} } = req.body;

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: 'data가 필요합니다.'
      });
    }

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType이 필요합니다.'
      });
    }

    const result = DataQualityService.validateData(data, dataType, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('데이터 검증 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 검증에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/validate-batch:
 *   post:
 *     summary: 배치 데이터 검증
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataArray
 *               - dataType
 *             properties:
 *               dataArray:
 *                 type: array
 *                 description: 검증할 데이터 배열
 *               dataType:
 *                 type: string
 *                 enum: [price, volume, marketCap, signal, userProfile, alert]
 *                 description: 데이터 타입
 *               options:
 *                 type: object
 *                 description: 검증 옵션
 *     responses:
 *       200:
 *         description: 배치 데이터 검증 결과
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
 *                     totalItems:
 *                       type: number
 *                     validItems:
 *                       type: number
 *                     invalidItems:
 *                       type: number
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                     itemResults:
 *                       type: array
 *                     validatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/validate-batch', async (req, res) => {
  try {
    const { dataArray, dataType, options = {} } = req.body;

    if (!Array.isArray(dataArray)) {
      return res.status(400).json({
        success: false,
        message: 'dataArray는 배열이어야 합니다.'
      });
    }

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType이 필요합니다.'
      });
    }

    const result = DataQualityService.validateBatchData(dataArray, dataType, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('배치 데이터 검증 실패:', error);
    res.status(500).json({
      success: false,
      message: '배치 데이터 검증에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/detect-anomalies:
 *   post:
 *     summary: 이상치 탐지
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - dataType
 *             properties:
 *               data:
 *                 type: array
 *                 description: 탐지할 데이터 배열
 *               dataType:
 *                 type: string
 *                 enum: [price, volume, marketCap, signal]
 *                 description: 데이터 타입
 *               options:
 *                 type: object
 *                 description: 탐지 옵션
 *     responses:
 *       200:
 *         description: 이상치 탐지 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AnomalyDetectionResult'
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/detect-anomalies', async (req, res) => {
  try {
    const { data, dataType, options = {} } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'data는 배열이어야 합니다.'
      });
    }

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType이 필요합니다.'
      });
    }

    const result = DataQualityService.detectAnomalies(data, dataType, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('이상치 탐지 실패:', error);
    res.status(500).json({
      success: false,
      message: '이상치 탐지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/clean:
 *   post:
 *     summary: 데이터 정제
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - dataType
 *             properties:
 *               data:
 *                 description: 정제할 데이터
 *               dataType:
 *                 type: string
 *                 enum: [price, volume, marketCap, signal, userProfile, alert]
 *                 description: 데이터 타입
 *               options:
 *                 type: object
 *                 description: 정제 옵션
 *     responses:
 *       200:
 *         description: 데이터 정제 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DataCleaningResult'
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/clean', async (req, res) => {
  try {
    const { data, dataType, options = {} } = req.body;

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: 'data가 필요합니다.'
      });
    }

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType이 필요합니다.'
      });
    }

    const result = DataQualityService.cleanData(data, dataType, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('데이터 정제 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 정제에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/backup:
 *   post:
 *     summary: 데이터 백업
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataType
 *               - data
 *             properties:
 *               dataType:
 *                 type: string
 *                 description: 백업할 데이터 타입
 *               data:
 *                 description: 백업할 데이터
 *               options:
 *                 type: object
 *                 properties:
 *                   metadata:
 *                     type: object
 *                     description: 메타데이터
 *     responses:
 *       200:
 *         description: 데이터 백업 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BackupResult'
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/backup', async (req, res) => {
  try {
    const { dataType, data, options = {} } = req.body;

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType이 필요합니다.'
      });
    }

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: 'data가 필요합니다.'
      });
    }

    const result = await DataQualityService.backupData(dataType, data, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('데이터 백업 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 백업에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/restore:
 *   post:
 *     summary: 데이터 복구
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 복구할 백업 파일명
 *               options:
 *                 type: object
 *                 description: 복구 옵션
 *     responses:
 *       200:
 *         description: 데이터 복구 결과
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
 *                     success:
 *                       type: boolean
 *                     dataType:
 *                       type: string
 *                     data:
 *                       description: 복구된 데이터
 *                     backupAt:
 *                       type: string
 *                       format: date-time
 *                     restoredAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/restore', async (req, res) => {
  try {
    const { filename, options = {} } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'filename이 필요합니다.'
      });
    }

    const result = await DataQualityService.restoreData(filename, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('데이터 복구 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 복구에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/backup-files:
 *   get:
 *     summary: 백업 파일 목록 조회
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 백업 파일 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       modifiedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/backup-files', async (req, res) => {
  try {
    const files = await DataQualityService.getBackupFiles();

    res.json({
      success: true,
      data: files
    });

  } catch (error) {
    logger.error('백업 파일 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '백업 파일 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/metrics:
 *   get:
 *     summary: 품질 메트릭 조회
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 품질 메트릭 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QualityMetrics'
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = DataQualityService.getQualityMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('품질 메트릭 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '품질 메트릭 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/validation-rules:
 *   get:
 *     summary: 검증 규칙 목록 조회
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 검증 규칙 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/validation-rules', async (req, res) => {
  try {
    const status = DataQualityService.getStatus();
    const rules = status.validationRules;

    res.json({
      success: true,
      data: rules
    });

  } catch (error) {
    logger.error('검증 규칙 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '검증 규칙 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/anomaly-detectors:
 *   get:
 *     summary: 이상치 탐지기 목록 조회
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 이상치 탐지기 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/anomaly-detectors', async (req, res) => {
  try {
    const status = DataQualityService.getStatus();
    const detectors = status.anomalyDetectors;

    res.json({
      success: true,
      data: detectors
    });

  } catch (error) {
    logger.error('이상치 탐지기 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '이상치 탐지기 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/backup-config:
 *   get:
 *     summary: 백업 설정 조회
 *     tags: [Data Quality]
 *     responses:
 *       200:
 *         description: 백업 설정 정보
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
 *                     enabled:
 *                       type: boolean
 *                     interval:
 *                       type: number
 *                     retentionDays:
 *                       type: number
 *                     backupPath:
 *                       type: string
 *                     compressionEnabled:
 *                       type: boolean
 */
router.get('/backup-config', async (req, res) => {
  try {
    const status = DataQualityService.getStatus();
    const config = status.backupConfig;

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('백업 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '백업 설정 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/backup-config:
 *   put:
 *     summary: 백업 설정 업데이트
 *     tags: [Data Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: 백업 활성화 여부
 *               interval:
 *                 type: number
 *                 description: 백업 간격 (ms)
 *               retentionDays:
 *                 type: number
 *                 description: 백업 보관 기간 (일)
 *               backupPath:
 *                 type: string
 *                 description: 백업 경로
 *               compressionEnabled:
 *                 type: boolean
 *                 description: 압축 활성화 여부
 *     responses:
 *       200:
 *         description: 백업 설정이 성공적으로 업데이트됨
 */
router.put('/backup-config', async (req, res) => {
  try {
    const newConfig = req.body;
    DataQualityService.updateBackupConfig(newConfig);

    res.json({
      success: true,
      message: '백업 설정이 업데이트되었습니다.'
    });

  } catch (error) {
    logger.error('백업 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '백업 설정 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/data-quality/health:
 *   get:
 *     summary: 서비스 헬스 체크
 *     tags: [Data Quality]
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
 *                     qualityScore:
 *                       type: number
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 */
router.get('/health', async (req, res) => {
  try {
    const status = DataQualityService.getStatus();
    const metrics = DataQualityService.getQualityMetrics();
    
    // 헬스 체크 로직
    let healthStatus = 'healthy';
    
    if (!status.isRunning) {
      healthStatus = 'unhealthy';
    } else if (metrics.dataQualityScore < 80) {
      healthStatus = 'degraded';
    }

    res.json({
      success: true,
      data: {
        status: healthStatus,
        isRunning: status.isRunning,
        qualityScore: metrics.dataQualityScore,
        lastCheck: new Date()
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
