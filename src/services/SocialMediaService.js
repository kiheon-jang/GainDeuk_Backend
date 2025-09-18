const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * 소셜미디어 모니터링 서비스
 * Twitter/X, 텔레그램, 디스코드 등 소셜미디어 플랫폼에서 암호화폐 관련 정보를 실시간으로 모니터링
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
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        rateLimit: 5, // 1초당 5 요청
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
      ],
      discord: [
        'crypto-trading', 'bitcoin-discussion', 'altcoin-chat',
        'defi-discussion', 'nft-marketplace'
      ]
    };
  }

  /**
   * 소셜미디어 모니터링 시작
   */
  async startMonitoring() {
    if (this.isRunning) {
      logger.warn('소셜미디어 모니터링이 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('소셜미디어 모니터링을 시작합니다.');

      // 초기 데이터 수집
      await this.collectInitialData();

      // 주기적 모니터링 시작 (5분마다)
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.monitorSocialMedia();
        } catch (error) {
          logger.error('소셜미디어 모니터링 중 오류 발생:', error);
        }
      }, 5 * 60 * 1000);

      logger.info('소셜미디어 모니터링이 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('소셜미디어 모니터링 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 소셜미디어 모니터링 중지
   */
  stopMonitoring() {
    if (!this.isRunning) {
      logger.warn('소셜미디어 모니터링이 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('소셜미디어 모니터링이 중지되었습니다.');
  }

  /**
   * 초기 데이터 수집
   */
  async collectInitialData() {
    logger.info('초기 소셜미디어 데이터를 수집합니다.');

    const promises = [
      this.collectTwitterData(),
      this.collectTelegramData(),
      this.collectDiscordData()
    ];

    await Promise.allSettled(promises);
  }

  /**
   * 주기적 소셜미디어 모니터링
   */
  async monitorSocialMedia() {
    logger.debug('소셜미디어 데이터를 수집합니다.');

    const promises = [
      this.collectTwitterData(),
      this.collectTelegramData(),
      this.collectDiscordData()
    ];

    const results = await Promise.allSettled(promises);
    
    // 결과 처리
    results.forEach((result, index) => {
      const platforms = ['twitter', 'telegram', 'discord'];
      if (result.status === 'rejected') {
        logger.error(`${platforms[index]} 데이터 수집 실패:`, result.reason);
      }
    });

    // 구독자들에게 업데이트 알림
    this.notifySubscribers();
  }

  /**
   * Twitter/X 데이터 수집
   */
  async collectTwitterData() {
    if (!this.apiConfig.twitter.bearerToken) {
      logger.warn('Twitter Bearer Token이 설정되지 않았습니다.');
      return;
    }

    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('twitter')) {
        logger.warn('Twitter API Rate limit에 도달했습니다.');
        return;
      }

      const tweets = [];
      
      // 각 모니터링 대상 계정에서 최근 트윗 수집
      for (const account of this.monitoringTargets.twitter) {
        try {
          const response = await this.fetchTwitterTweets(account);
          tweets.push(...response);
        } catch (error) {
          logger.error(`Twitter 계정 ${account} 데이터 수집 실패:`, error);
        }
      }

      // 키워드 기반 트윗 검색
      for (const keyword of this.cryptoKeywords.slice(0, 5)) { // Rate limit 고려하여 일부만
        try {
          const response = await this.searchTwitterTweets(keyword);
          tweets.push(...response);
        } catch (error) {
          logger.error(`Twitter 키워드 ${keyword} 검색 실패:`, error);
        }
      }

      // 데이터 처리 및 저장
      const processedTweets = this.processTwitterData(tweets);
      this.socialData.set('twitter', {
        data: processedTweets,
        timestamp: new Date(),
        count: processedTweets.length
      });

      logger.info(`Twitter 데이터 수집 완료: ${processedTweets.length}개 트윗`);

    } catch (error) {
      logger.error('Twitter 데이터 수집 실패:', error);
      throw error;
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

    if (response.data.data) {
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

      return tweetsResponse.data.data || [];
    }

    return [];
  }

  /**
   * Twitter 트윗 검색
   */
  async searchTwitterTweets(keyword) {
    const url = `${this.apiConfig.twitter.baseUrl}/tweets/search/recent`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.apiConfig.twitter.bearerToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        'query': `${keyword} -is:retweet lang:en`,
        'max_results': 10,
        'tweet.fields': 'created_at,public_metrics,context_annotations,author_id'
      }
    });

    return response.data.data || [];
  }

  /**
   * 텔레그램 데이터 수집
   */
  async collectTelegramData() {
    if (!this.apiConfig.telegram.botToken) {
      logger.warn('Telegram Bot Token이 설정되지 않았습니다.');
      return;
    }

    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('telegram')) {
        logger.warn('Telegram API Rate limit에 도달했습니다.');
        return;
      }

      const messages = [];

      // 각 모니터링 대상 채널에서 메시지 수집
      for (const channel of this.monitoringTargets.telegram) {
        try {
          const response = await this.fetchTelegramMessages(channel);
          messages.push(...response);
        } catch (error) {
          logger.error(`Telegram 채널 ${channel} 데이터 수집 실패:`, error);
        }
      }

      // 데이터 처리 및 저장
      const processedMessages = this.processTelegramData(messages);
      this.socialData.set('telegram', {
        data: processedMessages,
        timestamp: new Date(),
        count: processedMessages.length
      });

      logger.info(`Telegram 데이터 수집 완료: ${processedMessages.length}개 메시지`);

    } catch (error) {
      logger.error('Telegram 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * 텔레그램 메시지 가져오기
   */
  async fetchTelegramMessages(channel) {
    const url = `${this.apiConfig.telegram.baseUrl}${this.apiConfig.telegram.botToken}/getUpdates`;
    
    const response = await axios.get(url, {
      params: {
        'chat_id': channel,
        'limit': 10
      }
    });

    return response.data.result || [];
  }

  /**
   * 디스코드 데이터 수집
   */
  async collectDiscordData() {
    if (!this.apiConfig.discord.webhookUrl) {
      logger.warn('Discord Webhook URL이 설정되지 않았습니다.');
      return;
    }

    try {
      // Rate limiting 체크
      if (!this.checkRateLimit('discord')) {
        logger.warn('Discord API Rate limit에 도달했습니다.');
        return;
      }

      // Discord는 웹훅을 통한 수집이므로 시뮬레이션
      const messages = await this.simulateDiscordData();

      // 데이터 처리 및 저장
      const processedMessages = this.processDiscordData(messages);
      this.socialData.set('discord', {
        data: processedMessages,
        timestamp: new Date(),
        count: processedMessages.length
      });

      logger.info(`Discord 데이터 수집 완료: ${processedMessages.length}개 메시지`);

    } catch (error) {
      logger.error('Discord 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * Discord 데이터 시뮬레이션 (실제 구현에서는 Discord API 사용)
   */
  async simulateDiscordData() {
    // 실제 구현에서는 Discord API를 사용하여 메시지를 수집
    return [
      {
        id: '1',
        content: 'Bitcoin is looking bullish today!',
        author: 'CryptoTrader#1234',
        channel: 'crypto-trading',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        content: 'Ethereum 2.0 staking rewards are amazing',
        author: 'DeFiEnthusiast#5678',
        channel: 'defi-discussion',
        timestamp: new Date().toISOString()
      }
    ];
  }

  /**
   * Twitter 데이터 처리
   */
  processTwitterData(tweets) {
    return tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      author: tweet.author_id,
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
    return messages.map(message => ({
      id: message.message_id,
      text: message.text || '',
      author: message.from?.username || 'Unknown',
      platform: 'telegram',
      timestamp: new Date(message.date * 1000).toISOString(),
      chat: message.chat?.title || 'Unknown',
      sentiment: this.analyzeSentiment(message.text || ''),
      relevance: this.calculateRelevance(message.text || ''),
      keywords: this.extractKeywords(message.text || '')
    }));
  }

  /**
   * 디스코드 데이터 처리
   */
  processDiscordData(messages) {
    return messages.map(message => ({
      id: message.id,
      text: message.content,
      author: message.author,
      platform: 'discord',
      timestamp: message.timestamp,
      channel: message.channel,
      sentiment: this.analyzeSentiment(message.content),
      relevance: this.calculateRelevance(message.content),
      keywords: this.extractKeywords(message.content)
    }));
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
   * Rate limiting 체크
   */
  checkRateLimit(platform) {
    const config = this.apiConfig[platform];
    const now = Date.now();
    const timeSinceLastRequest = now - config.lastRequest;
    
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
        logger.error('구독자 알림 중 오류 발생:', error);
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
      logger.info(`${platform} 모니터링 대상 추가: ${target}`);
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
        logger.info(`${platform} 모니터링 대상 제거: ${target}`);
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
    
    logger.info(`키워드 추가: ${keyword} (${isKorean ? '한국어' : '영어'})`);
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
    
    logger.info(`키워드 제거: ${keyword} (${isKorean ? '한국어' : '영어'})`);
  }
}

module.exports = new SocialMediaService();
