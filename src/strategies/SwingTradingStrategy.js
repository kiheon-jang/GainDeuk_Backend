const BaseStrategy = require('./BaseStrategy');

/**
 * 스윙트레이딩 전략 클래스
 * 중기 추세, 지지/저항 활용, 3-7일 보유
 */
class SwingTradingStrategy extends BaseStrategy {
  constructor() {
    super('Swing Trading', 'SWING_TRADING');
    this.riskLevel = 'medium';
    this.minLiquidity = 'C+';
    this.maxPositionSize = 0.15; // 15% 최대 포지션
    this.targetProfit = 5.0; // 5% 목표 수익
    this.stopLoss = 2.5; // 2.5% 손절매
    this.maxHoldTime = 10080; // 7일 최대 보유
    this.minVolumeRatio = 1.2; // 최소 1.2배 거래량 증가
    this.minVolatility = 3; // 최소 3% 변동성
    this.trendThreshold = 0.6; // 최소 추세 강도
  }

  canExecute(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, liquidityGrade, technicalStrength } = signalData;
    
    return (
      finalScore >= 35 &&
      volatility >= this.minVolatility &&
      volumeRatio >= this.minVolumeRatio &&
      (liquidityGrade === 'A+' || liquidityGrade === 'A' || liquidityGrade === 'B+' || 
       liquidityGrade === 'B' || liquidityGrade === 'C+') &&
      technicalStrength >= 0.3 &&
      marketData.spread <= 0.5 // 스프레드 0.5% 이하
    );
  }

  analyzeEntry(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, technicalStrength } = signalData;
    const { currentPrice, bid, ask, volume, trend, support, resistance } = marketData;

    // 스윙트레이딩 진입 조건 분석
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const entryPrice = this.calculateEntryPrice(marketData);
    const confidence = this.calculateConfidence(signalData, marketData);
    const trendAnalysis = this.analyzeTrend(marketData);
    const supportResistance = this.analyzeSupportResistance(marketData);

    return {
      action: finalScore >= 50 ? 'BUY' : 'SELL',
      entryPrice: entryPrice,
      confidence: confidence,
      entryScore: entryScore,
      reason: this.getEntryReason(signalData, marketData, trendAnalysis),
      urgency: this.calculateUrgency(signalData, marketData),
      expectedDuration: this.calculateExpectedDuration(signalData),
      riskReward: this.calculateRiskReward(signalData),
      trendAnalysis: trendAnalysis,
      supportResistance: supportResistance,
      momentum: this.analyzeMomentum(marketData)
    };
  }

  analyzeExit(position, marketData) {
    const { entryPrice, entryTime, currentPrice, volume } = position;
    const { currentPrice: marketPrice, volume: currentVolume, trend, support, resistance } = marketData;
    
    const profitLoss = ((marketPrice - entryPrice) / entryPrice) * 100;
    const holdTime = Date.now() - entryTime;
    
    // 스윙트레이딩 청산 조건들
    const exitConditions = {
      profitTarget: profitLoss >= this.targetProfit,
      stopLoss: profitLoss <= -this.stopLoss,
      timeLimit: holdTime >= this.maxHoldTime * 1000,
      trendReversal: this.checkTrendReversal(position, marketData),
      supportBreak: this.checkSupportBreak(position, marketData),
      resistanceHit: this.checkResistanceHit(position, marketData),
      momentumLoss: this.checkMomentumLoss(marketData),
      volumeDrop: currentVolume < volume * 0.2, // 거래량 80% 감소
      weeklyClose: this.isWeeklyClose(entryTime) // 주간 마감
    };

    const shouldExit = Object.values(exitConditions).some(condition => condition);
    
    return {
      shouldExit: shouldExit,
      exitPrice: marketPrice,
      exitReason: this.getExitReason(exitConditions),
      profitLoss: profitLoss,
      holdTime: holdTime,
      urgency: this.calculateExitUrgency(exitConditions),
      trendReversal: exitConditions.trendReversal,
      supportResistance: this.analyzeSupportResistance(marketData)
    };
  }

  calculatePositionSize(signalData, accountData) {
    const { finalScore, volatility, liquidityGrade, technicalStrength } = signalData;
    const { balance, riskTolerance } = accountData;
    
    // 스윙트레이딩은 중간-큰 포지션 크기
    let baseSize = 0.08; // 기본 8%
    
    // 신호 강도에 따른 조정
    if (finalScore >= 50) baseSize += 0.02;
    if (finalScore >= 60) baseSize += 0.02;
    if (finalScore >= 70) baseSize += 0.02;
    if (finalScore >= 80) baseSize += 0.01;
    
    // 기술적 신호 강도에 따른 조정
    if (technicalStrength >= 0.5) baseSize += 0.01;
    if (technicalStrength >= 0.6) baseSize += 0.01;
    if (technicalStrength >= 0.7) baseSize += 0.01;
    
    // 유동성에 따른 조정
    if (liquidityGrade === 'A+') baseSize += 0.03;
    if (liquidityGrade === 'A') baseSize += 0.02;
    if (liquidityGrade === 'B+') baseSize += 0.01;
    if (liquidityGrade === 'B') baseSize += 0.005;
    
    // 변동성에 따른 조정
    if (volatility > 8) baseSize *= 0.9;
    if (volatility > 12) baseSize *= 0.8;
    if (volatility > 18) baseSize *= 0.7;
    
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
      profitProtection: profitLoss > this.targetProfit * 0.7, // 목표의 70% 달성시 보호
      volatilityStop: marketData.volatility > 20, // 극심한 변동성
      trendStop: this.checkTrendStop(position, marketData),
      supportStop: this.checkSupportStop(position, marketData),
      weeklyStop: this.isWeeklyClose(entryTime)
    };

    return {
      riskLevel: this.calculateRiskLevel(riskSignals),
      actions: this.getRiskActions(riskSignals),
      warnings: this.getRiskWarnings(riskSignals),
      stopLoss: this.calculateDynamicStopLoss(position, marketData),
      takeProfit: this.calculateTakeProfit(position, marketData)
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
    
    const weeklyReturns = this.calculateWeeklyReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(weeklyReturns);
    const maxDrawdown = this.calculateMaxDrawdown(trades);

    return {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldTime,
      weeklyReturns,
      sharpeRatio,
      maxDrawdown,
      strategy: this.name,
      timeframe: this.timeframe
    };
  }

  // 헬퍼 메서드들
  calculateEntryScore(signalData, marketData) {
    const { finalScore, technicalStrength, volatility, volumeRatio } = signalData;
    const { spread, volume, trend, support, resistance } = marketData;
    
    let score = finalScore;
    
    // 기술적 신호 보너스
    if (technicalStrength > 0.5) score += 5;
    if (technicalStrength > 0.6) score += 5;
    if (technicalStrength > 0.7) score += 5;
    
    // 추세 강도 보너스
    if (trend && trend.strength > 0.7) score += 8;
    if (trend && trend.strength > 0.8) score += 5;
    
    // 지지/저항 보너스
    if (support && resistance) {
      const currentPrice = marketData.currentPrice;
      const supportDistance = ((currentPrice - support) / support) * 100;
      const resistanceDistance = ((resistance - currentPrice) / currentPrice) * 100;
      
      if (supportDistance < 5) score += 5; // 지지선 근처
      if (resistanceDistance > 10) score += 3; // 저항선까지 여유
    }
    
    // 변동성 보너스
    if (volatility > 5) score += 3;
    if (volatility > 8) score += 2;
    
    // 거래량 보너스
    if (volumeRatio > 1.5) score += 3;
    if (volumeRatio > 2) score += 2;
    
    // 스프레드 페널티
    if (spread > 0.3) score -= 3;
    if (spread > 0.5) score -= 5;
    
    return Math.min(score, 100);
  }

  calculateEntryPrice(marketData) {
    const { bid, ask, currentPrice, support, resistance } = marketData;
    
    // 지지선 근처에서 매수, 저항선 근처에서 매도
    if (support && currentPrice <= support * 1.02) {
      return support * 1.01; // 지지선 1% 위에서 매수
    }
    
    if (resistance && currentPrice >= resistance * 0.98) {
      return resistance * 0.99; // 저항선 1% 아래에서 매도
    }
    
    return currentPrice;
  }

  calculateConfidence(signalData, marketData) {
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const trendConfidence = this.calculateTrendConfidence(marketData);
    const supportResistanceConfidence = this.calculateSupportResistanceConfidence(marketData);
    
    return (entryScore / 100 + trendConfidence + supportResistanceConfidence) / 3;
  }

  analyzeTrend(marketData) {
    const { trend, movingAverages, volume } = marketData;
    
    if (!trend) return { direction: 'neutral', strength: 0, confidence: 0 };
    
    const trendAnalysis = {
      direction: trend.direction,
      strength: trend.strength,
      confidence: trend.confidence || 0.5,
      duration: trend.duration || 0,
      momentum: this.calculateTrendMomentum(marketData)
    };
    
    // 이동평균 분석
    if (movingAverages) {
      trendAnalysis.movingAverages = this.analyzeMovingAverages(movingAverages);
    }
    
    return trendAnalysis;
  }

  analyzeSupportResistance(marketData) {
    const { support, resistance, currentPrice } = marketData;
    
    if (!support || !resistance) {
      return { support: null, resistance: null, strength: 0 };
    }
    
    const supportDistance = ((currentPrice - support) / support) * 100;
    const resistanceDistance = ((resistance - currentPrice) / currentPrice) * 100;
    
    return {
      support: support,
      resistance: resistance,
      currentPrice: currentPrice,
      supportDistance: supportDistance,
      resistanceDistance: resistanceDistance,
      strength: this.calculateSupportResistanceStrength(supportDistance, resistanceDistance),
      breakout: this.checkBreakout(marketData)
    };
  }

  analyzeMomentum(marketData) {
    const { rsi, macd, volume } = marketData;
    
    const momentum = {
      rsi: rsi ? this.analyzeRSI(rsi) : { signal: 'neutral', strength: 0 },
      macd: macd ? this.analyzeMACD(macd) : { signal: 'neutral', strength: 0 },
      volume: volume ? this.analyzeVolume(volume) : { signal: 'neutral', strength: 0 },
      overall: 0
    };
    
    // 전체 모멘텀 계산
    momentum.overall = (momentum.rsi.strength + momentum.macd.strength + momentum.volume.strength) / 3;
    
    return momentum;
  }

  getEntryReason(signalData, marketData, trendAnalysis) {
    const { volatility, volumeRatio, technicalStrength } = signalData;
    const reasons = [];
    
    if (volatility >= 5) reasons.push('적절한 변동성');
    if (volumeRatio >= 1.5) reasons.push('거래량 증가');
    if (technicalStrength >= 0.5) reasons.push('기술적 신호');
    
    // 추세 기반 이유
    if (trendAnalysis.direction === 'up' && trendAnalysis.strength > 0.7) reasons.push('강한 상승 추세');
    if (trendAnalysis.direction === 'down' && trendAnalysis.strength > 0.7) reasons.push('강한 하락 추세');
    
    // 지지/저항 기반 이유
    const supportResistance = this.analyzeSupportResistance(marketData);
    if (supportResistance.supportDistance < 3) reasons.push('지지선 근처');
    if (supportResistance.resistanceDistance > 8) reasons.push('저항선까지 여유');
    
    return reasons.join(', ') || '스윙트레이딩 조건 충족';
  }

  calculateUrgency(signalData, marketData) {
    const { volumeRatio, volatility, technicalStrength } = signalData;
    const { trend, support, resistance } = marketData;
    let urgency = 0.3;
    
    if (volumeRatio > 2) urgency += 0.2;
    if (volatility > 6) urgency += 0.2;
    if (technicalStrength > 0.6) urgency += 0.1;
    if (trend && trend.strength > 0.8) urgency += 0.1;
    
    // 지지/저항 근처에서 긴급도 증가
    if (support && marketData.currentPrice <= support * 1.03) urgency += 0.1;
    if (resistance && marketData.currentPrice >= resistance * 0.97) urgency += 0.1;
    
    return Math.min(urgency, 1);
  }

  calculateExpectedDuration(signalData) {
    const { volatility, volumeRatio } = signalData;
    let duration = 2880; // 기본 2일
    
    // 변동성에 따른 조정
    if (volatility > 8) duration *= 0.8;
    if (volatility > 12) duration *= 0.7;
    
    // 거래량에 따른 조정
    if (volumeRatio > 2) duration *= 0.9;
    
    return Math.max(duration, 720); // 최소 12시간
  }

  calculateRiskReward(signalData) {
    return this.targetProfit / this.stopLoss;
  }

  checkTrendReversal(position, marketData) {
    const { trend } = marketData;
    if (!trend) return false;
    
    // 추세 강도가 크게 약해지거나 방향이 바뀜
    return trend.strength < 0.3 || trend.direction !== position.direction;
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

  checkMomentumLoss(marketData) {
    const momentum = this.analyzeMomentum(marketData);
    return momentum.overall < 0.3;
  }

  isWeeklyClose(entryTime) {
    const now = new Date();
    const entry = new Date(entryTime);
    const daysDiff = (now - entry) / (1000 * 60 * 60 * 24);
    
    // 7일 경과 또는 주간 마감
    return daysDiff >= 7;
  }

  getExitReason(conditions) {
    if (conditions.profitTarget) return '목표 수익 달성';
    if (conditions.stopLoss) return '손절매';
    if (conditions.timeLimit) return '시간 초과';
    if (conditions.trendReversal) return '추세 반전';
    if (conditions.supportBreak) return '지지선 하향 돌파';
    if (conditions.resistanceHit) return '저항선 도달';
    if (conditions.momentumLoss) return '모멘텀 상실';
    if (conditions.volumeDrop) return '거래량 감소';
    if (conditions.weeklyClose) return '주간 마감';
    return '기타 조건';
  }

  calculateExitUrgency(conditions) {
    if (conditions.stopLoss || conditions.supportBreak) return 1.0;
    if (conditions.profitTarget || conditions.resistanceHit) return 0.8;
    if (conditions.trendReversal) return 0.7;
    if (conditions.momentumLoss) return 0.6;
    if (conditions.weeklyClose) return 0.5;
    if (conditions.timeLimit) return 0.4;
    if (conditions.volumeDrop) return 0.3;
    return 0.2;
  }

  calculateTrailingStop(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 2) {
      // 2% 이상 수익시 트레일링 스톱 적용
      return currentPrice * (1 - this.stopLoss / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  checkTrendStop(position, marketData) {
    const { trend } = marketData;
    if (!trend) return false;
    
    // 추세 강도가 크게 약해짐
    return trend.strength < 0.2;
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
    if (riskCount >= 5) return 'high';
    if (riskCount >= 4) return 'medium-high';
    if (riskCount >= 3) return 'medium';
    if (riskCount >= 2) return 'low';
    if (riskCount >= 1) return 'minimal';
    return 'none';
  }

  getRiskActions(riskSignals) {
    const actions = [];
    if (riskSignals.trailingStop) actions.push('트레일링 스톱 적용');
    if (riskSignals.timeStop) actions.push('시간 기반 청산');
    if (riskSignals.profitProtection) actions.push('수익 보호');
    if (riskSignals.trendStop) actions.push('추세 기반 청산');
    if (riskSignals.supportStop) actions.push('지지선 기반 청산');
    if (riskSignals.weeklyStop) actions.push('주간 마감 청산');
    return actions;
  }

  getRiskWarnings(riskSignals) {
    const warnings = [];
    if (riskSignals.volatilityStop) warnings.push('극심한 변동성 주의');
    if (riskSignals.timeStop) warnings.push('보유 시간 초과');
    if (riskSignals.trendStop) warnings.push('추세 약화');
    if (riskSignals.supportStop) warnings.push('지지선 위험');
    return warnings;
  }

  calculateDynamicStopLoss(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 3) {
      // 3% 이상 수익시 동적 손절매
      return currentPrice * (1 - this.stopLoss * 0.7 / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  calculateTakeProfit(position, marketData) {
    const { entryPrice } = position;
    const { resistance } = marketData;
    
    if (resistance) {
      // 저항선을 목표로 설정
      return resistance * 0.98; // 2% 여유
    }
    
    return entryPrice * (1 + this.targetProfit / 100);
  }

  calculateTrendConfidence(marketData) {
    const { trend } = marketData;
    if (!trend) return 0.3;
    
    return trend.strength * (trend.confidence || 0.5);
  }

  calculateSupportResistanceConfidence(marketData) {
    const supportResistance = this.analyzeSupportResistance(marketData);
    return supportResistance.strength;
  }

  calculateTrendMomentum(marketData) {
    const { trend, volume } = marketData;
    if (!trend) return 0;
    
    let momentum = trend.strength;
    
    // 거래량으로 모멘텀 조정
    if (volume && volume.ratio > 1.5) momentum += 0.1;
    if (volume && volume.ratio > 2) momentum += 0.1;
    
    return Math.min(momentum, 1);
  }

  analyzeMovingAverages(movingAverages) {
    const { sma20, sma50, sma200 } = movingAverages;
    
    return {
      sma20: sma20,
      sma50: sma50,
      sma200: sma200,
      goldenCross: sma20 > sma50 && sma50 > sma200,
      deathCross: sma20 < sma50 && sma50 < sma200,
      trend: sma20 > sma50 ? 'up' : 'down'
    };
  }

  calculateSupportResistanceStrength(supportDistance, resistanceDistance) {
    let strength = 0.5;
    
    // 지지선 근처에서 강도 증가
    if (supportDistance < 5) strength += 0.2;
    if (supportDistance < 2) strength += 0.2;
    
    // 저항선까지 여유가 있을 때 강도 증가
    if (resistanceDistance > 8) strength += 0.1;
    if (resistanceDistance > 15) strength += 0.1;
    
    return Math.min(strength, 1);
  }

  checkBreakout(marketData) {
    const { currentPrice, support, resistance, volume } = marketData;
    
    if (!support || !resistance) return false;
    
    // 지지선 하향 돌파 또는 저항선 상향 돌파
    const supportBreak = currentPrice < support;
    const resistanceBreak = currentPrice > resistance;
    
    // 거래량 증가와 함께 돌파
    const volumeConfirmation = volume && volume.ratio > 1.5;
    
    return (supportBreak || resistanceBreak) && volumeConfirmation;
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

  analyzeVolume(volume) {
    if (!volume) return { signal: 'neutral', strength: 0 };
    
    const { current, average } = volume;
    const ratio = current / average;
    
    if (ratio > 2) return { signal: 'high', strength: 0.8 };
    if (ratio > 1.5) return { signal: 'above_average', strength: 0.6 };
    if (ratio < 0.5) return { signal: 'low', strength: 0.3 };
    
    return { signal: 'normal', strength: 0.4 };
  }

  calculateWeeklyReturns(trades) {
    // 주간 수익률 계산 로직
    const weeklyReturns = {};
    
    trades.forEach(trade => {
      const week = this.getWeekNumber(trade.exitTime);
      if (!weeklyReturns[week]) weeklyReturns[week] = 0;
      weeklyReturns[week] += trade.profitLoss;
    });
    
    return Object.values(weeklyReturns);
  }

  calculateSharpeRatio(weeklyReturns) {
    if (weeklyReturns.length === 0) return 0;
    
    const avgReturn = weeklyReturns.reduce((sum, ret) => sum + ret, 0) / weeklyReturns.length;
    const variance = weeklyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / weeklyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev !== 0 ? avgReturn / stdDev : 0;
  }

  calculateMaxDrawdown(trades) {
    let maxDrawdown = 0;
    let peak = 0;
    let current = 0;
    
    trades.forEach(trade => {
      current += trade.profitLoss;
      if (current > peak) peak = current;
      const drawdown = peak - current;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    return maxDrawdown;
  }

  getWeekNumber(date) {
    const d = new Date(date);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
  }
}

module.exports = SwingTradingStrategy;
