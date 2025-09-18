const InvestmentStrategyService = require('../../src/services/InvestmentStrategyService');

describe('InvestmentStrategyService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    InvestmentStrategyService.stopService();
    InvestmentStrategyService.clearCache();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    InvestmentStrategyService.stopService();
    InvestmentStrategyService.clearCache();
  });

  describe('서비스 제어', () => {
    it('투자 전략 서비스를 시작할 수 있어야 함', async () => {
      await expect(InvestmentStrategyService.startService()).resolves.not.toThrow();
      
      const status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('투자 전략 서비스를 중지할 수 있어야 함', () => {
      InvestmentStrategyService.stopService();
      
      const status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 서비스를 중복 시작하면 경고를 표시해야 함', async () => {
      await InvestmentStrategyService.startService();
      
      // 두 번째 시작 시도
      await expect(InvestmentStrategyService.startService()).resolves.not.toThrow();
      
      const status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 서비스를 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => InvestmentStrategyService.stopService()).not.toThrow();
    });
  });

  describe('상태 조회', () => {
    it('서비스 상태를 올바르게 반환해야 함', () => {
      const status = InvestmentStrategyService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('modelConfig');
      expect(status).toHaveProperty('strategyTemplates');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.cacheSize).toBe('number');
      expect(Array.isArray(status.modelConfig)).toBe(true);
      expect(Array.isArray(status.strategyTemplates)).toBe(true);
    });
  });

  describe('투자 전략 생성', () => {
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

    it('기본 투자 전략을 생성할 수 있어야 함', async () => {
      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile,
        mockMarketData,
        mockPortfolioData,
        mockPreferences
      );

      expect(strategy).toHaveProperty('id');
      expect(strategy).toHaveProperty('name');
      expect(strategy).toHaveProperty('type');
      expect(strategy).toHaveProperty('baseStrategy');
      expect(strategy).toHaveProperty('allocation');
      expect(strategy).toHaveProperty('riskManagement');
      expect(strategy).toHaveProperty('tradingRules');
      expect(strategy).toHaveProperty('metadata');
      expect(strategy).toHaveProperty('createdAt');
      expect(strategy).toHaveProperty('expiresAt');
      expect(strategy).toHaveProperty('version');

      // 전략 구조 검증
      expect(strategy.type).toBe('personalized');
      expect(strategy.baseStrategy).toBeDefined();

      // 자산 배분 검증
      expect(strategy.allocation).toHaveProperty('stablecoins');
      expect(strategy.allocation).toHaveProperty('bluechip');
      expect(strategy.allocation).toHaveProperty('defi');
      expect(strategy.allocation).toHaveProperty('altcoins');

      // 배분 합계가 1에 가까워야 함
      const totalAllocation = Object.values(strategy.allocation).reduce((sum, val) => sum + val, 0);
      expect(totalAllocation).toBeCloseTo(1, 2);

      // 리스크 관리 검증
      expect(strategy.riskManagement).toHaveProperty('maxPositionSize');
      expect(strategy.riskManagement).toHaveProperty('stopLoss');
      expect(strategy.riskManagement).toHaveProperty('takeProfit');
      expect(strategy.riskManagement).toHaveProperty('maxDrawdown');

      // 거래 규칙 검증
      expect(strategy.tradingRules).toHaveProperty('entryConditions');
      expect(strategy.tradingRules).toHaveProperty('exitConditions');
      expect(strategy.tradingRules).toHaveProperty('rebalanceFrequency');

      // 메타데이터 검증
      expect(strategy.metadata).toHaveProperty('confidence');
      expect(strategy.metadata).toHaveProperty('reasoning');
      expect(strategy.metadata).toHaveProperty('recommendations');
      expect(strategy.metadata).toHaveProperty('warnings');
      expect(strategy.metadata).toHaveProperty('marketCondition');
      expect(strategy.metadata).toHaveProperty('riskLevel');
      expect(strategy.metadata).toHaveProperty('timeHorizon');
      expect(strategy.metadata).toHaveProperty('targetReturn');
      expect(strategy.metadata).toHaveProperty('maxVolatility');

      expect(Array.isArray(strategy.metadata.recommendations)).toBe(true);
      expect(Array.isArray(strategy.metadata.warnings)).toBe(true);
    });

    it('최소한의 사용자 프로필로 전략을 생성할 수 있어야 함', async () => {
      const minimalProfile = {
        investmentStyle: 'hodler',
        experienceLevel: 'beginner',
        riskTolerance: 0.3,
        availableTime: 'low'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        minimalProfile
      );

      expect(strategy).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.allocation).toBeDefined();
      expect(strategy.riskManagement).toBeDefined();
    });

    it('캐시 기능이 올바르게 작동해야 함', async () => {
      // 첫 번째 호출
      const startTime1 = Date.now();
      const strategy1 = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile,
        mockMarketData,
        mockPortfolioData,
        mockPreferences
      );
      const endTime1 = Date.now();

      // 두 번째 호출 (캐시에서 반환되어야 함)
      const startTime2 = Date.now();
      const strategy2 = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile,
        mockMarketData,
        mockPortfolioData,
        mockPreferences
      );
      const endTime2 = Date.now();

      expect(strategy1.id).toBe(strategy2.id);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });

    it('다양한 투자 스타일에 대해 전략을 생성할 수 있어야 함', async () => {
      const investmentStyles = ['hodler', 'trader', 'balanced'];

      for (const style of investmentStyles) {
        const profile = { ...mockUserProfile, investmentStyle: style };
        
        const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
          profile,
          mockMarketData,
          mockPortfolioData,
          mockPreferences
        );

        expect(strategy).toBeDefined();
        expect(strategy.baseStrategy).toBeDefined();
        expect(strategy.allocation).toBeDefined();
      }
    });

    it('다양한 경험 수준에 대해 전략을 생성할 수 있어야 함', async () => {
      const experienceLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

      for (const level of experienceLevels) {
        const profile = { ...mockUserProfile, experienceLevel: level };
        
        const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
          profile,
          mockMarketData,
          mockPortfolioData,
          mockPreferences
        );

        expect(strategy).toBeDefined();
        expect(strategy.metadata.riskLevel).toBeDefined();
      }
    });

    it('다양한 시장 상황에 대해 전략을 생성할 수 있어야 함', async () => {
      const marketConditions = ['bull', 'bear', 'sideways', 'volatile'];

      for (const condition of marketConditions) {
        const marketData = { ...mockMarketData, condition };
        
        const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
          mockUserProfile,
          marketData,
          mockPortfolioData,
          mockPreferences
        );

        expect(strategy).toBeDefined();
        expect(strategy.metadata.marketCondition).toBe(condition);
      }
    });
  });

  describe('전략 템플릿 관리', () => {
    it('전략 템플릿 목록을 조회할 수 있어야 함', () => {
      const templates = InvestmentStrategyService.getStrategyTemplates();
      
      expect(templates).toBeDefined();
      expect(typeof templates).toBe('object');
      
      // 기본 템플릿들이 있어야 함
      expect(templates).toHaveProperty('conservative');
      expect(templates).toHaveProperty('moderate');
      expect(templates).toHaveProperty('aggressive');
      expect(templates).toHaveProperty('scalping');
      expect(templates).toHaveProperty('swing');
    });

    it('특정 전략 템플릿을 조회할 수 있어야 함', () => {
      const conservativeTemplate = InvestmentStrategyService.getStrategyTemplate('conservative');
      
      expect(conservativeTemplate).toBeDefined();
      expect(conservativeTemplate).toHaveProperty('name');
      expect(conservativeTemplate).toHaveProperty('riskTolerance');
      expect(conservativeTemplate).toHaveProperty('timeHorizon');
      expect(conservativeTemplate).toHaveProperty('allocation');
      expect(conservativeTemplate).toHaveProperty('maxPositionSize');
      expect(conservativeTemplate).toHaveProperty('stopLoss');
      expect(conservativeTemplate).toHaveProperty('takeProfit');
    });

    it('존재하지 않는 템플릿 조회 시 null을 반환해야 함', () => {
      const nonExistentTemplate = InvestmentStrategyService.getStrategyTemplate('nonexistent');
      expect(nonExistentTemplate).toBeNull();
    });
  });

  describe('캐시 관리', () => {
    it('캐시를 클리어할 수 있어야 함', async () => {
      // 캐시 생성
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      await InvestmentStrategyService.generatePersonalizedStrategy(mockUserProfile);
      
      // 캐시 통계 확인
      let stats = InvestmentStrategyService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // 캐시 클리어
      InvestmentStrategyService.clearCache();
      
      // 캐시 통계 재확인
      stats = InvestmentStrategyService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('캐시 통계를 올바르게 반환해야 함', async () => {
      // 캐시 생성
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      await InvestmentStrategyService.generatePersonalizedStrategy(mockUserProfile);
      
      const stats = InvestmentStrategyService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('에러 처리', () => {
    it('잘못된 사용자 프로필에 대해 적절한 처리를 해야 함', async () => {
      const invalidProfile = {
        // 필수 필드들이 누락됨
        investmentStyle: 'invalid'
      };

      await expect(
        InvestmentStrategyService.generatePersonalizedStrategy(invalidProfile)
      ).resolves.not.toThrow();
    });

    it('AI 모델 호출 실패 시 기본 전략을 반환해야 함', async () => {
      // AI 모델이 없는 환경에서도 전략 생성이 가능해야 함
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile
      );

      expect(strategy).toBeDefined();
      expect(strategy.metadata).toBeDefined();
      expect(strategy.metadata.reasoning).toBeDefined();
    });
  });

  describe('전략 검증', () => {
    it('생성된 전략의 자산 배분이 유효해야 함', async () => {
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile
      );

      // 자산 배분 검증
      const allocation = strategy.allocation;
      const totalAllocation = Object.values(allocation).reduce((sum, val) => sum + val, 0);
      
      expect(totalAllocation).toBeCloseTo(1, 2);
      
      // 각 배분이 0 이상 1 이하여야 함
      Object.values(allocation).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('생성된 전략의 리스크 관리 값이 유효해야 함', async () => {
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile
      );

      // 리스크 관리 검증
      const riskManagement = strategy.riskManagement;
      
      expect(riskManagement.maxPositionSize).toBeGreaterThan(0);
      expect(riskManagement.maxPositionSize).toBeLessThanOrEqual(1);
      expect(riskManagement.stopLoss).toBeGreaterThan(0);
      expect(riskManagement.stopLoss).toBeLessThanOrEqual(1);
      expect(riskManagement.takeProfit).toBeGreaterThan(0);
      expect(riskManagement.takeProfit).toBeLessThanOrEqual(1);
      expect(riskManagement.maxDrawdown).toBeGreaterThan(0);
      expect(riskManagement.maxDrawdown).toBeLessThanOrEqual(1);
    });

    it('생성된 전략의 메타데이터가 유효해야 함', async () => {
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile
      );

      // 메타데이터 검증
      const metadata = strategy.metadata;
      
      expect(metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(metadata.confidence).toBeLessThanOrEqual(1);
      expect(metadata.riskLevel).toBeGreaterThanOrEqual(0);
      expect(metadata.riskLevel).toBeLessThanOrEqual(1);
      expect(metadata.targetReturn).toBeGreaterThanOrEqual(0);
      expect(metadata.maxVolatility).toBeGreaterThanOrEqual(0);
      expect(metadata.maxVolatility).toBeLessThanOrEqual(1);
      
      expect(typeof metadata.reasoning).toBe('string');
      expect(Array.isArray(metadata.recommendations)).toBe(true);
      expect(Array.isArray(metadata.warnings)).toBe(true);
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(false);

      // 2. 서비스 시작
      await InvestmentStrategyService.startService();
      
      status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(true);

      // 3. 전략 템플릿 조회
      const templates = InvestmentStrategyService.getStrategyTemplates();
      expect(templates).toBeDefined();

      // 4. 투자 전략 생성
      const mockUserProfile = {
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium'
      };

      const strategy = await InvestmentStrategyService.generatePersonalizedStrategy(
        mockUserProfile
      );

      expect(strategy).toBeDefined();
      expect(strategy.name).toBeDefined();

      // 5. 캐시 확인
      const cacheStats = InvestmentStrategyService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // 6. 서비스 중지
      InvestmentStrategyService.stopService();
      
      status = InvestmentStrategyService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
