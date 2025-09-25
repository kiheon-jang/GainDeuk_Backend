const BaseStrategy = require('./BaseStrategy');

/**
 * 데이트레이딩 전략 클래스
 * 일일 거래, 기술적 분석 중심, 중간 수익률 목표
 */
class DayTradingStrategy extends BaseStrategy {
  constructor() {
    super('Day Trading', 'DAY_TRADING');
    this.riskLevel = 'medium-high';
    this.minLiquidity = 'B';
    this.maxPositionSize = 0.1; // 10% 최대 포지션
    this.targetProfit = 2.0; // 2% 목표 수익
    this.stopLoss = 1.0; // 1% 손절매
    this.maxHoldTime = 1440; // 24시간 최대 보유
    this.minVolumeRatio = 1.5; // 최소 1.5배 거래량 증가
    this.minVolatility = 4; // 최소 4% 변동성
    this.technicalThreshold = 0.45; // 최소 기술적 신호 강도
  }

  canExecute(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, liquidityGrade, technicalStrength } = signalData;
    
    return (
      finalScore >= 45 &&
      volatility >= this.minVolatility &&
      volumeRatio >= this.minVolumeRatio &&
      (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+' || liquidityGrade === 'B') &&
      technicalStrength >= this.technicalThreshold &&
      marketData.spread <= 0.2 // 스프레드 0.2% 이하
    );
  }

  analyzeEntry(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, technicalStrength } = signalData;
    const { currentPrice, bid, ask, volume, rsi, macd, bollinger } = marketData;

    // 데이트레이딩 진입 조건 분석
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const entryPrice = this.calculateEntryPrice(marketData);
    const confidence = this.calculateConfidence(signalData, marketData);
    const technicalSignals = this.analyzeTechnicalSignals(marketData);

    return {
      action: finalScore >= 50 ? 'BUY' : 'SELL',
      entryPrice: entryPrice,
      confidence: confidence,
      entryScore: entryScore,
      reason: this.getEntryReason(signalData, marketData, technicalSignals),
      urgency: this.calculateUrgency(signalData, marketData),
      expectedDuration: this.calculateExpectedDuration(signalData),
      riskReward: this.calculateRiskReward(signalData),
      technicalSignals: technicalSignals,
      supportResistance: this.analyzeSupportResistance(marketData)
    };
  }

  analyzeExit(position, marketData) {
    const { entryPrice, entryTime, currentPrice, volume } = position;
    const { currentPrice: marketPrice, volume: currentVolume, rsi, macd } = marketData;
    
    const profitLoss = ((marketPrice - entryPrice) / entryPrice) * 100;
    const holdTime = Date.now() - entryTime;
    
    // 데이트레이딩 청산 조건들
    const exitConditions = {
      profitTarget: profitLoss >= this.targetProfit,
      stopLoss: profitLoss <= -this.stopLoss,
      timeLimit: holdTime >= this.maxHoldTime * 1000,
      technicalExit: this.checkTechnicalExit(marketData),
      volumeDrop: currentVolume < volume * 0.3, // 거래량 70% 감소
      endOfDay: this.isEndOfDay(entryTime), // 거래일 종료
      supportBreak: this.checkSupportBreak(position, marketData),
      resistanceHit: this.checkResistanceHit(position, marketData)
    };

    const shouldExit = Object.values(exitConditions).some(condition => condition);
    
    return {
      shouldExit: shouldExit,
      exitPrice: marketPrice,
      exitReason: this.getExitReason(exitConditions),
      profitLoss: profitLoss,
      holdTime: holdTime,
      urgency: this.calculateExitUrgency(exitConditions),
      technicalExit: exitConditions.technicalExit
    };
  }

  calculatePositionSize(signalData, accountData) {
    const { finalScore, volatility, liquidityGrade, technicalStrength } = signalData;
    const { balance, riskTolerance } = accountData;
    
    // 데이트레이딩은 중간 포지션 크기
    let baseSize = 0.05; // 기본 5%
    
    // 신호 강도에 따른 조정
    if (finalScore >= 60) baseSize += 0.02;
    if (finalScore >= 70) baseSize += 0.02;
    if (finalScore >= 80) baseSize += 0.01;
    
    // 기술적 신호 강도에 따른 조정
    if (technicalStrength >= 0.6) baseSize += 0.01;
    if (technicalStrength >= 0.7) baseSize += 0.01;
    
    // 유동성에 따른 조정
    if (liquidityGrade === 'A+') baseSize += 0.02;
    if (liquidityGrade === 'A') baseSize += 0.01;
    if (liquidityGrade === 'B+') baseSize += 0.005;
    
    // 변동성에 따른 조정
    if (volatility > 10) baseSize *= 0.8;
    if (volatility > 15) baseSize *= 0.7;
    if (volatility > 20) baseSize *= 0.5;
    
    // 리스크 허용도에 따른 조정
    baseSize *= riskTolerance;
    
    return Math.min(baseSize, this.maxPositionSize);
  }

  manageRisk(position, marketData) {
    const { entryPrice, entryTime, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    const holdTime = Date.now() - entryTime;
    
    const riskSignals = {
      trailingStop: this.calculateTrailingStop(position, marketData),
      timeStop: holdTime >= this.maxHoldTime * 1000,
      profitProtection: profitLoss > this.targetProfit * 0.6, // 목표의 60% 달성시 보호
      volatilityStop: marketData.volatility > 25, // 극심한 변동성
      technicalStop: this.checkTechnicalStop(marketData),
      supportStop: this.checkSupportStop(position, marketData)
    };

    return {
      riskLevel: this.calculateRiskLevel(riskSignals),
      actions: this.getRiskActions(riskSignals),
      warnings: this.getRiskWarnings(riskSignals),
      stopLoss: this.calculateDynamicStopLoss(position, marketData)
    };
  }

  calculatePerformance(trades) {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.profitLoss > 0);
    const losingTrades = trades.filter(trade => trade.profitLoss < 0);
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
    
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    const avgHoldTime = totalTrades > 0 ? 
      trades.reduce((sum, trade) => sum + trade.holdTime, 0) / totalTrades : 0;
    
    const dailyReturns = this.calculateDailyReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);

    return {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldTime,
      dailyReturns,
      sharpeRatio,
      strategy: this.name,
      timeframe: this.timeframe
    };
  }

  // 헬퍼 메서드들
  calculateEntryScore(signalData, marketData) {
    const { finalScore, technicalStrength, volatility, volumeRatio } = signalData;
    const { spread, volume, rsi, macd } = marketData;
    
    let score = finalScore;
    
    // 기술적 신호 보너스
    if (technicalStrength > 0.6) score += 5;
    if (technicalStrength > 0.7) score += 5;
    if (technicalStrength > 0.8) score += 5;
    
    // RSI 보너스
    if (rsi && rsi > 30 && rsi < 70) score += 3; // 중립 구간
    if (rsi && (rsi < 30 || rsi > 70)) score += 5; // 과매도/과매수
    
    // MACD 보너스
    if (macd && macd.signal > 0) score += 3;
    
    // 변동성 보너스
    if (volatility > 6) score += 3;
    if (volatility > 10) score += 2;
    
    // 거래량 보너스
    if (volumeRatio > 2) score += 3;
    if (volumeRatio > 3) score += 2;
    
    // 스프레드 페널티
    if (spread > 0.1) score -= 3;
    if (spread > 0.2) score -= 5;
    
    return Math.min(score, 100);
  }

  calculateEntryPrice(marketData) {
    const { bid, ask, currentPrice } = marketData;
    // 데이트레이딩은 리미트 주문 선호
    return currentPrice;
  }

  calculateConfidence(signalData, marketData) {
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const technicalConfidence = this.calculateTechnicalConfidence(marketData);
    return (entryScore / 100 + technicalConfidence) / 2;
  }

  analyzeTechnicalSignals(marketData) {
    const { rsi, macd, bollinger, volume } = marketData;
    const signals = {
      rsi: this.analyzeRSI(rsi),
      macd: this.analyzeMACD(macd),
      bollinger: this.analyzeBollinger(bollinger),
      volume: this.analyzeVolume(volume)
    };
    
    return signals;
  }

  analyzeRSI(rsi) {
    if (!rsi) return { signal: 'neutral', strength: 0 };
    
    if (rsi < 30) return { signal: 'oversold', strength: 0.8 };
    if (rsi > 70) return { signal: 'overbought', strength: 0.8 };
    if (rsi > 40 && rsi < 60) return { signal: 'neutral', strength: 0.3 };
    
    return { signal: 'trending', strength: 0.6 };
  }

  analyzeMACD(macd) {
    if (!macd) return { signal: 'neutral', strength: 0 };
    
    if (macd.signal > 0 && macd.histogram > 0) return { signal: 'bullish', strength: 0.7 };
    if (macd.signal < 0 && macd.histogram < 0) return { signal: 'bearish', strength: 0.7 };
    
    return { signal: 'neutral', strength: 0.3 };
  }

  analyzeBollinger(bollinger) {
    if (!bollinger) return { signal: 'neutral', strength: 0 };
    
    const { upper, lower, middle, current } = bollinger;
    if (current <= lower) return { signal: 'oversold', strength: 0.8 };
    if (current >= upper) return { signal: 'overbought', strength: 0.8 };
    
    return { signal: 'neutral', strength: 0.4 };
  }

  analyzeVolume(volume) {
    if (!volume) return { signal: 'neutral', strength: 0 };
    
    const { current, average } = volume;
    const ratio = current / average;
    
    if (ratio > 2) return { signal: 'high', strength: 0.8 };
    if (ratio > 1.5) return { signal: 'above_average', strength: 0.6 };
    if (ratio < 0.5) return { signal: 'low', strength: 0.3 };
    
    return { signal: 'normal', strength: 0.4 };
  }

  getEntryReason(signalData, marketData, technicalSignals) {
    const { volatility, volumeRatio, technicalStrength } = signalData;
    const reasons = [];
    
    if (volatility >= 6) reasons.push('적절한 변동성');
    if (volumeRatio >= 2) reasons.push('거래량 증가');
    if (technicalStrength >= 0.6) reasons.push('강한 기술적 신호');
    
    // 기술적 신호 기반 이유
    if (technicalSignals.rsi.signal === 'oversold') reasons.push('RSI 과매도');
    if (technicalSignals.rsi.signal === 'overbought') reasons.push('RSI 과매수');
    if (technicalSignals.macd.signal === 'bullish') reasons.push('MACD 상승 신호');
    if (technicalSignals.macd.signal === 'bearish') reasons.push('MACD 하락 신호');
    
    return reasons.join(', ') || '데이트레이딩 조건 충족';
  }

  calculateUrgency(signalData, marketData) {
    const { volumeRatio, volatility, technicalStrength } = signalData;
    let urgency = 0.4;
    
    if (volumeRatio > 3) urgency += 0.2;
    if (volatility > 8) urgency += 0.2;
    if (technicalStrength > 0.7) urgency += 0.1;
    if (marketData.rsi && (marketData.rsi < 30 || marketData.rsi > 70)) urgency += 0.1;
    
    return Math.min(urgency, 1);
  }

  calculateExpectedDuration(signalData) {
    const { volatility, volumeRatio } = signalData;
    let duration = 720; // 기본 12시간
    
    // 변동성에 따른 조정
    if (volatility > 10) duration *= 0.8;
    if (volatility > 15) duration *= 0.6;
    
    // 거래량에 따른 조정
    if (volumeRatio > 3) duration *= 0.7;
    
    return Math.max(duration, 120); // 최소 2시간
  }

  calculateRiskReward(signalData) {
    return this.targetProfit / this.stopLoss;
  }

  analyzeSupportResistance(marketData) {
    const { currentPrice, support, resistance } = marketData;
    
    return {
      support: support,
      resistance: resistance,
      currentPrice: currentPrice,
      supportDistance: support ? ((currentPrice - support) / support) * 100 : null,
      resistanceDistance: resistance ? ((resistance - currentPrice) / currentPrice) * 100 : null
    };
  }

  checkTechnicalExit(marketData) {
    const { rsi, macd } = marketData;
    
    // RSI 기반 청산
    if (rsi && (rsi > 80 || rsi < 20)) return true;
    
    // MACD 기반 청산
    if (macd && macd.signal < 0 && macd.histogram < 0) return true;
    
    return false;
  }

  isEndOfDay(entryTime) {
    const now = new Date();
    const entry = new Date(entryTime);
    const hoursDiff = (now - entry) / (1000 * 60 * 60);
    
    // 24시간 경과 또는 거래일 종료
    return hoursDiff >= 24;
  }

  checkSupportBreak(position, marketData) {
    const { entryPrice } = position;
    const { support } = marketData;
    
    if (!support) return false;
    
    // 지지선 하향 돌파
    return marketData.currentPrice < support && entryPrice > support;
  }

  checkResistanceHit(position, marketData) {
    const { entryPrice } = position;
    const { resistance } = marketData;
    
    if (!resistance) return false;
    
    // 저항선 도달
    return marketData.currentPrice >= resistance * 0.98; // 2% 여유
  }

  getExitReason(conditions) {
    if (conditions.profitTarget) return '목표 수익 달성';
    if (conditions.stopLoss) return '손절매';
    if (conditions.timeLimit) return '시간 초과';
    if (conditions.technicalExit) return '기술적 청산 신호';
    if (conditions.volumeDrop) return '거래량 감소';
    if (conditions.endOfDay) return '거래일 종료';
    if (conditions.supportBreak) return '지지선 하향 돌파';
    if (conditions.resistanceHit) return '저항선 도달';
    return '기타 조건';
  }

  calculateExitUrgency(conditions) {
    if (conditions.stopLoss || conditions.supportBreak) return 1.0;
    if (conditions.profitTarget || conditions.resistanceHit) return 0.8;
    if (conditions.technicalExit) return 0.7;
    if (conditions.endOfDay) return 0.6;
    if (conditions.timeLimit) return 0.5;
    if (conditions.volumeDrop) return 0.3;
    return 0.2;
  }

  calculateTrailingStop(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 1) {
      // 1% 이상 수익시 트레일링 스톱 적용
      return currentPrice * (1 - this.stopLoss / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  checkTechnicalStop(marketData) {
    const { rsi, macd } = marketData;
    
    // RSI 극값에서 청산
    if (rsi && (rsi > 85 || rsi < 15)) return true;
    
    // MACD 신호 반전
    if (macd && macd.signal < 0 && macd.histogram < -0.1) return true;
    
    return false;
  }

  checkSupportStop(position, marketData) {
    const { entryPrice } = position;
    const { support } = marketData;
    
    if (!support) return false;
    
    // 지지선 근처에서 손절
    return marketData.currentPrice < support * 1.02; // 2% 여유
  }

  calculateRiskLevel(riskSignals) {
    const riskCount = Object.values(riskSignals).filter(Boolean).length;
    if (riskCount >= 4) return 'high';
    if (riskCount >= 3) return 'medium-high';
    if (riskCount >= 2) return 'medium';
    if (riskCount >= 1) return 'low';
    return 'minimal';
  }

  getRiskActions(riskSignals) {
    const actions = [];
    if (riskSignals.trailingStop) actions.push('트레일링 스톱 적용');
    if (riskSignals.timeStop) actions.push('시간 기반 청산');
    if (riskSignals.profitProtection) actions.push('수익 보호');
    if (riskSignals.technicalStop) actions.push('기술적 청산');
    if (riskSignals.supportStop) actions.push('지지선 기반 청산');
    return actions;
  }

  getRiskWarnings(riskSignals) {
    const warnings = [];
    if (riskSignals.volatilityStop) warnings.push('극심한 변동성 주의');
    if (riskSignals.timeStop) warnings.push('보유 시간 초과');
    if (riskSignals.supportStop) warnings.push('지지선 위험');
    return warnings;
  }

  calculateDynamicStopLoss(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 1.5) {
      // 1.5% 이상 수익시 동적 손절매
      return currentPrice * (1 - this.stopLoss * 0.5 / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  calculateTechnicalConfidence(marketData) {
    const { rsi, macd, bollinger } = marketData;
    let confidence = 0.5;
    
    if (rsi && (rsi < 30 || rsi > 70)) confidence += 0.2;
    if (macd && macd.signal > 0) confidence += 0.2;
    if (bollinger && bollinger.current <= bollinger.lower) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  calculateDailyReturns(trades) {
    // 일일 수익률 계산 로직
    const dailyReturns = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.exitTime).toISOString().split('T')[0];
      if (!dailyReturns[date]) dailyReturns[date] = 0;
      dailyReturns[date] += trade.profitLoss;
    });
    
    return Object.values(dailyReturns);
  }

  calculateSharpeRatio(dailyReturns) {
    if (dailyReturns.length === 0) return 0;
    
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev !== 0 ? avgReturn / stdDev : 0;
  }
}

module.exports = DayTradingStrategy;
