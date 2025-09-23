const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');
const News = require('../models/News');
const NewsService = require('./NewsService');

class NewsSchedulerService {
  constructor() {
    this.newsService = new NewsService();
    this.isRunning = false;
    this.scheduledJobs = [];
    
    // 빗썸 기준 코인 목록
    this.targetCoins = [];
    this.coinsLastUpdated = null;
    this.coinsUpdateInterval = 24 * 60 * 60 * 1000; // 24시간마다 코인 목록 업데이트
    this.bithumbApiUrl = 'https://api.bithumb.com/public/ticker/ALL_KRW';
    
    // 하이브리드 뉴스 수집을 위한 키워드 및 카테고리
    this.cryptoKeywords = {
      korean: [
        '암호화폐', '비트코인', '이더리움', '블록체인', '디지털자산',
        '가상화폐', '코인', '토큰', '상장', '신규상장', '거래소',
        '빗썸', '업비트', '코인원', '호재', '악재', '급등', '급락',
        '상승', '하락', '투자', '매매', '거래', '시장', '가격',
        '채굴', '마이닝', '스테이킹', 'DeFi', 'NFT', '메타버스',
        '웹3', 'DAO', '스마트컨트랙트', '크립토', '알트코인'
      ],
      english: [
        'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'digital asset',
        'crypto', 'coin', 'token', 'listing', 'new listing', 'exchange',
        'bithumb', 'upbit', 'coinone', 'bullish', 'bearish', 'pump', 'dump',
        'rise', 'fall', 'investment', 'trading', 'market', 'price',
        'mining', 'staking', 'DeFi', 'NFT', 'metaverse', 'web3',
        'DAO', 'smart contract', 'altcoin', 'hodl', 'fomo', 'fud'
      ]
    };
    
    this.newsCategories = [
      'cryptocurrency', 'blockchain', 'finance', 'technology',
      'business', 'investment', 'trading', 'economics'
    ];
  }

  // 스케줄러 시작
  async startScheduler() {
    if (this.isRunning) {
      logger.warning('News scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 News Scheduler Service 시작');

    // 빗썸 코인 목록 로드
    await this.loadBithumbCoins();
    
    // 서버 시작 시 초기 뉴스 수집 확인
    await this.checkAndCollectInitialNews();

    // 5분마다 뉴스 수집 (수집 완료 후 바로 감정분석)
    const newsCollectionJob = cron.schedule('*/5 * * * *', async () => {
      await this.collectAndProcessNews();
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    });

    // 1시간마다 오래된 뉴스 정리
    const cleanupJob = cron.schedule('0 * * * *', async () => {
      await this.cleanupOldNews();
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    });

    // 30분마다 감정분석 재처리 (실패한 뉴스만)
    const sentimentRetryJob = cron.schedule('*/30 * * * *', async () => {
      await this.retryFailedSentimentAnalysis();
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    });

    // 24시간마다 빗썸 코인 목록 업데이트
    const coinUpdateJob = cron.schedule('0 0 * * *', async () => {
      await this.loadBithumbCoins();
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    });

    this.scheduledJobs = [newsCollectionJob, cleanupJob, sentimentRetryJob, coinUpdateJob];
    
    // 모든 작업 시작
    this.scheduledJobs.forEach(job => job.start());
    
    logger.success('✅ News Scheduler가 시작되었습니다');
    logger.info('📅 뉴스 수집: 5분마다 (수집 완료 후 즉시 감정분석)');
    logger.info('🧹 정리 작업: 1시간마다');
    logger.info('🔄 감정분석 재시도: 30분마다 (실패한 뉴스만)');
    logger.info('🪙 코인 목록 업데이트: 24시간마다 (빗썸 기준)');
  }

  // 스케줄러 중지
  stopScheduler() {
    if (!this.isRunning) {
      logger.warning('News scheduler is not running');
      return;
    }

    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    this.isRunning = false;
    
    logger.info('🛑 News Scheduler가 중지되었습니다');
  }

  // 뉴스 수집 및 처리 (하이브리드 방식)
  async collectAndProcessNews() {
    try {
      logger.info('📰 하이브리드 뉴스 수집 시작...');
      const startTime = Date.now();
      let totalCollected = 0;
      const collectedNews = [];

      // 1단계: 코인명 기반 뉴스 수집
      logger.info('🪙 코인명 기반 뉴스 수집...');
      for (const coinSymbol of this.targetCoins.slice(0, 20)) { // 상위 20개 코인만
        try {
          const newsArticles = await this.newsService.fetchNews(coinSymbol, 5);
          
          for (const article of newsArticles) {
            const newsDoc = await this.processNewsArticle(article, coinSymbol, 'coin');
            if (newsDoc) {
              collectedNews.push(newsDoc);
              totalCollected++;
            }
          }

          await this.sleep(500); // API 호출 간격 조절
          
        } catch (error) {
          logger.error(`코인 뉴스 수집 실패 (${coinSymbol}):`, error.message);
        }
      }

      // 2단계: 키워드 기반 뉴스 수집 (한글)
      logger.info('🔍 한글 키워드 기반 뉴스 수집...');
      for (const keyword of this.cryptoKeywords.korean.slice(0, 10)) { // 상위 10개 키워드
        try {
          const newsArticles = await this.newsService.fetchNews(keyword, 3);
          
          for (const article of newsArticles) {
            const newsDoc = await this.processNewsArticle(article, keyword, 'keyword');
            if (newsDoc) {
              collectedNews.push(newsDoc);
              totalCollected++;
            }
          }

          await this.sleep(500);
          
        } catch (error) {
          logger.error(`키워드 뉴스 수집 실패 (${keyword}):`, error.message);
        }
      }

      // 3단계: 키워드 기반 뉴스 수집 (영문)
      logger.info('🔍 영문 키워드 기반 뉴스 수집...');
      for (const keyword of this.cryptoKeywords.english.slice(0, 10)) { // 상위 10개 키워드
        try {
          const newsArticles = await this.newsService.fetchNews(keyword, 3);
          
          for (const article of newsArticles) {
            const newsDoc = await this.processNewsArticle(article, keyword, 'keyword');
            if (newsDoc) {
              collectedNews.push(newsDoc);
              totalCollected++;
            }
          }

          await this.sleep(500);
          
        } catch (error) {
          logger.error(`키워드 뉴스 수집 실패 (${keyword}):`, error.message);
        }
      }

      const collectionTime = Date.now() - startTime;
      logger.success(`📰 뉴스 수집 완료: ${totalCollected}개 수집 (${collectionTime}ms)`);

      // 2단계: 수집 완료 후 바로 감정분석 처리
      if (collectedNews.length > 0) {
        logger.info('📊 감정분석 시작...');
        const sentimentStartTime = Date.now();
        let totalProcessed = 0;

        for (const newsDoc of collectedNews) {
          try {
            const sentiment = await this.newsService.analyzeSentiment(
              newsDoc.title + ' ' + newsDoc.description
            );
            
            await newsDoc.updateSentiment(sentiment.score, sentiment.label, sentiment.confidence);
            totalProcessed++;
          } catch (error) {
            logger.warning(`감정분석 실패: ${newsDoc.title}`, error.message);
            newsDoc.sentimentRetryCount += 1;
            await newsDoc.save();
          }
        }

        const sentimentTime = Date.now() - sentimentStartTime;
        logger.success(`📊 감정분석 완료: ${totalProcessed}개 처리 (${sentimentTime}ms)`);
      }

      const totalTime = Date.now() - startTime;
      logger.success(`✅ 전체 처리 완료: ${totalCollected}개 수집 (${totalTime}ms)`);

    } catch (error) {
      logger.error('뉴스 수집 중 오류:', error);
    }
  }

  // 실패한 뉴스 감정분석 재시도
  async retryFailedSentimentAnalysis() {
    try {
      logger.info('🔄 실패한 뉴스 감정분석 재시도 시작...');
      
      const failedNews = await News.find({ status: 'failed' }).limit(20);
      
      if (failedNews.length === 0) {
        logger.info('🔄 재시도할 실패한 뉴스가 없습니다');
        return;
      }
      
      let retryCount = 0;
      
      for (const news of failedNews) {
        try {
          const sentiment = this.newsService.analyzeSentiment(
            news.title + ' ' + news.description
          );
          
          news.updateSentiment(sentiment);
          await news.save();
          retryCount++;
          
        } catch (error) {
          logger.warning(`감정분석 재시도 실패: ${news.title}`, error.message);
          // 3번 실패하면 포기
          if (news.retryCount >= 3) {
            news.status = 'abandoned';
            await news.save();
          } else {
            news.retryCount = (news.retryCount || 0) + 1;
            await news.save();
          }
        }
      }

      logger.success(`🔄 감정분석 재시도 완료: ${retryCount}개 성공`);

    } catch (error) {
      logger.error('감정분석 재시도 중 오류:', error);
    }
  }

  // 오래된 뉴스 정리
  async cleanupOldNews() {
    try {
      logger.info('🧹 오래된 뉴스 정리 시작...');
      
      const result = await News.cleanupOldNews(7); // 7일 이상 된 뉴스 삭제
      
      logger.success(`🧹 뉴스 정리 완료: ${result.deletedCount}개 삭제`);

    } catch (error) {
      logger.error('뉴스 정리 중 오류:', error);
    }
  }

  // 뉴스 아티클 처리 헬퍼 메서드
  async processNewsArticle(article, searchTerm, type) {
    try {
      // 뉴스 아티클 구조 확인
      logger.info(`뉴스 아티클 구조:`, {
        title: article.title,
        hasUrl: !!article.url,
        hasLink: !!article.link,
        hasDescription: !!article.description,
        hasSource: !!article.source
      });

      // URL 필드 확인 (url 또는 link)
      const articleUrl = article.url || article.link;
      if (!articleUrl) {
        logger.warning(`뉴스에 URL이 없음: ${article.title}`);
        return null;
      }

      // 중복 체크
      const existingNews = await News.findOne({ url: articleUrl });
      if (existingNews) {
        return null;
      }

      // 관련 코인 추출
      const relatedCoins = this.extractRelatedCoins(article.title + ' ' + (article.description || ''));
      
      // 뉴스 문서 생성
      const newsDoc = new News({
        title: article.title,
        description: article.description || '',
        url: articleUrl,
        source: article.source || 'unknown',
        language: this.detectLanguage(article.title + ' ' + (article.description || '')),
        relatedCoins: relatedCoins.length > 0 ? relatedCoins : [{
          symbol: searchTerm,
          relevanceScore: type === 'coin' ? 80 : 60
        }],
        publishedAt: article.publishedAt || article.pubDate || new Date(),
        weight: article.weight || 0.5,
        status: 'pending',
        searchTerm: searchTerm,
        searchType: type
      });

      await newsDoc.save();
      return newsDoc;
      
    } catch (error) {
      logger.warning(`뉴스 아티클 처리 실패: ${article.title}`, error.message);
      logger.warning(`에러 상세:`, error.stack);
      return null;
    }
  }

  // 뉴스에서 관련 코인 추출
  extractRelatedCoins(text) {
    const relatedCoins = [];
    const textUpper = text.toUpperCase();
    
    // 빗썸 코인 목록에서 매칭되는 코인 찾기
    for (const coin of this.targetCoins) {
      if (textUpper.includes(coin.toUpperCase())) {
        relatedCoins.push({
          symbol: coin,
          relevanceScore: 90
        });
      }
    }
    
    return relatedCoins;
  }

  // 언어 감지
  detectLanguage(text) {
    return /[가-힣]/.test(text) ? 'ko' : 'en';
  }

  // 수동 뉴스 수집 (API 호출용)
  async collectNewsManually(coinSymbols = null) {
    const coins = coinSymbols || this.targetCoins;
    logger.info(`📰 수동 뉴스 수집 시작: ${coins.join(', ')}`);
    
    await this.collectAndProcessNews();
    
    return {
      success: true,
      message: '뉴스 수집 및 감정분석이 완료되었습니다',
      timestamp: new Date().toISOString()
    };
  }

  // 뉴스 통계 조회
  async getNewsStats() {
    try {
      const stats = await News.getSentimentStats();
      const topCoins = await News.getTopCoinsByNews(24, 10);
      
      return {
        totalNews: stats[0]?.totalNews || 0,
        avgSentiment: stats[0]?.avgSentiment || 50,
        positiveCount: stats[0]?.positiveCount || 0,
        negativeCount: stats[0]?.negativeCount || 0,
        neutralCount: stats[0]?.neutralCount || 0,
        topCoins: topCoins
      };
    } catch (error) {
      logger.error('뉴스 통계 조회 실패:', error);
      return null;
    }
  }

  // 특정 코인의 최신 뉴스 조회
  async getLatestNewsForCoin(coinSymbol, limit = 20) {
    try {
      return await News.getLatestNews(limit, coinSymbol);
    } catch (error) {
      logger.error(`뉴스 조회 실패 (${coinSymbol}):`, error);
      return [];
    }
  }

  // 특정 코인의 감정분석 통계
  async getCoinSentimentStats(coinSymbol, hours = 24) {
    try {
      const stats = await News.getSentimentStats(coinSymbol, hours);
      return stats[0] || {
        totalNews: 0,
        avgSentiment: 50,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0
      };
    } catch (error) {
      logger.error(`감정분석 통계 조회 실패 (${coinSymbol}):`, error);
      return null;
    }
  }

  // 빗썸에서 코인 목록 로드
  async loadBithumbCoins() {
    try {
      logger.info('🪙 빗썸 코인 목록 로드 중...');
      
      const response = await axios.get(this.bithumbApiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'GainDeuk-NewsBot/1.0'
        }
      });
      
      if (response.data && response.data.status === '0000' && response.data.data) {
        const coins = Object.keys(response.data.data).filter(symbol => symbol !== 'date');
        this.targetCoins = coins;
        this.coinsLastUpdated = new Date();
        
        logger.success(`🪙 빗썸 코인 목록 로드 완료: ${coins.length}개 코인`);
        logger.info(`📋 주요 코인: ${coins.slice(0, 10).join(', ')}...`);
      } else {
        throw new Error('빗썸 API 응답 형식 오류');
      }
      
    } catch (error) {
      logger.error('빗썸 코인 목록 로드 실패:', error.message);
      // 실패 시 기본 코인 목록 사용
      this.targetCoins = [
        'BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'EOS', 'TRX',
        'XLM', 'VET', 'FIL', 'THETA', 'AAVE', 'UNI', 'SUSHI', 'COMP', 'YFI', 'SNX'
      ];
      logger.warning('기본 코인 목록을 사용합니다');
    }
  }

  // 서버 시작 시 초기 뉴스 수집 확인
  async checkAndCollectInitialNews() {
    try {
      logger.info('🔍 초기 뉴스 데이터 확인 중...');
      
      // 최근 1시간 내 뉴스가 있는지 확인
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentNewsCount = await News.countDocuments({
        collectedAt: { $gte: oneHourAgo }
      });
      
      if (recentNewsCount === 0) {
        logger.info('📰 최근 뉴스가 없습니다. 초기 뉴스 수집을 시작합니다...');
        await this.collectAndProcessNews();
        logger.success('✅ 초기 뉴스 수집이 완료되었습니다');
      } else {
        logger.info(`📰 최근 뉴스 ${recentNewsCount}개가 이미 있습니다. 초기 수집을 건너뜁니다.`);
      }
      
    } catch (error) {
      logger.error('초기 뉴스 수집 확인 중 오류:', error);
      // 오류가 발생해도 스케줄러는 계속 진행
    }
  }

  // 유틸리티: 대기 함수
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 스케줄러 상태 확인
  getStatus() {
    return {
      isRunning: this.isRunning,
      targetCoins: this.targetCoins,
      scheduledJobs: this.scheduledJobs.length
    };
  }
}

module.exports = NewsSchedulerService;
