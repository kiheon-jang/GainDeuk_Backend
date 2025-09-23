const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const Signal = require('../models/Signal');
const CacheService = require('../services/CacheService');

const cacheService = new CacheService();

/**
 * @swagger
 * /api/signals:
 *   get:
 *     summary: 모든 신호 목록 조회
 *     description: 페이지네이션, 정렬, 필터링을 지원하는 신호 목록을 반환합니다.
 *     tags: [Signals]
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
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [finalScore, createdAt, updatedAt]
 *           default: finalScore
 *         description: 정렬 기준
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: 최소 점수
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: 최대 점수
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [STRONG_BUY, BUY, HOLD, WEAK_SELL, SELL, STRONG_SELL]
 *         description: 추천 액션 필터
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *         description: 타임프레임 필터
 *       - in: query
 *         name: strategy
 *         schema:
 *           type: string
 *           enum: [SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM]
 *         description: 전략별 필터 (timeframe과 동일한 값 사용)
 *     responses:
 *       200:
 *         description: 신호 목록 조회 성공
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
 *                     $ref: '#/components/schemas/Signal'
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
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('페이지는 1 이상의 정수여야 합니다'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('제한은 1-100 사이의 정수여야 합니다'),
  query('sort').optional().isIn(['finalScore', 'createdAt', 'updatedAt']).withMessage('유효하지 않은 정렬 기준입니다'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('정렬 순서는 asc 또는 desc여야 합니다'),
  query('minScore').optional().isInt({ min: 0, max: 100 }).withMessage('최소 점수는 0-100 사이의 정수여야 합니다'),
  query('maxScore').optional().isInt({ min: 0, max: 100 }).withMessage('최대 점수는 0-100 사이의 정수여야 합니다'),
  query('action').optional().isIn(['STRONG_BUY', 'BUY', 'HOLD', 'WEAK_SELL', 'SELL', 'STRONG_SELL']).withMessage('유효하지 않은 액션입니다'),
  query('timeframe').optional().isIn(['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM']).withMessage('유효하지 않은 타임프레임입니다'),
  query('strategy').optional().isIn(['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM']).withMessage('유효하지 않은 전략입니다')
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
    const sort = req.query.sort || 'finalScore';
    const order = req.query.order || 'desc';
    const minScore = req.query.minScore ? parseInt(req.query.minScore) : undefined;
    const maxScore = req.query.maxScore ? parseInt(req.query.maxScore) : undefined;
    const action = req.query.action;
    const timeframe = req.query.timeframe;
    const strategy = req.query.strategy;

    // 캐시 키 생성
    const cacheKey = `signals:${page}:${limit}:${sort}:${order}:${minScore || 'all'}:${maxScore || 'all'}:${action || 'all'}:${timeframe || 'all'}:${strategy || 'all'}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info('Signals list loaded from cache');
      return res.json(cachedResult);
    }

    // 쿼리 조건 구성
    const query = {};
    
    if (minScore !== undefined || maxScore !== undefined) {
      query.finalScore = {};
      if (minScore !== undefined) query.finalScore.$gte = minScore;
      if (maxScore !== undefined) query.finalScore.$lte = maxScore;
    }
    
    if (action) {
      query['recommendation.action'] = action;
    }
    
    if (timeframe) {
      query.timeframe = timeframe;
    }
    
    // strategy 파라미터가 있으면 timeframe과 동일하게 처리
    if (strategy) {
      query.timeframe = strategy;
    }

    // 정렬 옵션 설정
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // 데이터베이스 쿼리
    const skip = (page - 1) * limit;
    const [signals, total] = await Promise.all([
      Signal.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Signal.countDocuments(query)
    ]);

    const result = {
      success: true,
      data: signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, result, 300);

    logger.success(`Retrieved ${signals.length} signals (page ${page})`);
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve signals:', error);
    res.status(500).json({
      success: false,
      error: '신호 목록을 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/signals/coin/{coinId}:
 *   get:
 *     summary: 특정 코인의 신호 조회
 *     description: 코인 ID로 특정 코인의 최신 신호를 반환합니다.
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: coinId
 *         required: true
 *         schema:
 *           type: string
 *         description: 코인 ID
 *     responses:
 *       200:
 *         description: 신호 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Signal'
 *       404:
 *         description: 신호를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
// 빈 coinId 처리
router.get('/coin/', (req, res) => {
  return res.status(400).json({
    success: false,
    error: '코인 ID는 필수입니다'
  });
});

router.get('/coin/:coinId', [
  param('coinId').notEmpty().withMessage('코인 ID는 필수입니다')
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

    const { coinId } = req.params;

    // 캐시 확인
    const cacheKey = `signal:${coinId}`;
    let cachedResult = await cacheService.getSignal(coinId);

    if (cachedResult) {
      logger.info(`Signal for ${coinId} loaded from cache`);
      return res.json({
        success: true,
        data: cachedResult
      });
    }

    // 신호 조회
    const signal = await Signal.findByCoinId(coinId);
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: '신호를 찾을 수 없습니다'
      });
    }

    const result = {
      success: true,
      data: signal.toObject()
    };

    // 캐시에 저장 (15분)
    await cacheService.setSignal(coinId, signal.toObject());

    logger.success(`Retrieved signal for ${coinId}`);
    res.json(result);
  } catch (error) {
    logger.error(`Failed to retrieve signal for ${req.params.coinId}:`, error);
    res.status(500).json({
      success: false,
      error: '신호를 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/signals/search:
 *   get:
 *     summary: 신호 검색
 *     description: 코인 심볼, 이름, 또는 ID로 신호를 검색합니다.
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: 검색어
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: 결과 제한 수
 *     responses:
 *       200:
 *         description: 검색 성공
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
 *                     $ref: '#/components/schemas/Signal'
 *                 query:
 *                   type: string
 *                 count:
 *                   type: integer
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/search', [
  query('q').notEmpty().withMessage('검색어는 필수입니다'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('제한은 1-50 사이의 정수여야 합니다')
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

    const query = req.query.q.trim();
    const limit = parseInt(req.query.limit) || 20;

    // 캐시 확인
    const cacheKey = `signals:search:${query}:${limit}`;
    let cachedResult = await cacheService.getSearchResults(`signals:${query}`);

    if (cachedResult) {
      logger.info(`Search results for "${query}" loaded from cache`);
      return res.json(cachedResult);
    }

    // 검색 실행
    const signals = await Signal.searchSignals(query, limit);

    const result = {
      success: true,
      data: signals,
      query,
      count: signals.length
    };

    // 캐시에 저장 (10분)
    await cacheService.setSearchResults(`signals:${query}`, result);

    logger.success(`Search completed for "${query}": ${signals.length} results`);
    res.json(result);
  } catch (error) {
    logger.error(`Search failed for "${req.query.q}":`, error);
    res.status(500).json({
      success: false,
      error: '검색에 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/signals/strong:
 *   get:
 *     summary: 강한 신호 조회
 *     description: 80점 이상 또는 20점 이하의 강한 신호를 반환합니다.
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: 반환할 신호 수
 *     responses:
 *       200:
 *         description: 강한 신호 조회 성공
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
 *                     $ref: '#/components/schemas/Signal'
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/strong', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('제한은 1-100 사이의 정수여야 합니다')
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

    const limit = parseInt(req.query.limit) || 50;

    // 캐시 확인
    const cacheKey = `signals:strong:${limit}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info(`Strong signals loaded from cache`);
      return res.json(cachedResult);
    }

    // 강한 신호 조회
    const signals = await Signal.getStrongSignals(limit);

    const result = {
      success: true,
      data: signals
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, result, 300);

    logger.success(`Retrieved ${signals.length} strong signals`);
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve strong signals:', error);
    res.status(500).json({
      success: false,
      error: '강한 신호를 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/signals/stats:
 *   get:
 *     summary: 신호 통계
 *     description: 신호 분석 통계 정보를 반환합니다.
 *     tags: [Signals]
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
 *                     totalSignals:
 *                       type: integer
 *                     avgScore:
 *                       type: number
 *                     maxScore:
 *                       type: number
 *                     minScore:
 *                       type: number
 *                     strongBuyCount:
 *                       type: integer
 *                     buyCount:
 *                       type: integer
 *                     holdCount:
 *                       type: integer
 *                     sellCount:
 *                       type: integer
 *                     strongSellCount:
 *                       type: integer
 *       500:
 *         description: 서버 오류
 */
router.get('/stats', async (req, res) => {
  try {
    // 캐시 확인
    const cacheKey = 'signals:stats';
    let cachedResult = await cacheService.getStats();

    if (cachedResult) {
      logger.info('Signal stats loaded from cache');
      return res.json({
        success: true,
        data: cachedResult
      });
    }

    // 통계 조회
    const stats = await Signal.getSignalStats();
    const timeframeStats = await Signal.getTimeframeStats();

    const result = {
      success: true,
      data: {
        ...stats[0],
        timeframeBreakdown: timeframeStats
      }
    };

    // 캐시에 저장 (15분)
    await cacheService.setStats(result.data);

    logger.success('Retrieved signal statistics');
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve signal stats:', error);
    res.status(500).json({
      success: false,
      error: '신호 통계를 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/signals/refresh:
 *   post:
 *     summary: 신호 데이터 새로고침
 *     description: 모든 코인에 대해 신호를 재계산하고 데이터베이스에 저장합니다.
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: 새로고침할 코인 수
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 4h, 24h, 7d]
 *           default: 24h
 *         description: 신호 계산 시간대
 *     responses:
 *       200:
 *         description: 신호 데이터 새로고침 성공
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
 *                   example: "신호 데이터가 성공적으로 새로고침되었습니다"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSignals:
 *                       type: integer
 *                       description: 새로고침된 신호 수
 *                     processingTime:
 *                       type: number
 *                       description: 처리 시간 (ms)
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/refresh', [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('제한은 1-1000 사이의 정수여야 합니다'),
  query('timeframe').optional().isIn(['1h', '4h', '24h', '7d']).withMessage('시간대는 1h, 4h, 24h, 7d 중 하나여야 합니다')
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

    const limit = parseInt(req.query.limit) || 100;
    const timeframe = req.query.timeframe || '24h';
    const startTime = Date.now();

    logger.info(`Starting signal data refresh - Timeframe: ${timeframe}, Limit: ${limit}`);

    // 서비스 초기화
    const SignalCalculatorService = require('../services/SignalCalculatorService');
    const signalCalculatorService = new SignalCalculatorService();

    // 코인 목록 가져오기
    const Coin = require('../models/Coin');
    const coins = await Coin.find({})
      .sort({ marketCapRank: 1 })
      .limit(limit)
      .select('coinId name symbol currentPrice marketCap totalVolume priceChange lastUpdated');

    if (coins.length === 0) {
      return res.status(404).json({
        success: false,
        error: '새로고침할 코인이 없습니다. 먼저 코인 데이터를 새로고침해주세요.'
      });
    }

    let processedSignals = 0;
    let totalSignals = 0;

    try {
      // 각 코인에 대해 신호 계산
      for (const coin of coins) {
        try {
          // 신호 계산
          const signalData = await signalCalculatorService.calculateSignal(
            coin.coinId, 
            coin.symbol, 
            coin.name, 
            {
              current_price: coin.currentPrice,
              market_cap: coin.marketCap,
              market_cap_rank: coin.marketCapRank,
              total_volume: coin.totalVolume,
              price_change_percentage_1h: coin.priceChange['1h'] || 0,
              price_change_percentage_24h: coin.priceChange['24h'] || 0,
              price_change_percentage_7d: coin.priceChange['7d'] || 0,
              price_change_percentage_30d: coin.priceChange['30d'] || 0,
              total_volume_change_24h: 0 // 이 데이터는 현재 없음
            }
          );
          
          if (signalData && signalData.recommendation) {
            // 기존 신호 삭제 (같은 코인, 같은 시간대)
            await Signal.deleteMany({
              coinId: coin.coinId,
              timeframe: timeframe
            });

            // 새 신호 생성
            const signal = new Signal({
              coinId: coin.coinId,
              symbol: coin.symbol,
              name: coin.name,
              finalScore: signalData.finalScore,
              breakdown: signalData.breakdown,
              recommendation: signalData.recommendation,
              timeframe: signalData.timeframe,
              priority: signalData.priority,
              rank: signalData.rank || 1, // 최소값 1로 설정
              currentPrice: coin.currentPrice,
              marketCap: coin.marketCap,
              metadata: signalData.metadata
            });

            await signal.save();
            processedSignals++;
          }
          
          totalSignals++;
          
        } catch (error) {
          logger.warning(`Failed to calculate signal for ${coin.symbol}:`, error.message);
          console.error('Signal calculation error details:', error);
          totalSignals++;
        }
      }

      const processingTime = Date.now() - startTime;

      // 캐시 정리
      await cacheService.clearPattern('signals:*');

      logger.success(`Signal data refresh completed - Processed: ${processedSignals}/${totalSignals} signals in ${processingTime}ms`);

      res.json({
        success: true,
        message: '신호 데이터가 성공적으로 새로고침되었습니다',
        data: {
          totalSignals: processedSignals,
          totalCoins: totalSignals,
          processingTime,
          timeframe,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to refresh signal data:', error);
      res.status(500).json({
        success: false,
        error: '신호 데이터 새로고침에 실패했습니다',
        details: error.message
      });
    }

  } catch (error) {
    logger.error('Signal refresh endpoint error:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다'
    });
  }
});

module.exports = router;
