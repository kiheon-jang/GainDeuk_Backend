const mongoose = require('mongoose');
const UserProfile = require('../../src/models/UserProfile');

describe('UserProfile Model', () => {
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

  describe('스키마 검증', () => {
    it('유효한 데이터로 사용자 프로필을 생성해야 함', async () => {
      const profileData = {
        userId: 'test-user-1',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate',
        availableTime: 'part-time',
        preferredTimeframes: ['1h', '4h'],
        preferredCoins: ['BTC', 'ETH'],
        maxPositionSize: 5000,
        notificationSettings: {
          email: {
            enabled: true,
            frequency: 'immediate'
          }
        },
        personalizationSettings: {
          signalSensitivity: 7,
          preferredSignalTypes: ['technical', 'fundamental'],
          autoTradingEnabled: false,
          maxDailySignals: 15
        }
      };

      const profile = new UserProfile(profileData);
      const savedProfile = await profile.save();

      expect(savedProfile.userId).toBe(profileData.userId);
      expect(savedProfile.investmentStyle).toBe(profileData.investmentStyle);
      expect(savedProfile.riskTolerance).toBe(profileData.riskTolerance);
      expect(savedProfile.experienceLevel).toBe(profileData.experienceLevel);
      expect(savedProfile.preferredTimeframes).toEqual(profileData.preferredTimeframes);
      expect(savedProfile.preferredCoins).toEqual(profileData.preferredCoins);
    });

    it('필수 필드가 없으면 에러를 발생시켜야 함', async () => {
      const invalidProfile = new UserProfile({
        investmentStyle: 'moderate'
        // userId가 없음
      });

      await expect(invalidProfile.save()).rejects.toThrow();
    });

    it('잘못된 투자 스타일 값이면 에러를 발생시켜야 함', async () => {
      const invalidProfile = new UserProfile({
        userId: 'test-user',
        investmentStyle: 'invalid-style'
      });

      await expect(invalidProfile.save()).rejects.toThrow();
    });

    it('위험 감수도가 범위를 벗어나면 에러를 발생시켜야 함', async () => {
      const invalidProfile = new UserProfile({
        userId: 'test-user',
        riskTolerance: 15 // 1-10 범위를 벗어남
      });

      await expect(invalidProfile.save()).rejects.toThrow();
    });

    it('잘못된 경험 수준 값이면 에러를 발생시켜야 함', async () => {
      const invalidProfile = new UserProfile({
        userId: 'test-user',
        experienceLevel: 'expert-level' // 유효하지 않은 값
      });

      await expect(invalidProfile.save()).rejects.toThrow();
    });

    it('잘못된 타임프레임 값이면 에러를 발생시켜야 함', async () => {
      const invalidProfile = new UserProfile({
        userId: 'test-user',
        preferredTimeframes: ['2h', 'invalid-timeframe']
      });

      await expect(invalidProfile.save()).rejects.toThrow();
    });
  });

  describe('기본값 설정', () => {
    it('기본값들이 올바르게 설정되어야 함', async () => {
      const profile = new UserProfile({
        userId: 'test-user-defaults'
      });

      const savedProfile = await profile.save();

      expect(savedProfile.investmentStyle).toBe('moderate');
      expect(savedProfile.riskTolerance).toBe(5);
      expect(savedProfile.experienceLevel).toBe('beginner');
      expect(savedProfile.availableTime).toBe('part-time');
      expect(savedProfile.maxPositionSize).toBe(1000);
      expect(savedProfile.isActive).toBe(true);
      expect(savedProfile.notificationSettings.email.enabled).toBe(true);
      expect(savedProfile.notificationSettings.push.enabled).toBe(true);
      expect(savedProfile.personalizationSettings.signalSensitivity).toBe(5);
      expect(savedProfile.personalizationSettings.autoTradingEnabled).toBe(false);
      expect(savedProfile.personalizationSettings.maxDailySignals).toBe(10);
    });
  });

  describe('가상 필드', () => {
    it('성공률을 올바르게 계산해야 함', async () => {
      const profile = new UserProfile({
        userId: 'test-success-rate',
        learningData: {
          successfulTrades: 7,
          totalTrades: 10
        }
      });

      const savedProfile = await profile.save();
      expect(savedProfile.successRate).toBe(70);
    });

    it('거래가 없을 때 성공률은 0이어야 함', async () => {
      const profile = new UserProfile({
        userId: 'test-no-trades',
        learningData: {
          successfulTrades: 0,
          totalTrades: 0
        }
      });

      const savedProfile = await profile.save();
      expect(savedProfile.successRate).toBe(0);
    });

    it('프로필 완성도를 올바르게 계산해야 함', async () => {
      const profile = new UserProfile({
        userId: 'test-completeness',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced',
        availableTime: 'full-time',
        preferredTimeframes: ['5m', '15m'],
        preferredCoins: ['BTC', 'ETH'],
        maxPositionSize: 10000,
        personalizationSettings: {
          signalSensitivity: 9
        }
      });

      const savedProfile = await profile.save();
      expect(savedProfile.calculatedCompleteness).toBeGreaterThan(80);
    });
  });

  describe('미들웨어', () => {
    it('저장 전에 프로필 완성도와 lastActive가 자동으로 업데이트되어야 함', async () => {
      const profile = new UserProfile({
        userId: 'test-middleware',
        investmentStyle: 'moderate',
        riskTolerance: 6
      });

      const beforeSave = new Date();
      const savedProfile = await profile.save();
      const afterSave = new Date();

      expect(savedProfile.profileCompleteness).toBeGreaterThan(0);
      expect(savedProfile.lastActive).toBeInstanceOf(Date);
      expect(savedProfile.lastActive.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedProfile.lastActive.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });
  });

  describe('인스턴스 메서드', () => {
    let profile;

    beforeEach(async () => {
      profile = new UserProfile({
        userId: 'test-methods',
        investmentStyle: 'conservative',
        riskTolerance: 3,
        personalizationSettings: {
          signalSensitivity: 6,
          preferredSignalTypes: ['technical', 'fundamental']
        },
        preferredCoins: ['BTC', 'ETH'],
        learningData: {
          successfulTrades: 5,
          totalTrades: 10,
          averageHoldTime: 120
        }
      });

      await profile.save();
    });

    it('신호를 올바르게 필터링해야 함', () => {
      const signals = [
        {
          coin: 'BTC',
          type: 'technical',
          confidence: 80
        },
        {
          coin: 'ETH',
          type: 'sentiment',
          confidence: 50
        },
        {
          coin: 'ADA',
          type: 'technical',
          confidence: 70
        }
      ];

      const filteredSignals = profile.filterSignals(signals);

      // BTC technical 신호만 통과해야 함 (신호 민감도 6*10=60 이상, 선호 타입, 선호 코인)
      expect(filteredSignals).toHaveLength(1);
      expect(filteredSignals[0].coin).toBe('BTC');
      expect(filteredSignals[0].type).toBe('technical');
    });

    it('거래 결과를 올바르게 업데이트해야 함', async () => {
      const initialSuccessfulTrades = profile.learningData.successfulTrades;
      const initialTotalTrades = profile.learningData.totalTrades;
      const initialAverageHoldTime = profile.learningData.averageHoldTime;

      await profile.updateTradingResult(true, 180);

      expect(profile.learningData.successfulTrades).toBe(initialSuccessfulTrades + 1);
      expect(profile.learningData.totalTrades).toBe(initialTotalTrades + 1);
      
      // 평균 보유 시간 계산: (120 * 10 + 180) / 11 = 125.45
      const expectedAverage = ((initialAverageHoldTime * initialTotalTrades) + 180) / (initialTotalTrades + 1);
      expect(profile.learningData.averageHoldTime).toBeCloseTo(expectedAverage, 1);
    });
  });

  describe('정적 메서드', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-static-methods',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced',
        preferredTimeframes: ['5m', '15m'],
        preferredCoins: ['BTC', 'ETH', 'SOL']
      });
    });

    it('개인화된 추천을 올바르게 생성해야 함', async () => {
      const recommendations = await UserProfile.generatePersonalizedRecommendations('test-static-methods');

      expect(recommendations).toHaveProperty('suggestedTimeframes');
      expect(recommendations).toHaveProperty('suggestedCoins');
      expect(recommendations).toHaveProperty('riskLevel');
      expect(recommendations).toHaveProperty('maxDailySignals');

      // 사용자가 설정한 선호도가 반영되어야 함
      expect(recommendations.suggestedTimeframes).toEqual(['5m', '15m']);
      expect(recommendations.suggestedCoins).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('존재하지 않는 사용자에 대한 추천 생성 시 에러를 발생시켜야 함', async () => {
      await expect(
        UserProfile.generatePersonalizedRecommendations('non-existent-user')
      ).rejects.toThrow('사용자 프로필을 찾을 수 없습니다');
    });

    it('경험 수준별 기본 타임프레임을 올바르게 반환해야 함', () => {
      expect(UserProfile.getDefaultTimeframes('beginner')).toEqual(['1h', '4h', '1d']);
      expect(UserProfile.getDefaultTimeframes('intermediate')).toEqual(['15m', '1h', '4h']);
      expect(UserProfile.getDefaultTimeframes('advanced')).toEqual(['5m', '15m', '1h']);
      expect(UserProfile.getDefaultTimeframes('expert')).toEqual(['1m', '5m', '15m']);
      expect(UserProfile.getDefaultTimeframes('unknown')).toEqual(['1h', '4h', '1d']);
    });

    it('투자 스타일별 기본 코인을 올바르게 반환해야 함', () => {
      expect(UserProfile.getDefaultCoins('conservative')).toEqual(['BTC', 'ETH']);
      expect(UserProfile.getDefaultCoins('moderate')).toEqual(['BTC', 'ETH', 'BNB', 'ADA']);
      expect(UserProfile.getDefaultCoins('aggressive')).toEqual(['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT']);
      expect(UserProfile.getDefaultCoins('speculative')).toEqual(['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX']);
      expect(UserProfile.getDefaultCoins('unknown')).toEqual(['BTC', 'ETH', 'BNB', 'ADA']);
    });

    it('리스크 레벨을 올바르게 계산해야 함', () => {
      const profile = {
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced'
      };

      const riskLevel = UserProfile.calculateRiskLevel(profile);
      expect(riskLevel).toBeGreaterThanOrEqual(1);
      expect(riskLevel).toBeLessThanOrEqual(10);
      expect(riskLevel).toBeGreaterThan(5); // aggressive + high risk tolerance + advanced
    });
  });

  describe('인덱스', () => {
    it('userId로 빠른 조회가 가능해야 함', async () => {
      await UserProfile.create({
        userId: 'index-test-user',
        investmentStyle: 'moderate'
      });

      const startTime = Date.now();
      const profile = await UserProfile.findOne({ userId: 'index-test-user' });
      const endTime = Date.now();

      expect(profile).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100); // 100ms 이내
    });
  });
});
