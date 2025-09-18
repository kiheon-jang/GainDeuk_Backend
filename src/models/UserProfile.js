const mongoose = require('mongoose');

/**
 * 사용자 프로필 스키마
 * 사용자의 투자 성향, 경험 수준, 가용 시간 등을 저장
 */
const userProfileSchema = new mongoose.Schema({
  // 기본 사용자 정보
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 투자 성향 관련
  investmentStyle: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive', 'speculative'],
    default: 'moderate'
  },
  
  riskTolerance: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
    description: '위험 감수도 (1: 매우 보수적, 10: 매우 공격적)'
  },
  
  // 경험 수준
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  
  tradingExperience: {
    type: Number,
    min: 0,
    default: 0,
    description: '거래 경험 년수'
  },
  
  // 가용 시간 및 활동 패턴
  availableTime: {
    type: String,
    enum: ['minimal', 'part-time', 'full-time'],
    default: 'part-time'
  },
  
  preferredTimeframes: [{
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
  }],
  
  activeHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '18:00'
    },
    timezone: {
      type: String,
      default: 'Asia/Seoul'
    }
  },
  
  // 투자 선호도
  preferredCoins: [{
    type: String,
    description: '선호하는 코인 심볼 (예: BTC, ETH)'
  }],
  
  maxPositionSize: {
    type: Number,
    min: 0,
    default: 1000,
    description: '최대 포지션 크기 (USD)'
  },
  
  // 알림 설정
  notificationSettings: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily', 'weekly'],
        default: 'immediate'
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      highPriorityOnly: {
        type: Boolean,
        default: false
      }
    },
    discord: {
      enabled: {
        type: Boolean,
        default: false
      },
      webhookUrl: {
        type: String,
        default: ''
      }
    }
  },
  
  // 개인화 설정
  personalizationSettings: {
    signalSensitivity: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
      description: '신호 민감도 (1: 매우 보수적, 10: 매우 민감)'
    },
    
    preferredSignalTypes: [{
      type: String,
      enum: ['technical', 'fundamental', 'sentiment', 'whale', 'social']
    }],
    
    autoTradingEnabled: {
      type: Boolean,
      default: false
    },
    
    maxDailySignals: {
      type: Number,
      min: 1,
      max: 100,
      default: 10
    }
  },
  
  // 학습 및 적응 데이터
  learningData: {
    successfulTrades: {
      type: Number,
      default: 0
    },
    totalTrades: {
      type: Number,
      default: 0
    },
    averageHoldTime: {
      type: Number,
      default: 0,
      description: '평균 보유 시간 (분)'
    },
    preferredStrategies: [{
      type: String,
      description: '성공률이 높은 전략들'
    }]
  },
  
  // 메타데이터
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  profileCompleteness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    description: '프로필 완성도 (%)'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// 인덱스 설정
userProfileSchema.index({ userId: 1 });
userProfileSchema.index({ investmentStyle: 1 });
userProfileSchema.index({ experienceLevel: 1 });
userProfileSchema.index({ lastActive: -1 });
userProfileSchema.index({ isActive: 1 });

// 가상 필드: 성공률 계산
userProfileSchema.virtual('successRate').get(function() {
  if (this.learningData.totalTrades === 0) return 0;
  return (this.learningData.successfulTrades / this.learningData.totalTrades) * 100;
});

// 가상 필드: 프로필 완성도 계산
userProfileSchema.virtual('calculatedCompleteness').get(function() {
  let completeness = 0;
  const fields = [
    'investmentStyle', 'riskTolerance', 'experienceLevel', 
    'availableTime', 'preferredTimeframes', 'preferredCoins',
    'maxPositionSize', 'personalizationSettings.signalSensitivity'
  ];
  
  fields.forEach(field => {
    const value = this.get(field);
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) completeness += 100 / fields.length;
      } else {
        completeness += 100 / fields.length;
      }
    }
  });
  
  return Math.round(completeness);
});

// 미들웨어: 저장 전 프로필 완성도 자동 계산
userProfileSchema.pre('save', function(next) {
  this.profileCompleteness = this.calculatedCompleteness;
  this.lastActive = new Date();
  next();
});

// 인스턴스 메서드: 개인화된 신호 필터링
userProfileSchema.methods.filterSignals = function(signals) {
  return signals.filter(signal => {
    // 신호 민감도 체크
    if (signal.confidence < (this.personalizationSettings.signalSensitivity * 10)) {
      return false;
    }
    
    // 선호하는 신호 타입 체크
    if (this.personalizationSettings.preferredSignalTypes.length > 0) {
      if (!this.personalizationSettings.preferredSignalTypes.includes(signal.type)) {
        return false;
      }
    }
    
    // 선호하는 코인 체크
    if (this.preferredCoins.length > 0) {
      if (!this.preferredCoins.includes(signal.coin)) {
        return false;
      }
    }
    
    return true;
  });
};

// 인스턴스 메서드: 거래 결과 업데이트
userProfileSchema.methods.updateTradingResult = function(successful, holdTime) {
  this.learningData.totalTrades += 1;
  if (successful) {
    this.learningData.successfulTrades += 1;
  }
  
  // 평균 보유 시간 업데이트 (가중 평균)
  const totalTrades = this.learningData.totalTrades;
  this.learningData.averageHoldTime = 
    ((this.learningData.averageHoldTime * (totalTrades - 1)) + holdTime) / totalTrades;
  
  return this.save();
};

// 정적 메서드: 사용자별 맞춤 추천 생성
userProfileSchema.statics.generatePersonalizedRecommendations = function(userId) {
  return this.findOne({ userId }).then(profile => {
    if (!profile) {
      throw new Error('사용자 프로필을 찾을 수 없습니다.');
    }
    
    const recommendations = {
      suggestedTimeframes: profile.preferredTimeframes.length > 0 
        ? profile.preferredTimeframes 
        : this.getDefaultTimeframes(profile.experienceLevel),
      
      suggestedCoins: profile.preferredCoins.length > 0 
        ? profile.preferredCoins 
        : this.getDefaultCoins(profile.investmentStyle),
      
      riskLevel: this.calculateRiskLevel(profile),
      
      maxDailySignals: profile.personalizationSettings.maxDailySignals
    };
    
    return recommendations;
  });
};

// 정적 메서드: 경험 수준별 기본 타임프레임
userProfileSchema.statics.getDefaultTimeframes = function(experienceLevel) {
  const defaults = {
    beginner: ['1h', '4h', '1d'],
    intermediate: ['15m', '1h', '4h'],
    advanced: ['5m', '15m', '1h'],
    expert: ['1m', '5m', '15m']
  };
  return defaults[experienceLevel] || defaults.beginner;
};

// 정적 메서드: 투자 스타일별 기본 코인
userProfileSchema.statics.getDefaultCoins = function(investmentStyle) {
  const defaults = {
    conservative: ['BTC', 'ETH'],
    moderate: ['BTC', 'ETH', 'BNB', 'ADA'],
    aggressive: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT'],
    speculative: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX']
  };
  return defaults[investmentStyle] || defaults.moderate;
};

// 정적 메서드: 리스크 레벨 계산
userProfileSchema.statics.calculateRiskLevel = function(profile) {
  let riskScore = 0;
  
  // 투자 스타일별 점수
  const styleScores = {
    conservative: 2,
    moderate: 5,
    aggressive: 8,
    speculative: 10
  };
  riskScore += styleScores[profile.investmentStyle] || 5;
  
  // 위험 감수도
  riskScore += profile.riskTolerance;
  
  // 경험 수준별 점수
  const experienceScores = {
    beginner: 1,
    intermediate: 3,
    advanced: 5,
    expert: 7
  };
  riskScore += experienceScores[profile.experienceLevel] || 1;
  
  // 정규화 (0-10 스케일)
  return Math.min(10, Math.max(1, Math.round(riskScore / 3)));
};

module.exports = mongoose.model('UserProfile', userProfileSchema);
