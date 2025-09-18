const axios = require('axios');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

/**
 * 한국 시장 특화 서비스
 * 김치프리미엄 계산, 한국 거래소 API 연동, 한국 커뮤니티 분석 등
 */
class KoreanMarketService {
  constructor() {
    this.cacheService = new CacheService();
    
    // 한국 거래소 API 설정
    this.exchanges = {
      upbit: {
        name: 'Upbit',
        baseUrl: 'https://api.upbit.com/v1',
        weight: 0.6 // 업비트가 한국 시장에서 차지하는 비중
      },
      bithumb: {
        name: 'Bithumb',
        baseUrl: 'https://api.bithumb.com/public',
        weight: 0.4 // 빗썸이 한국 시장에서 차지하는 비중
      }
    };

    // 김치프리미엄 임계값 설정
    this.kimchiPremiumThresholds = {
      significant: 0.05,    // 5% 이상 - 의미있는 차이
      high: 0.10,          // 10% 이상 - 높은 차이
      extreme: 0.20        // 20% 이상 - 극심한 차이
    };

    // 한국어 감정분석용 키워드
    this.koreanSentimentKeywords = {
      positive: [
        '상승', '급등', '폭등', '상한가', '호재', '긍정적', '낙관적',
        '투자', '매수', '보유', '달성', '돌파', '신고가', '강세',
        '김치프리미엄', '한국시장', '국내', '우리나라'
      ],
      negative: [
        '하락', '급락', '폭락', '하한가', '악재', '부정적', '비관적',
        '매도', '손실', '하락세', '약세', '신저가', '위험', '조심',
        '거품', '과열', '조정', '하락장'
      ],
      neutral: [
        '보합', '횡보', '정체', '안정', '중립', '관망', '대기',
        '분석', '검토', '검증', '확인', '모니터링'
      ]
    };
  }

  /**
   * 김치프리미엄 계산
   * @param {string} coinSymbol - 코인 심볼 (예: 'BTC', 'ETH')
   * @returns {Object} 김치프리미엄 정보
   */
  async calculateKimchiPremium(coinSymbol) {
    try {
      const symbol = coinSymbol.toUpperCase();
      logger.info(`Calculating Kimchi Premium for ${symbol}`);

      // 캐시에서 확인
      const cacheKey = `kimchi_premium:${symbol}`;
      const cachedData = await this.cacheService.getKimchiPremium(symbol);
      if (cachedData) {
        logger.info(`Kimchi Premium for ${symbol} loaded from cache`);
        return cachedData;
      }

      // 한국 시장 가격과 글로벌 가격을 병렬로 가져오기
      const [koreanPrice, globalPrice] = await Promise.all([
        this.getKoreanMarketPrice(symbol),
        this.getGlobalMarketPrice(symbol)
      ]);

      if (!koreanPrice || !globalPrice) {
        throw new Error(`Failed to get prices for ${symbol}`);
      }

      // 김치프리미엄 계산
      const premium = (koreanPrice - globalPrice) / globalPrice;
      const premiumPercentage = premium * 100;

      const kimchiPremiumData = {
        symbol,
        koreanPrice,
        globalPrice,
        premium: premiumPercentage,
        isSignificant: Math.abs(premium) >= this.kimchiPremiumThresholds.significant,
        isHigh: Math.abs(premium) >= this.kimchiPremiumThresholds.high,
        isExtreme: Math.abs(premium) >= this.kimchiPremiumThresholds.extreme,
        trend: premium > 0 ? 'positive' : 'negative',
        timestamp: new Date(),
        exchanges: {
          upbit: await this.getUpbitPrice(symbol),
          bithumb: await this.getBithumbPrice(symbol)
        }
      };

      // 5분 캐시
      await this.cacheService.setKimchiPremium(symbol, kimchiPremiumData);

      logger.success(`Kimchi Premium calculated for ${symbol}: ${premiumPercentage.toFixed(2)}%`);
      return kimchiPremiumData;
    } catch (error) {
      logger.error(`Failed to calculate Kimchi Premium for ${coinSymbol}:`, error);
      return null;
    }
  }

  /**
   * 한국 시장 가격 조회 (업비트 + 빗썸 가중평균)
   * @param {string} symbol - 코인 심볼
   * @returns {number} 한국 시장 가격
   */
  async getKoreanMarketPrice(symbol) {
    try {
      const [upbitPrice, bithumbPrice] = await Promise.all([
        this.getUpbitPrice(symbol),
        this.getBithumbPrice(symbol)
      ]);

      // 가중평균 계산
      const upbitWeight = this.exchanges.upbit.weight;
      const bithumbWeight = this.exchanges.bithumb.weight;

      if (upbitPrice && bithumbPrice) {
        return (upbitPrice * upbitWeight) + (bithumbPrice * bithumbWeight);
      } else if (upbitPrice) {
        return upbitPrice;
      } else if (bithumbPrice) {
        return bithumbPrice;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get Korean market price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 업비트 가격 조회
   * @param {string} symbol - 코인 심볼
   * @returns {number} 업비트 가격
   */
  async getUpbitPrice(symbol) {
    try {
      // 심볼 변환 (bitcoin -> BTC, ethereum -> ETH 등)
      const symbolMap = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'ripple': 'XRP',
        'tether': 'USDT',
        'binancecoin': 'BNB'
      };
      
      const upbitSymbol = symbolMap[symbol.toLowerCase()] || symbol.toUpperCase();
      
      const response = await axios.get(`${this.exchanges.upbit.baseUrl}/ticker`, {
        params: {
          markets: `KRW-${upbitSymbol}`
        },
        timeout: 5000
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].trade_price;
      }
      return null;
    } catch (error) {
      logger.warning(`Failed to get Upbit price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * 빗썸 가격 조회
   * @param {string} symbol - 코인 심볼
   * @returns {number} 빗썸 가격
   */
  async getBithumbPrice(symbol) {
    try {
      // 심볼 변환 (bitcoin -> BTC, ethereum -> ETH 등)
      const symbolMap = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'ripple': 'XRP',
        'tether': 'USDT',
        'binancecoin': 'BNB'
      };
      
      const bithumbSymbol = symbolMap[symbol.toLowerCase()] || symbol.toUpperCase();
      
      const response = await axios.get(`${this.exchanges.bithumb.baseUrl}/ticker/${bithumbSymbol}_KRW`, {
        timeout: 5000
      });

      if (response.data && response.data.status === '0000') {
        return parseFloat(response.data.data.closing_price);
      }
      return null;
    } catch (error) {
      logger.warning(`Failed to get Bithumb price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * 글로벌 시장 가격 조회 (CoinGecko 사용)
   * @param {string} symbol - 코인 심볼
   * @returns {number} 글로벌 가격
   */
  async getGlobalMarketPrice(symbol) {
    try {
      const cacheKey = `global_price:${symbol.toLowerCase()}`;
      let cachedPrice = await this.cacheService.get(cacheKey);
      if (cachedPrice) {
        logger.info(`Global price for ${symbol} loaded from cache`);
        return cachedPrice;
      }

      // API 호출 간격 조정을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const CoinGeckoService = require('./CoinGeckoService');
      const coinGeckoService = new CoinGeckoService();
      
      const coinData = await coinGeckoService.getCoinDetails(symbol.toLowerCase());
      const price = coinData.market_data.current_price.usd;
      
      if (price > 0) {
        await this.cacheService.set(cacheKey, price, 120); // 2분 캐시
      }
      return price;
    } catch (error) {
      logger.error(`Failed to get global price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 한국어 감정분석
   * @param {string} text - 분석할 텍스트
   * @returns {Object} 감정분석 결과
   */
  analyzeKoreanSentiment(text) {
    try {
      if (!text || text.length < 5) {
        return { score: 50, sentiment: 'neutral', confidence: 0 };
      }

      const lowerText = text.toLowerCase();
      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;

      // 긍정 키워드 검사
      this.koreanSentimentKeywords.positive.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        positiveScore += matches * 2; // 긍정 키워드는 가중치 2
      });

      // 부정 키워드 검사
      this.koreanSentimentKeywords.negative.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        negativeScore += matches * 2; // 부정 키워드는 가중치 2
      });

      // 중립 키워드 검사
      this.koreanSentimentKeywords.neutral.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        neutralScore += matches;
      });

      const totalScore = positiveScore + negativeScore + neutralScore;
      
      if (totalScore === 0) {
        return { score: 50, sentiment: 'neutral', confidence: 0 };
      }

      // 감정 점수 계산 (0-100)
      const sentimentScore = ((positiveScore - negativeScore) / totalScore + 1) * 50;
      const confidence = Math.min(totalScore / 10, 1); // 최대 1.0

      let sentiment = 'neutral';
      if (sentimentScore > 60) sentiment = 'positive';
      else if (sentimentScore < 40) sentiment = 'negative';

      return {
        score: Math.max(0, Math.min(100, sentimentScore)),
        sentiment,
        confidence,
        breakdown: {
          positive: positiveScore,
          negative: negativeScore,
          neutral: neutralScore,
          total: totalScore
        }
      };
    } catch (error) {
      logger.error('Korean sentiment analysis failed:', error);
      return { score: 50, sentiment: 'neutral', confidence: 0 };
    }
  }

  /**
   * 다중 코인 김치프리미엄 분석
   * @param {Array} symbols - 코인 심볼 배열
   * @returns {Object} 다중 코인 김치프리미엄 데이터
   */
  async getMultipleKimchiPremiums(symbols) {
    try {
      logger.info(`Calculating Kimchi Premiums for ${symbols.length} coins`);
      
      const results = {};
      const promises = symbols.map(async (symbol) => {
        try {
          const premium = await this.calculateKimchiPremium(symbol);
          results[symbol] = premium;
        } catch (error) {
          logger.error(`Failed to calculate Kimchi Premium for ${symbol}:`, error);
          results[symbol] = null;
        }
      });

      await Promise.allSettled(promises);
      
      // 통계 계산
      const validPremiums = Object.values(results).filter(p => p !== null);
      const stats = this.calculateKimchiPremiumStats(validPremiums);
      
      return {
        premiums: results,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to calculate multiple Kimchi Premiums:', error);
      return null;
    }
  }

  /**
   * 김치프리미엄 통계 계산
   * @param {Array} premiums - 김치프리미엄 데이터 배열
   * @returns {Object} 통계 정보
   */
  calculateKimchiPremiumStats(premiums) {
    if (premiums.length === 0) {
      return {
        average: 0,
        median: 0,
        max: 0,
        min: 0,
        significantCount: 0,
        highCount: 0,
        extremeCount: 0
      };
    }

    const values = premiums.map(p => p.premium);
    const significant = premiums.filter(p => p.isSignificant).length;
    const high = premiums.filter(p => p.isHigh).length;
    const extreme = premiums.filter(p => p.isExtreme).length;

    return {
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
      max: Math.max(...values),
      min: Math.min(...values),
      significantCount: significant,
      highCount: high,
      extremeCount: extreme,
      totalCoins: premiums.length
    };
  }

  /**
   * 한국 시장 특화 신호 점수 계산
   * @param {string} symbol - 코인 심볼
   * @param {Object} baseSignal - 기본 신호 데이터
   * @returns {Object} 한국 시장 특화 신호
   */
  async calculateKoreanMarketSignal(symbol, baseSignal) {
    try {
      const kimchiPremium = await this.calculateKimchiPremium(symbol);
      if (!kimchiPremium) {
        return baseSignal;
      }

      // 김치프리미엄 기반 보정 점수 계산
      let koreanAdjustment = 0;
      
      if (kimchiPremium.isExtreme) {
        koreanAdjustment = kimchiPremium.premium > 0 ? 15 : -15; // 극심한 차이
      } else if (kimchiPremium.isHigh) {
        koreanAdjustment = kimchiPremium.premium > 0 ? 10 : -10; // 높은 차이
      } else if (kimchiPremium.isSignificant) {
        koreanAdjustment = kimchiPremium.premium > 0 ? 5 : -5; // 의미있는 차이
      }

      // 한국 시장 특화 신호 생성
      const koreanSignal = {
        ...baseSignal,
        koreanMarket: {
          kimchiPremium: kimchiPremium.premium,
          koreanPrice: kimchiPremium.koreanPrice,
          globalPrice: kimchiPremium.globalPrice,
          adjustment: koreanAdjustment,
          isSignificant: kimchiPremium.isSignificant,
          trend: kimchiPremium.trend
        },
        finalScore: Math.max(0, Math.min(100, baseSignal.finalScore + koreanAdjustment)),
        metadata: {
          ...baseSignal.metadata,
          koreanMarketData: kimchiPremium,
          lastUpdated: new Date()
        }
      };

      logger.success(`Korean market signal calculated for ${symbol}: ${koreanSignal.finalScore} (adjustment: ${koreanAdjustment})`);
      return koreanSignal;
    } catch (error) {
      logger.error(`Failed to calculate Korean market signal for ${symbol}:`, error);
      return baseSignal;
    }
  }

  /**
   * 연결 테스트
   * @returns {Object} 연결 상태
   */
  async testConnection() {
    try {
      const [upbitTest, bithumbTest] = await Promise.all([
        this.getUpbitPrice('BTC'),
        this.getBithumbPrice('BTC')
      ]);

      return {
        upbit: upbitTest !== null,
        bithumb: bithumbTest !== null,
        overall: upbitTest !== null || bithumbTest !== null
      };
    } catch (error) {
      logger.error('Korean market service connection test failed:', error);
      return { upbit: false, bithumb: false, overall: false };
    }
  }
}

module.exports = KoreanMarketService;
