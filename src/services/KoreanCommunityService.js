const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

/**
 * 한국 커뮤니티 감정분석 서비스
 * 네이버 카페, 디시인사이드, 한국 암호화폐 커뮤니티 분석
 */
class KoreanCommunityService {
  constructor() {
    this.cacheService = new CacheService();
    
    // 한국 커뮤니티 소스 설정
    this.communitySources = {
      naverCafe: {
        name: '네이버 카페',
        baseUrl: 'https://cafe.naver.com',
        weight: 0.4,
        enabled: true
      },
      dcInside: {
        name: '디시인사이드',
        baseUrl: 'https://gall.dcinside.com',
        weight: 0.3,
        enabled: true
      },
      coinpan: {
        name: '코인판',
        baseUrl: 'https://coinpan.com',
        weight: 0.2,
        enabled: true
      },
      bitman: {
        name: '비트맨',
        baseUrl: 'https://bitman.kr',
        weight: 0.1,
        enabled: true
      }
    };

    // 한국어 감정분석 키워드 확장
    this.koreanSentimentKeywords = {
      positive: [
        // 가격 상승 관련
        '상승', '급등', '폭등', '상한가', '신고가', '돌파', '강세', '상승세',
        '호재', '긍정적', '낙관적', '기대', '희망', '좋다', '훌륭하다',
        '투자', '매수', '보유', '달성', '성공', '수익', '이익', '수익률',
        '김치프리미엄', '한국시장', '국내', '우리나라', '한국인',
        // 기술적 분석
        '브레이크아웃', '저항선돌파', '지지선', '상승채널', '골든크로스',
        '거래량증가', '모멘텀', '추세', '상승추세', '강한신호',
        // 뉴스/이벤트
        '상장', '파트너십', '협력', '도입', '채택', '승인', '허가',
        '업그레이드', '개선', '혁신', '기술발전', '기능추가'
      ],
      negative: [
        // 가격 하락 관련
        '하락', '급락', '폭락', '하한가', '신저가', '붕괴', '약세', '하락세',
        '악재', '부정적', '비관적', '걱정', '우려', '나쁘다', '위험하다',
        '매도', '손실', '손해', '마이너스', '하락장', '조정', '거품',
        '과열', '조심', '주의', '경고', '위험', '불안', '공포',
        // 기술적 분석
        '데드크로스', '지지선이탈', '저항선', '하락채널', '약한신호',
        '거래량감소', '모멘텀상실', '하락추세', '약세추세',
        // 뉴스/이벤트
        '상장폐지', '규제', '금지', '제재', '해킹', '보안사고',
        '다운그레이드', '문제', '오류', '버그', '지연', '취소'
      ],
      neutral: [
        // 중립적 표현
        '보합', '횡보', '정체', '안정', '중립', '관망', '대기',
        '분석', '검토', '검증', '확인', '모니터링', '관찰',
        '예상', '예측', '가능성', '확률', '시나리오', '계획',
        '정보', '뉴스', '공지', '발표', '소식', '이야기'
      ]
    };

    // 가중치 설정
    this.keywordWeights = {
      price: 3.0,      // 가격 관련 키워드
      technical: 2.5,  // 기술적 분석 키워드
      news: 2.0,       // 뉴스/이벤트 키워드
      general: 1.0     // 일반 키워드
    };
  }

  /**
   * 코인별 한국 커뮤니티 감정분석
   * @param {string} coinSymbol - 코인 심볼
   * @returns {Object} 감정분석 결과
   */
  async analyzeKoreanCommunitySentiment(coinSymbol) {
    try {
      const symbol = coinSymbol.toUpperCase();
      logger.info(`한국 커뮤니티 감정분석 시작: ${symbol}`);

      // 캐시에서 확인
      const cacheKey = `korean_community:${symbol}`;
      const cachedData = await this.cacheService.getKoreanCommunitySentiment(symbol);
      if (cachedData) {
        logger.info(`한국 커뮤니티 감정분석 캐시에서 로드: ${symbol}`);
        return cachedData;
      }

      // 각 커뮤니티에서 데이터 수집
      const communityData = await this.collectCommunityData(symbol);
      
      if (!communityData || communityData.length === 0) {
        logger.warning(`${symbol}에 대한 한국 커뮤니티 데이터를 찾을 수 없습니다`);
        return this.getDefaultSentiment();
      }

      // 감정분석 수행
      const sentimentResult = this.performSentimentAnalysis(communityData, symbol);

      // 결과 캐싱 (30분)
      await this.cacheService.setKoreanCommunitySentiment(symbol, sentimentResult);

      logger.success(`${symbol} 한국 커뮤니티 감정분석 완료: ${sentimentResult.score.toFixed(2)}`);
      return sentimentResult;
    } catch (error) {
      logger.error(`한국 커뮤니티 감정분석 실패 (${coinSymbol}):`, error);
      return this.getDefaultSentiment();
    }
  }

  /**
   * 커뮤니티 데이터 수집
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 커뮤니티 데이터
   */
  async collectCommunityData(symbol) {
    const allData = [];
    const promises = [];

    // 각 커뮤니티에서 데이터 수집
    for (const [sourceKey, source] of Object.entries(this.communitySources)) {
      if (source.enabled) {
        promises.push(this.collectFromSource(sourceKey, source, symbol));
      }
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allData.push(...result.value);
      } else {
        const sourceKey = Object.keys(this.communitySources)[index];
        logger.warning(`${this.communitySources[sourceKey].name}에서 데이터 수집 실패:`, result.reason?.message);
      }
    });

    return allData;
  }

  /**
   * 특정 소스에서 데이터 수집
   * @param {string} sourceKey - 소스 키
   * @param {Object} source - 소스 설정
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 수집된 데이터
   */
  async collectFromSource(sourceKey, source, symbol) {
    try {
      switch (sourceKey) {
        case 'naverCafe':
          return await this.collectFromNaverCafe(symbol);
        case 'dcInside':
          return await this.collectFromDcInside(symbol);
        case 'coinpan':
          return await this.collectFromCoinpan(symbol);
        case 'bitman':
          return await this.collectFromBitman(symbol);
        default:
          return [];
      }
    } catch (error) {
      logger.error(`${source.name} 데이터 수집 오류:`, error);
      return [];
    }
  }

  /**
   * 네이버 카페에서 데이터 수집
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 수집된 데이터
   */
  async collectFromNaverCafe(symbol) {
    try {
      // 실제 구현에서는 네이버 카페 API나 웹 스크래핑을 사용
      // 여기서는 시뮬레이션 데이터 반환
      const mockData = [
        {
          source: '네이버 카페',
          title: `${symbol} 가격 상승 전망`,
          content: `${symbol}이 최근 상승세를 보이고 있어서 투자자들의 관심이 높아지고 있습니다.`,
          timestamp: new Date(),
          weight: this.communitySources.naverCafe.weight
        },
        {
          source: '네이버 카페',
          title: `${symbol} 호재 소식`,
          content: `${symbol}에 대한 긍정적인 뉴스가 나왔습니다.`,
          timestamp: new Date(),
          weight: this.communitySources.naverCafe.weight
        }
      ];

      return mockData;
    } catch (error) {
      logger.error('네이버 카페 데이터 수집 오류:', error);
      return [];
    }
  }

  /**
   * 디시인사이드에서 데이터 수집
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 수집된 데이터
   */
  async collectFromDcInside(symbol) {
    try {
      // 실제 구현에서는 디시인사이드 API나 웹 스크래핑을 사용
      const mockData = [
        {
          source: '디시인사이드',
          title: `${symbol} 갤러리`,
          content: `${symbol} 가격이 오르고 있습니다.`,
          timestamp: new Date(),
          weight: this.communitySources.dcInside.weight
        }
      ];

      return mockData;
    } catch (error) {
      logger.error('디시인사이드 데이터 수집 오류:', error);
      return [];
    }
  }

  /**
   * 코인판에서 데이터 수집
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 수집된 데이터
   */
  async collectFromCoinpan(symbol) {
    try {
      // 실제 구현에서는 코인판 API나 웹 스크래핑을 사용
      const mockData = [
        {
          source: '코인판',
          title: `${symbol} 토론`,
          content: `${symbol}에 대한 다양한 의견이 나오고 있습니다.`,
          timestamp: new Date(),
          weight: this.communitySources.coinpan.weight
        }
      ];

      return mockData;
    } catch (error) {
      logger.error('코인판 데이터 수집 오류:', error);
      return [];
    }
  }

  /**
   * 비트맨에서 데이터 수집
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 수집된 데이터
   */
  async collectFromBitman(symbol) {
    try {
      // 실제 구현에서는 비트맨 API나 웹 스크래핑을 사용
      const mockData = [
        {
          source: '비트맨',
          title: `${symbol} 분석`,
          content: `${symbol}에 대한 전문적인 분석이 나왔습니다.`,
          timestamp: new Date(),
          weight: this.communitySources.bitman.weight
        }
      ];

      return mockData;
    } catch (error) {
      logger.error('비트맨 데이터 수집 오류:', error);
      return [];
    }
  }

  /**
   * 감정분석 수행
   * @param {Array} communityData - 커뮤니티 데이터
   * @param {string} symbol - 코인 심볼
   * @returns {Object} 감정분석 결과
   */
  performSentimentAnalysis(communityData, symbol) {
    let totalScore = 0;
    let totalWeight = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const sentimentBreakdown = {
      positive: 0,
      negative: 0,
      neutral: 0,
      total: 0
    };

    communityData.forEach(item => {
      const text = `${item.title} ${item.content}`;
      const sentiment = this.analyzeTextSentiment(text);
      
      // 가중치 적용
      const weightedScore = sentiment.score * item.weight;
      totalScore += weightedScore;
      totalWeight += item.weight;

      // 감정 분류 카운트
      if (sentiment.sentiment === 'positive') {
        positiveCount++;
        sentimentBreakdown.positive += item.weight;
      } else if (sentiment.sentiment === 'negative') {
        negativeCount++;
        sentimentBreakdown.negative += item.weight;
      } else {
        neutralCount++;
        sentimentBreakdown.neutral += item.weight;
      }

      sentimentBreakdown.total += item.weight;
    });

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    const confidence = Math.min(totalWeight / 10, 1); // 최대 1.0

    let sentiment = 'neutral';
    if (finalScore > 60) sentiment = 'positive';
    else if (finalScore < 40) sentiment = 'negative';

    return {
      symbol,
      score: Math.max(0, Math.min(100, finalScore)),
      sentiment,
      confidence,
      breakdown: sentimentBreakdown,
      communityStats: {
        totalPosts: communityData.length,
        positivePosts: positiveCount,
        negativePosts: negativeCount,
        neutralPosts: neutralCount,
        sources: [...new Set(communityData.map(item => item.source))]
      },
      timestamp: new Date()
    };
  }

  /**
   * 텍스트 감정분석
   * @param {string} text - 분석할 텍스트
   * @returns {Object} 감정분석 결과
   */
  analyzeTextSentiment(text) {
    try {
      if (!text || text.length < 5) {
        return { score: 50, sentiment: 'neutral', confidence: 0 };
      }

      const lowerText = text.toLowerCase();
      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;

      // 긍정 키워드 검사
      this.koreanSentimentKeywords.positive.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        const weight = this.getKeywordWeight(keyword);
        positiveScore += matches * weight;
      });

      // 부정 키워드 검사
      this.koreanSentimentKeywords.negative.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        const weight = this.getKeywordWeight(keyword);
        negativeScore += matches * weight;
      });

      // 중립 키워드 검사
      this.koreanSentimentKeywords.neutral.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        neutralScore += matches;
      });

      const totalScore = positiveScore + negativeScore + neutralScore;
      
      if (totalScore === 0) {
        return { score: 50, sentiment: 'neutral', confidence: 0 };
      }

      // 감정 점수 계산 (0-100)
      const sentimentScore = ((positiveScore - negativeScore) / totalScore + 1) * 50;
      const confidence = Math.min(totalScore / 10, 1); // 최대 1.0

      let sentiment = 'neutral';
      if (sentimentScore > 60) sentiment = 'positive';
      else if (sentimentScore < 40) sentiment = 'negative';

      return {
        score: Math.max(0, Math.min(100, sentimentScore)),
        sentiment,
        confidence,
        breakdown: {
          positive: positiveScore,
          negative: negativeScore,
          neutral: neutralScore,
          total: totalScore
        }
      };
    } catch (error) {
      logger.error('텍스트 감정분석 오류:', error);
      return { score: 50, sentiment: 'neutral', confidence: 0 };
    }
  }

  /**
   * 키워드 가중치 계산
   * @param {string} keyword - 키워드
   * @returns {number} 가중치
   */
  getKeywordWeight(keyword) {
    // 가격 관련 키워드
    if (['상승', '급등', '폭등', '하락', '급락', '폭락', '상한가', '하한가'].includes(keyword)) {
      return this.keywordWeights.price;
    }
    
    // 기술적 분석 키워드
    if (['브레이크아웃', '저항선', '지지선', '골든크로스', '데드크로스', '거래량'].includes(keyword)) {
      return this.keywordWeights.technical;
    }
    
    // 뉴스/이벤트 키워드
    if (['호재', '악재', '상장', '파트너십', '규제', '해킹'].includes(keyword)) {
      return this.keywordWeights.news;
    }
    
    return this.keywordWeights.general;
  }

  /**
   * 다중 코인 한국 커뮤니티 감정분석
   * @param {Array} symbols - 코인 심볼 배열
   * @returns {Object} 다중 감정분석 결과
   */
  async getMultipleKoreanCommunitySentiments(symbols) {
    try {
      logger.info(`${symbols.length}개 코인의 한국 커뮤니티 감정분석 시작`);
      
      const results = {};
      const promises = symbols.map(async (symbol) => {
        try {
          const sentiment = await this.analyzeKoreanCommunitySentiment(symbol);
          results[symbol] = sentiment;
        } catch (error) {
          logger.error(`${symbol} 한국 커뮤니티 감정분석 실패:`, error);
          results[symbol] = this.getDefaultSentiment();
        }
      });

      await Promise.allSettled(promises);
      
      // 전체 통계 계산
      const stats = this.calculateCommunityStats(Object.values(results));
      
      return {
        sentiments: results,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('다중 한국 커뮤니티 감정분석 실패:', error);
      return null;
    }
  }

  /**
   * 커뮤니티 통계 계산
   * @param {Array} sentiments - 감정분석 결과 배열
   * @returns {Object} 통계 정보
   */
  calculateCommunityStats(sentiments) {
    if (sentiments.length === 0) {
      return {
        average: 50,
        positive: 0,
        negative: 0,
        neutral: 0,
        totalCoins: 0
      };
    }

    const scores = sentiments.map(s => s.score);
    const positive = sentiments.filter(s => s.sentiment === 'positive').length;
    const negative = sentiments.filter(s => s.sentiment === 'negative').length;
    const neutral = sentiments.filter(s => s.sentiment === 'neutral').length;

    return {
      average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      median: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
      max: Math.max(...scores),
      min: Math.min(...scores),
      positive,
      negative,
      neutral,
      totalCoins: sentiments.length
    };
  }

  /**
   * 기본 감정분석 결과 반환
   * @returns {Object} 기본 감정분석 결과
   */
  getDefaultSentiment() {
    return {
      score: 50,
      sentiment: 'neutral',
      confidence: 0,
      breakdown: {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0
      },
      communityStats: {
        totalPosts: 0,
        positivePosts: 0,
        negativePosts: 0,
        neutralPosts: 0,
        sources: []
      },
      timestamp: new Date()
    };
  }

  /**
   * 연결 테스트
   * @returns {Object} 연결 상태
   */
  async testConnection() {
    try {
      // 각 커뮤니티 소스의 연결 상태 확인
      const connectionStatus = {};
      
      for (const [sourceKey, source] of Object.entries(this.communitySources)) {
        try {
          // 실제 구현에서는 각 소스의 연결 상태를 확인
          connectionStatus[sourceKey] = source.enabled;
        } catch (error) {
          connectionStatus[sourceKey] = false;
        }
      }

      const overall = Object.values(connectionStatus).some(status => status);

      return {
        ...connectionStatus,
        overall
      };
    } catch (error) {
      logger.error('한국 커뮤니티 서비스 연결 테스트 실패:', error);
      return { overall: false };
    }
  }
}

module.exports = KoreanCommunityService;
