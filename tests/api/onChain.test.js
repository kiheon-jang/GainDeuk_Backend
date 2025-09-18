const request = require('supertest');
const app = require('../../src/app');

describe('OnChain API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const OnChainService = require('../../src/services/OnChainService');
    OnChainService.stopMonitoring();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const OnChainService = require('../../src/services/OnChainService');
    OnChainService.stopMonitoring();
  });

  describe('GET /api/onchain/status', () => {
    it('온체인 모니터링 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('subscribers');
      expect(response.body.data).toHaveProperty('dataCount');
      expect(response.body.data).toHaveProperty('lastUpdate');
      
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.subscribers).toBe('number');
      expect(typeof response.body.data.dataCount).toBe('number');
    });
  });

  describe('POST /api/onchain/start', () => {
    it('온체인 모니터링을 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/onchain/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 모니터링을 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/onchain/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/onchain/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/onchain/stop', () => {
    it('온체인 모니터링을 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/onchain/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/onchain/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 모니터링을 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/onchain/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/onchain/data', () => {
    it('온체인 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
    });

    it('특정 네트워크 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/data?network=ethereum')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/onchain/transactions/large', () => {
    it('대용량 트랜잭션을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/transactions/large')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('analysis');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('제한된 수의 대용량 트랜잭션을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/transactions/large?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeLessThanOrEqual(10);
    });

    it('최소 값으로 필터링된 대용량 트랜잭션을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/transactions/large?minValue=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/onchain/whales', () => {
    it('고래 움직임을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/whales')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('analysis');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('제한된 수의 고래 움직임을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/whales?limit=20')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeLessThanOrEqual(20);
    });

    it('최소 수량으로 필터링된 고래 움직임을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/whales?minAmount=500')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/onchain/unlocks', () => {
    it('토큰 언락 스케줄을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/unlocks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('특정 일수 내의 토큰 언락 스케줄을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/unlocks?days=14')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/onchain/unlocks', () => {
    it('토큰 언락 스케줄을 추가할 수 있어야 함', async () => {
      const unlockData = {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        tokenSymbol: 'TEST',
        unlockDate: '2024-12-31T00:00:00.000Z',
        unlockAmount: '1000000000000000000000000',
        unlockPercentage: 5.0,
        description: 'Test unlock schedule'
      };

      const response = await request(app)
        .post('/api/onchain/unlocks')
        .send(unlockData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('추가되었습니다');
    });

    it('필수 필드 없이 토큰 언락 스케줄 추가 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/onchain/unlocks')
        .send({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          tokenSymbol: 'TEST'
          // 필수 필드 누락
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('필수 필드가 누락되었습니다');
    });

    it('빈 데이터로 토큰 언락 스케줄 추가 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/onchain/unlocks')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('필수 필드가 누락되었습니다');
    });
  });

  describe('DELETE /api/onchain/unlocks/:tokenAddress', () => {
    it('토큰 언락 스케줄을 제거할 수 있어야 함', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .delete(`/api/onchain/unlocks/${tokenAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('제거되었습니다');
    });
  });

  describe('GET /api/onchain/protocols', () => {
    it('DeFi 프로토콜 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/protocols')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
    });

    it('특정 네트워크의 프로토콜 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/protocols?network=ethereum')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('특정 프로토콜 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/protocols?protocol=uniswapV3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/onchain/tokens/monitoring', () => {
    it('모니터링 중인 토큰 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/onchain/tokens/monitoring')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/onchain/tokens/monitoring', () => {
    it('모니터링 토큰을 추가할 수 있어야 함', async () => {
      const tokenData = {
        tokenAddress: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/onchain/tokens/monitoring')
        .send(tokenData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('추가되었습니다');
    });

    it('토큰 주소 없이 모니터링 토큰 추가 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/onchain/tokens/monitoring')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tokenAddress가 필요합니다');
    });
  });

  describe('DELETE /api/onchain/tokens/monitoring/:tokenAddress', () => {
    it('모니터링 토큰을 제거할 수 있어야 함', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .delete(`/api/onchain/tokens/monitoring/${tokenAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('제거되었습니다');
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let response = await request(app)
        .get('/api/onchain/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 모니터링 시작
      response = await request(app)
        .post('/api/onchain/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/onchain/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 토큰 언락 스케줄 추가
      response = await request(app)
        .post('/api/onchain/unlocks')
        .send({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          tokenSymbol: 'TEST',
          unlockDate: '2024-12-31T00:00:00.000Z',
          unlockAmount: '1000000000000000000000000',
          unlockPercentage: 5.0,
          description: 'Test unlock'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 5. 모니터링 토큰 추가
      response = await request(app)
        .post('/api/onchain/tokens/monitoring')
        .send({ tokenAddress: '0x1234567890123456789012345678901234567890' })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 6. 데이터 조회
      response = await request(app)
        .get('/api/onchain/data')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 7. 대용량 트랜잭션 조회
      response = await request(app)
        .get('/api/onchain/transactions/large')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 8. 고래 움직임 조회
      response = await request(app)
        .get('/api/onchain/whales')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 9. 토큰 언락 스케줄 조회
      response = await request(app)
        .get('/api/onchain/unlocks')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 10. 프로토콜 데이터 조회
      response = await request(app)
        .get('/api/onchain/protocols')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 11. 모니터링 중지
      response = await request(app)
        .post('/api/onchain/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 12. 최종 상태 확인
      response = await request(app)
        .get('/api/onchain/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
