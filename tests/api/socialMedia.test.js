const request = require('supertest');
const app = require('../../src/app');

describe('Social Media API', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    const SocialMediaService = require('../../src/services/SocialMediaService');
    SocialMediaService.stopMonitoring();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    const SocialMediaService = require('../../src/services/SocialMediaService');
    SocialMediaService.stopMonitoring();
  });

  describe('GET /api/social-media/status', () => {
    it('소셜미디어 모니터링 상태를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/status')
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

  describe('POST /api/social-media/start', () => {
    it('소셜미디어 모니터링을 시작해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('시작되었습니다');
    });

    it('이미 실행 중인 모니터링을 중복 시작하면 409 에러를 반환해야 함', async () => {
      // 첫 번째 시작
      await request(app)
        .post('/api/social-media/start')
        .expect(200);

      // 두 번째 시작 시도
      const response = await request(app)
        .post('/api/social-media/start')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 실행 중');
    });
  });

  describe('POST /api/social-media/stop', () => {
    it('소셜미디어 모니터링을 중지해야 함', async () => {
      // 먼저 시작
      await request(app)
        .post('/api/social-media/start')
        .expect(200);

      // 중지
      const response = await request(app)
        .post('/api/social-media/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('중지되었습니다');
    });

    it('실행 중이 아닌 모니터링을 중지해도 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/social-media/data', () => {
    it('소셜미디어 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
    });

    it('특정 플랫폼 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data?platform=twitter')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('데이터 수 제한이 작동해야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/social-media/data/filter', () => {
    it('키워드로 데이터를 필터링해야 함', async () => {
      const filterData = {
        keywords: ['bitcoin', 'crypto'],
        platform: 'twitter'
      };

      const response = await request(app)
        .post('/api/social-media/data/filter')
        .send(filterData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('키워드 없이 필터링 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/data/filter')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('keywords는 비어있지 않은 배열');
    });

    it('빈 키워드 배열로 필터링 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/data/filter')
        .send({ keywords: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('keywords는 비어있지 않은 배열');
    });

    it('잘못된 키워드 타입으로 필터링 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/data/filter')
        .send({ keywords: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('keywords는 비어있지 않은 배열');
    });
  });

  describe('GET /api/social-media/data/sentiment', () => {
    it('감정별 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data/sentiment?sentiment=positive')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('특정 플랫폼의 감정별 데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data/sentiment?sentiment=negative&platform=twitter')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('감정 파라미터 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data/sentiment')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 감정 타입을 지정해주세요');
    });

    it('잘못된 감정 타입으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/data/sentiment?sentiment=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 감정 타입을 지정해주세요');
    });
  });

  describe('GET /api/social-media/targets', () => {
    it('모니터링 대상을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/targets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('twitter');
      expect(response.body.data).toHaveProperty('telegram');
      expect(response.body.data).toHaveProperty('discord');
      
      expect(Array.isArray(response.body.data.twitter)).toBe(true);
      expect(Array.isArray(response.body.data.telegram)).toBe(true);
      expect(Array.isArray(response.body.data.discord)).toBe(true);
    });
  });

  describe('POST /api/social-media/targets', () => {
    it('모니터링 대상을 추가할 수 있어야 함', async () => {
      const targetData = {
        platform: 'twitter',
        target: '@new_crypto_account'
      };

      const response = await request(app)
        .post('/api/social-media/targets')
        .send(targetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('추가되었습니다');
    });

    it('플랫폼 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/targets')
        .send({ target: '@test_account' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platform과 target이 필요합니다');
    });

    it('대상 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/targets')
        .send({ platform: 'twitter' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platform과 target이 필요합니다');
    });

    it('잘못된 플랫폼으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/targets')
        .send({ platform: 'invalid', target: '@test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 플랫폼을 지정해주세요');
    });
  });

  describe('DELETE /api/social-media/targets', () => {
    it('모니터링 대상을 제거할 수 있어야 함', async () => {
      const targetData = {
        platform: 'telegram',
        target: '@removable_channel'
      };

      const response = await request(app)
        .delete('/api/social-media/targets')
        .send(targetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('제거되었습니다');
    });

    it('플랫폼 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/social-media/targets')
        .send({ target: '@test_account' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platform과 target이 필요합니다');
    });

    it('대상 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/social-media/targets')
        .send({ platform: 'discord' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platform과 target이 필요합니다');
    });

    it('잘못된 플랫폼으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/social-media/targets')
        .send({ platform: 'invalid', target: '@test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 플랫폼을 지정해주세요');
    });
  });

  describe('GET /api/social-media/keywords', () => {
    it('모니터링 키워드를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/social-media/keywords')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('english');
      expect(response.body.data).toHaveProperty('korean');
      
      expect(Array.isArray(response.body.data.english)).toBe(true);
      expect(Array.isArray(response.body.data.korean)).toBe(true);
    });
  });

  describe('POST /api/social-media/keywords', () => {
    it('영어 키워드를 추가할 수 있어야 함', async () => {
      const keywordData = {
        keyword: 'defi',
        isKorean: false
      };

      const response = await request(app)
        .post('/api/social-media/keywords')
        .send(keywordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('영어 키워드로 추가되었습니다');
    });

    it('한국어 키워드를 추가할 수 있어야 함', async () => {
      const keywordData = {
        keyword: '디파이',
        isKorean: true
      };

      const response = await request(app)
        .post('/api/social-media/keywords')
        .send(keywordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('한국어 키워드로 추가되었습니다');
    });

    it('키워드 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/keywords')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 키워드를 입력해주세요');
    });

    it('잘못된 키워드 타입으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/social-media/keywords')
        .send({ keyword: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 키워드를 입력해주세요');
    });
  });

  describe('DELETE /api/social-media/keywords', () => {
    it('영어 키워드를 제거할 수 있어야 함', async () => {
      const keywordData = {
        keyword: 'blockchain',
        isKorean: false
      };

      const response = await request(app)
        .delete('/api/social-media/keywords')
        .send(keywordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('영어 키워드에서 제거되었습니다');
    });

    it('한국어 키워드를 제거할 수 있어야 함', async () => {
      const keywordData = {
        keyword: '블록체인',
        isKorean: true
      };

      const response = await request(app)
        .delete('/api/social-media/keywords')
        .send(keywordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('한국어 키워드에서 제거되었습니다');
    });

    it('키워드 없이 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/social-media/keywords')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 키워드를 입력해주세요');
    });

    it('잘못된 키워드 타입으로 요청 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/social-media/keywords')
        .send({ keyword: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('유효한 키워드를 입력해주세요');
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let response = await request(app)
        .get('/api/social-media/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);

      // 2. 모니터링 시작
      response = await request(app)
        .post('/api/social-media/start')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 3. 상태 재확인
      response = await request(app)
        .get('/api/social-media/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(true);

      // 4. 키워드 추가
      response = await request(app)
        .post('/api/social-media/keywords')
        .send({ keyword: 'test_crypto', isKorean: false })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 5. 모니터링 대상 추가
      response = await request(app)
        .post('/api/social-media/targets')
        .send({ platform: 'twitter', target: '@test_account' })
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 6. 데이터 조회
      response = await request(app)
        .get('/api/social-media/data')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 7. 모니터링 중지
      response = await request(app)
        .post('/api/social-media/stop')
        .expect(200);
      
      expect(response.body.success).toBe(true);

      // 8. 최종 상태 확인
      response = await request(app)
        .get('/api/social-media/status')
        .expect(200);
      
      expect(response.body.data.isRunning).toBe(false);
    });
  });
});
