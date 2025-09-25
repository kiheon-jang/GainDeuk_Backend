const BaseStrategy = require('./BaseStrategy');
const logger = require('../utils/logger');

/**
 * REJECT 전략 클래스
 * 거래하지 않는 신호에 대한 전략
 */
class RejectStrategy extends BaseStrategy {
  constructor() {
    super("Reject", "none", "N/A", 0, 0, 0, 0); // 거래하지 않음
  }

  canExecute(signalData, marketData) {
    return false; // REJECT 전략은 항상 실행하지 않음
  }

  analyzeEntry(signalData, marketData) {
    // REJECT 전략은 거래하지 않으므로 항상 거부
    return {
      shouldEnter: false,
      confidence: 0,
      reason: "신호가 너무 약하거나 위험이 높아 거래하지 않음",
      entryPrice: marketData.currentPrice,
      riskLevel: "none"
    };
  }

  execute(signalData, marketData, accountData) {
    logger.info(`Executing Reject Strategy for signal: ${signalData.timeframe}`);
    
    return {
      strategy: this.name,
      timeframe: signalData.timeframe,
      shouldExecute: false,
      entryAnalysis: {
        action: "HOLD",
        entryPrice: marketData.currentPrice,
        confidence: 0,
        entryScore: signalData.finalScore,
        reason: "신호가 너무 약하거나 위험이 높아 거래하지 않음",
        urgency: 0,
        expectedDuration: 0,
        riskReward: 0
      },
      positionSize: {
        size: 0,
        value: 0,
        quantity: 0,
        risk: 0,
        maxLoss: 0
      },
      stopLoss: {
        price: 0,
        percentage: 0,
        type: "none",
        risk: 0
      },
      takeProfit: {
        price: 0,
        percentage: 0,
        type: "none",
        profit: 0
      },
      portfolioRisk: {
        totalRisk: 0,
        riskPercentage: 0,
        maxDrawdown: 0,
        correlation: 0,
        diversification: 0,
        recommendations: ["거래하지 않음"]
      },
      confidence: 0,
      riskReward: 0,
      expectedDuration: 0,
      recommendations: ["신호가 약하거나 위험이 높아 거래하지 않음", "시장 상황을 다시 확인하세요"]
    };
  }
}

module.exports = RejectStrategy;
