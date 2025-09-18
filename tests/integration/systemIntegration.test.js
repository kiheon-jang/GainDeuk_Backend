const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');

describe('System Integration Tests', () => {
  beforeAll(async () => {
    // 테스트용 MongoDB 연결
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaindeuk_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    // 테스트 후 정리
    await mongoose.connection.close();
  });

  describe('전체 시스템 통합 테스트', () => {
    it('모든 서비스가 정상적으로 시작되어야 함', async () => {
      // 1. 헬스 체크
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // 2. 한국 시장 서비스 상태 확인
      const koreanMarketResponse = await request(app)
        .get('/api/korean-market/status')
        .expect(200);

      expect(koreanMarketResponse.body.success).toBe(true);

      // 3. 데이터 품질 서비스 상태 확인
      const dataQualityResponse = await request(app)
        .get('/api/data-quality/status')
        .expect(200);

      expect(dataQualityResponse.body.success).toBe(true);
    });

    it('암호화폐 데이터 수집부터 신호 생성까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. 암호화폐 데이터 조회
      const coinsResponse = await request(app)
        .get('/api/coins')
        .expect(200);

      expect(coinsResponse.body.success).toBe(true);
      expect(Array.isArray(coinsResponse.body.data)).toBe(true);

      // 2. 한국 시장 데이터 조회
      const koreanMarketResponse = await request(app)
        .get('/api/korean-market/premium')
        .expect(200);

      expect(koreanMarketResponse.body.success).toBe(true);

      // 3. 신호 생성 (샘플 데이터로)
      const signalData = {
        symbol: 'BTC',
        type: 'buy',
        strength: 0.8,
        source: 'integration_test',
        metadata: {
          price: 45000,
          volume: 1000000,
          timestamp: new Date()
        }
      };

      const signalResponse = await request(app)
        .post('/api/signals')
        .send(signalData)
        .expect(201);

      expect(signalResponse.body.success).toBe(true);
      expect(signalResponse.body.data.symbol).toBe('BTC');

      // 4. 생성된 신호 조회
      const getSignalResponse = await request(app)
        .get(`/api/signals/${signalResponse.body.data._id}`)
        .expect(200);

      expect(getSignalResponse.body.success).toBe(true);
      expect(getSignalResponse.body.data.symbol).toBe('BTC');
    });

    it('사용자 프로필부터 개인화 추천까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. 사용자 프로필 생성
      const userProfile = {
        userId: 'test_user_integration',
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6,
        availableTime: 'medium',
        preferences: {
          coins: ['BTC', 'ETH'],
          timeframes: ['1h', '4h', '1d']
        }
      };

      const profileResponse = await request(app)
        .post('/api/user-profiles')
        .send(userProfile)
        .expect(201);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.userId).toBe('test_user_integration');

      // 2. 개인화 추천 요청
      const recommendationResponse = await request(app)
        .post('/api/personalization/recommend')
        .send({
          userId: 'test_user_integration',
          context: {
            currentPortfolio: ['BTC'],
            marketCondition: 'bullish',
            timeHorizon: 'medium'
          }
        })
        .expect(200);

      expect(recommendationResponse.body.success).toBe(true);
      expect(recommendationResponse.body.data).toHaveProperty('recommendations');

      // 3. 투자 전략 생성
      const strategyResponse = await request(app)
        .post('/api/investment-strategy/generate')
        .send({
          userId: 'test_user_integration',
          marketData: {
            btc: { price: 45000, trend: 'up' },
            eth: { price: 3000, trend: 'up' }
          },
          riskProfile: {
            riskTolerance: 0.6,
            investmentStyle: 'balanced'
          }
        })
        .expect(200);

      expect(strategyResponse.body.success).toBe(true);
      expect(strategyResponse.body.data).toHaveProperty('strategy');
    });

    it('소셜미디어 모니터링부터 감정분석까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. 소셜미디어 모니터링 시작
      const monitoringResponse = await request(app)
        .post('/api/social-media/start-monitoring')
        .send({
          keywords: ['BTC', '비트코인'],
          platforms: ['twitter', 'telegram'],
          duration: 300 // 5분
        })
        .expect(200);

      expect(monitoringResponse.body.success).toBe(true);

      // 2. 한국 커뮤니티 감정분석
      const sentimentResponse = await request(app)
        .get('/api/korean-market/sentiment')
        .expect(200);

      expect(sentimentResponse.body.success).toBe(true);
      expect(sentimentResponse.body.data).toHaveProperty('overallSentiment');

      // 3. 소셜미디어 데이터 조회
      const socialDataResponse = await request(app)
        .get('/api/social-media/data')
        .query({
          platform: 'twitter',
          keyword: 'BTC',
          limit: 10
        })
        .expect(200);

      expect(socialDataResponse.body.success).toBe(true);
      expect(Array.isArray(socialDataResponse.body.data)).toBe(true);
    });

    it('DeFi 데이터 수집부터 온체인 분석까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. DeFi 데이터 수집
      const defiDataResponse = await request(app)
        .post('/api/onchain/collect-defi-data')
        .send({
          protocols: ['uniswap', 'pancakeswap'],
          tokens: ['BTC', 'ETH']
        })
        .expect(200);

      expect(defiDataResponse.body.success).toBe(true);

      // 2. 온체인 데이터 분석
      const analysisResponse = await request(app)
        .post('/api/onchain/analyze')
        .send({
          token: 'BTC',
          timeframe: '24h',
          metrics: ['volume', 'liquidity', 'transactions']
        })
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('analysis');

      // 3. 고래 활동 모니터링
      const whaleResponse = await request(app)
        .get('/api/onchain/whale-activity')
        .query({
          token: 'BTC',
          threshold: 1000000
        })
        .expect(200);

      expect(whaleResponse.body.success).toBe(true);
      expect(Array.isArray(whaleResponse.body.data)).toBe(true);
    });

    it('AI 신호 지속성 예측부터 실시간 최적화까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. AI 신호 지속성 예측
      const predictionResponse = await request(app)
        .post('/api/signal-persistence/predict')
        .send({
          signal: {
            symbol: 'BTC',
            type: 'buy',
            strength: 0.8,
            timestamp: new Date()
          },
          marketData: {
            price: 45000,
            volume: 1000000,
            volatility: 0.05
          }
        })
        .expect(200);

      expect(predictionResponse.body.success).toBe(true);
      expect(predictionResponse.body.data).toHaveProperty('prediction');

      // 2. 실시간 처리 최적화 상태 확인
      const optimizationResponse = await request(app)
        .get('/api/real-time-optimization/status')
        .expect(200);

      expect(optimizationResponse.body.success).toBe(true);
      expect(optimizationResponse.body.data).toHaveProperty('isRunning');

      // 3. 우선순위 큐 작업 추가
      const queueResponse = await request(app)
        .post('/api/real-time-optimization/add-task')
        .send({
          task: {
            id: 'test_task',
            type: 'signal_processing',
            priority: 'high',
            data: { symbol: 'BTC', action: 'analyze' }
          }
        })
        .expect(200);

      expect(queueResponse.body.success).toBe(true);
    });

    it('데이터 품질 관리부터 백업까지 전체 워크플로우가 작동해야 함', async () => {
      // 1. 데이터 품질 서비스 시작
      const startResponse = await request(app)
        .post('/api/data-quality/start')
        .expect(200);

      expect(startResponse.body.success).toBe(true);

      // 2. 데이터 검증
      const validationResponse = await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: 45000,
          dataType: 'price'
        })
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
      expect(validationResponse.body.data.isValid).toBe(true);

      // 3. 이상치 탐지
      const anomalyResponse = await request(app)
        .post('/api/data-quality/detect-anomalies')
        .send({
          data: [
            { price: 45000, timestamp: new Date() },
            { price: 46000, timestamp: new Date() },
            { price: 100000, timestamp: new Date() } // 이상치
          ],
          dataType: 'price'
        })
        .expect(200);

      expect(anomalyResponse.body.success).toBe(true);
      expect(anomalyResponse.body.data.totalItems).toBe(3);

      // 4. 데이터 백업
      const backupResponse = await request(app)
        .post('/api/data-quality/backup')
        .send({
          dataType: 'test',
          data: { test: 'integration_data' }
        })
        .expect(200);

      expect(backupResponse.body.success).toBe(true);
      expect(backupResponse.body.data.success).toBe(true);
    });

    it('알림 시스템이 정상적으로 작동해야 함', async () => {
      // 1. 알림 생성
      const alertData = {
        type: 'price_alert',
        message: 'BTC 가격이 목표치에 도달했습니다.',
        priority: 'high',
        userId: 'test_user_integration',
        metadata: {
          symbol: 'BTC',
          targetPrice: 50000,
          currentPrice: 45000
        }
      };

      const alertResponse = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(alertResponse.body.success).toBe(true);
      expect(alertResponse.body.data.type).toBe('price_alert');

      // 2. 알림 조회
      const getAlertResponse = await request(app)
        .get(`/api/alerts/${alertResponse.body.data._id}`)
        .expect(200);

      expect(getAlertResponse.body.success).toBe(true);
      expect(getAlertResponse.body.data.message).toBe('BTC 가격이 목표치에 도달했습니다.');

      // 3. 사용자별 알림 조회
      const userAlertsResponse = await request(app)
        .get('/api/alerts')
        .query({
          userId: 'test_user_integration'
        })
        .expect(200);

      expect(userAlertsResponse.body.success).toBe(true);
      expect(Array.isArray(userAlertsResponse.body.data)).toBe(true);
    });
  });

  describe('시스템 안정성 테스트', () => {
    it('동시 요청 처리가 안정적으로 작동해야 함', async () => {
      const promises = [];
      
      // 10개의 동시 요청 생성
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });

    it('잘못된 요청에 대해 적절한 에러 응답을 반환해야 함', async () => {
      // 존재하지 않는 엔드포인트
      await request(app)
        .get('/api/nonexistent')
        .expect(404);

      // 잘못된 데이터로 요청
      await request(app)
        .post('/api/signals')
        .send({
          // 필수 필드 누락
          symbol: 'BTC'
        })
        .expect(400);

      // 잘못된 데이터 타입
      await request(app)
        .post('/api/data-quality/validate')
        .send({
          data: 'invalid',
          dataType: 'price'
        })
        .expect(200); // 검증은 통과하지만 isValid: false 반환
    });

    it('메모리 누수 없이 장시간 실행되어야 함', async () => {
      const initialMemory = process.memoryUsage();
      
      // 100번의 요청을 순차적으로 실행
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 메모리 증가가 50MB 이하여야 함 (허용 범위)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('데이터 일관성 테스트', () => {
    it('사용자 프로필과 개인화 추천 간 데이터 일관성이 유지되어야 함', async () => {
      const userId = 'consistency_test_user';
      
      // 1. 사용자 프로필 생성
      const profile = {
        userId,
        investmentStyle: 'trader',
        experienceLevel: 'advanced',
        riskTolerance: 0.8
      };

      await request(app)
        .post('/api/user-profiles')
        .send(profile)
        .expect(201);

      // 2. 개인화 추천 요청
      const recommendation = await request(app)
        .post('/api/personalization/recommend')
        .send({
          userId,
          context: { marketCondition: 'bullish' }
        })
        .expect(200);

      // 3. 추천이 사용자 프로필과 일치하는지 확인
      expect(recommendation.body.data.recommendations).toBeDefined();
      
      // 4. 투자 전략 생성
      const strategy = await request(app)
        .post('/api/investment-strategy/generate')
        .send({
          userId,
          marketData: { btc: { price: 45000 } },
          riskProfile: { riskTolerance: 0.8, investmentStyle: 'trader' }
        })
        .expect(200);

      expect(strategy.body.data.strategy).toBeDefined();
    });

    it('신호 생성과 AI 예측 간 데이터 일관성이 유지되어야 함', async () => {
      // 1. 신호 생성
      const signal = {
        symbol: 'ETH',
        type: 'sell',
        strength: 0.7,
        source: 'consistency_test'
      };

      const signalResponse = await request(app)
        .post('/api/signals')
        .send(signal)
        .expect(201);

      const signalId = signalResponse.body.data._id;

      // 2. AI 지속성 예측
      const prediction = await request(app)
        .post('/api/signal-persistence/predict')
        .send({
          signal: {
            ...signal,
            _id: signalId
          },
          marketData: {
            price: 3000,
            volume: 500000,
            volatility: 0.08
          }
        })
        .expect(200);

      expect(prediction.body.data.prediction).toBeDefined();
      expect(prediction.body.data.prediction.symbol).toBe('ETH');
    });
  });

  describe('성능 테스트', () => {
    it('API 응답 시간이 허용 범위 내에 있어야 함', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // 1초 이내
    });

    it('대량 데이터 처리 시 성능이 유지되어야 함', async () => {
      const startTime = Date.now();
      
      // 100개의 신호를 배치로 생성
      const signals = Array.from({ length: 100 }, (_, i) => ({
        symbol: 'BTC',
        type: 'buy',
        strength: Math.random(),
        source: `batch_test_${i}`
      }));

      for (const signal of signals) {
        await request(app)
          .post('/api/signals')
          .send(signal)
          .expect(201);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerRequest = totalTime / 100;
      
      expect(avgTimePerRequest).toBeLessThan(500); // 평균 500ms 이내
    });
  });
});
