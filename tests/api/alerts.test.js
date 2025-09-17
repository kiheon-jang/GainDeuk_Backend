const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');

// 테스트 설정 파일 import
require('../setup');

describe('Alerts API', () => {
  describe('POST /api/alerts', () => {
    it('should create a new alert', async () => {
      const alertData = {
        userId: 'test-user-123',
        coinId: 'bitcoin',
        symbol: 'BTC',
        alertType: 'STRONG_SIGNAL',
        triggerScore: 85,
        settings: {
          minScore: 80,
          maxScore: 100,
          signalTypes: ['STRONG_BUY', 'BUY'],
          minConfidence: 'HIGH',
          minInterval: 30
        }
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('_id');
      expect(response.body.data).to.have.property('coinId', 'bitcoin');
      expect(response.body.data).to.have.property('alertType', 'STRONG_SIGNAL');
    });

    it('should create price target alert', async () => {
      const alertData = {
        userId: 'test-user-456',
        coinId: 'ethereum',
        symbol: 'ETH',
        alertType: 'PRICE_TARGET',
        settings: {
          targetPrice: 3000,
          priceDirection: 'above',
          priceChangeThreshold: 5
        }
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('alertType', 'PRICE_TARGET');
    });

    it('should create whale move alert', async () => {
      const alertData = {
        userId: 'test-user-789',
        coinId: 'bitcoin',
        symbol: 'BTC',
        alertType: 'WHALE_MOVE',
        settings: {
          minValue: 1000000,
          minTransactions: 5
        }
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('alertType', 'WHALE_MOVE');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/alerts')
        .send({})
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });

    it('should validate alert type enum', async () => {
      const alertData = {
        coinId: 'bitcoin',
        alertType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/alerts', () => {
    it('should return user alerts with pagination', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ 
          userId: 'test-user-123',
          page: 1, 
          limit: 10 
        })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
    });

    it('should filter alerts by type', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ 
          userId: 'test-user-123',
          alertType: 'STRONG_SIGNAL'
        })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(alert => {
          expect(alert.alertType).to.equal('STRONG_SIGNAL');
        });
      }
    });

    it('should filter alerts by coin', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ 
          userId: 'test-user-123',
          coinId: 'bitcoin'
        })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(alert => {
          expect(alert.coinId).to.equal('bitcoin');
        });
      }
    });

    it('should filter active alerts only', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .query({ 
          userId: 'test-user-123',
          isActive: true
        })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        response.body.data.forEach(alert => {
          expect(alert.isActive).to.be.true;
        });
      }
    });
  });

  describe('GET /api/alerts/:id', () => {
    let alertId;

    beforeAll(async () => {
      // 테스트용 알림 생성
      const alertData = {
        userId: 'test-user-get',
        coinId: 'bitcoin',
        symbol: 'BTC',
        alertType: 'STRONG_SIGNAL',
        triggerScore: 85
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData);

      alertId = response.body.data._id;
    });

    it('should return specific alert details', async () => {
      const response = await request(app)
        .get(`/api/alerts/${alertId}`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('_id', alertId);
      expect(response.body.data).to.have.property('coinId', 'bitcoin');
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .get('/api/alerts/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('PUT /api/alerts/:id', () => {
    let alertId;

    beforeAll(async () => {
      // 테스트용 알림 생성
      const alertData = {
        userId: 'test-user-update',
        coinId: 'ethereum',
        symbol: 'ETH',
        alertType: 'PRICE_TARGET',
        settings: {
          targetPrice: 3000
        }
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData);

      alertId = response.body.data._id;
    });

    it('should update alert settings', async () => {
      const updateData = {
        settings: {
          minScore: 90,
          maxScore: 10,
          cooldownMinutes: 30
        }
      };

      const response = await request(app)
        .put(`/api/alerts/${alertId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data.settings.minScore).to.equal(90);
      expect(response.body.data.settings.maxScore).to.equal(10);
      expect(response.body.data.settings.cooldownMinutes).to.equal(30);
    });

    it('should toggle alert active status', async () => {
      // 새로운 알림 생성
      const alertData = {
        userId: 'test-user-toggle',
        coinId: 'bitcoin',
        symbol: 'BTC',
        alertType: 'STRONG_SIGNAL',
        triggerScore: 85
      };

      const createResponse = await request(app)
        .post('/api/alerts')
        .send(alertData);

      const newAlertId = createResponse.body.data._id;

      const response = await request(app)
        .put(`/api/alerts/${newAlertId}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data.isActive).to.be.false;
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .put('/api/alerts/507f1f77bcf86cd799439011')
        .send({ isActive: false })
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    let alertId;

    beforeAll(async () => {
      // 테스트용 알림 생성
      const alertData = {
        userId: 'test-user-delete',
        coinId: 'bitcoin',
        symbol: 'BTC',
        alertType: 'STRONG_SIGNAL',
        triggerScore: 85
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData);

      alertId = response.body.data._id;
    });

    it('should delete alert', async () => {
      const response = await request(app)
        .delete(`/api/alerts/${alertId}`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('message');
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .delete('/api/alerts/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /api/alerts/stats', () => {
    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/alerts/stats')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('totalAlerts');
      expect(response.body.data).to.have.property('activeAlerts');
      expect(response.body.data).to.have.property('triggeredAlerts');
    });
  });
});
