const express = require('express');
const UserProfile = require('../models/UserProfile');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           description: 사용자 고유 ID
 *         investmentStyle:
 *           type: string
 *           enum: [conservative, moderate, aggressive, speculative]
 *           description: 투자 스타일
 *         riskTolerance:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *           description: 위험 감수도
 *         experienceLevel:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           description: 경험 수준
 *         availableTime:
 *           type: string
 *           enum: [minimal, part-time, full-time]
 *           description: 가용 시간
 *         preferredTimeframes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w]
 *           description: 선호하는 타임프레임
 *         preferredCoins:
 *           type: array
 *           items:
 *             type: string
 *           description: 선호하는 코인들
 *         maxPositionSize:
 *           type: number
 *           description: 최대 포지션 크기 (USD)
 *         notificationSettings:
 *           type: object
 *           description: 알림 설정
 *         personalizationSettings:
 *           type: object
 *           description: 개인화 설정
 */

/**
 * @swagger
 * /api/user-profiles:
 *   get:
 *     summary: 모든 사용자 프로필 조회
 *     tags: [User Profiles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: investmentStyle
 *         schema:
 *           type: string
 *           enum: [conservative, moderate, aggressive, speculative]
 *         description: 투자 스타일 필터
 *       - in: query
 *         name: experienceLevel
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *         description: 경험 수준 필터
 *     responses:
 *       200:
 *         description: 사용자 프로필 목록
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
 *                     $ref: '#/components/schemas/UserProfile'
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
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 필터 조건 구성
    const filter = { isActive: true };
    if (req.query.investmentStyle) {
      filter.investmentStyle = req.query.investmentStyle;
    }
    if (req.query.experienceLevel) {
      filter.experienceLevel = req.query.experienceLevel;
    }
    
    const [profiles, total] = await Promise.all([
      UserProfile.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ lastActive: -1 }),
      UserProfile.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: profiles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('사용자 프로필 목록 조회 실패:', error);
    } else {
      console.error('사용자 프로필 목록 조회 실패:', error);
    }
    res.status(500).json({
      success: false,
      message: '사용자 프로필 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles/{userId}:
 *   get:
 *     summary: 특정 사용자 프로필 조회
 *     tags: [User Profiles]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 프로필 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       404:
 *         description: 프로필을 찾을 수 없음
 */
router.get('/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ 
      userId: req.params.userId,
      isActive: true 
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('사용자 프로필 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 프로필 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles:
 *   post:
 *     summary: 새로운 사용자 프로필 생성
 *     tags: [User Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               investmentStyle:
 *                 type: string
 *                 enum: [conservative, moderate, aggressive, speculative]
 *               riskTolerance:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               experienceLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *               availableTime:
 *                 type: string
 *                 enum: [minimal, part-time, full-time]
 *               preferredTimeframes:
 *                 type: array
 *                 items:
 *                   type: string
 *               preferredCoins:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxPositionSize:
 *                 type: number
 *     responses:
 *       201:
 *         description: 프로필이 성공적으로 생성됨
 *       400:
 *         description: 잘못된 요청 데이터
 *       409:
 *         description: 이미 존재하는 사용자 ID
 */
router.post('/', async (req, res) => {
  try {
    const existingProfile = await UserProfile.findOne({ 
      userId: req.body.userId 
    });
    
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 사용자 ID입니다.'
      });
    }
    
    const profile = new UserProfile(req.body);
    await profile.save();
    
    logger.info(`새로운 사용자 프로필 생성: ${req.body.userId}`);
    
    res.status(201).json({
      success: true,
      data: profile,
      message: '사용자 프로필이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    logger.error('사용자 프로필 생성 실패:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 데이터입니다.',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: '사용자 프로필 생성에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles/{userId}:
 *   put:
 *     summary: 사용자 프로필 업데이트
 *     tags: [User Profiles]
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
 *               investmentStyle:
 *                 type: string
 *                 enum: [conservative, moderate, aggressive, speculative]
 *               riskTolerance:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               experienceLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *               availableTime:
 *                 type: string
 *                 enum: [minimal, part-time, full-time]
 *               preferredTimeframes:
 *                 type: array
 *                 items:
 *                   type: string
 *               preferredCoins:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxPositionSize:
 *                 type: number
 *               notificationSettings:
 *                 type: object
 *               personalizationSettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: 프로필이 성공적으로 업데이트됨
 *       404:
 *         description: 프로필을 찾을 수 없음
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.put('/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.params.userId, isActive: true },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    }
    
    logger.info(`사용자 프로필 업데이트: ${req.params.userId}`);
    
    res.json({
      success: true,
      data: profile,
      message: '사용자 프로필이 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    logger.error('사용자 프로필 업데이트 실패:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 데이터입니다.',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: '사용자 프로필 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles/{userId}:
 *   delete:
 *     summary: 사용자 프로필 삭제 (소프트 삭제)
 *     tags: [User Profiles]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 프로필이 성공적으로 삭제됨
 *       404:
 *         description: 프로필을 찾을 수 없음
 */
router.delete('/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.params.userId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    }
    
    logger.info(`사용자 프로필 삭제: ${req.params.userId}`);
    
    res.json({
      success: true,
      message: '사용자 프로필이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('사용자 프로필 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 프로필 삭제에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles/{userId}/recommendations:
 *   get:
 *     summary: 사용자별 개인화된 추천 생성
 *     tags: [User Profiles]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
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
 *                   type: object
 *                   properties:
 *                     suggestedTimeframes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     suggestedCoins:
 *                       type: array
 *                       items:
 *                         type: string
 *                     riskLevel:
 *                       type: number
 *                     maxDailySignals:
 *                       type: number
 *       404:
 *         description: 프로필을 찾을 수 없음
 */
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const recommendations = await UserProfile.generatePersonalizedRecommendations(
      req.params.userId
    );
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('개인화 추천 생성 실패:', error);
    
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
 * /api/user-profiles/{userId}/trading-result:
 *   post:
 *     summary: 거래 결과 업데이트
 *     tags: [User Profiles]
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
 *               - successful
 *               - holdTime
 *             properties:
 *               successful:
 *                 type: boolean
 *                 description: 거래 성공 여부
 *               holdTime:
 *                 type: number
 *                 description: 보유 시간 (분)
 *     responses:
 *       200:
 *         description: 거래 결과가 성공적으로 업데이트됨
 *       404:
 *         description: 프로필을 찾을 수 없음
 */
router.post('/:userId/trading-result', async (req, res) => {
  try {
    const { successful, holdTime } = req.body;
    
    if (typeof successful !== 'boolean' || typeof holdTime !== 'number') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 데이터입니다. successful은 boolean, holdTime은 number여야 합니다.'
      });
    }
    
    const profile = await UserProfile.findOne({ 
      userId: req.params.userId,
      isActive: true 
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    }
    
    await profile.updateTradingResult(successful, holdTime);
    
    logger.info(`거래 결과 업데이트: ${req.params.userId}, 성공: ${successful}, 보유시간: ${holdTime}분`);
    
    res.json({
      success: true,
      data: profile,
      message: '거래 결과가 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    logger.error('거래 결과 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '거래 결과 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/user-profiles/{userId}/filter-signals:
 *   post:
 *     summary: 사용자 프로필 기반 신호 필터링
 *     tags: [User Profiles]
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
 *     responses:
 *       200:
 *         description: 필터링된 신호 목록
 *       404:
 *         description: 프로필을 찾을 수 없음
 */
router.post('/:userId/filter-signals', async (req, res) => {
  try {
    const { signals } = req.body;
    
    if (!Array.isArray(signals)) {
      return res.status(400).json({
        success: false,
        message: 'signals는 배열이어야 합니다.'
      });
    }
    
    const profile = await UserProfile.findOne({ 
      userId: req.params.userId,
      isActive: true 
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '사용자 프로필을 찾을 수 없습니다.'
      });
    }
    
    const filteredSignals = profile.filterSignals(signals);
    
    res.json({
      success: true,
      data: {
        originalCount: signals.length,
        filteredCount: filteredSignals.length,
        filteredSignals
      }
    });
  } catch (error) {
    logger.error('신호 필터링 실패:', error);
    res.status(500).json({
      success: false,
      message: '신호 필터링에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
