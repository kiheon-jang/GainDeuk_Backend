const logger = require('../utils/logger');
const CoinGeckoService = require('./CoinGeckoService');
const NewsService = require('./NewsService');
const WhaleService = require('./WhaleService');
const CacheService = require('./CacheService');

class SignalCalculatorService {
  constructor() {
    this.coinGeckoService = new CoinGeckoService();
    this.newsService = new NewsService();
    this.whaleService = new WhaleService();
    this.cacheService = new CacheService();
    
    // 가중치 설정
    this.weights = {
      price: 0.35,      // 가격 모멘텀
      volume: 0.25,     // 거래량
      market: 0.20,     // 시장 포지션
      sentiment: 0.15,  // 감정분석
      whale: 0.05       // 고래 활동
    };

    // 점수 계산 임계값
    this.thresholds = {
      price: {
        strong: 0.15,    // 15% 이상 변화
        moderate: 0.05,  // 5% 이상 변화
        weak: 0.02       // 2% 이상 변화
      },
      volume: {
        spike: 3.0,      // 3배 이상 증가
        high: 2.0,       // 2배 이상 증가
        normal: 1.0      // 정상
      },
      market: {
        top10: 90,       // 상위 10위
        top50: 80,       // 상위 50위
        top100: 70,      // 상위 100위
        top500: 50       // 상위 500위
      }
    };
  }

  // 메인 신호 계산 메서드
  async calculateSignal(coinId, symbol, name, priceData) {
    try {
      const startTime = Date.now();
      
      logger.info(`Calculating signal for ${symbol} (${coinId})`);

      // 각 구성 요소 점수 계산
      const priceScore = this.calculatePriceScore(priceData);
      const volumeScore = this.calculateVolumeScore(priceData);
      const marketScore = this.calculateMarketScore(priceData);
      const sentimentScore = await this.calculateSentimentScore(symbol);
      const whaleScore = await this.calculateWhaleScore(symbol);

      // 가중 평균으로 최종 점수 계산
      const finalScore = this.calculateFinalScore({
        price: priceScore,
        volume: volumeScore,
        market: marketScore,
        sentiment: sentimentScore,
        whale: whaleScore
      });

      // 추천 액션 및 타임프레임 결정
      const recommendation = this.getRecommendation(finalScore);
      const timeframe = this.getTimeframe(finalScore);
      const priority = this.getPriority(finalScore, priceData);

      const signal = {
        coinId,
        symbol: symbol.toUpperCase(),
        name,
        finalScore: Math.round(finalScore),
        breakdown: {
          price: Math.round(priceScore),
          volume: Math.round(volumeScore),
          market: Math.round(marketScore),
          sentiment: Math.round(sentimentScore),
          whale: Math.round(whaleScore)
        },
        recommendation,
        timeframe,
        priority,
        rank: 0, // 나중에 설정
        currentPrice: priceData.current_price,
        marketCap: priceData.market_cap,
        metadata: {
          priceData: {
            change_1h: priceData.price_change_percentage_1h || 0,
            change_24h: priceData.price_change_percentage_24h || 0,
            change_7d: priceData.price_change_percentage_7d || 0,
            change_30d: priceData.price_change_percentage_30d || 0
          },
          volumeRatio: this.calculateVolumeRatio(priceData),
          whaleActivity: whaleScore,
          newsCount: 0, // 나중에 설정
          lastUpdated: new Date(),
          calculationTime: Date.now() - startTime,
          dataQuality: this.assessDataQuality(priceData)
        }
      };

      logger.success(`Signal calculated for ${symbol}: ${finalScore.toFixed(2)} (${recommendation.action})`);
      return signal;
    } catch (error) {
      logger.error(`Failed to calculate signal for ${symbol}:`, error);
      throw error;
    }
  }

  // 가격 모멘텀 점수 계산
  calculatePriceScore(priceData) {
    try {
      const changes = {
        '1h': priceData.price_change_percentage_1h || 0,
        '24h': priceData.price_change_percentage_24h || 0,
        '7d': priceData.price_change_percentage_7d || 0,
        '30d': priceData.price_change_percentage_30d || 0
      };

      let score = 50; // 기본값

      // 1시간 변화 (가중치 0.3)
      if (Math.abs(changes['1h']) > this.thresholds.price.strong) {
        score += changes['1h'] > 0 ? 15 : -15;
      } else if (Math.abs(changes['1h']) > this.thresholds.price.moderate) {
        score += changes['1h'] > 0 ? 10 : -10;
      } else if (Math.abs(changes['1h']) > this.thresholds.price.weak) {
        score += changes['1h'] > 0 ? 5 : -5;
      }

      // 24시간 변화 (가중치 0.4)
      if (Math.abs(changes['24h']) > this.thresholds.price.strong) {
        score += changes['24h'] > 0 ? 20 : -20;
      } else if (Math.abs(changes['24h']) > this.thresholds.price.moderate) {
        score += changes['24h'] > 0 ? 15 : -15;
      } else if (Math.abs(changes['24h']) > this.thresholds.price.weak) {
        score += changes['24h'] > 0 ? 8 : -8;
      }

      // 7일 변화 (가중치 0.2)
      if (Math.abs(changes['7d']) > this.thresholds.price.strong) {
        score += changes['7d'] > 0 ? 10 : -10;
      } else if (Math.abs(changes['7d']) > this.thresholds.price.moderate) {
        score += changes['7d'] > 0 ? 7 : -7;
      } else if (Math.abs(changes['7d']) > this.thresholds.price.weak) {
        score += changes['7d'] > 0 ? 3 : -3;
      }

      // 30일 변화 (가중치 0.1)
      if (Math.abs(changes['30d']) > this.thresholds.price.strong) {
        score += changes['30d'] > 0 ? 5 : -5;
      } else if (Math.abs(changes['30d']) > this.thresholds.price.moderate) {
        score += changes['30d'] > 0 ? 3 : -3;
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Price score calculation failed:', error);
      return 50;
    }
  }

  // 거래량 점수 계산
  calculateVolumeScore(priceData) {
    try {
      const volumeRatio = this.calculateVolumeRatio(priceData);
      let score = 50; // 기본값

      if (volumeRatio >= this.thresholds.volume.spike) {
        score = 90; // 거래량 급증
      } else if (volumeRatio >= this.thresholds.volume.high) {
        score = 75; // 거래량 높음
      } else if (volumeRatio >= this.thresholds.volume.normal) {
        score = 60; // 정상 거래량
      } else {
        score = 30; // 거래량 부족
      }

      // 거래량 증가 추세 확인
      const volumeChange24h = priceData.total_volume_change_24h || 0;
      if (volumeChange24h > 0) {
        score += Math.min(10, volumeChange24h / 100);
      } else {
        score -= Math.min(10, Math.abs(volumeChange24h) / 100);
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Volume score calculation failed:', error);
      return 50;
    }
  }

  // 거래량 비율 계산
  calculateVolumeRatio(priceData) {
    try {
      const marketCap = priceData.market_cap || 0;
      const totalVolume = priceData.total_volume || 0;
      
      if (marketCap === 0) return 0;
      
      return totalVolume / marketCap;
    } catch (error) {
      logger.error('Volume ratio calculation failed:', error);
      return 0;
    }
  }

  // 시장 포지션 점수 계산
  calculateMarketScore(priceData) {
    try {
      const marketCapRank = priceData.market_cap_rank || 999999;
      let score = 50; // 기본값

      if (marketCapRank <= 10) {
        score = this.thresholds.market.top10;
      } else if (marketCapRank <= 50) {
        score = this.thresholds.market.top50;
      } else if (marketCapRank <= 100) {
        score = this.thresholds.market.top100;
      } else if (marketCapRank <= 500) {
        score = this.thresholds.market.top500;
      } else {
        score = 30; // 하위 코인
      }

      // 시가총액 변화율 고려
      const marketCapChange24h = priceData.market_cap_change_percentage_24h || 0;
      if (marketCapChange24h > 0) {
        score += Math.min(10, marketCapChange24h);
      } else {
        score -= Math.min(10, Math.abs(marketCapChange24h));
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Market score calculation failed:', error);
      return 50;
    }
  }

  // 감정분석 점수 계산
  async calculateSentimentScore(symbol) {
    try {
      const sentiment = await this.newsService.getCoinSentiment(symbol);
      
      if (typeof sentiment === 'number') {
        return sentiment;
      }
      
      return sentiment.score || 50;
    } catch (error) {
      logger.error(`Sentiment score calculation failed for ${symbol}:`, error);
      return 50;
    }
  }

  // 고래 활동 점수 계산
  async calculateWhaleScore(symbol) {
    try {
      return await this.whaleService.getWhaleActivityScore(symbol);
    } catch (error) {
      logger.error(`Whale score calculation failed for ${symbol}:`, error);
      return 50;
    }
  }

  // 최종 점수 계산
  calculateFinalScore(scores) {
    const finalScore = 
      scores.price * this.weights.price +
      scores.volume * this.weights.volume +
      scores.market * this.weights.market +
      scores.sentiment * this.weights.sentiment +
      scores.whale * this.weights.whale;

    return Math.max(0, Math.min(100, finalScore));
  }

  // 추천 액션 결정
  getRecommendation(score) {
    if (score >= 85) {
      return { action: 'STRONG_BUY', confidence: 'HIGH' };
    } else if (score >= 75) {
      return { action: 'BUY', confidence: 'HIGH' };
    } else if (score >= 65) {
      return { action: 'BUY', confidence: 'MEDIUM' };
    } else if (score >= 55) {
      return { action: 'HOLD', confidence: 'MEDIUM' };
    } else if (score >= 45) {
      return { action: 'HOLD', confidence: 'LOW' };
    } else if (score >= 35) {
      return { action: 'WEAK_SELL', confidence: 'MEDIUM' };
    } else if (score >= 25) {
      return { action: 'SELL', confidence: 'MEDIUM' };
    } else {
      return { action: 'STRONG_SELL', confidence: 'HIGH' };
    }
  }

  // 타임프레임 결정
  getTimeframe(score) {
    if (score >= 90 || score <= 10) {
      return 'SCALPING'; // 매우 강한 신호
    } else if (score >= 80 || score <= 20) {
      return 'DAY_TRADING'; // 강한 신호
    } else if (score >= 70 || score <= 30) {
      return 'SWING_TRADING'; // 중간 신호
    } else {
      return 'LONG_TERM'; // 약한 신호
    }
  }

  // 우선순위 결정
  getPriority(score, priceData) {
    const marketCapRank = priceData.market_cap_rank || 999999;
    const volumeRatio = this.calculateVolumeRatio(priceData);
    
    // 상위 100위 이내이고 강한 신호
    if (marketCapRank <= 100 && (score >= 80 || score <= 20)) {
      return 'high_priority';
    }
    
    // 상위 500위 이내이고 중간 이상 신호
    if (marketCapRank <= 500 && (score >= 70 || score <= 30)) {
      return 'medium_priority';
    }
    
    // 거래량이 높은 경우
    if (volumeRatio >= this.thresholds.volume.high) {
      return 'medium_priority';
    }
    
    return 'low_priority';
  }

  // 데이터 품질 평가
  assessDataQuality(priceData) {
    let quality = 'good';
    
    // 필수 데이터 확인
    const requiredFields = ['current_price', 'market_cap', 'total_volume'];
    const missingFields = requiredFields.filter(field => !priceData[field]);
    
    if (missingFields.length > 0) {
      quality = 'poor';
    } else if (priceData.price_change_percentage_24h === null || 
               priceData.price_change_percentage_24h === undefined) {
      quality = 'fair';
    }
    
    // 가격 데이터 유효성 확인
    if (priceData.current_price <= 0 || priceData.market_cap <= 0) {
      quality = 'poor';
    }
    
    return quality;
  }

  // 배치 신호 계산
  async calculateBatchSignals(coinsData) {
    try {
      logger.info(`Calculating signals for ${coinsData.length} coins`);
      
      const signals = [];
      const batchSize = 10;
      
      for (let i = 0; i < coinsData.length; i += batchSize) {
        const batch = coinsData.slice(i, i + batchSize);
        const batchPromises = batch.map(coin => 
          this.calculateSignal(coin.id, coin.symbol, coin.name, coin)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            signals.push(result.value);
          } else {
            logger.error(`Failed to calculate signal for ${batch[index].symbol}:`, result.reason);
          }
        });
        
        // 배치 간 지연
        await this.sleep(100);
      }
      
      // 점수순으로 정렬
      signals.sort((a, b) => b.finalScore - a.finalScore);
      
      // 순위 설정
      signals.forEach((signal, index) => {
        signal.rank = index + 1;
      });
      
      logger.success(`Calculated ${signals.length} signals successfully`);
      return signals;
    } catch (error) {
      logger.error('Batch signal calculation failed:', error);
      throw error;
    }
  }

  // 강한 신호 필터링
  filterStrongSignals(signals, minScore = 80) {
    return signals.filter(signal => 
      signal.finalScore >= minScore || signal.finalScore <= (100 - minScore)
    );
  }

  // 신호 통계 생성
  generateSignalStats(signals) {
    try {
      const stats = {
        total: signals.length,
        avgScore: 0,
        strongBuy: 0,
        buy: 0,
        hold: 0,
        sell: 0,
        strongSell: 0,
        scalping: 0,
        dayTrading: 0,
        swingTrading: 0,
        longTerm: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };

      if (signals.length === 0) return stats;

      let totalScore = 0;
      
      signals.forEach(signal => {
        totalScore += signal.finalScore;
        
        // 추천 액션별 카운트
        switch (signal.recommendation.action) {
          case 'STRONG_BUY': stats.strongBuy++; break;
          case 'BUY': stats.buy++; break;
          case 'HOLD': stats.hold++; break;
          case 'WEAK_SELL': stats.sell++; break;
          case 'SELL': stats.sell++; break;
          case 'STRONG_SELL': stats.strongSell++; break;
        }
        
        // 타임프레임별 카운트
        switch (signal.timeframe) {
          case 'SCALPING': stats.scalping++; break;
          case 'DAY_TRADING': stats.dayTrading++; break;
          case 'SWING_TRADING': stats.swingTrading++; break;
          case 'LONG_TERM': stats.longTerm++; break;
        }
        
        // 우선순위별 카운트
        switch (signal.priority) {
          case 'high_priority': stats.highPriority++; break;
          case 'medium_priority': stats.mediumPriority++; break;
          case 'low_priority': stats.lowPriority++; break;
        }
      });

      stats.avgScore = Math.round(totalScore / signals.length);
      
      return stats;
    } catch (error) {
      logger.error('Signal stats generation failed:', error);
      return null;
    }
  }

  // 유틸리티 메서드
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 가중치 업데이트
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    logger.info('Signal calculation weights updated:', this.weights);
  }

  // 임계값 업데이트
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Signal calculation thresholds updated:', this.thresholds);
  }
}

module.exports = SignalCalculatorService;
