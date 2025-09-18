const request = require('supertest');
const app = require('../../src/app');

describe('Signal Persistence API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const SignalPersistenceService = require('../../src/services/SignalPersistenceService');
    SignalPersistenceService.stopPrediction();
    SignalPersistenceService.clearCache();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const SignalPersistenceService = require('../../src/services/SignalPersistenceService');
    SignalPersistenceService.stopPrediction();
    SignalPersistenceService.clearCache();
  });

  describe('GET /api/signal-persistence/status', () => {
    it('신호 지속성 예측 서비스 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/signal-persistence/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('cacheSize');
      expect(response.body.data).toHaveProperty('modelConfig');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.cacheSize).toBe('number');
      expect(Array.isArray(response.body.data.modelConfig)).toBe(true);
    });
  });

  describe('POST /api/signal-persistence/start', () => {
    it('신호 지속성 예측 서비스를 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 서비스를 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/signal-persistence/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/signal-persistence/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/signal-persistence/stop', () => {
    it('신호 지속성 예측 서비스를 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/signal-persistence/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/signal-persistence/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 서비스를 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/signal-persistence/predict', () => {
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

    it('신호 지속성 예측을 수행해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/predict')
        .send({
          signalData: mockSignalData,
          marketData: mockMarketData,
          contextData: mockContextData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signalStrength');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('aiAnalysis');
      expect(response.body.data).toHaveProperty('overallConfidence');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('modelVersion');

      // 예측 구조 검증
      expect(response.body.data.predictions).toHaveProperty('shortTerm');
      expect(response.body.data.predictions).toHaveProperty('mediumTerm');
      expect(response.body.data.predictions).toHaveProperty('longTerm');

      // 각 시간대 예측 검증
      ['shortTerm', 'mediumTerm', 'longTerm'].forEach(timeframe => {
        expect(response.body.data.predictions[timeframe]).toHaveProperty('probability');
        expect(response.body.data.predictions[timeframe]).toHaveProperty('confidence');
        expect(response.body.data.predictions[timeframe]).toHaveProperty('duration');
        expect(response.body.data.predictions[timeframe]).toHaveProperty('factors');

        expect(response.body.data.predictions[timeframe].probability).toBeGreaterThanOrEqual(0);
        expect(response.body.data.predictions[timeframe].probability).toBeLessThanOrEqual(1);
        expect(response.body.data.predictions[timeframe].confidence).toBeGreaterThanOrEqual(0);
        expect(response.body.data.predictions[timeframe].confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(response.body.data.predictions[timeframe].factors)).toBe(true);
      });

      // AI 분석 검증
      expect(response.body.data.aiAnalysis).toHaveProperty('reasoning');
      expect(response.body.data.aiAnalysis).toHaveProperty('confidence');
      expect(response.body.data.aiAnalysis).toHaveProperty('riskFactors');
      expect(response.body.data.aiAnalysis).toHaveProperty('opportunityFactors');

      expect(Array.isArray(response.body.data.aiAnalysis.riskFactors)).toBe(true);
      expect(Array.isArray(response.body.data.aiAnalysis.opportunityFactors)).toBe(true);
    });

    it('최소한의 신호 데이터로 예측을 수행할 수 있어야 함', async () => {
      const minimalSignalData = {
        type: 'sell',
        strength: 0.5
      };

      const response = await request(app)
        .post('/api/signal-persistence/predict')
        .send({ signalData: minimalSignalData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('signalData 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/predict')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('signalData가 필요합니다');
    });

    it('필수 필드 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/predict')
        .send({
          signalData: {
            // type과 strength가 누락됨
            technical: { rsi: 50 }
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('type과 strength가 필요합니다');
    });
  });

  describe('POST /api/signal-persistence/batch-predict', () => {
    it('여러 신호의 지속성 예측을 수행해야 함', async () => {
      const signals = [
        {
          id: 'signal-1',
          signalData: {
            type: 'buy',
            strength: 0.7,
            technical: { rsi: 45, macd: 0.1 }
          }
        },
        {
          id: 'signal-2',
          signalData: {
            type: 'sell',
            strength: 0.6,
            technical: { rsi: 70, macd: -0.1 }
          }
        },
        {
          id: 'signal-3',
          signalData: {
            type: 'hold',
            strength: 0.5,
            technical: { rsi: 50, macd: 0 }
          }
        }
      ];

      const response = await request(app)
        .post('/api/signal-persistence/batch-predict')
        .send({ signals })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('totalSignals');
      expect(response.body.data).toHaveProperty('successfulPredictions');
      expect(response.body.data).toHaveProperty('failedPredictions');
      expect(response.body.data).toHaveProperty('totalProcessingTime');
      expect(response.body.data).toHaveProperty('averageProcessingTime');

      expect(response.body.data.totalSignals).toBe(3);
      expect(response.body.data.results).toHaveLength(3);

      // 각 결과 검증
      response.body.data.results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('processingTime');
        expect(result).toHaveProperty('success');

        if (result.success) {
          expect(result).toHaveProperty('prediction');
          expect(result.prediction).toHaveProperty('signalStrength');
          expect(result.prediction).toHaveProperty('predictions');
        } else {
          expect(result).toHaveProperty('error');
        }
      });
    });

    it('빈 신호 배열로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/batch-predict')
        .send({ signals: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });

    it('신호 배열 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/batch-predict')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('비어있지 않은 배열이어야 합니다');
    });
  });

  describe('POST /api/signal-persistence/analyze-signal-strength', () => {
    it('신호 강도 분석을 수행해야 함', async () => {
      const signalData = {
        type: 'buy',
        strength: 0.7,
        technical: { rsi: 45, macd: 0.1 },
        fundamental: { news_sentiment: 0.6 }
      };

      const response = await request(app)
        .post('/api/signal-persistence/analyze-signal-strength')
        .send({ signalData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('technical');
      expect(response.body.data).toHaveProperty('fundamental');
      expect(response.body.data).toHaveProperty('market');
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('category');

      expect(typeof response.body.data.technical).toBe('number');
      expect(typeof response.body.data.fundamental).toBe('number');
      expect(typeof response.body.data.market).toBe('number');
      expect(typeof response.body.data.overall).toBe('number');
      expect(typeof response.body.data.category).toBe('string');
    });

    it('signalData 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/analyze-signal-strength')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('signalData가 필요합니다');
    });
  });

  describe('POST /api/signal-persistence/cache/clear', () => {
    it('예측 캐시를 클리어해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/cache/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('클리어되었습니다');
    });
  });

  describe('GET /api/signal-persistence/cache/stats', () => {
    it('예측 캐시 통계를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/signal-persistence/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('entries');
      expect(typeof response.body.data.size).toBe('number');
      expect(Array.isArray(response.body.data.entries)).toBe(true);
    });
  });

  describe('POST /api/signal-persistence/models/validate', () => {
    it('AI 모델 검증을 수행해야 함', async () => {
      const response = await request(app)
        .post('/api/signal-persistence/models/validate')
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
        .get('/api/signal-persistence/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 서비스 시작
      response = await request(app)
        .post('/api/signal-persistence/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/signal-persistence/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 신호 예측
      const signalData = {
        type: 'buy',
        strength: 0.7,
        technical: { rsi: 45, macd: 0.1 },
        fundamental: { news_sentiment: 0.6 }
      };

      response = await request(app)
        .post('/api/signal-persistence/predict')
        .send({ signalData })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.signalStrength).toBeDefined();

      // 5. 신호 강도 분석
      response = await request(app)
        .post('/api/signal-persistence/analyze-signal-strength')
        .send({ signalData })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBeDefined();

      // 6. 배치 예측
      const signals = [
        {
          id: 'test-1',
          signalData: { type: 'buy', strength: 0.7 }
        },
        {
          id: 'test-2',
          signalData: { type: 'sell', strength: 0.6 }
        }
      ];

      response = await request(app)
        .post('/api/signal-persistence/batch-predict')
        .send({ signals })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSignals).toBe(2);

      // 7. 캐시 통계 확인
      response = await request(app)
        .get('/api/signal-persistence/cache/stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.size).toBeGreaterThan(0);

      // 8. AI 모델 검증
      response = await request(app)
        .post('/api/signal-persistence/models/validate')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.availableModels).toBeDefined();

      // 9. 캐시 클리어
      response = await request(app)
        .post('/api/signal-persistence/cache/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 10. 서비스 중지
      response = await request(app)
        .post('/api/signal-persistence/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 11. 최종 상태 확인
      response = await request(app)
        .get('/api/signal-persistence/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
