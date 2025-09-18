const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * 온체인 데이터 수집 및 분석 서비스
 * Uniswap, PancakeSwap 등 DeFi 프로토콜의 자금 이동과 토큰 언락 스케줄을 추적
 */
class OnChainService {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.defiData = new Map();
    this.subscribers = new Set();
    
    // API 설정
    this.apiConfig = {
      etherscan: {
        baseUrl: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY,
        rateLimit: 5, // 1초당 5 요청
        lastRequest: 0
      },
      bscscan: {
        baseUrl: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY,
        rateLimit: 5,
        lastRequest: 0
      },
      polygon: {
        baseUrl: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY,
        rateLimit: 5,
        lastRequest: 0
      },
      alchemy: {
        baseUrl: 'https://eth-mainnet.g.alchemy.com/v2',
        apiKey: process.env.ALCHEMY_API_KEY,
        rateLimit: 10,
        lastRequest: 0
      },
      moralis: {
        baseUrl: 'https://deep-index.moralis.io/api/v2',
        apiKey: process.env.MORALIS_API_KEY,
        rateLimit: 20,
        lastRequest: 0
      }
    };

    // DeFi 프로토콜 주소
    this.protocolAddresses = {
      ethereum: {
        uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        curve: '0x8301AE4fc9c624d1d396cbdaa1ed877821d7c511',
        compound: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
        aave: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'
      },
      bsc: {
        pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        biswap: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
        apeswap: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
        venus: '0xfD36E2c2a6789Db23113685031d7F16329158384'
      },
      polygon: {
        quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        curve: '0x445FE580eF8d70FF569aB36e80c647af338db351'
      }
    };

    // 주요 토큰 주소
    this.tokenAddresses = {
      ethereum: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDC: '0xA0b86a33E6441b8c4C8C0e4b8c4C8C0e4b8c4C8C',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
      },
      bsc: {
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
      }
    };

    // 모니터링 대상 토큰
    this.monitoringTokens = [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86a33E6441b8c4C8C0e4b8c4C8C0e4b8c4C8C', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  // WBTC
    ];

    // 토큰 언락 스케줄 (예시 데이터)
    this.tokenUnlockSchedules = new Map();
    this.initializeTokenUnlockSchedules();
  }

  /**
   * 토큰 언락 스케줄 초기화
   */
  initializeTokenUnlockSchedules() {
    // 실제 구현에서는 데이터베이스나 외부 API에서 로드
    const sampleUnlocks = [
      {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        tokenSymbol: 'SAMPLE',
        unlockDate: new Date('2024-12-25'),
        unlockAmount: '1000000000000000000000000', // 1M tokens
        unlockPercentage: 5.0,
        description: 'Team allocation unlock'
      },
      {
        tokenAddress: '0x2345678901234567890123456789012345678901',
        tokenSymbol: 'TEST',
        unlockDate: new Date('2024-12-31'),
        unlockAmount: '500000000000000000000000', // 500K tokens
        unlockPercentage: 2.5,
        description: 'Advisor unlock'
      }
    ];

    sampleUnlocks.forEach(unlock => {
      this.tokenUnlockSchedules.set(unlock.tokenAddress, unlock);
    });
  }

  /**
   * 온체인 모니터링 시작
   */
  async startMonitoring() {
    if (this.isRunning) {
      logger.warn('온체인 모니터링이 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('온체인 모니터링을 시작합니다.');

      // 초기 데이터 수집
      await this.collectInitialData();

      // 주기적 모니터링 시작 (10분마다)
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.monitorOnChainData();
        } catch (error) {
          logger.error('온체인 모니터링 중 오류 발생:', error);
        }
      }, 10 * 60 * 1000);

      logger.info('온체인 모니터링이 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('온체인 모니터링 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 온체인 모니터링 중지
   */
  stopMonitoring() {
    if (!this.isRunning) {
      logger.warn('온체인 모니터링이 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('온체인 모니터링이 중지되었습니다.');
  }

  /**
   * 초기 데이터 수집
   */
  async collectInitialData() {
    logger.info('초기 온체인 데이터를 수집합니다.');

    const promises = [
      this.collectEthereumData(),
      this.collectBSCData(),
      this.collectPolygonData(),
      this.updateTokenUnlockSchedules()
    ];

    await Promise.allSettled(promises);
  }

  /**
   * 주기적 온체인 모니터링
   */
  async monitorOnChainData() {
    logger.debug('온체인 데이터를 수집합니다.');

    const promises = [
      this.collectEthereumData(),
      this.collectBSCData(),
      this.collectPolygonData(),
      this.updateTokenUnlockSchedules(),
      this.analyzeLargeTransactions(),
      this.monitorWhaleMovements()
    ];

    const results = await Promise.allSettled(promises);
    
    // 결과 처리
    results.forEach((result, index) => {
      const operations = ['ethereum', 'bsc', 'polygon', 'unlock', 'large_tx', 'whale'];
      if (result.status === 'rejected') {
        logger.error(`${operations[index]} 데이터 수집 실패:`, result.reason);
      }
    });

    // 구독자들에게 업데이트 알림
    this.notifySubscribers();
  }

  /**
   * 이더리움 데이터 수집
   */
  async collectEthereumData() {
    try {
      const data = {
        network: 'ethereum',
        timestamp: new Date(),
        protocols: {},
        largeTransactions: [],
        whaleMovements: []
      };

      // Uniswap V3 데이터 수집
      await this.collectUniswapV3Data(data);
      
      // Curve 데이터 수집
      await this.collectCurveData(data);
      
      // Aave 데이터 수집
      await this.collectAaveData(data);

      this.defiData.set('ethereum', data);
      logger.info('이더리움 데이터 수집 완료');

    } catch (error) {
      logger.error('이더리움 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * BSC 데이터 수집
   */
  async collectBSCData() {
    try {
      const data = {
        network: 'bsc',
        timestamp: new Date(),
        protocols: {},
        largeTransactions: [],
        whaleMovements: []
      };

      // PancakeSwap 데이터 수집
      await this.collectPancakeSwapData(data);
      
      // Venus 데이터 수집
      await this.collectVenusData(data);

      this.defiData.set('bsc', data);
      logger.info('BSC 데이터 수집 완료');

    } catch (error) {
      logger.error('BSC 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * 폴리곤 데이터 수집
   */
  async collectPolygonData() {
    try {
      const data = {
        network: 'polygon',
        timestamp: new Date(),
        protocols: {},
        largeTransactions: [],
        whaleMovements: []
      };

      // QuickSwap 데이터 수집
      await this.collectQuickSwapData(data);

      this.defiData.set('polygon', data);
      logger.info('폴리곤 데이터 수집 완료');

    } catch (error) {
      logger.error('폴리곤 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * Uniswap V3 데이터 수집
   */
  async collectUniswapV3Data(data) {
    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('etherscan')) {
        logger.warn('Etherscan API Rate limit에 도달했습니다.');
        return;
      }

      const uniswapV3Address = this.protocolAddresses.ethereum.uniswapV3;
      
      // 최근 트랜잭션 조회
      const transactions = await this.getRecentTransactions(uniswapV3Address, 'ethereum');
      
      // 대용량 트랜잭션 필터링
      const largeTransactions = transactions.filter(tx => 
        this.parseEther(tx.value) > 100 // 100 ETH 이상
      );

      data.protocols.uniswapV3 = {
        address: uniswapV3Address,
        recentTransactions: transactions.length,
        largeTransactions: largeTransactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        topPairs: await this.getTopUniswapPairs()
      };

      data.largeTransactions.push(...largeTransactions);

    } catch (error) {
      logger.error('Uniswap V3 데이터 수집 실패:', error);
    }
  }

  /**
   * PancakeSwap 데이터 수집
   */
  async collectPancakeSwapData(data) {
    try {
      if (!this.checkRateLimit('bscscan')) {
        logger.warn('BSCscan API Rate limit에 도달했습니다.');
        return;
      }

      const pancakeswapAddress = this.protocolAddresses.bsc.pancakeswap;
      
      const transactions = await this.getRecentTransactions(pancakeswapAddress, 'bsc');
      
      const largeTransactions = transactions.filter(tx => 
        this.parseEther(tx.value) > 50 // 50 BNB 이상
      );

      data.protocols.pancakeswap = {
        address: pancakeswapAddress,
        recentTransactions: transactions.length,
        largeTransactions: largeTransactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        topPairs: await this.getTopPancakeSwapPairs()
      };

      data.largeTransactions.push(...largeTransactions);

    } catch (error) {
      logger.error('PancakeSwap 데이터 수집 실패:', error);
    }
  }

  /**
   * Curve 데이터 수집
   */
  async collectCurveData(data) {
    try {
      const curveAddress = this.protocolAddresses.ethereum.curve;
      
      const transactions = await this.getRecentTransactions(curveAddress, 'ethereum');
      
      data.protocols.curve = {
        address: curveAddress,
        recentTransactions: transactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        pools: await this.getCurvePools()
      };

    } catch (error) {
      logger.error('Curve 데이터 수집 실패:', error);
    }
  }

  /**
   * Aave 데이터 수집
   */
  async collectAaveData(data) {
    try {
      const aaveAddress = this.protocolAddresses.ethereum.aave;
      
      const transactions = await this.getRecentTransactions(aaveAddress, 'ethereum');
      
      data.protocols.aave = {
        address: aaveAddress,
        recentTransactions: transactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        lendingPools: await this.getAaveLendingPools()
      };

    } catch (error) {
      logger.error('Aave 데이터 수집 실패:', error);
    }
  }

  /**
   * Venus 데이터 수집
   */
  async collectVenusData(data) {
    try {
      const venusAddress = this.protocolAddresses.bsc.venus;
      
      const transactions = await this.getRecentTransactions(venusAddress, 'bsc');
      
      data.protocols.venus = {
        address: venusAddress,
        recentTransactions: transactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        lendingMarkets: await this.getVenusLendingMarkets()
      };

    } catch (error) {
      logger.error('Venus 데이터 수집 실패:', error);
    }
  }

  /**
   * QuickSwap 데이터 수집
   */
  async collectQuickSwapData(data) {
    try {
      const quickswapAddress = this.protocolAddresses.polygon.quickswap;
      
      const transactions = await this.getRecentTransactions(quickswapAddress, 'polygon');
      
      data.protocols.quickswap = {
        address: quickswapAddress,
        recentTransactions: transactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        topPairs: await this.getTopQuickSwapPairs()
      };

    } catch (error) {
      logger.error('QuickSwap 데이터 수집 실패:', error);
    }
  }

  /**
   * 최근 트랜잭션 조회
   */
  async getRecentTransactions(address, network) {
    try {
      const config = this.getNetworkConfig(network);
      if (!config) {
        throw new Error(`지원하지 않는 네트워크: ${network}`);
      }

      const url = `${config.baseUrl}`;
      const params = {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 100,
        sort: 'desc',
        apikey: config.apiKey
      };

      const response = await axios.get(url, { params });
      
      if (response.data.status === '1') {
        return response.data.result || [];
      } else {
        logger.warn(`트랜잭션 조회 실패: ${response.data.message}`);
        return [];
      }

    } catch (error) {
      logger.error('트랜잭션 조회 실패:', error);
      return [];
    }
  }

  /**
   * 대용량 트랜잭션 분석
   */
  async analyzeLargeTransactions() {
    try {
      const largeTransactions = [];
      
      // 각 네트워크의 대용량 트랜잭션 수집
      for (const [network, data] of this.defiData) {
        if (data.largeTransactions) {
          largeTransactions.push(...data.largeTransactions.map(tx => ({
            ...tx,
            network
          })));
        }
      }

      // 분석 결과 저장
      this.defiData.set('largeTransactions', {
        data: largeTransactions,
        timestamp: new Date(),
        count: largeTransactions.length,
        analysis: this.analyzeTransactionPatterns(largeTransactions)
      });

      logger.info(`대용량 트랜잭션 분석 완료: ${largeTransactions.length}개`);

    } catch (error) {
      logger.error('대용량 트랜잭션 분석 실패:', error);
    }
  }

  /**
   * 고래 움직임 모니터링
   */
  async monitorWhaleMovements() {
    try {
      const whaleMovements = [];
      
      // 모니터링 대상 토큰들의 대용량 이동 추적
      for (const tokenAddress of this.monitoringTokens) {
        const movements = await this.getWhaleMovements(tokenAddress);
        whaleMovements.push(...movements);
      }

      // 분석 결과 저장
      this.defiData.set('whaleMovements', {
        data: whaleMovements,
        timestamp: new Date(),
        count: whaleMovements.length,
        analysis: this.analyzeWhalePatterns(whaleMovements)
      });

      logger.info(`고래 움직임 모니터링 완료: ${whaleMovements.length}개`);

    } catch (error) {
      logger.error('고래 움직임 모니터링 실패:', error);
    }
  }

  /**
   * 고래 움직임 조회
   */
  async getWhaleMovements(tokenAddress) {
    try {
      // 실제 구현에서는 토큰 전송 이벤트를 모니터링
      // 여기서는 시뮬레이션 데이터 반환
      return [
        {
          tokenAddress,
          from: '0x1234567890123456789012345678901234567890',
          to: '0x2345678901234567890123456789012345678901',
          amount: '1000000000000000000000', // 1000 tokens
          timestamp: new Date(),
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          type: 'transfer'
        }
      ];

    } catch (error) {
      logger.error('고래 움직임 조회 실패:', error);
      return [];
    }
  }

  /**
   * 토큰 언락 스케줄 업데이트
   */
  async updateTokenUnlockSchedules() {
    try {
      const upcomingUnlocks = [];
      const currentDate = new Date();
      
      // 7일 이내의 언락 스케줄 조회
      const sevenDaysFromNow = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      for (const [tokenAddress, unlock] of this.tokenUnlockSchedules) {
        if (unlock.unlockDate <= sevenDaysFromNow && unlock.unlockDate >= currentDate) {
          upcomingUnlocks.push({
            ...unlock,
            daysUntilUnlock: Math.ceil((unlock.unlockDate - currentDate) / (24 * 60 * 60 * 1000))
          });
        }
      }

      // 날짜순 정렬
      upcomingUnlocks.sort((a, b) => a.unlockDate - b.unlockDate);

      this.defiData.set('tokenUnlocks', {
        data: upcomingUnlocks,
        timestamp: new Date(),
        count: upcomingUnlocks.length
      });

      logger.info(`토큰 언락 스케줄 업데이트 완료: ${upcomingUnlocks.length}개`);

    } catch (error) {
      logger.error('토큰 언락 스케줄 업데이트 실패:', error);
    }
  }

  /**
   * 네트워크 설정 조회
   */
  getNetworkConfig(network) {
    switch (network) {
      case 'ethereum':
        return this.apiConfig.etherscan;
      case 'bsc':
        return this.apiConfig.bscscan;
      case 'polygon':
        return this.apiConfig.polygon;
      default:
        return null;
    }
  }

  /**
   * Rate limiting 체크
   */
  checkRateLimit(apiName) {
    const config = this.apiConfig[apiName];
    if (!config) return false;
    
    const now = Date.now();
    const timeSinceLastRequest = now - config.lastRequest;
    
    if (timeSinceLastRequest < (1000 / config.rateLimit)) {
      return false;
    }
    
    config.lastRequest = now;
    return true;
  }

  /**
   * Ether 단위 변환
   */
  parseEther(wei) {
    return parseFloat(wei) / Math.pow(10, 18);
  }

  /**
   * 총 거래량 계산
   */
  calculateTotalVolume(transactions) {
    return transactions.reduce((total, tx) => {
      return total + this.parseEther(tx.value);
    }, 0);
  }

  /**
   * 트랜잭션 패턴 분석
   */
  analyzeTransactionPatterns(transactions) {
    const analysis = {
      totalVolume: 0,
      averageSize: 0,
      largestTransaction: null,
      timeDistribution: {},
      protocolDistribution: {}
    };

    if (transactions.length === 0) return analysis;

    let totalVolume = 0;
    let largestTx = null;

    transactions.forEach(tx => {
      const value = this.parseEther(tx.value);
      totalVolume += value;

      if (!largestTx || value > this.parseEther(largestTx.value)) {
        largestTx = tx;
      }

      // 시간대별 분포
      const hour = new Date(parseInt(tx.timeStamp) * 1000).getHours();
      analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;

      // 프로토콜별 분포
      const protocol = this.identifyProtocol(tx.to);
      analysis.protocolDistribution[protocol] = (analysis.protocolDistribution[protocol] || 0) + 1;
    });

    analysis.totalVolume = totalVolume;
    analysis.averageSize = totalVolume / transactions.length;
    analysis.largestTransaction = largestTx;

    return analysis;
  }

  /**
   * 고래 패턴 분석
   */
  analyzeWhalePatterns(movements) {
    const analysis = {
      totalMovements: movements.length,
      totalVolume: 0,
      topWhales: [],
      movementTypes: {}
    };

    const whaleCounts = new Map();

    movements.forEach(movement => {
      const amount = this.parseEther(movement.amount);
      analysis.totalVolume += amount;

      // 고래 식별 (1000 토큰 이상)
      if (amount >= 1000) {
        const whale = movement.from;
        whaleCounts.set(whale, (whaleCounts.get(whale) || 0) + 1);
      }

      // 이동 타입별 분포
      analysis.movementTypes[movement.type] = (analysis.movementTypes[movement.type] || 0) + 1;
    });

    // 상위 고래 식별
    analysis.topWhales = Array.from(whaleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, count]) => ({ address, count }));

    return analysis;
  }

  /**
   * 프로토콜 식별
   */
  identifyProtocol(address) {
    for (const [network, protocols] of Object.entries(this.protocolAddresses)) {
      for (const [protocol, protocolAddress] of Object.entries(protocols)) {
        if (protocolAddress.toLowerCase() === address.toLowerCase()) {
          return `${network}-${protocol}`;
        }
      }
    }
    return 'unknown';
  }

  /**
   * 상위 Uniswap 페어 조회 (시뮬레이션)
   */
  async getTopUniswapPairs() {
    return [
      { pair: 'WETH/USDC', volume: 1000000, liquidity: 50000000 },
      { pair: 'WETH/USDT', volume: 800000, liquidity: 40000000 },
      { pair: 'WBTC/WETH', volume: 600000, liquidity: 30000000 }
    ];
  }

  /**
   * 상위 PancakeSwap 페어 조회 (시뮬레이션)
   */
  async getTopPancakeSwapPairs() {
    return [
      { pair: 'WBNB/BUSD', volume: 2000000, liquidity: 100000000 },
      { pair: 'WBNB/USDT', volume: 1500000, liquidity: 75000000 },
      { pair: 'CAKE/WBNB', volume: 1000000, liquidity: 50000000 }
    ];
  }

  /**
   * Curve 풀 조회 (시뮬레이션)
   */
  async getCurvePools() {
    return [
      { name: '3pool', tvl: 2000000000, apy: 2.5 },
      { name: 'stETH', tvl: 1500000000, apy: 3.2 },
      { name: 'FRAX', tvl: 800000000, apy: 4.1 }
    ];
  }

  /**
   * Aave 대출 풀 조회 (시뮬레이션)
   */
  async getAaveLendingPools() {
    return [
      { asset: 'USDC', totalSupply: 5000000000, borrowRate: 3.5 },
      { asset: 'WETH', totalSupply: 2000000000, borrowRate: 2.8 },
      { asset: 'WBTC', totalSupply: 1000000000, borrowRate: 1.9 }
    ];
  }

  /**
   * Venus 대출 시장 조회 (시뮬레이션)
   */
  async getVenusLendingMarkets() {
    return [
      { asset: 'BNB', totalSupply: 10000000000, borrowRate: 4.2 },
      { asset: 'BUSD', totalSupply: 8000000000, borrowRate: 3.8 },
      { asset: 'USDT', totalSupply: 6000000000, borrowRate: 3.5 }
    ];
  }

  /**
   * 상위 QuickSwap 페어 조회 (시뮬레이션)
   */
  async getTopQuickSwapPairs() {
    return [
      { pair: 'WMATIC/USDC', volume: 500000, liquidity: 25000000 },
      { pair: 'WMATIC/USDT', volume: 400000, liquidity: 20000000 },
      { pair: 'WETH/WMATIC', volume: 300000, liquidity: 15000000 }
    ];
  }

  /**
   * 구독자 추가
   */
  subscribe(callback) {
    this.subscribers.add(callback);
  }

  /**
   * 구독자 제거
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * 구독자들에게 알림
   */
  notifySubscribers() {
    const data = this.getOnChainData();
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('구독자 알림 중 오류 발생:', error);
      }
    });
  }

  /**
   * 온체인 데이터 조회
   */
  getOnChainData(network = null) {
    if (network) {
      return this.defiData.get(network);
    }
    
    const allData = {};
    this.defiData.forEach((value, key) => {
      allData[key] = value;
    });
    
    return allData;
  }

  /**
   * 토큰 언락 스케줄 조회
   */
  getTokenUnlockSchedules() {
    return this.defiData.get('tokenUnlocks');
  }

  /**
   * 대용량 트랜잭션 조회
   */
  getLargeTransactions() {
    return this.defiData.get('largeTransactions');
  }

  /**
   * 고래 움직임 조회
   */
  getWhaleMovements() {
    return this.defiData.get('whaleMovements');
  }

  /**
   * 모니터링 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      subscribers: this.subscribers.size,
      dataCount: this.defiData.size,
      lastUpdate: this.getLastUpdateTime()
    };
  }

  /**
   * 마지막 업데이트 시간 조회
   */
  getLastUpdateTime() {
    let lastUpdate = null;
    this.defiData.forEach((value) => {
      if (!lastUpdate || value.timestamp > lastUpdate) {
        lastUpdate = value.timestamp;
      }
    });
    return lastUpdate;
  }

  /**
   * 토큰 언락 스케줄 추가
   */
  addTokenUnlockSchedule(unlockData) {
    const { tokenAddress, tokenSymbol, unlockDate, unlockAmount, unlockPercentage, description } = unlockData;
    
    this.tokenUnlockSchedules.set(tokenAddress, {
      tokenAddress,
      tokenSymbol,
      unlockDate: new Date(unlockDate),
      unlockAmount,
      unlockPercentage,
      description,
      addedAt: new Date()
    });

    logger.info(`토큰 언락 스케줄 추가: ${tokenSymbol} (${unlockDate})`);
  }

  /**
   * 토큰 언락 스케줄 제거
   */
  removeTokenUnlockSchedule(tokenAddress) {
    if (this.tokenUnlockSchedules.has(tokenAddress)) {
      this.tokenUnlockSchedules.delete(tokenAddress);
      logger.info(`토큰 언락 스케줄 제거: ${tokenAddress}`);
    }
  }

  /**
   * 모니터링 토큰 추가
   */
  addMonitoringToken(tokenAddress) {
    if (!this.monitoringTokens.includes(tokenAddress)) {
      this.monitoringTokens.push(tokenAddress);
      logger.info(`모니터링 토큰 추가: ${tokenAddress}`);
    }
  }

  /**
   * 모니터링 토큰 제거
   */
  removeMonitoringToken(tokenAddress) {
    const index = this.monitoringTokens.indexOf(tokenAddress);
    if (index > -1) {
      this.monitoringTokens.splice(index, 1);
      logger.info(`모니터링 토큰 제거: ${tokenAddress}`);
    }
  }
}

module.exports = new OnChainService();
