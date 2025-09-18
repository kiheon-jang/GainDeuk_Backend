const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const KoreanMarketService = require('../services/KoreanMarketService');
const KoreanCommunityService = require('../services/KoreanCommunityService');
const logger = require('../utils/logger');

const router = express.Router();
const koreanMarketService = new KoreanMarketService();
const koreanCommunityService = new KoreanCommunityService();

// 입력 유효성 검사 미들웨어
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '입력 데이터가 올바르지 않습니다',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/korean-market/kimchi-premium/{symbol}:
 *   get:
 *     summary: 특정 코인의 김치프리미엄 조회
 *     tags: [Korean Market]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: "코인 심볼 (예: BTC, ETH)"
 *     responses:
 *       200:
 *         description: "김치프리미엄 정보 조회 성공"
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
 *                     symbol:
 *                       type: string
 *                     koreanPrice:
 *                       type: number
 *                     globalPrice:
 *                       type: number
 *                     premium:
 *                       type: number
 *                     isSignificant:
 *                       type: boolean
 *                     trend:
 *                       type: string
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.get('/kimchi-premium/:symbol', 
  param('symbol').isLength({ min: 2, max: 10 }).withMessage('코인 심볼은 2-10자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { symbol } = req.params;
      
      logger.info(`김치프리미엄 조회 요청: ${symbol}`);
      
      const kimchiPremium = await koreanMarketService.calculateKimchiPremium(symbol);
      
      if (!kimchiPremium) {
        return res.status(404).json({
          success: false,
          message: `${symbol}의 김치프리미엄 데이터를 찾을 수 없습니다`
        });
      }

      res.json({
        success: true,
        data: kimchiPremium,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('김치프리미엄 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/kimchi-premium:
 *   post:
 *     summary: 다중 코인의 김치프리미엄 조회
 *     tags: [Korean Market]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "코인 심볼 배열"
 *     responses:
 *       200:
 *         description: "다중 김치프리미엄 정보 조회 성공"
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.post('/kimchi-premium',
  body('symbols').isArray({ min: 1, max: 50 }).withMessage('심볼 배열은 1-50개여야 합니다'),
  body('symbols.*').isLength({ min: 2, max: 10 }).withMessage('각 심볼은 2-10자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { symbols } = req.body;
      
      logger.info(`다중 김치프리미엄 조회 요청: ${symbols.length}개 코인`);
      
      const kimchiPremiums = await koreanMarketService.getMultipleKimchiPremiums(symbols);
      
      if (!kimchiPremiums) {
        return res.status(500).json({
          success: false,
          message: '김치프리미엄 데이터 조회에 실패했습니다'
        });
      }

      res.json({
        success: true,
        data: kimchiPremiums,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('다중 김치프리미엄 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/sentiment:
 *   post:
 *     summary: 한국어 텍스트 감정분석
 *     tags: [Korean Market]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: "분석할 한국어 텍스트"
 *     responses:
 *       200:
 *         description: "감정분석 결과"
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.post('/sentiment',
  body('text').isLength({ min: 5, max: 1000 }).withMessage('텍스트는 5-1000자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { text } = req.body;
      
      logger.info('한국어 감정분석 요청');
      
      const sentiment = koreanMarketService.analyzeKoreanSentiment(text);
      
      res.json({
        success: true,
        data: sentiment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('한국어 감정분석 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/signal/{symbol}:
 *   get:
 *     summary: 한국 시장 특화 신호 조회
 *     tags: [Korean Market]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: "코인 심볼"
 *     responses:
 *       200:
 *         description: "한국 시장 특화 신호 조회 성공"
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.get('/signal/:symbol',
  param('symbol').isLength({ min: 2, max: 10 }).withMessage('코인 심볼은 2-10자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { symbol } = req.params;
      
      logger.info(`한국 시장 특화 신호 조회 요청: ${symbol}`);
      
      // 기본 신호 데이터 가져오기 (기존 SignalCalculatorService 사용)
      const SignalCalculatorService = require('../services/SignalCalculatorService');
      const signalCalculator = new SignalCalculatorService();
      
      // 임시 기본 신호 데이터 생성
      const baseSignal = {
        coinId: symbol.toLowerCase(),
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        finalScore: 50,
        breakdown: {
          price: 50,
          volume: 50,
          market: 50,
          sentiment: 50,
          whale: 50
        },
        recommendation: {
          action: 'HOLD',
          confidence: 'MEDIUM'
        },
        timeframe: 'LONG_TERM',
        priority: 'medium_priority',
        metadata: {
          lastUpdated: new Date()
        }
      };
      
      const koreanSignal = await koreanMarketService.calculateKoreanMarketSignal(symbol, baseSignal);
      
      res.json({
        success: true,
        data: koreanSignal,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('한국 시장 특화 신호 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/stats:
 *   get:
 *     summary: 한국 시장 통계 조회
 *     tags: [Korean Market]
 *     responses:
 *       200:
 *         description: "한국 시장 통계 조회 성공"
 *       500:
 *         description: "서버 오류"
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('한국 시장 통계 조회 요청');
    
    // 주요 코인들의 김치프리미엄 통계
    const majorCoins = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'XRP', 'LTC', 'BCH'];
    const kimchiPremiums = await koreanMarketService.getMultipleKimchiPremiums(majorCoins);
    
    // 연결 상태 확인
    const connectionStatus = await koreanMarketService.testConnection();
    
    const stats = {
      connection: connectionStatus,
      kimchiPremiums: kimchiPremiums?.stats || null,
      majorCoins: majorCoins,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('한국 시장 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/korean-market/community-sentiment/{symbol}:
 *   get:
 *     summary: 특정 코인의 한국 커뮤니티 감정분석 조회
 *     tags: [Korean Market]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: "코인 심볼 (예: BTC, ETH)"
 *     responses:
 *       200:
 *         description: "한국 커뮤니티 감정분석 조회 성공"
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.get('/community-sentiment/:symbol',
  param('symbol').isLength({ min: 2, max: 10 }).withMessage('코인 심볼은 2-10자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { symbol } = req.params;
      
      logger.info(`한국 커뮤니티 감정분석 조회 요청: ${symbol}`);
      
      const sentiment = await koreanCommunityService.analyzeKoreanCommunitySentiment(symbol);
      
      res.json({
        success: true,
        data: sentiment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('한국 커뮤니티 감정분석 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/community-sentiment:
 *   post:
 *     summary: 다중 코인의 한국 커뮤니티 감정분석 조회
 *     tags: [Korean Market]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "코인 심볼 배열"
 *     responses:
 *       200:
 *         description: "다중 한국 커뮤니티 감정분석 조회 성공"
 *       400:
 *         description: "잘못된 요청"
 *       500:
 *         description: "서버 오류"
 */
router.post('/community-sentiment',
  body('symbols').isArray({ min: 1, max: 20 }).withMessage('심볼 배열은 1-20개여야 합니다'),
  body('symbols.*').isLength({ min: 2, max: 10 }).withMessage('각 심볼은 2-10자여야 합니다'),
  validateInput,
  async (req, res) => {
    try {
      const { symbols } = req.body;
      
      logger.info(`다중 한국 커뮤니티 감정분석 조회 요청: ${symbols.length}개 코인`);
      
      const sentiments = await koreanCommunityService.getMultipleKoreanCommunitySentiments(symbols);
      
      if (!sentiments) {
        return res.status(500).json({
          success: false,
          message: '한국 커뮤니티 감정분석 조회에 실패했습니다'
        });
      }

      res.json({
        success: true,
        data: sentiments,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('다중 한국 커뮤니티 감정분석 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/korean-market/health:
 *   get:
 *     summary: 한국 시장 서비스 헬스체크
 *     tags: [Korean Market]
 *     responses:
 *       200:
 *         description: "서비스 상태 정상"
 *       500:
 *         description: "서비스 오류"
 */
router.get('/health', async (req, res) => {
  try {
    const [marketStatus, communityStatus] = await Promise.all([
      koreanMarketService.testConnection(),
      koreanCommunityService.testConnection()
    ]);
    
    const health = {
      status: (marketStatus.overall || communityStatus.overall) ? 'healthy' : 'unhealthy',
      services: {
        market: {
          upbit: marketStatus.upbit ? 'connected' : 'disconnected',
          bithumb: marketStatus.bithumb ? 'connected' : 'disconnected'
        },
        community: communityStatus
      },
      timestamp: new Date().toISOString()
    };
    
    const statusCode = (marketStatus.overall || communityStatus.overall) ? 200 : 503;
    
    res.status(statusCode).json({
      success: marketStatus.overall || communityStatus.overall,
      data: health
    });
  } catch (error) {
    logger.error('한국 시장 서비스 헬스체크 오류:', error);
    res.status(500).json({
      success: false,
      message: '서비스 헬스체크 실패',
      error: error.message
    });
  }
});

module.exports = router;
