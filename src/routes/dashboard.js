const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: 대시보드 데이터 조회
 *     description: AI 추천 코인, 사용자 프로필, 시장 현황 등 대시보드에 필요한 모든 데이터를 조회합니다.
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: "사용자 ID (기본값 default)"
 *         example: user123
 *     responses:
 *       200:
 *         description: 대시보드 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardData'
 *                 message:
 *                   type: string
 *                   example: 대시보드 데이터를 성공적으로 조회했습니다.
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 대시보드 데이터를 생성하는 중 오류가 발생했습니다.
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', DashboardController.getDashboardData);

module.exports = router;
