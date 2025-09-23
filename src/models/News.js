const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['cryptocurrency', 'blockchain', 'finance', 'technology', 'business', 'investment', 'trading', 'economics', 'regulation', 'defi', 'nft'],
    default: 'cryptocurrency'
  },
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1,
      default: null
    },
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    }
  },
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  trendingScore: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  keywords: [{
    type: String,
    trim: true
  }],
  coins: [{
    type: String,
    trim: true,
    uppercase: true
  }],
  language: {
    type: String,
    enum: ['ko', 'en'],
    default: 'ko'
  },
  processed: {
    type: Boolean,
    default: false
  },
  sentimentProcessed: {
    type: Boolean,
    default: false
  },
  sentimentProcessedAt: {
    type: Date,
    default: null
  },
  sentimentRetryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  metadata: {
    author: String,
    tags: [String],
    imageUrl: String,
    readTime: Number,
    wordCount: Number
  }
}, {
  timestamps: true,
  collection: 'news'
});

// 인덱스 설정
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ source: 1, publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ 'sentiment.label': 1, publishedAt: -1 });
newsSchema.index({ coins: 1, publishedAt: -1 });
newsSchema.index({ keywords: 1, publishedAt: -1 });
newsSchema.index({ processed: 1, sentimentProcessed: 1 });
newsSchema.index({ url: 1 }, { unique: true });

// 가상 필드
newsSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.publishedAt.getTime()) / (1000 * 60 * 60));
});

newsSchema.virtual('isRecent').get(function() {
  return this.ageInHours < 24;
});

// 메서드
newsSchema.methods.updateSentiment = function(score, label, confidence) {
  this.sentiment = {
    score: score,
    label: label,
    confidence: confidence
  };
  this.sentimentProcessed = true;
  this.sentimentProcessedAt = new Date();
  return this.save();
};

newsSchema.methods.markAsProcessed = function() {
  this.processed = true;
  return this.save();
};

newsSchema.methods.incrementRetryCount = function() {
  this.sentimentRetryCount += 1;
  return this.save();
};

// 정적 메서드
newsSchema.statics.findRecentNews = function(hours = 24, limit = 100) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    publishedAt: { $gte: cutoffDate }
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.findUnprocessedNews = function(limit = 50) {
  return this.find({
    processed: false
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.findUnprocessedSentiment = function(limit = 50) {
  return this.find({
    sentimentProcessed: false,
    sentimentRetryCount: { $lt: 3 }
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.findBySentiment = function(sentiment, hours = 24, limit = 50) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    'sentiment.label': sentiment,
    publishedAt: { $gte: cutoffDate }
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.findByCoin = function(coinSymbol, hours = 24, limit = 50) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    coins: { $in: [coinSymbol.toUpperCase()] },
    publishedAt: { $gte: cutoffDate }
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.searchNews = function(query, hours = 168, limit = 50) { // 7일
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    $and: [
      { publishedAt: { $gte: cutoffDate } },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { keywords: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.getSentimentStats = function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.aggregate([
    {
      $match: {
        publishedAt: { $gte: cutoffDate },
        sentimentProcessed: true
      }
    },
    {
      $group: {
        _id: '$sentiment.label',
        count: { $sum: 1 },
        avgScore: { $avg: '$sentiment.score' },
        avgConfidence: { $avg: '$sentiment.confidence' }
      }
    }
  ]);
};

newsSchema.statics.cleanupOldNews = function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    publishedAt: { $lt: cutoffDate }
  });
};

// JSON 변환 시 가상 필드 포함
newsSchema.set('toJSON', { virtuals: true });
newsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('News', newsSchema);
