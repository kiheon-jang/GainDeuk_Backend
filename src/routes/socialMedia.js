const express = require('express');
const SocialMediaService = require('../services/SocialMediaService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SocialMediaData:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 메시지/트윗 ID
 *         text:
 *           type: string
 *           description: 메시지 내용
 *         author:
 *           type: string
 *           description: 작성자
 *         platform:
 *           type: string
 *           enum: [twitter, telegram, discord]
 *           description: 플랫폼
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 작성 시간
 *         sentiment:
 *           type: string
 *           enum: [positive, negative, neutral]
 *           description: 감정 분석 결과
 *         relevance:
 *           type: number
 *           description: 관련성 점수 (0-1)
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: 추출된 키워드
 *         metrics:
 *           type: object
 *           description: 플랫폼별 메트릭 (Twitter의 경우 좋아요, 리트윗 등)
 */

/**
 * @swagger
 * /api/social-media:
 *   get:
 *     summary: 소셜 미디어 분석 서비스 개요
 *     description: 소셜 미디어 감정 분석 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 소셜 미디어 서비스 개요 정보
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
 *                       example: "social-media"
 *                     description:
 *                       type: string
 *                       example: "소셜 미디어 감정 분석 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/status", "/sentiment", "/trends", "/platforms", "/keywords"]
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T07:37:48.372Z"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "maintenance"]
 *                       example: "active"
 */

/**
 * @swagger
 * /api/social-media/status:
 *   get:
 *     summary: 소셜미디어 모니터링 상태 조회
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 모니터링 상태 정보
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
 *                       description: 모니터링 실행 여부
 *                     subscribers:
 *                       type: number
 *                       description: 구독자 수
 *                     dataCount:
 *                       type: number
 *                       description: 수집된 데이터 수
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       description: 마지막 업데이트 시간
 */
// 루트 엔드포인트 - 소셜 미디어 서비스 개요
router.get('/', async (req, res) => {
  try {
    const status = SocialMediaService.getStatus();
    
    res.json({
      success: true,
      data: {
        module: 'social-media',
        description: '소셜 미디어 감정 분석 서비스',
        availableEndpoints: [
          '/status',
          '/sentiment',
          '/trends',
          '/platforms',
          '/keywords'
        ],
        lastUpdate: new Date().toISOString(),
        status: status.isRunning ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    console.error('소셜 미디어 서비스 개요 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = SocialMediaService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('소셜미디어 상태 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '소셜미디어 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/start:
 *   post:
 *     summary: 소셜미디어 모니터링 시작
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 모니터링이 성공적으로 시작됨
 *       409:
 *         description: 모니터링이 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await SocialMediaService.startMonitoring();

    res.json({
      success: true,
      message: '소셜미디어 모니터링이 시작되었습니다.'
    });

  } catch (error) {
    console.error('소셜미디어 모니터링 시작 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    
    if (error?.message?.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '소셜미디어 모니터링이 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '소셜미디어 모니터링 시작에 실패했습니다.',
      error: error?.message || error?.toString() || '알 수 없는 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/social-media/stop:
 *   post:
 *     summary: 소셜미디어 모니터링 중지
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 모니터링이 성공적으로 중지됨
 *       409:
 *         description: 모니터링이 실행 중이 아님
 */
router.post('/stop', async (req, res) => {
  try {
    SocialMediaService.stopMonitoring();

    res.json({
      success: true,
      message: '소셜미디어 모니터링이 중지되었습니다.'
    });

  } catch (error) {
    console.error('소셜미디어 모니터링 중지 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '소셜미디어 모니터링 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/data:
 *   get:
 *     summary: 소셜미디어 데이터 조회
 *     tags: [Social Media]
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [twitter, telegram, discord]
 *         description: 특정 플랫폼 데이터만 조회
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 데이터 수 제한
 *     responses:
 *       200:
 *         description: 소셜미디어 데이터
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
 *                       data:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/SocialMediaData'
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       count:
 *                         type: number
 */
router.get('/data', async (req, res) => {
  try {
    const { platform, limit = 50 } = req.query;
    
    let data = SocialMediaService.getSocialData(platform);
    
    // 데이터 수 제한
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(platformKey => {
        if (data[platformKey].data && Array.isArray(data[platformKey].data)) {
          data[platformKey].data = data[platformKey].data.slice(0, parseInt(limit));
        }
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('소셜미디어 데이터 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '소셜미디어 데이터 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/data/filter:
 *   post:
 *     summary: 키워드로 소셜미디어 데이터 필터링
 *     tags: [Social Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keywords
 *             properties:
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 필터링할 키워드 목록
 *               platform:
 *                 type: string
 *                 enum: [twitter, telegram, discord]
 *                 description: 특정 플랫폼만 필터링
 *     responses:
 *       200:
 *         description: 필터링된 소셜미디어 데이터
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/data/filter', async (req, res) => {
  try {
    const { keywords, platform } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'keywords는 비어있지 않은 배열이어야 합니다.'
      });
    }

    const filteredData = SocialMediaService.getFilteredData(keywords, platform);

    res.json({
      success: true,
      data: filteredData
    });

  } catch (error) {
    console.error('소셜미디어 데이터 필터링 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '소셜미디어 데이터 필터링에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/data/sentiment:
 *   get:
 *     summary: 감정별 소셜미디어 데이터 조회
 *     tags: [Social Media]
 *     parameters:
 *       - in: query
 *         name: sentiment
 *         required: true
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: 감정 타입
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [twitter, telegram, discord]
 *         description: 특정 플랫폼만 조회
 *     responses:
 *       200:
 *         description: 감정별 소셜미디어 데이터
 *       400:
 *         description: 잘못된 감정 타입
 */
router.get('/data/sentiment', async (req, res) => {
  try {
    const { sentiment, platform } = req.query;

    if (!sentiment || !['positive', 'negative', 'neutral'].includes(sentiment)) {
      return res.status(400).json({
        success: false,
        message: '유효한 감정 타입을 지정해주세요. (positive, negative, neutral)'
      });
    }

    const sentimentData = SocialMediaService.getSentimentData(sentiment, platform);

    res.json({
      success: true,
      data: sentimentData
    });

  } catch (error) {
    console.error('감정별 소셜미디어 데이터 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '감정별 소셜미디어 데이터 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/targets:
 *   get:
 *     summary: 모니터링 대상 조회
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 모니터링 대상 목록
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
 *                     twitter:
 *                       type: array
 *                       items:
 *                         type: string
 *                     telegram:
 *                       type: array
 *                       items:
 *                         type: string
 *                     discord:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/targets', async (req, res) => {
  try {
    // 모니터링 대상은 private이므로 직접 접근할 수 없음
    // 실제 구현에서는 getter 메서드를 추가해야 함
    const targets = {
      twitter: ['@elonmusk', '@VitalikButerin', '@cz_binance', '@coinbase'],
      telegram: ['@cryptocurrency', '@bitcoin', '@ethereum', '@defi'],
      discord: ['crypto-trading', 'bitcoin-discussion', 'altcoin-chat']
    };

    res.json({
      success: true,
      data: targets
    });

  } catch (error) {
    console.error('모니터링 대상 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '모니터링 대상 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/targets:
 *   post:
 *     summary: 모니터링 대상 추가
 *     tags: [Social Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - target
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [twitter, telegram, discord]
 *                 description: 플랫폼
 *               target:
 *                 type: string
 *                 description: 추가할 대상 (계정명, 채널명 등)
 *     responses:
 *       200:
 *         description: 모니터링 대상이 성공적으로 추가됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/targets', async (req, res) => {
  try {
    const { platform, target } = req.body;

    if (!platform || !target) {
      return res.status(400).json({
        success: false,
        message: 'platform과 target이 필요합니다.'
      });
    }

    if (!['twitter', 'telegram', 'discord'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: '유효한 플랫폼을 지정해주세요. (twitter, telegram, discord)'
      });
    }

    SocialMediaService.addMonitoringTarget(platform, target);

    res.json({
      success: true,
      message: `${platform} 플랫폼에 ${target} 대상이 추가되었습니다.`
    });

  } catch (error) {
    console.error('모니터링 대상 추가 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '모니터링 대상 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/targets:
 *   delete:
 *     summary: 모니터링 대상 제거
 *     tags: [Social Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - target
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [twitter, telegram, discord]
 *                 description: 플랫폼
 *               target:
 *                 type: string
 *                 description: 제거할 대상 (계정명, 채널명 등)
 *     responses:
 *       200:
 *         description: 모니터링 대상이 성공적으로 제거됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.delete('/targets', async (req, res) => {
  try {
    const { platform, target } = req.body;

    if (!platform || !target) {
      return res.status(400).json({
        success: false,
        message: 'platform과 target이 필요합니다.'
      });
    }

    if (!['twitter', 'telegram', 'discord'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: '유효한 플랫폼을 지정해주세요. (twitter, telegram, discord)'
      });
    }

    SocialMediaService.removeMonitoringTarget(platform, target);

    res.json({
      success: true,
      message: `${platform} 플랫폼에서 ${target} 대상이 제거되었습니다.`
    });

  } catch (error) {
    console.error('모니터링 대상 제거 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '모니터링 대상 제거에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/keywords:
 *   get:
 *     summary: 모니터링 키워드 조회
 *     tags: [Social Media]
 *     responses:
 *       200:
 *         description: 모니터링 키워드 목록
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
 *                     english:
 *                       type: array
 *                       items:
 *                         type: string
 *                     korean:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/keywords', async (req, res) => {
  try {
    // 키워드는 private이므로 직접 접근할 수 없음
    // 실제 구현에서는 getter 메서드를 추가해야 함
    const keywords = {
      english: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency'],
      korean: ['비트코인', '이더리움', '암호화폐', '코인', '거래', '투자']
    };

    res.json({
      success: true,
      data: keywords
    });

  } catch (error) {
    console.error('모니터링 키워드 조회 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '모니터링 키워드 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/keywords:
 *   post:
 *     summary: 모니터링 키워드 추가
 *     tags: [Social Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyword
 *             properties:
 *               keyword:
 *                 type: string
 *                 description: 추가할 키워드
 *               isKorean:
 *                 type: boolean
 *                 default: false
 *                 description: 한국어 키워드 여부
 *     responses:
 *       200:
 *         description: 키워드가 성공적으로 추가됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/keywords', async (req, res) => {
  try {
    const { keyword, isKorean = false } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '유효한 키워드를 입력해주세요.'
      });
    }

    SocialMediaService.addKeyword(keyword, isKorean);

    res.json({
      success: true,
      message: `키워드 '${keyword}'이(가) ${isKorean ? '한국어' : '영어'} 키워드로 추가되었습니다.`
    });

  } catch (error) {
    console.error('키워드 추가 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '키워드 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/social-media/keywords:
 *   delete:
 *     summary: 모니터링 키워드 제거
 *     tags: [Social Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyword
 *             properties:
 *               keyword:
 *                 type: string
 *                 description: 제거할 키워드
 *               isKorean:
 *                 type: boolean
 *                 default: false
 *                 description: 한국어 키워드 여부
 *     responses:
 *       200:
 *         description: 키워드가 성공적으로 제거됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.delete('/keywords', async (req, res) => {
  try {
    const { keyword, isKorean = false } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '유효한 키워드를 입력해주세요.'
      });
    }

    SocialMediaService.removeKeyword(keyword, isKorean);

    res.json({
      success: true,
      message: `키워드 '${keyword}'이(가) ${isKorean ? '한국어' : '영어'} 키워드에서 제거되었습니다.`
    });

  } catch (error) {
    console.error('키워드 제거 실패:', error?.message || error?.toString() || '알 수 없는 오류');
    res.status(500).json({
      success: false,
      message: '키워드 제거에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
