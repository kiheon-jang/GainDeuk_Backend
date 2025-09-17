const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
    trim: true
  },
  coinId: { 
    type: String, 
    required: true,
    index: true,
    trim: true
  },
  symbol: {
    type: String,
    uppercase: true,
    index: true,
    trim: true
  },
  alertType: {
    type: String,
    enum: ['STRONG_SIGNAL', 'PRICE_TARGET', 'VOLUME_SPIKE', 'WHALE_MOVE', 'CUSTOM'],
    required: true,
    index: true
  },
  triggerScore: {
    type: Number,
    min: 0,
    max: 100,
    index: true
  },
  isTriggered: { 
    type: Boolean, 
    default: false,
    index: true
  },
  triggeredAt: {
    type: Date,
    index: true
  },
  settings: {
    minScore: { 
      type: Number, 
      default: 80,
      min: 0,
      max: 100
    },
    maxScore: { 
      type: Number, 
      default: 20,
      min: 0,
      max: 100
    },
    timeframes: [{
      type: String,
      enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM']
    }],
    notificationEnabled: { 
      type: Boolean, 
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: false
    },
    pushEnabled: {
      type: Boolean,
      default: true
    },
    webhookUrl: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: '유효하지 않은 웹훅 URL입니다'
      }
    },
    cooldownMinutes: {
      type: Number,
      default: 60,
      min: 0
    }
  },
  metadata: {
    lastTriggered: Date,
    triggerCount: {
      type: Number,
      default: 0,
      min: 0
    },
    message: String,
    data: mongoose.Schema.Types.Mixed,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 인덱스 설정
alertSchema.index({ coinId: 1, isTriggered: 1 });
alertSchema.index({ userId: 1, isTriggered: 1 });
alertSchema.index({ alertType: 1, isTriggered: 1 });
alertSchema.index({ triggeredAt: -1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ 'settings.cooldownMinutes': 1 });

// 가상 필드
alertSchema.virtual('isActive').get(function() {
  return !this.isTriggered || this.canTriggerAgain();
});

alertSchema.virtual('timeSinceLastTrigger').get(function() {
  if (!this.metadata.lastTriggered) return null;
  return Date.now() - this.metadata.lastTriggered.getTime();
});

// 인스턴스 메서드
alertSchema.methods.canTriggerAgain = function() {
  if (!this.metadata.lastTriggered) return true;
  
  const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
  const timeSinceLastTrigger = Date.now() - this.metadata.lastTriggered.getTime();
  
  return timeSinceLastTrigger >= cooldownMs;
};

alertSchema.methods.trigger = function(triggerData = {}) {
  if (!this.canTriggerAgain()) {
    return false;
  }
  
  this.isTriggered = true;
  this.triggeredAt = new Date();
  this.triggerScore = triggerData.score || this.triggerScore;
  this.metadata.lastTriggered = new Date();
  this.metadata.triggerCount += 1;
  this.metadata.message = triggerData.message || this.generateMessage();
  this.metadata.data = { ...this.metadata.data, ...triggerData };
  
  return this.save();
};

alertSchema.methods.reset = function() {
  this.isTriggered = false;
  this.triggeredAt = null;
  this.metadata.message = null;
  this.metadata.data = {};
  
  return this.save();
};

alertSchema.methods.generateMessage = function() {
  const score = this.triggerScore;
  const action = score >= 80 ? '강한 매수' : score <= 20 ? '강한 매도' : '중립';
  
  return `${this.symbol} (${this.coinId}) 신호 알림: ${action} (점수: ${score})`;
};

alertSchema.methods.updateSettings = function(newSettings) {
  this.settings = { ...this.settings, ...newSettings };
  return this.save();
};

// 정적 메서드
alertSchema.statics.findByCoinId = function(coinId) {
  return this.find({ coinId });
};

alertSchema.statics.findByUserId = function(userId) {
  return this.find({ userId });
};

alertSchema.statics.findActive = function() {
  return this.find({ isTriggered: false });
};

alertSchema.statics.findTriggered = function(limit = 50) {
  return this.find({ isTriggered: true })
    .sort({ triggeredAt: -1 })
    .limit(limit);
};

alertSchema.statics.findByType = function(alertType) {
  return this.find({ alertType });
};

alertSchema.statics.createStrongSignalAlert = function(coinId, symbol, triggerScore, userId = null) {
  return this.create({
    userId,
    coinId,
    symbol: symbol.toUpperCase(),
    alertType: 'STRONG_SIGNAL',
    triggerScore,
    settings: {
      minScore: 80,
      maxScore: 20,
      notificationEnabled: true,
      cooldownMinutes: 30
    },
    metadata: {
      priority: triggerScore >= 90 || triggerScore <= 10 ? 'critical' : 'high'
    }
  });
};

alertSchema.statics.createPriceTargetAlert = function(coinId, symbol, targetPrice, currentPrice, userId = null) {
  const isAbove = targetPrice > currentPrice;
  
  return this.create({
    userId,
    coinId,
    symbol: symbol.toUpperCase(),
    alertType: 'PRICE_TARGET',
    settings: {
      notificationEnabled: true,
      cooldownMinutes: 60
    },
    metadata: {
      priority: 'medium',
      data: {
        targetPrice,
        currentPrice,
        isAbove
      }
    }
  });
};

alertSchema.statics.createVolumeSpikeAlert = function(coinId, symbol, volumeRatio, userId = null) {
  return this.create({
    userId,
    coinId,
    symbol: symbol.toUpperCase(),
    alertType: 'VOLUME_SPIKE',
    settings: {
      notificationEnabled: true,
      cooldownMinutes: 15
    },
    metadata: {
      priority: 'high',
      data: {
        volumeRatio
      }
    }
  });
};

alertSchema.statics.createWhaleMoveAlert = function(coinId, symbol, whaleActivity, userId = null) {
  return this.create({
    userId,
    coinId,
    symbol: symbol.toUpperCase(),
    alertType: 'WHALE_MOVE',
    settings: {
      notificationEnabled: true,
      cooldownMinutes: 30
    },
    metadata: {
      priority: 'high',
      data: {
        whaleActivity
      }
    }
  });
};

alertSchema.statics.getAlertStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        activeAlerts: {
          $sum: { $cond: [{ $eq: ['$isTriggered', false] }, 1, 0] }
        },
        triggeredAlerts: {
          $sum: { $cond: [{ $eq: ['$isTriggered', true] }, 1, 0] }
        },
        strongSignalAlerts: {
          $sum: { $cond: [{ $eq: ['$alertType', 'STRONG_SIGNAL'] }, 1, 0] }
        },
        priceTargetAlerts: {
          $sum: { $cond: [{ $eq: ['$alertType', 'PRICE_TARGET'] }, 1, 0] }
        },
        volumeSpikeAlerts: {
          $sum: { $cond: [{ $eq: ['$alertType', 'VOLUME_SPIKE'] }, 1, 0] }
        },
        whaleMoveAlerts: {
          $sum: { $cond: [{ $eq: ['$alertType', 'WHALE_MOVE'] }, 1, 0] }
        }
      }
    }
  ]);
};

alertSchema.statics.getRecentTriggers = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    isTriggered: true,
    triggeredAt: { $gte: since }
  })
  .sort({ triggeredAt: -1 })
  .limit(limit);
};

// 미들웨어
alertSchema.pre('save', function(next) {
  // 심볼을 대문자로 변환
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }
  
  // 설정값 검증
  if (this.settings.minScore < 0) this.settings.minScore = 0;
  if (this.settings.minScore > 100) this.settings.minScore = 100;
  if (this.settings.maxScore < 0) this.settings.maxScore = 0;
  if (this.settings.maxScore > 100) this.settings.maxScore = 100;
  if (this.settings.cooldownMinutes < 0) this.settings.cooldownMinutes = 0;
  
  next();
});

alertSchema.post('save', function(doc) {
  if (doc.isTriggered) {
    console.log(`Alert triggered: ${doc.symbol} - ${doc.alertType} - Score: ${doc.triggerScore}`);
  }
});

module.exports = mongoose.model('Alert', alertSchema);
