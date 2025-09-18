const express = require('express');
const OnChainService = require('../services/OnChainService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     OnChainData:
 *       type: object
 *       properties:
 *         network:
 *           type: string
 *           description: 네트워크 (ethereum, bsc, polygon)
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 데이터 수집 시간
 *         protocols:
 *           type: object
 *           description: 프로토콜별 데이터
 *         largeTransactions:
 *           type: array
 *           description: 대용량 트랜잭션 목록
 *         whaleMovements:
 *           type: array
 *           description: 고래 움직임 목록
 *     TokenUnlock:
 *       type: object
 *       properties:
 *         tokenAddress:
 *           type: string
 *           description: 토큰 주소
 *         tokenSymbol:
 *           type: string
 *           description: 토큰 심볼
 *         unlockDate:
 *           type: string
 *           format: date-time
 *           description: 언락 날짜
 *         unlockAmount:
 *           type: string
 *           description: 언락 수량
 *         unlockPercentage:
 *           type: number
 *           description: 언락 비율
 *         description:
 *           type: string
 *           description: 언락 설명
 *         daysUntilUnlock:
 *           type: number
 *           description: 언락까지 남은 일수
 */

/**
 * @swagger
 * /api/onchain:
 *   get:
 *     summary: 온체인 데이터 서비스 개요
 *     description: 온체인 데이터 분석 서비스의 개요 정보와 사용 가능한 엔드포인트를 반환합니다.
 *     tags: [OnChain]
 *     responses:
 *       200:
 *         description: 온체인 서비스 개요 정보
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
 *                       example: "onchain"
 *                     description:
 *                       type: string
 *                       example: "온체인 데이터 분석 서비스"
 *                     availableEndpoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["/status", "/data", "/whales", "/transactions/large", "/unlocks", "/protocols", "/tokens/monitoring"]
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
 * /api/onchain/status:
 *   get:
 *     summary: 온체인 모니터링 상태 조회
 *     tags: [OnChain]
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
// 루트 엔드포인트 - 온체인 서비스 개요
router.get('/', async (req, res) => {
  try {
    const status = OnChainService.getStatus();
    
    res.json({
      success: true,
      data: {
        module: 'onchain',
        description: '온체인 데이터 분석 서비스',
        availableEndpoints: [
          '/status',
          '/data',
          '/whales',
          '/transactions/large',
          '/unlocks',
          '/protocols',
          '/tokens/monitoring'
        ],
        lastUpdate: new Date().toISOString(),
        status: status.isRunning ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    logger.error('온체인 서비스 개요 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error.message
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = OnChainService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('온체인 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '온체인 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/start:
 *   post:
 *     summary: 온체인 모니터링 시작
 *     tags: [OnChain]
 *     responses:
 *       200:
 *         description: 모니터링이 성공적으로 시작됨
 *       409:
 *         description: 모니터링이 이미 실행 중
 */
router.post('/start', async (req, res) => {
  try {
    await OnChainService.startMonitoring();

    res.json({
      success: true,
      message: '온체인 모니터링이 시작되었습니다.'
    });

  } catch (error) {
    logger.error('온체인 모니터링 시작 실패:', error);
    
    if (error.message.includes('이미 실행 중')) {
      return res.status(409).json({
        success: false,
        message: '온체인 모니터링이 이미 실행 중입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '온체인 모니터링 시작에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/stop:
 *   post:
 *     summary: 온체인 모니터링 중지
 *     tags: [OnChain]
 *     responses:
 *       200:
 *         description: 모니터링이 성공적으로 중지됨
 *       409:
 *         description: 모니터링이 실행 중이 아님
 */
router.post('/stop', async (req, res) => {
  try {
    OnChainService.stopMonitoring();

    res.json({
      success: true,
      message: '온체인 모니터링이 중지되었습니다.'
    });

  } catch (error) {
    logger.error('온체인 모니터링 중지 실패:', error);
    res.status(500).json({
      success: false,
      message: '온체인 모니터링 중지에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/data:
 *   get:
 *     summary: 온체인 데이터 조회
 *     tags: [OnChain]
 *     parameters:
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *           enum: [ethereum, bsc, polygon]
 *         description: 특정 네트워크 데이터만 조회
 *     responses:
 *       200:
 *         description: 온체인 데이터
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
 *                     $ref: '#/components/schemas/OnChainData'
 */
router.get('/data', async (req, res) => {
  try {
    const { network } = req.query;
    
    const data = OnChainService.getOnChainData(network);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    logger.error('온체인 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '온체인 데이터 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/transactions/large:
 *   get:
 *     summary: 대용량 트랜잭션 조회
 *     tags: [OnChain]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 트랜잭션 수 제한
 *       - in: query
 *         name: minValue
 *         schema:
 *           type: number
 *           default: 100
 *         description: 최소 트랜잭션 값 (ETH)
 *     responses:
 *       200:
 *         description: 대용량 트랜잭션 목록
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hash:
 *                             type: string
 *                           from:
 *                             type: string
 *                           to:
 *                             type: string
 *                           value:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           network:
 *                             type: string
 *                     count:
 *                       type: number
 *                     analysis:
 *                       type: object
 */
router.get('/transactions/large', async (req, res) => {
  try {
    const { limit = 50, minValue = 100 } = req.query;
    
    const largeTransactions = OnChainService.getLargeTransactions();
    
    if (!largeTransactions) {
      return res.json({
        success: true,
        data: {
          data: [],
          count: 0,
          analysis: {}
        }
      });
    }

    // 최소 값 필터링
    const filteredTransactions = largeTransactions.data.filter(tx => {
      const value = parseFloat(tx.value) / Math.pow(10, 18); // Wei to ETH
      return value >= parseFloat(minValue);
    });

    // 수 제한
    const limitedTransactions = filteredTransactions.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        data: limitedTransactions,
        count: limitedTransactions.length,
        analysis: largeTransactions.analysis
      }
    });

  } catch (error) {
    logger.error('대용량 트랜잭션 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '대용량 트랜잭션 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/whales:
 *   get:
 *     summary: 고래 움직임 조회
 *     tags: [OnChain]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 움직임 수 제한
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           default: 1000
 *         description: 최소 이동 수량
 *     responses:
 *       200:
 *         description: 고래 움직임 목록
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tokenAddress:
 *                             type: string
 *                           from:
 *                             type: string
 *                           to:
 *                             type: string
 *                           amount:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           transactionHash:
 *                             type: string
 *                           type:
 *                             type: string
 *                     count:
 *                       type: number
 *                     analysis:
 *                       type: object
 */
router.get('/whales', async (req, res) => {
  try {
    const { limit = 50, minAmount = 1000 } = req.query;
    
    const whaleMovements = OnChainService.getWhaleMovements();
    
    if (!whaleMovements) {
      return res.json({
        success: true,
        data: {
          data: [],
          count: 0,
          analysis: {}
        }
      });
    }

    // 최소 수량 필터링
    const filteredMovements = whaleMovements.data.filter(movement => {
      const amount = parseFloat(movement.amount) / Math.pow(10, 18); // Wei to tokens
      return amount >= parseFloat(minAmount);
    });

    // 수 제한
    const limitedMovements = filteredMovements.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        data: limitedMovements,
        count: limitedMovements.length,
        analysis: whaleMovements.analysis
      }
    });

  } catch (error) {
    logger.error('고래 움직임 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '고래 움직임 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/unlocks:
 *   get:
 *     summary: 토큰 언락 스케줄 조회
 *     tags: [OnChain]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 조회할 일수 (기본 7일)
 *     responses:
 *       200:
 *         description: 토큰 언락 스케줄 목록
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
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TokenUnlock'
 *                     count:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/unlocks', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const tokenUnlocks = OnChainService.getTokenUnlockSchedules();
    
    if (!tokenUnlocks) {
      return res.json({
        success: true,
        data: {
          data: [],
          count: 0,
          timestamp: new Date()
        }
      });
    }

    // 일수 필터링
    const filteredUnlocks = tokenUnlocks.data.filter(unlock => 
      unlock.daysUntilUnlock <= parseInt(days)
    );

    res.json({
      success: true,
      data: {
        data: filteredUnlocks,
        count: filteredUnlocks.length,
        timestamp: tokenUnlocks.timestamp
      }
    });

  } catch (error) {
    logger.error('토큰 언락 스케줄 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '토큰 언락 스케줄 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/unlocks:
 *   post:
 *     summary: 토큰 언락 스케줄 추가
 *     tags: [OnChain]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenAddress
 *               - tokenSymbol
 *               - unlockDate
 *               - unlockAmount
 *               - unlockPercentage
 *             properties:
 *               tokenAddress:
 *                 type: string
 *                 description: 토큰 주소
 *               tokenSymbol:
 *                 type: string
 *                 description: 토큰 심볼
 *               unlockDate:
 *                 type: string
 *                 format: date-time
 *                 description: 언락 날짜
 *               unlockAmount:
 *                 type: string
 *                 description: 언락 수량
 *               unlockPercentage:
 *                 type: number
 *                 description: 언락 비율
 *               description:
 *                 type: string
 *                 description: 언락 설명
 *     responses:
 *       200:
 *         description: 토큰 언락 스케줄이 성공적으로 추가됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/unlocks', async (req, res) => {
  try {
    const { tokenAddress, tokenSymbol, unlockDate, unlockAmount, unlockPercentage, description } = req.body;

    if (!tokenAddress || !tokenSymbol || !unlockDate || !unlockAmount || !unlockPercentage) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (tokenAddress, tokenSymbol, unlockDate, unlockAmount, unlockPercentage)'
      });
    }

    OnChainService.addTokenUnlockSchedule({
      tokenAddress,
      tokenSymbol,
      unlockDate,
      unlockAmount,
      unlockPercentage,
      description: description || ''
    });

    res.json({
      success: true,
      message: `${tokenSymbol} 토큰 언락 스케줄이 추가되었습니다.`
    });

  } catch (error) {
    logger.error('토큰 언락 스케줄 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '토큰 언락 스케줄 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/unlocks/{tokenAddress}:
 *   delete:
 *     summary: 토큰 언락 스케줄 제거
 *     tags: [OnChain]
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 토큰 주소
 *     responses:
 *       200:
 *         description: 토큰 언락 스케줄이 성공적으로 제거됨
 *       404:
 *         description: 토큰 언락 스케줄을 찾을 수 없음
 */
router.delete('/unlocks/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    OnChainService.removeTokenUnlockSchedule(tokenAddress);

    res.json({
      success: true,
      message: `토큰 ${tokenAddress}의 언락 스케줄이 제거되었습니다.`
    });

  } catch (error) {
    logger.error('토큰 언락 스케줄 제거 실패:', error);
    res.status(500).json({
      success: false,
      message: '토큰 언락 스케줄 제거에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/protocols:
 *   get:
 *     summary: DeFi 프로토콜 데이터 조회
 *     tags: [OnChain]
 *     parameters:
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *           enum: [ethereum, bsc, polygon]
 *         description: 특정 네트워크의 프로토콜만 조회
 *       - in: query
 *         name: protocol
 *         schema:
 *           type: string
 *         description: 특정 프로토콜만 조회
 *     responses:
 *       200:
 *         description: DeFi 프로토콜 데이터
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
 *                       address:
 *                         type: string
 *                       recentTransactions:
 *                         type: number
 *                       largeTransactions:
 *                         type: number
 *                       totalVolume:
 *                         type: number
 *                       topPairs:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             pair:
 *                               type: string
 *                             volume:
 *                               type: number
 *                             liquidity:
 *                               type: number
 */
router.get('/protocols', async (req, res) => {
  try {
    const { network, protocol } = req.query;
    
    const onChainData = OnChainService.getOnChainData(network);
    const protocolsData = {};

    // 네트워크별 프로토콜 데이터 추출
    Object.keys(onChainData).forEach(networkKey => {
      if (network && networkKey !== network) return;
      
      const networkData = onChainData[networkKey];
      if (networkData && networkData.protocols) {
        Object.keys(networkData.protocols).forEach(protocolKey => {
          if (protocol && protocolKey !== protocol) return;
          
          const key = `${networkKey}-${protocolKey}`;
          protocolsData[key] = networkData.protocols[protocolKey];
        });
      }
    });

    res.json({
      success: true,
      data: protocolsData
    });

  } catch (error) {
    logger.error('DeFi 프로토콜 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'DeFi 프로토콜 데이터 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/tokens/monitoring:
 *   get:
 *     summary: 모니터링 중인 토큰 목록 조회
 *     tags: [OnChain]
 *     responses:
 *       200:
 *         description: 모니터링 중인 토큰 목록
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
 *                     type: string
 *                   description: 토큰 주소 목록
 */
router.get('/tokens/monitoring', async (req, res) => {
  try {
    // 실제 구현에서는 OnChainService에서 모니터링 토큰 목록을 가져와야 함
    const monitoringTokens = [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86a33E6441b8c4C8C0e4b8c4C8C0e4b8c4C8C', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  // WBTC
    ];

    res.json({
      success: true,
      data: monitoringTokens
    });

  } catch (error) {
    logger.error('모니터링 토큰 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '모니터링 토큰 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/tokens/monitoring:
 *   post:
 *     summary: 모니터링 토큰 추가
 *     tags: [OnChain]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenAddress
 *             properties:
 *               tokenAddress:
 *                 type: string
 *                 description: 토큰 주소
 *     responses:
 *       200:
 *         description: 모니터링 토큰이 성공적으로 추가됨
 *       400:
 *         description: 잘못된 요청 데이터
 */
router.post('/tokens/monitoring', async (req, res) => {
  try {
    const { tokenAddress } = req.body;

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        message: 'tokenAddress가 필요합니다.'
      });
    }

    OnChainService.addMonitoringToken(tokenAddress);

    res.json({
      success: true,
      message: `토큰 ${tokenAddress}이(가) 모니터링 목록에 추가되었습니다.`
    });

  } catch (error) {
    logger.error('모니터링 토큰 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '모니터링 토큰 추가에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onchain/tokens/monitoring/{tokenAddress}:
 *   delete:
 *     summary: 모니터링 토큰 제거
 *     tags: [OnChain]
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 토큰 주소
 *     responses:
 *       200:
 *         description: 모니터링 토큰이 성공적으로 제거됨
 */
router.delete('/tokens/monitoring/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    OnChainService.removeMonitoringToken(tokenAddress);

    res.json({
      success: true,
      message: `토큰 ${tokenAddress}이(가) 모니터링 목록에서 제거되었습니다.`
    });

  } catch (error) {
    logger.error('모니터링 토큰 제거 실패:', error);
    res.status(500).json({
      success: false,
      message: '모니터링 토큰 제거에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
