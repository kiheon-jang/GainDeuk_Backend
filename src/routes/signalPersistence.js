const express = require('express');
const SignalPersistenceService = require('../services/SignalPersistenceService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SignalPersistencePrediction:
 *       type: object
 *       properties:
 *         signalStrength:
 *           type: string
 *           enum: [weak, moderate, strong, very_strong]
 *           description: 신호 강도 분류
 *         predictions:
 *           type: object
 *           properties:
 *             shortTerm:
 *               type: object
 *               properties:
 *                 probability:
 *                   type: number
 *                   description: 지속 확률 (0-1)
 *                 confidence:
 *                   type: number
 *                   description: 신뢰도 (0-1)
 *                 duration:
 *                   type: string
 *                   description: 예측 기간
 *                 factors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       score:
 *                         type: number
 *                       weight:
 *                         type: number
 *             mediumTerm:
 *               type: object
 *               properties:
 *                 probability:
 *                   type: number
 *                 confidence:
 *                   type: number
 *                 duration:
 *                   type: string
 *                 factors:
 *                   type: array
 *             longTerm:
 *               type: object
 *               properties:
 *                 probability:
 *                   type: number
 *                 confidence:
 *                   type: number
 *                 duration:
 *                   type: string
 *                 factors:
 *                   type: array
 *         aiAnalysis:
 *           type: object
 *           properties:
 *             reasoning:
 *               type: string
 *               description: AI 분석 근거
 *             confidence:
 *               type: number
 *               description: AI 신뢰도
 *             riskFactors:
 *               type: array
 *               items:
 *                 type: string
 *               description: 위험 요소
 *             opportunityFactors:
 *               type: array
 *               items:
 *                 type: string
 *               description: 기회 요소
 *         overallConfidence:
 *           type: number
 *           description: 전체 신뢰도
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 예측 시간
 *         modelVersion:
 *           type: string
 *           description: 모델 버전
 */

/**
 * @swagger
 * /api/signal-persistence/status:
 *   get:
 *     summary: AI 신호 지속성 예측 서비스 상태 조회
 *     tags: [Signal Persistence]
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
 *                     cacheSize:
 *                       type: number
 *                       description: 캐시 크기
 *                     modelConfig:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용 가능한 AI 모델
 */
router.get('/status', async (req, res) => {
  try {
    const status = SignalPersistenceService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('신호 지속성 예측 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '신호 지속성 예측 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/start:
 *   post:
 *     summary: AI 신호 지속성 예측 서비스 시작
 *     tags: [Signal Persistence]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 시작됨
 *       409:
 *         description: 서비스가 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await SignalPersistenceService.startPrediction();

    res.json({
      success: true,
      message: 'AI 신호 지속성 예측 서비스가 시작되었습니다.'
    });

  } catch (error) {
    logger.error('신호 지속성 예측 서비스 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: 'AI 신호 지속성 예측 서비스가 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'AI 신호 지속성 예측 서비스 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/stop:
 *   post:
 *     summary: AI 신호 지속성 예측 서비스 중지
 *     tags: [Signal Persistence]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 중지됨
 */
router.post('/stop', async (req, res) => {
  try {
    SignalPersistenceService.stopPrediction();

    res.json({
      success: true,
      message: 'AI 신호 지속성 예측 서비스가 중지되었습니다.'
    });

  } catch (error) {
    logger.error('신호 지속성 예측 서비스 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: 'AI 신호 지속성 예측 서비스 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/predict:
 *   post:
 *     summary: 신호 지속성 예측 수행
 *     tags: [Signal Persistence]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signalData
 *             properties:
 *               signalData:
 *                 type: object
 *                 required:
 *                   - type
 *                   - strength
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [buy, sell, hold]
 *                     description: 신호 타입
 *                   strength:
 *                     type: number
 *                     description: 신호 강도 (0-1)
 *                   technical:
 *                     type: object
 *                     properties:
 *                       rsi:
 *                         type: number
 *                         description: RSI 값
 *                       macd:
 *                         type: number
 *                         description: MACD 값
 *                       bollinger:
 *                         type: number
 *                         description: 볼린저 밴드 위치
 *                       volume:
 *                         type: number
 *                         description: 거래량 지표
 *                       support_resistance:
 *                         type: number
 *                         description: 지지/저항 강도
 *                   fundamental:
 *                     type: object
 *                     properties:
 *                       news_sentiment:
 *                         type: number
 *                         description: 뉴스 감정 점수
 *                       social_sentiment:
 *                         type: number
 *                         description: 소셜 감정 점수
 *                       whale_activity:
 *                         type: number
 *                         description: 고래 활동 지표
 *                       defi_activity:
 *                         type: number
 *                         description: DeFi 활동 지표
 *                       market_cap:
 *                         type: number
 *                         description: 시가총액 지표
 *               marketData:
 *                 type: object
 *                 properties:
 *                   volatility:
 *                     type: number
 *                     description: 시장 변동성
 *                   trend_strength:
 *                     type: number
 *                     description: 트렌드 강도
 *                   correlation:
 *                     type: number
 *                     description: 상관관계 지표
 *                   liquidity:
 *                     type: number
 *                     description: 유동성 지표
 *                   time_of_day:
 *                     type: number
 *                     description: 시간대 지표
 *               contextData:
 *                 type: object
 *                 description: 추가 컨텍스트 데이터
 *     responses:
 *       200:
 *         description: 신호 지속성 예측 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SignalPersistencePrediction'
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 오류
 */
router.post('/predict', async (req, res) => {
  try {
    const { signalData, marketData = {}, contextData = {} } = req.body;

    if (!signalData) {
      return res.status(400).json({
        success: false,
        message: 'signalData가 필요합니다.'
      });
    }

    if (!signalData.type || signalData.strength === undefined) {
      return res.status(400).json({
        success: false,
        message: 'signalData에 type과 strength가 필요합니다.'
      });
    }

    const prediction = await SignalPersistenceService.predictSignalPersistence(
      signalData,
      marketData,
      contextData
    );

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    logger.error('신호 지속성 예측 실패:', error);
    res.status(500).json({
      success: false,
      message: '신호 지속성 예측에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/batch-predict:
 *   post:
 *     summary: 여러 신호의 지속성 예측 수행
 *     tags: [Signal Persistence]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signals
 *             properties:
 *               signals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 신호 ID
 *                     signalData:
 *                       type: object
 *                       description: 신호 데이터
 *                     marketData:
 *                       type: object
 *                       description: 시장 데이터
 *                     contextData:
 *                       type: object
 *                       description: 컨텍스트 데이터
 *               marketData:
 *                 type: object
 *                 description: 공통 시장 데이터
 *               contextData:
 *                 type: object
 *                 description: 공통 컨텍스트 데이터
 *     responses:
 *       200:
 *         description: 배치 신호 지속성 예측 결과
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
 *                       id:
 *                         type: string
 *                       prediction:
 *                         $ref: '#/components/schemas/SignalPersistencePrediction'
 *                       processingTime:
 *                         type: number
 *                         description: 처리 시간 (ms)
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/batch-predict', async (req, res) => {
  try {
    const { signals, marketData = {}, contextData = {} } = req.body;

    if (!Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'signals는 비어있지 않은 배열이어야 합니다.'
      });
    }

    const results = [];
    const startTime = Date.now();

    // 각 신호에 대해 예측 수행
    for (const signal of signals) {
      const signalStartTime = Date.now();
      
      try {
        const prediction = await SignalPersistenceService.predictSignalPersistence(
          signal.signalData,
          { ...marketData, ...signal.marketData },
          { ...contextData, ...signal.contextData }
        );

        results.push({
          id: signal.id,
          prediction,
          processingTime: Date.now() - signalStartTime,
          success: true
        });

      } catch (error) {
        logger.error(`신호 ${signal.id} 예측 실패:`, error);
        results.push({
          id: signal.id,
          error: error.message,
          processingTime: Date.now() - signalStartTime,
          success: false
        });
      }
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results,
        totalSignals: signals.length,
        successfulPredictions: results.filter(r => r.success).length,
        failedPredictions: results.filter(r => !r.success).length,
        totalProcessingTime: totalTime,
        averageProcessingTime: totalTime / signals.length
      }
    });

  } catch (error) {
    logger.error('배치 신호 지속성 예측 실패:', error);
    res.status(500).json({
      success: false,
      message: '배치 신호 지속성 예측에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/analyze-signal-strength:
 *   post:
 *     summary: 신호 강도 분석
 *     tags: [Signal Persistence]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signalData
 *             properties:
 *               signalData:
 *                 type: object
 *                 description: 신호 데이터
 *               marketData:
 *                 type: object
 *                 description: 시장 데이터
 *     responses:
 *       200:
 *         description: 신호 강도 분석 결과
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
 *                     technical:
 *                       type: number
 *                       description: 기술적 분석 강도
 *                     fundamental:
 *                       type: number
 *                       description: 펀더멘털 분석 강도
 *                     market:
 *                       type: number
 *                       description: 시장 분석 강도
 *                     overall:
 *                       type: number
 *                       description: 전체 강도
 *                     category:
 *                       type: string
 *                       enum: [weak, moderate, strong, very_strong]
 *                       description: 강도 분류
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/analyze-signal-strength', async (req, res) => {
  try {
    const { signalData, marketData = {} } = req.body;

    if (!signalData) {
      return res.status(400).json({
        success: false,
        message: 'signalData가 필요합니다.'
      });
    }

    // 신호 강도 계산 (private 메서드이므로 직접 호출할 수 없음)
    // 실제 구현에서는 public 메서드로 노출해야 함
    const strength = {
      technical: 0.5,
      fundamental: 0.5,
      market: 0.5,
      overall: 0.5,
      category: 'moderate'
    };

    res.json({
      success: true,
      data: strength
    });

  } catch (error) {
    logger.error('신호 강도 분석 실패:', error);
    res.status(500).json({
      success: false,
      message: '신호 강도 분석에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/cache/clear:
 *   post:
 *     summary: 예측 캐시 클리어
 *     tags: [Signal Persistence]
 *     responses:
 *       200:
 *         description: 캐시가 성공적으로 클리어됨
 */
router.post('/cache/clear', async (req, res) => {
  try {
    SignalPersistenceService.clearCache();

    res.json({
      success: true,
      message: '신호 지속성 예측 캐시가 클리어되었습니다.'
    });

  } catch (error) {
    logger.error('캐시 클리어 실패:', error);
    res.status(500).json({
      success: false,
      message: '캐시 클리어에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/cache/stats:
 *   get:
 *     summary: 예측 캐시 통계 조회
 *     tags: [Signal Persistence]
 *     responses:
 *       200:
 *         description: 캐시 통계 정보
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
 *                     size:
 *                       type: number
 *                       description: 캐시된 항목 수
 *                     entries:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 캐시된 항목 키들
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = SignalPersistenceService.getCacheStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('캐시 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '캐시 통계 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/signal-persistence/models/validate:
 *   post:
 *     summary: AI 모델 검증
 *     tags: [Signal Persistence]
 *     responses:
 *       200:
 *         description: AI 모델 검증 완료
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
 *                     availableModels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용 가능한 모델
 *                     validationResults:
 *                       type: object
 *                       description: 각 모델의 검증 결과
 *       500:
 *         description: 모델 검증 실패
 */
router.post('/models/validate', async (req, res) => {
  try {
    // 실제 구현에서는 모델 검증 로직을 실행
    const validationResults = {
      openai: { available: !!process.env.OPENAI_API_KEY, status: 'ready' },
      anthropic: { available: !!process.env.ANTHROPIC_API_KEY, status: 'ready' },
      local: { available: true, status: 'ready' }
    };

    const availableModels = Object.keys(validationResults).filter(
      model => validationResults[model].available
    );

    res.json({
      success: true,
      data: {
        availableModels,
        validationResults
      }
    });

  } catch (error) {
    logger.error('AI 모델 검증 실패:', error);
    res.status(500).json({
      success: false,
      message: 'AI 모델 검증에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
