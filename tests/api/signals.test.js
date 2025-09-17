const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');

// 테스트 설정 파일 import
require('../setup');

describe('Signals API', () => {
  let testSignalId;

  beforeEach(async () => {
    // 각 테스트마다 새로운 테스트용 Signal 데이터 생성
    const Signal = require('../../src/models/Signal');
    const testSignal = new Signal({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      timeframe: 'DAY_TRADING',
      finalScore: 85,
      recommendation: {
        action: 'BUY',
        confidence: 'HIGH'
      },
      priority: 'high_priority',
      breakdown: {
        price: 80,
        volume: 75,
        market: 85,
        sentiment: 90,
        whale: 70
      },
      currentPrice: 50000,
      marketCap: 1000000000000,
      metadata: {
        rsi: 45,
        macd: 0.5,
        bollinger: 'middle',
        support: 48000,
        resistance: 52000
      }
    });
    
    await testSignal.save();
    testSignalId = testSignal._id;
  });

  describe('GET /api/signals', () => {
    it('should return signals with pagination', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
      expect(response.body.pagination).to.have.property('page', 1);
      expect(response.body.pagination).to.have.property('limit', 10);
    });

    it('should filter signals by score range', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ minScore: 80, maxScore: 100 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      // 모든 신호가 지정된 범위 내에 있는지 확인
      response.body.data.forEach(signal => {
        expect(signal.finalScore).to.be.at.least(80);
        expect(signal.finalScore).to.be.at.most(100);
      });
    });

    it('should filter signals by action', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ action: 'STRONG_BUY' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      // 모든 신호가 STRONG_BUY 액션인지 확인
      response.body.data.forEach(signal => {
        expect(signal.recommendation.action).to.equal('STRONG_BUY');
      });
    });

    it('should filter signals by timeframe', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ timeframe: 'DAY_TRADING' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      // 모든 신호가 DAY_TRADING 타임프레임인지 확인
      response.body.data.forEach(signal => {
        expect(signal.timeframe).to.equal('DAY_TRADING');
      });
    });

    it('should sort signals by final score descending', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ sort: 'finalScore', order: 'desc', limit: 5 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      // 점수가 내림차순으로 정렬되어 있는지 확인
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i-1].finalScore).to.be.at.least(response.body.data[i].finalScore);
      }
    });

    it('should return 400 for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ page: 0 })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/signals')
        .query({ limit: 101 })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/signals/coin/:coinId', () => {
    it('should return signal for specific coin', async () => {
      const coinId = 'bitcoin';
      const response = await request(app)
        .get(`/api/signals/coin/${coinId}`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('coinId', coinId);
    });

    it('should return 404 for non-existent coin', async () => {
      const response = await request(app)
        .get('/api/signals/coin/non-existent-coin')
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });

    it('should return 400 for invalid coin ID', async () => {
      const response = await request(app)
        .get('/api/signals/coin/')
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/signals/search', () => {
    it('should search signals by query', async () => {
      const response = await request(app)
        .get('/api/signals/search')
        .query({ q: 'bitcoin', limit: 10 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('query', 'bitcoin');
      expect(response.body).to.have.property('count');
    });

    it('should return 400 for empty search query', async () => {
      const response = await request(app)
        .get('/api/signals/search')
        .query({ q: '' })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/signals/search')
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/signals/strong', () => {
    it('should return strong signals', async () => {
      const response = await request(app)
        .get('/api/signals/strong')
        .query({ limit: 20 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
      
      // 모든 신호가 강한 신호인지 확인 (80점 이상 또는 20점 이하)
      response.body.data.forEach(signal => {
        expect(signal.finalScore >= 80 || signal.finalScore <= 20).to.be.true;
      });
    });

    it('should respect limit parameter', async () => {
      const limit = 5;
      const response = await request(app)
        .get('/api/signals/strong')
        .query({ limit })
        .expect(200);

      expect(response.body.data).to.have.length.at.most(limit);
    });
  });

  describe('GET /api/signals/stats', () => {
    it('should return signal statistics', async () => {
      const response = await request(app)
        .get('/api/signals/stats')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('totalSignals');
      expect(response.body.data).to.have.property('avgScore');
      expect(response.body.data).to.have.property('maxScore');
      expect(response.body.data).to.have.property('minScore');
    });
  });
});
