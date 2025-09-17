const axios = require('axios');
const cheerio = require('cheerio');
const { Sentiment } = require('sentiment');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

class NewsService {
  constructor() {
    this.sentiment = new Sentiment();
    this.cacheService = new CacheService();
    
    this.newsFeeds = [
      {
        name: 'CoinDesk',
        url: 'https://feeds.feedburner.com/CoinDesk',
        weight: 1.0
      },
      {
        name: 'CoinTelegraph',
        url: 'https://cointelegraph.com/rss',
        weight: 0.9
      },
      {
        name: 'CryptoNews',
        url: 'https://cryptonews.com/news/feed/',
        weight: 0.8
      },
      {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed',
        weight: 0.7
      },
      {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/rss',
        weight: 0.6
      }
    ];

    this.rss2jsonApiKey = process.env.RSS2JSON_API_KEY;
    this.setupSentiment();
  }

  setupSentiment() {
    // 암호화폐 관련 용어 추가
    this.sentiment.registerLanguage('crypto', {
      labels: {
        'bullish': 2,
        'bearish': -2,
        'moon': 3,
        'pump': 2,
        'dump': -2,
        'hodl': 1,
        'fomo': -1,
        'fud': -2,
        'adoption': 2,
        'partnership': 2,
        'listing': 1,
        'delisting': -2,
        'hack': -3,
        'security': 1,
        'regulation': -1,
        'ban': -3,
        'approve': 2,
        'reject': -2,
        'breakthrough': 2,
        'innovation': 1,
        'scam': -3,
        'rug': -3,
        'whale': 0,
        'diamond': 2,
        'paper': -1,
        'hands': 0
      }
    });
  }

  // RSS 뉴스 수집
  async fetchNews(coinSymbol, limit = 50) {
    try {
      const cacheKey = `news:${coinSymbol.toLowerCase()}`;
      let cachedNews = await this.cacheService.getNewsData(coinSymbol);
      
      if (cachedNews) {
        logger.info(`News for ${coinSymbol} loaded from cache`);
        return cachedNews.slice(0, limit);
      }

      const allNews = [];
      const promises = this.newsFeeds.map(feed => this.fetchFromFeed(feed, coinSymbol));
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allNews.push(...result.value);
        } else {
          logger.warning(`Failed to fetch from ${this.newsFeeds[index].name}:`, result.reason?.message);
        }
      });

      // 중복 제거 및 정렬
      const uniqueNews = this.removeDuplicates(allNews);
      const sortedNews = this.sortNewsByRelevance(uniqueNews, coinSymbol);
      
      // 캐시에 저장 (30분)
      await this.cacheService.setNewsData(coinSymbol, sortedNews);
      
      logger.success(`Fetched ${sortedNews.length} news articles for ${coinSymbol}`);
      return sortedNews.slice(0, limit);
    } catch (error) {
      logger.error(`Failed to fetch news for ${coinSymbol}:`, error);
      return [];
    }
  }

  // 개별 피드에서 뉴스 가져오기
  async fetchFromFeed(feed, coinSymbol) {
    try {
      if (!this.rss2jsonApiKey) {
        logger.warning('RSS2JSON API key not provided, skipping news fetch');
        return [];
      }

      const response = await axios.get('https://api.rss2json.com/v1/api.json', {
        params: {
          rss_url: feed.url,
          api_key: this.rss2jsonApiKey,
          count: 20
        },
        timeout: 10000
      });

      if (response.data.status !== 'ok') {
        throw new Error(`RSS2JSON API error: ${response.data.message}`);
      }

      const relevantNews = response.data.items
        .filter(item => this.isRelevantToCoin(item, coinSymbol))
        .map(item => this.processNewsItem(item, feed))
        .filter(item => item !== null);

      return relevantNews;
    } catch (error) {
      logger.error(`Failed to fetch from ${feed.name}:`, error);
      return [];
    }
  }

  // 코인 관련 뉴스인지 확인
  isRelevantToCoin(item, coinSymbol) {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const symbol = coinSymbol.toLowerCase();
    
    // 심볼이나 일반적인 코인명 포함 확인
    const coinKeywords = [
      symbol,
      symbol.replace('usdt', '').replace('usd', ''),
      this.getCoinNameVariations(symbol)
    ].flat();

    return coinKeywords.some(keyword => 
      keyword && text.includes(keyword.toLowerCase())
    );
  }

  // 코인명 변형 생성
  getCoinNameVariations(symbol) {
    const variations = [];
    const cleanSymbol = symbol.replace(/usdt?$/i, '');
    
    variations.push(cleanSymbol);
    
    // 일반적인 코인명 매핑
    const coinNameMap = {
      'btc': ['bitcoin'],
      'eth': ['ethereum', 'ether'],
      'ada': ['cardano'],
      'dot': ['polkadot'],
      'link': ['chainlink'],
      'xrp': ['ripple'],
      'ltc': ['litecoin'],
      'bch': ['bitcoin cash'],
      'eos': ['eos'],
      'xlm': ['stellar'],
      'trx': ['tron'],
      'xmr': ['monero'],
      'dash': ['dash'],
      'neo': ['neo'],
      'etc': ['ethereum classic']
    };
    
    if (coinNameMap[cleanSymbol.toLowerCase()]) {
      variations.push(...coinNameMap[cleanSymbol.toLowerCase()]);
    }
    
    return variations;
  }

  // 뉴스 아이템 처리
  processNewsItem(item, feed) {
    try {
      return {
        title: item.title,
        description: this.cleanText(item.description),
        link: item.link,
        pubDate: new Date(item.pubDate),
        source: feed.name,
        weight: feed.weight,
        guid: item.guid || item.link
      };
    } catch (error) {
      logger.error('Failed to process news item:', error);
      return null;
    }
  }

  // 텍스트 정리
  cleanText(text) {
    if (!text) return '';
    
    // HTML 태그 제거
    const $ = cheerio.load(text);
    const cleanText = $.text();
    
    // 특수 문자 정리
    return cleanText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s가-힣.,!?]/g, '')
      .trim();
  }

  // 중복 제거
  removeDuplicates(news) {
    const seen = new Set();
    return news.filter(item => {
      const key = item.guid || item.link;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // 관련성에 따른 정렬
  sortNewsByRelevance(news, coinSymbol) {
    return news.sort((a, b) => {
      const aRelevance = this.calculateRelevance(a, coinSymbol);
      const bRelevance = this.calculateRelevance(b, coinSymbol);
      
      return bRelevance - aRelevance;
    });
  }

  // 관련성 점수 계산
  calculateRelevance(item, coinSymbol) {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const symbol = coinSymbol.toLowerCase();
    
    let score = 0;
    
    // 제목에 심볼이 있으면 높은 점수
    if (item.title.toLowerCase().includes(symbol)) {
      score += 10;
    }
    
    // 설명에 심볼이 있으면 중간 점수
    if (item.description.toLowerCase().includes(symbol)) {
      score += 5;
    }
    
    // 피드 가중치 적용
    score *= item.weight;
    
    // 최신 뉴스일수록 높은 점수
    const hoursAgo = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 10 - hoursAgo);
    
    return score;
  }

  // 감정분석
  analyzeSentiment(text) {
    try {
      if (!text || text.length < 10) {
        return { score: 0, comparative: 0, positive: 0, negative: 0, neutral: 0 };
      }

      const result = this.sentiment.analyze(text);
      
      // -5 ~ +5 스케일을 0-100으로 변환
      const normalizedScore = Math.max(0, Math.min(100, ((result.score + 5) / 10) * 100));
      
      return {
        score: normalizedScore,
        comparative: result.comparative,
        positive: result.positive.length,
        negative: result.negative.length,
        neutral: result.tokens.length - result.positive.length - result.negative.length,
        tokens: result.tokens.length
      };
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return { score: 50, comparative: 0, positive: 0, negative: 0, neutral: 0 };
    }
  }

  // 코인별 종합 감정점수
  async getCoinSentiment(coinSymbol) {
    try {
      // 캐시에서 확인
      const cachedSentiment = await this.cacheService.getSentiment(coinSymbol);
      if (cachedSentiment !== null) {
        return cachedSentiment;
      }

      const news = await this.fetchNews(coinSymbol, 30);
      
      if (news.length === 0) {
        logger.warning(`No news found for ${coinSymbol}`);
        return 50; // 중립값
      }

      let totalSentiment = 0;
      let validNews = 0;
      let sentimentBreakdown = {
        positive: 0,
        negative: 0,
        neutral: 0
      };

      for (const article of news) {
        const text = `${article.title} ${article.description}`;
        const sentiment = this.analyzeSentiment(text);
        
        if (sentiment.tokens > 5) { // 최소 토큰 수 확인
          totalSentiment += sentiment.score;
          validNews++;
          
          // 감정 분류
          if (sentiment.score > 60) sentimentBreakdown.positive++;
          else if (sentiment.score < 40) sentimentBreakdown.negative++;
          else sentimentBreakdown.neutral++;
        }
      }

      const finalSentiment = validNews > 0 ? totalSentiment / validNews : 50;
      
      // 캐시에 저장 (30분)
      await this.cacheService.setSentiment(coinSymbol, finalSentiment);
      
      logger.success(`Calculated sentiment for ${coinSymbol}: ${finalSentiment.toFixed(2)} (${validNews} articles)`);
      
      return {
        score: Math.round(finalSentiment),
        breakdown: sentimentBreakdown,
        articlesAnalyzed: validNews,
        totalArticles: news.length
      };
    } catch (error) {
      logger.error(`Failed to get coin sentiment for ${coinSymbol}:`, error);
      return 50;
    }
  }

  // 다중 코인 감정분석
  async getMultipleCoinSentiments(coinSymbols) {
    const results = {};
    const promises = coinSymbols.map(async (symbol) => {
      try {
        const sentiment = await this.getCoinSentiment(symbol);
        results[symbol] = sentiment;
      } catch (error) {
        logger.error(`Failed to get sentiment for ${symbol}:`, error);
        results[symbol] = 50;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // 뉴스 키워드 분석
  async analyzeNewsKeywords(coinSymbol, limit = 20) {
    try {
      const news = await this.fetchNews(coinSymbol, limit);
      const keywordCounts = {};
      
      for (const article of news) {
        const text = `${article.title} ${article.description}`.toLowerCase();
        const words = text.match(/\b\w{3,}\b/g) || [];
        
        words.forEach(word => {
          if (word.length > 3 && !this.isStopWord(word)) {
            keywordCounts[word] = (keywordCounts[word] || 0) + 1;
          }
        });
      }
      
      // 상위 키워드 반환
      return Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));
    } catch (error) {
      logger.error(`Failed to analyze keywords for ${coinSymbol}:`, error);
      return [];
    }
  }

  // 불용어 확인
  isStopWord(word) {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'must', 'shall', 'a', 'an', 'the'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }

  // 뉴스 통계
  async getNewsStats() {
    try {
      const stats = {
        totalFeeds: this.newsFeeds.length,
        activeFeeds: 0,
        lastFetch: new Date(),
        cacheHitRate: 0
      };
      
      // 피드 상태 확인
      for (const feed of this.newsFeeds) {
        try {
          await this.fetchFromFeed(feed, 'bitcoin');
          stats.activeFeeds++;
        } catch (error) {
          logger.warning(`Feed ${feed.name} is not responding`);
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to get news stats:', error);
      return null;
    }
  }
}

module.exports = NewsService;
