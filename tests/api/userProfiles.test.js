const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const UserProfile = require('../../src/models/UserProfile');

describe('User Profiles API', () => {
  beforeAll(async () => {
    // 테스트용 데이터베이스 연결
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gaindeuk_test');
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터베이스 정리
    await UserProfile.deleteMany({});
  });

  afterAll(async () => {
    // 테스트 후 데이터베이스 정리 및 연결 종료
    await UserProfile.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/user-profiles', () => {
    it('새로운 사용자 프로필을 성공적으로 생성해야 함', async () => {
      const profileData = {
        userId: 'test-user-1',
        investmentStyle: 'moderate',
        riskTolerance: 6,
        experienceLevel: 'intermediate',
        availableTime: 'part-time',
        preferredTimeframes: ['1h', '4h'],
        preferredCoins: ['BTC', 'ETH'],
        maxPositionSize: 5000
      };

      const response = await request(app)
        .post('/api/user-profiles')
        .send(profileData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(profileData.userId);
      expect(response.body.data.investmentStyle).toBe(profileData.investmentStyle);
      expect(response.body.data.riskTolerance).toBe(profileData.riskTolerance);
    });

    it('중복된 사용자 ID로 프로필 생성 시 409 에러를 반환해야 함', async () => {
      const profileData = {
        userId: 'duplicate-user',
        investmentStyle: 'conservative'
      };

      // 첫 번째 프로필 생성
      await request(app)
        .post('/api/user-profiles')
        .send(profileData)
        .expect(201);

      // 중복된 사용자 ID로 두 번째 프로필 생성 시도
      const response = await request(app)
        .post('/api/user-profiles')
        .send(profileData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 존재하는 사용자 ID');
    });

    it('잘못된 데이터로 프로필 생성 시 400 에러를 반환해야 함', async () => {
      const invalidData = {
        userId: 'test-user',
        riskTolerance: 15, // 범위를 벗어난 값
        investmentStyle: 'invalid-style' // 유효하지 않은 값
      };

      const response = await request(app)
        .post('/api/user-profiles')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('잘못된 요청 데이터');
    });
  });

  describe('GET /api/user-profiles', () => {
    beforeEach(async () => {
      // 테스트용 프로필 데이터 생성
      const profiles = [
        {
          userId: 'user-1',
          investmentStyle: 'conservative',
          experienceLevel: 'beginner'
        },
        {
          userId: 'user-2',
          investmentStyle: 'aggressive',
          experienceLevel: 'advanced'
        },
        {
          userId: 'user-3',
          investmentStyle: 'moderate',
          experienceLevel: 'intermediate'
        }
      ];

      await UserProfile.insertMany(profiles);
    });

    it('모든 사용자 프로필을 조회해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it('투자 스타일로 필터링된 프로필을 조회해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles?investmentStyle=conservative')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].investmentStyle).toBe('conservative');
    });

    it('경험 수준으로 필터링된 프로필을 조회해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles?experienceLevel=advanced')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].experienceLevel).toBe('advanced');
    });

    it('페이지네이션이 올바르게 작동해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/user-profiles/:userId', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'test-user',
        investmentStyle: 'moderate',
        riskTolerance: 7,
        experienceLevel: 'intermediate'
      });
    });

    it('특정 사용자 프로필을 조회해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles/test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('test-user');
      expect(response.body.data.investmentStyle).toBe('moderate');
    });

    it('존재하지 않는 사용자 프로필 조회 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles/non-existent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('PUT /api/user-profiles/:userId', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'update-user',
        investmentStyle: 'conservative',
        riskTolerance: 3,
        experienceLevel: 'beginner'
      });
    });

    it('사용자 프로필을 성공적으로 업데이트해야 함', async () => {
      const updateData = {
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced'
      };

      const response = await request(app)
        .put('/api/user-profiles/update-user')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.investmentStyle).toBe('aggressive');
      expect(response.body.data.riskTolerance).toBe(8);
      expect(response.body.data.experienceLevel).toBe('advanced');
    });

    it('존재하지 않는 사용자 프로필 업데이트 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .put('/api/user-profiles/non-existent-user')
        .send({ investmentStyle: 'moderate' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('DELETE /api/user-profiles/:userId', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'delete-user',
        investmentStyle: 'moderate'
      });
    });

    it('사용자 프로필을 성공적으로 삭제해야 함 (소프트 삭제)', async () => {
      const response = await request(app)
        .delete('/api/user-profiles/delete-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('성공적으로 삭제');

      // 삭제된 프로필이 isActive: false로 설정되었는지 확인
      const deletedProfile = await UserProfile.findOne({ userId: 'delete-user' });
      expect(deletedProfile.isActive).toBe(false);
    });

    it('존재하지 않는 사용자 프로필 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/user-profiles/non-existent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('GET /api/user-profiles/:userId/recommendations', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'recommendation-user',
        investmentStyle: 'aggressive',
        riskTolerance: 8,
        experienceLevel: 'advanced',
        preferredTimeframes: ['5m', '15m'],
        preferredCoins: ['BTC', 'ETH', 'SOL']
      });
    });

    it('개인화된 추천을 생성해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles/recommendation-user/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestedTimeframes');
      expect(response.body.data).toHaveProperty('suggestedCoins');
      expect(response.body.data).toHaveProperty('riskLevel');
      expect(response.body.data).toHaveProperty('maxDailySignals');
      
      // 사용자가 설정한 선호도가 반영되었는지 확인
      expect(response.body.data.suggestedTimeframes).toEqual(['5m', '15m']);
      expect(response.body.data.suggestedCoins).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('존재하지 않는 사용자에 대한 추천 생성 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/user-profiles/non-existent-user/recommendations')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('POST /api/user-profiles/:userId/trading-result', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'trading-user',
        investmentStyle: 'moderate',
        learningData: {
          successfulTrades: 5,
          totalTrades: 10,
          averageHoldTime: 120
        }
      });
    });

    it('거래 결과를 성공적으로 업데이트해야 함', async () => {
      const tradingResult = {
        successful: true,
        holdTime: 180
      };

      const response = await request(app)
        .post('/api/user-profiles/trading-user/trading-result')
        .send(tradingResult)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.learningData.successfulTrades).toBe(6);
      expect(response.body.data.learningData.totalTrades).toBe(11);
    });

    it('잘못된 데이터로 거래 결과 업데이트 시 400 에러를 반환해야 함', async () => {
      const invalidData = {
        successful: 'yes', // boolean이 아님
        holdTime: 'two hours' // number가 아님
      };

      const response = await request(app)
        .post('/api/user-profiles/trading-user/trading-result')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('잘못된 요청 데이터');
    });
  });

  describe('POST /api/user-profiles/:userId/filter-signals', () => {
    beforeEach(async () => {
      await UserProfile.create({
        userId: 'filter-user',
        investmentStyle: 'conservative',
        riskTolerance: 3,
        personalizationSettings: {
          signalSensitivity: 7,
          preferredSignalTypes: ['technical', 'fundamental']
        },
        preferredCoins: ['BTC', 'ETH']
      });
    });

    it('사용자 프로필에 따라 신호를 필터링해야 함', async () => {
      const signals = [
        {
          coin: 'BTC',
          type: 'technical',
          confidence: 85
        },
        {
          coin: 'ETH',
          type: 'sentiment',
          confidence: 60
        },
        {
          coin: 'ADA',
          type: 'technical',
          confidence: 90
        }
      ];

      const response = await request(app)
        .post('/api/user-profiles/filter-user/filter-signals')
        .send({ signals })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.originalCount).toBe(3);
      expect(response.body.data.filteredCount).toBe(1); // BTC technical 신호만 통과
      expect(response.body.data.filteredSignals[0].coin).toBe('BTC');
    });

    it('잘못된 신호 데이터로 필터링 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/user-profiles/filter-user/filter-signals')
        .send({ signals: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('signals는 배열이어야 합니다');
    });
  });
});
