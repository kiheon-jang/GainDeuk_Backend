const request = require('supertest');
const app = require('../../src/app');

describe('Investment Strategy API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const InvestmentStrategyService = require('../../src/services/InvestmentStrategyService');
    InvestmentStrategyService.stopService();
    InvestmentStrategyService.clearCache();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const InvestmentStrategyService = require('../../src/services/InvestmentStrategyService');
    InvestmentStrategyService.stopService();
    InvestmentStrategyService.clearCache();
  });

  describe('GET /api/investment-strategy/status', () => {
    it('투자 전략 서비스 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/investment-strategy/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('cacheSize');
      expect(response.body.data).toHaveProperty('modelConfig');
      expect(response.body.data).toHaveProperty('strategyTemplates');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.cacheSize).toBe('number');
      expect(Array.isArray(response.body.data.modelConfig)).toBe(true);
      expect(Array.isArray(response.body.data.strategyTemplates)).toBe(true);
    });
  });

  describe('POST /api/investment-strategy/start', () => {
    it('투자 전략 서비스를 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 서비스를 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/investment-strategy/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/investment-strategy/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/investment-strategy/stop', () => {
    it('투자 전략 서비스를 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/investment-strategy/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/investment-strategy/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 서비스를 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/investment-strategy/generate', () => {
    const mockUserProfile = {
      investmentStyle: 'balanced',
      experienceLevel: 'intermediate',
      riskTolerance: 0.6,
      availableTime: 'medium',
      investmentGoals: '수익 극대화'
    };

    const mockMarketData = {
      volatility: 0.5,
      trend: 'bullish',
      sentiment: 0.7,
      condition: 'bull'
    };

    const mockPortfolioData = {
      totalValue: 10000,
      holdings: [
        { type: 'bluechip', value: 4000, riskLevel: 'medium', return: 0.1 },
        { type: 'defi', value: 2500, riskLevel: 'high', return: 0.2 },
        { type: 'altcoins', value: 1500, riskLevel: 'high', return: 0.15 },
        { type: 'stablecoins', value: 2000, riskLevel: 'low', return: 0.05 }
      ]
    };

    const mockPreferences = {
      strategyType: 'balanced',
      maxRisk: 0.7,
      targetReturn: 0.2
    };

    it('개인화된 투자 전략을 생성해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/generate')
        .send({
          userProfile: mockUserProfile,
          marketData: mockMarketData,
          portfolioData: mockPortfolioData,
          preferences: mockPreferences
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('baseStrategy');
      expect(response.body.data).toHaveProperty('allocation');
      expect(response.body.data).toHaveProperty('riskManagement');
      expect(response.body.data).toHaveProperty('tradingRules');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('version');

      // 전략 구조 검증
      expect(response.body.data.type).toBe('personalized');
      expect(response.body.data.baseStrategy).toBeDefined();

      // 자산 배분 검증
      expect(response.body.data.allocation).toHaveProperty('stablecoins');
      expect(response.body.data.allocation).toHaveProperty('bluechip');
      expect(response.body.data.allocation).toHaveProperty('defi');
      expect(response.body.data.allocation).toHaveProperty('altcoins');

      // 배분 합계가 1에 가까워야 함
      const totalAllocation = Object.values(response.body.data.allocation).reduce((sum, val) => sum + val, 0);
      expect(totalAllocation).toBeCloseTo(1, 2);

      // 리스크 관리 검증
      expect(response.body.data.riskManagement).toHaveProperty('maxPositionSize');
      expect(response.body.data.riskManagement).toHaveProperty('stopLoss');
      expect(response.body.data.riskManagement).toHaveProperty('takeProfit');
      expect(response.body.data.riskManagement).toHaveProperty('maxDrawdown');

      // 거래 규칙 검증
      expect(response.body.data.tradingRules).toHaveProperty('entryConditions');
      expect(response.body.data.tradingRules).toHaveProperty('exitConditions');
      expect(response.body.data.tradingRules).toHaveProperty('rebalanceFrequency');

      // 메타데이터 검증
      expect(response.body.data.metadata).toHaveProperty('confidence');
      expect(response.body.data.metadata).toHaveProperty('reasoning');
      expect(response.body.data.metadata).toHaveProperty('recommendations');
      expect(response.body.data.metadata).toHaveProperty('warnings');
      expect(response.body.data.metadata).toHaveProperty('marketCondition');
      expect(response.body.data.metadata).toHaveProperty('riskLevel');
      expect(response.body.data.metadata).toHaveProperty('timeHorizon');
      expect(response.body.data.metadata).toHaveProperty('targetReturn');
      expect(response.body.data.metadata).toHaveProperty('maxVolatility');

      expect(Array.isArray(response.body.data.metadata.recommendations)).toBe(true);
      expect(Array.isArray(response.body.data.metadata.warnings)).toBe(true);
    });

    it('최소한의 사용자 프로필로 전략을 생성할 수 있어야 함', async () => {
      const minimalProfile = {
        investmentStyle: 'hodler',
        experienceLevel: 'beginner',
        riskTolerance: 0.3,
        availableTime: 'low'
      };

      const response = await request(app)
        .post('/api/investment-strategy/generate')
        .send({ userProfile: minimalProfile })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('userProfile 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userProfile이 필요합니다');
    });

    it('필수 필드 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/generate')
        .send({
          userProfile: {
            investmentStyle: 'balanced'
            // 필수 필드들이 누락됨
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('필수 필드가 누락되었습니다');
    });
  });

  describe('POST /api/investment-strategy/batch-generate', () => {
    it('여러 사용자를 위한 투자 전략을 배치 생성해야 함', async () => {
      const users = [
        {
          userId: 'user-1',
          userProfile: {
            investmentStyle: 'balanced',
            experienceLevel: 'intermediate',
            riskTolerance: 0.6,
            availableTime: 'medium'
          }
        },
        {
          userId: 'user-2',
          userProfile: {
            investmentStyle: 'hodler',
            experienceLevel: 'beginner',
            riskTolerance: 0.3,
            availableTime: 'low'
          }
        },
        {
          userId: 'user-3',
          userProfile: {
            investmentStyle: 'trader',
            experienceLevel: 'advanced',
            riskTolerance: 0.8,
            availableTime: 'high'
          }
        }
      ];

      const response = await request(app)
        .post('/api/investment-strategy/batch-generate')
        .send({ users })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('successfulStrategies');
      expect(response.body.data).toHaveProperty('failedStrategies');
      expect(response.body.data).toHaveProperty('totalProcessingTime');
      expect(response.body.data).toHaveProperty('averageProcessingTime');

      expect(response.body.data.totalUsers).toBe(3);
      expect(response.body.data.results).toHaveLength(3);

      // 각 결과 검증
      response.body.data.results.forEach(result => {
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('processingTime');
        expect(result).toHaveProperty('success');

        if (result.success) {
          expect(result).toHaveProperty('strategy');
          expect(result.strategy).toHaveProperty('id');
          expect(result.strategy).toHaveProperty('name');
          expect(result.strategy).toHaveProperty('allocation');
        } else {
          expect(result).toHaveProperty('error');
        }
      });
    });

    it('빈 사용자 배열로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/batch-generate')
        .send({ users: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });

    it('사용자 배열 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/batch-generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });
  });

  describe('GET /api/investment-strategy/templates', () => {
    it('투자 전략 템플릿 목록을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/investment-strategy/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
      
      // 기본 템플릿들이 있어야 함
      expect(response.body.data).toHaveProperty('conservative');
      expect(response.body.data).toHaveProperty('moderate');
      expect(response.body.data).toHaveProperty('aggressive');
      expect(response.body.data).toHaveProperty('scalping');
      expect(response.body.data).toHaveProperty('swing');
    });
  });

  describe('GET /api/investment-strategy/templates/:templateName', () => {
    it('특정 투자 전략 템플릿을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/investment-strategy/templates/conservative')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('riskTolerance');
      expect(response.body.data).toHaveProperty('timeHorizon');
      expect(response.body.data).toHaveProperty('allocation');
      expect(response.body.data).toHaveProperty('maxPositionSize');
      expect(response.body.data).toHaveProperty('stopLoss');
      expect(response.body.data).toHaveProperty('takeProfit');
    });

    it('존재하지 않는 템플릿 요청 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/investment-strategy/templates/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });

  describe('POST /api/investment-strategy/analyze-profile', () => {
    it('사용자 프로필 분석을 수행해야 함', async () => {
      const userProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const response = await request(app)
        .post('/api/investment-strategy/analyze-profile')
        .send({ userProfile })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('riskMultiplier');
      expect(response.body.data).toHaveProperty('positionSizeMultiplier');
      expect(response.body.data).toHaveProperty('timeHorizonAdjustment');
      expect(response.body.data).toHaveProperty('rebalanceFrequency');
      expect(response.body.data).toHaveProperty('strategyType');
      expect(response.body.data).toHaveProperty('recommendations');

      expect(typeof response.body.data.riskMultiplier).toBe('number');
      expect(typeof response.body.data.positionSizeMultiplier).toBe('number');
      expect(typeof response.body.data.timeHorizonAdjustment).toBe('number');
      expect(typeof response.body.data.rebalanceFrequency).toBe('string');
      expect(typeof response.body.data.strategyType).toBe('string');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('userProfile 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/analyze-profile')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userProfile이 필요합니다');
    });
  });

  describe('POST /api/investment-strategy/cache/clear', () => {
    it('전략 캐시를 클리어해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/cache/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('클리어되었습니다');
    });
  });

  describe('GET /api/investment-strategy/cache/stats', () => {
    it('전략 캐시 통계를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/investment-strategy/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('entries');
      expect(typeof response.body.data.size).toBe('number');
      expect(Array.isArray(response.body.data.entries)).toBe(true);
    });
  });

  describe('POST /api/investment-strategy/models/validate', () => {
    it('AI 모델 검증을 수행해야 함', async () => {
      const response = await request(app)
        .post('/api/investment-strategy/models/validate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('availableModels');
      expect(response.body.data).toHaveProperty('validationResults');

      expect(Array.isArray(response.body.data.availableModels)).toBe(true);
      expect(typeof response.body.data.validationResults).toBe('object');
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let response = await request(app)
        .get('/api/investment-strategy/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 서비스 시작
      response = await request(app)
        .post('/api/investment-strategy/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/investment-strategy/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 전략 템플릿 조회
      response = await request(app)
        .get('/api/investment-strategy/templates')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 5. 특정 템플릿 조회
      response = await request(app)
        .get('/api/investment-strategy/templates/conservative')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBeDefined();

      // 6. 투자 전략 생성
      const userProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      response = await request(app)
        .post('/api/investment-strategy/generate')
        .send({ userProfile })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBeDefined();

      // 7. 사용자 프로필 분석
      response = await request(app)
        .post('/api/investment-strategy/analyze-profile')
        .send({ userProfile })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.riskMultiplier).toBeDefined();

      // 8. 배치 전략 생성
      const users = [
        {
          userId: 'test-1',
          userProfile: { ...userProfile, investmentStyle: 'hodler' }
        },
        {
          userId: 'test-2',
          userProfile: { ...userProfile, investmentStyle: 'trader' }
        }
      ];

      response = await request(app)
        .post('/api/investment-strategy/batch-generate')
        .send({ users })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBe(2);

      // 9. 캐시 통계 확인
      response = await request(app)
        .get('/api/investment-strategy/cache/stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.size).toBeGreaterThan(0);

      // 10. AI 모델 검증
      response = await request(app)
        .post('/api/investment-strategy/models/validate')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.availableModels).toBeDefined();

      // 11. 캐시 클리어
      response = await request(app)
        .post('/api/investment-strategy/cache/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 12. 서비스 중지
      response = await request(app)
        .post('/api/investment-strategy/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 13. 최종 상태 확인
      response = await request(app)
        .get('/api/investment-strategy/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
