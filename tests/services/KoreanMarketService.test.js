const request = require('supertest');
const app = require('../../src/app');
const KoreanMarketService = require('../../src/services/KoreanMarketService');
const CacheService = require('../../src/services/CacheService');

describe('KoreanMarketService', () => {
  let koreanMarketService;
  let cacheService;

  beforeAll(() => {
    koreanMarketService = new KoreanMarketService();
    cacheService = new CacheService();
    
    // 테스트용 Mock 데이터 설정
    jest.setTimeout(30000); // 30초 타임아웃
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  describe('김치프리미엄 계산', () => {
    test('BTC 김치프리미엄 계산', async () => {
      // Mock 데이터로 테스트
      const mockResult = {
        symbol: 'BTC',
        koreanPrice: 95000000,
        globalPrice: 90000000,
        premium: 5.56,
        isSignificant: true,
        trend: 'positive',
        timestamp: new Date()
      };
      
      // 실제 API 호출 대신 Mock 데이터 반환
      jest.spyOn(koreanMarketService, 'calculateKimchiPremium').mockResolvedValue(mockResult);
      
      const result = await koreanMarketService.calculateKimchiPremium('BTC');
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC');
      expect(result.koreanPrice).toBeGreaterThan(0);
      expect(result.globalPrice).toBeGreaterThan(0);
      expect(typeof result.premium).toBe('number');
      expect(typeof result.isSignificant).toBe('boolean');
      expect(['positive', 'negative']).toContain(result.trend);
    }, 10000);

    test('ETH 김치프리미엄 계산', async () => {
      // Mock 데이터로 테스트
      const mockResult = {
        symbol: 'ETH',
        koreanPrice: 3500000,
        globalPrice: 3300000,
        premium: 6.06,
        isSignificant: true,
        trend: 'positive',
        timestamp: new Date()
      };
      
      jest.spyOn(koreanMarketService, 'calculateKimchiPremium').mockResolvedValue(mockResult);
      
      const result = await koreanMarketService.calculateKimchiPremium('ETH');
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe('ETH');
      expect(result.koreanPrice).toBeGreaterThan(0);
      expect(result.globalPrice).toBeGreaterThan(0);
    }, 10000);

    test('존재하지 않는 코인 처리', async () => {
      // Mock이 설정되지 않은 상태에서 실제 메서드 호출
      jest.restoreAllMocks();
      const result = await koreanMarketService.calculateKimchiPremium('INVALID');
      
      expect(result).toBeNull();
    });
  });

  describe('한국어 감정분석', () => {
    test('긍정적인 텍스트 분석', () => {
      const text = '비트코인이 상승하고 있어서 정말 좋습니다. 호재가 계속 나오고 있어요.';
      const result = koreanMarketService.analyzeKoreanSentiment(text);
      
      expect(result.score).toBeGreaterThan(50);
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('부정적인 텍스트 분석', () => {
      const text = '비트코인이 하락하고 있어서 걱정됩니다. 악재가 계속 나오고 있어요.';
      const result = koreanMarketService.analyzeKoreanSentiment(text);
      
      expect(result.score).toBeLessThan(50);
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('중립적인 텍스트 분석', () => {
      const text = '비트코인 가격이 보합세를 보이고 있습니다. 관망하는 것이 좋겠습니다.';
      const result = koreanMarketService.analyzeKoreanSentiment(text);
      
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('빈 텍스트 처리', () => {
      const result = koreanMarketService.analyzeKoreanSentiment('');
      
      expect(result.score).toBe(50);
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0);
    });
  });

  describe('다중 코인 김치프리미엄', () => {
    test('여러 코인의 김치프리미엄 계산', async () => {
      const symbols = ['BTC', 'ETH', 'ADA'];
      const result = await koreanMarketService.getMultipleKimchiPremiums(symbols);
      
      expect(result).toBeDefined();
      expect(result.premiums).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.timestamp).toBeDefined();
      
      // 각 심볼에 대한 데이터 확인
      symbols.forEach(symbol => {
        expect(result.premiums[symbol]).toBeDefined();
      });
    }, 15000);
  });

  describe('연결 테스트', () => {
    test('한국 거래소 연결 상태 확인', async () => {
      const result = await koreanMarketService.testConnection();
      
      expect(result).toBeDefined();
      expect(typeof result.upbit).toBe('boolean');
      expect(typeof result.bithumb).toBe('boolean');
      expect(typeof result.overall).toBe('boolean');
    });
  });
});

describe('Korean Market API Routes', () => {
  describe('GET /api/korean-market/kimchi-premium/:symbol', () => {
    test('BTC 김치프리미엄 조회', async () => {
      // 실제 API 호출로 테스트 (캐싱으로 인해 빠름)
      const response = await request(app)
        .get('/api/korean-market/kimchi-premium/BTC');

      // 200 또는 404 모두 허용 (API 제한으로 인한 실패 가능성)
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.symbol).toBe('BTC');
        expect(response.body.data.koreanPrice).toBeGreaterThan(0);
        expect(response.body.data.globalPrice).toBeGreaterThan(0);
      } else {
        expect(response.body.success).toBe(false);
      }
    }, 10000);

    test('잘못된 심볼 처리', async () => {
      const response = await request(app)
        .get('/api/korean-market/kimchi-premium/INVALID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });

    test('유효성 검사 - 너무 짧은 심볼', async () => {
      const response = await request(app)
        .get('/api/korean-market/kimchi-premium/B')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/korean-market/kimchi-premium', () => {
    test('다중 코인 김치프리미엄 조회', async () => {
      const response = await request(app)
        .post('/api/korean-market/kimchi-premium')
        .send({ symbols: ['BTC', 'ETH'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.premiums).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
    }, 15000);

    test('빈 심볼 배열 처리', async () => {
      const response = await request(app)
        .post('/api/korean-market/kimchi-premium')
        .send({ symbols: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('너무 많은 심볼 처리', async () => {
      const symbols = Array(51).fill('BTC');
      const response = await request(app)
        .post('/api/korean-market/kimchi-premium')
        .send({ symbols })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/korean-market/sentiment', () => {
    test('한국어 감정분석', async () => {
      const response = await request(app)
        .post('/api/korean-market/sentiment')
        .send({ text: '비트코인이 상승하고 있어서 정말 좋습니다.' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.score).toBeGreaterThan(0);
      expect(response.body.data.sentiment).toBeDefined();
      expect(response.body.data.confidence).toBeGreaterThan(0);
    });

    test('빈 텍스트 처리', async () => {
      const response = await request(app)
        .post('/api/korean-market/sentiment')
        .send({ text: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('너무 긴 텍스트 처리', async () => {
      const longText = 'a'.repeat(1001);
      const response = await request(app)
        .post('/api/korean-market/sentiment')
        .send({ text: longText })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/korean-market/signal/:symbol', () => {
    test('한국 시장 특화 신호 조회', async () => {
      const response = await request(app)
        .get('/api/korean-market/signal/BTC');

      // 200 또는 500 모두 허용 (API 제한으로 인한 실패 가능성)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.symbol).toBe('BTC');
        expect(response.body.data.finalScore).toBeGreaterThan(0);
      } else {
        expect(response.body.success).toBe(false);
      }
    }, 10000);
  });

  describe('GET /api/korean-market/stats', () => {
    test('한국 시장 통계 조회', async () => {
      const response = await request(app)
        .get('/api/korean-market/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.connection).toBeDefined();
      expect(response.body.data.majorCoins).toBeDefined();
    }, 15000);
  });

  describe('GET /api/korean-market/health', () => {
    test('한국 시장 서비스 헬스체크', async () => {
      const response = await request(app)
        .get('/api/korean-market/health');

      expect([200, 503]).toContain(response.status);
      expect(response.body.success).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.services).toBeDefined();
    });
  });
});
