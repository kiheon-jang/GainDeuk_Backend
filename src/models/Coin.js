const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  coinId: { 
    type: String, 
    required: true, 
    unique: true,
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
  image: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: '유효하지 않은 이미지 URL입니다'
    }
  },
  currentPrice: {
    type: Number,
    min: 0,
    index: true
  },
  marketCap: {
    type: Number,
    min: 0,
    index: true
  },
  marketCapRank: {
    type: Number,
    min: 1,
    index: true
  },
  totalVolume: {
    type: Number,
    min: 0
  },
  priceChange: {
    '1h': {
      type: Number,
      default: 0
    },
    '24h': {
      type: Number,
      default: 0
    },
    '7d': {
      type: Number,
      default: 0
    },
    '30d': {
      type: Number,
      default: 0
    }
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  // 추가 메타데이터
  metadata: {
    circulatingSupply: Number,
    totalSupply: Number,
    maxSupply: Number,
    ath: Number, // All Time High
    athChangePercentage: Number,
    atl: Number, // All Time Low
    atlChangePercentage: Number,
    priceChange24h: Number,
    marketCapChange24h: Number,
    priceChangePercentage24h: Number,
    marketCapChangePercentage24h: Number,
    totalVolumeChange24h: Number,
    totalVolumeChangePercentage24h: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 인덱스 설정
coinSchema.index({ coinId: 1 });
coinSchema.index({ symbol: 1 });
coinSchema.index({ marketCapRank: 1 });
coinSchema.index({ lastUpdated: -1 });
coinSchema.index({ currentPrice: -1 });
coinSchema.index({ marketCap: -1 });
coinSchema.index({ 'priceChange.24h': -1 });

// 가상 필드
coinSchema.virtual('volumeToMarketCapRatio').get(function() {
  if (!this.marketCap || this.marketCap === 0) return 0;
  return this.totalVolume / this.marketCap;
});

coinSchema.virtual('priceChange24hPercentage').get(function() {
  return this.priceChange['24h'] || 0;
});

// 인스턴스 메서드
coinSchema.methods.updatePrice = function(priceData) {
  this.currentPrice = priceData.current_price;
  this.marketCap = priceData.market_cap;
  this.marketCapRank = priceData.market_cap_rank;
  this.totalVolume = priceData.total_volume;
  this.priceChange = {
    '1h': priceData.price_change_percentage_1h || 0,
    '24h': priceData.price_change_percentage_24h || 0,
    '7d': priceData.price_change_percentage_7d || 0,
    '30d': priceData.price_change_percentage_30d || 0
  };
  this.lastUpdated = new Date();
  
  // 메타데이터 업데이트
  if (priceData.circulating_supply) this.metadata.circulatingSupply = priceData.circulating_supply;
  if (priceData.total_supply) this.metadata.totalSupply = priceData.total_supply;
  if (priceData.max_supply) this.metadata.maxSupply = priceData.max_supply;
  if (priceData.ath) this.metadata.ath = priceData.ath;
  if (priceData.ath_change_percentage) this.metadata.athChangePercentage = priceData.ath_change_percentage;
  if (priceData.atl) this.metadata.atl = priceData.atl;
  if (priceData.atl_change_percentage) this.metadata.atlChangePercentage = priceData.atl_change_percentage;
  
  return this.save();
};

coinSchema.methods.getPriceChange = function(timeframe) {
  return this.priceChange[timeframe] || 0;
};

coinSchema.methods.isPriceUp = function(timeframe = '24h') {
  return this.getPriceChange(timeframe) > 0;
};

coinSchema.methods.isPriceDown = function(timeframe = '24h') {
  return this.getPriceChange(timeframe) < 0;
};

// 정적 메서드
coinSchema.statics.findBySymbol = function(symbol) {
  return this.findOne({ symbol: symbol.toUpperCase() });
};

coinSchema.statics.findByCoinId = function(coinId) {
  return this.findOne({ coinId });
};

coinSchema.statics.getTopCoins = function(limit = 100) {
  return this.find({ marketCapRank: { $lte: limit } })
    .sort({ marketCapRank: 1 })
    .limit(limit);
};

coinSchema.statics.getCoinsByPriceChange = function(timeframe = '24h', limit = 50) {
  return this.find({ [`priceChange.${timeframe}`]: { $exists: true } })
    .sort({ [`priceChange.${timeframe}`]: -1 })
    .limit(limit);
};

coinSchema.statics.getCoinsByVolume = function(limit = 50) {
  return this.find({ totalVolume: { $gt: 0 } })
    .sort({ totalVolume: -1 })
    .limit(limit);
};

coinSchema.statics.searchCoins = function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { symbol: searchRegex },
      { name: searchRegex },
      { coinId: searchRegex }
    ]
  })
  .sort({ marketCapRank: 1 })
  .limit(limit);
};

// 미들웨어
coinSchema.pre('save', function(next) {
  // 심볼을 대문자로 변환
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }
  
  // 가격이 0보다 작으면 0으로 설정
  if (this.currentPrice < 0) {
    this.currentPrice = 0;
  }
  
  next();
});

coinSchema.post('save', function(doc) {
  console.log(`Coin saved: ${doc.symbol} (${doc.name})`);
});

module.exports = mongoose.model('Coin', coinSchema);
