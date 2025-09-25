const StrategyFactory = require('./StrategyFactory');
const RiskManager = require('./RiskManager');
const BacktestingEngine = require('./BacktestingEngine');

/**
 * 거래 전략 서비스
 * SignalCalculatorService와 전략 시스템을 연결하는 통합 서비스
 */
class TradingStrategyService {
  constructor() {
    this.strategyFactory = new StrategyFactory();
    this.riskManager = new RiskManager();
    this.backtestingEngine = new BacktestingEngine();
    this.activePositions = new Map(); // 활성 포지션 관리
    this.tradeHistory = []; // 거래 기록
  }

  /**
   * 시그널 기반 거래 전략 실행
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @param {Object} accountData - 계정 데이터
   * @returns {Object} 거래 전략 결과
   */
  executeTradingStrategy(signalData, marketData, accountData) {
    try {
      const { timeframe } = signalData;
      
      // 전략 선택
      const strategy = this.strategyFactory.selectStrategy(timeframe, signalData, marketData);
      
      // 진입 분석
      const entryAnalysis = strategy.analyzeEntry(signalData, marketData);
      
      // 포지션 사이즈 계산
      const positionSize = this.riskManager.calculatePositionSize(signalData, accountData, marketData);
      
      // 손절매/익절매 계산
      const stopLoss = this.riskManager.calculateStopLoss({
        entryPrice: entryAnalysis.entryPrice,
        quantity: positionSize.quantity,
        direction: entryAnalysis.action
      }, signalData, marketData);
      
      const takeProfit = this.riskManager.calculateTakeProfit({
        entryPrice: entryAnalysis.entryPrice,
        quantity: positionSize.quantity,
        direction: entryAnalysis.action
      }, signalData, marketData);
      
      // 포트폴리오 리스크 평가
      const portfolioRisk = this.riskManager.evaluatePortfolioRisk(
        Array.from(this.activePositions.values()), 
        accountData
      );
      
      // 거래 실행 여부 결정
      const shouldExecute = this.shouldExecuteTrade(
        entryAnalysis, 
        positionSize, 
        portfolioRisk, 
        signalData
      );
      
      return {
        strategy: strategy.name,
        timeframe: timeframe,
        shouldExecute: shouldExecute,
        entryAnalysis: entryAnalysis,
        positionSize: positionSize,
        stopLoss: stopLoss,
        takeProfit: takeProfit,
        portfolioRisk: portfolioRisk,
        confidence: entryAnalysis.confidence,
        riskReward: entryAnalysis.riskReward,
        expectedDuration: entryAnalysis.expectedDuration,
        recommendations: this.generateRecommendations(entryAnalysis, positionSize, portfolioRisk)
      };
      
    } catch (error) {
      console.error('Trading strategy execution failed:', error);
      return {
        error: error.message,
        shouldExecute: false
      };
    }
  }

  /**
   * 포지션 관리
   * @param {string} positionId - 포지션 ID
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 포지션 관리 결과
   */
  managePosition(positionId, marketData) {
    const position = this.activePositions.get(positionId);
    if (!position) {
      return { error: 'Position not found' };
    }
    
    try {
      const strategy = this.strategyFactory.selectStrategy(position.timeframe, position.signalData, marketData);
      
      // 청산 분석
      const exitAnalysis = strategy.analyzeExit(position, marketData);
      
      // 리스크 관리
      const riskManagement = strategy.manageRisk(position, marketData);
      
      // 트레일링 스톱 계산
      const trailingStop = this.riskManager.calculateTrailingStop(position, marketData);
      
      // 포지션 업데이트
      position.currentPrice = marketData.currentPrice;
      position.profitLoss = ((marketData.currentPrice - position.entryPrice) / position.entryPrice) * 100;
      position.trailingStop = trailingStop.active ? trailingStop.price : position.trailingStop;
      
      // 청산 여부 결정
      const shouldExit = exitAnalysis.shouldExit || 
                        (trailingStop.active && 
                         ((position.direction === 'BUY' && marketData.currentPrice <= trailingStop.price) ||
                          (position.direction === 'SELL' && marketData.currentPrice >= trailingStop.price)));
      
      if (shouldExit) {
        this.closePosition(positionId, exitAnalysis, marketData);
      }
      
      return {
        position: position,
        exitAnalysis: exitAnalysis,
        riskManagement: riskManagement,
        trailingStop: trailingStop,
        shouldExit: shouldExit,
        actions: this.getPositionActions(exitAnalysis, riskManagement, trailingStop)
      };
      
    } catch (error) {
      console.error('Position management failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 포지션 청산
   * @param {string} positionId - 포지션 ID
   * @param {Object} exitAnalysis - 청산 분석
   * @param {Object} marketData - 시장 데이터
   */
  closePosition(positionId, exitAnalysis, marketData) {
    const position = this.activePositions.get(positionId);
    if (!position) return;
    
    // 거래 기록 생성
    const trade = {
      id: positionId,
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice: exitAnalysis.exitPrice,
      quantity: position.quantity,
      entryTime: position.entryTime,
      exitTime: Date.now(),
      holdTime: exitAnalysis.holdTime,
      profitLoss: exitAnalysis.profitLoss,
      exitReason: exitAnalysis.exitReason,
      strategy: position.strategy,
      timeframe: position.timeframe,
      confidence: position.confidence
    };
    
    // 거래 기록 추가
    this.tradeHistory.push(trade);
    
    // 포지션 제거
    this.activePositions.delete(positionId);
    
    console.log(`Position closed: ${positionId} - ${trade.profitLoss.toFixed(2)}%`);
  }

  /**
   * 거래 실행 여부 결정
   * @param {Object} entryAnalysis - 진입 분석
   * @param {Object} positionSize - 포지션 사이즈
   * @param {Object} portfolioRisk - 포트폴리오 리스크
   * @param {Object} signalData - 시그널 데이터
   * @returns {boolean} 거래 실행 여부
   */
  shouldExecuteTrade(entryAnalysis, positionSize, portfolioRisk, signalData) {
    // 기본 조건 확인
    if (entryAnalysis.confidence < 0.3) return false;
    if (positionSize.size <= 0) return false;
    if (portfolioRisk.riskPercentage > 20) return false; // 포트폴리오 리스크 20% 초과시 거부
    
    // 신호 강도 확인
    if (signalData.finalScore < 30) return false;
    
    // 리스크 스코어 확인
    if (signalData.riskScore > 90) return false;
    
    // 유동성 확인
    if (positionSize.size < 0.01) return false; // 최소 1% 포지션
    
    return true;
  }

  /**
   * 권장사항 생성
   * @param {Object} entryAnalysis - 진입 분석
   * @param {Object} positionSize - 포지션 사이즈
   * @param {Object} portfolioRisk - 포트폴리오 리스크
   * @returns {Array} 권장사항 목록
   */
  generateRecommendations(entryAnalysis, positionSize, portfolioRisk) {
    const recommendations = [];
    
    // 신뢰도 기반 권장사항
    if (entryAnalysis.confidence > 0.8) {
      recommendations.push('매우 높은 신뢰도로 거래 실행 권장');
    } else if (entryAnalysis.confidence > 0.6) {
      recommendations.push('높은 신뢰도로 거래 실행 권장');
    } else if (entryAnalysis.confidence > 0.4) {
      recommendations.push('적절한 신뢰도로 거래 실행 가능');
    } else {
      recommendations.push('낮은 신뢰도로 거래 주의 필요');
    }
    
    // 포지션 사이즈 기반 권장사항
    if (positionSize.size > 0.15) {
      recommendations.push('큰 포지션 사이즈로 리스크 관리 주의');
    } else if (positionSize.size < 0.05) {
      recommendations.push('작은 포지션 사이즈로 안전한 거래');
    }
    
    // 포트폴리오 리스크 기반 권장사항
    if (portfolioRisk.riskPercentage > 15) {
      recommendations.push('포트폴리오 리스크가 높아 포지션 크기 조정 권장');
    }
    
    // 리스크 리워드 기반 권장사항
    if (entryAnalysis.riskReward > 2) {
      recommendations.push('우수한 리스크 리워드 비율');
    } else if (entryAnalysis.riskReward < 1) {
      recommendations.push('낮은 리스크 리워드 비율로 주의 필요');
    }
    
    return recommendations;
  }

  /**
   * 포지션 액션 결정
   * @param {Object} exitAnalysis - 청산 분석
   * @param {Object} riskManagement - 리스크 관리
   * @param {Object} trailingStop - 트레일링 스톱
   * @returns {Array} 액션 목록
   */
  getPositionActions(exitAnalysis, riskManagement, trailingStop) {
    const actions = [];
    
    if (exitAnalysis.shouldExit) {
      actions.push('포지션 청산');
    }
    
    if (trailingStop.active) {
      actions.push('트레일링 스톱 적용');
    }
    
    if (riskManagement.riskLevel === 'high') {
      actions.push('리스크 관리 강화');
    }
    
    if (riskManagement.actions.length > 0) {
      actions.push(...riskManagement.actions);
    }
    
    return actions;
  }

  /**
   * 전략별 성과 분석
   * @param {string} timeframe - 전략 타임프레임 (선택사항)
   * @returns {Object} 성과 분석 결과
   */
  analyzePerformance(timeframe = null) {
    const trades = timeframe ? 
      this.tradeHistory.filter(trade => trade.timeframe === timeframe) :
      this.tradeHistory;
    
    if (trades.length === 0) {
      return { error: 'No trades found' };
    }
    
    // 전략별 성과 계산
    const performanceByStrategy = {};
    const timeframes = [...new Set(trades.map(trade => trade.timeframe))];
    
    timeframes.forEach(tf => {
      const strategyTrades = trades.filter(trade => trade.timeframe === tf);
      const strategy = this.strategyFactory.strategies.get(tf);
      
      if (strategy) {
        performanceByStrategy[tf] = strategy.calculatePerformance(strategyTrades);
      }
    });
    
    // 전체 성과 계산
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const winRate = (winningTrades.length / totalTrades) * 100;
    const totalReturn = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    return {
      totalTrades,
      winRate,
      totalReturn,
      avgWin,
      avgLoss,
      profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
      performanceByStrategy,
      recentTrades: trades.slice(-10), // 최근 10개 거래
      bestTrade: trades.reduce((best, trade) => 
        trade.profitLoss > best.profitLoss ? trade : best, trades[0]),
      worstTrade: trades.reduce((worst, trade) => 
        trade.profitLoss < worst.profitLoss ? trade : worst, trades[0])
    };
  }

  /**
   * 백테스팅 실행
   * @param {string} timeframe - 전략 타임프레임
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameters - 백테스팅 파라미터
   * @returns {Object} 백테스팅 결과
   */
  runBacktest(timeframe, historicalData, parameters = {}) {
    try {
      const strategy = this.strategyFactory.strategies.get(timeframe);
      if (!strategy) {
        throw new Error(`Strategy not found for timeframe: ${timeframe}`);
      }
      
      return this.backtestingEngine.runBacktest(strategy, historicalData, parameters);
    } catch (error) {
      console.error('Backtest failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 전략 비교 백테스팅
   * @param {Array} timeframes - 비교할 전략 타임프레임들
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameters - 백테스팅 파라미터
   * @returns {Object} 비교 결과
   */
  compareStrategies(timeframes, historicalData, parameters = {}) {
    try {
      const strategies = timeframes.map(tf => this.strategyFactory.strategies.get(tf)).filter(Boolean);
      return this.backtestingEngine.compareStrategies(strategies, historicalData, parameters);
    } catch (error) {
      console.error('Strategy comparison failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 전략 파라미터 최적화
   * @param {string} timeframe - 전략 타임프레임
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameterRanges - 파라미터 범위
   * @returns {Object} 최적화 결과
   */
  optimizeStrategy(timeframe, historicalData, parameterRanges) {
    try {
      const strategy = this.strategyFactory.strategies.get(timeframe);
      if (!strategy) {
        throw new Error(`Strategy not found for timeframe: ${timeframe}`);
      }
      
      return this.backtestingEngine.optimizeParameters(strategy, historicalData, parameterRanges);
    } catch (error) {
      console.error('Strategy optimization failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 활성 포지션 조회
   * @returns {Array} 활성 포지션 목록
   */
  getActivePositions() {
    return Array.from(this.activePositions.values());
  }

  /**
   * 거래 기록 조회
   * @param {number} limit - 조회할 거래 수
   * @returns {Array} 거래 기록
   */
  getTradeHistory(limit = 100) {
    return this.tradeHistory.slice(-limit);
  }

  /**
   * 포트폴리오 상태 조회
   * @param {Object} accountData - 계정 데이터
   * @returns {Object} 포트폴리오 상태
   */
  getPortfolioStatus(accountData) {
    const activePositions = this.getActivePositions();
    const portfolioRisk = this.riskManager.evaluatePortfolioRisk(activePositions, accountData);
    const performance = this.analyzePerformance();
    
    return {
      activePositions: activePositions.length,
      portfolioRisk: portfolioRisk,
      performance: performance,
      totalTrades: this.tradeHistory.length,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 전략 설정 조회
   * @param {string} timeframe - 전략 타임프레임
   * @returns {Object} 전략 설정
   */
  getStrategyConfig(timeframe) {
    try {
      const strategy = this.strategyFactory.createStrategy(timeframe);
      return {
        name: strategy.name,
        riskLevel: strategy.riskLevel,
        minLiquidity: strategy.minLiquidity,
        maxPositionSize: strategy.maxPositionSize,
        targetProfit: strategy.targetProfit,
        stopLoss: strategy.stopLoss,
        maxHoldTime: strategy.maxHoldTime,
        description: `${strategy.name} 전략 - ${timeframe} 타임프레임`
      };
    } catch (error) {
      throw new Error(`Strategy config not found for timeframe: ${timeframe}`);
    }
  }

  /**
   * 전략 통계 조회
   * @returns {Object} 전략 통계
   */
  getStrategyStatistics() {
    return this.strategyFactory.getStrategyStatistics();
  }

  /**
   * 리스크 관리 설정 업데이트
   * @param {Object} riskSettings - 리스크 설정
   */
  updateRiskSettings(riskSettings) {
    Object.assign(this.riskManager, riskSettings);
  }

  /**
   * 전략 파라미터 업데이트
   * @param {string} timeframe - 전략 타임프레임
   * @param {Object} parameters - 새로운 파라미터
   */
  updateStrategyParameters(timeframe, parameters) {
    this.strategyFactory.updateStrategy(timeframe, parameters);
  }

  /**
   * 서비스 리셋
   */
  reset() {
    this.activePositions.clear();
    this.tradeHistory = [];
    this.strategyFactory.resetStrategies();
  }
}

module.exports = TradingStrategyService;
