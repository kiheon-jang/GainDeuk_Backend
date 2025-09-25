/**
 * 리스크 관리 시스템
 * 포지션 사이징, 손절매, 익절매, 포트폴리오 리스크 관리
 */
class RiskManager {
  constructor() {
    this.maxPortfolioRisk = 0.02; // 최대 포트폴리오 리스크 2%
    this.maxPositionRisk = 0.01; // 최대 개별 포지션 리스크 1%
    this.maxCorrelation = 0.7; // 최대 상관관계 70%
    this.maxDrawdown = 0.15; // 최대 드로우다운 15%
    this.riskFreeRate = 0.02; // 무위험 수익률 2%
    this.leverage = 1.0; // 레버리지 (기본 1배)
  }

  /**
   * 포지션 사이즈 계산
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} accountData - 계정 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 포지션 사이즈 정보
   */
  calculatePositionSize(signalData, accountData, marketData) {
    const { finalScore, volatility, riskScore } = signalData;
    const { balance, riskTolerance, currentPositions } = accountData;
    const { currentPrice, spread } = marketData;

    // 기본 포지션 사이즈 계산
    const baseSize = this.calculateBasePositionSize(signalData, accountData);
    
    // 리스크 조정
    const riskAdjustedSize = this.adjustForRisk(baseSize, signalData, accountData);
    
    // 유동성 조정
    const liquidityAdjustedSize = this.adjustForLiquidity(riskAdjustedSize, marketData);
    
    // 상관관계 조정
    const correlationAdjustedSize = this.adjustForCorrelation(liquidityAdjustedSize, currentPositions, signalData);
    
    // 최종 포지션 사이즈
    const finalSize = Math.min(correlationAdjustedSize, this.maxPositionRisk);
    
    // 포지션 금액 계산
    const positionValue = balance * finalSize;
    const positionQuantity = positionValue / currentPrice;
    
    return {
      size: finalSize,
      value: positionValue,
      quantity: positionQuantity,
      risk: this.calculatePositionRisk(finalSize, volatility),
      maxLoss: positionValue * (volatility / 100),
      adjustments: {
        base: baseSize,
        riskAdjusted: riskAdjustedSize,
        liquidityAdjusted: liquidityAdjustedSize,
        correlationAdjusted: correlationAdjustedSize
      }
    };
  }

  /**
   * 기본 포지션 사이즈 계산
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} accountData - 계정 데이터
   * @returns {number} 기본 포지션 사이즈
   */
  calculateBasePositionSize(signalData, accountData) {
    const { finalScore, volatility, technicalStrength } = signalData;
    const { riskTolerance, balance } = accountData;
    
    // 켈리 공식 기반 포지션 사이즈
    const winRate = this.estimateWinRate(signalData);
    const avgWin = this.estimateAvgWin(signalData);
    const avgLoss = this.estimateAvgLoss(signalData);
    
    const kellyRatio = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const baseSize = Math.max(0, Math.min(kellyRatio, 0.25)); // 최대 25%
    
    // 신호 강도 조정
    const signalMultiplier = finalScore / 100;
    
    // 변동성 조정
    const volatilityMultiplier = Math.min(1, 10 / volatility); // 변동성 10% 기준
    
    // 기술적 신호 조정
    const technicalMultiplier = technicalStrength || 0.5;
    
    // 리스크 허용도 조정
    const riskMultiplier = riskTolerance || 0.5;
    
    return baseSize * signalMultiplier * volatilityMultiplier * technicalMultiplier * riskMultiplier;
  }

  /**
   * 리스크 조정
   * @param {number} baseSize - 기본 포지션 사이즈
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} accountData - 계정 데이터
   * @returns {number} 리스크 조정된 포지션 사이즈
   */
  adjustForRisk(baseSize, signalData, accountData) {
    const { riskScore, volatility } = signalData;
    const { currentDrawdown, maxDrawdown } = accountData;
    
    let adjustedSize = baseSize;
    
    // 리스크 스코어 조정
    if (riskScore > 80) adjustedSize *= 0.5;
    else if (riskScore > 60) adjustedSize *= 0.7;
    else if (riskScore > 40) adjustedSize *= 0.9;
    
    // 변동성 조정
    if (volatility > 20) adjustedSize *= 0.5;
    else if (volatility > 15) adjustedSize *= 0.7;
    else if (volatility > 10) adjustedSize *= 0.9;
    
    // 드로우다운 조정
    if (currentDrawdown > maxDrawdown * 0.8) adjustedSize *= 0.5;
    else if (currentDrawdown > maxDrawdown * 0.6) adjustedSize *= 0.7;
    else if (currentDrawdown > maxDrawdown * 0.4) adjustedSize *= 0.9;
    
    return adjustedSize;
  }

  /**
   * 유동성 조정
   * @param {number} size - 포지션 사이즈
   * @param {Object} marketData - 시장 데이터
   * @returns {number} 유동성 조정된 포지션 사이즈
   */
  adjustForLiquidity(size, marketData) {
    const { volume, spread, liquidityGrade } = marketData;
    
    let adjustedSize = size;
    
    // 유동성 등급 조정
    switch (liquidityGrade) {
      case 'A+':
        adjustedSize *= 1.0;
        break;
      case 'A':
        adjustedSize *= 0.9;
        break;
      case 'B+':
        adjustedSize *= 0.8;
        break;
      case 'B':
        adjustedSize *= 0.7;
        break;
      case 'C+':
        adjustedSize *= 0.6;
        break;
      case 'C':
        adjustedSize *= 0.5;
        break;
      default:
        adjustedSize *= 0.4;
    }
    
    // 스프레드 조정
    if (spread > 1.0) adjustedSize *= 0.5;
    else if (spread > 0.5) adjustedSize *= 0.7;
    else if (spread > 0.2) adjustedSize *= 0.9;
    
    // 거래량 조정
    if (volume && volume.ratio < 0.5) adjustedSize *= 0.5;
    else if (volume && volume.ratio < 1.0) adjustedSize *= 0.7;
    else if (volume && volume.ratio < 1.5) adjustedSize *= 0.9;
    
    return adjustedSize;
  }

  /**
   * 상관관계 조정
   * @param {number} size - 포지션 사이즈
   * @param {Array} currentPositions - 현재 포지션들
   * @param {Object} signalData - 시그널 데이터
   * @returns {number} 상관관계 조정된 포지션 사이즈
   */
  adjustForCorrelation(size, currentPositions, signalData) {
    if (!currentPositions || currentPositions.length === 0) {
      return size;
    }
    
    const { symbol, correlation } = signalData;
    let adjustedSize = size;
    
    // 기존 포지션과의 상관관계 확인
    const totalCorrelation = currentPositions.reduce((sum, position) => {
      const positionCorrelation = this.calculateCorrelation(symbol, position.symbol);
      return sum + (positionCorrelation * position.size);
    }, 0);
    
    // 상관관계가 높을수록 포지션 사이즈 감소
    if (totalCorrelation > this.maxCorrelation) {
      adjustedSize *= 0.3;
    } else if (totalCorrelation > this.maxCorrelation * 0.8) {
      adjustedSize *= 0.5;
    } else if (totalCorrelation > this.maxCorrelation * 0.6) {
      adjustedSize *= 0.7;
    }
    
    return adjustedSize;
  }

  /**
   * 포지션 리스크 계산
   * @param {number} positionSize - 포지션 사이즈
   * @param {number} volatility - 변동성
   * @returns {number} 포지션 리스크
   */
  calculatePositionRisk(positionSize, volatility) {
    return positionSize * (volatility / 100);
  }

  /**
   * 손절매 가격 계산
   * @param {Object} position - 포지션 정보
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 손절매 정보
   */
  calculateStopLoss(position, signalData, marketData) {
    const { entryPrice, quantity, direction } = position;
    const { volatility, riskScore } = signalData;
    const { currentPrice, support, resistance } = marketData;
    
    // 기본 손절매 (변동성 기반)
    const baseStopLoss = volatility * 0.5; // 변동성의 50%
    
    // 리스크 스코어 조정
    const riskAdjustedStopLoss = baseStopLoss * (riskScore / 100);
    
    // 지지/저항 기반 손절매
    let supportResistanceStopLoss = null;
    if (direction === 'BUY' && support) {
      supportResistanceStopLoss = support * 0.98; // 지지선 2% 아래
    } else if (direction === 'SELL' && resistance) {
      supportResistanceStopLoss = resistance * 1.02; // 저항선 2% 위
    }
    
    // 최종 손절매 가격
    const stopLossPrice = direction === 'BUY' 
      ? entryPrice * (1 - riskAdjustedStopLoss / 100)
      : entryPrice * (1 + riskAdjustedStopLoss / 100);
    
    // 지지/저항 기반 손절매가 더 유리한 경우 사용
    const finalStopLossPrice = supportResistanceStopLoss && 
      ((direction === 'BUY' && supportResistanceStopLoss < stopLossPrice) ||
       (direction === 'SELL' && supportResistanceStopLoss > stopLossPrice))
      ? supportResistanceStopLoss
      : stopLossPrice;
    
    return {
      price: finalStopLossPrice,
      percentage: Math.abs((finalStopLossPrice - entryPrice) / entryPrice) * 100,
      type: supportResistanceStopLoss ? 'support_resistance' : 'volatility_based',
      risk: Math.abs(finalStopLossPrice - entryPrice) * quantity
    };
  }

  /**
   * 익절매 가격 계산
   * @param {Object} position - 포지션 정보
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 익절매 정보
   */
  calculateTakeProfit(position, signalData, marketData) {
    const { entryPrice, quantity, direction } = position;
    const { volatility, finalScore } = signalData;
    const { currentPrice, resistance, support } = marketData;
    
    // 기본 익절매 (변동성 기반)
    const baseTakeProfit = volatility * 1.5; // 변동성의 150%
    
    // 신호 강도 조정
    const signalAdjustedTakeProfit = baseTakeProfit * (finalScore / 100);
    
    // 지지/저항 기반 익절매
    let supportResistanceTakeProfit = null;
    if (direction === 'BUY' && resistance) {
      supportResistanceTakeProfit = resistance * 0.98; // 저항선 2% 아래
    } else if (direction === 'SELL' && support) {
      supportResistanceTakeProfit = support * 1.02; // 지지선 2% 위
    }
    
    // 최종 익절매 가격
    const takeProfitPrice = direction === 'BUY'
      ? entryPrice * (1 + signalAdjustedTakeProfit / 100)
      : entryPrice * (1 - signalAdjustedTakeProfit / 100);
    
    // 지지/저항 기반 익절매가 더 유리한 경우 사용
    const finalTakeProfitPrice = supportResistanceTakeProfit &&
      ((direction === 'BUY' && supportResistanceTakeProfit < takeProfitPrice) ||
       (direction === 'SELL' && supportResistanceTakeProfit > takeProfitPrice))
      ? supportResistanceTakeProfit
      : takeProfitPrice;
    
    return {
      price: finalTakeProfitPrice,
      percentage: Math.abs((finalTakeProfitPrice - entryPrice) / entryPrice) * 100,
      type: supportResistanceTakeProfit ? 'support_resistance' : 'volatility_based',
      profit: Math.abs(finalTakeProfitPrice - entryPrice) * quantity
    };
  }

  /**
   * 트레일링 스톱 계산
   * @param {Object} position - 포지션 정보
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 트레일링 스톱 정보
   */
  calculateTrailingStop(position, marketData) {
    const { entryPrice, currentPrice, direction, trailingStop } = position;
    const { volatility } = marketData;
    
    const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    // 수익이 2% 이상일 때 트레일링 스톱 활성화
    if (profitLoss < 2) {
      return {
        active: false,
        price: null,
        reason: '수익 부족'
      };
    }
    
    // 트레일링 스톱 거리 (변동성의 30%)
    const trailingDistance = volatility * 0.3;
    
    // 새로운 트레일링 스톱 가격
    const newTrailingStopPrice = direction === 'BUY'
      ? currentPrice * (1 - trailingDistance / 100)
      : currentPrice * (1 + trailingDistance / 100);
    
    // 기존 트레일링 스톱과 비교
    if (!trailingStop || 
        (direction === 'BUY' && newTrailingStopPrice > trailingStop) ||
        (direction === 'SELL' && newTrailingStopPrice < trailingStop)) {
      
      return {
        active: true,
        price: newTrailingStopPrice,
        distance: trailingDistance,
        reason: '트레일링 스톱 업데이트'
      };
    }
    
    return {
      active: true,
      price: trailingStop,
      distance: trailingDistance,
      reason: '기존 트레일링 스톱 유지'
    };
  }

  /**
   * 포트폴리오 리스크 평가
   * @param {Array} positions - 포지션 목록
   * @param {Object} accountData - 계정 데이터
   * @returns {Object} 포트폴리오 리스크 정보
   */
  evaluatePortfolioRisk(positions, accountData) {
    const { balance } = accountData;
    
    if (!positions || positions.length === 0) {
      return {
        totalRisk: 0,
        riskPercentage: 0,
        maxDrawdown: 0,
        correlation: 0,
        diversification: 1,
        recommendations: ['포트폴리오가 비어있습니다']
      };
    }
    
    // 총 리스크 계산
    const totalRisk = positions.reduce((sum, position) => {
      return sum + (position.risk || 0);
    }, 0);
    
    const riskPercentage = (totalRisk / balance) * 100;
    
    // 최대 드로우다운 계산
    const maxDrawdown = this.calculateMaxDrawdown(positions);
    
    // 상관관계 계산
    const correlation = this.calculatePortfolioCorrelation(positions);
    
    // 다각화 지수 계산
    const diversification = this.calculateDiversification(positions);
    
    // 권장사항 생성
    const recommendations = this.generateRiskRecommendations({
      totalRisk: riskPercentage,
      maxDrawdown,
      correlation,
      diversification
    });
    
    return {
      totalRisk,
      riskPercentage,
      maxDrawdown,
      correlation,
      diversification,
      recommendations
    };
  }

  /**
   * 리스크 권장사항 생성
   * @param {Object} riskMetrics - 리스크 지표
   * @returns {Array} 권장사항 목록
   */
  generateRiskRecommendations(riskMetrics) {
    const recommendations = [];
    
    if (riskMetrics.totalRisk > this.maxPortfolioRisk * 100) {
      recommendations.push('포트폴리오 리스크가 너무 높습니다. 포지션 크기를 줄이세요.');
    }
    
    if (riskMetrics.maxDrawdown > this.maxDrawdown * 100) {
      recommendations.push('최대 드로우다운이 한계를 초과했습니다. 손절매를 강화하세요.');
    }
    
    if (riskMetrics.correlation > this.maxCorrelation) {
      recommendations.push('포지션 간 상관관계가 높습니다. 다각화를 늘리세요.');
    }
    
    if (riskMetrics.diversification < 0.5) {
      recommendations.push('포트폴리오 다각화가 부족합니다. 다양한 자산에 투자하세요.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('포트폴리오 리스크가 적절한 수준입니다.');
    }
    
    return recommendations;
  }

  /**
   * 승률 추정
   * @param {Object} signalData - 시그널 데이터
   * @returns {number} 추정 승률
   */
  estimateWinRate(signalData) {
    const { finalScore, technicalStrength, volatility } = signalData;
    
    let winRate = 0.5; // 기본 50%
    
    // 신호 강도에 따른 조정
    if (finalScore > 80) winRate += 0.2;
    else if (finalScore > 60) winRate += 0.15;
    else if (finalScore > 40) winRate += 0.1;
    
    // 기술적 신호 강도에 따른 조정
    if (technicalStrength > 0.8) winRate += 0.1;
    else if (technicalStrength > 0.6) winRate += 0.05;
    
    // 변동성에 따른 조정
    if (volatility > 20) winRate -= 0.1;
    else if (volatility > 15) winRate -= 0.05;
    
    return Math.max(0.1, Math.min(0.9, winRate));
  }

  /**
   * 평균 수익 추정
   * @param {Object} signalData - 시그널 데이터
   * @returns {number} 추정 평균 수익
   */
  estimateAvgWin(signalData) {
    const { finalScore, volatility } = signalData;
    
    // 기본 평균 수익 (변동성의 80%)
    let avgWin = volatility * 0.8;
    
    // 신호 강도에 따른 조정
    if (finalScore > 80) avgWin *= 1.2;
    else if (finalScore > 60) avgWin *= 1.1;
    else if (finalScore > 40) avgWin *= 1.0;
    else avgWin *= 0.8;
    
    return Math.max(0.5, Math.min(10, avgWin)); // 0.5% ~ 10%
  }

  /**
   * 평균 손실 추정
   * @param {Object} signalData - 시그널 데이터
   * @returns {number} 추정 평균 손실
   */
  estimateAvgLoss(signalData) {
    const { volatility, riskScore } = signalData;
    
    // 기본 평균 손실 (변동성의 60%)
    let avgLoss = volatility * 0.6;
    
    // 리스크 스코어에 따른 조정
    if (riskScore > 80) avgLoss *= 1.2;
    else if (riskScore > 60) avgLoss *= 1.1;
    else if (riskScore > 40) avgLoss *= 1.0;
    else avgLoss *= 0.8;
    
    return Math.max(0.5, Math.min(8, avgLoss)); // 0.5% ~ 8%
  }

  /**
   * 상관관계 계산
   * @param {string} symbol1 - 심볼 1
   * @param {string} symbol2 - 심볼 2
   * @returns {number} 상관관계 (-1 ~ 1)
   */
  calculateCorrelation(symbol1, symbol2) {
    // 실제로는 과거 가격 데이터를 기반으로 계산
    // 여기서는 간단한 추정값 사용
    if (symbol1 === symbol2) return 1.0;
    
    // 같은 섹터의 코인들은 높은 상관관계
    const sector1 = this.getSector(symbol1);
    const sector2 = this.getSector(symbol2);
    
    if (sector1 === sector2) return 0.7;
    
    // 일반적인 상관관계
    return 0.3;
  }

  /**
   * 섹터 분류
   * @param {string} symbol - 심볼
   * @returns {string} 섹터
   */
  getSector(symbol) {
    // 실제로는 더 정교한 분류 필요
    const sectors = {
      'BTC': 'store_of_value',
      'ETH': 'smart_contract',
      'ADA': 'smart_contract',
      'DOT': 'interoperability',
      'LINK': 'oracle',
      'UNI': 'defi',
      'AAVE': 'defi'
    };
    
    return sectors[symbol] || 'other';
  }

  /**
   * 최대 드로우다운 계산
   * @param {Array} positions - 포지션 목록
   * @returns {number} 최대 드로우다운
   */
  calculateMaxDrawdown(positions) {
    let maxDrawdown = 0;
    let peak = 0;
    let current = 0;
    
    positions.forEach(position => {
      const pnl = position.profitLoss || 0;
      current += pnl;
      if (current > peak) peak = current;
      const drawdown = peak - current;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    return maxDrawdown;
  }

  /**
   * 포트폴리오 상관관계 계산
   * @param {Array} positions - 포지션 목록
   * @returns {number} 평균 상관관계
   */
  calculatePortfolioCorrelation(positions) {
    if (positions.length < 2) return 0;
    
    let totalCorrelation = 0;
    let pairCount = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const correlation = this.calculateCorrelation(positions[i].symbol, positions[j].symbol);
        totalCorrelation += correlation;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalCorrelation / pairCount : 0;
  }

  /**
   * 다각화 지수 계산
   * @param {Array} positions - 포지션 목록
   * @returns {number} 다각화 지수 (0 ~ 1)
   */
  calculateDiversification(positions) {
    if (positions.length <= 1) return 1;
    
    // 섹터별 분포 계산
    const sectorDistribution = {};
    positions.forEach(position => {
      const sector = this.getSector(position.symbol);
      sectorDistribution[sector] = (sectorDistribution[sector] || 0) + 1;
    });
    
    // 엔트로피 계산
    const total = positions.length;
    let entropy = 0;
    
    Object.values(sectorDistribution).forEach(count => {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    });
    
    // 최대 엔트로피 (모든 섹터가 동일한 비중)
    const maxEntropy = Math.log2(Object.keys(sectorDistribution).length);
    
    return maxEntropy > 0 ? entropy / maxEntropy : 1;
  }
}

module.exports = RiskManager;
