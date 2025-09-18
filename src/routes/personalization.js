const express = require('express');
const PersonalizationService = require('../services/PersonalizationService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PersonalizedRecommendation:
 *       type: object
 *       properties:
 *         suggestedTimeframes:
 *           type: array
 *           items:
 *             type: string
 *           description: 추천 타임프레임
 *         suggestedCoins:
 *           type: array
 *           items:
 *             type: string
 *           description: 추천 코인
 *         riskLevel:
 *           type: number
 *           description: 리스크 레벨 (1-10)
 *         maxDailySignals:
 *           type: number
 *           description: 일일 최대 신호 수
 *         tradingStrategy:
 *           type: object
 *           description: 거래 전략
 *         signalFilters:
 *           type: object
 *           description: 신호 필터
 *         positionSizing:
 *           type: object
 *           description: 포지션 사이징
 *         alertSettings:
 *           type: object
 *           description: 알림 설정
 *         marketAdaptation:
 *           type: object
 *           description: 시장 적응 전략
 *         confidence:
 *           type: number
 *           description: 추천 신뢰도
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: 마지막 업데이트 시간
 *         profileCompleteness:
 *           type: number
 *           description: 프로필 완성도
 */

/**
 * @swagger
 * /api/personalization/{userId}/recommendations:
 *   get:
 *     summary: 사용자별 개인화된 추천 생성
 *     tags: [Personalization]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *       - in: query
 *         name: marketData
 *         schema:
 *           type: string
 *         description: 시장 데이터 (JSON 문자열)
 *       - in: query
 *         name: availableSignals
 *         schema:
 *           type: string
 *         description: 사용 가능한 신호들 (JSON 문자열)
 *     responses:
 *       200:
 *         description: 개인화된 추천 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PersonalizedRecommendation'
 *       404:
 *         description: 사용자 프로필을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 쿼리 파라미터에서 시장 데이터와 신호 파싱
    let marketData = {};
    let availableSignals = [];
    
    if (req.query.marketData) {
      try {
        marketData = JSON.parse(req.query.marketData);
      } catch (error) {
        logger.warn('시장 데이터 파싱 실패:', error);
      }
    }
    
    if (req.query.availableSignals) {
      try {
        availableSignals = JSON.parse(req.query.availableSignals);
      } catch (error) {
        logger.warn('신호 데이터 파싱 실패:', error);
      }
    }

    const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
      userId,
      marketData,
      availableSignals
    );

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    if (logger && logger.error) {
      logger.error('개인화 추천 생성 실패:', error);
    } else {
      console.error('개인화 추천 생성 실패:', error);
    }
    
    if (error.message === '사용자 프로필을 찾을 수 없습니다.') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '개인화 추천 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/personalization/{userId}/recommendations:
 *   post:
 *     summary: 시장 데이터와 함께 개인화된 추천 생성
 *     tags: [Personalization]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marketData:
 *                 type: object
 *                 description: 현재 시장 데이터
 *                 properties:
 *                   volatility:
 *                     type: number
 *                     description: 시장 변동성
 *                   trend:
 *                     type: string
 *                     enum: [bull, bear, sideways]
 *                     description: 시장 트렌드
 *                   volume:
 *                     type: number
 *                     description: 거래량
 *               availableSignals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     coin:
 *                       type: string
 *                     type:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 description: 사용 가능한 신호들
 *     responses:
 *       200:
 *         description: 개인화된 추천 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PersonalizedRecommendation'
 *       404:
 *         description: 사용자 프로필을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { marketData = {}, availableSignals = [] } = req.body;

    const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
      userId,
      marketData,
      availableSignals
    );

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    if (logger && logger.error) {
      logger.error('개인화 추천 생성 실패:', error);
    } else {
      console.error('개인화 추천 생성 실패:', error);
    }
    
    if (error.message === '사용자 프로필을 찾을 수 없습니다.') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '개인화 추천 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/personalization/{userId}/strategy:
 *   get:
 *     summary: 사용자별 맞춤 거래 전략 생성
 *     tags: [Personalization]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 맞춤 거래 전략
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
 *                     entryStrategy:
 *                       type: object
 *                       description: 진입 전략
 *                     exitStrategy:
 *                       type: object
 *                       description: 청산 전략
 *                     stopLoss:
 *                       type: object
 *                       description: 손절가 설정
 *                     takeProfit:
 *                       type: object
 *                       description: 목표가 설정
 *                     positionManagement:
 *                       type: object
 *                       description: 포지션 관리
 *                     riskManagement:
 *                       type: object
 *                       description: 리스크 관리
 *       404:
 *         description: 사용자 프로필을 찾을 수 없음
 */
router.get('/:userId/strategy', async (req, res) => {
  try {
    const { userId } = req.params;

    // 기본 추천을 통해 전략 정보 추출
    const recommendations = await PersonalizationService.generatePersonalizedRecommendations(userId);
    
    res.json({
      success: true,
      data: {
        entryStrategy: recommendations.tradingStrategy.entryStrategy,
        exitStrategy: recommendations.tradingStrategy.exitStrategy,
        stopLoss: recommendations.tradingStrategy.stopLoss,
        takeProfit: recommendations.tradingStrategy.takeProfit,
        positionManagement: recommendations.tradingStrategy.positionManagement,
        riskManagement: recommendations.tradingStrategy.riskManagement
      }
    });

  } catch (error) {
    logger.error('거래 전략 생성 실패:', error);
    
    if (error.message === '사용자 프로필을 찾을 수 없습니다.') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '거래 전략 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/personalization/{userId}/signals/filter:
 *   post:
 *     summary: 사용자 프로필 기반 신호 필터링
 *     tags: [Personalization]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
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
 *                     coin:
 *                       type: string
 *                     type:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     metadata:
 *                       type: object
 *                 description: 필터링할 신호 목록
 *     responses:
 *       200:
 *         description: 필터링된 신호 목록
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
 *                     originalCount:
 *                       type: number
 *                       description: 원본 신호 수
 *                     filteredCount:
 *                       type: number
 *                       description: 필터링된 신호 수
 *                     filteredSignals:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 필터링된 신호들
 *                     filterCriteria:
 *                       type: object
 *                       description: 적용된 필터 기준
 *       404:
 *         description: 사용자 프로필을 찾을 수 없음
 */
router.post('/:userId/signals/filter', async (req, res) => {
  try {
    const { userId } = req.params;
    const { signals } = req.body;

    if (!Array.isArray(signals)) {
      return res.status(400).json({
        success: false,
        message: 'signals는 배열이어야 합니다.'
      });
    }

    // 개인화 추천을 통해 필터 기준 가져오기
    const recommendations = await PersonalizationService.generatePersonalizedRecommendations(userId);
    const filterCriteria = recommendations.signalFilters;

    // 신호 필터링 로직
    const filteredSignals = signals.filter(signal => {
      // 신뢰도 필터
      if (signal.confidence < filterCriteria.minConfidence) {
        return false;
      }

      // 신호 타입 필터
      if (filterCriteria.preferredTypes.length > 0) {
        if (!filterCriteria.preferredTypes.includes(signal.type)) {
          return false;
        }
      }

      // 시간 필터
      if (filterCriteria.timeFilter.enabled) {
        const signalTime = new Date(signal.timestamp);
        const hour = signalTime.getHours();
        const startHour = parseInt(filterCriteria.timeFilter.hours.start.split(':')[0]);
        const endHour = parseInt(filterCriteria.timeFilter.hours.end.split(':')[0]);
        
        if (hour < startHour || hour > endHour) {
          return false;
        }
      }

      return true;
    });

    res.json({
      success: true,
      data: {
        originalCount: signals.length,
        filteredCount: filteredSignals.length,
        filteredSignals,
        filterCriteria
      }
    });

  } catch (error) {
    logger.error('신호 필터링 실패:', error);
    
    if (error.message === '사용자 프로필을 찾을 수 없습니다.') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '신호 필터링에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/personalization/cache/clear:
 *   post:
 *     summary: 개인화 추천 캐시 클리어
 *     tags: [Personalization]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 특정 사용자 캐시만 클리어 (선택사항)
 *     responses:
 *       200:
 *         description: 캐시 클리어 완료
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { userId } = req.body;

    PersonalizationService.clearCache(userId);

    res.json({
      success: true,
      message: userId ? `사용자 ${userId}의 캐시가 클리어되었습니다.` : '모든 캐시가 클리어되었습니다.'
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
 * /api/personalization/cache/stats:
 *   get:
 *     summary: 개인화 추천 캐시 통계 조회
 *     tags: [Personalization]
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
    const stats = PersonalizationService.getCacheStats();

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

module.exports = router;
