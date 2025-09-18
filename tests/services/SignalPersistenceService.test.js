const SignalPersistenceService = require('../../src/services/SignalPersistenceService');

describe('SignalPersistenceService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    SignalPersistenceService.stopPrediction();
    SignalPersistenceService.clearCache();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    SignalPersistenceService.stopPrediction();
    SignalPersistenceService.clearCache();
  });

  describe('서비스 제어', () => {
    it('예측 서비스를 시작할 수 있어야 함', async () => {
      await expect(SignalPersistenceService.startPrediction()).resolves.not.toThrow();
      
      const status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('예측 서비스를 중지할 수 있어야 함', () => {
      SignalPersistenceService.stopPrediction();
      
      const status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 서비스를 중복 시작하면 경고를 표시해야 함', async () => {
      await SignalPersistenceService.startPrediction();
      
      // 두 번째 시작 시도
      await expect(SignalPersistenceService.startPrediction()).resolves.not.toThrow();
      
      const status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 서비스를 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => SignalPersistenceService.stopPrediction()).not.toThrow();
    });
  });

  describe('상태 조회', () => {
    it('서비스 상태를 올바르게 반환해야 함', () => {
      const status = SignalPersistenceService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('modelConfig');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.cacheSize).toBe('number');
      expect(Array.isArray(status.modelConfig)).toBe(true);
    });
  });

  describe('신호 지속성 예측', () => {
    const mockSignalData = {
      type: 'buy',
      strength: 0.7,
      technical: {
        rsi: 45,
        macd: 0.1,
        bollinger: 0.6,
        volume: 0.8,
        support_resistance: 0.7
      },
      fundamental: {
        news_sentiment: 0.6,
        social_sentiment: 0.7,
        whale_activity: 0.5,
        defi_activity: 0.8,
        market_cap: 0.9
      }
    };

    const mockMarketData = {
      volatility: 0.4,
      trend_strength: 0.7,
      correlation: 0.6,
      liquidity: 0.8,
      time_of_day: 0.5
    };

    const mockContextData = {
      coin: 'BTC',
      timeframe: '1h'
    };

    it('기본 신호 지속성 예측을 수행할 수 있어야 함', async () => {
      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData,
        mockMarketData,
        mockContextData
      );

      expect(prediction).toHaveProperty('signalStrength');
      expect(prediction).toHaveProperty('predictions');
      expect(prediction).toHaveProperty('aiAnalysis');
      expect(prediction).toHaveProperty('overallConfidence');
      expect(prediction).toHaveProperty('timestamp');
      expect(prediction).toHaveProperty('modelVersion');

      // 예측 구조 검증
      expect(prediction.predictions).toHaveProperty('shortTerm');
      expect(prediction.predictions).toHaveProperty('mediumTerm');
      expect(prediction.predictions).toHaveProperty('longTerm');

      // 각 시간대 예측 검증
      ['shortTerm', 'mediumTerm', 'longTerm'].forEach(timeframe => {
        expect(prediction.predictions[timeframe]).toHaveProperty('probability');
        expect(prediction.predictions[timeframe]).toHaveProperty('confidence');
        expect(prediction.predictions[timeframe]).toHaveProperty('duration');
        expect(prediction.predictions[timeframe]).toHaveProperty('factors');

        expect(prediction.predictions[timeframe].probability).toBeGreaterThanOrEqual(0);
        expect(prediction.predictions[timeframe].probability).toBeLessThanOrEqual(1);
        expect(prediction.predictions[timeframe].confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.predictions[timeframe].confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(prediction.predictions[timeframe].factors)).toBe(true);
      });

      // AI 분석 검증
      expect(prediction.aiAnalysis).toHaveProperty('reasoning');
      expect(prediction.aiAnalysis).toHaveProperty('confidence');
      expect(prediction.aiAnalysis).toHaveProperty('riskFactors');
      expect(prediction.aiAnalysis).toHaveProperty('opportunityFactors');

      expect(Array.isArray(prediction.aiAnalysis.riskFactors)).toBe(true);
      expect(Array.isArray(prediction.aiAnalysis.opportunityFactors)).toBe(true);
    });

    it('최소한의 신호 데이터로 예측을 수행할 수 있어야 함', async () => {
      const minimalSignalData = {
        type: 'sell',
        strength: 0.5
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        minimalSignalData
      );

      expect(prediction).toBeDefined();
      expect(prediction.signalStrength).toBeDefined();
      expect(prediction.predictions).toBeDefined();
    });

    it('캐시 기능이 올바르게 작동해야 함', async () => {
      // 첫 번째 호출
      const startTime1 = Date.now();
      const prediction1 = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData,
        mockMarketData,
        mockContextData
      );
      const endTime1 = Date.now();

      // 두 번째 호출 (캐시에서 반환되어야 함)
      const startTime2 = Date.now();
      const prediction2 = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData,
        mockMarketData,
        mockContextData
      );
      const endTime2 = Date.now();

      expect(prediction1).toEqual(prediction2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });

    it('다양한 신호 타입에 대해 예측을 수행할 수 있어야 함', async () => {
      const signalTypes = ['buy', 'sell', 'hold'];

      for (const type of signalTypes) {
        const signalData = { ...mockSignalData, type };
        
        const prediction = await SignalPersistenceService.predictSignalPersistence(
          signalData,
          mockMarketData,
          mockContextData
        );

        expect(prediction).toBeDefined();
        expect(prediction.signalStrength).toBeDefined();
      }
    });

    it('다양한 신호 강도에 대해 예측을 수행할 수 있어야 함', async () => {
      const strengths = [0.1, 0.3, 0.5, 0.7, 0.9];

      for (const strength of strengths) {
        const signalData = { ...mockSignalData, strength };
        
        const prediction = await SignalPersistenceService.predictSignalPersistence(
          signalData,
          mockMarketData,
          mockContextData
        );

        expect(prediction).toBeDefined();
        expect(prediction.signalStrength).toBeDefined();
      }
    });
  });

  describe('캐시 관리', () => {
    it('캐시를 클리어할 수 있어야 함', async () => {
      // 캐시 생성
      const mockSignalData = {
        type: 'buy',
        strength: 0.7
      };

      await SignalPersistenceService.predictSignalPersistence(mockSignalData);
      
      // 캐시 통계 확인
      let stats = SignalPersistenceService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // 캐시 클리어
      SignalPersistenceService.clearCache();
      
      // 캐시 통계 재확인
      stats = SignalPersistenceService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('캐시 통계를 올바르게 반환해야 함', async () => {
      // 캐시 생성
      const mockSignalData = {
        type: 'buy',
        strength: 0.7
      };

      await SignalPersistenceService.predictSignalPersistence(mockSignalData);
      
      const stats = SignalPersistenceService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('에러 처리', () => {
    it('잘못된 신호 데이터에 대해 적절한 처리를 해야 함', async () => {
      const invalidSignalData = {
        // type과 strength가 누락됨
        technical: { rsi: 50 }
      };

      await expect(
        SignalPersistenceService.predictSignalPersistence(invalidSignalData)
      ).resolves.not.toThrow();
    });

    it('AI 모델 호출 실패 시 기본 예측을 반환해야 함', async () => {
      // AI 모델이 없는 환경에서도 예측이 가능해야 함
      const mockSignalData = {
        type: 'buy',
        strength: 0.7
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData
      );

      expect(prediction).toBeDefined();
      expect(prediction.aiAnalysis).toBeDefined();
      expect(prediction.aiAnalysis.reasoning).toBeDefined();
    });
  });

  describe('신호 강도 분류', () => {
    it('다양한 신호 강도에 대해 올바른 분류를 해야 함', async () => {
      const testCases = [
        { strength: 0.1, expectedCategory: 'weak' },
        { strength: 0.4, expectedCategory: 'moderate' },
        { strength: 0.7, expectedCategory: 'strong' },
        { strength: 0.95, expectedCategory: 'very_strong' }
      ];

      for (const testCase of testCases) {
        const signalData = {
          type: 'buy',
          strength: testCase.strength
        };

        const prediction = await SignalPersistenceService.predictSignalPersistence(
          signalData
        );

        expect(prediction.signalStrength).toBe(testCase.expectedCategory);
      }
    });
  });

  describe('시간대별 예측', () => {
    it('단기, 중기, 장기 예측이 모두 포함되어야 함', async () => {
      const mockSignalData = {
        type: 'buy',
        strength: 0.7
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData
      );

      expect(prediction.predictions.shortTerm.duration).toBe('1-4시간');
      expect(prediction.predictions.mediumTerm.duration).toBe('4-24시간');
      expect(prediction.predictions.longTerm.duration).toBe('1-7일');
    });

    it('각 시간대의 확률이 0-1 범위에 있어야 함', async () => {
      const mockSignalData = {
        type: 'buy',
        strength: 0.7
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData
      );

      ['shortTerm', 'mediumTerm', 'longTerm'].forEach(timeframe => {
        expect(prediction.predictions[timeframe].probability).toBeGreaterThanOrEqual(0);
        expect(prediction.predictions[timeframe].probability).toBeLessThanOrEqual(1);
        expect(prediction.predictions[timeframe].confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.predictions[timeframe].confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('AI 분석 통합', () => {
    it('AI 분석 결과가 예측에 통합되어야 함', async () => {
      const mockSignalData = {
        type: 'buy',
        strength: 0.7,
        technical: { rsi: 45, macd: 0.1 },
        fundamental: { news_sentiment: 0.6, social_sentiment: 0.7 }
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData
      );

      expect(prediction.aiAnalysis).toBeDefined();
      expect(prediction.aiAnalysis.reasoning).toBeDefined();
      expect(prediction.aiAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.aiAnalysis.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(prediction.aiAnalysis.riskFactors)).toBe(true);
      expect(Array.isArray(prediction.aiAnalysis.opportunityFactors)).toBe(true);
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(false);

      // 2. 서비스 시작
      await SignalPersistenceService.startPrediction();
      
      status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(true);

      // 3. 신호 예측
      const mockSignalData = {
        type: 'buy',
        strength: 0.7,
        technical: { rsi: 45, macd: 0.1 },
        fundamental: { news_sentiment: 0.6 }
      };

      const prediction = await SignalPersistenceService.predictSignalPersistence(
        mockSignalData
      );

      expect(prediction).toBeDefined();
      expect(prediction.signalStrength).toBeDefined();

      // 4. 캐시 확인
      const cacheStats = SignalPersistenceService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // 5. 서비스 중지
      SignalPersistenceService.stopPrediction();
      
      status = SignalPersistenceService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
