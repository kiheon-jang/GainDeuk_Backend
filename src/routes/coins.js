const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const Coin = require('../models/Coin');
const Signal = require('../models/Signal');
const CacheService = require('../services/CacheService');

const cacheService = new CacheService();

/**
 * @swagger
 * /api/coins:
 *   get:
 *     summary: 모든 코인 목록 조회
 *     description: 페이지네이션과 정렬을 지원하는 코인 목록을 반환합니다.
 *     tags: [Coins]
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
 *           enum: [marketCapRank, currentPrice, priceChange24h, totalVolume]
 *           default: marketCapRank
 *         description: 정렬 기준
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: 정렬 순서
 *     responses:
 *       200:
 *         description: 코인 목록 조회 성공
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
 *                     $ref: '#/components/schemas/Coin'
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
  query('sort').optional().isIn(['marketCapRank', 'currentPrice', 'priceChange24h', 'totalVolume']).withMessage('유효하지 않은 정렬 기준입니다'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('정렬 순서는 asc 또는 desc여야 합니다')
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
    const sort = req.query.sort || 'marketCapRank';
    const order = req.query.order || 'asc';

    // 캐시 키 생성
    const cacheKey = `coins:${page}:${limit}:${sort}:${order}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info('Coins list loaded from cache');
      return res.json(cachedResult);
    }

    // 정렬 옵션 설정
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // 데이터베이스 쿼리
    const skip = (page - 1) * limit;
    const [coins, total] = await Promise.all([
      Coin.find()
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Coin.countDocuments()
    ]);

    const result = {
      success: true,
      data: coins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, result, 300);

    logger.success(`Retrieved ${coins.length} coins (page ${page})`);
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve coins:', error);
    res.status(500).json({
      success: false,
      error: '코인 목록을 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/coins/{coinId}:
 *   get:
 *     summary: 특정 코인 상세 정보 조회
 *     description: 코인 ID로 특정 코인의 상세 정보와 최신 신호를 반환합니다.
 *     tags: [Coins]
 *     parameters:
 *       - in: path
 *         name: coinId
 *         required: true
 *         schema:
 *           type: string
 *         description: 코인 ID
 *       - in: query
 *         name: includeSignal
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 최신 신호 포함 여부
 *     responses:
 *       200:
 *         description: 코인 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Coin'
 *                     - type: object
 *                       properties:
 *                         signal:
 *                           $ref: '#/components/schemas/Signal'
 *       404:
 *         description: 코인을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:coinId', [
  param('coinId').notEmpty().withMessage('코인 ID는 필수입니다'),
  query('includeSignal').optional().isBoolean().withMessage('includeSignal은 boolean 값이어야 합니다')
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
    const includeSignal = req.query.includeSignal !== 'false';

    // 캐시 확인
    const cacheKey = `coin:${coinId}:${includeSignal}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info(`Coin details for ${coinId} loaded from cache`);
      return res.json(cachedResult);
    }

    // 코인 정보 조회
    const coin = await Coin.findByCoinId(coinId);
    if (!coin) {
      return res.status(404).json({
        success: false,
        error: '코인을 찾을 수 없습니다'
      });
    }

    const result = {
      success: true,
      data: coin.toObject()
    };

    // 신호 정보 포함
    if (includeSignal) {
      try {
        const signal = await Signal.findByCoinId(coinId);
        if (signal) {
          result.data.signal = signal.toObject();
        }
      } catch (error) {
        logger.warning(`Failed to fetch signal for ${coinId}:`, error);
      }
    }

    // 캐시에 저장 (10분)
    await cacheService.set(cacheKey, result, 600);

    logger.success(`Retrieved coin details for ${coinId}`);
    res.json(result);
  } catch (error) {
    logger.error(`Failed to retrieve coin details for ${req.params.coinId}:`, error);
    res.status(500).json({
      success: false,
      error: '코인 상세 정보를 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/coins/search:
 *   get:
 *     summary: 코인 검색
 *     description: 심볼, 이름, 또는 코인 ID로 코인을 검색합니다.
 *     tags: [Coins]
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
 *                     $ref: '#/components/schemas/Coin'
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
    const cacheKey = `coins:search:${query}:${limit}`;
    let cachedResult = await cacheService.getSearchResults(query);

    if (cachedResult) {
      logger.info(`Search results for "${query}" loaded from cache`);
      return res.json(cachedResult);
    }

    // 검색 실행
    const coins = await Coin.searchCoins(query, limit);

    const result = {
      success: true,
      data: coins,
      query,
      count: coins.length
    };

    // 캐시에 저장 (10분)
    await cacheService.setSearchResults(query, result);

    logger.success(`Search completed for "${query}": ${coins.length} results`);
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
 * /api/coins/top:
 *   get:
 *     summary: 상위 코인 목록
 *     description: 시가총액 기준 상위 코인 목록을 반환합니다.
 *     tags: [Coins]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 반환할 코인 수
 *     responses:
 *       200:
 *         description: 상위 코인 목록 조회 성공
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
 *                     $ref: '#/components/schemas/Coin'
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/top', [
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

    const limit = parseInt(req.query.limit) || 10;

    // 캐시 확인
    const cacheKey = `coins:top:${limit}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info(`Top ${limit} coins loaded from cache`);
      return res.json(cachedResult);
    }

    // 상위 코인 조회
    const coins = await Coin.getTopCoins(limit);

    const result = {
      success: true,
      data: coins
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, result, 300);

    logger.success(`Retrieved top ${coins.length} coins`);
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve top coins:', error);
    res.status(500).json({
      success: false,
      error: '상위 코인 목록을 가져오는데 실패했습니다'
    });
  }
});

/**
 * @swagger
 * /api/coins/trending:
 *   get:
 *     summary: 트렌딩 코인
 *     description: 가격 변화율 기준 트렌딩 코인을 반환합니다.
 *     tags: [Coins]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: 시간 프레임
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: 반환할 코인 수
 *     responses:
 *       200:
 *         description: 트렌딩 코인 조회 성공
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
 *                     $ref: '#/components/schemas/Coin'
 *                 timeframe:
 *                   type: string
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/trending', [
  query('timeframe').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('유효하지 않은 시간 프레임입니다'),
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

    const timeframe = req.query.timeframe || '24h';
    const limit = parseInt(req.query.limit) || 20;

    // 캐시 확인
    const cacheKey = `coins:trending:${timeframe}:${limit}`;
    let cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
      logger.info(`Trending coins (${timeframe}) loaded from cache`);
      return res.json(cachedResult);
    }

    // 트렌딩 코인 조회
    const coins = await Coin.getCoinsByPriceChange(timeframe, limit);

    const result = {
      success: true,
      data: coins,
      timeframe
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, result, 300);

    logger.success(`Retrieved ${coins.length} trending coins (${timeframe})`);
    res.json(result);
  } catch (error) {
    logger.error(`Failed to retrieve trending coins (${req.query.timeframe}):`, error);
    res.status(500).json({
      success: false,
      error: '트렌딩 코인을 가져오는데 실패했습니다'
    });
  }
});

module.exports = router;
