const BaseStrategy = require('./BaseStrategy');

/**
 * 장기투자 전략 클래스
 * 장기 투자, 펀더멘털 분석 중심, 1개월 이상 보유
 */
class LongTermStrategy extends BaseStrategy {
  constructor() {
    super('Long Term Investment', 'LONG_TERM');
    this.riskLevel = 'low-medium';
    this.minLiquidity = 'C';
    this.maxPositionSize = 0.25; // 25% 최대 포지션
    this.targetProfit = 20.0; // 20% 목표 수익
    this.stopLoss = 10.0; // 10% 손절매
    this.maxHoldTime = 2592000; // 30일 최대 보유
    this.minVolumeRatio = 1.0; // 최소 1배 거래량
    this.minVolatility = 2; // 최소 2% 변동성
    this.fundamentalThreshold = 0.4; // 최소 펀더멘털 점수
  }

  canExecute(signalData, marketData) {
    // LONG_TERM 전략은 항상 실행 가능 (장기 투자는 조건이 유연함)
    return true;
  }

  analyzeEntry(signalData, marketData) {
    const { finalScore, volatility, volumeRatio, technicalStrength } = signalData;
    const { currentPrice, bid, ask, volume, fundamentals, trend, support, resistance } = marketData;

    // 장기투자 진입 조건 분석
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const entryPrice = this.calculateEntryPrice(marketData);
    const confidence = this.calculateConfidence(signalData, marketData);
    const fundamentalAnalysis = this.analyzeFundamentals(marketData);
    const trendAnalysis = this.analyzeLongTermTrend(marketData);
    const valuation = this.analyzeValuation(marketData);

    return {
      action: finalScore >= 50 ? 'BUY' : 'HOLD',
      entryPrice: entryPrice,
      confidence: confidence,
      entryScore: entryScore,
      reason: this.getEntryReason(signalData, marketData, fundamentalAnalysis),
      urgency: this.calculateUrgency(signalData, marketData),
      expectedDuration: this.calculateExpectedDuration(signalData),
      riskReward: this.calculateRiskReward(signalData),
      fundamentalAnalysis: fundamentalAnalysis,
      trendAnalysis: trendAnalysis,
      valuation: valuation,
      marketCycle: this.analyzeMarketCycle(marketData)
    };
  }

  analyzeExit(position, marketData) {
    const { entryPrice, entryTime, currentPrice, volume } = position;
    const { currentPrice: marketPrice, volume: currentVolume, fundamentals, trend } = marketData;
    
    const profitLoss = ((marketPrice - entryPrice) / entryPrice) * 100;
    const holdTime = Date.now() - entryTime;
    
    // 장기투자 청산 조건들
    const exitConditions = {
      profitTarget: profitLoss >= this.targetProfit,
      stopLoss: profitLoss <= -this.stopLoss,
      timeLimit: holdTime >= this.maxHoldTime * 1000,
      fundamentalChange: this.checkFundamentalChange(position, marketData),
      trendReversal: this.checkLongTermTrendReversal(position, marketData),
      marketCycleChange: this.checkMarketCycleChange(marketData),
      valuationOverpriced: this.checkValuationOverpriced(marketData),
      liquidityCrisis: this.checkLiquidityCrisis(marketData),
      monthlyClose: this.isMonthlyClose(entryTime) // 월간 마감
    };

    const shouldExit = Object.values(exitConditions).some(condition => condition);
    
    return {
      shouldExit: shouldExit,
      exitPrice: marketPrice,
      exitReason: this.getExitReason(exitConditions),
      profitLoss: profitLoss,
      holdTime: holdTime,
      urgency: this.calculateExitUrgency(exitConditions),
      fundamentalChange: exitConditions.fundamentalChange,
      trendReversal: exitConditions.trendReversal,
      valuation: this.analyzeValuation(marketData)
    };
  }

  calculatePositionSize(signalData, accountData) {
    const { finalScore, volatility, liquidityGrade, technicalStrength } = signalData;
    const { balance, riskTolerance, portfolioDiversification } = accountData;
    
    // 장기투자는 큰 포지션 크기
    let baseSize = 0.15; // 기본 15%
    
    // 신호 강도에 따른 조정
    if (finalScore >= 40) baseSize += 0.03;
    if (finalScore >= 50) baseSize += 0.03;
    if (finalScore >= 60) baseSize += 0.03;
    if (finalScore >= 70) baseSize += 0.03;
    if (finalScore >= 80) baseSize += 0.03;
    
    // 기술적 신호 강도에 따른 조정
    if (technicalStrength >= 0.4) baseSize += 0.02;
    if (technicalStrength >= 0.5) baseSize += 0.02;
    if (technicalStrength >= 0.6) baseSize += 0.02;
    
    // 유동성에 따른 조정
    if (liquidityGrade === 'A+') baseSize += 0.05;
    if (liquidityGrade === 'A') baseSize += 0.03;
    if (liquidityGrade === 'B+') baseSize += 0.02;
    if (liquidityGrade === 'B') baseSize += 0.01;
    
    // 변동성에 따른 조정 (낮은 변동성 = 큰 포지션)
    if (volatility < 5) baseSize += 0.02;
    if (volatility < 3) baseSize += 0.02;
    if (volatility > 15) baseSize *= 0.8;
    if (volatility > 25) baseSize *= 0.6;
    
    // 포트폴리오 다각화 고려
    baseSize *= portfolioDiversification || 1;
    
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
      profitProtection: profitLoss > this.targetProfit * 0.8, // 목표의 80% 달성시 보호
      volatilityStop: marketData.volatility > 30, // 극심한 변동성
      fundamentalStop: this.checkFundamentalStop(marketData),
      trendStop: this.checkLongTermTrendStop(marketData),
      marketCycleStop: this.checkMarketCycleStop(marketData),
      monthlyStop: this.isMonthlyClose(entryTime)
    };

    return {
      riskLevel: this.calculateRiskLevel(riskSignals),
      actions: this.getRiskActions(riskSignals),
      warnings: this.getRiskWarnings(riskSignals),
      stopLoss: this.calculateDynamicStopLoss(position, marketData),
      takeProfit: this.calculateTakeProfit(position, marketData),
      rebalancing: this.calculateRebalancing(position, marketData)
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
    
    const monthlyReturns = this.calculateMonthlyReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(monthlyReturns);
    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const annualizedReturn = this.calculateAnnualizedReturn(trades);

    return {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldTime,
      monthlyReturns,
      sharpeRatio,
      maxDrawdown,
      annualizedReturn,
      strategy: this.name,
      timeframe: this.timeframe
    };
  }

  // 헬퍼 메서드들
  calculateEntryScore(signalData, marketData) {
    const { finalScore, technicalStrength, volatility, volumeRatio } = signalData;
    const { spread, volume, fundamentals, trend } = marketData;
    
    let score = finalScore;
    
    // 기술적 신호 보너스
    if (technicalStrength > 0.4) score += 5;
    if (technicalStrength > 0.5) score += 5;
    if (technicalStrength > 0.6) score += 5;
    
    // 펀더멘털 보너스
    if (fundamentals && fundamentals.score > 0.6) score += 10;
    if (fundamentals && fundamentals.score > 0.7) score += 10;
    if (fundamentals && fundamentals.score > 0.8) score += 10;
    
    // 장기 추세 보너스
    if (trend && trend.strength > 0.6) score += 8;
    if (trend && trend.strength > 0.7) score += 5;
    
    // 변동성 보너스 (낮은 변동성 선호)
    if (volatility < 5) score += 5;
    if (volatility < 3) score += 5;
    
    // 거래량 보너스
    if (volumeRatio > 1.2) score += 3;
    if (volumeRatio > 1.5) score += 2;
    
    // 스프레드 페널티
    if (spread > 0.5) score -= 3;
    if (spread > 1.0) score -= 5;
    
    return Math.min(score, 100);
  }

  calculateEntryPrice(marketData) {
    const { bid, ask, currentPrice, support, resistance } = marketData;
    
    // 장기투자는 지지선 근처에서 매수
    if (support && currentPrice <= support * 1.05) {
      return support * 1.02; // 지지선 2% 위에서 매수
    }
    
    return currentPrice;
  }

  calculateConfidence(signalData, marketData) {
    const entryScore = this.calculateEntryScore(signalData, marketData);
    const fundamentalConfidence = this.calculateFundamentalConfidence(marketData);
    const trendConfidence = this.calculateLongTermTrendConfidence(marketData);
    
    return (entryScore / 100 + fundamentalConfidence + trendConfidence) / 3;
  }

  analyzeFundamentals(marketData) {
    const { fundamentals, marketCap, volume, supply } = marketData;
    
    if (!fundamentals) return { score: 0.5, confidence: 0.3 };
    
    const analysis = {
      score: fundamentals.score || 0.5,
      confidence: fundamentals.confidence || 0.5,
      growth: fundamentals.growth || 0,
      profitability: fundamentals.profitability || 0,
      stability: fundamentals.stability || 0,
      innovation: fundamentals.innovation || 0,
      marketPosition: fundamentals.marketPosition || 0
    };
    
    // 시장 규모 분석
    if (marketCap) {
      analysis.marketCap = marketCap;
      analysis.marketCapTier = this.getMarketCapTier(marketCap);
    }
    
    // 공급량 분석
    if (supply) {
      analysis.supply = supply;
      analysis.supplyAnalysis = this.analyzeSupply(supply);
    }
    
    return analysis;
  }

  analyzeLongTermTrend(marketData) {
    const { trend, movingAverages, volume } = marketData;
    
    if (!trend) return { direction: 'neutral', strength: 0, confidence: 0 };
    
    const trendAnalysis = {
      direction: trend.direction,
      strength: trend.strength,
      confidence: trend.confidence || 0.5,
      duration: trend.duration || 0,
      momentum: this.calculateLongTermMomentum(marketData),
      sustainability: this.calculateTrendSustainability(marketData)
    };
    
    // 이동평균 분석
    if (movingAverages) {
      trendAnalysis.movingAverages = this.analyzeLongTermMovingAverages(movingAverages);
    }
    
    return trendAnalysis;
  }

  analyzeValuation(marketData) {
    const { fundamentals, currentPrice, marketCap, volume } = marketData;
    
    if (!fundamentals) return { score: 0.5, status: 'neutral' };
    
    const valuation = {
      score: fundamentals.valuation || 0.5,
      status: this.getValuationStatus(fundamentals.valuation),
      metrics: this.calculateValuationMetrics(marketData),
      comparison: this.compareValuation(marketData)
    };
    
    return valuation;
  }

  analyzeMarketCycle(marketData) {
    const { marketCycle, fearGreedIndex, marketCap } = marketData;
    
    return {
      phase: marketCycle?.phase || 'neutral',
      confidence: marketCycle?.confidence || 0.5,
      fearGreedIndex: fearGreedIndex || 50,
      marketCap: marketCap,
      cyclePosition: this.getCyclePosition(marketCycle, fearGreedIndex)
    };
  }

  getEntryReason(signalData, marketData, fundamentalAnalysis) {
    const { volatility, volumeRatio, technicalStrength } = signalData;
    const reasons = [];
    
    if (volatility >= 3) reasons.push('적절한 변동성');
    if (volumeRatio >= 1.2) reasons.push('거래량 증가');
    if (technicalStrength >= 0.4) reasons.push('기술적 신호');
    
    // 펀더멘털 기반 이유
    if (fundamentalAnalysis.score > 0.6) reasons.push('강한 펀더멘털');
    if (fundamentalAnalysis.growth > 0.7) reasons.push('성장성');
    if (fundamentalAnalysis.stability > 0.7) reasons.push('안정성');
    
    // 추세 기반 이유
    const trendAnalysis = this.analyzeLongTermTrend(marketData);
    if (trendAnalysis.direction === 'up' && trendAnalysis.strength > 0.6) reasons.push('상승 추세');
    if (trendAnalysis.sustainability > 0.7) reasons.push('지속 가능한 추세');
    
    return reasons.join(', ') || '장기투자 조건 충족';
  }

  calculateUrgency(signalData, marketData) {
    const { volumeRatio, volatility, technicalStrength } = signalData;
    const { fundamentals, trend } = marketData;
    let urgency = 0.2;
    
    if (volumeRatio > 2) urgency += 0.1;
    if (volatility > 8) urgency += 0.1;
    if (technicalStrength > 0.6) urgency += 0.1;
    if (fundamentals && fundamentals.score > 0.8) urgency += 0.1;
    if (trend && trend.strength > 0.8) urgency += 0.1;
    
    return Math.min(urgency, 1);
  }

  calculateExpectedDuration(signalData) {
    const { volatility, volumeRatio } = signalData;
    let duration = 43200; // 기본 30일
    
    // 변동성에 따른 조정
    if (volatility > 10) duration *= 0.8;
    if (volatility > 15) duration *= 0.7;
    
    // 거래량에 따른 조정
    if (volumeRatio > 2) duration *= 0.9;
    
    return Math.max(duration, 7200); // 최소 5일
  }

  calculateRiskReward(signalData) {
    return this.targetProfit / this.stopLoss;
  }

  checkFundamentalChange(position, marketData) {
    const { fundamentals } = marketData;
    if (!fundamentals) return false;
    
    // 펀더멘털이 크게 악화됨
    return fundamentals.score < 0.3;
  }

  checkLongTermTrendReversal(position, marketData) {
    const { trend } = marketData;
    if (!trend) return false;
    
    // 장기 추세가 크게 약해지거나 방향이 바뀜
    return trend.strength < 0.2 || trend.direction !== position.direction;
  }

  checkMarketCycleChange(marketData) {
    const { marketCycle } = marketData;
    if (!marketCycle) return false;
    
    // 시장 사이클이 크게 변함
    return marketCycle.phase === 'bear' || marketCycle.phase === 'crash';
  }

  checkValuationOverpriced(marketData) {
    const valuation = this.analyzeValuation(marketData);
    return valuation.status === 'overpriced';
  }

  checkLiquidityCrisis(marketData) {
    const { volume, spread } = marketData;
    
    // 거래량 급감 또는 스프레드 급증
    return (volume && volume.ratio < 0.3) || (spread && spread > 2.0);
  }

  isMonthlyClose(entryTime) {
    const now = new Date();
    const entry = new Date(entryTime);
    const daysDiff = (now - entry) / (1000 * 60 * 60 * 24);
    
    // 30일 경과 또는 월간 마감
    return daysDiff >= 30;
  }

  getExitReason(conditions) {
    if (conditions.profitTarget) return '목표 수익 달성';
    if (conditions.stopLoss) return '손절매';
    if (conditions.timeLimit) return '시간 초과';
    if (conditions.fundamentalChange) return '펀더멘털 악화';
    if (conditions.trendReversal) return '추세 반전';
    if (conditions.marketCycleChange) return '시장 사이클 변화';
    if (conditions.valuationOverpriced) return '과대평가';
    if (conditions.liquidityCrisis) return '유동성 위기';
    if (conditions.monthlyClose) return '월간 마감';
    return '기타 조건';
  }

  calculateExitUrgency(conditions) {
    if (conditions.stopLoss || conditions.liquidityCrisis) return 1.0;
    if (conditions.fundamentalChange || conditions.marketCycleChange) return 0.9;
    if (conditions.profitTarget || conditions.valuationOverpriced) return 0.7;
    if (conditions.trendReversal) return 0.6;
    if (conditions.monthlyClose) return 0.4;
    if (conditions.timeLimit) return 0.3;
    return 0.2;
  }

  calculateTrailingStop(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 5) {
      // 5% 이상 수익시 트레일링 스톱 적용
      return currentPrice * (1 - this.stopLoss / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  checkFundamentalStop(marketData) {
    const { fundamentals } = marketData;
    if (!fundamentals) return false;
    
    // 펀더멘털이 크게 악화됨
    return fundamentals.score < 0.2;
  }

  checkLongTermTrendStop(marketData) {
    const { trend } = marketData;
    if (!trend) return false;
    
    // 장기 추세가 크게 약해짐
    return trend.strength < 0.1;
  }

  checkMarketCycleStop(marketData) {
    const { marketCycle } = marketData;
    if (!marketCycle) return false;
    
    // 시장 사이클이 위험 단계
    return marketCycle.phase === 'crash' || marketCycle.phase === 'bear';
  }

  calculateRiskLevel(riskSignals) {
    const riskCount = Object.values(riskSignals).filter(Boolean).length;
    if (riskCount >= 6) return 'high';
    if (riskCount >= 5) return 'medium-high';
    if (riskCount >= 4) return 'medium';
    if (riskCount >= 3) return 'low';
    if (riskCount >= 2) return 'minimal';
    if (riskCount >= 1) return 'none';
    return 'none';
  }

  getRiskActions(riskSignals) {
    const actions = [];
    if (riskSignals.trailingStop) actions.push('트레일링 스톱 적용');
    if (riskSignals.timeStop) actions.push('시간 기반 청산');
    if (riskSignals.profitProtection) actions.push('수익 보호');
    if (riskSignals.fundamentalStop) actions.push('펀더멘털 기반 청산');
    if (riskSignals.trendStop) actions.push('추세 기반 청산');
    if (riskSignals.marketCycleStop) actions.push('시장 사이클 기반 청산');
    if (riskSignals.monthlyStop) actions.push('월간 마감 청산');
    return actions;
  }

  getRiskWarnings(riskSignals) {
    const warnings = [];
    if (riskSignals.volatilityStop) warnings.push('극심한 변동성 주의');
    if (riskSignals.timeStop) warnings.push('보유 시간 초과');
    if (riskSignals.fundamentalStop) warnings.push('펀더멘털 악화');
    if (riskSignals.trendStop) warnings.push('추세 약화');
    if (riskSignals.marketCycleStop) warnings.push('시장 사이클 위험');
    return warnings;
  }

  calculateDynamicStopLoss(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitLoss > 10) {
      // 10% 이상 수익시 동적 손절매
      return currentPrice * (1 - this.stopLoss * 0.5 / 100);
    }
    
    return entryPrice * (1 - this.stopLoss / 100);
  }

  calculateTakeProfit(position, marketData) {
    const { entryPrice } = position;
    const { resistance } = marketData;
    
    if (resistance) {
      // 저항선을 목표로 설정
      return resistance * 0.95; // 5% 여유
    }
    
    return entryPrice * (1 + this.targetProfit / 100);
  }

  calculateRebalancing(position, marketData) {
    const { entryPrice, currentPrice } = position;
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    // 15% 이상 수익시 리밸런싱 고려
    if (profitLoss > 15) {
      return {
        shouldRebalance: true,
        rebalanceRatio: 0.3, // 30% 청산
        reason: '수익 실현 및 리밸런싱'
      };
    }
    
    return {
      shouldRebalance: false,
      rebalanceRatio: 0,
      reason: '리밸런싱 불필요'
    };
  }

  calculateFundamentalConfidence(marketData) {
    const fundamentalAnalysis = this.analyzeFundamentals(marketData);
    return fundamentalAnalysis.confidence;
  }

  calculateLongTermTrendConfidence(marketData) {
    const trendAnalysis = this.analyzeLongTermTrend(marketData);
    return trendAnalysis.confidence;
  }

  getMarketCapTier(marketCap) {
    if (marketCap > 10000000000) return 'large'; // 100억 이상
    if (marketCap > 1000000000) return 'mid'; // 10억 이상
    if (marketCap > 100000000) return 'small'; // 1억 이상
    return 'micro'; // 1억 미만
  }

  analyzeSupply(supply) {
    return {
      total: supply.total,
      circulating: supply.circulating,
      max: supply.max,
      inflation: supply.inflation,
      deflation: supply.deflation
    };
  }

  calculateLongTermMomentum(marketData) {
    const { trend, volume } = marketData;
    if (!trend) return 0;
    
    let momentum = trend.strength;
    
    // 거래량으로 모멘텀 조정
    if (volume && volume.ratio > 1.2) momentum += 0.1;
    if (volume && volume.ratio > 1.5) momentum += 0.1;
    
    return Math.min(momentum, 1);
  }

  calculateTrendSustainability(marketData) {
    const { trend, fundamentals } = marketData;
    if (!trend) return 0;
    
    let sustainability = trend.strength;
    
    // 펀더멘털로 지속가능성 조정
    if (fundamentals && fundamentals.score > 0.6) sustainability += 0.1;
    if (fundamentals && fundamentals.score > 0.7) sustainability += 0.1;
    
    return Math.min(sustainability, 1);
  }

  analyzeLongTermMovingAverages(movingAverages) {
    const { sma50, sma100, sma200 } = movingAverages;
    
    return {
      sma50: sma50,
      sma100: sma100,
      sma200: sma200,
      goldenCross: sma50 > sma100 && sma100 > sma200,
      deathCross: sma50 < sma100 && sma100 < sma200,
      trend: sma50 > sma100 ? 'up' : 'down',
      strength: Math.abs(sma50 - sma100) / sma100
    };
  }

  getValuationStatus(valuation) {
    if (valuation > 0.8) return 'overpriced';
    if (valuation > 0.6) return 'fair';
    if (valuation > 0.4) return 'undervalued';
    return 'cheap';
  }

  calculateValuationMetrics(marketData) {
    const { fundamentals, currentPrice, marketCap } = marketData;
    
    return {
      pe: fundamentals?.pe || 0,
      pb: fundamentals?.pb || 0,
      ps: fundamentals?.ps || 0,
      peg: fundamentals?.peg || 0,
      currentPrice: currentPrice,
      marketCap: marketCap
    };
  }

  compareValuation(marketData) {
    const { fundamentals } = marketData;
    
    return {
      industry: fundamentals?.industryComparison || 0,
      historical: fundamentals?.historicalComparison || 0,
      peers: fundamentals?.peerComparison || 0
    };
  }

  getCyclePosition(marketCycle, fearGreedIndex) {
    if (!marketCycle) return 'neutral';
    
    const phase = marketCycle.phase;
    const index = fearGreedIndex || 50;
    
    if (phase === 'bull' && index > 70) return 'euphoria';
    if (phase === 'bull' && index > 50) return 'optimism';
    if (phase === 'bear' && index < 30) return 'panic';
    if (phase === 'bear' && index < 50) return 'fear';
    
    return 'neutral';
  }

  calculateMonthlyReturns(trades) {
    // 월간 수익률 계산 로직
    const monthlyReturns = {};
    
    trades.forEach(trade => {
      const month = new Date(trade.exitTime).toISOString().substring(0, 7);
      if (!monthlyReturns[month]) monthlyReturns[month] = 0;
      monthlyReturns[month] += trade.profitLoss;
    });
    
    return Object.values(monthlyReturns);
  }

  calculateSharpeRatio(monthlyReturns) {
    if (monthlyReturns.length === 0) return 0;
    
    const avgReturn = monthlyReturns.reduce((sum, ret) => sum + ret, 0) / monthlyReturns.length;
    const variance = monthlyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / monthlyReturns.length;
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

  calculateAnnualizedReturn(trades) {
    if (trades.length === 0) return 0;
    
    const totalReturn = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const avgHoldTime = trades.reduce((sum, trade) => sum + trade.holdTime, 0) / trades.length;
    const years = avgHoldTime / (365 * 24 * 60 * 60 * 1000);
    
    return years > 0 ? Math.pow(1 + totalReturn / 100, 1 / years) - 1 : 0;
  }
}

module.exports = LongTermStrategy;
