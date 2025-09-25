const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  coinId: { 
    type: String, 
    required: true,
    index: true,
    trim: true
  },
  symbol: { 
    type: String, 
    required: true,
    uppercase: true,
    index: true,
    trim: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  finalScore: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: true,
    index: true
  },
  breakdown: {
    price: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    volume: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    market: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    sentiment: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    whale: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    volatility: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    correlation: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    macro: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  recommendation: {
    action: { 
      type: String, 
      enum: ['STRONG_BUY', 'BUY', 'HOLD', 'WEAK_SELL', 'SELL', 'STRONG_SELL'],
      required: true
    },
    confidence: { 
      type: String, 
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: true
    }
  },
  timeframe: {
    type: String,
    enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM', 'REJECT'],
    required: true
  },
  priority: {
    type: String,
    enum: ['high_priority', 'medium_priority', 'low_priority', 'rejected'],
    required: true
  },
  rank: {
    type: Number,
    min: 1,
    index: true
  },
  currentPrice: {
    type: Number,
    min: 0
  },
  marketCap: {
    type: Number,
    min: 0
  },
  metadata: {
    priceData: {
      change_1h: Number,
      change_24h: Number,
      change_7d: Number,
      change_30d: Number
    },
    volumeRatio: {
      type: Number,
      min: 0
    },
    whaleActivity: {
      type: Number,
      min: 0,
      max: 100
    },
    newsCount: {
      type: Number,
      min: 0,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    calculationTime: {
      type: Number, // 계산에 걸린 시간 (ms)
      min: 0
    },
    dataQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    strategy: {
      determinedBy: String,
      timeframe: String,
      score: Number,
      volatility: Number,
      volumeRatio: Number,
      riskScore: Number,
      liquidityGrade: String,
      technicalStrength: Number,
      tradingStrategy: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 복합 인덱스
signalSchema.index({ coinId: 1, createdAt: -1 });
signalSchema.index({ finalScore: -1 });
signalSchema.index({ 'recommendation.action': 1 });
signalSchema.index({ timeframe: 1 });
signalSchema.index({ priority: 1 });
signalSchema.index({ createdAt: -1 });
signalSchema.index({ updatedAt: -1 });

// 가상 필드
signalSchema.virtual('isStrongSignal').get(function() {
  return this.finalScore >= 80 || this.finalScore <= 20;
});

signalSchema.virtual('isBuySignal').get(function() {
  return ['STRONG_BUY', 'BUY'].includes(this.recommendation.action);
});

signalSchema.virtual('isSellSignal').get(function() {
  return ['STRONG_SELL', 'SELL', 'WEAK_SELL'].includes(this.recommendation.action);
});

signalSchema.virtual('signalStrength').get(function() {
  if (this.finalScore >= 90 || this.finalScore <= 10) return 'very_strong';
  if (this.finalScore >= 80 || this.finalScore <= 20) return 'strong';
  if (this.finalScore >= 70 || this.finalScore <= 30) return 'moderate';
  if (this.finalScore >= 60 || this.finalScore <= 40) return 'weak';
  return 'neutral';
});

// 인스턴스 메서드
signalSchema.methods.updateScore = function(newScore, breakdown) {
  this.finalScore = Math.max(0, Math.min(100, newScore));
  
  if (breakdown) {
    this.breakdown = { ...this.breakdown, ...breakdown };
  }
  
  // 추천 액션 업데이트
  this.recommendation = this.getRecommendation(this.finalScore);
  this.timeframe = this.getTimeframe(this.finalScore);
  
  this.metadata.lastUpdated = new Date();
  
  return this.save();
};

signalSchema.methods.getRecommendation = function(score) {
  if (score >= 85) return { action: 'STRONG_BUY', confidence: 'HIGH' };
  if (score >= 75) return { action: 'BUY', confidence: 'HIGH' };
  if (score >= 65) return { action: 'BUY', confidence: 'MEDIUM' };
  if (score >= 55) return { action: 'HOLD', confidence: 'MEDIUM' };
  if (score >= 45) return { action: 'HOLD', confidence: 'LOW' };
  if (score >= 35) return { action: 'WEAK_SELL', confidence: 'MEDIUM' };
  if (score >= 25) return { action: 'SELL', confidence: 'MEDIUM' };
  return { action: 'STRONG_SELL', confidence: 'HIGH' };
};

signalSchema.methods.getTimeframe = function(score) {
  // 보편적인 타임프레임 분류: 점수 + 변동성 + 거래량 기반
  const volatility = this.metadata?.volatility || 0;
  const volumeRatio = this.metadata?.volumeRatio || 1;
  const marketCapRank = this.metadata?.marketCapRank || 999999;
  
  // 변동성 점수 (0-100)
  const volatilityScore = Math.min(volatility * 10, 100);
  
  // 거래량 점수 (0-100)
  const volumeScore = Math.min((volumeRatio - 1) * 50, 100);
  
  // 시장 규모 점수 (상위 코인일수록 높은 점수)
  const marketCapScore = marketCapRank <= 100 ? 100 : 
                        marketCapRank <= 500 ? 70 : 
                        marketCapRank <= 1000 ? 40 : 10;
  
  // 종합 점수 계산 (가중 평균)
  const compositeScore = (score * 0.4) + (volatilityScore * 0.3) + (volumeScore * 0.2) + (marketCapScore * 0.1);
  
  // 타임프레임 분류
  if (compositeScore >= 80 || compositeScore <= 20) {
    return 'SCALPING'; // 고변동성 + 강한 신호
  } else if (compositeScore >= 65 || compositeScore <= 35) {
    return 'DAY_TRADING'; // 중고변동성 + 중강한 신호
  } else if (compositeScore >= 50 || compositeScore <= 50) {
    return 'SWING_TRADING'; // 중변동성 + 중간 신호
  } else {
    return 'LONG_TERM'; // 저변동성 + 약한 신호
  }
};

signalSchema.methods.getBreakdownPercentage = function() {
  const total = Object.values(this.breakdown).reduce((sum, value) => sum + value, 0);
  const breakdown = {};
  
  for (const [key, value] of Object.entries(this.breakdown)) {
    breakdown[key] = total > 0 ? Math.round((value / total) * 100) : 0;
  }
  
  return breakdown;
};

// 정적 메서드
signalSchema.statics.findByCoinId = function(coinId) {
  return this.findOne({ coinId }).sort({ createdAt: -1 });
};

signalSchema.statics.findBySymbol = function(symbol) {
  return this.findOne({ symbol: symbol.toUpperCase() }).sort({ createdAt: -1 });
};

signalSchema.statics.getStrongSignals = function(limit = 100) {
  return this.find({
    $or: [
      { finalScore: { $gte: 80 } },
      { finalScore: { $lte: 20 } }
    ]
  })
  .sort({ finalScore: -1 })
  .limit(limit);
};

signalSchema.statics.getSignalsByAction = function(action, limit = 50) {
  return this.find({ 'recommendation.action': action })
    .sort({ finalScore: -1 })
    .limit(limit);
};

signalSchema.statics.getSignalsByTimeframe = function(timeframe, limit = 50) {
  return this.find({ timeframe })
    .sort({ finalScore: -1 })
    .limit(limit);
};

signalSchema.statics.getSignalsByStrategy = function(strategy, limit = 50) {
  return this.find({ timeframe: strategy })
    .sort({ finalScore: -1 })
    .limit(limit);
};

signalSchema.statics.getSignalsByScoreRange = function(minScore, maxScore, limit = 50) {
  return this.find({
    finalScore: { $gte: minScore, $lte: maxScore }
  })
  .sort({ finalScore: -1 })
  .limit(limit);
};

signalSchema.statics.getTopSignals = function(limit = 50) {
  return this.find()
    .sort({ finalScore: -1 })
    .limit(limit);
};

signalSchema.statics.searchSignals = function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { symbol: searchRegex },
      { name: searchRegex },
      { coinId: searchRegex }
    ]
  })
  .sort({ finalScore: -1 })
  .limit(limit);
};

signalSchema.statics.getSignalStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSignals: { $sum: 1 },
        avgScore: { $avg: '$finalScore' },
        maxScore: { $max: '$finalScore' },
        minScore: { $min: '$finalScore' },
        strongBuyCount: {
          $sum: { $cond: [{ $eq: ['$recommendation.action', 'STRONG_BUY'] }, 1, 0] }
        },
        buyCount: {
          $sum: { $cond: [{ $eq: ['$recommendation.action', 'BUY'] }, 1, 0] }
        },
        holdCount: {
          $sum: { $cond: [{ $eq: ['$recommendation.action', 'HOLD'] }, 1, 0] }
        },
        sellCount: {
          $sum: { $cond: [{ $eq: ['$recommendation.action', 'SELL'] }, 1, 0] }
        },
        strongSellCount: {
          $sum: { $cond: [{ $eq: ['$recommendation.action', 'STRONG_SELL'] }, 1, 0] }
        }
      }
    }
  ]);
};

signalSchema.statics.getTimeframeStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$timeframe',
        count: { $sum: 1 },
        avgScore: { $avg: '$finalScore' },
        maxScore: { $max: '$finalScore' },
        minScore: { $min: '$finalScore' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

signalSchema.statics.getStrategyStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$timeframe',
        count: { $sum: 1 },
        avgScore: { $avg: '$finalScore' },
        maxScore: { $max: '$finalScore' },
        minScore: { $min: '$finalScore' },
        avgVolatility: { $avg: '$metadata.volatility' },
        avgVolumeRatio: { $avg: '$metadata.volumeRatio' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 중복 제거 메서드 - 같은 코인의 오래된 신호 삭제
signalSchema.statics.removeDuplicateSignals = async function(coinId, keepLatest = true) {
  try {
    // 같은 코인의 모든 신호 조회 (생성일 기준 정렬)
    const signals = await this.find({ coinId })
      .sort({ createdAt: keepLatest ? -1 : 1 })
      .lean();

    if (signals.length <= 1) {
      return { deleted: 0, kept: signals.length };
    }

    // 최신(또는 가장 오래된) 신호를 제외한 나머지 삭제
    const signalToKeep = signals[0];
    const signalsToDelete = signals.slice(1);

    if (signalsToDelete.length > 0) {
      const deleteResult = await this.deleteMany({
        _id: { $in: signalsToDelete.map(s => s._id) }
      });

      console.log(`🧹 중복 신호 정리: ${coinId} - ${deleteResult.deletedCount}개 삭제, 1개 유지`);
      
      return {
        deleted: deleteResult.deletedCount,
        kept: 1,
        keptSignal: signalToKeep
      };
    }

    return { deleted: 0, kept: 1, keptSignal: signalToKeep };
  } catch (error) {
    console.error(`중복 신호 제거 실패 (${coinId}):`, error.message);
    throw error;
  }
};

// 모든 코인에 대해 중복 제거 실행
signalSchema.statics.cleanupAllDuplicates = async function() {
  try {
    console.log('🧹 전체 중복 신호 정리 시작...');
    
    // 모든 고유한 coinId 조회
    const uniqueCoinIds = await this.distinct('coinId');
    let totalDeleted = 0;
    let totalKept = 0;
    let processedCoins = 0;

    for (const coinId of uniqueCoinIds) {
      try {
        const result = await this.removeDuplicateSignals(coinId, true);
        totalDeleted += result.deleted;
        totalKept += result.kept;
        processedCoins++;
      } catch (error) {
        console.error(`코인 ${coinId} 중복 제거 실패:`, error.message);
      }
    }

    console.log(`✅ 중복 신호 정리 완료: ${processedCoins}개 코인 처리, ${totalDeleted}개 삭제, ${totalKept}개 유지`);
    
    return {
      processedCoins,
      totalDeleted,
      totalKept,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('전체 중복 신호 정리 실패:', error.message);
    throw error;
  }
};

// 미들웨어
signalSchema.pre('save', function(next) {
  // 심볼을 대문자로 변환
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }
  
  // 최종 점수 범위 검증
  this.finalScore = Math.max(0, Math.min(100, this.finalScore));
  
  // breakdown 값들 범위 검증
  for (const [key, value] of Object.entries(this.breakdown)) {
    this.breakdown[key] = Math.max(0, Math.min(100, value));
  }
  
  next();
});

signalSchema.post('save', function(doc) {
  console.log(`Signal saved: ${doc.symbol} - Score: ${doc.finalScore} - Action: ${doc.recommendation.action}`);
});

module.exports = mongoose.model('Signal', signalSchema);
