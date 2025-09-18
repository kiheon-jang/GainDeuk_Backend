const mongoose = require('mongoose');
const PersonalizationService = require('../../src/services/PersonalizationService');
const UserProfile = require('../../src/models/UserProfile');

describe('PersonalizationService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gaindeuk_test');
    }
  });

  beforeEach(async () => {
    await UserProfile.deleteMany({});
    PersonalizationService.clearCache();
  });

  afterAll(async () => {
    await UserProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('generatePersonalizedRecommendations', () => {
    beforeEach(async () => {
      // 테스트용 사용자 프로필 생성
      await UserProfile.create({
        userId: 'test-user-1',
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
        },
        learningData: {
          successfulTrades: 8,
          totalTrades: 12,
          averageHoldTime: 180
        }
      });
    });

    it('기본 개인화 추천을 생성해야 함', async () => {
      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('test-user-1');

      expect(recommendations).toHaveProperty('suggestedTimeframes');
      expect(recommendations).toHaveProperty('suggestedCoins');
      expect(recommendations).toHaveProperty('riskLevel');
      expect(recommendations).toHaveProperty('maxDailySignals');
      expect(recommendations).toHaveProperty('tradingStrategy');
      expect(recommendations).toHaveProperty('signalFilters');
      expect(recommendations).toHaveProperty('positionSizing');
      expect(recommendations).toHaveProperty('alertSettings');
      expect(recommendations).toHaveProperty('marketAdaptation');
      expect(recommendations).toHaveProperty('confidence');
      expect(recommendations).toHaveProperty('lastUpdated');
      expect(recommendations).toHaveProperty('profileCompleteness');

      // 사용자 설정이 반영되었는지 확인
      expect(recommendations.suggestedTimeframes).toEqual(['1h', '4h']);
      expect(recommendations.suggestedCoins).toEqual(['BTC', 'ETH']);
      expect(recommendations.maxDailySignals).toBe(15);
    });

    it('시장 데이터와 함께 추천을 생성해야 함', async () => {
      const marketData = {
        volatility: 0.6,
        trend: 'bull',
        volume: 1000000
      };

      const availableSignals = [
        {
          coin: 'BTC',
          type: 'technical',
          confidence: 85,
          timestamp: new Date()
        },
        {
          coin: 'ETH',
          type: 'fundamental',
          confidence: 70,
          timestamp: new Date()
        }
      ];

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'test-user-1',
        marketData,
        availableSignals
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.marketAdaptation).toBeDefined();
    });

    it('존재하지 않는 사용자에 대해 에러를 발생시켜야 함', async () => {
      await expect(
        PersonalizationService.generatePersonalizedRecommendations('non-existent-user')
      ).rejects.toThrow('사용자 프로필을 찾을 수 없습니다.');
    });

    it('캐시 기능이 올바르게 작동해야 함', async () => {
      // 첫 번째 호출
      const startTime1 = Date.now();
      const recommendations1 = await PersonalizationService.generatePersonalizedRecommendations('test-user-1');
      const endTime1 = Date.now();

      // 두 번째 호출 (캐시에서 반환되어야 함)
      const startTime2 = Date.now();
      const recommendations2 = await PersonalizationService.generatePersonalizedRecommendations('test-user-1');
      const endTime2 = Date.now();

      expect(recommendations1).toEqual(recommendations2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });
  });

  describe('투자 스타일별 추천', () => {
    it('보수적 투자자에게 적절한 추천을 생성해야 함', async () => {
      await UserProfile.create({
        userId: 'conservative-user',
        investmentStyle: 'conservative',
        riskTolerance: 3,
        experienceLevel: 'beginner',
        availableTime: 'minimal'
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('conservative-user');

      expect(recommendations.riskLevel).toBeLessThanOrEqual(5);
      expect(recommendations.suggestedTimeframes).toEqual(
        expect.arrayContaining(['1h', '4h', '1d'])
      );
      expect(recommendations.suggestedCoins).toEqual(
        expect.arrayContaining(['BTC', 'ETH'])
      );
    });

    it('공격적 투자자에게 적절한 추천을 생성해야 함', async () => {
      await UserProfile.create({
        userId: 'aggressive-user',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'expert',
        availableTime: 'full-time'
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('aggressive-user');

      expect(recommendations.riskLevel).toBeGreaterThan(5);
      expect(recommendations.suggestedTimeframes).toEqual(
        expect.arrayContaining(['1m', '5m', '15m'])
      );
    });

    it('스펙 투자자에게 적절한 추천을 생성해야 함', async () => {
      await UserProfile.create({
        userId: 'speculative-user',
        investmentStyle: 'speculative',
        riskTolerance: 10,
        experienceLevel: 'advanced',
        availableTime: 'full-time'
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('speculative-user');

      expect(recommendations.riskLevel).toBeGreaterThan(7);
      expect(recommendations.suggestedTimeframes).toEqual(
        expect.arrayContaining(['1m', '5m', '15m'])
      );
    });
  });

  describe('경험 수준별 추천', () => {
    it('초보자에게 적절한 추천을 생성해야 함', async () => {
      await UserProfile.create({
        userId: 'beginner-user',
        investmentStyle: 'moderate',
        riskTolerance: 4,
        experienceLevel: 'beginner',
        availableTime: 'part-time'
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('beginner-user');

      expect(recommendations.tradingStrategy.entryStrategy.type).toBe('conservative');
      expect(recommendations.tradingStrategy.exitStrategy.type).toBe('set_and_forget');
      expect(recommendations.positionSizing.maxPositionValue).toBeLessThanOrEqual(1000);
    });

    it('전문가에게 적절한 추천을 생성해야 함', async () => {
      await UserProfile.create({
        userId: 'expert-user',
        investmentStyle: 'aggressive',
        riskTolerance: 9,
        experienceLevel: 'expert',
        availableTime: 'full-time',
        learningData: {
          successfulTrades: 50,
          totalTrades: 60,
          averageHoldTime: 120
        }
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('expert-user');

      expect(recommendations.tradingStrategy.entryStrategy.type).toBe('aggressive');
      expect(recommendations.tradingStrategy.exitStrategy.type).toBe('dynamic');
      expect(recommendations.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('시장 상황 적응', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'adaptive-user',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate'
      });
    });

    it('상승장에 적응해야 함', async () => {
      const marketData = {
        trend: 'bull',
        volatility: 0.4,
        volume: 1500000
      };

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'adaptive-user',
        marketData
      );

      expect(recommendations.marketAdaptation).toBeDefined();
    });

    it('하락장에 적응해야 함', async () => {
      const marketData = {
        trend: 'bear',
        volatility: 0.8,
        volume: 2000000
      };

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'adaptive-user',
        marketData
      );

      expect(recommendations.marketAdaptation).toBeDefined();
    });

    it('고변동성 시장에 적응해야 함', async () => {
      const marketData = {
        volatility: 0.9,
        trend: 'sideways'
      };

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'adaptive-user',
        marketData
      );

      expect(recommendations.marketAdaptation).toBeDefined();
    });
  });

  describe('캐시 관리', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'cache-test-user',
        investmentStyle: 'moderate',
        riskTolerance: 5
      });
    });

    it('특정 사용자 캐시를 클리어해야 함', async () => {
      // 캐시 생성
      await PersonalizationService.generatePersonalizedRecommendations('cache-test-user');
      
      // 캐시 통계 확인
      let stats = PersonalizationService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // 특정 사용자 캐시 클리어
      PersonalizationService.clearCache('cache-test-user');
      
      // 캐시 통계 재확인
      stats = PersonalizationService.getCacheStats();
      expect(stats.entries).not.toContain('recommendations_cache-test-user');
    });

    it('모든 캐시를 클리어해야 함', async () => {
      // 캐시 생성
      await PersonalizationService.generatePersonalizedRecommendations('cache-test-user');
      
      // 캐시 통계 확인
      let stats = PersonalizationService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // 모든 캐시 클리어
      PersonalizationService.clearCache();
      
      // 캐시 통계 재확인
      stats = PersonalizationService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('캐시 통계를 올바르게 반환해야 함', async () => {
      // 캐시 생성
      await PersonalizationService.generatePersonalizedRecommendations('cache-test-user');
      
      const stats = PersonalizationService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.entries).toContain('recommendations_cache-test-user');
    });
  });

  describe('신뢰도 계산', () => {
    it('완성된 프로필에 대해 높은 신뢰도를 반환해야 함', async () => {
      await UserProfile.create({
        userId: 'complete-profile-user',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate',
        availableTime: 'part-time',
        preferredTimeframes: ['1h', '4h'],
        preferredCoins: ['BTC', 'ETH'],
        maxPositionSize: 5000,
        personalizationSettings: {
          signalSensitivity: 7,
          preferredSignalTypes: ['technical'],
          autoTradingEnabled: false,
          maxDailySignals: 10
        },
        learningData: {
          successfulTrades: 20,
          totalTrades: 25,
          averageHoldTime: 150
        }
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('complete-profile-user');
      
      expect(recommendations.confidence).toBeGreaterThan(0.7);
    });

    it('불완전한 프로필에 대해 낮은 신뢰도를 반환해야 함', async () => {
      await UserProfile.create({
        userId: 'incomplete-profile-user',
        investmentStyle: 'moderate'
        // 다른 필드들이 누락됨
      });

      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('incomplete-profile-user');
      
      expect(recommendations.confidence).toBeLessThan(0.6);
    });
  });

  describe('포지션 사이징', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'position-test-user',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        maxPositionSize: 10000
      });
    });

    it('시장 변동성에 따라 포지션 사이즈를 조정해야 함', async () => {
      const highVolatilityMarket = { volatility: 0.9 };
      const lowVolatilityMarket = { volatility: 0.2 };

      const highVolRecommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'position-test-user',
        highVolatilityMarket
      );

      const lowVolRecommendations = await PersonalizationService.generatePersonalizedRecommendations(
        'position-test-user',
        lowVolatilityMarket
      );

      expect(highVolRecommendations.positionSizing.recommendedSize).toBeLessThan(
        lowVolRecommendations.positionSizing.recommendedSize
      );
    });
  });
});
