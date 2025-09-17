const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');

// 테스트 설정 파일 import
require('../setup');

describe('Coins API', () => {
  let testCoinId;

  beforeEach(async () => {
    // 각 테스트마다 새로운 테스트용 코인 데이터 생성
    const Coin = require('../../src/models/Coin');
    const testCoin = new Coin({
      coinId: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      currentPrice: 50000,
      marketCap: 50000000000, // 500억으로 수정
      marketCapRank: 1,
      totalVolume: 20000000000,
      priceChange24h: 5.2,
      priceChangePercentage24h: 0.052,
      lastUpdated: new Date()
    });
    
    await testCoin.save();
    testCoinId = testCoin.coinId;
  });

  describe('GET /api/coins', () => {
    it('should return coins with pagination', async () => {
      const response = await request(app)
        .get('/api/coins')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
      expect(response.body.pagination).to.have.property('page', 1);
      expect(response.body.pagination).to.have.property('limit', 10);
    });

    it('should filter coins by market cap range', async () => {
      const response = await request(app)
        .get('/api/coins')
        .query({ 
          minMarketCap: 1000000000, 
          maxMarketCap: 100000000000 
        })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(coin => {
          expect(coin.marketCap).to.be.at.least(1000000000);
          expect(coin.marketCap).to.be.at.most(100000000000);
        });
      }
    });

    it('should sort coins by market cap rank', async () => {
      const response = await request(app)
        .get('/api/coins')
        .query({ sortBy: 'marketCapRank', sortOrder: 'asc' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].marketCapRank)
            .to.be.at.least(response.body.data[i-1].marketCapRank);
        }
      }
    });

    it('should search coins by symbol', async () => {
      const response = await request(app)
        .get('/api/coins')
        .query({ search: 'BTC' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(coin => {
          expect(coin.symbol).to.match(/BTC/i);
        });
      }
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/coins')
        .query({ page: -1, limit: 0 })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/coins/:id', () => {
    it('should return specific coin details', async () => {
      const response = await request(app)
        .get(`/api/coins/${testCoinId}`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('coinId', testCoinId);
      expect(response.body.data).to.have.property('name');
      expect(response.body.data).to.have.property('symbol');
      expect(response.body.data).to.have.property('currentPrice');
    });

    it('should return 404 for non-existent coin', async () => {
      const response = await request(app)
        .get('/api/coins/non-existent-coin')
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('POST /api/coins/refresh', () => {
    it('should refresh coin data with default parameters', async () => {
      const response = await request(app)
        .post('/api/coins/refresh')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('message');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('totalCoins');
      expect(response.body.data).to.have.property('processedCoins');
      expect(response.body.data).to.have.property('processingTime');
    });

    it('should refresh coin data with custom parameters', async () => {
      const response = await request(app)
        .post('/api/coins/refresh')
        .query({ limit: 50, priority: 'high' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('totalCoins');
      expect(response.body.data).to.have.property('processedCoins');
    });

    it('should handle invalid priority parameter', async () => {
      const response = await request(app)
        .post('/api/coins/refresh')
        .query({ priority: 'invalid' })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .post('/api/coins/refresh')
        .query({ limit: 2000 })
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/coins/:id/signals', () => {
    it('should return signals for specific coin', async () => {
      const response = await request(app)
        .get(`/api/coins/${testCoinId}/signals`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
    });

    it('should filter signals by timeframe', async () => {
      const response = await request(app)
        .get(`/api/coins/${testCoinId}/signals`)
        .query({ timeframe: '24h' })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(signal => {
          expect(signal.timeframe).to.equal('24h');
        });
      }
    });

    it('should return 404 for non-existent coin signals', async () => {
      const response = await request(app)
        .get('/api/coins/non-existent-coin/signals')
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });
});
