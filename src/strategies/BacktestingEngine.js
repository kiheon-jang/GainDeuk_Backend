/**
 * 백테스팅 엔진
 * 전략별 성과 검증 및 최적화
 */
class BacktestingEngine {
  constructor() {
    this.startDate = null;
    this.endDate = null;
    this.initialBalance = 10000; // 초기 자본 10,000
    this.commission = 0.001; // 수수료 0.1%
    this.slippage = 0.0005; // 슬리피지 0.05%
    this.results = [];
  }

  /**
   * 백테스팅 실행
   * @param {BaseStrategy} strategy - 테스트할 전략
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameters - 백테스팅 파라미터
   * @returns {Object} 백테스팅 결과
   */
  runBacktest(strategy, historicalData, parameters = {}) {
    this.initializeBacktest(parameters);
    
    const portfolio = {
      balance: this.initialBalance,
      positions: [],
      trades: [],
      equity: [this.initialBalance],
      drawdown: [0],
      maxDrawdown: 0
    };

    // 시간순으로 데이터 정렬
    const sortedData = historicalData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 각 시점에서 전략 실행
    for (let i = 0; i < sortedData.length; i++) {
      const currentData = sortedData[i];
      const marketData = this.prepareMarketData(currentData, sortedData, i);
      
      // 기존 포지션 관리
      this.manageExistingPositions(portfolio, marketData, strategy);
      
      // 새로운 진입 신호 확인
      if (strategy.canExecute(currentData, marketData)) {
        const entryAnalysis = strategy.analyzeEntry(currentData, marketData);
        this.executeEntry(portfolio, entryAnalysis, marketData, strategy);
      }
      
      // 포트폴리오 업데이트
      this.updatePortfolio(portfolio, marketData);
    }
    
    // 모든 포지션 청산
    this.closeAllPositions(portfolio, sortedData[sortedData.length - 1]);
    
    // 결과 계산
    const results = this.calculateResults(portfolio, strategy);
    
    return results;
  }

  /**
   * 백테스팅 초기화
   * @param {Object} parameters - 파라미터
   */
  initializeBacktest(parameters) {
    this.startDate = parameters.startDate || new Date('2023-01-01');
    this.endDate = parameters.endDate || new Date('2024-01-01');
    this.initialBalance = parameters.initialBalance || 10000;
    this.commission = parameters.commission || 0.001;
    this.slippage = parameters.slippage || 0.0005;
    this.results = [];
  }

  /**
   * 시장 데이터 준비
   * @param {Object} currentData - 현재 데이터
   * @param {Array} allData - 전체 데이터
   * @param {number} index - 현재 인덱스
   * @returns {Object} 시장 데이터
   */
  prepareMarketData(currentData, allData, index) {
    const marketData = {
      currentPrice: currentData.price,
      timestamp: currentData.timestamp,
      volume: currentData.volume,
      volatility: this.calculateVolatility(allData, index),
      spread: this.calculateSpread(currentData),
      support: this.calculateSupport(allData, index),
      resistance: this.calculateResistance(allData, index),
      trend: this.calculateTrend(allData, index),
      rsi: this.calculateRSI(allData, index),
      macd: this.calculateMACD(allData, index),
      bollinger: this.calculateBollingerBands(allData, index),
      movingAverages: this.calculateMovingAverages(allData, index)
    };
    
    return marketData;
  }

  /**
   * 기존 포지션 관리
   * @param {Object} portfolio - 포트폴리오
   * @param {Object} marketData - 시장 데이터
   * @param {BaseStrategy} strategy - 전략
   */
  manageExistingPositions(portfolio, marketData, strategy) {
    const positionsToClose = [];
    
    portfolio.positions.forEach((position, index) => {
      const exitAnalysis = strategy.analyzeExit(position, marketData);
      
      if (exitAnalysis.shouldExit) {
        positionsToClose.push({ index, position, exitAnalysis });
      }
    });
    
    // 포지션 청산 (역순으로 처리하여 인덱스 문제 방지)
    positionsToClose.reverse().forEach(({ index, position, exitAnalysis }) => {
      this.executeExit(portfolio, position, exitAnalysis, marketData);
      portfolio.positions.splice(index, 1);
    });
  }

  /**
   * 진입 실행
   * @param {Object} portfolio - 포트폴리오
   * @param {Object} entryAnalysis - 진입 분석
   * @param {Object} marketData - 시장 데이터
   * @param {BaseStrategy} strategy - 전략
   */
  executeEntry(portfolio, entryAnalysis, marketData, strategy) {
    const { action, entryPrice, confidence } = entryAnalysis;
    
    // 포지션 사이즈 계산
    const accountData = {
      balance: portfolio.balance,
      riskTolerance: 0.5,
      currentPositions: portfolio.positions
    };
    
    const positionSize = strategy.calculatePositionSize(entryAnalysis, accountData, marketData);
    
    if (positionSize.size <= 0) return;
    
    // 포지션 생성
    const position = {
      symbol: marketData.symbol || 'UNKNOWN',
      direction: action,
      entryPrice: entryPrice,
      quantity: positionSize.quantity,
      entryTime: marketData.timestamp,
      confidence: confidence,
      size: positionSize.size,
      stopLoss: null,
      takeProfit: null,
      trailingStop: null
    };
    
    // 손절매/익절매 설정
    const stopLoss = this.calculateStopLoss(position, marketData);
    const takeProfit = this.calculateTakeProfit(position, marketData);
    
    position.stopLoss = stopLoss.price;
    position.takeProfit = takeProfit.price;
    
    // 포지션 추가
    portfolio.positions.push(position);
    
    // 수수료 차감
    const commission = portfolio.balance * positionSize.size * this.commission;
    portfolio.balance -= commission;
  }

  /**
   * 청산 실행
   * @param {Object} portfolio - 포트폴리오
   * @param {Object} position - 포지션
   * @param {Object} exitAnalysis - 청산 분석
   * @param {Object} marketData - 시장 데이터
   */
  executeExit(portfolio, position, exitAnalysis, marketData) {
    const { exitPrice, profitLoss, holdTime, exitReason } = exitAnalysis;
    
    // 수익/손실 계산
    const pnl = (exitPrice - position.entryPrice) * position.quantity;
    const commission = Math.abs(pnl) * this.commission;
    const netPnl = pnl - commission;
    
    // 포트폴리오 업데이트
    portfolio.balance += netPnl;
    
    // 거래 기록 추가
    const trade = {
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice: exitPrice,
      quantity: position.quantity,
      entryTime: position.entryTime,
      exitTime: marketData.timestamp,
      holdTime: holdTime,
      profitLoss: (netPnl / (position.entryPrice * position.quantity)) * 100,
      pnl: netPnl,
      commission: commission,
      exitReason: exitReason,
      confidence: position.confidence
    };
    
    portfolio.trades.push(trade);
  }

  /**
   * 모든 포지션 청산
   * @param {Object} portfolio - 포트폴리오
   * @param {Object} finalData - 마지막 데이터
   */
  closeAllPositions(portfolio, finalData) {
    portfolio.positions.forEach(position => {
      const exitAnalysis = {
        shouldExit: true,
        exitPrice: finalData.price,
        profitLoss: ((finalData.price - position.entryPrice) / position.entryPrice) * 100,
        holdTime: new Date(finalData.timestamp) - new Date(position.entryTime),
        exitReason: '백테스팅 종료'
      };
      
      this.executeExit(portfolio, position, exitAnalysis, finalData);
    });
    
    portfolio.positions = [];
  }

  /**
   * 포트폴리오 업데이트
   * @param {Object} portfolio - 포트폴리오
   * @param {Object} marketData - 시장 데이터
   */
  updatePortfolio(portfolio, marketData) {
    // 포지션 가치 계산
    let totalPositionValue = 0;
    portfolio.positions.forEach(position => {
      const positionValue = marketData.currentPrice * position.quantity;
      totalPositionValue += positionValue;
    });
    
    // 총 자산 계산
    const totalEquity = portfolio.balance + totalPositionValue;
    portfolio.equity.push(totalEquity);
    
    // 드로우다운 계산
    const peak = Math.max(...portfolio.equity);
    const currentDrawdown = (peak - totalEquity) / peak;
    portfolio.drawdown.push(currentDrawdown);
    
    if (currentDrawdown > portfolio.maxDrawdown) {
      portfolio.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * 결과 계산
   * @param {Object} portfolio - 포트폴리오
   * @param {BaseStrategy} strategy - 전략
   * @returns {Object} 백테스팅 결과
   */
  calculateResults(portfolio, strategy) {
    const trades = portfolio.trades;
    const totalTrades = trades.length;
    
    if (totalTrades === 0) {
      return {
        strategy: strategy.name,
        totalTrades: 0,
        winRate: 0,
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        avgHoldTime: 0,
        trades: []
      };
    }
    
    // 기본 통계
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const winRate = (winningTrades.length / totalTrades) * 100;
    const totalReturn = ((portfolio.balance - this.initialBalance) / this.initialBalance) * 100;
    
    // 연간 수익률 계산
    const days = (new Date(this.endDate) - new Date(this.startDate)) / (1000 * 60 * 60 * 24);
    const annualizedReturn = Math.pow(1 + totalReturn / 100, 365 / days) - 1;
    
    // 샤프 비율 계산
    const returns = trades.map(trade => trade.profitLoss);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev !== 0 ? (avgReturn - this.riskFreeRate) / stdDev : 0;
    
    // 수익 팩터
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = totalLosses !== 0 ? totalWins / totalLosses : 0;
    
    // 평균 수익/손실
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    // 평균 보유 시간
    const avgHoldTime = trades.reduce((sum, trade) => sum + trade.holdTime, 0) / totalTrades;
    
    return {
      strategy: strategy.name,
      timeframe: strategy.timeframe,
      totalTrades,
      winRate,
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown: portfolio.maxDrawdown * 100,
      profitFactor,
      avgWin,
      avgLoss,
      avgHoldTime,
      finalBalance: portfolio.balance,
      equity: portfolio.equity,
      drawdown: portfolio.drawdown,
      trades: trades
    };
  }

  /**
   * 변동성 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {number} 변동성
   */
  calculateVolatility(data, index) {
    const period = 20;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // 백분율로 변환
  }

  /**
   * 스프레드 계산
   * @param {Object} data - 데이터
   * @returns {number} 스프레드
   */
  calculateSpread(data) {
    // 실제로는 bid/ask 데이터 필요
    return 0.1; // 기본 0.1%
  }

  /**
   * 지지선 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {number} 지지선
   */
  calculateSupport(data, index) {
    const period = 20;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    return Math.min(...prices) * 0.98; // 최저가의 98%
  }

  /**
   * 저항선 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {number} 저항선
   */
  calculateResistance(data, index) {
    const period = 20;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    return Math.max(...prices) * 1.02; // 최고가의 102%
  }

  /**
   * 추세 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {Object} 추세 정보
   */
  calculateTrend(data, index) {
    const period = 20;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    if (prices.length < 2) return { direction: 'neutral', strength: 0 };
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    const direction = change > 0.02 ? 'up' : change < -0.02 ? 'down' : 'neutral';
    const strength = Math.abs(change) * 10; // 0-1 범위로 정규화
    
    return { direction, strength };
  }

  /**
   * RSI 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {number} RSI
   */
  calculateRSI(data, index) {
    const period = 14;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    if (prices.length < 2) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  /**
   * MACD 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {Object} MACD 정보
   */
  calculateMACD(data, index) {
    const ema12 = this.calculateEMA(data, index, 12);
    const ema26 = this.calculateEMA(data, index, 26);
    
    const macd = ema12 - ema26;
    const signal = this.calculateEMA(data, index, 9, macd);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  /**
   * EMA 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @param {number} period - 기간
   * @param {number} value - 값 (선택사항)
   * @returns {number} EMA
   */
  calculateEMA(data, index, period, value = null) {
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => value || d.price);
    
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * 볼린저 밴드 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {Object} 볼린저 밴드 정보
   */
  calculateBollingerBands(data, index) {
    const period = 20;
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
    
    const sma = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * stdDev),
      middle: sma,
      lower: sma - (2 * stdDev),
      current: prices[prices.length - 1]
    };
  }

  /**
   * 이동평균 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @returns {Object} 이동평균 정보
   */
  calculateMovingAverages(data, index) {
    return {
      sma20: this.calculateSMA(data, index, 20),
      sma50: this.calculateSMA(data, index, 50),
      sma200: this.calculateSMA(data, index, 200)
    };
  }

  /**
   * SMA 계산
   * @param {Array} data - 데이터
   * @param {number} index - 현재 인덱스
   * @param {number} period - 기간
   * @returns {number} SMA
   */
  calculateSMA(data, index, period) {
    const start = Math.max(0, index - period + 1);
    const prices = data.slice(start, index + 1).map(d => d.price);
    
    if (prices.length === 0) return 0;
    
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  /**
   * 손절매 계산
   * @param {Object} position - 포지션
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 손절매 정보
   */
  calculateStopLoss(position, marketData) {
    const { entryPrice, direction } = position;
    const { volatility } = marketData;
    
    const stopLossPercent = volatility * 0.5; // 변동성의 50%
    
    const stopLossPrice = direction === 'BUY'
      ? entryPrice * (1 - stopLossPercent / 100)
      : entryPrice * (1 + stopLossPercent / 100);
    
    return { price: stopLossPrice, percentage: stopLossPercent };
  }

  /**
   * 익절매 계산
   * @param {Object} position - 포지션
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 익절매 정보
   */
  calculateTakeProfit(position, marketData) {
    const { entryPrice, direction } = position;
    const { volatility } = marketData;
    
    const takeProfitPercent = volatility * 1.5; // 변동성의 150%
    
    const takeProfitPrice = direction === 'BUY'
      ? entryPrice * (1 + takeProfitPercent / 100)
      : entryPrice * (1 - takeProfitPercent / 100);
    
    return { price: takeProfitPrice, percentage: takeProfitPercent };
  }

  /**
   * 다중 전략 비교 백테스팅
   * @param {Array} strategies - 전략 목록
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameters - 파라미터
   * @returns {Object} 비교 결과
   */
  compareStrategies(strategies, historicalData, parameters = {}) {
    const results = {};
    
    strategies.forEach(strategy => {
      try {
        const result = this.runBacktest(strategy, historicalData, parameters);
        results[strategy.timeframe] = result;
      } catch (error) {
        console.error(`Backtest failed for ${strategy.name}:`, error);
        results[strategy.timeframe] = {
          strategy: strategy.name,
          error: error.message
        };
      }
    });
    
    return results;
  }

  /**
   * 파라미터 최적화
   * @param {BaseStrategy} strategy - 전략
   * @param {Array} historicalData - 과거 데이터
   * @param {Object} parameterRanges - 파라미터 범위
   * @returns {Object} 최적화 결과
   */
  optimizeParameters(strategy, historicalData, parameterRanges) {
    const bestResult = { sharpeRatio: -Infinity, parameters: null };
    
    // 간단한 그리드 서치 (실제로는 더 정교한 최적화 필요)
    for (const targetProfit of parameterRanges.targetProfit) {
      for (const stopLoss of parameterRanges.stopLoss) {
        for (const maxHoldTime of parameterRanges.maxHoldTime) {
          // 전략 파라미터 설정
          strategy.setParameters({
            targetProfit,
            stopLoss,
            maxHoldTime
          });
          
          // 백테스팅 실행
          const result = this.runBacktest(strategy, historicalData);
          
          // 샤프 비율 기준으로 최적 파라미터 선택
          if (result.sharpeRatio > bestResult.sharpeRatio) {
            bestResult.sharpeRatio = result.sharpeRatio;
            bestResult.parameters = { targetProfit, stopLoss, maxHoldTime };
            bestResult.result = result;
          }
        }
      }
    }
    
    return bestResult;
  }
}

module.exports = BacktestingEngine;
