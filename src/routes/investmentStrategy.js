const express = require('express');
const InvestmentStrategyService = require('../services/InvestmentStrategyService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/investment-strategy:
 *   get:
 *     summary: 투자 전략 서비스 개요
 *     description: 개인화된 투자 전략 생성 및 관리 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [Investment Strategy]
 *     responses:
 *       200:
 *         description: 투자 전략 서비스 개요 정보
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
 *                       example: "investment-strategy"
 *                     description:
 *                       type: string
 *                       example: "개인화된 투자 전략 생성 및 관리 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/strategies", "/personalize", "/backtest", "/optimize", "/recommendations"]
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T07:37:48.372Z"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "maintenance"]
 *                       example: "active"
 */

// 루트 엔드포인트 - 투자 전략 서비스 개요
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        module: 'investment-strategy',
        description: '개인화된 투자 전략 생성 및 관리 서비스',
        availableEndpoints: [
          '/strategies',
          '/personalize',
          '/backtest',
          '/optimize',
          '/recommendations'
        ],
        lastUpdate: new Date().toISOString(),
        status: 'active'
      }
    });

  } catch (error) {
    logger.error('투자 전략 서비스 개요 조회 실패:', error);
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
 *     PersonalizedStrategy:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 전략 ID
 *         name:
 *           type: string
 *           description: 전략명
 *         type:
 *           type: string
 *           description: 전략 타입
 *         baseStrategy:
 *           type: string
 *           description: 기본 전략명
 *         allocation:
 *           type: object
 *           properties:
 *             stablecoins:
 *               type: number
 *               description: 스테이블코인 비중
 *             bluechip:
 *               type: number
 *               description: 블루칩 코인 비중
 *             defi:
 *               type: number
 *               description: DeFi 토큰 비중
 *             altcoins:
 *               type: number
 *               description: 알트코인 비중
 *         riskManagement:
 *           type: object
 *           properties:
 *             maxPositionSize:
 *               type: number
 *               description: 최대 포지션 크기
 *             stopLoss:
 *               type: number
 *               description: 손절매 비율
 *             takeProfit:
 *               type: number
 *               description: 익절매 비율
 *             maxDrawdown:
 *               type: number
 *               description: 최대 낙폭
 *         tradingRules:
 *           type: object
 *           properties:
 *             entryConditions:
 *               type: array
 *               items:
 *                 type: string
 *               description: 진입 조건
 *             exitConditions:
 *               type: array
 *               items:
 *                 type: string
 *               description: 청산 조건
 *             rebalanceFrequency:
 *               type: string
 *               description: 리밸런싱 빈도
 *         metadata:
 *           type: object
 *           properties:
 *             confidence:
 *               type: number
 *               description: 신뢰도
 *             reasoning:
 *               type: string
 *               description: 전략 선택 근거
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *               description: 추천사항
 *             warnings:
 *               type: array
 *               items:
 *                 type: string
 *               description: 주의사항
 *             marketCondition:
 *               type: string
 *               description: 시장 상황
 *             riskLevel:
 *               type: number
 *               description: 리스크 레벨
 *             timeHorizon:
 *               type: string
 *               description: 시간 지평
 *             targetReturn:
 *               type: number
 *               description: 목표 수익률
 *             maxVolatility:
 *               type: number
 *               description: 최대 변동성
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성 시간
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: 만료 시간
 *         version:
 *           type: string
 *           description: 버전
 */

/**
 * @swagger
 * /api/investment-strategy/status:
 *   get:
 *     summary: 투자 전략 생성 서비스 상태 조회
 *     tags: [Investment Strategy]
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
 *                     strategyTemplates:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용 가능한 전략 템플릿
 */
router.get('/status', async (req, res) => {
  try {
    const status = InvestmentStrategyService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('투자 전략 서비스 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '투자 전략 서비스 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/start:
 *   post:
 *     summary: 투자 전략 생성 서비스 시작
 *     tags: [Investment Strategy]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 시작됨
 *       409:
 *         description: 서비스가 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await InvestmentStrategyService.startService();

    res.json({
      success: true,
      message: '개인화된 투자 전략 생성 AI 서비스가 시작되었습니다.'
    });

  } catch (error) {
    logger.error('투자 전략 서비스 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '개인화된 투자 전략 생성 AI 서비스가 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '개인화된 투자 전략 생성 AI 서비스 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/stop:
 *   post:
 *     summary: 투자 전략 생성 서비스 중지
 *     tags: [Investment Strategy]
 *     responses:
 *       200:
 *         description: 서비스가 성공적으로 중지됨
 */
router.post('/stop', async (req, res) => {
  try {
    InvestmentStrategyService.stopService();

    res.json({
      success: true,
      message: '개인화된 투자 전략 생성 AI 서비스가 중지되었습니다.'
    });

  } catch (error) {
    logger.error('투자 전략 서비스 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: '개인화된 투자 전략 생성 AI 서비스 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/generate:
 *   post:
 *     summary: 개인화된 투자 전략 생성
 *     tags: [Investment Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userProfile
 *             properties:
 *               userProfile:
 *                 type: object
 *                 required:
 *                   - investmentStyle
 *                   - experienceLevel
 *                   - riskTolerance
 *                   - availableTime
 *                 properties:
 *                   investmentStyle:
 *                     type: string
 *                     enum: [hodler, trader, balanced]
 *                     description: 투자 스타일
 *                   experienceLevel:
 *                     type: string
 *                     enum: [beginner, intermediate, advanced, expert]
 *                     description: 경험 수준
 *                   riskTolerance:
 *                     type: number
 *                     description: 리스크 허용도 (0-1)
 *                   availableTime:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     description: 가용 시간
 *                   investmentGoals:
 *                     type: string
 *                     description: 투자 목표
 *               marketData:
 *                 type: object
 *                 properties:
 *                   volatility:
 *                     type: number
 *                     description: 시장 변동성
 *                   trend:
 *                     type: string
 *                     enum: [bullish, bearish, sideways]
 *                     description: 시장 트렌드
 *                   sentiment:
 *                     type: number
 *                     description: 시장 감정 (0-1)
 *                   condition:
 *                     type: string
 *                     enum: [bull, bear, sideways, volatile]
 *                     description: 시장 상황
 *               portfolioData:
 *                 type: object
 *                 properties:
 *                   totalValue:
 *                     type: number
 *                     description: 포트폴리오 총 가치
 *                   holdings:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           description: 자산 유형
 *                         value:
 *                           type: number
 *                           description: 자산 가치
 *                         riskLevel:
 *                           type: string
 *                           description: 리스크 레벨
 *                         return:
 *                           type: number
 *                           description: 수익률
 *               preferences:
 *                 type: object
 *                 properties:
 *                   strategyType:
 *                     type: string
 *                     description: 선호하는 전략 타입
 *                   maxRisk:
 *                     type: number
 *                     description: 최대 리스크 허용도
 *                   targetReturn:
 *                     type: number
 *                     description: 목표 수익률
 *     responses:
 *       200:
 *         description: 개인화된 투자 전략
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PersonalizedStrategy'
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 오류
 */
router.post('/generate', async (req, res) => {
  try {
    const { userProfile, marketData = {}, portfolioData = {}, preferences = {} } = req.body;

    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: 'userProfile이 필요합니다.'
      });
    }

    if (!userProfile.investmentStyle || !userProfile.experienceLevel || 
        userProfile.riskTolerance === undefined || !userProfile.availableTime) {
      return res.status(400).json({
        success: false,
        message: 'userProfile에 필수 필드가 누락되었습니다. (investmentStyle, experienceLevel, riskTolerance, availableTime)'
      });
    }

    const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
      userProfile,
      marketData,
      portfolioData,
      preferences
    );

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('투자 전략 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '투자 전략 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/batch-generate:
 *   post:
 *     summary: 여러 사용자를 위한 투자 전략 배치 생성
 *     tags: [Investment Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: 사용자 ID
 *                     userProfile:
 *                       type: object
 *                       description: 사용자 프로필
 *                     marketData:
 *                       type: object
 *                       description: 시장 데이터
 *                     portfolioData:
 *                       type: object
 *                       description: 포트폴리오 데이터
 *                     preferences:
 *                       type: object
 *                       description: 사용자 선호도
 *               commonMarketData:
 *                 type: object
 *                 description: 공통 시장 데이터
 *               commonPreferences:
 *                 type: object
 *                 description: 공통 선호도
 *     responses:
 *       200:
 *         description: 배치 투자 전략 생성 결과
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
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           strategy:
 *                             $ref: '#/components/schemas/PersonalizedStrategy'
 *                           processingTime:
 *                             type: number
 *                             description: 처리 시간 (ms)
 *                           success:
 *                             type: boolean
 *                     totalUsers:
 *                       type: number
 *                     successfulStrategies:
 *                       type: number
 *                     failedStrategies:
 *                       type: number
 *                     totalProcessingTime:
 *                       type: number
 *                     averageProcessingTime:
 *                       type: number
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { users, commonMarketData = {}, commonPreferences = {} } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'users는 비어있지 않은 배열이어야 합니다.'
      });
    }

    const results = [];
    const startTime = Date.now();

    // 각 사용자에 대해 전략 생성
    for (const user of users) {
      const userStartTime = Date.now();
      
      try {
        const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
          user.userProfile,
          { ...commonMarketData, ...user.marketData },
          user.portfolioData,
          { ...commonPreferences, ...user.preferences }
        );

        results.push({
          userId: user.userId,
          strategy,
          processingTime: Date.now() - userStartTime,
          success: true
        });

      } catch (error) {
        logger.error(`사용자 ${user.userId} 전략 생성 실패:`, error);
        results.push({
          userId: user.userId,
          error: error.message,
          processingTime: Date.now() - userStartTime,
          success: false
        });
      }
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results,
        totalUsers: users.length,
        successfulStrategies: results.filter(r => r.success).length,
        failedStrategies: results.filter(r => !r.success).length,
        totalProcessingTime: totalTime,
        averageProcessingTime: totalTime / users.length
      }
    });

  } catch (error) {
    logger.error('배치 투자 전략 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '배치 투자 전략 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/templates:
 *   get:
 *     summary: 투자 전략 템플릿 목록 조회
 *     tags: [Investment Strategy]
 *     responses:
 *       200:
 *         description: 투자 전략 템플릿 목록
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
 *                       name:
 *                         type: string
 *                       riskTolerance:
 *                         type: number
 *                       timeHorizon:
 *                         type: string
 *                       allocation:
 *                         type: object
 *                       maxPositionSize:
 *                         type: number
 *                       stopLoss:
 *                         type: number
 *                       takeProfit:
 *                         type: number
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = InvestmentStrategyService.getStrategyTemplates();

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    logger.error('투자 전략 템플릿 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '투자 전략 템플릿 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/templates/{templateName}:
 *   get:
 *     summary: 특정 투자 전략 템플릿 조회
 *     tags: [Investment Strategy]
 *     parameters:
 *       - in: path
 *         name: templateName
 *         required: true
 *         schema:
 *           type: string
 *         description: 템플릿 이름
 *     responses:
 *       200:
 *         description: 투자 전략 템플릿
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: 템플릿을 찾을 수 없음
 */
router.get('/templates/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    const template = InvestmentStrategyService.getStrategyTemplate(templateName);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `템플릿 '${templateName}'을 찾을 수 없습니다.`
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    logger.error('투자 전략 템플릿 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '투자 전략 템플릿 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/analyze-profile:
 *   post:
 *     summary: 사용자 프로필 분석
 *     tags: [Investment Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userProfile
 *             properties:
 *               userProfile:
 *                 type: object
 *                 description: 사용자 프로필
 *     responses:
 *       200:
 *         description: 사용자 프로필 분석 결과
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
 *                     riskMultiplier:
 *                       type: number
 *                     positionSizeMultiplier:
 *                       type: number
 *                     timeHorizonAdjustment:
 *                       type: number
 *                     rebalanceFrequency:
 *                       type: string
 *                     strategyType:
 *                       type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/analyze-profile', async (req, res) => {
  try {
    const { userProfile } = req.body;

    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: 'userProfile이 필요합니다.'
      });
    }

    // 실제 구현에서는 InvestmentStrategyService의 private 메서드를 호출해야 함
    // 여기서는 시뮬레이션 데이터 반환
    const analysis = {
      riskMultiplier: 1.0,
      positionSizeMultiplier: 1.0,
      timeHorizonAdjustment: 1.0,
      rebalanceFrequency: 'daily',
      strategyType: 'balanced',
      recommendations: [
        '균형 잡힌 포트폴리오 구성을 권장합니다',
        '정기적인 리밸런싱을 수행하세요'
      ]
    };

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('사용자 프로필 분석 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 프로필 분석에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/investment-strategy/cache/clear:
 *   post:
 *     summary: 전략 캐시 클리어
 *     tags: [Investment Strategy]
 *     responses:
 *       200:
 *         description: 캐시가 성공적으로 클리어됨
 */
router.post('/cache/clear', async (req, res) => {
  try {
    InvestmentStrategyService.clearCache();

    res.json({
      success: true,
      message: '투자 전략 캐시가 클리어되었습니다.'
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
 * /api/investment-strategy/cache/stats:
 *   get:
 *     summary: 전략 캐시 통계 조회
 *     tags: [Investment Strategy]
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
    const stats = InvestmentStrategyService.getCacheStats();

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
 * /api/investment-strategy/models/validate:
 *   post:
 *     summary: AI 모델 검증
 *     tags: [Investment Strategy]
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
