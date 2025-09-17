const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const Alert = require('../models/Alert');

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: 알림 생성
 *     description: 새로운 알림을 생성합니다.
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coinId
 *               - alertType
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID (선택사항)
 *               coinId:
 *                 type: string
 *                 description: 코인 ID
 *               symbol:
 *                 type: string
 *                 description: 코인 심볼
 *               alertType:
 *                 type: string
 *                 enum: [STRONG_SIGNAL, PRICE_TARGET, VOLUME_SPIKE, WHALE_MOVE, CUSTOM]
 *                 description: 알림 타입
 *               triggerScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: 트리거 점수
 *               settings:
 *                 type: object
 *                 properties:
 *                   minScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                     default: 80
 *                   maxScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                     default: 20
 *                   timeframes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *                   notificationEnabled:
 *                     type: boolean
 *                     default: true
 *                   emailEnabled:
 *                     type: boolean
 *                     default: false
 *                   pushEnabled:
 *                     type: boolean
 *                     default: true
 *                   webhookUrl:
 *                     type: string
 *                     format: uri
 *                   cooldownMinutes:
 *                     type: number
 *                     minimum: 0
 *                     default: 60
 *     responses:
 *       201:
 *         description: 알림 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/', [
  body('coinId').notEmpty().withMessage('코인 ID는 필수입니다'),
  body('symbol').optional().isString().withMessage('심볼은 문자열이어야 합니다'),
  body('alertType').isIn(['STRONG_SIGNAL', 'PRICE_TARGET', 'VOLUME_SPIKE', 'WHALE_MOVE', 'CUSTOM']).withMessage('유효하지 않은 알림 타입입니다'),
  body('triggerScore').optional().isFloat({ min: 0, max: 100 }).withMessage('트리거 점수는 0-100 사이의 숫자여야 합니다'),
  body('settings.minScore').optional().isFloat({ min: 0, max: 100 }).withMessage('최소 점수는 0-100 사이의 숫자여야 합니다'),
  body('settings.maxScore').optional().isFloat({ min: 0, max: 100 }).withMessage('최대 점수는 0-100 사이의 숫자여야 합니다'),
  body('settings.cooldownMinutes').optional().isInt({ min: 0 }).withMessage('쿨다운 시간은 0 이상의 정수여야 합니다'),
  body('settings.webhookUrl').optional().isURL().withMessage('유효하지 않은 웹훅 URL입니다')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다',
        details: errors.array()
      });
    }

    const { coinId, symbol, alertType, triggerScore, settings = {} } = req.body;
    const userId = req.body.userId || null;

    // 알림 생성
    const alert = new Alert({
      userId,
      coinId,
      symbol: symbol ? symbol.toUpperCase() : undefined,
      alertType,
      triggerScore: triggerScore || 50,
      settings: {
        minScore: settings.minScore || 80,
        maxScore: settings.maxScore || 20,
        timeframes: settings.timeframes || [],
        notificationEnabled: settings.notificationEnabled !== false,
        emailEnabled: settings.emailEnabled || false,
        pushEnabled: settings.pushEnabled !== false,
        webhookUrl: settings.webhookUrl || undefined,
        cooldownMinutes: settings.cooldownMinutes || 60
      },
      metadata: {
        priority: settings.priority || 'medium'
      }
    });

    await alert.save();

    logger.success(`Alert created for ${coinId}: ${alertType}`);
    res.status(201).json({
      success: true,
      data: alert.toObject()
    });
  } catch (error) {
    logger.error('Failed to create alert:', error);
    res.status(500).json({
      success: false,
      error: '알림 생성에 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/alerts/triggered:
 *   get:
 *     summary: 트리거된 알림 조회
 *     description: 트리거된 알림 목록을 반환합니다.
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 사용자 ID 필터
 *       - in: query
 *         name: alertType
 *         schema:
 *           type: string
 *           enum: [STRONG_SIGNAL, PRICE_TARGET, VOLUME_SPIKE, WHALE_MOVE, CUSTOM]
 *         description: 알림 타입 필터
 *     responses:
 *       200:
 *         description: 트리거된 알림 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/triggered', [
  query('page').optional().isInt({ min: 1 }).withMessage('페이지는 1 이상의 정수여야 합니다'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('제한은 1-100 사이의 정수여야 합니다'),
  query('userId').optional().isString().withMessage('사용자 ID는 문자열이어야 합니다'),
  query('alertType').optional().isIn(['STRONG_SIGNAL', 'PRICE_TARGET', 'VOLUME_SPIKE', 'WHALE_MOVE', 'CUSTOM']).withMessage('유효하지 않은 알림 타입입니다')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.query.userId;
    const alertType = req.query.alertType;

    // 쿼리 조건 구성
    const query = { isTriggered: true };
    
    if (userId) {
      query.userId = userId;
    }
    
    if (alertType) {
      query.alertType = alertType;
    }

    // 데이터베이스 쿼리
    const skip = (page - 1) * limit;
    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ triggeredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query)
    ]);

    const result = {
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    logger.success(`Retrieved ${alerts.length} triggered alerts (page ${page})`);
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve triggered alerts:', error);
    res.status(500).json({
      success: false,
      error: '트리거된 알림을 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   get:
 *     summary: 특정 알림 조회
 *     description: 알림 ID로 특정 알림을 조회합니다.
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       404:
 *         description: 알림을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:alertId', [
  param('alertId').isMongoId().withMessage('유효하지 않은 알림 ID입니다')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다',
        details: errors.array()
      });
    }

    const { alertId } = req.params;

    // 알림 조회
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다'
      });
    }

    logger.success(`Retrieved alert ${alertId}`);
    res.json({
      success: true,
      data: alert.toObject()
    });
  } catch (error) {
    logger.error(`Failed to retrieve alert ${req.params.alertId}:`, error);
    res.status(500).json({
      success: false,
      error: '알림을 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   put:
 *     summary: 알림 업데이트
 *     description: 기존 알림을 업데이트합니다.
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 properties:
 *                   minScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                   maxScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                   timeframes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *                   notificationEnabled:
 *                     type: boolean
 *                   emailEnabled:
 *                     type: boolean
 *                   pushEnabled:
 *                     type: boolean
 *                   webhookUrl:
 *                     type: string
 *                     format: uri
 *                   cooldownMinutes:
 *                     type: number
 *                     minimum: 0
 *     responses:
 *       200:
 *         description: 알림 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       404:
 *         description: 알림을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:alertId', [
  param('alertId').isMongoId().withMessage('유효하지 않은 알림 ID입니다'),
  body('settings.minScore').optional().isFloat({ min: 0, max: 100 }).withMessage('최소 점수는 0-100 사이의 숫자여야 합니다'),
  body('settings.maxScore').optional().isFloat({ min: 0, max: 100 }).withMessage('최대 점수는 0-100 사이의 숫자여야 합니다'),
  body('settings.cooldownMinutes').optional().isInt({ min: 0 }).withMessage('쿨다운 시간은 0 이상의 정수여야 합니다'),
  body('settings.webhookUrl').optional().isURL().withMessage('유효하지 않은 웹훅 URL입니다')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다',
        details: errors.array()
      });
    }

    const { alertId } = req.params;
    const { settings } = req.body;

    // 알림 조회
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다'
      });
    }

    // 설정 업데이트
    if (settings) {
      await alert.updateSettings(settings);
    }

    logger.success(`Alert ${alertId} updated`);
    res.json({
      success: true,
      data: alert.toObject()
    });
  } catch (error) {
    logger.error(`Failed to update alert ${req.params.alertId}:`, error);
    res.status(500).json({
      success: false,
      error: '알림 업데이트에 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   delete:
 *     summary: 알림 삭제
 *     description: 알림을 삭제합니다.
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "알림이 삭제되었습니다"
 *       404:
 *         description: 알림을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:alertId', [
  param('alertId').isMongoId().withMessage('유효하지 않은 알림 ID입니다')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다',
        details: errors.array()
      });
    }

    const { alertId } = req.params;

    // 알림 삭제
    const alert = await Alert.findByIdAndDelete(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다'
      });
    }

    logger.success(`Alert ${alertId} deleted`);
    res.json({
      success: true,
      message: '알림이 삭제되었습니다'
    });
  } catch (error) {
    logger.error(`Failed to delete alert ${req.params.alertId}:`, error);
    res.status(500).json({
      success: false,
      error: '알림 삭제에 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/alerts/stats:
 *   get:
 *     summary: 알림 통계
 *     description: 알림 관련 통계 정보를 반환합니다.
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: 통계 조회 성공
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
 *                     totalAlerts:
 *                       type: integer
 *                     activeAlerts:
 *                       type: integer
 *                     triggeredAlerts:
 *                       type: integer
 *                     strongSignalAlerts:
 *                       type: integer
 *                     priceTargetAlerts:
 *                       type: integer
 *                     volumeSpikeAlerts:
 *                       type: integer
 *                     whaleMoveAlerts:
 *                       type: integer
 *       500:
 *         description: 서버 오류
 */
router.get('/stats', async (req, res) => {
  try {
    // 통계 조회
    const stats = await Alert.getAlertStats();

    const result = {
      success: true,
      data: stats[0] || {
        totalAlerts: 0,
        activeAlerts: 0,
        triggeredAlerts: 0,
        strongSignalAlerts: 0,
        priceTargetAlerts: 0,
        volumeSpikeAlerts: 0,
        whaleMoveAlerts: 0
      }
    };

    logger.success('Retrieved alert statistics');
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve alert stats:', error);
    res.status(500).json({
      success: false,
      error: '알림 통계를 가져오는데 실패했습니다'
    });
  }
});

module.exports = router;
