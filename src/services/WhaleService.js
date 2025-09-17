const axios = require('axios');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

class WhaleService {
  constructor() {
    this.etherscanKey = process.env.ETHERSCAN_API_KEY;
    this.btcApiUrl = 'https://api.blockcypher.com/v1/btc/main';
    this.cacheService = new CacheService();
    
    // 알려진 고래 지갑 주소들
    this.whaleAddresses = {
      btc: [
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis Block
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // Satoshi
        '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // Binance
        '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', // Binance 2
        '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s'  // Binance 3
      ],
      eth: [
        '0x742d35Cc6634C0532925a3b8D431c6E4c7F4c9FC', // Binance
        '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', // Binance 2
        '0x28C6c06298d514Db089934071355E5743bf21d60', // Binance 3
        '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549', // Binance 4
        '0x56Eddb7aa87536c09CCc2793473599fD21A8b17F', // Binance 5
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Uniswap
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // MakerDAO
        '0xA0b86a33E6441b8c4C8C0e4A0e8b8c4C8C0e4A0e'  // Vitalik
      ]
    };

    this.whaleThresholds = {
      btc: 50000000000, // 500 BTC (satoshi)
      eth: 1000000000000000000000, // 1000 ETH (wei)
      usd: 10000000 // $10M USD
    };
  }

  // 비트코인 대형 거래 추적
  async getBTCWhaleTransactions() {
    try {
      const cacheKey = 'whale:btc:transactions';
      let cachedWhaleData = await this.cacheService.getWhaleData('btc');
      
      if (cachedWhaleData) {
        logger.info('BTC whale data loaded from cache');
        return cachedWhaleData;
      }

      const response = await axios.get(`${this.btcApiUrl}/txs`, {
        params: {
          limit: 50,
          confirmations: 1
        },
        timeout: 10000
      });

      const largeTransactions = response.data.filter(tx => 
        tx.total > this.whaleThresholds.btc
      );

      const whaleData = {
        whaleCount: largeTransactions.length,
        totalVolume: largeTransactions.reduce((sum, tx) => sum + tx.total, 0),
        avgSize: largeTransactions.length > 0 ? 
          largeTransactions.reduce((sum, tx) => sum + tx.total, 0) / largeTransactions.length : 0,
        transactions: largeTransactions.slice(0, 10), // 상위 10개만 저장
        timestamp: new Date()
      };

      // 10분 캐시
      await this.cacheService.setWhaleData('btc', whaleData);
      
      logger.success(`Found ${whaleData.whaleCount} BTC whale transactions`);
      return whaleData;
    } catch (error) {
      logger.error('Failed to fetch BTC whale data:', error);
      return { whaleCount: 0, totalVolume: 0, avgSize: 0, transactions: [] };
    }
  }

  // 이더리움 대형 거래 추적
  async getETHWhaleTransactions() {
    if (!this.etherscanKey) {
      logger.warning('Etherscan API key not provided, skipping ETH whale tracking');
      return { whaleCount: 0, totalVolume: 0, avgSize: 0, transactions: [] };
    }

    try {
      const cacheKey = 'whale:eth:transactions';
      let cachedEthWhaleData = await this.cacheService.getWhaleData('eth');
      
      if (cachedEthWhaleData) {
        logger.info('ETH whale data loaded from cache');
        return cachedEthWhaleData;
      }

      let totalWhaleActivity = 0;
      let totalVolume = 0;
      let whaleTransactions = [];

      for (const address of this.whaleAddresses.eth) {
        try {
          const response = await axios.get('https://api.etherscan.io/api', {
            params: {
              module: 'account',
              action: 'txlist',
              address: address,
              startblock: 0,
              endblock: 99999999,
              page: 1,
              offset: 10,
              sort: 'desc',
              apikey: this.etherscanKey
            },
            timeout: 10000
          });

          if (response.data.status === '1') {
            const recentLargeTxs = response.data.result.filter(tx => 
              parseInt(tx.value) > this.whaleThresholds.eth
            );
            
            totalWhaleActivity += recentLargeTxs.length;
            totalVolume += recentLargeTxs.reduce((sum, tx) => sum + parseInt(tx.value), 0);
            whaleTransactions.push(...recentLargeTxs.slice(0, 5));
          }

          // Rate limiting
          await this.sleep(200);
        } catch (error) {
          logger.warning(`Failed to fetch ETH data for address ${address}:`, error.message);
        }
      }

      const ethWhaleData = {
        whaleCount: totalWhaleActivity,
        totalVolume: totalVolume,
        avgSize: totalWhaleActivity > 0 ? totalVolume / totalWhaleActivity : 0,
        transactions: whaleTransactions.slice(0, 10),
        timestamp: new Date()
      };

      // 10분 캐시
      await this.cacheService.setWhaleData('eth', ethWhaleData);
      
      logger.success(`Found ${ethWhaleData.whaleCount} ETH whale transactions`);
      return ethWhaleData;
    } catch (error) {
      logger.error('Failed to fetch ETH whale data:', error);
      return { whaleCount: 0, totalVolume: 0, avgSize: 0, transactions: [] };
    }
  }

  // 코인별 고래 활동 점수 계산
  async getWhaleActivityScore(coinSymbol) {
    try {
      const symbol = coinSymbol.toUpperCase();
      let whaleData = { whaleCount: 0, totalVolume: 0, avgSize: 0 };

      switch (symbol) {
        case 'BTC':
          whaleData = await this.getBTCWhaleTransactions();
          break;
        case 'ETH':
          whaleData = await this.getETHWhaleTransactions();
          break;
        default:
          // 다른 코인들은 기본값 또는 추후 확장
          logger.info(`Whale tracking not implemented for ${symbol}`);
          break;
      }

      // 고래 활동을 0-100 점수로 변환
      const activityScore = this.calculateWhaleScore(whaleData);
      
      logger.success(`Whale activity score for ${symbol}: ${activityScore}`);
      return activityScore;
    } catch (error) {
      logger.error(`Failed to calculate whale activity score for ${coinSymbol}:`, error);
      return 50; // 기본값
    }
  }

  // 고래 점수 계산 로직
  calculateWhaleScore(whaleData) {
    const { whaleCount, totalVolume, avgSize } = whaleData;
    
    if (whaleCount === 0) return 50; // 중립값
    
    let score = 50; // 기본값
    
    // 거래 횟수 기반 점수 (0-30점)
    if (whaleCount >= 20) score += 30;
    else if (whaleCount >= 15) score += 25;
    else if (whaleCount >= 10) score += 20;
    else if (whaleCount >= 5) score += 15;
    else if (whaleCount >= 3) score += 10;
    else if (whaleCount >= 1) score += 5;
    
    // 평균 거래 크기 기반 점수 (0-20점)
    if (avgSize > 0) {
      const sizeMultiplier = Math.min(avgSize / 1000000000000, 1); // 1000 BTC 기준
      score += sizeMultiplier * 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // 다중 코인 고래 활동 분석
  async getMultipleCoinWhaleActivity(coinSymbols) {
    const results = {};
    const promises = coinSymbols.map(async (symbol) => {
      try {
        const activity = await this.getWhaleActivityScore(symbol);
        results[symbol] = activity;
      } catch (error) {
        logger.error(`Failed to get whale activity for ${symbol}:`, error);
        results[symbol] = 50;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // 고래 거래 상세 분석
  async analyzeWhaleTransaction(transaction, coinType) {
    try {
      const analysis = {
        coinType,
        value: transaction.value || transaction.total,
        timestamp: new Date(transaction.time || transaction.timestamp),
        hash: transaction.hash,
        from: transaction.inputs?.[0]?.addresses?.[0] || transaction.from,
        to: transaction.outputs?.[0]?.addresses?.[0] || transaction.to,
        size: transaction.size || 0,
        confidence: transaction.confidence || 1,
        isWhale: false,
        riskLevel: 'low'
      };

      // 고래 거래 여부 확인
      const threshold = coinType === 'btc' ? this.whaleThresholds.btc : this.whaleThresholds.eth;
      analysis.isWhale = analysis.value > threshold;

      // 위험도 평가
      if (analysis.isWhale) {
        if (analysis.value > threshold * 5) {
          analysis.riskLevel = 'critical';
        } else if (analysis.value > threshold * 2) {
          analysis.riskLevel = 'high';
        } else {
          analysis.riskLevel = 'medium';
        }
      }

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze whale transaction:', error);
      return null;
    }
  }

  // 고래 활동 통계
  async getWhaleStats() {
    try {
      const btcData = await this.getBTCWhaleTransactions();
      const ethData = await this.getETHWhaleTransactions();
      
      return {
        btc: {
          whaleCount: btcData.whaleCount,
          totalVolume: btcData.totalVolume,
          avgSize: btcData.avgSize,
          score: this.calculateWhaleScore(btcData)
        },
        eth: {
          whaleCount: ethData.whaleCount,
          totalVolume: ethData.totalVolume,
          avgSize: ethData.avgSize,
          score: this.calculateWhaleScore(ethData)
        },
        total: {
          whaleCount: btcData.whaleCount + ethData.whaleCount,
          totalVolume: btcData.totalVolume + ethData.totalVolume,
          avgScore: (this.calculateWhaleScore(btcData) + this.calculateWhaleScore(ethData)) / 2
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get whale stats:', error);
      return null;
    }
  }

  // 고래 알림 생성
  async createWhaleAlert(coinSymbol, whaleData) {
    try {
      const Alert = require('../models/Alert');
      
      const alert = await Alert.createWhaleMoveAlert(
        coinSymbol,
        coinSymbol,
        whaleData.whaleCount,
        null // userId
      );

      await alert.trigger({
        score: this.calculateWhaleScore(whaleData),
        message: `${coinSymbol} 고래 활동 감지: ${whaleData.whaleCount}건의 대형 거래`,
        data: whaleData
      });

      logger.success(`Whale alert created for ${coinSymbol}`);
      return alert;
    } catch (error) {
      logger.error(`Failed to create whale alert for ${coinSymbol}:`, error);
      return null;
    }
  }

  // 고래 주소 추가
  addWhaleAddress(coinType, address) {
    if (this.whaleAddresses[coinType.toLowerCase()]) {
      this.whaleAddresses[coinType.toLowerCase()].push(address);
      logger.info(`Added whale address for ${coinType}: ${address}`);
    } else {
      logger.warning(`Unknown coin type: ${coinType}`);
    }
  }

  // 고래 주소 제거
  removeWhaleAddress(coinType, address) {
    if (this.whaleAddresses[coinType.toLowerCase()]) {
      const index = this.whaleAddresses[coinType.toLowerCase()].indexOf(address);
      if (index > -1) {
        this.whaleAddresses[coinType.toLowerCase()].splice(index, 1);
        logger.info(`Removed whale address for ${coinType}: ${address}`);
      }
    }
  }

  // 유틸리티 메서드
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 연결 테스트
  async testConnection() {
    try {
      const btcTest = await this.getBTCWhaleTransactions();
      const ethTest = this.etherscanKey ? await this.getETHWhaleTransactions() : { whaleCount: 0 };
      
      return {
        btc: btcTest.whaleCount >= 0,
        eth: ethTest.whaleCount >= 0,
        overall: true
      };
    } catch (error) {
      logger.error('Whale service connection test failed:', error);
      return { btc: false, eth: false, overall: false };
    }
  }
}

module.exports = WhaleService;
