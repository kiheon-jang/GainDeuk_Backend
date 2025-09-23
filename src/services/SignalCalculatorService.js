const logger = require('../utils/logger');
const CoinGeckoService = require('./CoinGeckoService');
const NewsService = require('./NewsService');
const WhaleService = require('./WhaleService');
const CacheService = require('./CacheService');
const SocialMediaService = require('./SocialMediaService');

class SignalCalculatorService {
  constructor() {
    this.coinGeckoService = new CoinGeckoService();
    this.newsService = new NewsService();
    this.whaleService = new WhaleService();
    this.cacheService = new CacheService();
    
    // 가중치 설정 (뉴스 분석 재활성화)
    this.weights = {
      price: 0.35,      // 가격 모멘텀
      volume: 0.25,     // 거래량
      market: 0.20,     // 시장 포지션
      sentiment: 0.15,  // 감정분석 (DB에서 빠르게 조회)
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
      const sentimentScore = await this.calculateSentimentScore(symbol); // DB에서 빠르게 조회
      const whaleScore = await this.calculateWhaleScore(symbol);

      // 가중 평균으로 최종 점수 계산
      const finalScore = this.calculateFinalScore({
        price: priceScore,
        volume: volumeScore,
        market: marketScore,
        sentiment: sentimentScore,
        whale: whaleScore
      });

      // 변동성 및 거래량 비율 계산
      const volatility = this.calculateVolatility(priceData);
      const volumeRatio = this.calculateVolumeRatio(priceData);
      
      // 새로운 전략 분류 로직 사용
      const strategy = this.determineStrategy(finalScore, volatility, volumeRatio);
      
      // 추천 액션 및 타임프레임 결정
      const recommendation = this.getRecommendation(finalScore);
      const timeframe = strategy.timeframe;
      const priority = strategy.priority;

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
        rank: 1, // 최소값 1로 설정
        currentPrice: priceData.current_price,
        marketCap: priceData.market_cap,
        metadata: {
          priceData: {
            change_1h: priceData.price_change_percentage_1h || 0,
            change_24h: priceData.price_change_percentage_24h || 0,
            change_7d: priceData.price_change_percentage_7d || 0,
            change_30d: priceData.price_change_percentage_30d || 0
          },
          volumeRatio: volumeRatio,
          volatility: volatility,
          whaleActivity: whaleScore,
          newsCount: 0, // 나중에 설정
          lastUpdated: new Date(),
          calculationTime: Date.now() - startTime,
          dataQuality: this.assessDataQuality(priceData),
          strategy: {
            determinedBy: 'score_volatility_volume',
            score: finalScore,
            volatility: volatility,
            volumeRatio: volumeRatio
          }
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

  // 감정분석 점수 계산 (뉴스 + 소셜미디어)
  async calculateSentimentScore(symbol) {
    try {
      const News = require('../models/News');
      
      // 1. 뉴스 감정분석 점수
      let newsSentiment = 50; // 기본값
      const stats = await News.getSentimentStats(symbol, 24);
      
      if (stats && stats.length > 0 && stats[0].totalNews > 0) {
        newsSentiment = stats[0].avgSentiment;
        logger.info(`News sentiment for ${symbol}: ${newsSentiment.toFixed(2)} (${stats[0].totalNews} articles)`);
      } else {
        logger.warning(`No news data found for ${symbol}, using default sentiment`);
      }
      
      // 2. 소셜미디어 감정분석 점수
      let socialSentiment = 50; // 기본값
      try {
        const socialData = SocialMediaService.getSocialData();
        logger.info(`Social data for ${symbol}:`, JSON.stringify(socialData, null, 2));
        
        if (socialData && socialData.twitter && socialData.telegram) {
          // 트위터와 텔레그램 데이터에서 감정분석 점수 추출
          const twitterSentiment = this.extractSentimentFromSocialData(socialData.twitter, symbol);
          const telegramSentiment = this.extractSentimentFromSocialData(socialData.telegram, symbol);
          
          logger.info(`Twitter sentiment for ${symbol}: ${twitterSentiment}, Telegram sentiment: ${telegramSentiment}`);
          
          // 소셜미디어 감정분석 평균 계산
          const socialScores = [twitterSentiment, telegramSentiment].filter(score => score !== 50);
          if (socialScores.length > 0) {
            socialSentiment = socialScores.reduce((sum, score) => sum + score, 0) / socialScores.length;
            logger.info(`Social sentiment for ${symbol}: ${socialSentiment.toFixed(2)} (${socialScores.length} sources)`);
          } else {
            logger.info(`No valid social sentiment scores for ${symbol}, using default 50`);
          }
        } else {
          logger.info(`No social data available for ${symbol}`);
        }
      } catch (error) {
        logger.warning(`Social sentiment calculation failed for ${symbol}:`, error.message);
      }
      
      // 3. 뉴스와 소셜미디어 가중 평균 (뉴스 70%, 소셜미디어 30%)
      const finalSentiment = (newsSentiment * 0.7) + (socialSentiment * 0.3);
      
      logger.info(`Combined sentiment for ${symbol}: ${finalSentiment.toFixed(2)} (News: ${newsSentiment.toFixed(2)}, Social: ${socialSentiment.toFixed(2)})`);
      return Math.round(finalSentiment);
      
    } catch (error) {
      logger.warning(`Sentiment score calculation failed for ${symbol}:`, error.message);
      return 50; // 기본값 반환
    }
  }
  
  // 소셜미디어 데이터에서 감정분석 점수 추출
  extractSentimentFromSocialData(socialData, symbol) {
    try {
      if (!socialData || !socialData.data || socialData.data.length === 0) {
        return 50; // 기본값
      }
      
      // 해당 심볼과 관련된 데이터 필터링
      const relevantData = socialData.data.filter(item => {
        const text = (item.text || item.content || '').toLowerCase();
        return text.includes(symbol.toLowerCase()) || 
               text.includes('crypto') || 
               text.includes('bitcoin') || 
               text.includes('ethereum');
      });
      
      if (relevantData.length === 0) {
        return 50; // 기본값
      }
      
      // 감정분석 점수 추출 및 평균 계산
      const sentimentScores = relevantData
        .map(item => {
          // sentiment가 문자열인 경우 점수로 변환
          if (typeof item.sentiment === 'string') {
            switch (item.sentiment.toLowerCase()) {
              case 'positive': return 75;
              case 'negative': return 25;
              case 'neutral': return 50;
              default: return 50;
            }
          }
          // sentiment가 객체인 경우 score 사용
          return item.sentiment?.score || 50;
        })
        .filter(score => score !== 50);
      
      if (sentimentScores.length === 0) {
        return 50; // 기본값
      }
      
      return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
      
    } catch (error) {
      logger.warning(`Social sentiment extraction failed for ${symbol}:`, error.message);
      return 50; // 기본값
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

  // 변동성 계산 (가격 변화율의 표준편차 근사)
  calculateVolatility(priceData) {
    try {
      const changes = [
        priceData.price_change_percentage_1h || 0,
        priceData.price_change_percentage_24h || 0,
        priceData.price_change_percentage_7d || 0,
        priceData.price_change_percentage_30d || 0
      ];
      
      // 절댓값으로 변동성 계산
      const absChanges = changes.map(change => Math.abs(change));
      const avgChange = absChanges.reduce((sum, change) => sum + change, 0) / absChanges.length;
      
      return avgChange;
    } catch (error) {
      logger.error('Volatility calculation failed:', error);
      return 10; // 기본값
    }
  }

  // 점수 기반 전략 분류 로직
  determineStrategy(score, volatility, volumeRatio) {
    try {
      // SCALPING: 점수 80+ 이고 변동성 낮음 (10% 미만)
      if (score >= 80 && volatility < 10) {
        return {
          timeframe: "SCALPING",
          action: "BUY", 
          priority: "high_priority"
        };
      } 
      // DAY_TRADING: 점수 70-79 이고 변동성 중간 (20% 미만)
      else if (score >= 70 && volatility < 20) {
        return {
          timeframe: "DAY_TRADING",
          action: score > 75 ? "BUY" : "HOLD",
          priority: "medium_priority"
        };
      } 
      // SWING_TRADING: 점수 60-69
      else if (score >= 60) {
        return {
          timeframe: "SWING_TRADING", 
          action: volatility > 15 ? "SELL" : "BUY",
          priority: "medium_priority"
        };
      } 
      // LONG_TERM: 점수 60 미만
      else {
        return {
          timeframe: "LONG_TERM",
          action: "HOLD",
          priority: "low_priority"
        };
      }
    } catch (error) {
      logger.error('Strategy determination failed:', error);
      return {
        timeframe: "LONG_TERM",
        action: "HOLD",
        priority: "low_priority"
      };
    }
  }

  // 기존 타임프레임 결정 메서드 (하위 호환성 유지)
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

  // 전략별 신호 필터링
  filterSignalsByStrategy(signals, strategy) {
    return signals.filter(signal => signal.timeframe === strategy);
  }

  // 점수 범위별 전략 분류
  classifySignalsByStrategy(signals) {
    const classified = {
      SCALPING: [],
      DAY_TRADING: [],
      SWING_TRADING: [],
      LONG_TERM: []
    };

    signals.forEach(signal => {
      if (classified[signal.timeframe]) {
        classified[signal.timeframe].push(signal);
      }
    });

    return classified;
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
        lowPriority: 0,
        avgVolatility: 0,
        avgVolumeRatio: 0
      };

      if (signals.length === 0) return stats;

      let totalScore = 0;
      let totalVolatility = 0;
      let totalVolumeRatio = 0;
      
      signals.forEach(signal => {
        totalScore += signal.finalScore;
        totalVolatility += signal.metadata?.volatility || 0;
        totalVolumeRatio += signal.metadata?.volumeRatio || 0;
        
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
      stats.avgVolatility = Math.round((totalVolatility / signals.length) * 100) / 100;
      stats.avgVolumeRatio = Math.round((totalVolumeRatio / signals.length) * 100) / 100;
      
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
