const BaseStrategy = require('./BaseStrategy');
const ScalpingStrategy = require('./ScalpingStrategy');
const DayTradingStrategy = require('./DayTradingStrategy');
const SwingTradingStrategy = require('./SwingTradingStrategy');
const LongTermStrategy = require('./LongTermStrategy');
const RejectStrategy = require('./RejectStrategy');

/**
 * 전략 팩토리 클래스
 * 시그널 타입별로 적절한 전략을 선택하고 생성
 */
class StrategyFactory {
  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * 전략 초기화
   */
  initializeStrategies() {
    this.strategies.set('SCALPING', new ScalpingStrategy());
    this.strategies.set('DAY_TRADING', new DayTradingStrategy());
    this.strategies.set('SWING_TRADING', new SwingTradingStrategy());
    this.strategies.set('LONG_TERM', new LongTermStrategy());
    this.strategies.set('REJECT', new RejectStrategy());
  }

  /**
   * 전략 생성
   * @param {string} timeframe - 전략 타임프레임
   * @returns {BaseStrategy} 생성된 전략
   */
  createStrategy(timeframe) {
    const strategy = this.strategies.get(timeframe);
    
    if (!strategy) {
      throw new Error(`Unknown strategy for timeframe: ${timeframe}`);
    }

    return strategy;
  }

  /**
   * 시그널 타입에 따른 전략 선택
   * @param {string} timeframe - 시그널 타임프레임
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {BaseStrategy} 선택된 전략
   */
  selectStrategy(timeframe, signalData, marketData) {
    const strategy = this.strategies.get(timeframe);
    
    if (!strategy) {
      throw new Error(`Unknown strategy for timeframe: ${timeframe}`);
    }

    // REJECT와 LONG_TERM 전략은 항상 실행 가능
    if (timeframe === 'REJECT' || timeframe === 'LONG_TERM') {
      return strategy;
    }

    // 전략 실행 가능 여부 확인
    if (!strategy.canExecute(signalData, marketData)) {
      throw new Error(`Strategy ${timeframe} cannot execute with current market conditions`);
    }

    return strategy;
  }

  /**
   * 모든 전략에 대해 실행 가능 여부 확인
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Array} 실행 가능한 전략 목록
   */
  getAvailableStrategies(signalData, marketData) {
    const availableStrategies = [];

    for (const [timeframe, strategy] of this.strategies) {
      try {
        if (strategy.canExecute(signalData, marketData)) {
          availableStrategies.push({
            timeframe: timeframe,
            strategy: strategy,
            confidence: this.calculateStrategyConfidence(strategy, signalData, marketData)
          });
        }
      } catch (error) {
        // 전략 실행 불가능한 경우 무시
        continue;
      }
    }

    // 신뢰도 순으로 정렬
    return availableStrategies.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 최적 전략 선택 (다중 전략 비교)
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 최적 전략 정보
   */
  selectOptimalStrategy(signalData, marketData) {
    const availableStrategies = this.getAvailableStrategies(signalData, marketData);
    
    if (availableStrategies.length === 0) {
      throw new Error('No available strategies for current market conditions');
    }

    // 가장 높은 신뢰도를 가진 전략 선택
    const optimalStrategy = availableStrategies[0];
    
    return {
      strategy: optimalStrategy.strategy,
      timeframe: optimalStrategy.timeframe,
      confidence: optimalStrategy.confidence,
      alternatives: availableStrategies.slice(1), // 대안 전략들
      reason: this.getSelectionReason(optimalStrategy, signalData, marketData)
    };
  }

  /**
   * 전략별 성과 비교
   * @param {Array} trades - 거래 기록
   * @returns {Object} 전략별 성과 비교
   */
  compareStrategyPerformance(trades) {
    const performanceByStrategy = new Map();

    // 전략별로 거래 기록 분류
    trades.forEach(trade => {
      const timeframe = trade.timeframe;
      if (!performanceByStrategy.has(timeframe)) {
        performanceByStrategy.set(timeframe, []);
      }
      performanceByStrategy.get(timeframe).push(trade);
    });

    // 전략별 성과 계산
    const comparison = {};
    for (const [timeframe, strategyTrades] of performanceByStrategy) {
      const strategy = this.strategies.get(timeframe);
      if (strategy) {
        comparison[timeframe] = {
          performance: strategy.calculatePerformance(strategyTrades),
          strategy: strategy.name,
          tradeCount: strategyTrades.length
        };
      }
    }

    return comparison;
  }

  /**
   * 전략 파라미터 최적화
   * @param {string} timeframe - 전략 타임프레임
   * @param {Array} historicalTrades - 과거 거래 기록
   * @returns {Object} 최적화된 파라미터
   */
  optimizeStrategyParameters(timeframe, historicalTrades) {
    const strategy = this.strategies.get(timeframe);
    if (!strategy) {
      throw new Error(`Strategy not found for timeframe: ${timeframe}`);
    }

    // 전략별 최적화 로직
    switch (timeframe) {
      case 'SCALPING':
        return this.optimizeScalpingParameters(historicalTrades);
      case 'DAY_TRADING':
        return this.optimizeDayTradingParameters(historicalTrades);
      case 'SWING_TRADING':
        return this.optimizeSwingTradingParameters(historicalTrades);
      case 'LONG_TERM':
        return this.optimizeLongTermParameters(historicalTrades);
      default:
        throw new Error(`Optimization not implemented for timeframe: ${timeframe}`);
    }
  }

  /**
   * 전략 신뢰도 계산
   * @param {BaseStrategy} strategy - 전략 객체
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {number} 신뢰도 (0-1)
   */
  calculateStrategyConfidence(strategy, signalData, marketData) {
    try {
      const entryAnalysis = strategy.analyzeEntry(signalData, marketData);
      return entryAnalysis.confidence || 0.5;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 전략 선택 이유 생성
   * @param {Object} selectedStrategy - 선택된 전략
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {string} 선택 이유
   */
  getSelectionReason(selectedStrategy, signalData, marketData) {
    const { timeframe, strategy, confidence } = selectedStrategy;
    const { finalScore, volatility, volumeRatio, technicalStrength } = signalData;
    
    const reasons = [];
    
    // 신뢰도 기반 이유
    if (confidence > 0.8) reasons.push('매우 높은 신뢰도');
    else if (confidence > 0.6) reasons.push('높은 신뢰도');
    else if (confidence > 0.4) reasons.push('적절한 신뢰도');
    
    // 시그널 강도 기반 이유
    if (finalScore > 80) reasons.push('매우 강한 시그널');
    else if (finalScore > 60) reasons.push('강한 시그널');
    else if (finalScore > 40) reasons.push('적절한 시그널');
    
    // 변동성 기반 이유
    if (timeframe === 'SCALPING' && volatility > 10) reasons.push('스캘핑에 적합한 변동성');
    if (timeframe === 'DAY_TRADING' && volatility > 5) reasons.push('데이트레이딩에 적합한 변동성');
    if (timeframe === 'SWING_TRADING' && volatility > 3) reasons.push('스윙트레이딩에 적합한 변동성');
    if (timeframe === 'LONG_TERM' && volatility < 8) reasons.push('장기투자에 적합한 안정성');
    
    // 거래량 기반 이유
    if (volumeRatio > 2) reasons.push('거래량 급증');
    else if (volumeRatio > 1.5) reasons.push('거래량 증가');
    
    // 기술적 신호 기반 이유
    if (technicalStrength > 0.7) reasons.push('강한 기술적 신호');
    else if (technicalStrength > 0.5) reasons.push('적절한 기술적 신호');
    
    return reasons.join(', ') || `${timeframe} 전략이 현재 시장 조건에 가장 적합`;
  }

  /**
   * 스캘핑 전략 파라미터 최적화
   * @param {Array} trades - 거래 기록
   * @returns {Object} 최적화된 파라미터
   */
  optimizeScalpingParameters(trades) {
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    return {
      targetProfit: Math.max(avgWin * 0.8, 0.3), // 평균 수익의 80%
      stopLoss: Math.min(Math.abs(avgLoss) * 0.8, 0.5), // 평균 손실의 80%
      maxHoldTime: this.calculateOptimalHoldTime(trades, 300), // 5분 기준
      minVolumeRatio: this.calculateOptimalVolumeRatio(trades, 2.0),
      minVolatility: this.calculateOptimalVolatility(trades, 6)
    };
  }

  /**
   * 데이트레이딩 전략 파라미터 최적화
   * @param {Array} trades - 거래 기록
   * @returns {Object} 최적화된 파라미터
   */
  optimizeDayTradingParameters(trades) {
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    return {
      targetProfit: Math.max(avgWin * 0.8, 1.5), // 평균 수익의 80%
      stopLoss: Math.min(Math.abs(avgLoss) * 0.8, 1.2), // 평균 손실의 80%
      maxHoldTime: this.calculateOptimalHoldTime(trades, 1440), // 24시간 기준
      minVolumeRatio: this.calculateOptimalVolumeRatio(trades, 1.5),
      minVolatility: this.calculateOptimalVolatility(trades, 4)
    };
  }

  /**
   * 스윙트레이딩 전략 파라미터 최적화
   * @param {Array} trades - 거래 기록
   * @returns {Object} 최적화된 파라미터
   */
  optimizeSwingTradingParameters(trades) {
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    return {
      targetProfit: Math.max(avgWin * 0.8, 4.0), // 평균 수익의 80%
      stopLoss: Math.min(Math.abs(avgLoss) * 0.8, 2.0), // 평균 손실의 80%
      maxHoldTime: this.calculateOptimalHoldTime(trades, 10080), // 7일 기준
      minVolumeRatio: this.calculateOptimalVolumeRatio(trades, 1.2),
      minVolatility: this.calculateOptimalVolatility(trades, 3)
    };
  }

  /**
   * 장기투자 전략 파라미터 최적화
   * @param {Array} trades - 거래 기록
   * @returns {Object} 최적화된 파라미터
   */
  optimizeLongTermParameters(trades) {
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    return {
      targetProfit: Math.max(avgWin * 0.8, 15.0), // 평균 수익의 80%
      stopLoss: Math.min(Math.abs(avgLoss) * 0.8, 8.0), // 평균 손실의 80%
      maxHoldTime: this.calculateOptimalHoldTime(trades, 2592000), // 30일 기준
      minVolumeRatio: this.calculateOptimalVolumeRatio(trades, 1.0),
      minVolatility: this.calculateOptimalVolatility(trades, 2)
    };
  }

  /**
   * 최적 보유 시간 계산
   * @param {Array} trades - 거래 기록
   * @param {number} defaultTime - 기본 시간
   * @returns {number} 최적 보유 시간
   */
  calculateOptimalHoldTime(trades, defaultTime) {
    if (trades.length === 0) return defaultTime;
    
    const avgHoldTime = trades.reduce((sum, trade) => sum + trade.holdTime, 0) / trades.length;
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    
    if (winningTrades.length > 0) {
      const avgWinningHoldTime = winningTrades.reduce((sum, trade) => sum + trade.holdTime, 0) / winningTrades.length;
      return Math.min(avgWinningHoldTime * 1.2, defaultTime); // 승리 거래의 120%
    }
    
    return Math.min(avgHoldTime * 0.8, defaultTime); // 평균의 80%
  }

  /**
   * 최적 거래량 비율 계산
   * @param {Array} trades - 거래 기록
   * @param {number} defaultRatio - 기본 비율
   * @returns {number} 최적 거래량 비율
   */
  calculateOptimalVolumeRatio(trades, defaultRatio) {
    if (trades.length === 0) return defaultRatio;
    
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    if (winningTrades.length === 0) return defaultRatio;
    
    const avgVolumeRatio = winningTrades.reduce((sum, trade) => sum + (trade.volumeRatio || 1), 0) / winningTrades.length;
    return Math.max(avgVolumeRatio * 0.8, defaultRatio); // 승리 거래의 80%
  }

  /**
   * 최적 변동성 계산
   * @param {Array} trades - 거래 기록
   * @param {number} defaultVolatility - 기본 변동성
   * @returns {number} 최적 변동성
   */
  calculateOptimalVolatility(trades, defaultVolatility) {
    if (trades.length === 0) return defaultVolatility;
    
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    if (winningTrades.length === 0) return defaultVolatility;
    
    const avgVolatility = winningTrades.reduce((sum, trade) => sum + (trade.volatility || 0), 0) / winningTrades.length;
    return Math.max(avgVolatility * 0.8, defaultVolatility); // 승리 거래의 80%
  }

  /**
   * 전략별 통계 정보 반환
   * @returns {Object} 전략별 통계
   */
  getStrategyStatistics() {
    const statistics = {};
    
    for (const [timeframe, strategy] of this.strategies) {
      statistics[timeframe] = {
        name: strategy.name,
        riskLevel: strategy.riskLevel,
        minLiquidity: strategy.minLiquidity,
        maxPositionSize: strategy.maxPositionSize,
        targetProfit: strategy.targetProfit,
        stopLoss: strategy.stopLoss,
        maxHoldTime: strategy.maxHoldTime,
        description: strategy.getDescription()
      };
    }
    
    return statistics;
  }

  /**
   * 전략 업데이트
   * @param {string} timeframe - 전략 타임프레임
   * @param {Object} parameters - 새로운 파라미터
   */
  updateStrategy(timeframe, parameters) {
    const strategy = this.strategies.get(timeframe);
    if (!strategy) {
      throw new Error(`Strategy not found for timeframe: ${timeframe}`);
    }
    
    strategy.setParameters(parameters);
  }

  /**
   * 모든 전략 리셋
   */
  resetStrategies() {
    this.initializeStrategies();
  }
}

module.exports = StrategyFactory;
