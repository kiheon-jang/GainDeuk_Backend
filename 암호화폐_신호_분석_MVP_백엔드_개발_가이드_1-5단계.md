# 🚀 암호화폐 신호 분석 MVP 백엔드 개발 가이드 (1-5단계)

## 📋 프로젝트 개요

**목표**: 17,000개 이상의 모든 암호화폐를 실시간 분석하여 0-100점 신호 스코어와 투자 전략을 제공하는 백엔드 시스템 구축

**핵심 기능**:
- 실시간 암호화폐 데이터 수집 및 분석
- 뉴스/SNS 감정분석
- 고래 거래 추적
- 0-100점 신호 스코어링
- 타임프레임별 투자 전략 추천 (스켈핑/데이트레이딩/스윙/장기)
- RESTful API 제공
- 실시간 알림 시스템

**기술 스택**: Node.js + Express + MongoDB + Redis + Firebase
**예산**: 100만원 이하 (무료 티어 최대 활용)
**개발 기간**: 10주

---

## 🛠️ 1단계: 개발 환경 설정 (1주차)

### 프로젝트 구조 생성
```bash
# 프로젝트 초기화
mkdir crypto-signal-backend
cd crypto-signal-backend
npm init -y

# 필수 패키지 설치
npm install express mongoose redis ioredis node-cron axios cheerio sentiment natural firebase-admin dotenv cors helmet compression morgan winston
npm install -D nodemon jest supertest

# 프로젝트 구조
mkdir -p {src/{controllers,models,services,middleware,utils,routes},config,tests,logs}
```

### 환경 설정 파일
```javascript
// .env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/crypto-signals
REDIS_URL=redis://localhost:6379
COINGECKO_API_KEY=your_free_demo_key
FIREBASE_PROJECT_ID=your_project_id
LOG_LEVEL=info

# API 제한 설정
COINGECKO_RATE_LIMIT=30
COINGECKO_MONTHLY_LIMIT=10000
```

### 기본 서버 설정
```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// 미들웨어 설정
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 요청 제한
});
app.use('/api/', limiter);

// 라우트 설정
app.use('/api/coins', require('./routes/coins'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/alerts', require('./routes/alerts'));

module.exports = app;
```

---

## 🗄️ 2단계: 데이터베이스 설계 (1주차)

### MongoDB 스키마 설계
```javascript
// src/models/Coin.js
const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  coinId: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  image: String,
  currentPrice: Number,
  marketCap: Number,
  marketCapRank: Number,
  totalVolume: Number,
  priceChange: {
    '1h': Number,
    '24h': Number,
    '7d': Number,
    '30d': Number
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  indexes: [
    { coinId: 1 },
    { symbol: 1 },
    { marketCapRank: 1 },
    { lastUpdated: -1 }
  ]
});

// src/models/Signal.js
const signalSchema = new mongoose.Schema({
  coinId: { type: String, required: true },
  symbol: { type: String, required: true },
  finalScore: { type: Number, min: 0, max: 100, required: true },
  breakdown: {
    price: Number,
    volume: Number,
    market: Number,
    sentiment: Number,
    whale: Number
  },
  recommendation: {
    action: { 
      type: String, 
      enum: ['STRONG_BUY', 'BUY', 'HOLD', 'WEAK_SELL', 'SELL'] 
    },
    confidence: { 
      type: String, 
      enum: ['HIGH', 'MEDIUM', 'LOW'] 
    }
  },
  timeframe: {
    type: String,
    enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM']
  },
  priority: {
    type: String,
    enum: ['high_priority', 'medium_priority', 'low_priority']
  },
  metadata: {
    priceData: Object,
    volumeRatio: Number,
    whaleActivity: Number,
    newsCount: Number
  }
}, {
  timestamps: true,
  indexes: [
    { coinId: 1, createdAt: -1 },
    { finalScore: -1 },
    { 'recommendation.action': 1 },
    { timeframe: 1 },
    { createdAt: -1 }
  ]
});

// src/models/Alert.js
const alertSchema = new mongoose.Schema({
  userId: String, // 추후 사용자 시스템용
  coinId: { type: String, required: true },
  alertType: {
    type: String,
    enum: ['STRONG_SIGNAL', 'PRICE_TARGET', 'VOLUME_SPIKE', 'WHALE_MOVE']
  },
  triggerScore: Number,
  isTriggered: { type: Boolean, default: false },
  triggeredAt: Date,
  settings: {
    minScore: { type: Number, default: 80 },
    maxScore: { type: Number, default: 20 },
    timeframes: [String],
    notificationEnabled: { type: Boolean, default: true }
  }
}, { timestamps: true });
```

### Redis 캐시 전략
```javascript
// src/services/CacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.defaultTTL = {
      coinData: 300,      // 5분
      signals: 900,       // 15분
      news: 1800,         // 30분
      whaleData: 600      // 10분
    };
  }

  // 코인 데이터 캐싱
  async setCoinData(coinId, data, ttl = this.defaultTTL.coinData) {
    await this.redis.setex(`coin:${coinId}`, ttl, JSON.stringify(data));
  }

  async getCoinData(coinId) {
    const data = await this.redis.get(`coin:${coinId}`);
    return data ? JSON.parse(data) : null;
  }

  // 배치 데이터 캐싱
  async setBatchData(page, data, ttl = this.defaultTTL.coinData) {
    await this.redis.setex(`batch:${page}`, ttl, JSON.stringify(data));
  }

  // 신호 데이터 캐싱
  async setSignal(coinId, signal, ttl = this.defaultTTL.signals) {
    await this.redis.setex(`signal:${coinId}`, ttl, JSON.stringify(signal));
  }

  // API 호출 횟수 추적
  async incrementApiCalls(endpoint) {
    const key = `api_calls:${endpoint}:${new Date().toISOString().slice(0, 10)}`;
    return await this.redis.incr(key);
  }

  async getApiCallsToday(endpoint) {
    const key = `api_calls:${endpoint}:${new Date().toISOString().slice(0, 10)}`;
    return parseInt(await this.redis.get(key) || '0');
  }
}
```

---

## 🔄 3단계: 데이터 수집 시스템 (2-3주차)

### CoinGecko API 서비스
```javascript
// src/services/CoinGeckoService.js
const axios = require('axios');

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.COINGECKO_API_KEY;
    this.rateLimit = parseInt(process.env.COINGECKO_RATE_LIMIT || '30');
    this.monthlyLimit = parseInt(process.env.COINGECKO_MONTHLY_LIMIT || '10000');
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: this.apiKey ? {
        'x-cg-demo-api-key': this.apiKey
      } : {}
    });
  }

  // 모든 코인 리스트 가져오기
  async getAllCoinsList() {
    try {
      const response = await this.axios.get('/coins/list');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch coins list: ${error.message}`);
    }
  }

  // 시장 데이터 배치 가져오기
  async getMarketDataBatch(page = 1, perPage = 250) {
    try {
      const params = {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page: page,
        sparkline: false,
        price_change_percentage: '1h,24h,7d,30d',
        locale: 'en'
      };

      const response = await this.axios.get('/coins/markets', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch market data batch ${page}: ${error.message}`);
    }
  }

  // 특정 코인 상세 데이터
  async getCoinDetails(coinId) {
    try {
      const response = await this.axios.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch coin details for ${coinId}: ${error.message}`);
    }
  }

  // Rate limiting 체크
  async checkRateLimit() {
    const today = new Date().toISOString().slice(0, 10);
    const calls = await this.cacheService.getApiCallsToday('coingecko');
    
    if (calls >= this.monthlyLimit / 30) { // 일일 제한
      throw new Error('Daily API limit reached');
    }
    
    return true;
  }
}
```

### 뉴스 및 감정분석 서비스
```javascript
// src/services/NewsService.js
const axios = require('axios');
const { Sentiment } = require('sentiment');

class NewsService {
  constructor() {
    this.sentiment = new Sentiment();
    this.newsFeeds = [
      'https://feeds.feedburner.com/CoinDesk',
      'https://cointelegraph.com/rss',
      'https://cryptonews.com/news/feed/',
      'https://decrypt.co/feed'
    ];
  }

  // RSS 뉴스 수집
  async fetchNews(coinSymbol) {
    const allNews = [];
    
    for (const feed of this.newsFeeds) {
      try {
        const response = await axios.get(`https://api.rss2json.com/v1/api.json`, {
          params: {
            rss_url: feed,
            api_key: 'your_rss2json_key', // 무료 API 키
            count: 20
          }
        });

        if (response.data.status === 'ok') {
          const relevantNews = response.data.items.filter(item =>
            item.title.toLowerCase().includes(coinSymbol.toLowerCase()) ||
            item.description.toLowerCase().includes(coinSymbol.toLowerCase())
          );
          allNews.push(...relevantNews);
        }
      } catch (error) {
        console.error(`Failed to fetch from ${feed}:`, error.message);
      }
    }

    return allNews.slice(0, 50); // 최대 50개
  }

  // 감정분석
  analyzeSentiment(text) {
    try {
      const result = this.sentiment.analyze(text);
      
      // -5 ~ +5 스케일을 0-100으로 변환
      const normalizedScore = ((result.score + 5) / 10) * 100;
      return Math.max(0, Math.min(100, normalizedScore));
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return 50; // 중립값
    }
  }

  // 코인별 종합 감정점수
  async getCoinSentiment(coinSymbol) {
    try {
      const news = await this.fetchNews(coinSymbol);
      
      if (news.length === 0) return 50;

      let totalSentiment = 0;
      let validNews = 0;

      for (const article of news) {
        const text = `${article.title} ${article.description}`;
        const sentiment = this.analyzeSentiment(text);
        
        if (sentiment !== 50) { // 중립이 아닌 경우만
          totalSentiment += sentiment;
          validNews++;
        }
      }

      return validNews > 0 ? totalSentiment / validNews : 50;
    } catch (error) {
      console.error('Failed to get coin sentiment:', error);
      return 50;
    }
  }
}
```

### 고래 추적 서비스
```javascript
// src/services/WhaleService.js
const axios = require('axios');

class WhaleService {
  constructor() {
    this.etherscanKey = process.env.ETHERSCAN_API_KEY; // 무료
    this.btcApiUrl = 'https://api.blockcypher.com/v1/btc/main';
  }

  // 비트코인 대형 거래 추적
  async getBTCWhaleTransactions() {
    try {
      const response = await axios.get(`${this.btcApiUrl}/txs`, {
        params: {
          limit: 50,
          confirmations: 1
        }
      });

      const largeTransactions = response.data.filter(tx => 
        tx.total > 50000000000 // 500 BTC 이상 (satoshi 단위)
      );

      return {
        whaleCount: largeTransactions.length,
        totalVolume: largeTransactions.reduce((sum, tx) => sum + tx.total, 0),
        avgSize: largeTransactions.length > 0 ? 
          largeTransactions.reduce((sum, tx) => sum + tx.total, 0) / largeTransactions.length : 0
      };
    } catch (error) {
      console.error('Failed to fetch BTC whale data:', error);
      return { whaleCount: 0, totalVolume: 0, avgSize: 0 };
    }
  }

  // 코인별 고래 활동 점수 계산
  async getWhaleActivityScore(coinSymbol) {
    let whaleData = { whaleCount: 0, totalVolume: 0, avgSize: 0 };

    try {
      switch (coinSymbol.toUpperCase()) {
        case 'BTC':
          whaleData = await this.getBTCWhaleTransactions();
          break;
        case 'ETH':
          whaleData = await this.getETHWhaleTransactions();
          break;
        default:
          // 다른 코인들은 기본값 또는 추후 확장
          break;
      }

      // 고래 활동을 0-100 점수로 변환
      const activityScore = Math.min(whaleData.whaleCount * 10, 100);
      return activityScore;
    } catch (error) {
      console.error('Failed to calculate whale activity score:', error);
      return 50; // 기본값
    }
  }
}
```

---

## 🎯 4단계: 신호 분석 엔진 (3-4주차)

### 메인 신호 계산 서비스
```javascript
// src/services/SignalCalculatorService.js
class SignalCalculatorService {
  constructor() {
    this.newsService = new NewsService();
    this.whaleService = new WhaleService();
    this.cacheService = new CacheService();
    
    this.weights = {
      high_priority: { price: 0.35, volume: 0.25, market: 0.15, sentiment: 0.25 },
      medium_priority: { price: 0.4, volume: 0.3, market: 0.2, sentiment: 0.1 },
      low_priority: { price: 0.45, volume: 0.35, market: 0.2, sentiment: 0.0 }
    };
  }

  // 메인 신호 계산 함수
  async calculateSignal(coinData, priority = 'medium_priority') {
    try {
      // 각 지표별 점수 계산
      const priceScore = this.calculatePriceScore(coinData);
      const volumeScore = this.calculateVolumeScore(coinData);
      const marketScore = this.calculateMarketScore(coinData);
      
      // 감정분석 (상위 우선순위만)
      let sentimentScore = 50;
      if (priority === 'high_priority') {
        sentimentScore = await this.getCachedSentiment(coinData.symbol);
      }

      // 고래 활동 점수
      const whaleScore = await this.whaleService.getWhaleActivityScore(coinData.symbol);

      // 가중치 적용
      const weights = this.weights[priority];
      const finalScore = Math.round(
        priceScore * weights.price +
        volumeScore * weights.volume +
        marketScore * weights.market +
        sentimentScore * weights.sentiment
      );

      // 신호 객체 생성
      const signal = {
        coinId: coinData.id,
        symbol: coinData.symbol.toUpperCase(),
        name: coinData.name,
        currentPrice: coinData.current_price,
        marketCap: coinData.market_cap,
        rank: coinData.market_cap_rank,
        finalScore: Math.max(0, Math.min(100, finalScore)),
        breakdown: {
          price: priceScore,
          volume: volumeScore,
          market: marketScore,
          sentiment: sentimentScore,
          whale: whaleScore
        },
        recommendation: this.getRecommendation(finalScore),
        timeframe: this.getTimeframe(finalScore),
        priority,
        metadata: {
          priceData: {
            change_1h: coinData.price_change_percentage_1h,
            change_24h: coinData.price_change_percentage_24h,
            change_7d: coinData.price_change_percentage_7d,
            change_30d: coinData.price_change_percentage_30d
          },
          volumeRatio: coinData.total_volume / (coinData.market_cap || 1),
          whaleActivity: whaleScore,
          lastUpdated: new Date()
        }
      };

      // 캐시에 저장
      await this.cacheService.setSignal(coinData.id, signal);

      return signal;
    } catch (error) {
      console.error(`Signal calculation failed for ${coinData.id}:`, error);
      throw error;
    }
  }

  // 가격 모멘텀 점수 계산
  calculatePriceScore(coinData) {
    const changes = {
      '1h': coinData.price_change_percentage_1h || 0,
      '24h': coinData.price_change_percentage_24h || 0,
      '7d': coinData.price_change_percentage_7d || 0,
      '30d': coinData.price_change_percentage_30d || 0
    };

    // 다중 타임프레임 모멘텀
    const shortTermMomentum = changes['1h'] * 0.4 + changes['24h'] * 0.6;
    const mediumTermMomentum = changes['24h'] * 0.7 + changes['7d'] * 0.3;
    const longTermMomentum = changes['7d'] * 0.6 + changes['30d'] * 0.4;

    // 평균 모멘텀
    const avgMomentum = (shortTermMomentum + mediumTermMomentum + longTermMomentum) / 3;

    // 트렌드 일관성 계산
    const consistency = this.calculateTrendConsistency(Object.values(changes));

    // 최종 점수 (50을 중심으로 ±50 범위)
    let score = 50 + (avgMomentum * 2);
    score += consistency * 10; // 일관성 보너스

    return Math.max(0, Math.min(100, score));
  }

  // 거래량 점수 계산
  calculateVolumeScore(coinData) {
    const marketCap = coinData.market_cap || 1;
    const volume = coinData.total_volume || 0;
    const volumeToMcap = volume / marketCap;

    // 24시간 거래량 vs 시가총액 비율 분석
    if (volumeToMcap > 0.5) return 90;      // 매우 높은 활동
    if (volumeToMcap > 0.3) return 75;      // 높은 활동
    if (volumeToMcap > 0.15) return 60;     // 보통 활동
    if (volumeToMcap > 0.05) return 45;     // 낮은 활동
    return 30;                              // 매우 낮은 활동
  }

  // 시장 포지션 점수
  calculateMarketScore(coinData) {
    const rank = coinData.market_cap_rank || 9999;
    const marketCap = coinData.market_cap || 0;

    // 시가총액 순위 기반 점수
    let rankScore = 0;
    if (rank <= 10) rankScore = 90;        // 초대형주
    else if (rank <= 50) rankScore = 80;   // 대형주  
    else if (rank <= 100) rankScore = 70;  // 중대형주
    else if (rank <= 300) rankScore = 60;  // 중형주
    else if (rank <= 500) rankScore = 50;  // 소형주
    else if (rank <= 1000) rankScore = 40; // 마이크로캡
    else rankScore = 30;                    // 나노캡

    // 시가총액 절대값 고려
    let capBonus = 0;
    if (marketCap > 100000000000) capBonus = 10;      // 1000억 이상
    else if (marketCap > 10000000000) capBonus = 5;   // 100억 이상
    else if (marketCap > 1000000000) capBonus = 2;    // 10억 이상

    return Math.min(100, rankScore + capBonus);
  }

  // 트렌드 일관성 계산
  calculateTrendConsistency(changes) {
    const positiveCount = changes.filter(c => c > 0).length;
    const totalCount = changes.length;
    
    // 모두 같은 방향이면 일관성 높음
    if (positiveCount === totalCount || positiveCount === 0) {
      return 1.0;
    }
    
    // 일관성 점수 계산
    const ratio = Math.abs(positiveCount - (totalCount / 2)) / (totalCount / 2);
    return ratio * 0.5;
  }

  // 추천 액션 결정
  getRecommendation(score) {
    if (score >= 85) return { action: 'STRONG_BUY', confidence: 'HIGH' };
    if (score >= 75) return { action: 'BUY', confidence: 'HIGH' };
    if (score >= 65) return { action: 'BUY', confidence: 'MEDIUM' };
    if (score >= 55) return { action: 'HOLD', confidence: 'MEDIUM' };
    if (score >= 45) return { action: 'HOLD', confidence: 'LOW' };
    if (score >= 35) return { action: 'WEAK_SELL', confidence: 'MEDIUM' };
    if (score >= 25) return { action: 'SELL', confidence: 'MEDIUM' };
    return { action: 'STRONG_SELL', confidence: 'HIGH' };
  }

  // 투자 타임프레임 결정
  getTimeframe(score) {
    if (score >= 90 || score <= 10) return 'SCALPING';      // 1-15분
    if (score >= 80 || score <= 20) return 'DAY_TRADING';   // 몇 시간-1일
    if (score >= 70 || score <= 30) return 'SWING_TRADING'; // 2-10일
    return 'LONG_TERM';                                      // 몇 주 이상
  }
}
```

---

## ⚡ 5단계: 실시간 처리 시스템 (4-5주차)

### 데이터 수집 및 처리 스케줄러
```javascript
// src/services/SchedulerService.js
const cron = require('node-cron');
const { Queue, Worker } = require('bullmq');

class SchedulerService {
  constructor() {
    this.coinGeckoService = new CoinGeckoService();
    this.signalCalculator = new SignalCalculatorService();
    this.cacheService = new CacheService();
    
    // Redis Queue 설정
    this.signalQueue = new Queue('signal-processing', {
      connection: { host: 'localhost', port: 6379 }
    });
    
    this.alertQueue = new Queue('alert-processing', {
      connection: { host: 'localhost', port: 6379 }
    });

    this.setupWorkers();
    this.isRunning = false;
  }

  // Worker 설정
  setupWorkers() {
    // 신호 처리 Worker
    new Worker('signal-processing', async (job) => {
      const { coinData, priority } = job.data;
      return await this.signalCalculator.calculateSignal(coinData, priority);
    }, { connection: { host: 'localhost', port: 6379 } });

    // 알림 처리 Worker
    new Worker('alert-processing', async (job) => {
      const { signalData } = job.data;
      return await this.processAlert(signalData);
    }, { connection: { host: 'localhost', port: 6379 } });
  }

  // 스케줄러 시작
  startScheduler() {
    if (this.isRunning) return;
    
    console.log('🚀 실시간 스케줄러 시작');

    // 상위 100개 코인 - 5분마다
    cron.schedule('*/5 * * * *', async () => {
      console.log('🔥 상위 100개 코인 업데이트 시작');
      await this.processTopCoins(100, 'high_priority');
    });

    // 상위 500개 코인 - 15분마다
    cron.schedule('*/15 * * * *', async () => {
      console.log('📈 상위 500개 코인 업데이트 시작');
      await this.processTopCoins(500, 'medium_priority');
    });

    // 전체 코인 - 1시간마다
    cron.schedule('0 * * * *', async () => {
      console.log('🌍 전체 코인 업데이트 시작');
      await this.processAllCoins();
    });

    // 시스템 헬스 체크 - 매분
    cron.schedule('* * * * *', async () => {
      await this.healthCheck();
    });

    // 캐시 정리 - 6시간마다
    cron.schedule('0 */6 * * *', async () => {
      await this.cleanupCache();
    });

    this.isRunning = true;
  }

  // 상위 N개 코인 처리
  async processTopCoins(topN, priority) {
    try {
      const pages = Math.ceil(topN / 250);
      
      for (let page = 1; page <= pages; page++) {
        const perPage = page === pages ? topN % 250 || 250 : 250;
        
        // API 호출 제한 체크
        await this.coinGeckoService.checkRateLimit();
        
        const marketData = await this.coinGeckoService.getMarketDataBatch(page, perPage);
        
        // 배치 처리를 위해 Queue에 추가
        for (const coinData of marketData) {
          await this.signalQueue.add('process-signal', {
            coinData,
            priority
          }, {
            priority: priority === 'high_priority' ? 10 : 5,
            attempts: 3,
            backoff: 'exponential'
          });
        }

        // Rate limiting
        await this.sleep(2000);
      }

      console.log(`✅ ${topN}개 코인 처리 완료 (${priority})`);
    } catch (error) {
      console.error(`상위 ${topN}개 코인 처리 실패:`, error);
    }
  }

  // 전체 코인 처리
  async processAllCoins() {
    try {
      let currentPage = 1;
      let processedCount = 0;

      while (true) {
        // API 제한 체크
        await this.coinGeckoService.checkRateLimit();
        
        const marketData = await this.coinGeckoService.getMarketDataBatch(currentPage, 250);
        
        if (!marketData || marketData.length === 0) {
          break;
        }

        // 상위 500개는 이미 처리했으므로 건너뛰기
        if (currentPage <= 2) {
          currentPage++;
          continue;
        }

        // 낮은 우선순위로 처리
        for (const coinData of marketData) {
          await this.signalQueue.add('process-signal', {
            coinData,
            priority: 'low_priority'
          }, {
            priority: 1,
            attempts: 2
          });
        }

        processedCount += marketData.length;
        currentPage++;

        // Rate limiting (더 긴 간격)
        if (currentPage % 20 === 0) {
          console.log(`⏱️ API 제한 준수를 위한 대기 (처리된 코인: ${processedCount}개)`);
          await this.sleep(60000); // 1분 대기
        } else {
          await this.sleep(3000); // 3초 대기
        }
      }

      console.log(`✅ 전체 ${processedCount}개 코인 처리 완료`);
    } catch (error) {
      console.error('전체 코인 처리 실패:', error);
    }
  }

  // 알림 처리
  async processAlert(signalData) {
    try {
      // 강한 신호만 알림 발송
      if (signalData.finalScore >= 80 || signalData.finalScore <= 20) {
        await this.sendStrongSignalAlert(signalData);
      }

      // 데이터베이스에 저장
      await this.saveSignalToDB(signalData);

    } catch (error) {
      console.error('알림 처리 실패:', error);
    }
  }

  // 강한 신호 알림 발송
  async sendStrongSignalAlert(signalData) {
    const alertData = {
      type: signalData.finalScore >= 80 ? 'STRONG_BUY' : 'STRONG_SELL',
      coinId: signalData.coinId,
      symbol: signalData.symbol,
      score: signalData.finalScore,
      price: signalData.currentPrice,
      recommendation: signalData.recommendation,
      timeframe: signalData.timeframe,
      timestamp: new Date().toISOString()
    };

    // Firebase FCM 알림 발송 (추후 구현)
    console.log(`🚨 강한 신호 알림: ${JSON.stringify(alertData)}`);

    // 알림 데이터베이스 저장
    const Alert = require('../models/Alert');
    await Alert.create({
      coinId: signalData.coinId,
      alertType: 'STRONG_SIGNAL',
      triggerScore: signalData.finalScore,
      isTriggered: true,
      triggeredAt: new Date(),
      metadata: alertData
    });
  }

  // 신호 데이터베이스 저장
  async saveSignalToDB(signalData) {
    try {
      const Signal = require('../models/Signal');
      
      // 기존 신호 업데이트 또는 새로 생성
      await Signal.findOneAndUpdate(
        { coinId: signalData.coinId },
        signalData,
        { upsert: true, new: true }
      );

      // 코인 데이터도 업데이트
      const Coin = require('../models/Coin');
      await Coin.findOneAndUpdate(
        { coinId: signalData.coinId },
        {
          coinId: signalData.coinId,
          symbol: signalData.symbol,
          name: signalData.name,
          currentPrice: signalData.currentPrice,
          marketCap: signalData.marketCap,
          marketCapRank: signalData.rank,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

    } catch (error) {
      console.error('데이터베이스 저장 실패:', error);
    }
  }

  // 시스템 헬스 체크
  async healthCheck() {
    try {
      // Redis 연결 체크
      await this.cacheService.redis.ping();
      
      // MongoDB 연결 체크
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection lost');
      }

      // API 호출 현황 체크
      const apiCalls = await this.cacheService.getApiCallsToday('coingecko');
      const dailyLimit = parseInt(process.env.COINGECKO_MONTHLY_LIMIT || '10000') / 30;
      
      if (apiCalls > dailyLimit * 0.9) {
        console.warn(`⚠️ API 호출 한도 90% 초과: ${apiCalls}/${dailyLimit}`);
      }

      // Queue 상태 체크
      const signalQueueStatus = await this.signalQueue.getWaiting();
      if (signalQueueStatus.length > 1000) {
        console.warn(`⚠️ 신호 처리 Queue 대기 작업 과다: ${signalQueueStatus.length}`);
      }

    } catch (error) {
      console.error('시스템 헬스 체크 실패:', error);
    }
  }

  // 캐시 정리
  async cleanupCache() {
    try {
      console.log('🧹 캐시 정리 시작');
      
      // 오래된 신호 데이터 삭제 (24시간 이상)
      const keys = await this.cacheService.redis.keys('signal:*');
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await this.cacheService.redis.ttl(key);
        if (ttl === -1 || ttl < -86400) { // TTL이 없거나 24시간 지난 것
          await this.cacheService.redis.del(key);
          deletedCount++;
        }
      }

      console.log(`✅ 캐시 정리 완료: ${deletedCount}개 항목 삭제`);
    } catch (error) {
      console.error('캐시 정리 실패:', error);
    }
  }

  // 유틸리티
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 스케줄러 중지
  stopScheduler() {
    // 모든 cron job 중지
    cron.destroy();
    this.isRunning = false;
    console.log('⏹️ 스케줄러 중지');
  }

  // 현재 상태 조회
  getStatus() {
    return {
      isRunning: this.isRunning,
      queues: {
        signal: this.signalQueue.name,
        alert: this.alertQueue.name
      },
      lastHealthCheck: new Date()
    };
  }
}

module.exports = SchedulerService;
```

---

## 📋 개발 체크리스트 (1-5단계)

### 1주차: 환경 설정
- [ ] Node.js 프로젝트 초기화
- [ ] 필수 패키지 설치
- [ ] Docker 환경 구성
- [ ] MongoDB/Redis 로컬 설정
- [ ] 기본 Express 서버 구성

### 2주차: 데이터베이스 설계
- [ ] MongoDB 스키마 설계
- [ ] Redis 캐시 전략 구현
- [ ] 데이터베이스 연결 설정
- [ ] 기본 모델 생성

### 3주차: 외부 API 연동
- [ ] CoinGecko API 서비스 구현
- [ ] 뉴스 RSS 수집 서비스
- [ ] 감정분석 엔진 구현
- [ ] API 호출 제한 관리

### 4주차: 신호 계산 엔진
- [ ] 가격 모멘텀 분석
- [ ] 거래량 분석
- [ ] 시장 포지션 분석
- [ ] 종합 신호 스코어링

### 5주차: 실시간 처리
- [ ] 스케줄러 서비스 구현
- [ ] Queue 시스템 구현
- [ ] 배치 처리 최적화
- [ ] 우선순위별 업데이트

---

**다음 문서**: `암호화폐_신호_분석_MVP_백엔드_개발_가이드_6-10단계.md`
