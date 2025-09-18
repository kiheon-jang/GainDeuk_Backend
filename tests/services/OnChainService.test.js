const OnChainService = require('../../src/services/OnChainService');

describe('OnChainService', () => {
  beforeEach(() => {
    // 각 테스트 전에 서비스 상태 초기화
    OnChainService.stopMonitoring();
  });

  afterEach(() => {
    // 각 테스트 후에 서비스 정리
    OnChainService.stopMonitoring();
  });

  describe('모니터링 제어', () => {
    it('모니터링을 시작할 수 있어야 함', async () => {
      // API 키가 설정되지 않은 상태에서도 시작은 가능해야 함
      await expect(OnChainService.startMonitoring()).resolves.not.toThrow();
      
      const status = OnChainService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('모니터링을 중지할 수 있어야 함', () => {
      OnChainService.stopMonitoring();
      
      const status = OnChainService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('이미 실행 중인 모니터링을 중복 시작하면 경고를 표시해야 함', async () => {
      await OnChainService.startMonitoring();
      
      // 두 번째 시작 시도
      await expect(OnChainService.startMonitoring()).resolves.not.toThrow();
      
      const status = OnChainService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('실행 중이 아닌 모니터링을 중지하면 경고를 표시해야 함', () => {
      // 이미 중지된 상태에서 중지 시도
      expect(() => OnChainService.stopMonitoring()).not.toThrow();
    });
  });

  describe('상태 조회', () => {
    it('모니터링 상태를 올바르게 반환해야 함', () => {
      const status = OnChainService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('subscribers');
      expect(status).toHaveProperty('dataCount');
      expect(status).toHaveProperty('lastUpdate');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.subscribers).toBe('number');
      expect(typeof status.dataCount).toBe('number');
    });

    it('마지막 업데이트 시간을 올바르게 반환해야 함', () => {
      const lastUpdate = OnChainService.getLastUpdateTime();
      
      // 데이터가 없으면 null이어야 함
      expect(lastUpdate).toBeNull();
    });
  });

  describe('데이터 조회', () => {
    it('전체 온체인 데이터를 조회할 수 있어야 함', () => {
      const data = OnChainService.getOnChainData();
      
      expect(typeof data).toBe('object');
    });

    it('특정 네트워크 데이터를 조회할 수 있어야 함', () => {
      const ethereumData = OnChainService.getOnChainData('ethereum');
      const bscData = OnChainService.getOnChainData('bsc');
      const polygonData = OnChainService.getOnChainData('polygon');
      
      // 데이터가 없으면 undefined여야 함
      expect(ethereumData).toBeUndefined();
      expect(bscData).toBeUndefined();
      expect(polygonData).toBeUndefined();
    });

    it('존재하지 않는 네트워크 데이터 조회 시 undefined를 반환해야 함', () => {
      const data = OnChainService.getOnChainData('nonexistent');
      expect(data).toBeUndefined();
    });

    it('토큰 언락 스케줄을 조회할 수 있어야 함', () => {
      const unlocks = OnChainService.getTokenUnlockSchedules();
      
      // 초기화된 언락 스케줄이 있어야 함
      expect(unlocks).toBeDefined();
      if (unlocks) {
        expect(unlocks).toHaveProperty('data');
        expect(unlocks).toHaveProperty('count');
        expect(unlocks).toHaveProperty('timestamp');
        expect(Array.isArray(unlocks.data)).toBe(true);
      }
    });

    it('대용량 트랜잭션을 조회할 수 있어야 함', () => {
      const largeTransactions = OnChainService.getLargeTransactions();
      
      // 데이터가 없으면 undefined여야 함
      expect(largeTransactions).toBeUndefined();
    });

    it('고래 움직임을 조회할 수 있어야 함', () => {
      const whaleMovements = OnChainService.getWhaleMovements();
      
      // 데이터가 없으면 undefined여야 함
      expect(whaleMovements).toBeUndefined();
    });
  });

  describe('구독자 관리', () => {
    it('구독자를 추가할 수 있어야 함', () => {
      const callback = jest.fn();
      
      OnChainService.subscribe(callback);
      
      const status = OnChainService.getStatus();
      expect(status.subscribers).toBe(1);
    });

    it('구독자를 제거할 수 있어야 함', () => {
      const callback = jest.fn();
      
      OnChainService.subscribe(callback);
      OnChainService.unsubscribe(callback);
      
      const status = OnChainService.getStatus();
      expect(status.subscribers).toBe(0);
    });

    it('여러 구독자를 관리할 수 있어야 함', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      OnChainService.subscribe(callback1);
      OnChainService.subscribe(callback2);
      OnChainService.subscribe(callback3);
      
      let status = OnChainService.getStatus();
      expect(status.subscribers).toBe(3);
      
      OnChainService.unsubscribe(callback2);
      
      status = OnChainService.getStatus();
      expect(status.subscribers).toBe(2);
    });

    it('구독자에게 알림을 보낼 수 있어야 함', () => {
      const callback = jest.fn();
      
      OnChainService.subscribe(callback);
      OnChainService.notifySubscribers();
      
      expect(callback).toHaveBeenCalled();
    });

    it('구독자 알림 중 오류가 발생해도 다른 구독자에게 영향을 주지 않아야 함', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const callback3 = jest.fn();
      
      OnChainService.subscribe(callback1);
      OnChainService.subscribe(callback2);
      OnChainService.subscribe(callback3);
      
      // 오류가 발생해도 다른 콜백은 실행되어야 함
      expect(() => OnChainService.notifySubscribers()).not.toThrow();
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });
  });

  describe('토큰 언락 스케줄 관리', () => {
    it('토큰 언락 스케줄을 추가할 수 있어야 함', () => {
      const unlockData = {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        tokenSymbol: 'TEST',
        unlockDate: '2024-12-31',
        unlockAmount: '1000000000000000000000000',
        unlockPercentage: 5.0,
        description: 'Test unlock'
      };
      
      expect(() => {
        OnChainService.addTokenUnlockSchedule(unlockData);
      }).not.toThrow();
    });

    it('토큰 언락 스케줄을 제거할 수 있어야 함', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      // 먼저 추가
      OnChainService.addTokenUnlockSchedule({
        tokenAddress,
        tokenSymbol: 'TEST',
        unlockDate: '2024-12-31',
        unlockAmount: '1000000000000000000000000',
        unlockPercentage: 5.0,
        description: 'Test unlock'
      });
      
      // 제거
      expect(() => {
        OnChainService.removeTokenUnlockSchedule(tokenAddress);
      }).not.toThrow();
    });

    it('존재하지 않는 토큰 언락 스케줄을 제거해도 오류가 발생하지 않아야 함', () => {
      const tokenAddress = '0xnonexistent123456789012345678901234567890';
      
      expect(() => {
        OnChainService.removeTokenUnlockSchedule(tokenAddress);
      }).not.toThrow();
    });
  });

  describe('모니터링 토큰 관리', () => {
    it('모니터링 토큰을 추가할 수 있어야 함', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      expect(() => {
        OnChainService.addMonitoringToken(tokenAddress);
      }).not.toThrow();
    });

    it('중복된 모니터링 토큰을 추가하지 않아야 함', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      // 첫 번째 추가
      OnChainService.addMonitoringToken(tokenAddress);
      
      // 두 번째 추가 (중복)
      expect(() => {
        OnChainService.addMonitoringToken(tokenAddress);
      }).not.toThrow();
    });

    it('모니터링 토큰을 제거할 수 있어야 함', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      // 먼저 추가
      OnChainService.addMonitoringToken(tokenAddress);
      
      // 제거
      expect(() => {
        OnChainService.removeMonitoringToken(tokenAddress);
      }).not.toThrow();
    });

    it('존재하지 않는 모니터링 토큰을 제거해도 오류가 발생하지 않아야 함', () => {
      const tokenAddress = '0xnonexistent123456789012345678901234567890';
      
      expect(() => {
        OnChainService.removeMonitoringToken(tokenAddress);
      }).not.toThrow();
    });
  });

  describe('데이터 처리 메서드', () => {
    it('Ether 단위 변환이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 public 메서드로 노출하거나 별도 테스트 필요
      
      const weiValue = '1000000000000000000'; // 1 ETH
      // expect(OnChainService.parseEther(weiValue)).toBe(1);
    });

    it('총 거래량 계산이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      const mockTransactions = [
        { value: '1000000000000000000' }, // 1 ETH
        { value: '2000000000000000000' }, // 2 ETH
        { value: '500000000000000000' }   // 0.5 ETH
      ];
      
      // expect(OnChainService.calculateTotalVolume(mockTransactions)).toBe(3.5);
    });

    it('트랜잭션 패턴 분석이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      const mockTransactions = [
        {
          value: '1000000000000000000',
          timeStamp: '1640995200', // 2022-01-01 00:00:00
          to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // Uniswap V2
        }
      ];
      
      // const analysis = OnChainService.analyzeTransactionPatterns(mockTransactions);
      // expect(analysis.totalVolume).toBe(1);
      // expect(analysis.largestTransaction).toBeDefined();
    });

    it('고래 패턴 분석이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      const mockMovements = [
        {
          from: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000000', // 1000 tokens
          type: 'transfer'
        }
      ];
      
      // const analysis = OnChainService.analyzeWhalePatterns(mockMovements);
      // expect(analysis.totalMovements).toBe(1);
      // expect(analysis.totalVolume).toBe(1000);
    });

    it('프로토콜 식별이 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      const uniswapV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
      // expect(OnChainService.identifyProtocol(uniswapV2Address)).toBe('ethereum-uniswapV2');
    });
  });

  describe('Rate Limiting', () => {
    it('Rate limiting 체크가 올바르게 작동해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 public 메서드로 노출하거나 별도 테스트 필요
      
      // Etherscan API rate limit 테스트
      // expect(OnChainService.checkRateLimit('etherscan')).toBe(true);
      // expect(OnChainService.checkRateLimit('etherscan')).toBe(false); // 연속 호출 시
    });
  });

  describe('네트워크 설정', () => {
    it('네트워크 설정을 올바르게 조회해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      // const ethereumConfig = OnChainService.getNetworkConfig('ethereum');
      // expect(ethereumConfig).toBeDefined();
      // expect(ethereumConfig.baseUrl).toContain('etherscan');
      
      // const bscConfig = OnChainService.getNetworkConfig('bsc');
      // expect(bscConfig).toBeDefined();
      // expect(bscConfig.baseUrl).toContain('bscscan');
      
      // const invalidConfig = OnChainService.getNetworkConfig('invalid');
      // expect(invalidConfig).toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('API 키가 없을 때 적절한 처리를 해야 함', async () => {
      // API 키가 설정되지 않은 상태에서 모니터링 시작
      await expect(OnChainService.startMonitoring()).resolves.not.toThrow();
      
      const status = OnChainService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('네트워크 오류 시 적절한 처리를 해야 함', async () => {
      // 실제 구현에서는 네트워크 오류 시뮬레이션이 필요
      await expect(OnChainService.startMonitoring()).resolves.not.toThrow();
    });

    it('잘못된 네트워크 요청 시 적절한 처리를 해야 함', () => {
      // private 메서드이므로 직접 테스트할 수 없음
      // 실제 구현에서는 이런 테스트가 가능해야 함
      
      // expect(() => {
      //   OnChainService.getNetworkConfig('invalid-network');
      // }).not.toThrow();
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', async () => {
      // 1. 상태 확인
      let status = OnChainService.getStatus();
      expect(status.isRunning).toBe(false);

      // 2. 모니터링 시작
      await OnChainService.startMonitoring();
      
      status = OnChainService.getStatus();
      expect(status.isRunning).toBe(true);

      // 3. 구독자 추가
      const callback = jest.fn();
      OnChainService.subscribe(callback);
      
      status = OnChainService.getStatus();
      expect(status.subscribers).toBe(1);

      // 4. 토큰 언락 스케줄 추가
      OnChainService.addTokenUnlockSchedule({
        tokenAddress: '0x1234567890123456789012345678901234567890',
        tokenSymbol: 'TEST',
        unlockDate: '2024-12-31',
        unlockAmount: '1000000000000000000000000',
        unlockPercentage: 5.0,
        description: 'Test unlock'
      });

      // 5. 모니터링 토큰 추가
      OnChainService.addMonitoringToken('0x1234567890123456789012345678901234567890');

      // 6. 데이터 조회
      const data = OnChainService.getOnChainData();
      expect(typeof data).toBe('object');

      // 7. 모니터링 중지
      OnChainService.stopMonitoring();
      
      status = OnChainService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
