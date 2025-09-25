const express = require('express');
const router = express.Router();
const TradingStrategyService = require('../strategies/TradingStrategyService');
const logger = require('../utils/logger');

// 전략 서비스 인스턴스
const tradingStrategyService = new TradingStrategyService();

/**
 * @swagger
 * /api/trading-strategies/config/{timeframe}:
 *   get:
 *     summary: 전략 설정 조회
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: path
 *         name: timeframe
 *         required: true
 *         schema:
 *           type: string
 *           enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *     responses:
 *       200:
 *         description: 전략 설정 정보
 */
router.get('/config/:timeframe', (req, res) => {
  try {
    const { timeframe } = req.params;
    const config = tradingStrategyService.getStrategyConfig(timeframe.toUpperCase());
    res.json({ success: true, data: config });
  } catch (error) {
    logger.error(`Error getting strategy config for ${req.params.timeframe}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/trading-strategies/execute:
 *   post:
 *     summary: 거래 전략 실행
 *     tags: [Trading Strategies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signalData
 *               - marketData
 *               - accountData
 *             properties:
 *               signalData:
 *                 type: object
 *                 properties:
 *                   finalScore:
 *                     type: number
 *                   volatility:
 *                     type: number
 *                   volumeRatio:
 *                     type: number
 *                   timeframe:
 *                     type: string
 *                     enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *               marketData:
 *                 type: object
 *                 properties:
 *                   currentPrice:
 *                     type: number
 *                   volume:
 *                     type: number
 *                   spread:
 *                     type: number
 *               accountData:
 *                 type: object
 *                 properties:
 *                   balance:
 *                     type: number
 *                   riskTolerance:
 *                     type: number
 *     responses:
 *       200:
 *         description: 거래 전략 실행 결과
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
 *                     strategy:
 *                       type: string
 *                     shouldExecute:
 *                       type: boolean
 *                     entryAnalysis:
 *                       type: object
 *                     positionSize:
 *                       type: object
 *                     stopLoss:
 *                       type: object
 *                     takeProfit:
 *                       type: object
 */
router.post('/execute', async (req, res) => {
  try {
    const { signalData, marketData, accountData } = req.body;
    
    if (!signalData || !marketData || !accountData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: signalData, marketData, accountData'
      });
    }
    
    const result = tradingStrategyService.executeTradingStrategy(
      signalData, 
      marketData, 
      accountData
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Trading strategy execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/positions:
 *   get:
 *     summary: 활성 포지션 조회
 *     tags: [Trading Strategies]
 *     responses:
 *       200:
 *         description: 활성 포지션 목록
 */
router.get('/positions', async (req, res) => {
  try {
    const positions = tradingStrategyService.getActivePositions();
    
    res.json({
      success: true,
      data: positions
    });
    
  } catch (error) {
    logger.error('Failed to get active positions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/positions/{positionId}/manage:
 *   post:
 *     summary: 포지션 관리
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: path
 *         name: positionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marketData:
 *                 type: object
 *     responses:
 *       200:
 *         description: 포지션 관리 결과
 */
router.post('/positions/:positionId/manage', async (req, res) => {
  try {
    const { positionId } = req.params;
    const { marketData } = req.body;
    
    if (!marketData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: marketData'
      });
    }
    
    const result = tradingStrategyService.managePosition(positionId, marketData);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Position management failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/performance:
 *   get:
 *     summary: 전략별 성과 분석
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *     responses:
 *       200:
 *         description: 성과 분석 결과
 */
router.get('/performance', async (req, res) => {
  try {
    const { timeframe } = req.query;
    
    const performance = tradingStrategyService.analyzePerformance(timeframe);
    
    res.json({
      success: true,
      data: performance
    });
    
  } catch (error) {
    logger.error('Performance analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/backtest:
 *   post:
 *     summary: 백테스팅 실행
 *     tags: [Trading Strategies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeframe
 *               - historicalData
 *             properties:
 *               timeframe:
 *                 type: string
 *                 enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *               historicalData:
 *                 type: array
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: 백테스팅 결과
 */
router.post('/backtest', async (req, res) => {
  try {
    const { timeframe, historicalData, parameters } = req.body;
    
    if (!timeframe || !historicalData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: timeframe, historicalData'
      });
    }
    
    const result = tradingStrategyService.runBacktest(timeframe, historicalData, parameters);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Backtest failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/compare:
 *   post:
 *     summary: 전략 비교 백테스팅
 *     tags: [Trading Strategies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeframes
 *               - historicalData
 *             properties:
 *               timeframes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *               historicalData:
 *                 type: array
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: 전략 비교 결과
 */
router.post('/compare', async (req, res) => {
  try {
    const { timeframes, historicalData, parameters } = req.body;
    
    if (!timeframes || !historicalData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: timeframes, historicalData'
      });
    }
    
    const result = tradingStrategyService.compareStrategies(timeframes, historicalData, parameters);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Strategy comparison failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/optimize:
 *   post:
 *     summary: 전략 파라미터 최적화
 *     tags: [Trading Strategies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeframe
 *               - historicalData
 *               - parameterRanges
 *             properties:
 *               timeframe:
 *                 type: string
 *                 enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *               historicalData:
 *                 type: array
 *               parameterRanges:
 *                 type: object
 *     responses:
 *       200:
 *         description: 최적화 결과
 */
router.post('/optimize', async (req, res) => {
  try {
    const { timeframe, historicalData, parameterRanges } = req.body;
    
    if (!timeframe || !historicalData || !parameterRanges) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: timeframe, historicalData, parameterRanges'
      });
    }
    
    const result = tradingStrategyService.optimizeStrategy(timeframe, historicalData, parameterRanges);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Strategy optimization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/statistics:
 *   get:
 *     summary: 전략 통계 조회
 *     tags: [Trading Strategies]
 *     responses:
 *       200:
 *         description: 전략 통계
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = tradingStrategyService.getStrategyStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    logger.error('Failed to get strategy statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/portfolio:
 *   get:
 *     summary: 포트폴리오 상태 조회
 *     tags: [Trading Strategies]
 *     responses:
 *       200:
 *         description: 포트폴리오 상태
 */
router.get('/portfolio', async (req, res) => {
  try {
    const accountData = {
      balance: 10000, // 기본값
      riskTolerance: 0.5
    };
    
    const portfolioStatus = tradingStrategyService.getPortfolioStatus(accountData);
    
    res.json({
      success: true,
      data: portfolioStatus
    });
    
  } catch (error) {
    logger.error('Failed to get portfolio status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/trading-strategies/trades:
 *   get:
 *     summary: 거래 기록 조회
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *     responses:
 *       200:
 *         description: 거래 기록
 */
router.get('/trades', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const trades = tradingStrategyService.getTradeHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: trades
    });
    
  } catch (error) {
    logger.error('Failed to get trade history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
