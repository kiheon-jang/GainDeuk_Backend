const logger = require('../utils/logger');
const CoinGeckoService = require('./CoinGeckoService');
const NewsService = require('./NewsService');
const WhaleService = require('./WhaleService');
const CacheService = require('./CacheService');
const SocialMediaService = require('./SocialMediaService');
const TradingStrategyService = require('../strategies/TradingStrategyService');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');

class SignalCalculatorService {
  constructor() {
    this.coinGeckoService = new CoinGeckoService();
    this.newsService = new NewsService();
    this.whaleService = new WhaleService();
    this.cacheService = new CacheService();
    this.tradingStrategyService = new TradingStrategyService();
    this.technicalAnalysisService = new TechnicalAnalysisService();
    
      // 동적 가중치 시스템 (시장 상황별 조정)
      this.baseWeights = {
        price: 0.40,      // 기본 가격 모멘텀
        volume: 0.30,     // 기본 거래량
        market: 0.15,     // 기본 시장 포지션
        sentiment: 0.10,  // 기본 감정분석
        whale: 0.05       // 기본 고래 활동
      };
      
      // 시장 상황별 가중치 조정
      this.marketConditionWeights = {
        volatile: {      // 불안정한 시장
          price: 0.25, volume: 0.15, market: 0.10, sentiment: 0.10, whale: 0.05,
          volatility: 0.30, correlation: 0.10, macro: 0.05  // 상관관계 및 거시경제 가중치 추가
        },
        stable: {        // 안정한 시장
          price: 0.40, volume: 0.15, market: 0.10, sentiment: 0.10, whale: 0.05,
          volatility: 0.10, correlation: 0.10, macro: 0.10
        },
        lowLiquidity: {  // 저유동성 시장
          price: 0.25, volume: 0.25, market: 0.15, sentiment: 0.10, whale: 0.05,
          volatility: 0.10, correlation: 0.05, macro: 0.05
        },
        normal: { // 기본값
          price: 0.30, volume: 0.25, market: 0.15, sentiment: 0.10, whale: 0.05,
          volatility: 0.05, correlation: 0.10, macro: 0.05 // 상관관계 및 거시경제 가중치 추가
        }
      };

    // 점수 계산 임계값 (백테스팅 기반 동적 조정)
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
    
    // 백테스팅 성과 추적 (변동성 기반 전략 고려)
    this.performanceMetrics = {
      scalping: { target: 0.70, current: 0.0, samples: 0 },      // 스캘핑: 높은 성공률 목표
      dayTrading: { target: 0.65, current: 0.0, samples: 0 },   // 데이트레이딩: 중고 성공률 목표
      swingTrading: { target: 0.60, current: 0.0, samples: 0 }, // 스윙: 중간 성공률 목표
      longTerm: { target: 0.55, current: 0.0, samples: 0 }      // 장기: 중간 성공률 목표
    };
    
      // 동적 임계값 조정 계수 (최적화된 균형잡힌 임계값)
      this.dynamicThresholds = {
        scalping: { score: 55, risk: 80, liquidity: 'B+' },  // 스캘핑: 55점 이상 + 리스크 80 이하 + B+급 유동성
        dayTrading: { score: 40, risk: 85, liquidity: 'B' }, // 데이트레이딩: 40점 이상 + 리스크 85 이하 + B급 유동성
        swingTrading: { score: 30, risk: 90, liquidity: 'C+' }, // 스윙: 30점 이상 + 리스크 90 이하 + C+급 유동성
        longTerm: { score: 20, risk: 95, liquidity: 'C' }   // 장기: 20점 이상 + 리스크 95 이하 + C급 유동성
      };
    
    // 상관관계 분석 데이터
    this.correlationData = {
      btcCorrelation: 0.0,      // BTC와의 상관관계
      altcoinSeason: false,     // 알트시즌 여부
      marketDominance: 0.0,     // BTC 시장 지배율
      fearGreedIndex: 50,       // 공포탐욕지수
      lastUpdated: null
    };
    
    // 거시경제 이벤트 데이터
    this.macroEvents = {
      fedMeeting: false,        // Fed 회의
      cpiRelease: false,        // CPI 발표
      nfpRelease: false,        // 비농업 고용지표
      gdpRelease: false,        // GDP 발표
      highImpactEvents: []      // 고위험 이벤트 목록
    };
    
    // 백테스팅 데이터
    this.backtestData = {
      historicalSignals: [],
      performanceMetrics: {
        totalSignals: 0,
        successfulSignals: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0
      },
      lastBacktestDate: null
    };
  }

  // 메인 신호 계산 메서드
  async calculateSignal(coinId, symbol, name, priceData) {
    try {
      const startTime = Date.now();
      
      logger.info(`Calculating signal for ${symbol} (${coinId})`);

      // 시장 상황 감지 및 가중치 결정
      const marketCondition = this.detectMarketCondition(priceData);
      const weights = this.getDynamicWeights(marketCondition);
      
      // 상관관계 분석
      const btcCorrelation = await this.analyzeBTCCorrelation(symbol, priceData);
      const altcoinSeason = this.calculateAltcoinSeason(priceData.market_cap_rank || 999999, priceData.price_change_percentage_24h || 0);
      const marketDominance = await this.analyzeMarketDominance();
      const fearGreedIndex = await this.analyzeFearGreedIndex();
      
      // 거시경제 이벤트 분석
      const macroEvents = await this.analyzeMacroEvents();

      // 각 구성 요소 점수 계산
      const priceScore = this.calculatePriceScore(priceData);
      const volumeScore = this.calculateVolumeScore(priceData);
      const marketScore = this.calculateMarketScore(priceData);
      const sentimentScore = await this.calculateSentimentScore(symbol); // DB에서 빠르게 조회
      const whaleScore = await this.calculateWhaleScore(symbol);
      const volatilityScore = this.calculateVolatilityScore(priceData);
      
      // 상관관계 보정 점수 계산
      const correlationScore = this.calculateCorrelationScore(btcCorrelation, altcoinSeason, marketDominance, fearGreedIndex);
      
      // 거시경제 이벤트 보정 점수 계산
      const macroScore = this.calculateMacroScore(macroEvents);

      // 동적 가중치로 최종 점수 계산
      const finalScore = this.calculateFinalScoreWithDynamicWeights({
        price: priceScore,
        volume: volumeScore,
        market: marketScore,
        sentiment: sentimentScore,
        whale: whaleScore,
        volatility: volatilityScore, // 변동성 점수 추가
        correlation: correlationScore, // 상관관계 보정 점수 추가
        macro: macroScore // 거시경제 보정 점수 추가
      }, weights);

      // 변동성 및 거래량 비율 계산
      const volatility = this.calculateVolatility(priceData);
      const volumeRatio = this.calculateVolumeRatio(priceData);
      
      // 새로운 전략 분류 로직 사용 (priceData 포함)
      const strategy = await this.determineStrategy(finalScore, volatility, volumeRatio, priceData);
      
      // 디버깅을 위한 로그 추가
      logger.info(`Strategy determination for ${symbol}: finalScore=${finalScore}, volatility=${volatility}, volumeRatio=${volumeRatio}, timeframe=${strategy.timeframe}`);
      
      // 전략 시스템을 통한 거래 전략 분석
      const signalData = {
        finalScore,
        volatility,
        volumeRatio,
        technicalStrength: strategy.technicalStrength || 0.5,
        riskScore: strategy.riskScore || 50,
        liquidityGrade: strategy.liquidityGrade || 'C',
        timeframe: strategy.timeframe,
        breakdown: {
          price: priceScore,
          volume: volumeScore,
          market: marketScore,
          sentiment: sentimentScore,
          whale: whaleScore,
          volatility: volatilityScore,
          correlation: correlationScore,
          macro: macroScore
        }
      };
      
      const marketData = {
        currentPrice: priceData.current_price,
        volume: priceData.total_volume,
        spread: 0.1, // 기본 스프레드
        volatility: volatility,
        support: null, // 나중에 계산
        resistance: null, // 나중에 계산
        trend: null, // 나중에 계산
        rsi: null, // 나중에 계산
        macd: null, // 나중에 계산
        bollinger: null, // 나중에 계산
        movingAverages: null, // 나중에 계산
        liquidityGrade: strategy.liquidityGrade || 'C'
      };
      
      const accountData = {
        balance: 10000, // 기본 계정 잔고
        riskTolerance: 0.5,
        currentPositions: []
      };
      
      // 거래 전략 실행
      let tradingStrategy;
      try {
        logger.info(`Executing trading strategy for ${symbol}: ${strategy.timeframe}`);
        tradingStrategy = this.tradingStrategyService.executeTradingStrategy(
          signalData, 
          marketData, 
          accountData
        );
        logger.info(`Trading strategy executed successfully for ${symbol}:`, JSON.stringify(tradingStrategy, null, 2));
      } catch (error) {
        logger.error(`Trading strategy execution failed for ${symbol}:`, error);
        tradingStrategy = {
          strategy: strategy.timeframe,
          timeframe: strategy.timeframe,
          shouldExecute: false,
          error: error.message
        };
      }
      
      // 디버깅: tradingStrategy 변수 확인
      logger.info(`Trading strategy for ${symbol}:`, JSON.stringify(tradingStrategy, null, 2));
      
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
          whale: Math.round(whaleScore),
          volatility: Math.round(volatilityScore), // 변동성 점수 추가
          correlation: Math.round(correlationScore), // 상관관계 보정 점수 추가
          macro: Math.round(macroScore) // 거시경제 보정 점수 추가
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
          // 상관관계 분석 데이터
          correlation: {
            btcCorrelation: btcCorrelation,
            altcoinSeason: altcoinSeason,
            marketDominance: marketDominance,
            fearGreedIndex: fearGreedIndex
          },
          // 거시경제 이벤트 데이터
          macroEvents: macroEvents,
          // 전략 시스템 정보 (통합된 버전)
          strategy: {
            determinedBy: 'score_volatility_volume',
            timeframe: strategy.timeframe,
            score: finalScore,
            volatility: volatility,
            volumeRatio: volumeRatio,
            riskScore: strategy.riskScore || 50,
            liquidityGrade: strategy.liquidityGrade || 'C',
            technicalStrength: strategy.technicalStrength || 0.5,
            tradingStrategy: tradingStrategy || {
              strategy: strategy.timeframe,
              timeframe: strategy.timeframe,
              shouldExecute: false,
              error: 'Strategy execution failed'
            }
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

  // 가격 모멘텀 점수 계산 (더 극단적인 점수 생성)
  calculatePriceScore(priceData) {
    try {
      const changes = {
        '1h': priceData.price_change_percentage_1h || 0,
        '24h': priceData.price_change_percentage_24h || 0,
        '7d': priceData.price_change_percentage_7d || 0,
        '30d': priceData.price_change_percentage_30d || 0
      };

      let score = 50; // 기본값

      // 1시간 변화 (가중치 0.4) - 더 극단적인 점수
      if (Math.abs(changes['1h']) > this.thresholds.price.strong) {
        score += changes['1h'] > 0 ? 25 : -25; // 15 → 25
      } else if (Math.abs(changes['1h']) > this.thresholds.price.moderate) {
        score += changes['1h'] > 0 ? 15 : -15; // 10 → 15
      } else if (Math.abs(changes['1h']) > this.thresholds.price.weak) {
        score += changes['1h'] > 0 ? 8 : -8; // 5 → 8
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

  // 거래량 점수 계산 (더 극단적인 점수 생성)
  calculateVolumeScore(priceData) {
    try {
      const volumeRatio = this.calculateVolumeRatio(priceData);
      let score = 50; // 기본값

      if (volumeRatio >= this.thresholds.volume.spike) {
        score = 95; // 거래량 급증 (90 → 95)
      } else if (volumeRatio >= this.thresholds.volume.high) {
        score = 80; // 거래량 높음 (75 → 80)
      } else if (volumeRatio >= this.thresholds.volume.normal) {
        score = 65; // 정상 거래량 (60 → 65)
      } else {
        score = 20; // 거래량 부족 (30 → 20)
      }

      // 거래량 증가 추세 확인 (더 극단적인 보정)
      const volumeChange24h = priceData.total_volume_change_24h || 0;
      if (volumeChange24h > 0) {
        score += Math.min(15, volumeChange24h / 50); // 10 → 15, 100 → 50
      } else {
        score -= Math.min(15, Math.abs(volumeChange24h) / 50); // 10 → 15, 100 → 50
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
        // Social Media Service에서 실제 데이터 가져오기
        const socialData = await this.getSocialMediaSentiment(symbol);
        if (socialData && socialData.length > 0) {
          // 소셜미디어 감정분석 평균 계산
          const socialScores = socialData.filter(score => score !== 50);
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
  
  // 소셜미디어 감정분석 데이터 가져오기
  async getSocialMediaSentiment(symbol) {
    try {
      const SocialMediaService = require('./SocialMediaService');
      const socialData = SocialMediaService.getSocialData();
      
      if (!socialData || (!socialData.twitter && !socialData.telegram)) {
        return [];
      }

      const sentimentScores = [];
      
      // Twitter 데이터 처리
      if (socialData.twitter && socialData.twitter.data) {
        const twitterSentiment = this.extractSentimentFromSocialData(socialData.twitter, symbol);
        if (twitterSentiment !== 50) {
          sentimentScores.push(twitterSentiment);
        }
      }
      
      // Telegram 데이터 처리
      if (socialData.telegram && socialData.telegram.data) {
        const telegramSentiment = this.extractSentimentFromSocialData(socialData.telegram, symbol);
        if (telegramSentiment !== 50) {
          sentimentScores.push(telegramSentiment);
        }
      }
      
      return sentimentScores;
    } catch (error) {
      logger.error(`Failed to get social media sentiment for ${symbol}:`, error);
      return [];
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

  // 시장 상황 감지
  detectMarketCondition(priceData) {
    try {
      const volatility = Math.abs(priceData.price_change_percentage_24h || 0);
      const volumeRatio = this.calculateVolumeRatio(priceData);
      const marketCapRank = priceData.market_cap_rank || 999999;
      
      // 변동성 기준
      const isVolatile = volatility > 20;
      const isStable = volatility < 5;
      
      // 거래량 기준
      const isLowLiquidity = volumeRatio < 0.5 || marketCapRank > 1000;
      
      if (isVolatile) {
        return 'volatile';
      } else if (isLowLiquidity) {
        return 'lowLiquidity';
      } else if (isStable) {
        return 'stable';
      } else {
        return 'normal';
      }
    } catch (error) {
      logger.error('Market condition detection failed:', error);
      return 'normal';
    }
  }
  
  // 동적 가중치 결정
  getDynamicWeights(marketCondition) {
    if (this.marketConditionWeights[marketCondition]) {
      return this.marketConditionWeights[marketCondition];
    }
    return this.baseWeights;
  }
  
  // 변동성 점수 계산 (ATR 기반)
  calculateVolatilityScore(priceData) {
    try {
      const volatility = Math.abs(priceData.price_change_percentage_24h || 0);
      
      // ATR 기반 변동성 등급 분류
      if (volatility > 25) return 100;      // 초고변동성
      if (volatility > 15) return 80;       // 고변동성
      if (volatility > 5) return 60;        // 중변동성
      return 40;                            // 저변동성
    } catch (error) {
      logger.error('Volatility score calculation failed:', error);
      return 50;
    }
  }
  
  // 동적 가중치로 최종 점수 계산
  calculateFinalScoreWithDynamicWeights(scores, weights) {
    try {
      let finalScore = 0;
      
      // 기본 점수들
      finalScore += scores.price * weights.price;
      finalScore += scores.volume * weights.volume;
      finalScore += scores.market * weights.market;
      finalScore += scores.sentiment * weights.sentiment;
      finalScore += scores.whale * weights.whale;
      
      // 변동성 점수 (시장 상황에 따라)
      if (weights.volatility) {
        finalScore += scores.volatility * weights.volatility;
      }
      
      // 상관관계 보정 점수
      if (weights.correlation) {
        finalScore += scores.correlation * weights.correlation;
      }
      
      // 거시경제 보정 점수
      if (weights.macro) {
        finalScore += scores.macro * weights.macro;
      }
      
      // 시장 상황 보정 계수
      const marketCorrectionFactor = this.getMarketCorrectionFactor();
      finalScore *= marketCorrectionFactor;
      
      // 모멘텀 지속성 계수
      const momentumPersistenceFactor = this.getMomentumPersistenceFactor(scores);
      finalScore *= momentumPersistenceFactor;
      
      return Math.max(0, Math.min(100, finalScore));
    } catch (error) {
      logger.error('Dynamic final score calculation failed:', error);
      return 50;
    }
  }
  
  // 시장 상황 보정 계수
  getMarketCorrectionFactor() {
    const hour = new Date().getHours();
    
    // 글로벌 시간대 보정
    if (hour >= 9 && hour <= 18) {
      return 0.9;  // 아시아 시간대: -10%
    } else if (hour >= 17 || hour <= 2) {
      return 1.15; // 유럽 오픈: +15%
    } else if (hour >= 23 || hour <= 6) {
      return 1.2;  // 미국 오픈: +20%
    }
    
    return 1.0; // 기본값
  }
  
  // 모멘텀 지속성 계수
  getMomentumPersistenceFactor(scores) {
    // 간단한 지속성 계산 (실제로는 과거 데이터 필요)
    const consistency = (scores.price + scores.volume + scores.sentiment) / 3;
    
    if (consistency > 80) return 1.15;  // 일관된 신호: +15%
    if (consistency > 60) return 1.0;   // 보통 신호
    if (consistency < 30) return 0.8;   // 노이즈 신호: -20%
    
    return 1.0;
  }

  // 보편적인 전략 분류 로직 (변동성 + 거래량 + 시장 규모 + 점수 기반)
  async determineStrategy(score, volatility, volumeRatio, priceData = {}) {
    try {
      const marketCapRank = priceData.market_cap_rank || 999999;
      const absVolatility = Math.abs(volatility);
      
      // 변동성 등급 분류
      const volatilityGrade = absVolatility >= 20 ? 'HIGH' : 
                             absVolatility >= 10 ? 'MEDIUM' : 'LOW';
      
      // 거래량 등급 분류  
      const volumeGrade = volumeRatio >= 3 ? 'HIGH' : 
                         volumeRatio >= 1.5 ? 'MEDIUM' : 'LOW';
      
      // 시장 규모 등급 분류
      const marketGrade = marketCapRank <= 100 ? 'LARGE' : 
                         marketCapRank <= 500 ? 'MID' : 'SMALL';
      
      // 종합 점수 계산 (가중치 적용)
      const compositeScore = (score * 0.4) + 
                           (Math.min(absVolatility * 2, 100) * 0.3) + 
                           (Math.min((volumeRatio - 1) * 50, 100) * 0.2) + 
                           (marketCapRank <= 100 ? 100 : marketCapRank <= 500 ? 70 : 40) * 0.1;
      
      // 리스크 점수 계산
      const riskScore = this.calculateRiskScore(priceData, volatility, volumeRatio);
      const liquidityGrade = this.getLiquidityGrade(marketCapRank, volumeRatio);
      
      // 동적 임계값 적용
      const adjustedThresholds = this.getAdjustedThresholds();
      
      // 최적화된 변동성 및 거래량 조건
      const isModerateVolatility = absVolatility >= 4; // 4% 이상 중간 변동성
      const isHighVolatility = absVolatility >= 6; // 6% 이상 높은 변동성
      const isExtremeVolatility = absVolatility >= 12; // 12% 이상 극심한 변동성
      const isModerateVolume = volumeRatio >= 1.2; // 1.2배 이상 중간 거래량
      const isHighVolume = volumeRatio >= 1.8; // 1.8배 이상 높은 거래량
      const isExtremeVolume = volumeRatio >= 2.5; // 2.5배 이상 극심한 거래량
      
      // 기술적 신호 강도 평가 (RSI, MACD, 볼린저 밴드 등)
      let technicalStrength = 0.5; // 기본값
      try {
        // symbol 매개변수 추가 (priceData에서 추출)
        const symbol = priceData?.symbol || 'unknown';
        technicalStrength = await this.calculateTechnicalStrength(symbol, priceData);
      } catch (error) {
        logger.error('Technical strength calculation failed:', error);
        technicalStrength = 0.5; // 기본값 사용
      }
      const isModerateTE = technicalStrength >= 0.45; // 45% 이상 중간 기술적 신호
      const isStrongTechnical = technicalStrength >= 0.55; // 55% 이상 강한 기술적 신호
      const isVeryStrongTechnical = technicalStrength >= 0.70; // 70% 이상 매우 강한 기술적 신호
      
      // 유동성 및 거래 가능성 평가
      const isTradeable = liquidityGrade === 'A+' || liquidityGrade === 'A';
      const isHighlyTradeable = liquidityGrade === 'A+' && marketCapRank <= 100;
      
      // SCALPING: 55점 이상 + 리스크 80 이하 + 높은/극심한 변동성 + 강한 기술적 신호 + D급 이상 유동성
      if (compositeScore >= 55 && riskScore <= 80 && 
          (isHighVolatility || isExtremeVolatility) && 
          isStrongTechnical && 
          (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+' || liquidityGrade === 'B' || liquidityGrade === 'C' || liquidityGrade === 'D')) {
        return {
          timeframe: "SCALPING",
          action: score >= 50 ? "BUY" : "SELL", 
          priority: "high_priority",
          reason: "High score + Low risk + High volatility + Strong technical signals + Good liquidity for scalping",
          riskScore: riskScore,
          liquidityGrade: liquidityGrade,
          volatilityGrade: volatilityGrade,
          volumeGrade: volumeGrade,
          technicalStrength: technicalStrength
        };
      } 
      // DAY_TRADING: 35점 이상 + 리스크 90 이하 + 중간/높은 변동성 + 중간/강한 기술적 신호 + D급 이상 유동성
      else if (compositeScore >= 35 && riskScore <= 90 && 
               (isModerateVolatility || isHighVolatility) && 
               (isModerateTE || isStrongTechnical) && 
               (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+' || liquidityGrade === 'B' || liquidityGrade === 'C' || liquidityGrade === 'D')) {
        return {
          timeframe: "DAY_TRADING",
          action: score >= 50 ? "BUY" : "SELL",
          priority: "high_priority",
          reason: "Good score + Moderate risk + Moderate/High volatility + Technical signals + Good liquidity for day trading",
          riskScore: riskScore,
          liquidityGrade: liquidityGrade,
          volatilityGrade: volatilityGrade,
          volumeGrade: volumeGrade,
          technicalStrength: technicalStrength
        };
      } 
      // SWING_TRADING: 30점 이상 + 리스크 90 이하 + 중간 거래량 + C+급 이상 유동성
      else if (compositeScore >= 30 && riskScore <= 90 && 
               isModerateVolume && 
               (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+' || liquidityGrade === 'B' || liquidityGrade === 'C+')) {
        return {
          timeframe: "SWING_TRADING", 
          action: score >= 50 ? "BUY" : "HOLD",
          priority: "medium_priority",
          reason: "Moderate score + Acceptable risk + Moderate volume + Decent liquidity for swing trading",
          riskScore: riskScore,
          liquidityGrade: liquidityGrade,
          volatilityGrade: volatilityGrade,
          volumeGrade: volumeGrade
        };
      } 
      // LONG_TERM: 20점 이상 + 리스크 95 이하
      else if (compositeScore >= 20 && riskScore <= 95) {
        return {
          timeframe: "LONG_TERM",
          action: "HOLD",
          priority: "low_priority",
          reason: "Low score + High risk tolerance required for long-term investment",
          riskScore: riskScore,
          liquidityGrade: liquidityGrade,
          volatilityGrade: volatilityGrade,
          volumeGrade: volumeGrade
        };
      }
      // 거부: 너무 위험하거나 신호가 약함
      else {
        return {
          timeframe: "REJECT",
          action: "HOLD",
          priority: "rejected",
          reason: "Signal too weak or risk too high",
          riskScore: riskScore,
          liquidityGrade: liquidityGrade
        };
      }
    } catch (error) {
      logger.error('Strategy determination failed:', error);
      return {
        timeframe: "LONG_TERM",
        action: "HOLD",
        priority: "low_priority",
        reason: "Error in strategy determination"
      };
    }
  }
  
  // 기술적 신호 강도 계산 (RSI, MACD, 볼린저 밴드, 지지/저항 등 종합)
  async calculateTechnicalStrength(symbol, priceData) {
    try {
      // priceData 구조 안전하게 처리
      const currentPrice = priceData?.current_price || priceData?.currentPrice || 0;
      const priceChange24h = priceData?.price_change_percentage_24h || priceData?.change_24h || 0;
      const marketCapRank = priceData?.market_cap_rank || priceData?.marketCapRank || 999999;
      const volume24h = priceData?.total_volume || priceData?.volume24h || 0;
      const marketCap = priceData?.market_cap || priceData?.marketCap || 0;
      
      // 과거 가격 데이터 생성 (실제로는 API에서 가져와야 함)
      const historicalPrices = this.generateHistoricalPrices(currentPrice, priceChange24h);
      
      // 실제 기술적 분석 서비스 사용
      const technicalAnalysis = await this.technicalAnalysisService.analyzeTechnicalIndicators(symbol, priceData);
      const technicalStrength = technicalAnalysis.technicalScore;
      
      return Math.min(Math.max(technicalStrength, 0), 1); // 0-1 범위로 제한
    } catch (error) {
      logger.error('Technical strength calculation failed:', error);
      return 0.5; // 기본값
    }
  }
  
  // 과거 가격 데이터 생성 (실제로는 API에서 가져와야 함)
  generateHistoricalPrices(currentPrice, priceChange24h) {
    try {
      const prices = [];
      const basePrice = currentPrice / (1 + priceChange24h / 100);
      
      // 30일간의 가격 데이터 생성 (실제로는 CoinGecko API에서 가져와야 함)
      for (let i = 30; i >= 0; i--) {
        const randomChange = (Math.random() - 0.5) * 0.1; // ±5% 랜덤 변동
        const price = basePrice * (1 + randomChange);
        prices.push(price);
      }
      
      return prices;
    } catch (error) {
      logger.error('Historical prices generation failed:', error);
      return [currentPrice]; // 기본값
    }
  }
  

  // 리스크 점수 계산
  calculateRiskScore(priceData, volatility, volumeRatio) {
    try {
      let riskScore = 0;
      
      // 변동성 리스크 (0-40점)
      const absVolatility = Math.abs(volatility);
      if (absVolatility > 30) riskScore += 40;
      else if (absVolatility > 20) riskScore += 30;
      else if (absVolatility > 10) riskScore += 20;
      else if (absVolatility > 5) riskScore += 10;
      
      // 거래량 리스크 (0-30점)
      if (volumeRatio < 0.3) riskScore += 30;
      else if (volumeRatio < 0.5) riskScore += 20;
      else if (volumeRatio < 1.0) riskScore += 10;
      
      // 시장 규모 리스크 (0-20점)
      const marketCapRank = priceData.market_cap_rank || 999999;
      if (marketCapRank > 1000) riskScore += 20;
      else if (marketCapRank > 500) riskScore += 15;
      else if (marketCapRank > 100) riskScore += 10;
      else if (marketCapRank > 50) riskScore += 5;
      
      // 가격 안정성 리스크 (0-10점)
      const priceStability = Math.abs(priceData.price_change_percentage_1h || 0);
      if (priceStability > 10) riskScore += 10;
      else if (priceStability > 5) riskScore += 5;
      
      return Math.min(100, riskScore);
    } catch (error) {
      logger.error('Risk score calculation failed:', error);
      return 50; // 기본값
    }
  }
  
  // 유동성 등급 계산
  getLiquidityGrade(marketCapRank, volumeRatio) {
    try {
      // 시가총액 기준
      let marketCapScore = 0;
      if (marketCapRank <= 10) marketCapScore = 100;
      else if (marketCapRank <= 50) marketCapScore = 80;
      else if (marketCapRank <= 100) marketCapScore = 60;
      else if (marketCapRank <= 500) marketCapScore = 40;
      else if (marketCapRank <= 1000) marketCapScore = 20;
      else marketCapScore = 0;
      
      // 거래량 기준
      let volumeScore = 0;
      if (volumeRatio >= 5) volumeScore = 100;
      else if (volumeRatio >= 3) volumeScore = 80;
      else if (volumeRatio >= 2) volumeScore = 60;
      else if (volumeRatio >= 1) volumeScore = 40;
      else if (volumeRatio >= 0.5) volumeScore = 20;
      else volumeScore = 0;
      
      // 종합 점수
      const totalScore = (marketCapScore * 0.6) + (volumeScore * 0.4);
      
      if (totalScore >= 90) return 'A+';
      if (totalScore >= 75) return 'A';
      if (totalScore >= 60) return 'B';
      if (totalScore >= 40) return 'C';
      return 'D';
    } catch (error) {
      logger.error('Liquidity grade calculation failed:', error);
      return 'C';
    }
  }
  
  // 동적 임계값 조정 (백테스팅 성과 기반)
  getAdjustedThresholds() {
    try {
      const adjusted = { ...this.dynamicThresholds };
      
      // 각 타임프레임별 성과 기반 조정
      Object.keys(this.performanceMetrics).forEach(timeframe => {
        const metrics = this.performanceMetrics[timeframe];
        const target = metrics.target;
        const current = metrics.current;
        const samples = metrics.samples;
        
        // 충분한 샘플이 있을 때만 조정
        if (samples >= 10) {
          const performanceRatio = current / target;
          
          // 성과가 목표보다 낮으면 임계값을 높임 (더 엄격하게)
          if (performanceRatio < 0.8) {
            adjusted[timeframe].score *= 1.1; // 10% 증가
            adjusted[timeframe].risk *= 0.9;  // 10% 감소
          }
          // 성과가 목표보다 높으면 임계값을 낮춤 (더 관대하게)
          else if (performanceRatio > 1.2) {
            adjusted[timeframe].score *= 0.95; // 5% 감소
            adjusted[timeframe].risk *= 1.05;  // 5% 증가
          }
        }
      });
      
      return adjusted;
    } catch (error) {
      logger.error('Dynamic threshold adjustment failed:', error);
      return this.dynamicThresholds;
    }
  }
  
  // 성과 메트릭 업데이트
  updatePerformanceMetrics(timeframe, success) {
    try {
      if (this.performanceMetrics[timeframe]) {
        const metrics = this.performanceMetrics[timeframe];
        metrics.samples += 1;
        
        // 성공률 업데이트 (지수 이동 평균)
        const alpha = 0.1; // 학습률
        metrics.current = (alpha * (success ? 1 : 0)) + ((1 - alpha) * metrics.current);
        
        logger.info(`Performance updated for ${timeframe}: ${(metrics.current * 100).toFixed(1)}% (${metrics.samples} samples)`);
      }
    } catch (error) {
      logger.error('Performance metrics update failed:', error);
    }
  }
  
  // 성과 리포트 생성
  generatePerformanceReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        metrics: {},
        recommendations: []
      };
      
      Object.keys(this.performanceMetrics).forEach(timeframe => {
        const metrics = this.performanceMetrics[timeframe];
        report.metrics[timeframe] = {
          target: metrics.target,
          current: metrics.current,
          samples: metrics.samples,
          status: metrics.current >= metrics.target ? 'GOOD' : 'NEEDS_IMPROVEMENT'
        };
        
        if (metrics.current < metrics.target && metrics.samples >= 10) {
          report.recommendations.push({
            timeframe,
            issue: `Low performance: ${(metrics.current * 100).toFixed(1)}% vs target ${(metrics.target * 100).toFixed(1)}%`,
            suggestion: 'Consider adjusting thresholds or improving signal quality'
          });
        }
      });
      
      return report;
    } catch (error) {
      logger.error('Performance report generation failed:', error);
      return null;
    }
  }
  
  // BTC 상관관계 분석
  async analyzeBTCCorrelation(symbol, priceData) {
    try {
      // BTC 가격 데이터 가져오기 (CoinGecko API 호출)
      const axios = require('axios');
      const btcData = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`, {
        headers: {
          'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
        }
      });
      
      const btcPriceChange = btcData.data.bitcoin.usd_24h_change || 0;
      const coinPriceChange = priceData.price_change_percentage_24h || 0;
      
      // 상관관계 계산 (피어슨 상관계수 근사)
      const correlation = this.calculateCorrelation(btcPriceChange, coinPriceChange);
      
      this.correlationData.btcCorrelation = correlation;
      this.correlationData.lastUpdated = new Date();
      
      return {
        correlation: correlation,
        btcChange: btcPriceChange,
        coinChange: coinPriceChange,
        relationship: correlation > 0.7 ? 'HIGH' : correlation > 0.4 ? 'MEDIUM' : 'LOW'
      };
    } catch (error) {
      logger.error('BTC correlation analysis failed:', error);
      // API 실패 시 기본값 사용
      const coinPriceChange = priceData.price_change_percentage_24h || 0;
      return { 
        correlation: 0.5, 
        btcChange: 0, 
        coinChange: coinPriceChange,
        relationship: 'UNKNOWN' 
      };
    }
  }
  
  // 상관관계 계산 (피어슨 상관계수 근사)
  calculateCorrelation(btcChange, coinChange) {
    try {
      // 간단한 상관관계 계산 (실제로는 더 복잡한 통계 분석 필요)
      const diff = Math.abs(btcChange - coinChange);
      const correlation = Math.max(0, 1 - (diff / 20)); // 20% 차이면 상관관계 0
      return Math.min(1, correlation);
    } catch (error) {
      logger.error('Correlation calculation failed:', error);
      return 0.5;
    }
  }
  
  // 알트시즌 지표 계산
  calculateAltcoinSeason(marketCapRank, priceChange) {
    try {
      // 알트시즌 조건: 상위 100위 밖 코인이 BTC보다 강한 상승
      const isAltcoin = marketCapRank > 100;
      const isStrongRise = priceChange > 5.0; // 5% 이상 상승
      
      const altcoinSeason = isAltcoin && isStrongRise;
      this.correlationData.altcoinSeason = altcoinSeason;
      
      return {
        isAltcoinSeason: altcoinSeason,
        marketCapRank: marketCapRank,
        priceChange: priceChange,
        seasonStrength: altcoinSeason ? 'STRONG' : 'WEAK'
      };
    } catch (error) {
      logger.error('Altcoin season calculation failed:', error);
      return { isAltcoinSeason: false, seasonStrength: 'UNKNOWN' };
    }
  }
  
  // 시장 지배율 분석
  async analyzeMarketDominance() {
    try {
      // BTC 시장 지배율 (CoinGecko API 호출)
      const axios = require('axios');
      const dominanceData = await axios.get(`https://api.coingecko.com/api/v3/global`, {
        headers: {
          'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
        }
      });
      
      const btcDominance = dominanceData.data.data.market_cap_percentage.btc || 50;
      this.correlationData.marketDominance = btcDominance;
      
      return {
        btcDominance: btcDominance,
        marketPhase: btcDominance > 50 ? 'BTC_DOMINANT' : 
                    btcDominance > 40 ? 'BALANCED' : 'ALTCOIN_SEASON',
        dominanceTrend: 'STABLE', // 실제로는 과거 데이터 비교
        totalMarketCap: dominanceData.data.data.total_market_cap.usd,
        activeCryptocurrencies: dominanceData.data.data.active_cryptocurrencies
      };
    } catch (error) {
      logger.error('Market dominance analysis failed:', error);
      return { 
        btcDominance: 50, 
        marketPhase: 'UNKNOWN',
        totalMarketCap: 0,
        activeCryptocurrencies: 0
      };
    }
  }
  
  // 공포탐욕지수 분석
  async analyzeFearGreedIndex() {
    try {
      // 공포탐욕지수 (Alternative.me API 호출)
      const axios = require('axios');
      const fearGreedData = await axios.get('https://api.alternative.me/fng/', {
        timeout: 5000
      });
      
      const fearGreedIndex = fearGreedData.data.data[0].value || 50;
      this.correlationData.fearGreedIndex = parseInt(fearGreedIndex);
      
      // 데이터 구조 안전성 확인
      const dataArray = fearGreedData?.data?.data;
      if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error('Invalid Fear & Greed data structure');
      }

      const latestData = dataArray[0];
      if (!latestData || typeof latestData.value === 'undefined') {
        throw new Error('Missing Fear & Greed value data');
      }

      return {
        index: parseInt(fearGreedIndex),
        sentiment: fearGreedIndex > 75 ? 'EXTREME_GREED' :
                  fearGreedIndex > 55 ? 'GREED' :
                  fearGreedIndex > 45 ? 'NEUTRAL' :
                  fearGreedIndex > 25 ? 'FEAR' : 'EXTREME_FEAR',
        marketCondition: fearGreedIndex > 70 ? 'OVERBOUGHT' :
                        fearGreedIndex < 30 ? 'OVERSOLD' : 'NORMAL',
        classification: latestData.value_classification || 'Neutral',
        timestamp: latestData.timestamp || Date.now()
      };
    } catch (error) {
      logger.error('Fear & Greed index analysis failed:', error);
      return { 
        index: 50, 
        sentiment: 'NEUTRAL',
        marketCondition: 'NORMAL',
        classification: 'Neutral',
        timestamp: Date.now()
      };
    }
  }
  
  // 거시경제 이벤트 분석
  async analyzeMacroEvents() {
    try {
      const today = new Date();
      const events = [];
      
      // Fed 회의 확인 (매월 셋째 주 수요일)
      const fedMeeting = this.checkFedMeeting(today);
      if (fedMeeting.isActive) {
        events.push({
          type: 'FED_MEETING',
          impact: 'HIGH',
          description: 'Federal Reserve Meeting',
          daysUntil: fedMeeting.daysUntil
        });
        this.macroEvents.fedMeeting = true;
      }
      
      // CPI 발표 확인 (매월 둘째 주 화요일)
      const cpiRelease = this.checkCPIRelease(today);
      if (cpiRelease.isActive) {
        events.push({
          type: 'CPI_RELEASE',
          impact: 'HIGH',
          description: 'Consumer Price Index Release',
          daysUntil: cpiRelease.daysUntil
        });
        this.macroEvents.cpiRelease = true;
      }
      
      // 비농업 고용지표 확인 (매월 첫째 주 금요일)
      const nfpRelease = this.checkNFPRelease(today);
      if (nfpRelease.isActive) {
        events.push({
          type: 'NFP_RELEASE',
          impact: 'MEDIUM',
          description: 'Non-Farm Payroll Release',
          daysUntil: nfpRelease.daysUntil
        });
        this.macroEvents.nfpRelease = true;
      }
      
      this.macroEvents.highImpactEvents = events;
      
      return {
        totalEvents: events.length,
        highImpactEvents: events.filter(e => e.impact === 'HIGH').length,
        events: events,
        marketRisk: events.length > 2 ? 'HIGH' : events.length > 0 ? 'MEDIUM' : 'LOW'
      };
    } catch (error) {
      logger.error('Macro events analysis failed:', error);
      return { totalEvents: 0, highImpactEvents: 0, events: [], marketRisk: 'UNKNOWN' };
    }
  }
  
  // Fed 회의 일정 확인
  checkFedMeeting(date) {
    try {
      // 간단한 로직: 매월 셋째 주 수요일 (실제로는 정확한 일정 필요)
      const dayOfWeek = date.getDay(); // 0=일요일, 3=수요일
      const dayOfMonth = date.getDate();
      
      // 셋째 주 수요일 (15-21일 사이의 수요일)
      const isThirdWednesday = dayOfWeek === 3 && dayOfMonth >= 15 && dayOfMonth <= 21;
      
      return {
        isActive: isThirdWednesday,
        daysUntil: isThirdWednesday ? 0 : this.daysUntilNextThirdWednesday(date)
      };
    } catch (error) {
      logger.error('Fed meeting check failed:', error);
      return { isActive: false, daysUntil: 999 };
    }
  }
  
  // CPI 발표 일정 확인
  checkCPIRelease(date) {
    try {
      // 간단한 로직: 매월 둘째 주 화요일 (실제로는 정확한 일정 필요)
      const dayOfWeek = date.getDay(); // 0=일요일, 2=화요일
      const dayOfMonth = date.getDate();
      
      // 둘째 주 화요일 (8-14일 사이의 화요일)
      const isSecondTuesday = dayOfWeek === 2 && dayOfMonth >= 8 && dayOfMonth <= 14;
      
      return {
        isActive: isSecondTuesday,
        daysUntil: isSecondTuesday ? 0 : this.daysUntilNextSecondTuesday(date)
      };
    } catch (error) {
      logger.error('CPI release check failed:', error);
      return { isActive: false, daysUntil: 999 };
    }
  }
  
  // 비농업 고용지표 발표 일정 확인
  checkNFPRelease(date) {
    try {
      // 간단한 로직: 매월 첫째 주 금요일 (실제로는 정확한 일정 필요)
      const dayOfWeek = date.getDay(); // 0=일요일, 5=금요일
      const dayOfMonth = date.getDate();
      
      // 첫째 주 금요일 (1-7일 사이의 금요일)
      const isFirstFriday = dayOfWeek === 5 && dayOfMonth >= 1 && dayOfMonth <= 7;
      
      return {
        isActive: isFirstFriday,
        daysUntil: isFirstFriday ? 0 : this.daysUntilNextFirstFriday(date)
      };
    } catch (error) {
      logger.error('NFP release check failed:', error);
      return { isActive: false, daysUntil: 999 };
    }
  }
  
  // 다음 셋째 주 수요일까지의 일수 계산
  daysUntilNextThirdWednesday(date) {
    // 간단한 구현 (실제로는 더 정확한 계산 필요)
    return 7; // 임시값
  }
  
  // 다음 둘째 주 화요일까지의 일수 계산
  daysUntilNextSecondTuesday(date) {
    // 간단한 구현 (실제로는 더 정확한 계산 필요)
    return 5; // 임시값
  }
  
  // 다음 첫째 주 금요일까지의 일수 계산
  daysUntilNextFirstFriday(date) {
    // 간단한 구현 (실제로는 더 정확한 계산 필요)
    return 3; // 임시값
  }
  
  // 백테스팅 실행
  async runBacktest(startDate, endDate, initialCapital = 10000) {
    try {
      logger.info(`Starting backtest from ${startDate} to ${endDate}`);
      
      // 과거 시그널 데이터 가져오기 (실제로는 DB에서 조회)
      const historicalSignals = await this.getHistoricalSignals(startDate, endDate);
      
      let currentCapital = initialCapital;
      let positions = [];
      let trades = [];
      let maxCapital = initialCapital;
      let maxDrawdown = 0;
      
      // 각 시그널에 대해 백테스팅 실행
      for (const signal of historicalSignals) {
        const result = await this.simulateTrade(signal, currentCapital, positions);
        
        if (result.trade) {
          trades.push(result.trade);
          currentCapital = result.newCapital;
          positions = result.newPositions;
          
          // 최대 자본 업데이트
          if (currentCapital > maxCapital) {
            maxCapital = currentCapital;
          }
          
          // 최대 낙폭 계산
          const drawdown = (maxCapital - currentCapital) / maxCapital;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }
      
      // 백테스팅 종료 시 모든 포지션 정리
      for (const position of positions) {
        // 마지막 가격으로 매도 (현재 가격 사용)
        const finalPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.1); // ±5% 변동
        const sellAmount = position.shares * finalPrice;
        const profit = sellAmount - (position.shares * position.entryPrice);
        
        trades.push({
          type: 'SELL',
          symbol: position.symbol,
          price: finalPrice,
          shares: position.shares,
          amount: sellAmount,
          profit: profit,
          timestamp: new Date(endDate)
        });
        
        currentCapital += sellAmount;
        
        // 최대 자본 업데이트
        if (currentCapital > maxCapital) {
          maxCapital = currentCapital;
        }
        
        // 최대 낙폭 계산
        const drawdown = (maxCapital - currentCapital) / maxCapital;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      // 성과 지표 계산
      const performance = this.calculatePerformanceMetrics(trades, initialCapital, maxDrawdown);
      
      this.backtestData.performanceMetrics = performance;
      this.backtestData.lastBacktestDate = new Date();
      
      logger.success(`Backtest completed: ${trades.length} trades, ${performance.winRate.toFixed(2)}% win rate`);
      
      return {
        trades: trades,
        performance: performance,
        summary: {
          totalTrades: trades.length,
          initialCapital: initialCapital,
          finalCapital: currentCapital,
          totalReturn: ((currentCapital - initialCapital) / initialCapital) * 100,
          maxDrawdown: maxDrawdown * 100
        }
      };
    } catch (error) {
      logger.error('Backtest execution failed:', error);
      throw error;
    }
  }
  
  // 과거 시그널 데이터 가져오기
  async getHistoricalSignals(startDate, endDate) {
    try {
      // 실제로는 DB에서 과거 시그널 데이터를 조회
      // 현재는 더 현실적인 임시 데이터 반환
      const start = new Date(startDate);
      const end = new Date(endDate);
      const signals = [];
      
      // 다양한 코인과 액션으로 시그널 생성
      const coins = [
        { symbol: 'BTC', basePrice: 45000 },
        { symbol: 'ETH', basePrice: 3000 },
        { symbol: 'ADA', basePrice: 0.5 },
        { symbol: 'SOL', basePrice: 100 },
        { symbol: 'DOT', basePrice: 7 }
      ];
      
      // 날짜별로 시그널 생성
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        // 하루에 1-3개의 시그널 생성
        const numSignals = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numSignals; i++) {
          const coin = coins[Math.floor(Math.random() * coins.length)];
          const score = Math.floor(Math.random() * 100);
          const action = score > 60 ? 'BUY' : score < 40 ? 'SELL' : 'HOLD';
          const timeframes = ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM'];
          const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
          
          // 가격 변동 시뮬레이션 (±10%)
          const priceChange = (Math.random() - 0.5) * 0.2;
          const currentPrice = coin.basePrice * (1 + priceChange);
          
          signals.push({
            symbol: coin.symbol,
            finalScore: score,
            recommendation: { action: action },
            timeframe: timeframe,
            createdAt: new Date(date),
            currentPrice: currentPrice
          });
        }
      }
      
      // 시간순으로 정렬
      signals.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      logger.info(`Generated ${signals.length} historical signals for backtesting`);
      return signals;
    } catch (error) {
      logger.error('Historical signals retrieval failed:', error);
      return [];
    }
  }
  
  // 거래 시뮬레이션
  async simulateTrade(signal, currentCapital, positions) {
    try {
      const { symbol, finalScore, recommendation, timeframe, currentPrice } = signal;
      
      // 포지션 크기 결정 (자본의 10%)
      const positionSize = currentCapital * 0.1;
      const shares = positionSize / currentPrice;
      
      if (recommendation.action === 'BUY' && finalScore > 60) {
        // 매수 시뮬레이션
        const newPosition = {
          symbol: symbol,
          shares: shares,
          entryPrice: currentPrice,
          entryTime: signal.createdAt,
          timeframe: timeframe
        };
        
        positions.push(newPosition);
        
        return {
          trade: {
            type: 'BUY',
            symbol: symbol,
            price: currentPrice,
            shares: shares,
            amount: positionSize,
            timestamp: signal.createdAt
          },
          newCapital: currentCapital - positionSize,
          newPositions: positions
        };
      } else if (recommendation.action === 'SELL') {
        // 매도 시뮬레이션 (해당 코인 포지션 찾기)
        const positionIndex = positions.findIndex(p => p.symbol === symbol);
        if (positionIndex !== -1) {
          const position = positions[positionIndex];
          const profit = (currentPrice - position.entryPrice) * position.shares;
          
          positions.splice(positionIndex, 1);
          
          return {
            trade: {
              type: 'SELL',
              symbol: symbol,
              price: currentPrice,
              shares: position.shares,
              amount: position.shares * currentPrice,
              profit: profit,
              timestamp: signal.createdAt
            },
            newCapital: currentCapital + (position.shares * currentPrice),
            newPositions: positions
          };
        }
      }
      
      // 기존 포지션에 대한 자동 매도 로직 추가
      for (let i = positions.length - 1; i >= 0; i--) {
        const position = positions[i];
        const daysHeld = (new Date(signal.createdAt) - new Date(position.entryTime)) / (1000 * 60 * 60 * 24);
        
        // 타임프레임에 따른 자동 매도
        let shouldSell = false;
        let exitPrice = currentPrice;
        
        if (position.timeframe === 'SCALPING' && daysHeld >= 0.1) { // 2.4시간
          shouldSell = true;
          // 스캘핑은 작은 수익률로 매도 (±1% 변동)
          const priceChange = (Math.random() - 0.5) * 0.02;
          exitPrice = position.entryPrice * (1 + priceChange);
        } else if (position.timeframe === 'DAY_TRADING' && daysHeld >= 1) { // 1일
          shouldSell = true;
          // 데이 트레이딩은 중간 수익률로 매도 (±2.5% 변동)
          const priceChange = (Math.random() - 0.5) * 0.05;
          exitPrice = position.entryPrice * (1 + priceChange);
        } else if (position.timeframe === 'SWING_TRADING' && daysHeld >= 7) { // 1주일
          shouldSell = true;
          // 스윙 트레이딩은 큰 수익률로 매도 (±5% 변동)
          const priceChange = (Math.random() - 0.5) * 0.1;
          exitPrice = position.entryPrice * (1 + priceChange);
        } else if (position.timeframe === 'LONG_TERM' && daysHeld >= 30) { // 1개월
          shouldSell = true;
          // 장기 투자는 큰 수익률로 매도 (±10% 변동)
          const priceChange = (Math.random() - 0.5) * 0.2;
          exitPrice = position.entryPrice * (1 + priceChange);
        }
        
        if (shouldSell) {
          const sellAmount = position.shares * exitPrice;
          const profit = sellAmount - (position.shares * position.entryPrice);
          
          // 포지션 제거
          positions.splice(i, 1);
          
          return {
            trade: {
              type: 'SELL',
              symbol: position.symbol,
              price: exitPrice,
              shares: position.shares,
              amount: sellAmount,
              profit: profit,
              timestamp: signal.createdAt
            },
            newCapital: currentCapital + sellAmount,
            newPositions: positions
          };
        }
      }
      
      return { trade: null, newCapital: currentCapital, newPositions: positions };
    } catch (error) {
      logger.error('Trade simulation failed:', error);
      return { trade: null, newCapital: currentCapital, newPositions: positions };
    }
  }
  
  // 성과 지표 계산
  calculatePerformanceMetrics(trades, initialCapital, maxDrawdown) {
    try {
      const totalTrades = trades.length;
      
      // 매도 거래만 필터링 (실제 수익/손실이 있는 거래)
      const sellTrades = trades.filter(t => t.type === 'SELL' && t.profit !== undefined);
      const successfulTrades = sellTrades.filter(t => t.profit > 0).length;
      
      // 총 수익률 계산 (백분율)
      const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalReturnPercentage = initialCapital > 0 ? (totalProfit / initialCapital) * 100 : 0;
      
      // 승률 계산
      const winRate = sellTrades.length > 0 ? (successfulTrades / sellTrades.length) * 100 : 0;
      
      // 샤프 비율 계산 (개선된 버전)
      let sharpeRatio = 0;
      if (sellTrades.length > 1) {
        const returns = sellTrades.map(t => (t.profit || 0) / initialCapital);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      }
      
      // 최대 손실률 계산
      const maxLossPercentage = maxDrawdown > 0 ? (maxDrawdown / initialCapital) * 100 : 0;
      
      logger.info(`Performance metrics: ${sellTrades.length} sell trades, ${successfulTrades} successful, ${totalReturnPercentage.toFixed(2)}% return, ${winRate.toFixed(2)}% win rate`);
      
      return {
        totalSignals: totalTrades,
        successfulSignals: successfulTrades,
        totalReturn: totalReturnPercentage,
        maxDrawdown: maxLossPercentage,
        sharpeRatio: sharpeRatio,
        winRate: winRate
      };
    } catch (error) {
      logger.error('Performance metrics calculation failed:', error);
      return {
        totalSignals: 0,
        successfulSignals: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0
      };
    }
  }
  
  // 상관관계 보정 점수 계산
  calculateCorrelationScore(btcCorrelation, altcoinSeason, marketDominance, fearGreedIndex) {
    try {
      let score = 50; // 기본 점수
      
      // BTC 상관관계 보정
      if (btcCorrelation.relationship === 'HIGH') {
        score += 10; // BTC와 높은 상관관계면 보정
      } else if (btcCorrelation.relationship === 'LOW') {
        score -= 5; // 독립적인 움직임이면 약간 감점
      }
      
      // 알트시즌 보정
      if (altcoinSeason.isAltcoinSeason) {
        score += 15; // 알트시즌이면 강한 보정
      }
      
      // 시장 지배율 보정
      if (marketDominance.marketPhase === 'ALTCOIN_SEASON') {
        score += 10;
      } else if (marketDominance.marketPhase === 'BTC_DOMINANT') {
        score -= 5;
      }
      
      // 공포탐욕지수 보정
      if (fearGreedIndex.sentiment === 'EXTREME_FEAR') {
        score += 20; // 극도의 공포는 매수 기회
      } else if (fearGreedIndex.sentiment === 'EXTREME_GREED') {
        score -= 15; // 극도의 탐욕은 매도 신호
      } else if (fearGreedIndex.sentiment === 'FEAR') {
        score += 10;
      } else if (fearGreedIndex.sentiment === 'GREED') {
        score -= 5;
      }
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Correlation score calculation failed:', error);
      return 50;
    }
  }
  
  // 거시경제 이벤트 보정 점수 계산
  calculateMacroScore(macroEvents) {
    try {
      let score = 50; // 기본 점수
      
      // 고위험 이벤트가 많으면 점수 감소
      if (macroEvents.marketRisk === 'HIGH') {
        score -= 20; // 고위험 시장에서는 보수적 접근
      } else if (macroEvents.marketRisk === 'MEDIUM') {
        score -= 10;
      }
      
      // 특정 이벤트별 보정
      macroEvents.events.forEach(event => {
        if (event.impact === 'HIGH') {
          score -= 15; // 고위험 이벤트는 점수 감소
        } else if (event.impact === 'MEDIUM') {
          score -= 8;
        }
      });
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Macro score calculation failed:', error);
      return 50;
    }
  }

  // 보편적인 타임프레임 결정 메서드 (변동성 + 거래량 + 시장 규모 기반)
  getTimeframe(score, priceData = {}) {
    const volatility = priceData.price_change_percentage_24h || 0;
    const volumeRatio = this.calculateVolumeRatio(priceData);
    const marketCapRank = priceData.market_cap_rank || 999999;
    
    // 변동성 점수 (0-100) - 24시간 변동률 기준
    const volatilityScore = Math.min(Math.abs(volatility) * 2, 100);
    
    // 거래량 점수 (0-100) - 평균 대비 비율
    const volumeScore = Math.min((volumeRatio - 1) * 50, 100);
    
    // 시장 규모 점수 (상위 코인일수록 높은 점수)
    const marketCapScore = marketCapRank <= 100 ? 100 : 
                          marketCapRank <= 500 ? 70 : 
                          marketCapRank <= 1000 ? 40 : 10;
    
      // 종합 점수 계산 (가중 평균) - finalScore를 직접 사용
      const compositeScore = score; // finalScore를 직접 사용하여 더 정확한 분류
    
    // 타임프레임 분류
    if (compositeScore >= 80 || compositeScore <= 20) {
      return 'SCALPING'; // 고변동성 + 강한 신호
    } else if (compositeScore >= 65 || compositeScore <= 35) {
      return 'DAY_TRADING'; // 중고변동성 + 중강한 신호
    } else if (compositeScore >= 50 || compositeScore <= 50) {
      return 'SWING_TRADING'; // 중변동성 + 중간 신호
    } else {
      return 'LONG_TERM'; // 저변동성 + 약한 신호
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

