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
    }
  },
  recommendation: {
    action: { 
      type: String, 
      enum: ['STRONG_BUY', 'BUY', 'HOLD', 'WEAK_SELL', 'SELL', 'STRONG_SELL'],
      required: true,
      index: true
    },
    confidence: { 
      type: String, 
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: true
    }
  },
  timeframe: {
    type: String,
    enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['high_priority', 'medium_priority', 'low_priority'],
    required: true,
    index: true
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
  if (score >= 90 || score <= 10) return 'SCALPING';
  if (score >= 80 || score <= 20) return 'DAY_TRADING';
  if (score >= 70 || score <= 30) return 'SWING_TRADING';
  return 'LONG_TERM';
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
