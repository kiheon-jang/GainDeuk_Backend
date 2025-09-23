const express = require('express');
const NewsService = require('../services/NewsService');
const NewsSchedulerService = require('../services/NewsSchedulerService');
const { logger } = require('../utils/logger');

const router = express.Router();

// NewsSchedulerService 인스턴스 생성 (지연 초기화)
let newsScheduler = null;

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: 뉴스 서비스 개요
 *     description: 암호화폐 뉴스 수집 및 감정 분석 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [News]
 *     responses:
 *       200:
 *         description: 뉴스 서비스 개요 정보
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
 *                       example: "news"
 *                     description:
 *                       type: string
 *                       example: "암호화폐 뉴스 수집 및 감정 분석 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/latest", "/sentiment", "/trending", "/search", "/feeds"]
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-21T16:45:00.000Z"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "maintenance"]
 *                       example: "active"
 */

// 루트 엔드포인트 - 뉴스 서비스 개요
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        module: 'news',
        description: '암호화폐 뉴스 수집 및 감정 분석 서비스',
        availableEndpoints: [
          '/latest',
          '/sentiment',
          '/trending',
          '/search',
          '/feeds'
        ],
        lastUpdate: new Date().toISOString(),
        status: 'active'
      }
    });

  } catch (error) {
    logger.error('뉴스 서비스 개요 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/latest:
 *   get:
 *     summary: 최신 뉴스 조회
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 뉴스 수
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, bitcoin, ethereum, defi, nft, regulation]
 *           default: all
 *         description: 뉴스 카테고리
 *     responses:
 *       200:
 *         description: 최신 뉴스 목록
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       url:
 *                         type: string
 *                       publishedAt:
 *                         type: string
 *                         format: date-time
 *                       source:
 *                         type: string
 *                       sentiment:
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                           label:
 *                             type: string
 *       500:
 *         description: 서버 오류
 */
router.get('/latest', async (req, res) => {
  try {
    const { limit = 20, category = 'all' } = req.query;
    
    const newsService = new NewsService();
    const news = await newsService.getLatestNews(parseInt(limit), category);

    res.json({
      success: true,
      data: news,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('최신 뉴스 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '뉴스 조회에 실패했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/sentiment:
 *   get:
 *     summary: 뉴스 감정 분석
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: 분석할 시간대
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, bitcoin, ethereum, defi, nft, regulation]
 *           default: all
 *         description: 뉴스 카테고리
 *     responses:
 *       200:
 *         description: 뉴스 감정 분석 결과
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
 *                     overallSentiment:
 *                       type: object
 *                       properties:
 *                         score:
 *                           type: number
 *                         label:
 *                           type: string
 *                     sentimentTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           score:
 *                             type: number
 *                     topPositiveNews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     topNegativeNews:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: 서버 오류
 */
router.get('/sentiment', async (req, res) => {
  try {
    const { timeframe = '24h', category = 'all' } = req.query;
    
    const newsService = new NewsService();
    const sentiment = await newsService.analyzeSentiment(timeframe, category);

    res.json({
      success: true,
      data: sentiment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('뉴스 감정 분석 실패:', error);
    res.status(500).json({
      success: false,
      message: '감정 분석에 실패했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/trending:
 *   get:
 *     summary: 트렌딩 뉴스 조회
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 조회할 뉴스 수
 *     responses:
 *       200:
 *         description: 트렌딩 뉴스 목록
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       url:
 *                         type: string
 *                       publishedAt:
 *                         type: string
 *                         format: date-time
 *                       source:
 *                         type: string
 *                       trendingScore:
 *                         type: number
 *       500:
 *         description: 서버 오류
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const newsService = new NewsService();
    const trending = await newsService.getTrendingNews(parseInt(limit));

    res.json({
      success: true,
      data: trending,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('트렌딩 뉴스 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '트렌딩 뉴스 조회에 실패했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/search:
 *   get:
 *     summary: 뉴스 검색
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색 키워드
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 뉴스 수
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, bitcoin, ethereum, defi, nft, regulation]
 *           default: all
 *         description: 뉴스 카테고리
 *     responses:
 *       200:
 *         description: 검색 결과
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       url:
 *                         type: string
 *                       publishedAt:
 *                         type: string
 *                         format: date-time
 *                       source:
 *                         type: string
 *                       relevanceScore:
 *                         type: number
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, category = 'all' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: '검색 키워드가 필요합니다'
      });
    }
    
    const newsService = new NewsService();
    const results = await newsService.searchNews(q, parseInt(limit), category);

    res.json({
      success: true,
      data: results,
      query: q,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('뉴스 검색 실패:', error);
    res.status(500).json({
      success: false,
      message: '뉴스 검색에 실패했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/feeds:
 *   get:
 *     summary: 뉴스 피드 목록 조회
 *     tags: [News]
 *     responses:
 *       200:
 *         description: 뉴스 피드 목록
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
 *                       name:
 *                         type: string
 *                       url:
 *                         type: string
 *                       weight:
 *                         type: number
 *                       status:
 *                         type: string
 *       500:
 *         description: 서버 오류
 */
router.get('/feeds', async (req, res) => {
  try {
    const newsService = new NewsService();
    const feeds = await newsService.getNewsFeeds();

    res.json({
      success: true,
      data: feeds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('뉴스 피드 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '뉴스 피드 조회에 실패했습니다',
      error: error?.message || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/news/collect:
 *   post:
 *     summary: 뉴스 수집 및 감정분석 수동 실행
 *     description: 뉴스 수집과 감정분석을 수동으로 실행합니다. 수집 완료 후 즉시 감정분석을 수행합니다.
 *     tags: [News]
 *     responses:
 *       200:
 *         description: 뉴스 수집 및 감정분석 완료
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
 *                   example: "뉴스 수집 및 감정분석이 완료되었습니다"
 *                 data:
 *                   type: object
 *                   properties:
 *                     collected:
 *                       type: number
 *                       example: 15
 *                     processed:
 *                       type: number
 *                       example: 15
 *                     duration:
 *                       type: number
 *                       example: 12000
 *       500:
 *         description: 서버 오류
 */
router.post('/collect', async (req, res) => {
  try {
    logger.info('📰 수동 뉴스 수집 및 감정분석 시작...');
    const startTime = Date.now();
    
    // NewsSchedulerService 인스턴스 생성 (필요시에만)
    if (!newsScheduler) {
      newsScheduler = new NewsSchedulerService();
    }
    
    // 뉴스 수집 및 감정분석 실행
    await newsScheduler.collectAndProcessNews();
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: '뉴스 수집 및 감정분석이 완료되었습니다',
      data: {
        duration: duration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('수동 뉴스 수집 실패:', error);
    res.status(500).json({
      success: false,
      message: '뉴스 수집에 실패했습니다',
      error: error?.message || error?.toString() || '알 수 없는 오류가 발생했습니다'
    });
  }
});

module.exports = router;
