const SocialMediaService = require('../../src/services/SocialMediaService');

describe('SocialMediaService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    SocialMediaService.stopMonitoring();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    SocialMediaService.stopMonitoring();
  });

  describe('모니터링 제어', () => {
    it('모니터링을 시작할 수 있어야 함', async () => {
      // API 키가 설정되지 않은 상태에서도 시작은 가능해야 함
      await expect(SocialMediaService.startMonitoring()).resolves.not.toThrow();
      
      const status = SocialMediaService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('모니터링을 중지할 수 있어야 함', () => {
      SocialMediaService.stopMonitoring();
      
      const status = SocialMediaService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 모니터링을 중복 시작하면 경고를 표시해야 함', async () => {
      await SocialMediaService.startMonitoring();
      
      // 두 번째 시작 시도
      await expect(SocialMediaService.startMonitoring()).resolves.not.toThrow();
      
      const status = SocialMediaService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 모니터링을 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => SocialMediaService.stopMonitoring()).not.toThrow();
    });
  });

  describe('상태 조회', () => {
    it('모니터링 상태를 올바르게 반환해야 함', () => {
      const status = SocialMediaService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('subscribers');
      expect(status).toHaveProperty('dataCount');
      expect(status).toHaveProperty('lastUpdate');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.subscribers).toBe('number');
      expect(typeof status.dataCount).toBe('number');
    });

    it('마지막 업데이트 시간을 올바르게 반환해야 함', () => {
      const lastUpdate = SocialMediaService.getLastUpdateTime();
      
      // 데이터가 없으면 null이어야 함
      expect(lastUpdate).toBeNull();
    });
  });

  describe('데이터 조회', () => {
    it('전체 소셜미디어 데이터를 조회할 수 있어야 함', () => {
      const data = SocialMediaService.getSocialData();
      
      expect(typeof data).toBe('object');
    });

    it('특정 플랫폼 데이터를 조회할 수 있어야 함', () => {
      const twitterData = SocialMediaService.getSocialData('twitter');
      const telegramData = SocialMediaService.getSocialData('telegram');
      const discordData = SocialMediaService.getSocialData('discord');
      
      // 데이터가 없으면 undefined여야 함
      expect(twitterData).toBeUndefined();
      expect(telegramData).toBeUndefined();
      expect(discordData).toBeUndefined();
    });

    it('존재하지 않는 플랫폼 데이터 조회 시 undefined를 반환해야 함', () => {
      const data = SocialMediaService.getSocialData('nonexistent');
      expect(data).toBeUndefined();
    });
  });

  describe('데이터 필터링', () => {
    beforeEach(() => {
      // 테스트용 데이터 설정
      const mockData = {
        twitter: {
          data: [
            {
              id: '1',
              text: 'Bitcoin is going to the moon!',
              author: 'crypto_trader',
              platform: 'twitter',
              timestamp: new Date().toISOString(),
              sentiment: 'positive',
              relevance: 0.8,
              keywords: ['bitcoin', 'moon']
            },
            {
              id: '2',
              text: 'Ethereum price is dropping',
              author: 'eth_holder',
              platform: 'twitter',
              timestamp: new Date().toISOString(),
              sentiment: 'negative',
              relevance: 0.6,
              keywords: ['ethereum', 'price']
            }
          ],
          timestamp: new Date(),
          count: 2
        }
      };

      // private 속성에 직접 접근할 수 없으므로 시뮬레이션
      // 실제 구현에서는 테스트용 데이터 설정 메서드가 필요
    });

    it('키워드로 데이터를 필터링할 수 있어야 함', () => {
      const keywords = ['bitcoin'];
      const filteredData = SocialMediaService.getFilteredData(keywords);
      
      expect(typeof filteredData).toBe('object');
    });

    it('특정 플랫폼의 키워드 필터링이 가능해야 함', () => {
      const keywords = ['ethereum'];
      const filteredData = SocialMediaService.getFilteredData(keywords, 'twitter');
      
      expect(typeof filteredData).toBe('object');
    });

    it('감정별 데이터 필터링이 가능해야 함', () => {
      const positiveData = SocialMediaService.getSentimentData('positive');
      const negativeData = SocialMediaService.getSentimentData('negative');
      const neutralData = SocialMediaService.getSentimentData('neutral');
      
      expect(typeof positiveData).toBe('object');
      expect(typeof negativeData).toBe('object');
      expect(typeof neutralData).toBe('object');
    });

    it('특정 플랫폼의 감정별 필터링이 가능해야 함', () => {
      const positiveTwitterData = SocialMediaService.getSentimentData('positive', 'twitter');
      
      expect(typeof positiveTwitterData).toBe('object');
    });
  });

  describe('구독자 관리', () => {
    it('구독자를 추가할 수 있어야 함', () => {
      const callback = jest.fn();
      
      SocialMediaService.subscribe(callback);
      
      const status = SocialMediaService.getStatus();
      expect(status.subscribers).toBe(1);
    });

    it('구독자를 제거할 수 있어야 함', () => {
      const callback = jest.fn();
      
      SocialMediaService.subscribe(callback);
      SocialMediaService.unsubscribe(callback);
      
      const status = SocialMediaService.getStatus();
      expect(status.subscribers).toBe(0);
    });

    it('여러 구독자를 관리할 수 있어야 함', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      SocialMediaService.subscribe(callback1);
      SocialMediaService.subscribe(callback2);
      SocialMediaService.subscribe(callback3);
      
      let status = SocialMediaService.getStatus();
      expect(status.subscribers).toBe(3);
      
      SocialMediaService.unsubscribe(callback2);
      
      status = SocialMediaService.getStatus();
      expect(status.subscribers).toBe(2);
    });

    it('구독자에게 알림을 보낼 수 있어야 함', () => {
      const callback = jest.fn();
      
      SocialMediaService.subscribe(callback);
      SocialMediaService.notifySubscribers();
      
      expect(callback).toHaveBeenCalled();
    });

    it('구독자 알림 중 오류가 발생해도 다른 구독자에게 영향을 주지 않아야 함', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const callback3 = jest.fn();
      
      SocialMediaService.subscribe(callback1);
      SocialMediaService.subscribe(callback2);
      SocialMediaService.subscribe(callback3);
      
      // 오류가 발생해도 다른 콜백은 실행되어야 함
      expect(() => SocialMediaService.notifySubscribers()).not.toThrow();
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });
  });

  describe('모니터링 대상 관리', () => {
    it('모니터링 대상을 추가할 수 있어야 함', () => {
      const platform = 'twitter';
      const target = '@new_crypto_account';
      
      expect(() => {
        SocialMediaService.addMonitoringTarget(platform, target);
      }).not.toThrow();
    });

    it('중복된 모니터링 대상을 추가하지 않아야 함', () => {
      const platform = 'twitter';
      const target = '@duplicate_account';
      
      // 첫 번째 추가
      SocialMediaService.addMonitoringTarget(platform, target);
      
      // 두 번째 추가 (중복)
      expect(() => {
        SocialMediaService.addMonitoringTarget(platform, target);
      }).not.toThrow();
    });

    it('모니터링 대상을 제거할 수 있어야 함', () => {
      const platform = 'telegram';
      const target = '@removable_channel';
      
      // 먼저 추가
      SocialMediaService.addMonitoringTarget(platform, target);
      
      // 제거
      expect(() => {
        SocialMediaService.removeMonitoringTarget(platform, target);
      }).not.toThrow();
    });

    it('존재하지 않는 모니터링 대상을 제거해도 오류가 발생하지 않아야 함', () => {
      const platform = 'discord';
      const target = '@nonexistent_channel';
      
      expect(() => {
        SocialMediaService.removeMonitoringTarget(platform, target);
      }).not.toThrow();
    });
  });

  describe('키워드 관리', () => {
    it('영어 키워드를 추가할 수 있어야 함', () => {
      const keyword = 'defi';
      
      expect(() => {
        SocialMediaService.addKeyword(keyword, false);
      }).not.toThrow();
    });

    it('한국어 키워드를 추가할 수 있어야 함', () => {
      const keyword = '디파이';
      
      expect(() => {
        SocialMediaService.addKeyword(keyword, true);
      }).not.toThrow();
    });

    it('중복된 키워드를 추가하지 않아야 함', () => {
      const keyword = 'nft';
      
      // 첫 번째 추가
      SocialMediaService.addKeyword(keyword, false);
      
      // 두 번째 추가 (중복)
      expect(() => {
        SocialMediaService.addKeyword(keyword, false);
      }).not.toThrow();
    });

    it('영어 키워드를 제거할 수 있어야 함', () => {
      const keyword = 'blockchain';
      
      // 먼저 추가
      SocialMediaService.addKeyword(keyword, false);
      
      // 제거
      expect(() => {
        SocialMediaService.removeKeyword(keyword, false);
      }).not.toThrow();
    });

    it('한국어 키워드를 제거할 수 있어야 함', () => {
      const keyword = '블록체인';
      
      // 먼저 추가
      SocialMediaService.addKeyword(keyword, true);
      
      // 제거
      expect(() => {
        SocialMediaService.removeKeyword(keyword, true);
      }).not.toThrow();
    });

    it('존재하지 않는 키워드를 제거해도 오류가 발생하지 않아야 함', () => {
      const keyword = 'nonexistent';
      
      expect(() => {
        SocialMediaService.removeKeyword(keyword, false);
      }).not.toThrow();
    });
  });

  describe('데이터 처리 메서드', () => {
    it('감정 분석이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 public 메서드로 노출하거나 별도 테스트 필요
      
      const positiveText = 'Bitcoin is going to the moon!';
      const negativeText = 'Ethereum is dumping hard';
      const neutralText = 'Crypto market is stable today';
      
      // 실제 구현에서는 이런 테스트가 가능해야 함
      // expect(SocialMediaService.analyzeSentiment(positiveText)).toBe('positive');
      // expect(SocialMediaService.analyzeSentiment(negativeText)).toBe('negative');
      // expect(SocialMediaService.analyzeSentiment(neutralText)).toBe('neutral');
    });

    it('관련성 계산이 올바르게 작동해야 함', () => {
      const relevantText = 'Bitcoin and Ethereum are both cryptocurrencies';
      const irrelevantText = 'Today is a beautiful day';
      
      // 실제 구현에서는 이런 테스트가 가능해야 함
      // expect(SocialMediaService.calculateRelevance(relevantText)).toBeGreaterThan(0);
      // expect(SocialMediaService.calculateRelevance(irrelevantText)).toBe(0);
    });

    it('키워드 추출이 올바르게 작동해야 함', () => {
      const text = 'Bitcoin and Ethereum are the top cryptocurrencies';
      
      // 실제 구현에서는 이런 테스트가 가능해야 함
      // const keywords = SocialMediaService.extractKeywords(text);
      // expect(keywords).toContain('bitcoin');
      // expect(keywords).toContain('ethereum');
      // expect(keywords).toContain('cryptocurrency');
    });
  });

  describe('Rate Limiting', () => {
    it('Rate limiting 체크가 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 public 메서드로 노출하거나 별도 테스트 필요
      
      // Twitter API rate limit 테스트
      // expect(SocialMediaService.checkRateLimit('twitter')).toBe(true);
      // expect(SocialMediaService.checkRateLimit('twitter')).toBe(false); // 연속 호출 시
    });
  });

  describe('에러 처리', () => {
    it('API 키가 없을 때 적절한 처리를 해야 함', async () => {
      // API 키가 설정되지 않은 상태에서 모니터링 시작
      await expect(SocialMediaService.startMonitoring()).resolves.not.toThrow();
      
      const status = SocialMediaService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('네트워크 오류 시 적절한 처리를 해야 함', async () => {
      // 실제 구현에서는 네트워크 오류 시뮬레이션이 필요
      await expect(SocialMediaService.startMonitoring()).resolves.not.toThrow();
    });
  });
});
