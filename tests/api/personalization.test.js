const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const UserProfile = require('../../src/models/UserProfile');

describe('Personalization API', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gaindeuk_test');
    }
  });

  beforeEach(async () => {
    await UserProfile.deleteMany({});
  });

  afterAll(async () => {
    await UserProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/personalization/:userId/recommendations', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-recommendations',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate',
        availableTime: 'part-time',
        preferredTimeframes: ['1h', '4h'],
        preferredCoins: ['BTC', 'ETH'],
        maxPositionSize: 5000,
        personalizationSettings: {
          signalSensitivity: 7,
          preferredSignalTypes: ['technical', 'fundamental'],
          autoTradingEnabled: false,
          maxDailySignals: 15
        }
      });
    });

    it('기본 개인화 추천을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/personalization/test-user-recommendations/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestedTimeframes');
      expect(response.body.data).toHaveProperty('suggestedCoins');
      expect(response.body.data).toHaveProperty('riskLevel');
      expect(response.body.data).toHaveProperty('maxDailySignals');
      expect(response.body.data).toHaveProperty('tradingStrategy');
      expect(response.body.data).toHaveProperty('signalFilters');
      expect(response.body.data).toHaveProperty('positionSizing');
      expect(response.body.data).toHaveProperty('alertSettings');
      expect(response.body.data).toHaveProperty('marketAdaptation');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(response.body.data).toHaveProperty('profileCompleteness');

      // 사용자 설정이 반영되었는지 확인
      expect(response.body.data.suggestedTimeframes).toEqual(['1h', '4h']);
      expect(response.body.data.suggestedCoins).toEqual(['BTC', 'ETH']);
      expect(response.body.data.maxDailySignals).toBe(15);
    });

    it('쿼리 파라미터로 시장 데이터를 전달할 수 있어야 함', async () => {
      const marketData = {
        volatility: 0.6,
        trend: 'bull',
        volume: 1000000
      };

      const response = await request(app)
        .get('/api/personalization/test-user-recommendations/recommendations')
        .query({ marketData: JSON.stringify(marketData) })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('존재하지 않는 사용자에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/personalization/non-existent-user/recommendations')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('POST /api/personalization/:userId/recommendations', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-post-recommendations',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced',
        availableTime: 'full-time'
      });
    });

    it('시장 데이터와 함께 개인화 추천을 생성해야 함', async () => {
      const requestData = {
        marketData: {
          volatility: 0.7,
          trend: 'bull',
          volume: 1500000
        },
        availableSignals: [
          {
            coin: 'BTC',
            type: 'technical',
            confidence: 85,
            timestamp: new Date().toISOString()
          },
          {
            coin: 'ETH',
            type: 'fundamental',
            confidence: 70,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await request(app)
        .post('/api/personalization/test-user-post-recommendations/recommendations')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.marketAdaptation).toBeDefined();
    });

    it('빈 시장 데이터로도 추천을 생성해야 함', async () => {
      const response = await request(app)
        .post('/api/personalization/test-user-post-recommendations/recommendations')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('존재하지 않는 사용자에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/personalization/non-existent-user/recommendations')
        .send({ marketData: {} })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('GET /api/personalization/:userId/strategy', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-strategy',
        investmentStyle: 'conservative',
        riskTolerance: 4,
        experienceLevel: 'beginner',
        availableTime: 'minimal'
      });
    });

    it('사용자별 맞춤 거래 전략을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/personalization/test-user-strategy/strategy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('entryStrategy');
      expect(response.body.data).toHaveProperty('exitStrategy');
      expect(response.body.data).toHaveProperty('stopLoss');
      expect(response.body.data).toHaveProperty('takeProfit');
      expect(response.body.data).toHaveProperty('positionManagement');
      expect(response.body.data).toHaveProperty('riskManagement');

      // 보수적 투자자에게 적절한 전략인지 확인
      expect(response.body.data.entryStrategy.type).toBe('conservative');
      expect(response.body.data.exitStrategy.type).toBe('set_and_forget');
    });

    it('존재하지 않는 사용자에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/personalization/non-existent-user/strategy')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('POST /api/personalization/:userId/signals/filter', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-signal-filter',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate',
        personalizationSettings: {
          signalSensitivity: 7,
          preferredSignalTypes: ['technical', 'fundamental']
        },
        activeHours: {
          start: '09:00',
          end: '18:00',
          timezone: 'Asia/Seoul'
        }
      });
    });

    it('사용자 프로필에 따라 신호를 필터링해야 함', async () => {
      const signals = [
        {
          coin: 'BTC',
          type: 'technical',
          confidence: 85,
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
          metadata: { volume: 1000000 }
        },
        {
          coin: 'ETH',
          type: 'sentiment',
          confidence: 60,
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
          metadata: { volume: 800000 }
        },
        {
          coin: 'ADA',
          type: 'technical',
          confidence: 50,
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
          metadata: { volume: 500000 }
        }
      ];

      const response = await request(app)
        .post('/api/personalization/test-user-signal-filter/signals/filter')
        .send({ signals })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('originalCount');
      expect(response.body.data).toHaveProperty('filteredCount');
      expect(response.body.data).toHaveProperty('filteredSignals');
      expect(response.body.data).toHaveProperty('filterCriteria');

      expect(response.body.data.originalCount).toBe(3);
      expect(response.body.data.filteredCount).toBeLessThanOrEqual(3);
      expect(response.body.data.filteredSignals).toBeInstanceOf(Array);
    });

    it('잘못된 신호 데이터로 필터링 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/personalization/test-user-signal-filter/signals/filter')
        .send({ signals: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('signals는 배열이어야 합니다');
    });

    it('존재하지 않는 사용자에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/personalization/non-existent-user/signals/filter')
        .send({ signals: [] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('POST /api/personalization/cache/clear', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-cache-clear',
        investmentStyle: 'moderate',
        riskTolerance: 5
      });
    });

    it('특정 사용자의 캐시를 클리어해야 함', async () => {
      // 먼저 캐시 생성
      await request(app)
        .get('/api/personalization/test-user-cache-clear/recommendations')
        .expect(200);

      // 특정 사용자 캐시 클리어
      const response = await request(app)
        .post('/api/personalization/cache/clear')
        .send({ userId: 'test-user-cache-clear' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('test-user-cache-clear');
    });

    it('모든 캐시를 클리어해야 함', async () => {
      // 먼저 캐시 생성
      await request(app)
        .get('/api/personalization/test-user-cache-clear/recommendations')
        .expect(200);

      // 모든 캐시 클리어
      const response = await request(app)
        .post('/api/personalization/cache/clear')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('모든 캐시가 클리어되었습니다');
    });
  });

  describe('GET /api/personalization/cache/stats', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user-cache-stats',
        investmentStyle: 'moderate',
        riskTolerance: 5
      });
    });

    it('캐시 통계를 반환해야 함', async () => {
      // 먼저 캐시 생성
      await request(app)
        .get('/api/personalization/test-user-cache-stats/recommendations')
        .expect(200);

      const response = await request(app)
        .get('/api/personalization/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('entries');
      expect(Array.isArray(response.body.data.entries)).toBe(true);
      expect(response.body.data.size).toBeGreaterThan(0);
    });

    it('캐시가 없을 때도 통계를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/personalization/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('entries');
      expect(response.body.data.size).toBe(0);
    });
  });

  describe('다양한 사용자 프로필 테스트', () => {
    it('보수적 투자자에게 적절한 추천을 반환해야 함', async () => {
      await UserProfile.create({
        userId: 'conservative-user',
        investmentStyle: 'conservative',
        riskTolerance: 3,
        experienceLevel: 'beginner',
        availableTime: 'minimal'
      });

      const response = await request(app)
        .get('/api/personalization/conservative-user/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskLevel).toBeLessThanOrEqual(5);
      expect(response.body.data.suggestedTimeframes).toEqual(
        expect.arrayContaining(['1h', '4h', '1d'])
      );
    });

    it('공격적 투자자에게 적절한 추천을 반환해야 함', async () => {
      await UserProfile.create({
        userId: 'aggressive-user',
        investmentStyle: 'aggressive',
        riskTolerance: 9,
        experienceLevel: 'expert',
        availableTime: 'full-time'
      });

      const response = await request(app)
        .get('/api/personalization/aggressive-user/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskLevel).toBeGreaterThan(5);
      expect(response.body.data.suggestedTimeframes).toEqual(
        expect.arrayContaining(['1m', '5m', '15m'])
      );
    });

    it('전문가 투자자에게 적절한 전략을 반환해야 함', async () => {
      await UserProfile.create({
        userId: 'expert-user',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'expert',
        availableTime: 'full-time',
        learningData: {
          successfulTrades: 50,
          totalTrades: 60,
          averageHoldTime: 120
        }
      });

      const response = await request(app)
        .get('/api/personalization/expert-user/strategy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entryStrategy.type).toBe('aggressive');
      expect(response.body.data.exitStrategy.type).toBe('dynamic');
    });
  });
});
