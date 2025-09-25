const BaseStrategy = require('./BaseStrategy');

/**
 * 스캘핑 전략 클래스
 * 고빈도 거래, 빠른 진입/청산, 작은 수익률 누적
 */
class ScalpingStrategy extends BaseStrategy {
  constructor() {
    super('Scalping', 'SCALPING');
    this.riskLevel = 'high';
    this.minLiquidity = 'B+';
    this.maxPositionSize = 0.05; // 5% 최대 포지션
    this.targetProfit = 0.5; // 0.5% 목표 수익
    this.stopLoss = 0.3; // 0.3% 손절매
    this.maxHoldTime = 300; // 5분 최대 보유
    this.minVolumeRatio = 2.0; // 최소 2배 거래량 증가
    this.minVolatility = 6; // 최소 6% 변동성
  }

  canExecute(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, liquidityGrade, technicalStrength } = signalData;
    
    return (
      finalScore >= 65 &&
      volatility >= this.minVolatility &&
      volumeRatio >= this.minVolumeRatio &&
      (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+') &&
      technicalStrength >= 0.55 &&
      marketData.spread <= 0.1 // 스프레드 0.1% 이하
    );
  }

  analyzeEntry(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, technicalStrength } = signalData;
    const { currentPrice, bid, ask, volume } = marketData;

    // 스캘핑 진입 조건 분석
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const entryPrice = this.calculateEntryPrice(marketData);
    const confidence = this.calculateConfidence(signalData, marketData);

    return {
      action: finalScore >= 50 ? 'BUY' : 'SELL',
      entryPrice: entryPrice,
      confidence: confidence,
      entryScore: entryScore,
      reason: this.getEntryReason(signalData, marketData),
      urgency: this.calculateUrgency(signalData, marketData),
      expectedDuration: this.calculateExpectedDuration(signalData),
      riskReward: this.calculateRiskReward(signalData)
    };
  }

  analyzeExit(position, marketData) {
    const { entryPrice, entryTime, currentPrice, volume } = position;
    const { currentPrice: marketPrice, volume: currentVolume } = marketData;
    
    const profitLoss = ((marketPrice - entryPrice) / entryPrice) * 100;
    const holdTime = Date.now() - entryTime;
    
    // 빠른 청산 조건들
    const quickExitConditions = {
      profitTarget: profitLoss >= this.targetProfit,
      stopLoss: profitLoss <= -this.stopLoss,
      timeLimit: holdTime >= this.maxHoldTime * 1000,
      volumeDrop: currentVolume < volume * 0.5, // 거래량 50% 감소
      spreadWidening: marketData.spread > 0.2 // 스프레드 확대
    };

    const shouldExit = Object.values(quickExitConditions).some(condition => condition);
    
    return {
      shouldExit: shouldExit,
      exitPrice: marketPrice,
      exitReason: this.getExitReason(quickExitConditions),
      profitLoss: profitLoss,
      holdTime: holdTime,
      urgency: this.calculateExitUrgency(quickExitConditions)
    };
  }

  calculatePositionSize(signalData, accountData) {
    const { finalScore, volatility, liquidityGrade } = signalData;
    const { balance, riskTolerance } = accountData;
    
    // 스캘핑은 작은 포지션으로 빠른 회전
    let baseSize = 0.02; // 기본 2%
    
    // 신호 강도에 따른 조정
    if (finalScore >= 75) baseSize += 0.01;
    if (finalScore >= 85) baseSize += 0.01;
    
    // 유동성에 따른 조정
    if (liquidityGrade === 'A+') baseSize += 0.01;
    if (liquidityGrade === 'A') baseSize += 0.005;
    
    // 변동성에 따른 조정 (높은 변동성 = 작은 포지션)
    if (volatility > 15) baseSize *= 0.5;
    if (volatility > 25) baseSize *= 0.5;
    
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
      profitProtection: profitLoss > this.targetProfit * 0.5, // 목표의 50% 달성시 보호
      volatilityStop: marketData.volatility > 30 // 극심한 변동성
    };

    return {
      riskLevel: this.calculateRiskLevel(riskSignals),
      actions: this.getRiskActions(riskSignals),
      warnings: this.getRiskWarnings(riskSignals)
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

    return {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldTime,
      strategy: this.name,
      timeframe: this.timeframe
    };
  }

  // 헬퍼 메서드들
  calculateEntryScore(signalData, marketData) {
    const { finalScore, technicalStrength, volatility, volumeRatio } = signalData;
    const { spread, volume } = marketData;
    
    let score = finalScore;
    
    // 기술적 강도 보너스
    if (technicalStrength > 0.7) score += 5;
    if (technicalStrength > 0.8) score += 5;
    
    // 변동성 보너스
    if (volatility > 10) score += 3;
    if (volatility > 15) score += 2;
    
    // 거래량 보너스
    if (volumeRatio > 3) score += 3;
    if (volumeRatio > 5) score += 2;
    
    // 스프레드 페널티
    if (spread > 0.05) score -= 5;
    if (spread > 0.1) score -= 10;
    
    return Math.min(score, 100);
  }

  calculateEntryPrice(marketData) {
    const { bid, ask, currentPrice } = marketData;
    // 스캘핑은 시장가 주문이 일반적
    return currentPrice;
  }

  calculateConfidence(signalData, marketData) {
    const entryScore = this.calculateEntryScore(signalData, marketData);
    return Math.min(entryScore / 100, 1);
  }

  getEntryReason(signalData, marketData) {
    const { volatility, volumeRatio, technicalStrength } = signalData;
    const reasons = [];
    
    if (volatility >= 10) reasons.push('높은 변동성');
    if (volumeRatio >= 3) reasons.push('급증한 거래량');
    if (technicalStrength >= 0.7) reasons.push('강한 기술적 신호');
    if (marketData.spread <= 0.05) reasons.push('좁은 스프레드');
    
    return reasons.join(', ') || '스캘핑 조건 충족';
  }

  calculateUrgency(signalData, marketData) {
    const { volumeRatio, volatility } = signalData;
    let urgency = 0.5;
    
    if (volumeRatio > 5) urgency += 0.3;
    if (volatility > 15) urgency += 0.2;
    if (marketData.spread <= 0.03) urgency += 0.1;
    
    return Math.min(urgency, 1);
  }

  calculateExpectedDuration(signalData) {
    const { volatility, volumeRatio } = signalData;
    let duration = 300; // 기본 5분
    
    // 높은 변동성 = 짧은 보유시간
    if (volatility > 15) duration *= 0.7;
    if (volatility > 25) duration *= 0.5;
    
    // 높은 거래량 = 짧은 보유시간
    if (volumeRatio > 5) duration *= 0.8;
    
    return Math.max(duration, 60); // 최소 1분
  }

  calculateRiskReward(signalData) {
    return this.targetProfit / this.stopLoss;
  }

  getExitReason(conditions) {
    if (conditions.profitTarget) return '목표 수익 달성';
    if (conditions.stopLoss) return '손절매';
    if (conditions.timeLimit) return '시간 초과';
    if (conditions.volumeDrop) return '거래량 감소';
    if (conditions.spreadWidening) return '스프레드 확대';
    return '기타 조건';
  }

  calculateExitUrgency(conditions) {
    if (conditions.stopLoss || conditions.spreadWidening) return 1.0;
    if (conditions.profitTarget) return 0.8;
    if (conditions.timeLimit) return 0.6;
    if (conditions.volumeDrop) return 0.4;
    return 0.2;
  }

  calculateTrailingStop(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 0) {
      // 수익이 날 때는 트레일링 스톱 적용
      return currentPrice * (1 - this.stopLoss / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  calculateRiskLevel(riskSignals) {
    const riskCount = Object.values(riskSignals).filter(Boolean).length;
    if (riskCount >= 3) return 'high';
    if (riskCount >= 2) return 'medium';
    if (riskCount >= 1) return 'low';
    return 'minimal';
  }

  getRiskActions(riskSignals) {
    const actions = [];
    if (riskSignals.trailingStop) actions.push('트레일링 스톱 적용');
    if (riskSignals.timeStop) actions.push('시간 기반 청산');
    if (riskSignals.profitProtection) actions.push('수익 보호');
    if (riskSignals.volatilityStop) actions.push('변동성 기반 청산');
    return actions;
  }

  getRiskWarnings(riskSignals) {
    const warnings = [];
    if (riskSignals.volatilityStop) warnings.push('극심한 변동성 주의');
    if (riskSignals.timeStop) warnings.push('보유 시간 초과');
    return warnings;
  }
}

module.exports = ScalpingStrategy;
