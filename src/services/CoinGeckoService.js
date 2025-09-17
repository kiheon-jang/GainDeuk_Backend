const axios = require('axios');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.COINGECKO_API_KEY;
    this.rateLimit = parseInt(process.env.COINGECKO_RATE_LIMIT) || 30;
    this.monthlyLimit = parseInt(process.env.COINGECKO_MONTHLY_LIMIT) || 10000;
    this.cacheService = new CacheService();
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: this.apiKey ? {
        'x-cg-demo-api-key': this.apiKey
      } : {}
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        logger.apiCall('CoinGecko', config.url, 0, true);
        return config;
      },
      (error) => {
        logger.error('CoinGecko request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        const duration = response.config.metadata?.endTime - response.config.metadata?.startTime || 0;
        logger.apiCall('CoinGecko', response.config.url, duration, true, response.status);
        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.endTime - error.config?.metadata?.startTime || 0;
        logger.apiCall('CoinGecko', error.config?.url, duration, false, error.response?.status);
        return Promise.reject(error);
      }
    );
  }

  // 모든 코인 리스트 가져오기
  async getAllCoinsList() {
    try {
      const cacheKey = 'coingecko:coins:list';
      let coinsList = await this.cacheService.get(cacheKey);
      
      if (coinsList) {
        logger.info('Coins list loaded from cache');
        return coinsList;
      }

      const response = await this.axios.get('/coins/list');
      coinsList = response.data;
      
      // 1시간 캐시
      await this.cacheService.set(cacheKey, coinsList, 3600);
      
      logger.success(`Fetched ${coinsList.length} coins from CoinGecko`);
      return coinsList;
    } catch (error) {
      logger.error('Failed to fetch coins list:', error);
      throw new Error(`Failed to fetch coins list: ${error.message}`);
    }
  }

  // 시장 데이터 배치 가져오기
  async getMarketDataBatch(page = 1, perPage = 250) {
    try {
      // API 호출 제한 체크
      await this.checkRateLimit();
      
      const cacheKey = `coingecko:market:${page}:${perPage}`;
      let marketData = await this.cacheService.get(cacheKey);
      
      if (marketData) {
        logger.info(`Market data page ${page} loaded from cache`);
        return marketData;
      }

      const params = {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page: page,
        sparkline: false,
        price_change_percentage: '1h,24h,7d,30d',
        locale: 'en'
      };

      const response = await this.axios.get('/coins/markets', { params });
      marketData = response.data;
      
      // 5분 캐시
      await this.cacheService.set(cacheKey, marketData, 300);
      
      logger.success(`Fetched market data batch ${page} (${marketData.length} coins)`);
      return marketData;
    } catch (error) {
      logger.error(`Failed to fetch market data batch ${page}:`, error);
      throw new Error(`Failed to fetch market data batch ${page}: ${error.message}`);
    }
  }

  // 특정 코인 상세 데이터
  async getCoinDetails(coinId) {
    try {
      const cacheKey = `coingecko:coin:${coinId}`;
      let coinDetails = await this.cacheService.get(cacheKey);
      
      if (coinDetails) {
        logger.info(`Coin details for ${coinId} loaded from cache`);
        return coinDetails;
      }

      const response = await this.axios.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });
      
      coinDetails = response.data;
      
      // 10분 캐시
      await this.cacheService.set(cacheKey, coinDetails, 600);
      
      logger.success(`Fetched coin details for ${coinId}`);
      return coinDetails;
    } catch (error) {
      logger.error(`Failed to fetch coin details for ${coinId}:`, error);
      throw new Error(`Failed to fetch coin details for ${coinId}: ${error.message}`);
    }
  }

  // OHLC 데이터
  async getOHLCData(coinId, days = 7) {
    try {
      const cacheKey = `coingecko:ohlc:${coinId}:${days}`;
      let ohlcData = await this.cacheService.get(cacheKey);
      
      if (ohlcData) {
        logger.info(`OHLC data for ${coinId} (${days}d) loaded from cache`);
        return ohlcData;
      }

      const response = await this.axios.get(`/coins/${coinId}/ohlc`, {
        params: {
          vs_currency: 'usd',
          days: days
        }
      });
      
      ohlcData = response.data;
      
      // 1시간 캐시
      await this.cacheService.set(cacheKey, ohlcData, 3600);
      
      logger.success(`Fetched OHLC data for ${coinId} (${days} days)`);
      return ohlcData;
    } catch (error) {
      logger.error(`Failed to fetch OHLC data for ${coinId}:`, error);
      throw new Error(`Failed to fetch OHLC data for ${coinId}: ${error.message}`);
    }
  }

  // 글로벌 시장 데이터
  async getGlobalData() {
    try {
      const cacheKey = 'coingecko:global';
      let globalData = await this.cacheService.get(cacheKey);
      
      if (globalData) {
        logger.info('Global data loaded from cache');
        return globalData;
      }

      const response = await this.axios.get('/global');
      globalData = response.data;
      
      // 30분 캐시
      await this.cacheService.set(cacheKey, globalData, 1800);
      
      logger.success('Fetched global market data');
      return globalData;
    } catch (error) {
      logger.error('Failed to fetch global data:', error);
      throw new Error(`Failed to fetch global data: ${error.message}`);
    }
  }

  // 트렌딩 코인
  async getTrendingCoins() {
    try {
      const cacheKey = 'coingecko:trending';
      let trendingData = await this.cacheService.get(cacheKey);
      
      if (trendingData) {
        logger.info('Trending coins loaded from cache');
        return trendingData;
      }

      const response = await this.axios.get('/search/trending');
      trendingData = response.data;
      
      // 15분 캐시
      await this.cacheService.set(cacheKey, trendingData, 900);
      
      logger.success('Fetched trending coins');
      return trendingData;
    } catch (error) {
      logger.error('Failed to fetch trending coins:', error);
      throw new Error(`Failed to fetch trending coins: ${error.message}`);
    }
  }

  // 코인 검색
  async searchCoins(query) {
    try {
      const cacheKey = `coingecko:search:${query.toLowerCase()}`;
      let searchResults = await this.cacheService.get(cacheKey);
      
      if (searchResults) {
        logger.info(`Search results for "${query}" loaded from cache`);
        return searchResults;
      }

      const response = await this.axios.get('/search', {
        params: { query }
      });
      
      searchResults = response.data;
      
      // 10분 캐시
      await this.cacheService.set(cacheKey, searchResults, 600);
      
      logger.success(`Searched coins for "${query}" (${searchResults.coins?.length || 0} results)`);
      return searchResults;
    } catch (error) {
      logger.error(`Failed to search coins for "${query}":`, error);
      throw new Error(`Failed to search coins for "${query}": ${error.message}`);
    }
  }

  // Rate limiting 체크
  async checkRateLimit() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const calls = await this.cacheService.getApiCallsToday('coingecko');
      const dailyLimit = Math.floor(this.monthlyLimit / 30);
      
      if (calls >= dailyLimit) {
        throw new Error(`Daily API limit reached: ${calls}/${dailyLimit}`);
      }
      
      if (calls >= dailyLimit * 0.9) {
        logger.warning(`API limit 90% reached: ${calls}/${dailyLimit}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      throw error;
    }
  }

  // API 호출 횟수 증가
  async incrementApiCalls() {
    return await this.cacheService.incrementApiCalls('coingecko');
  }

  // API 사용량 통계
  async getApiUsageStats() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const thisMonth = new Date().toISOString().slice(0, 7);
      
      const todayCalls = await this.cacheService.getApiCallsToday('coingecko');
      const monthCalls = await this.cacheService.getApiCallsThisMonth('coingecko');
      
      return {
        today: {
          calls: todayCalls,
          limit: Math.floor(this.monthlyLimit / 30),
          percentage: Math.round((todayCalls / (this.monthlyLimit / 30)) * 100)
        },
        month: {
          calls: monthCalls,
          limit: this.monthlyLimit,
          percentage: Math.round((monthCalls / this.monthlyLimit) * 100)
        },
        rateLimit: this.rateLimit
      };
    } catch (error) {
      logger.error('Failed to get API usage stats:', error);
      return null;
    }
  }

  // 배치 처리용 메서드
  async processBatchCoins(coinIds, batchSize = 50) {
    const results = [];
    const batches = [];
    
    // 배치로 나누기
    for (let i = 0; i < coinIds.length; i += batchSize) {
      batches.push(coinIds.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      try {
        const batchPromises = batch.map(coinId => this.getCoinDetails(coinId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error(`Failed to fetch ${batch[index]}:`, result.reason);
          }
        });
        
        // 배치 간 지연
        await this.sleep(1000);
      } catch (error) {
        logger.error('Batch processing error:', error);
      }
    }
    
    return results;
  }

  // 유틸리티 메서드
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 연결 테스트
  async testConnection() {
    try {
      const response = await this.axios.get('/ping');
      return response.status === 200;
    } catch (error) {
      logger.error('CoinGecko connection test failed:', error);
      return false;
    }
  }
}

module.exports = CoinGeckoService;
