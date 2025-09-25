const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

/**
 * 소셜미디어 모니터링 서비스
 * Twitter/X, 텔레그램 등 소셜미디어 플랫폼에서 암호화폐 관련 정보를 실시간으로 모니터링
 */
class SocialMediaService {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.socialData = new Map();
    this.subscribers = new Set();
    
           // API 설정
           this.apiConfig = {
             twitter: {
               baseUrl: 'https://api.twitter.com/2',
               bearerToken: process.env.TWITTER_BEARER_TOKEN,
               rateLimit: 300, // 15분당 300 요청
               lastRequest: 0
             },
      telegram: {
        baseUrl: 'https://api.telegram.org/bot',
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        rateLimit: 30, // 1초당 30 요청
        lastRequest: 0
      }
    };

    // 모니터링 키워드
    this.cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
      'altcoin', 'defi', 'nft', 'blockchain', 'trading', 'hodl',
      'moon', 'pump', 'dump', 'bull', 'bear', 'whale'
    ];

    // 한국어 키워드
    this.koreanKeywords = [
      '비트코인', '이더리움', '암호화폐', '코인', '거래', '투자',
      '상승', '하락', '급등', '급락', '고래', '호들'
    ];

    // 모니터링 채널/계정
    this.monitoringTargets = {
      twitter: [
        '@elonmusk', '@VitalikButerin', '@cz_binance', '@coinbase',
        '@kraken', '@binance', '@crypto', '@bitcoin'
      ],
      telegram: [
        '@cryptocurrency', '@bitcoin', '@ethereum', '@defi',
        '@cryptonews', '@trading_signals'
      ]
    };
  }

  /**
   * 소셜미디어 모니터링 시작
   */
  async startMonitoring() {
    console.log('🚀 startMonitoring 메서드 호출됨');
    
    if (this.isRunning) {
      console.log('⚠️ 소셜미디어 모니터링이 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      console.log('소셜미디어 모니터링을 시작합니다.');

      // 초기 데이터 수집
      console.log('📊 초기 데이터 수집 시작...');
      await this.collectInitialData();
      console.log('📊 초기 데이터 수집 완료');

      // 주기적 모니터링 시작 (5분마다)
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.monitorSocialMedia();
        } catch (error) {
          console.error('소셜미디어 모니터링 중 오류 발생:', error?.message || error?.toString() || '알 수 없는 오류');
        }
      }, 5 * 60 * 1000);

      console.log('소셜미디어 모니터링이 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      console.error('소셜미디어 모니터링 시작 실패:', error?.message || error?.toString() || '알 수 없는 오류');
      throw error;
    }
  }

  /**
   * 소셜미디어 모니터링 중지
   */
  stopMonitoring() {
    if (!this.isRunning) {
      console.log('⚠️ 소셜미디어 모니터링이 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('소셜미디어 모니터링이 중지되었습니다.');
  }

  /**
   * 초기 데이터 수집
   */
  async collectInitialData() {
    console.log('초기 소셜미디어 데이터를 수집합니다.');

    // 실제 API 호출만 수행
    const promises = [
      this.collectTwitterData(),
      this.collectTelegramData()
    ];

    await Promise.allSettled(promises);
  }

  /**
   * 주기적 소셜미디어 모니터링
   */
  async monitorSocialMedia() {
    console.log('소셜미디어 데이터를 수집합니다.');

    const promises = [
      this.collectTwitterData(),
      this.collectTelegramData()
    ];

    const results = await Promise.allSettled(promises);
    
    // 결과 처리
    results.forEach((result, index) => {
      const platforms = ['twitter', 'telegram'];
      if (result.status === 'rejected') {
        console.error(`${platforms[index]} 데이터 수집 실패:`, result.reason?.message || result.reason?.toString() || '알 수 없는 오류');
      }
    });

    // 구독자들에게 업데이트 알림
    this.notifySubscribers();
  }


  /**
   * OAuth 1.0a 인증 헬퍼
   */
  getOAuthHeader(url, method = 'GET', data = {}) {
    try {
      console.log(`🔐 OAuth 헤더 생성 시작: ${url}`);
      console.log(`🔑 Consumer Key: ${this.apiConfig.twitter.consumerKey ? '설정됨' : '없음'}`);
      console.log(`🔑 Access Token: ${this.apiConfig.twitter.accessToken ? '설정됨' : '없음'}`);
      
      const oauth = OAuth({
        consumer: {
          key: this.apiConfig.twitter.consumerKey,
          secret: this.apiConfig.twitter.consumerSecret
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
          return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64');
        }
      });

      const token = {
        key: this.apiConfig.twitter.accessToken,
        secret: this.apiConfig.twitter.accessTokenSecret
      };

      const authData = oauth.authorize({ url, method, data }, token);
      const header = oauth.toHeader(authData);
      
      console.log(`✅ OAuth 헤더 생성 완료:`, Object.keys(header));
      return header;
    } catch (error) {
      console.error(`❌ OAuth 헤더 생성 실패:`, error?.message);
      throw error;
    }
  }

  /**
   * Twitter/X 데이터 수집
   */
  async collectTwitterData() {
    console.log('🐦 Twitter 데이터 수집 시작...');
    console.log('🔑 Twitter API 키 확인:');
    console.log('  Bearer Token:', this.apiConfig.twitter.bearerToken ? '설정됨' : '없음');
    
    if (!this.apiConfig.twitter.bearerToken) {
      console.log('Twitter API v2 Bearer Token이 설정되지 않았습니다.');
      return;
    }

    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('twitter')) {
        console.log('Twitter API Rate limit에 도달했습니다.');
        return;
      }

      const tweets = [];
      
      // 키워드 기반 트윗 검색 (Rate limiting 개선)
      for (const keyword of this.cryptoKeywords.slice(0, 2)) { // 3 → 2로 줄여서 Rate limit 방지
        try {
          console.log(`🔍 키워드 검색 시작: ${keyword}`);
          
          // Rate limit 체크 (각 키워드마다)
          if (!this.checkRateLimit('twitter')) {
            console.log(`Twitter API Rate limit 도달 - ${keyword} 검색 건너뛰기`);
            break;
          }
          
          const response = await this.searchTwitterTweetsV2(keyword);
          console.log(`📊 ${keyword} 검색 결과: ${response.length}개`);
          tweets.push(...response);
          
          // 요청 간 지연 (Rate limit 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Twitter 키워드 ${keyword} 검색 실패:`, error?.message || error?.toString() || '알 수 없는 오류');
          
          // 429 오류 (Rate limit)인 경우 더 긴 대기
          if (error?.response?.status === 429) {
            console.log('⏳ Rate limit 도달 - 5분 대기...');
            await new Promise(resolve => setTimeout(resolve, 300000)); // 5분 대기
          }
        }
      }

      // 데이터 처리 및 저장
      const processedTweets = this.processTwitterData(tweets);
      this.socialData.set('twitter', {
        data: processedTweets,
        timestamp: new Date(),
        count: processedTweets.length
      });

      console.log(`Twitter 데이터 수집 완료: ${processedTweets.length}개 트윗`);

    } catch (error) {
      console.error('Twitter 데이터 수집 실패:', error?.message || error?.toString() || '알 수 없는 오류');
      // 에러가 발생해도 빈 데이터로 저장
      this.socialData.set('twitter', {
        data: [],
        timestamp: new Date(),
        count: 0,
        error: error?.message || 'Unknown error'
      });
    }
  }

  /**
   * Twitter 트윗 가져오기
   */
  async fetchTwitterTweets(username) {
    const url = `${this.apiConfig.twitter.baseUrl}/users/by/username/${username.replace('@', '')}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.apiConfig.twitter.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response?.data?.data) {
      const userId = response.data.data.id;
      const tweetsUrl = `${this.apiConfig.twitter.baseUrl}/users/${userId}/tweets`;
      
      const tweetsResponse = await axios.get(tweetsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiConfig.twitter.bearerToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          'max_results': 10,
          'tweet.fields': 'created_at,public_metrics,context_annotations'
        }
      });

      return tweetsResponse?.data?.data || [];
    }

    return [];
  }

  /**
   * Twitter 트윗 검색 (API v2)
   */
  async searchTwitterTweetsV2(keyword) {
    try {
      console.log(`🔍 Twitter API v2 검색 시작: ${keyword}`);
      
      const url = `${this.apiConfig.twitter.baseUrl}/tweets/search/recent`;
      const params = {
        query: `${keyword} -is:retweet lang:en`,
        max_results: 10,
        'tweet.fields': 'created_at,public_metrics,author_id',
        'user.fields': 'username'
      };

      console.log(`📡 API URL: ${url}`);
      console.log(`📋 검색 파라미터:`, params);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiConfig.twitter.bearerToken}`,
          'Content-Type': 'application/json'
        },
        params: params
      });

      console.log(`✅ Twitter API 응답 성공: ${response?.data?.data?.length || 0}개 트윗`);
      return response?.data?.data || [];
    } catch (error) {
      console.error(`❌ Twitter 검색 실패 (${keyword}):`, {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      return [];
    }
  }

  /**
   * 텔레그램 데이터 수집
   */
  async collectTelegramData() {
    if (!this.apiConfig.telegram.botToken) {
      console.log('Telegram Bot Token이 설정되지 않았습니다.');
      return;
    }

    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('telegram')) {
        console.log('Telegram API Rate limit에 도달했습니다.');
        return;
      }

      const messages = [];

      // 봇이 받은 메시지에서 암호화폐 관련 메시지 필터링
      try {
        const response = await this.fetchTelegramMessages();
        messages.push(...response);
      } catch (error) {
        console.error(`Telegram 메시지 수집 실패:`, error?.message || error?.toString() || '알 수 없는 오류');
      }

      // 데이터 처리 및 저장
      const processedMessages = this.processTelegramData(messages);
      this.socialData.set('telegram', {
        data: processedMessages,
        timestamp: new Date(),
        count: processedMessages.length
      });

      console.log(`Telegram 데이터 수집 완료: ${processedMessages.length}개 메시지`);

    } catch (error) {
      console.error('Telegram 데이터 수집 실패:', error?.message || error?.toString() || '알 수 없는 오류');
      // 에러가 발생해도 빈 데이터로 저장
      this.socialData.set('telegram', {
        data: [],
        timestamp: new Date(),
        count: 0,
        error: error?.message || 'Unknown error'
      });
    }
  }

  /**
   * 텔레그램 메시지 가져오기
   */
  async fetchTelegramMessages() {
    try {
      const url = `${this.apiConfig.telegram.baseUrl}${this.apiConfig.telegram.botToken}/getUpdates`;
      
      const response = await axios.get(url, {
        params: {
          'limit': 10,
          'timeout': 30
        }
      });

      const updates = response?.data?.result || [];
      
      // 암호화폐 관련 키워드가 포함된 메시지만 필터링
      const cryptoMessages = updates.filter(update => {
        if (!update.message || !update.message.text) return false;
        
        const text = update.message.text.toLowerCase();
        return this.cryptoKeywords.some(keyword => text.includes(keyword)) ||
               this.koreanKeywords.some(keyword => text.includes(keyword));
      });

      return cryptoMessages;
    } catch (error) {
      console.error(`Telegram API 호출 실패:`, error?.response?.status, error?.response?.data?.description || error?.message);
      return [];
    }
  }


  /**
   * Twitter 데이터 처리 (API v2)
   */
  processTwitterData(tweets) {
    return tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      author: tweet.author_id || 'unknown',
      platform: 'twitter',
      timestamp: tweet.created_at,
      metrics: {
        retweets: tweet.public_metrics?.retweet_count || 0,
        likes: tweet.public_metrics?.like_count || 0,
        replies: tweet.public_metrics?.reply_count || 0
      },
      sentiment: this.analyzeSentiment(tweet.text),
      relevance: this.calculateRelevance(tweet.text),
      keywords: this.extractKeywords(tweet.text)
    }));
  }

  /**
   * 텔레그램 데이터 처리
   */
  processTelegramData(messages) {
    return messages.map(update => {
      const message = update.message;
      return {
        id: message.message_id,
        text: message.text || '',
        author: message.from?.username || 'Unknown',
        platform: 'telegram',
        timestamp: new Date(message.date * 1000).toISOString(),
        chat: message.chat?.title || 'Unknown',
        sentiment: this.analyzeSentiment(message.text || ''),
        relevance: this.calculateRelevance(message.text || ''),
        keywords: this.extractKeywords(message.text || '')
      };
    });
  }


  /**
   * 감정 분석 (간단한 키워드 기반)
   */
  analyzeSentiment(text) {
    const positiveWords = ['moon', 'bull', 'pump', 'buy', 'hodl', 'long', 'up', 'rise', 'gain', 'profit'];
    const negativeWords = ['dump', 'bear', 'sell', 'short', 'down', 'fall', 'loss', 'crash', 'drop'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * 관련성 계산
   */
  calculateRelevance(text) {
    const lowerText = text.toLowerCase();
    let relevance = 0;
    
    this.cryptoKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) relevance += 1;
    });
    
    this.koreanKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) relevance += 1;
    });
    
    return Math.min(relevance / 5, 1); // 0-1 범위로 정규화
  }

  /**
   * 키워드 추출
   */
  extractKeywords(text) {
    const lowerText = text.toLowerCase();
    const foundKeywords = [];
    
    [...this.cryptoKeywords, ...this.koreanKeywords].forEach(keyword => {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });
    
    return foundKeywords;
  }

  /**
   * Rate limiting 체크 (개선된 버전)
   */
  checkRateLimit(platform) {
    const config = this.apiConfig[platform];
    const now = Date.now();
    const timeSinceLastRequest = now - config.lastRequest;
    
    // Twitter API v2 Rate limit: 15분당 300 요청
    if (platform === 'twitter') {
      const timeWindow = 15 * 60 * 1000; // 15분
      const requestLimit = 300;
      
      // 요청 카운터 초기화 (15분마다)
      if (!config.requestCount) config.requestCount = 0;
      if (!config.windowStart) config.windowStart = now;
      
      if (now - config.windowStart > timeWindow) {
        config.requestCount = 0;
        config.windowStart = now;
      }
      
      if (config.requestCount >= requestLimit) {
        console.log(`⏳ Twitter API Rate limit 도달: ${config.requestCount}/${requestLimit}`);
        return false;
      }
      
      config.requestCount++;
    }
    
    // 기본 Rate limiting (요청 간 최소 간격)
    if (timeSinceLastRequest < (1000 / config.rateLimit)) {
      return false;
    }
    
    config.lastRequest = now;
    return true;
  }

  /**
   * 구독자 추가
   */
  subscribe(callback) {
    this.subscribers.add(callback);
  }

  /**
   * 구독자 제거
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * 구독자들에게 알림
   */
  notifySubscribers() {
    const data = this.getSocialData();
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('구독자 알림 중 오류 발생:', error?.message || error?.toString() || '알 수 없는 오류');
      }
    });
  }

  /**
   * 소셜미디어 데이터 조회
   */
  getSocialData(platform = null) {
    if (platform) {
      return this.socialData.get(platform);
    }
    
    const allData = {};
    this.socialData.forEach((value, key) => {
      allData[key] = value;
    });
    
    return allData;
  }

  /**
   * 특정 키워드로 필터링된 데이터 조회
   */
  getFilteredData(keywords, platform = null) {
    const data = this.getSocialData(platform);
    const filteredData = {};
    
    Object.keys(data).forEach(platformKey => {
      if (platform && platformKey !== platform) return;
      
      const platformData = data[platformKey];
      if (platformData && platformData.data) {
        filteredData[platformKey] = {
          ...platformData,
          data: platformData.data.filter(item => 
            keywords.some(keyword => 
              item.text.toLowerCase().includes(keyword.toLowerCase()) ||
              item.keywords.includes(keyword)
            )
          )
        };
      }
    });
    
    return filteredData;
  }

  /**
   * 감정별 데이터 조회
   */
  getSentimentData(sentiment, platform = null) {
    const data = this.getSocialData(platform);
    const sentimentData = {};
    
    Object.keys(data).forEach(platformKey => {
      if (platform && platformKey !== platform) return;
      
      const platformData = data[platformKey];
      if (platformData && platformData.data) {
        sentimentData[platformKey] = {
          ...platformData,
          data: platformData.data.filter(item => item.sentiment === sentiment)
        };
      }
    });
    
    return sentimentData;
  }

  /**
   * 모니터링 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      subscribers: this.subscribers.size,
      dataCount: Object.keys(this.getSocialData()).length,
      lastUpdate: this.getLastUpdateTime()
    };
  }

  /**
   * 마지막 업데이트 시간 조회
   */
  getLastUpdateTime() {
    let lastUpdate = null;
    this.socialData.forEach((value) => {
      if (!lastUpdate || value.timestamp > lastUpdate) {
        lastUpdate = value.timestamp;
      }
    });
    return lastUpdate;
  }

  /**
   * 모니터링 대상 추가
   */
  addMonitoringTarget(platform, target) {
    if (!this.monitoringTargets[platform]) {
      this.monitoringTargets[platform] = [];
    }
    
    if (!this.monitoringTargets[platform].includes(target)) {
      this.monitoringTargets[platform].push(target);
      console.log(`${platform} 모니터링 대상 추가: ${target}`);
    }
  }

  /**
   * 모니터링 대상 제거
   */
  removeMonitoringTarget(platform, target) {
    if (this.monitoringTargets[platform]) {
      const index = this.monitoringTargets[platform].indexOf(target);
      if (index > -1) {
        this.monitoringTargets[platform].splice(index, 1);
        console.log(`${platform} 모니터링 대상 제거: ${target}`);
      }
    }
  }

  /**
   * 키워드 추가
   */
  addKeyword(keyword, isKorean = false) {
    if (isKorean) {
      if (!this.koreanKeywords.includes(keyword)) {
        this.koreanKeywords.push(keyword);
      }
    } else {
      if (!this.cryptoKeywords.includes(keyword)) {
        this.cryptoKeywords.push(keyword);
      }
    }
    
    console.log(`키워드 추가: ${keyword} (${isKorean ? '한국어' : '영어'})`);
  }

  /**
   * 키워드 제거
   */
  removeKeyword(keyword, isKorean = false) {
    if (isKorean) {
      const index = this.koreanKeywords.indexOf(keyword);
      if (index > -1) {
        this.koreanKeywords.splice(index, 1);
      }
    } else {
      const index = this.cryptoKeywords.indexOf(keyword);
      if (index > -1) {
        this.cryptoKeywords.splice(index, 1);
      }
    }
    
    console.log(`키워드 제거: ${keyword} (${isKorean ? '한국어' : '영어'})`);
  }
}

module.exports = new SocialMediaService();
