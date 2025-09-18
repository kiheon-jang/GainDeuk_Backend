const UserProfile = require('../models/UserProfile');
const { logger } = require('../utils/logger');

/**
 * 개인화 추천 서비스
 * 사용자 프로필을 기반으로 개인별 최적 타임프레임과 투자 전략을 추천
 */
class PersonalizationService {
  constructor() {
    this.recommendationCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
  }

  /**
   * 사용자별 개인화된 추천 생성
   * @param {string} userId - 사용자 ID
   * @param {Object} marketData - 현재 시장 데이터
   * @param {Array} availableSignals - 사용 가능한 신호들
   * @returns {Object} 개인화된 추천 결과
   */
  async generatePersonalizedRecommendations(userId, marketData = {}, availableSignals = []) {
    try {
      // 캐시 확인
      const cacheKey = `recommendations_${userId}`;
      const cached = this.recommendationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        if (logger && logger.info) {
        logger.info(`캐시된 추천 반환: ${userId}`);
      }
        return cached.data;
      }

      // 사용자 프로필 조회
      const userProfile = await UserProfile.findOne({ 
        userId, 
        isActive: true 
      });

      if (!userProfile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }

      // 개인화 추천 생성
      const recommendations = await this._generateRecommendations(userProfile, marketData, availableSignals);

      // 캐시 저장
      this.recommendationCache.set(cacheKey, {
        data: recommendations,
        timestamp: Date.now()
      });

      if (logger && logger.info) {
        logger.info(`개인화 추천 생성 완료: ${userId}`);
      }
      return recommendations;

    } catch (error) {
      if (logger && logger.error) {
        logger.error('개인화 추천 생성 실패:', error);
      } else {
        console.error('개인화 추천 생성 실패:', error);
      }
      throw error;
    }
  }

  /**
   * 사용자 프로필 기반 추천 생성 내부 로직
   * @private
   */
  async _generateRecommendations(userProfile, marketData, availableSignals) {
    const recommendations = {
      // 기본 추천
      suggestedTimeframes: this._getOptimalTimeframes(userProfile),
      suggestedCoins: this._getOptimalCoins(userProfile, marketData),
      riskLevel: this._calculateRiskLevel(userProfile),
      maxDailySignals: userProfile.personalizationSettings.maxDailySignals,
      
      // 고급 추천
      tradingStrategy: this._generateTradingStrategy(userProfile, marketData),
      signalFilters: this._generateSignalFilters(userProfile),
      positionSizing: this._calculatePositionSizing(userProfile, marketData),
      alertSettings: this._optimizeAlertSettings(userProfile),
      
      // 시장 상황별 추천
      marketAdaptation: this._adaptToMarketConditions(userProfile, marketData),
      
      // 메타데이터
      confidence: this._calculateRecommendationConfidence(userProfile),
      lastUpdated: new Date(),
      profileCompleteness: userProfile.profileCompleteness
    };

    return recommendations;
  }

  /**
   * 사용자에게 최적화된 타임프레임 추천
   * @private
   */
  _getOptimalTimeframes(userProfile) {
    const { experienceLevel, availableTime, investmentStyle } = userProfile;
    
    // 기본 타임프레임 매트릭스
    const timeframeMatrix = {
      beginner: {
        minimal: ['1h', '4h', '1d'],
        'part-time': ['30m', '1h', '4h'],
        'full-time': ['15m', '1h', '4h']
      },
      intermediate: {
        minimal: ['1h', '4h', '1d'],
        'part-time': ['15m', '1h', '4h'],
        'full-time': ['5m', '15m', '1h']
      },
      advanced: {
        minimal: ['1h', '4h'],
        'part-time': ['5m', '15m', '1h'],
        'full-time': ['1m', '5m', '15m']
      },
      expert: {
        minimal: ['4h', '1d'],
        'part-time': ['1m', '5m', '15m'],
        'full-time': ['1m', '5m', '15m']
      }
    };

    let timeframes = timeframeMatrix[experienceLevel]?.[availableTime] || ['1h', '4h'];
    
    // 투자 스타일별 조정
    if (investmentStyle === 'conservative') {
      timeframes = timeframes.filter(tf => ['1h', '4h', '1d', '1w'].includes(tf));
    } else if (investmentStyle === 'speculative') {
      timeframes = timeframes.filter(tf => ['1m', '5m', '15m', '30m'].includes(tf));
    }

    // 사용자가 설정한 선호 타임프레임이 있으면 우선 적용
    if (userProfile.preferredTimeframes && userProfile.preferredTimeframes.length > 0) {
      timeframes = userProfile.preferredTimeframes;
    }

    return timeframes.slice(0, 3); // 최대 3개 반환
  }

  /**
   * 사용자에게 최적화된 코인 추천
   * @private
   */
  _getOptimalCoins(userProfile, marketData) {
    const { investmentStyle, riskTolerance, experienceLevel } = userProfile;
    
    // 코인 분류
    const coinCategories = {
      blueChip: ['BTC', 'ETH'], // 안정적인 대형 코인
      established: ['BNB', 'ADA', 'SOL', 'DOT'], // 확립된 알트코인
      emerging: ['MATIC', 'AVAX', 'LINK', 'UNI'], // 성장 중인 코인
      speculative: ['DOGE', 'SHIB', 'PEPE', 'WIF'] // 고위험 스펙 코인
    };

    let recommendedCoins = [];

    // 투자 스타일별 기본 추천
    switch (investmentStyle) {
      case 'conservative':
        recommendedCoins = [...coinCategories.blueChip];
        break;
      case 'moderate':
        recommendedCoins = [...coinCategories.blueChip, ...coinCategories.established.slice(0, 2)];
        break;
      case 'aggressive':
        recommendedCoins = [...coinCategories.blueChip, ...coinCategories.established, ...coinCategories.emerging.slice(0, 2)];
        break;
      case 'speculative':
        recommendedCoins = [...coinCategories.blueChip, ...coinCategories.established, ...coinCategories.emerging, ...coinCategories.speculative.slice(0, 2)];
        break;
    }

    // 위험 감수도에 따른 조정
    if (riskTolerance <= 3) {
      recommendedCoins = recommendedCoins.filter(coin => 
        [...coinCategories.blueChip, ...coinCategories.established].includes(coin)
      );
    } else if (riskTolerance >= 8) {
      recommendedCoins = [...recommendedCoins, ...coinCategories.speculative.slice(0, 2)];
    }

    // 경험 수준에 따른 조정
    if (experienceLevel === 'beginner') {
      recommendedCoins = recommendedCoins.slice(0, 3); // 초보자는 3개 이하
    } else if (experienceLevel === 'expert') {
      recommendedCoins = [...recommendedCoins, ...coinCategories.emerging.slice(2, 4)];
    }

    // 사용자가 설정한 선호 코인이 있으면 우선 적용
    if (userProfile.preferredCoins && userProfile.preferredCoins.length > 0) {
      recommendedCoins = userProfile.preferredCoins;
    }

    // 시장 데이터 기반 조정 (볼륨, 변동성 등)
    if (marketData.volatility && marketData.volatility > 0.8) {
      // 고변동성 시장에서는 안정적인 코인 우선
      recommendedCoins = recommendedCoins.filter(coin => 
        coinCategories.blueChip.includes(coin)
      );
    }

    return [...new Set(recommendedCoins)].slice(0, 5); // 중복 제거 후 최대 5개
  }

  /**
   * 사용자 리스크 레벨 계산
   * @private
   */
  _calculateRiskLevel(userProfile) {
    let riskScore = 0;

    // 투자 스타일별 점수
    const styleScores = {
      conservative: 2,
      moderate: 5,
      aggressive: 8,
      speculative: 10
    };
    riskScore += styleScores[userProfile.investmentStyle] || 5;

    // 위험 감수도
    riskScore += userProfile.riskTolerance;

    // 경험 수준별 점수
    const experienceScores = {
      beginner: 1,
      intermediate: 3,
      advanced: 5,
      expert: 7
    };
    riskScore += experienceScores[userProfile.experienceLevel] || 1;

    // 거래 성공률 기반 조정
    if (userProfile.learningData && userProfile.learningData.totalTrades > 0) {
      const successRate = userProfile.learningData.successfulTrades / userProfile.learningData.totalTrades;
      if (successRate > 0.7) {
        riskScore += 1; // 성공률이 높으면 리스크 허용도 증가
      } else if (successRate < 0.3) {
        riskScore -= 2; // 성공률이 낮으면 리스크 허용도 감소
      }
    }

    return Math.min(10, Math.max(1, Math.round(riskScore / 3)));
  }

  /**
   * 개인화된 거래 전략 생성
   * @private
   */
  _generateTradingStrategy(userProfile, marketData) {
    const strategy = {
      entryStrategy: this._getEntryStrategy(userProfile),
      exitStrategy: this._getExitStrategy(userProfile),
      stopLoss: this._calculateStopLoss(userProfile),
      takeProfit: this._calculateTakeProfit(userProfile),
      positionManagement: this._getPositionManagement(userProfile),
      riskManagement: this._getRiskManagement(userProfile)
    };

    return strategy;
  }

  /**
   * 진입 전략 결정
   * @private
   */
  _getEntryStrategy(userProfile) {
    const { experienceLevel, investmentStyle, riskTolerance } = userProfile;

    if (experienceLevel === 'beginner' || investmentStyle === 'conservative') {
      return {
        type: 'conservative',
        description: '안전한 진입점에서만 거래',
        conditions: ['strong_signal', 'low_volatility', 'support_level']
      };
    } else if (investmentStyle === 'speculative' || riskTolerance >= 8) {
      return {
        type: 'aggressive',
        description: '빠른 진입과 빠른 수익 실현',
        conditions: ['momentum_signal', 'volume_spike', 'breakout']
      };
    } else {
      return {
        type: 'balanced',
        description: '균형잡힌 진입 전략',
        conditions: ['moderate_signal', 'trend_confirmation', 'risk_reward_ratio']
      };
    }
  }

  /**
   * 청산 전략 결정
   * @private
   */
  _getExitStrategy(userProfile) {
    const { experienceLevel, availableTime } = userProfile;

    if (availableTime === 'minimal' || experienceLevel === 'beginner') {
      return {
        type: 'set_and_forget',
        description: '목표가와 손절가 설정 후 자동 청산',
        conditions: ['take_profit_hit', 'stop_loss_hit', 'time_based_exit']
      };
    } else if (availableTime === 'full-time' && experienceLevel === 'expert') {
      return {
        type: 'dynamic',
        description: '시장 상황에 따른 동적 청산',
        conditions: ['momentum_shift', 'volume_decline', 'technical_divergence']
      };
    } else {
      return {
        type: 'semi_automated',
        description: '부분 자동화된 청산 전략',
        conditions: ['partial_profit_taking', 'trailing_stop', 'signal_reversal']
      };
    }
  }

  /**
   * 손절가 계산
   * @private
   */
  _calculateStopLoss(userProfile) {
    const { riskTolerance, investmentStyle } = userProfile;
    
    // 기본 손절가 비율
    let stopLossPercent = 5; // 5%

    // 위험 감수도에 따른 조정
    if (riskTolerance <= 3) {
      stopLossPercent = 3; // 보수적
    } else if (riskTolerance >= 8) {
      stopLossPercent = 8; // 공격적
    }

    // 투자 스타일별 조정
    if (investmentStyle === 'conservative') {
      stopLossPercent = Math.min(stopLossPercent, 4);
    } else if (investmentStyle === 'speculative') {
      stopLossPercent = Math.max(stopLossPercent, 6);
    }

    return {
      percentage: stopLossPercent,
      description: `${stopLossPercent}% 손절가 설정`,
      adaptive: riskTolerance >= 7 // 고위험 감수도는 적응형 손절가
    };
  }

  /**
   * 목표가 계산
   * @private
   */
  _calculateTakeProfit(userProfile) {
    const { riskTolerance, investmentStyle } = userProfile;
    
    // 기본 목표가 비율
    let takeProfitPercent = 10; // 10%

    // 위험 감수도에 따른 조정
    if (riskTolerance <= 3) {
      takeProfitPercent = 8; // 보수적
    } else if (riskTolerance >= 8) {
      takeProfitPercent = 15; // 공격적
    }

    // 투자 스타일별 조정
    if (investmentStyle === 'conservative') {
      takeProfitPercent = Math.min(takeProfitPercent, 12);
    } else if (investmentStyle === 'speculative') {
      takeProfitPercent = Math.max(takeProfitPercent, 20);
    }

    return {
      percentage: takeProfitPercent,
      description: `${takeProfitPercent}% 목표가 설정`,
      riskRewardRatio: takeProfitPercent / this._calculateStopLoss(userProfile).percentage
    };
  }

  /**
   * 포지션 관리 전략
   * @private
   */
  _getPositionManagement(userProfile) {
    const { experienceLevel, availableTime, maxPositionSize } = userProfile;

    return {
      maxPositions: this._getMaxPositions(userProfile),
      positionSizing: this._getPositionSizingMethod(userProfile),
      diversification: this._getDiversificationLevel(userProfile),
      rebalancing: this._getRebalancingStrategy(userProfile)
    };
  }

  /**
   * 최대 포지션 수 계산
   * @private
   */
  _getMaxPositions(userProfile) {
    const { experienceLevel, availableTime } = userProfile;
    
    if (experienceLevel === 'beginner') {
      return availableTime === 'minimal' ? 1 : 2;
    } else if (experienceLevel === 'intermediate') {
      return availableTime === 'minimal' ? 2 : 3;
    } else if (experienceLevel === 'advanced') {
      return availableTime === 'minimal' ? 3 : 5;
    } else {
      return availableTime === 'minimal' ? 5 : 8;
    }
  }

  /**
   * 다각화 수준 계산
   * @private
   */
  _getDiversificationLevel(userProfile) {
    const { experienceLevel, riskTolerance, availableTime } = userProfile;
    
    let level = 'low';
    let description = '낮은 다각화 (1-2개 자산)';
    
    if (experienceLevel === 'intermediate' && riskTolerance >= 5) {
      level = 'medium';
      description = '중간 다각화 (3-5개 자산)';
    } else if (experienceLevel === 'advanced' || experienceLevel === 'expert') {
      if (riskTolerance >= 7) {
        level = 'high';
        description = '높은 다각화 (6-10개 자산)';
      } else {
        level = 'medium';
        description = '중간 다각화 (3-5개 자산)';
      }
    }
    
    return {
      level,
      description,
      recommendedAssets: this._getRecommendedAssetCount(level)
    };
  }

  /**
   * 권장 자산 수 계산
   * @private
   */
  _getRecommendedAssetCount(level) {
    switch (level) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 8;
      default: return 2;
    }
  }

  /**
   * 리밸런싱 전략 계산
   * @private
   */
  _getRebalancingStrategy(userProfile) {
    const { experienceLevel, availableTime, riskTolerance } = userProfile;
    
    let frequency = 'monthly';
    let method = 'threshold';
    let description = '월간 리밸런싱 (임계값 기반)';
    
    if (experienceLevel === 'beginner') {
      frequency = 'quarterly';
      method = 'time-based';
      description = '분기별 리밸런싱 (시간 기반)';
    } else if (experienceLevel === 'advanced' || experienceLevel === 'expert') {
      if (availableTime === 'full-time' && riskTolerance >= 7) {
        frequency = 'weekly';
        method = 'dynamic';
        description = '주간 리밸런싱 (동적 조정)';
      } else {
        frequency = 'bi-weekly';
        method = 'threshold';
        description = '격주 리밸런싱 (임계값 기반)';
      }
    }
    
    return {
      frequency,
      method,
      description,
      threshold: this._getRebalancingThreshold(experienceLevel)
    };
  }

  /**
   * 리밸런싱 임계값 계산
   * @private
   */
  _getRebalancingThreshold(experienceLevel) {
    switch (experienceLevel) {
      case 'beginner': return 0.15; // 15%
      case 'intermediate': return 0.10; // 10%
      case 'advanced': return 0.08; // 8%
      case 'expert': return 0.05; // 5%
      default: return 0.10;
    }
  }

  /**
   * 리스크 관리 전략 계산
   * @private
   */
  _getRiskManagement(userProfile) {
    const { experienceLevel, riskTolerance, availableTime } = userProfile;
    
    let stopLoss = 0.05; // 5%
    let maxDrawdown = 0.15; // 15%
    let positionSize = 0.1; // 10%
    let hedging = false;
    
    // 경험 수준에 따른 조정
    if (experienceLevel === 'beginner') {
      stopLoss = 0.03; // 3%
      maxDrawdown = 0.10; // 10%
      positionSize = 0.05; // 5%
    } else if (experienceLevel === 'intermediate') {
      stopLoss = 0.05; // 5%
      maxDrawdown = 0.15; // 15%
      positionSize = 0.10; // 10%
    } else if (experienceLevel === 'advanced') {
      stopLoss = 0.08; // 8%
      maxDrawdown = 0.20; // 20%
      positionSize = 0.15; // 15%
      hedging = true;
    } else if (experienceLevel === 'expert') {
      stopLoss = 0.10; // 10%
      maxDrawdown = 0.25; // 25%
      positionSize = 0.20; // 20%
      hedging = true;
    }
    
    // 리스크 허용도에 따른 조정
    if (riskTolerance <= 3) {
      stopLoss *= 0.7;
      maxDrawdown *= 0.7;
      positionSize *= 0.7;
    } else if (riskTolerance >= 8) {
      stopLoss *= 1.3;
      maxDrawdown *= 1.3;
      positionSize *= 1.3;
    }
    
    return {
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(stopLoss * 2 * 100) / 100, // 2:1 비율
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      positionSize: Math.round(positionSize * 100) / 100,
      hedging,
      riskRewardRatio: 2.0,
      maxDailyLoss: Math.round(maxDrawdown * 0.3 * 100) / 100, // 일일 최대 손실
      description: this._getRiskManagementDescription(experienceLevel, riskTolerance)
    };
  }

  /**
   * 리스크 관리 설명 생성
   * @private
   */
  _getRiskManagementDescription(experienceLevel, riskTolerance) {
    if (experienceLevel === 'beginner') {
      return '보수적 리스크 관리 (낮은 손절, 작은 포지션)';
    } else if (experienceLevel === 'intermediate') {
      return '균형잡힌 리스크 관리 (중간 손절, 적당한 포지션)';
    } else if (experienceLevel === 'advanced') {
      return '적극적 리스크 관리 (헤징 포함, 동적 조정)';
    } else {
      return '전문가급 리스크 관리 (고급 헤징, 복합 전략)';
    }
  }

  /**
   * 포지션 사이징 방법
   * @private
   */
  _getPositionSizingMethod(userProfile) {
    const { experienceLevel, riskTolerance } = userProfile;

    if (experienceLevel === 'beginner' || riskTolerance <= 3) {
      return {
        method: 'fixed',
        description: '고정 비율 포지션 사이징',
        percentage: 10 // 계좌의 10%
      };
    } else if (experienceLevel === 'expert' && riskTolerance >= 8) {
      return {
        method: 'kelly',
        description: '켈리 공식 기반 포지션 사이징',
        maxPercentage: 25
      };
    } else {
      return {
        method: 'risk_based',
        description: '리스크 기반 포지션 사이징',
        riskPerTrade: 2 // 거래당 2% 리스크
      };
    }
  }

  /**
   * 신호 필터 생성
   * @private
   */
  _generateSignalFilters(userProfile) {
    const { personalizationSettings, riskTolerance } = userProfile;

    return {
      minConfidence: personalizationSettings.signalSensitivity * 10,
      preferredTypes: personalizationSettings.preferredSignalTypes || ['technical'],
      timeFilter: this._getTimeFilter(userProfile),
      volumeFilter: this._getVolumeFilter(userProfile),
      volatilityFilter: this._getVolatilityFilter(userProfile)
    };
  }

  /**
   * 시간 필터 설정
   * @private
   */
  _getTimeFilter(userProfile) {
    const { availableTime, experienceLevel } = userProfile;
    
    let minTimeframe = '1h';
    let maxTimeframe = '1d';
    let preferredTimeframes = ['4h', '1d'];
    
    if (availableTime === 'minimal') {
      minTimeframe = '4h';
      maxTimeframe = '1w';
      preferredTimeframes = ['1d', '1w'];
    } else if (availableTime === 'part-time') {
      minTimeframe = '1h';
      maxTimeframe = '1d';
      preferredTimeframes = ['4h', '1d'];
    } else if (availableTime === 'full-time') {
      minTimeframe = '15m';
      maxTimeframe = '4h';
      preferredTimeframes = ['1h', '4h'];
    }
    
    return {
      minTimeframe,
      maxTimeframe,
      preferredTimeframes,
      description: `${minTimeframe} ~ ${maxTimeframe} 타임프레임 권장`
    };
  }

  /**
   * 볼륨 필터 설정
   * @private
   */
  _getVolumeFilter(userProfile) {
    const { experienceLevel, riskTolerance } = userProfile;
    
    let minVolume = 1000000; // $1M
    let volumeMultiplier = 1.0;
    
    if (experienceLevel === 'beginner') {
      minVolume = 5000000; // $5M (더 안전한 코인)
      volumeMultiplier = 1.5;
    } else if (experienceLevel === 'intermediate') {
      minVolume = 2000000; // $2M
      volumeMultiplier = 1.2;
    } else if (experienceLevel === 'advanced' || experienceLevel === 'expert') {
      minVolume = 500000; // $500K (더 많은 기회)
      volumeMultiplier = 0.8;
    }
    
    return {
      minVolume,
      volumeMultiplier,
      description: `최소 거래량: $${(minVolume / 1000000).toFixed(1)}M 이상`
    };
  }

  /**
   * 변동성 필터 설정
   * @private
   */
  _getVolatilityFilter(userProfile) {
    const { experienceLevel, riskTolerance } = userProfile;
    
    let maxVolatility = 0.15; // 15%
    let volatilityTolerance = 'medium';
    
    if (experienceLevel === 'beginner' || riskTolerance <= 3) {
      maxVolatility = 0.10; // 10%
      volatilityTolerance = 'low';
    } else if (experienceLevel === 'intermediate') {
      maxVolatility = 0.15; // 15%
      volatilityTolerance = 'medium';
    } else if (experienceLevel === 'advanced' || experienceLevel === 'expert') {
      maxVolatility = 0.25; // 25%
      volatilityTolerance = 'high';
    }
    
    return {
      maxVolatility,
      volatilityTolerance,
      description: `최대 변동성: ${(maxVolatility * 100).toFixed(1)}% (${volatilityTolerance} 수준)`
    };
  }

  /**
   * 포지션 사이징 계산
   * @private
   */
  _calculatePositionSizing(userProfile, marketData) {
    const stopLoss = this._calculateStopLoss(userProfile);
    
    return {
      recommendedSize: this._getRecommendedPositionSize(userProfile, marketData),
      scaling: this._getPositionScaling(userProfile)
    };
  }

  /**
   * 권장 포지션 크기 계산
   * @private
   */
  _getRecommendedPositionSize(userProfile, marketData) {
    const { riskTolerance, experienceLevel } = userProfile;
    
    let baseSize = 0.05; // 5%
    
    if (experienceLevel === 'beginner') {
      baseSize = 0.02; // 2%
    } else if (experienceLevel === 'intermediate') {
      baseSize = 0.05; // 5%
    } else if (experienceLevel === 'advanced') {
      baseSize = 0.10; // 10%
    } else if (experienceLevel === 'expert') {
      baseSize = 0.15; // 15%
    }
    
    // 리스크 허용도에 따른 조정
    if (riskTolerance <= 3) {
      baseSize *= 0.5;
    } else if (riskTolerance >= 8) {
      baseSize *= 1.5;
    }
    
    return Math.round(baseSize * 100) / 100;
  }

  /**
   * 포지션 스케일링 전략
   * @private
   */
  _getPositionScaling(userProfile) {
    const { experienceLevel } = userProfile;
    
    if (experienceLevel === 'beginner') {
      return {
        method: 'fixed',
        description: '고정 포지션 크기'
      };
    } else if (experienceLevel === 'intermediate') {
      return {
        method: 'volatility-adjusted',
        description: '변동성 조정 포지션'
      };
    } else {
      return {
        method: 'dynamic',
        description: '동적 포지션 조정'
      };
    }
  }

  /**
   * 알림 설정 최적화
   * @private
   */
  _optimizeAlertSettings(userProfile) {
    const { availableTime, experienceLevel } = userProfile;
    
    return {
      email: {
        frequency: this._getOptimalEmailFrequency(userProfile),
        priority: this._getEmailPriority(userProfile)
      },
      push: {
        enabled: availableTime !== 'minimal',
        frequency: availableTime === 'full-time' ? 'high' : 'medium'
      }
    };
  }

  /**
   * 최적 이메일 빈도
   * @private
   */
  _getOptimalEmailFrequency(userProfile) {
    const { availableTime } = userProfile;
    
    if (availableTime === 'minimal') {
      return 'daily';
    } else if (availableTime === 'part-time') {
      return 'twice-daily';
    } else {
      return 'as-needed';
    }
  }

  /**
   * 이메일 우선순위
   * @private
   */
  _getEmailPriority(userProfile) {
    const { experienceLevel } = userProfile;
    
    if (experienceLevel === 'beginner') {
      return 'high';
    } else if (experienceLevel === 'intermediate') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 시장 조건 적응
   * @private
   */
  _adaptToMarketConditions(userProfile, marketData) {
    return {
      bullMarket: this._getBullMarketAdaptation(userProfile),
      bearMarket: this._getBearMarketAdaptation(userProfile),
      sidewaysMarket: this._getSidewaysMarketAdaptation(userProfile),
      highVolatility: this._getHighVolatilityAdaptation(userProfile)
    };
  }

  /**
   * 상승장 적응 전략
   * @private
   */
  _getBullMarketAdaptation(userProfile) {
    return {
      strategy: 'momentum',
      description: '모멘텀 기반 매수 전략',
      riskAdjustment: 1.2
    };
  }

  /**
   * 하락장 적응 전략
   * @private
   */
  _getBearMarketAdaptation(userProfile) {
    return {
      strategy: 'defensive',
      description: '방어적 포지션 관리',
      riskAdjustment: 0.7
    };
  }

  /**
   * 횡보장 적응 전략
   * @private
   */
  _getSidewaysMarketAdaptation(userProfile) {
    return {
      strategy: 'range-trading',
      description: '레인지 트레이딩',
      riskAdjustment: 0.9
    };
  }

  /**
   * 고변동성 적응 전략
   * @private
   */
  _getHighVolatilityAdaptation(userProfile) {
    return {
      strategy: 'volatility-adjusted',
      description: '변동성 조정 포지션',
      riskAdjustment: 0.8
    };
  }

  /**
   * 추천 신뢰도 계산
   * @private
   */
  _calculateRecommendationConfidence(userProfile) {
    const { experienceLevel, riskTolerance } = userProfile;
    
    let confidence = 0.7; // 기본 70%
    
    if (experienceLevel === 'beginner') {
      confidence = 0.8; // 초보자는 더 보수적
    } else if (experienceLevel === 'intermediate') {
      confidence = 0.75;
    } else if (experienceLevel === 'advanced') {
      confidence = 0.7;
    } else if (experienceLevel === 'expert') {
      confidence = 0.65; // 전문가는 더 공격적
    }
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * 시간 필터 설정 (중복 제거)
   * @private
   */
  _getTimeFilterOld(userProfile) {
    const { activeHours, availableTime } = userProfile;

    if (availableTime === 'minimal') {
      return {
        enabled: true,
        description: '활성 시간대만 신호 수신',
        hours: activeHours
      };
    }

    return {
      enabled: false,
      description: '24시간 신호 수신'
    };
  }

  /**
   * 포지션 사이징 계산
   * @private
   */
  _calculatePositionSizing(userProfile, marketData) {
    const { maxPositionSize, riskTolerance } = userProfile;
    const stopLoss = this._calculateStopLoss(userProfile);

    return {
      maxPositionValue: maxPositionSize,
      riskPerTrade: (maxPositionSize * stopLoss.percentage) / 100,
      recommendedSize: this._getRecommendedPositionSize(userProfile, marketData),
      scaling: this._getPositionScaling(userProfile)
    };
  }

  /**
   * 추천 포지션 사이즈 계산
   * @private
   */
  _getRecommendedPositionSize(userProfile, marketData) {
    const { maxPositionSize, riskTolerance } = userProfile;
    const baseSize = maxPositionSize * 0.1; // 기본 10%

    // 시장 변동성에 따른 조정
    let volatilityMultiplier = 1;
    if (marketData.volatility) {
      if (marketData.volatility > 0.8) {
        volatilityMultiplier = 0.7; // 고변동성 시장에서는 포지션 크기 감소
      } else if (marketData.volatility < 0.3) {
        volatilityMultiplier = 1.2; // 저변동성 시장에서는 포지션 크기 증가
      }
    }

    // 위험 감수도에 따른 조정
    const riskMultiplier = riskTolerance / 5; // 1-2 범위

    return Math.round(baseSize * volatilityMultiplier * riskMultiplier);
  }

  /**
   * 알림 설정 최적화
   * @private
   */
  _optimizeAlertSettings(userProfile) {
    const { notificationSettings, availableTime, experienceLevel } = userProfile;

    return {
      email: {
        enabled: notificationSettings.email.enabled,
        frequency: this._getOptimalEmailFrequency(userProfile),
        priority: this._getEmailPriority(userProfile)
      },
      push: {
        enabled: notificationSettings.push.enabled,
        highPriorityOnly: experienceLevel === 'beginner' || availableTime === 'minimal'
      },
      discord: {
        enabled: notificationSettings.discord.enabled,
        webhookUrl: notificationSettings.discord.webhookUrl
      }
    };
  }

  /**
   * 시장 상황 적응
   * @private
   */
  _adaptToMarketConditions(userProfile, marketData) {
    const adaptations = {
      bullMarket: this._getBullMarketAdaptation(userProfile),
      bearMarket: this._getBearMarketAdaptation(userProfile),
      sidewaysMarket: this._getSidewaysMarketAdaptation(userProfile),
      highVolatility: this._getHighVolatilityAdaptation(userProfile)
    };

    // 현재 시장 상황에 따른 적응 전략 선택
    if (marketData.trend === 'bull') {
      return adaptations.bullMarket;
    } else if (marketData.trend === 'bear') {
      return adaptations.bearMarket;
    } else if (marketData.volatility > 0.8) {
      return adaptations.highVolatility;
    } else {
      return adaptations.sidewaysMarket;
    }
  }

  /**
   * 추천 신뢰도 계산
   * @private
   */
  _calculateRecommendationConfidence(userProfile) {
    let confidence = 0.5; // 기본 50%

    // 프로필 완성도
    confidence += (userProfile.profileCompleteness / 100) * 0.3;

    // 거래 경험
    if (userProfile.learningData && userProfile.learningData.totalTrades > 10) {
      confidence += 0.2;
    }

    // 성공률
    if (userProfile.learningData && userProfile.learningData.totalTrades > 0) {
      const successRate = userProfile.learningData.successfulTrades / userProfile.learningData.totalTrades;
      if (successRate > 0.6) {
        confidence += 0.2;
      } else if (successRate < 0.3) {
        confidence -= 0.1;
      }
    }

    return Math.min(1, Math.max(0.3, confidence));
  }

  /**
   * 캐시 클리어
   */
  clearCache(userId = null) {
    if (userId) {
      this.recommendationCache.delete(`recommendations_${userId}`);
    } else {
      this.recommendationCache.clear();
    }
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.recommendationCache.size,
      entries: Array.from(this.recommendationCache.keys())
    };
  }
}

module.exports = new PersonalizationService();
