const axios = require('axios');
const cheerio = require('cheerio');
const Sentiment = require('sentiment');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

class NewsService {
  constructor() {
    this.sentiment = new Sentiment();
    this.cacheService = new CacheService();
    
    this.newsFeeds = [
      // 글로벌 뉴스 소스
      {
        name: 'CoinDesk',
        url: 'https://feeds.feedburner.com/CoinDesk',
        weight: 1.0,
        language: 'en'
      },
      {
        name: 'CoinTelegraph',
        url: 'https://cointelegraph.com/rss',
        weight: 0.9,
        language: 'en'
      },
      {
        name: 'CryptoNews',
        url: 'https://cryptonews.com/news/feed/',
        weight: 0.8,
        language: 'en'
      },
      {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed',
        weight: 0.7,
        language: 'en'
      },
      {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/rss',
        weight: 0.6,
        language: 'en'
      },
      // 한국어 뉴스 소스
      {
        name: '코인데스크 코리아',
        url: 'https://www.coindeskkorea.com/rss',
        weight: 0.9,
        language: 'ko'
      },
      {
        name: '디센터',
        url: 'https://decenter.kr/rss',
        weight: 0.8,
        language: 'ko'
      },
      {
        name: '블록미디어',
        url: 'https://www.blockmedia.co.kr/rss',
        weight: 0.8,
        language: 'ko'
      },
      {
        name: '코인리더스',
        url: 'https://coinreaders.com/rss',
        weight: 0.7,
        language: 'ko'
      },
      {
        name: '코인뉴스',
        url: 'https://www.coinnews.kr/rss',
        weight: 0.7,
        language: 'ko'
      }
    ];

    this.rss2jsonApiKey = process.env.RSS2JSON_API_KEY;
    this.setupSentiment();
  }

  setupSentiment() {
    // 암호화폐 관련 용어 추가 (영어)
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

    // 한국어 암호화폐 관련 용어 추가
    this.sentiment.registerLanguage('korean_crypto', {
      labels: {
        // 긍정적 용어
        '상승': 2,
        '급등': 3,
        '호재': 2,
        '돌파': 2,
        '반등': 2,
        '회복': 2,
        '성장': 2,
        '개선': 2,
        '강세': 2,
        '상향': 2,
        '긍정': 2,
        '낙관': 2,
        '기대': 1,
        '희망': 1,
        '성공': 2,
        '승리': 2,
        '돌파구': 2,
        '전환점': 2,
        '기회': 1,
        '잠재력': 1,
        '혁신': 2,
        '기술': 1,
        '발전': 2,
        '도입': 1,
        '채택': 2,
        '파트너십': 2,
        '협력': 1,
        '지원': 1,
        '승인': 2,
        '허가': 2,
        '상장': 1,
        '거래소': 1,
        '투자': 1,
        '매수': 2,
        '매수세': 2,
        '매수세력': 2,
        '고래': 0,
        '대량매수': 2,
        '대량거래': 1,
        '거래량증가': 2,
        '거래량폭증': 3,
        '관심증가': 1,
        '인기': 1,
        '화제': 1,
        '트렌드': 1,
        '유행': 1,
        '붐': 2,
        '열풍': 2,
        '열기': 2,
        '관심': 1,
        '주목': 1,
        '집중': 1,
        '모멘텀': 1,
        '추세': 1,
        '방향성': 1,
        '전망': 1,
        '예측': 1,
        '분석': 0,
        '전문가': 0,
        '권위자': 0,
        '리더': 1,
        '선도': 1,
        '최고': 2,
        '최대': 1,
        '기록': 1,
        '신고가': 3,
        '신저가': -3,
        '역대최고': 3,
        '역대최저': -3,
        '최고점': 2,
        '최저점': -2,
        '피크': 2,
        '바닥': -2,
        '저점': -1,
        '고점': 2,
        '상단': 1,
        '하단': -1,
        '저항선': 0,
        '지지선': 0,
        '돌파': 2,
        '이탈': -1,
        '하락': -2,
        '급락': -3,
        '악재': -2,
        '부정': -2,
        '비관': -2,
        '우려': -1,
        '걱정': -1,
        '불안': -2,
        '공포': -2,
        '패닉': -3,
        '공황': -3,
        '혼란': -1,
        '불확실': -1,
        '위험': -2,
        '위기': -3,
        '문제': -2,
        '이슈': -1,
        '논란': -1,
        '스캔들': -3,
        '사기': -3,
        '피해': -2,
        '손실': -2,
        '손해': -2,
        '실패': -2,
        '실망': -2,
        '좌절': -2,
        '절망': -3,
        '포기': -2,
        '매도': -2,
        '매도세': -2,
        '매도세력': -2,
        '대량매도': -2,
        '거래량감소': -1,
        '거래량급감': -2,
        '관심감소': -1,
        '인기하락': -1,
        '화제사라짐': -1,
        '트렌드끝': -1,
        '유행끝': -1,
        '붐끝': -1,
        '열풍끝': -1,
        '열기식음': -1,
        '관심사라짐': -1,
        '주목끝': -1,
        '집중끝': -1,
        '모멘텀끝': -1,
        '추세끝': -1,
        '방향성불분명': -1,
        '전망어둡': -2,
        '예측어둡': -2,
        '분석부정': -1,
        '전문가부정': -1,
        '권위자부정': -1,
        '리더부정': -1,
        '선도부정': -1,
        '최악': -3,
        '최소': -1,
        '기록깨짐': -1,
        '신고가깨짐': 2,
        '신저가깨짐': -2,
        '역대최고깨짐': 2,
        '역대최저깨짐': -2,
        '최고점깨짐': 2,
        '최저점깨짐': -2,
        '피크깨짐': 2,
        '바닥깨짐': -2,
        '저점깨짐': -1,
        '고점깨짐': 2,
        '상단깨짐': 1,
        '하단깨짐': -1,
        '저항선깨짐': 2,
        '지지선깨짐': -2,
        '돌파실패': -1,
        '이탈성공': -1,
        '하락지속': -2,
        '급락지속': -3,
        '악재지속': -2,
        '부정지속': -2,
        '비관지속': -2,
        '우려지속': -1,
        '걱정지속': -1,
        '불안지속': -2,
        '공포지속': -2,
        '패닉지속': -3,
        '공황지속': -3,
        '혼란지속': -1,
        '불확실지속': -1,
        '위험지속': -2,
        '위기지속': -3,
        '문제지속': -2,
        '이슈지속': -1,
        '논란지속': -1,
        '스캔들지속': -3,
        '사기지속': -3,
        '피해지속': -2,
        '손실지속': -2,
        '손해지속': -2,
        '실패지속': -2,
        '실망지속': -2,
        '좌절지속': -2,
        '절망지속': -3,
        '포기지속': -2,
        '매도지속': -2,
        '매도세지속': -2,
        '매도세력지속': -2,
        '대량매도지속': -2,
        '거래량감소지속': -1,
        '거래량급감지속': -2,
        '관심감소지속': -1,
        '인기하락지속': -1,
        '화제사라짐지속': -1,
        '트렌드끝지속': -1,
        '유행끝지속': -1,
        '붐끝지속': -1,
        '열풍끝지속': -1,
        '열기식음지속': -1,
        '관심사라짐지속': -1,
        '주목끝지속': -1,
        '집중끝지속': -1,
        '모멘텀끝지속': -1,
        '추세끝지속': -1,
        '방향성불분명지속': -1,
        '전망어둡지속': -2,
        '예측어둡지속': -2,
        '분석부정지속': -1,
        '전문가부정지속': -1,
        '권위자부정지속': -1,
        '리더부정지속': -1,
        '선도부정지속': -1,
        '최악지속': -3,
        '최소지속': -1,
        '기록깨짐지속': -1,
        '신고가깨짐지속': 2,
        '신저가깨짐지속': -2,
        '역대최고깨짐지속': 2,
        '역대최저깨짐지속': -2,
        '최고점깨짐지속': 2,
        '최저점깨짐지속': -2,
        '피크깨짐지속': 2,
        '바닥깨짐지속': -2,
        '저점깨짐지속': -1,
        '고점깨짐지속': 2,
        '상단깨짐지속': 1,
        '하단깨짐지속': -1,
        '저항선깨짐지속': 2,
        '지지선깨짐지속': -2,
        '돌파실패지속': -1,
        '이탈성공지속': -1
      }
    });
  }

  // RSS 뉴스 수집 (최적화된 버전)
  async fetchNews(coinSymbol, limit = 50) {
    try {
      const cacheKey = `news:${coinSymbol.toLowerCase()}`;
      let cachedNews = await this.cacheService.getNewsData(coinSymbol);
      
      if (cachedNews) {
        logger.info(`News for ${coinSymbol} loaded from cache`);
        return cachedNews.slice(0, limit);
      }

      // 타임아웃 설정 (전체 뉴스 수집에 10초 제한)
      const newsPromise = this.fetchNewsWithTimeout(coinSymbol, limit);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('News fetch timeout')), 10000)
      );

      const allNews = await Promise.race([newsPromise, timeoutPromise]);
      
      // 캐시에 저장 (30분)
      await this.cacheService.setNewsData(coinSymbol, allNews);
      
      logger.success(`Fetched ${allNews.length} news articles for ${coinSymbol}`);
      return allNews.slice(0, limit);
    } catch (error) {
      logger.error(`Failed to fetch news for ${coinSymbol}:`, error.message);
      // 실패 시 Mock 데이터 반환
      return this.getMockNewsData({ name: 'Fallback' }, coinSymbol);
    }
  }

  // 타임아웃이 적용된 뉴스 수집
  async fetchNewsWithTimeout(coinSymbol, limit) {
    const allNews = [];
    
    // 상위 3개 피드만 사용하여 속도 향상
    const topFeeds = this.newsFeeds.slice(0, 3);
    const promises = topFeeds.map(feed => this.fetchFromFeed(feed, coinSymbol));
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allNews.push(...result.value);
      } else {
        logger.warning(`Failed to fetch from ${topFeeds[index].name}:`, result.reason?.message);
      }
    });

    // 중복 제거 및 정렬
    const uniqueNews = this.removeDuplicates(allNews);
    const sortedNews = this.sortNewsByRelevance(uniqueNews, coinSymbol);
    
    return sortedNews;
  }

  // 개별 피드에서 뉴스 가져오기 (개선된 에러 핸들링)
  async fetchFromFeed(feed, coinSymbol) {
    try {
      if (!this.rss2jsonApiKey) {
        logger.warning('RSS2JSON API key not provided, returning mock news data');
        return this.getMockNewsData(feed, coinSymbol);
      }

      // 타임아웃과 재시도 로직 추가
      const response = await this.fetchWithRetry('https://api.rss2json.com/v1/api.json', {
        params: {
          rss_url: feed.url,
          api_key: this.rss2jsonApiKey,
          count: 20
        },
        timeout: 15000, // 타임아웃 증가
        headers: {
          'User-Agent': 'GainDeuk-NewsBot/1.0'
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`RSS2JSON API error: ${response.data.message}`);
      }

      const relevantNews = response.data.items
        .filter(item => this.isRelevantToCoin(item, coinSymbol))
        .map(item => this.processNewsItem(item, feed))
        .filter(item => item !== null);

      logger.info(`Fetched ${relevantNews.length} relevant news from ${feed.name}`);
      return relevantNews;
    } catch (error) {
      logger.error(`Failed to fetch from ${feed.name}:`, error.message);
      // 실패 시 Mock 데이터 반환
      return this.getMockNewsData(feed, coinSymbol);
    }
  }

  // 재시도 로직이 포함된 HTTP 요청
  async fetchWithRetry(url, config, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(url, config);
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 지수 백오프로 재시도 간격 증가
        const delay = Math.pow(2, attempt) * 1000;
        logger.warning(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  // 유틸리티: 대기 함수
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  // Mock 뉴스 데이터 생성 (API 키가 없을 때 사용)
  getMockNewsData(feed, coinSymbol) {
    const mockNews = [
      {
        title: `${coinSymbol.toUpperCase()} Market Analysis: Bullish Trends Continue`,
        description: `Recent market analysis shows positive momentum for ${coinSymbol.toUpperCase()} with strong technical indicators pointing to continued growth.`,
        url: `https://example.com/news/${coinSymbol}-bullish-${Date.now()}`,
        publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        source: feed.name,
        sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
        relevanceScore: 0.8 + Math.random() * 0.2
      },
      {
        title: `${coinSymbol.toUpperCase()} Technical Analysis: Key Support Levels`,
        description: `Technical analysts are watching key support levels for ${coinSymbol.toUpperCase()} as the market shows signs of consolidation.`,
        url: `https://example.com/news/${coinSymbol}-technical-${Date.now()}`,
        publishedAt: new Date(Date.now() - Math.random() * 172800000).toISOString(),
        source: feed.name,
        sentiment: 'neutral',
        relevanceScore: 0.7 + Math.random() * 0.2
      }
    ];
    
    return mockNews.slice(0, Math.floor(Math.random() * 2) + 1);
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

  // 감정분석 (한국어/영어 지원)
  analyzeSentiment(text) {
    try {
      if (!text || text.length < 10) {
        return { score: 50, comparative: 0, positive: 0, negative: 0, neutral: 0 };
      }

      // 한국어 텍스트 감지
      const hasKorean = /[가-힣]/.test(text);
      const language = hasKorean ? 'korean_crypto' : 'crypto';
      
      // 언어별 감정분석 실행
      const result = this.sentiment.analyze(text, { language });
      
      // -5 ~ +5 스케일을 0-100으로 변환
      const normalizedScore = Math.max(0, Math.min(100, ((result.score + 5) / 10) * 100));
      
      // 한국어 키워드 추가 분석
      let koreanBoost = 0;
      if (hasKorean) {
        koreanBoost = this.analyzeKoreanKeywords(text);
      }
      
      const finalScore = Math.max(0, Math.min(100, normalizedScore + koreanBoost));
      
      return {
        score: finalScore,
        comparative: result.comparative,
        positive: result.positive.length,
        negative: result.negative.length,
        neutral: result.tokens.length - result.positive.length - result.negative.length,
        tokens: result.tokens.length,
        language: hasKorean ? 'ko' : 'en',
        koreanBoost: koreanBoost
      };
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return { score: 50, comparative: 0, positive: 0, negative: 0, neutral: 0 };
    }
  }

  // 한국어 키워드 추가 분석
  analyzeKoreanKeywords(text) {
    const koreanKeywords = {
      // 매우 긍정적
      '급등': 15, '폭등': 15, '대폭상승': 15, '급상승': 12, '폭상승': 12,
      '신고가': 15, '역대최고': 15, '최고점': 10, '돌파': 10, '돌파구': 10,
      '호재': 12, '대호재': 15, '초호재': 15, '강력한호재': 15,
      '매수세': 10, '매수세력': 10, '대량매수': 12, '폭발적매수': 15,
      '거래량폭증': 12, '거래량급증': 10, '거래량증가': 8,
      '열풍': 10, '붐': 10, '화제': 8, '인기': 8, '관심증가': 8,
      '성공': 10, '승리': 10, '돌파구': 10, '전환점': 10,
      
      // 긍정적
      '상승': 8, '반등': 8, '회복': 8, '성장': 8, '개선': 6,
      '강세': 8, '상향': 6, '긍정': 6, '낙관': 6, '기대': 4,
      '희망': 4, '기회': 4, '잠재력': 4, '혁신': 6, '기술': 4,
      '발전': 6, '도입': 4, '채택': 6, '파트너십': 6, '협력': 4,
      '지원': 4, '승인': 6, '허가': 6, '상장': 4, '거래소': 4,
      '투자': 4, '매수': 6, '고래': 0, '대량거래': 6,
      '관심': 4, '주목': 4, '집중': 4, '모멘텀': 4, '추세': 4,
      '방향성': 4, '전망': 4, '예측': 4, '분석': 0, '전문가': 0,
      '권위자': 0, '리더': 4, '선도': 4, '최고': 6, '최대': 4,
      '기록': 4, '피크': 6, '고점': 6, '상단': 4,
      
      // 부정적
      '하락': -8, '급락': -12, '폭락': -15, '대폭하락': -15, '급하락': -12,
      '신저가': -15, '역대최저': -15, '최저점': -10, '바닥': -10,
      '악재': -12, '대악재': -15, '초악재': -15, '강력한악재': -15,
      '매도세': -10, '매도세력': -10, '대량매도': -12, '폭발적매도': -15,
      '거래량급감': -10, '거래량감소': -8, '거래량부족': -6,
      '관심감소': -6, '인기하락': -6, '화제사라짐': -6,
      '트렌드끝': -6, '유행끝': -6, '붐끝': -6, '열풍끝': -6,
      '실패': -10, '실망': -8, '좌절': -8, '절망': -12, '포기': -8,
      '부정': -8, '비관': -8, '우려': -6, '걱정': -6, '불안': -8,
      '공포': -10, '패닉': -15, '공황': -15, '혼란': -6, '불확실': -6,
      '위험': -8, '위기': -12, '문제': -8, '이슈': -6, '논란': -6,
      '스캔들': -15, '사기': -15, '피해': -10, '손실': -10, '손해': -10,
      '매도': -8, '하단': -6, '저점': -6, '최악': -12, '최소': -6,
      '기록깨짐': -6, '저항선깨짐': -8, '지지선깨짐': -8,
      '돌파실패': -6, '이탈': -6, '이탈성공': -6
    };

    let boost = 0;
    const textLower = text.toLowerCase();
    
    for (const [keyword, value] of Object.entries(koreanKeywords)) {
      if (textLower.includes(keyword)) {
        boost += value;
      }
    }
    
    // 부스트 값 정규화 (-20 ~ +20 범위로 제한)
    return Math.max(-20, Math.min(20, boost));
  }

  // 코인별 종합 감정점수 (최적화된 버전)
  async getCoinSentiment(coinSymbol) {
    try {
      // 캐시에서 확인
      const cachedSentiment = await this.cacheService.getSentiment(coinSymbol);
      if (cachedSentiment !== null) {
        return cachedSentiment;
      }

      // 뉴스 수집을 5개로 제한하여 속도 향상
      const news = await this.fetchNews(coinSymbol, 5);
      
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

      // 병렬 처리로 감정분석 속도 향상
      const sentimentPromises = news.map(async (article) => {
        const text = `${article.title} ${article.description}`;
        return this.analyzeSentiment(text);
      });

      const sentiments = await Promise.allSettled(sentimentPromises);
      
      sentiments.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.tokens > 3) {
          const sentiment = result.value;
          totalSentiment += sentiment.score;
          validNews++;
          
          // 감정 분류
          if (sentiment.score > 60) sentimentBreakdown.positive++;
          else if (sentiment.score < 40) sentimentBreakdown.negative++;
          else sentimentBreakdown.neutral++;
        }
      });

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

  // 최신 뉴스 조회
  async getLatestNews(limit = 20, category = 'all') {
    try {
      const cacheKey = `news:latest:${limit}:${category}`;
      let cachedNews = await this.cacheService.get(cacheKey);
      
      if (cachedNews) {
        return cachedNews;
      }

      const allNews = [];
      
      // 각 피드에서 뉴스 수집
      for (const feed of this.newsFeeds) {
        try {
          const feedNews = await this.fetchFromFeed(feed, category);
          allNews.push(...feedNews);
        } catch (error) {
          logger.warning(`Failed to fetch from ${feed.name}:`, error.message);
        }
      }

      // 날짜순 정렬 및 제한
      const sortedNews = allNews
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);

      // 캐시에 저장 (5분)
      await this.cacheService.set(cacheKey, sortedNews, 300);
      
      return sortedNews;
    } catch (error) {
      logger.error('Failed to get latest news:', error);
      return [];
    }
  }

  // 감정 분석
  async analyzeSentiment(timeframe = '24h', category = 'all') {
    try {
      const cacheKey = `news:sentiment:${timeframe}:${category}`;
      let cachedSentiment = await this.cacheService.get(cacheKey);
      
      if (cachedSentiment) {
        return cachedSentiment;
      }

      const news = await this.getLatestNews(100, category);
      
      if (news.length === 0) {
        return {
          overallSentiment: { score: 0, label: 'neutral' },
          sentimentTrend: [],
          topPositiveNews: [],
          topNegativeNews: []
        };
      }

      // 전체 감정 점수 계산
      let totalScore = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;

      news.forEach(article => {
        if (article.sentiment) {
          totalScore += article.sentiment.score;
          if (article.sentiment.score > 0) positiveCount++;
          else if (article.sentiment.score < 0) negativeCount++;
          else neutralCount++;
        }
      });

      const avgScore = totalScore / news.length;
      let label = 'neutral';
      if (avgScore > 0.1) label = 'positive';
      else if (avgScore < -0.1) label = 'negative';

      // 상위 긍정/부정 뉴스
      const sortedNews = news
        .filter(article => article.sentiment)
        .sort((a, b) => b.sentiment.score - a.sentiment.score);

      const topPositiveNews = sortedNews.slice(0, 5);
      const topNegativeNews = sortedNews.slice(-5).reverse();

      const result = {
        overallSentiment: { score: avgScore, label },
        sentimentTrend: [{ timestamp: new Date(), score: avgScore }],
        topPositiveNews,
        topNegativeNews,
        stats: {
          total: news.length,
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount
        }
      };

      // 캐시에 저장 (10분)
      await this.cacheService.set(cacheKey, result, 600);
      
      return result;
    } catch (error) {
      logger.error('Failed to analyze sentiment:', error);
      return {
        overallSentiment: { score: 0, label: 'neutral' },
        sentimentTrend: [],
        topPositiveNews: [],
        topNegativeNews: []
      };
    }
  }

  // 트렌딩 뉴스
  async getTrendingNews(limit = 10) {
    try {
      const cacheKey = `news:trending:${limit}`;
      let cachedTrending = await this.cacheService.get(cacheKey);
      
      if (cachedTrending) {
        return cachedTrending;
      }

      const news = await this.getLatestNews(50, 'all');
      
      // 트렌딩 점수 계산 (감정 점수 + 시간 가중치)
      const trendingNews = news.map(article => {
        const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        const timeWeight = Math.max(0, 1 - hoursAgo / 24); // 24시간 내 가중치
        const sentimentScore = article.sentiment ? Math.abs(article.sentiment.score) : 0;
        const trendingScore = (sentimentScore * 0.7) + (timeWeight * 0.3);
        
        return {
          ...article,
          trendingScore
        };
      });

      // 트렌딩 점수순 정렬
      const sortedTrending = trendingNews
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      // 캐시에 저장 (5분)
      await this.cacheService.set(cacheKey, sortedTrending, 300);
      
      return sortedTrending;
    } catch (error) {
      logger.error('Failed to get trending news:', error);
      return [];
    }
  }

  // 뉴스 검색
  async searchNews(query, limit = 20, category = 'all') {
    try {
      const cacheKey = `news:search:${query}:${limit}:${category}`;
      let cachedResults = await this.cacheService.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }

      const news = await this.getLatestNews(100, category);
      const queryLower = query.toLowerCase();
      
      // 검색어와 매칭되는 뉴스 필터링
      const matchingNews = news.filter(article => {
        const title = article.title.toLowerCase();
        const description = article.description ? article.description.toLowerCase() : '';
        return title.includes(queryLower) || description.includes(queryLower);
      });

      // 관련도 점수 계산
      const scoredNews = matchingNews.map(article => {
        const title = article.title.toLowerCase();
        const description = article.description ? article.description.toLowerCase() : '';
        
        let relevanceScore = 0;
        if (title.includes(queryLower)) relevanceScore += 2;
        if (description.includes(queryLower)) relevanceScore += 1;
        
        // 감정 점수 추가
        if (article.sentiment) {
          relevanceScore += Math.abs(article.sentiment.score) * 0.5;
        }
        
        return {
          ...article,
          relevanceScore
        };
      });

      // 관련도순 정렬
      const sortedResults = scoredNews
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // 캐시에 저장 (10분)
      await this.cacheService.set(cacheKey, sortedResults, 600);
      
      return sortedResults;
    } catch (error) {
      logger.error('Failed to search news:', error);
      return [];
    }
  }

  // 뉴스 피드 목록
  async getNewsFeeds() {
    try {
      const feeds = this.newsFeeds.map(feed => ({
        name: feed.name,
        url: feed.url,
        weight: feed.weight,
        status: 'active' // 실제로는 피드 상태를 확인해야 함
      }));
      
      return feeds;
    } catch (error) {
      logger.error('Failed to get news feeds:', error);
      return [];
    }
  }
}

module.exports = NewsService;
