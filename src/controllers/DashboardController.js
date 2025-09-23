const CoinGeckoService = require('../services/CoinGeckoService');
const SignalCalculatorService = require('../services/SignalCalculatorService');
const PersonalizationService = require('../services/PersonalizationService');
const { logger } = require('../utils/logger');

class DashboardController {
  /**
   * 대시보드 데이터 조회
   * GET /api/dashboard
   */
  static async getDashboardData(req, res) {
    try {
      const { userId = 'default' } = req.query;
      
      console.log(`Dashboard data requested for user: ${userId}`);

      // 1. AI 추천 코인 데이터 생성
      const aiRecommendations = await DashboardController.generateAIRecommendations();
      
      // 2. 사용자 프로필 데이터 생성
      const userProfile = await DashboardController.generateUserProfile(userId);
      
      // 3. 시장 현황 데이터 생성
      const marketSummary = await DashboardController.generateMarketSummary();

      const dashboardData = {
        aiRecommendations,
        userProfile,
        marketSummary
      };

      console.log(`Dashboard data generated successfully for user: ${userId}`);

      res.json({
        success: true,
        data: dashboardData,
        message: '대시보드 데이터를 성공적으로 조회했습니다.',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard data generation failed:', error);
      res.status(500).json({
        success: false,
        error: '대시보드 데이터를 생성하는 중 오류가 발생했습니다.',
        message: error?.message || '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * AI 추천 코인 데이터 생성
   */
  static async generateAIRecommendations() {
    try {
      // 상위 코인들 가져오기
      const topCoins = await CoinGeckoService.getTopCoins(10);
      
      const recommendations = topCoins.map(coin => {
        // AI 분석 점수 계산 (임시 로직)
        const technicalScore = Math.random() * 100;
        const sentimentScore = Math.random() * 100;
        const volumeScore = Math.random() * 100;
        
        const overallScore = (technicalScore + sentimentScore + volumeScore) / 3;
        
        // 예상 수익률 계산 (임시 로직)
        const expectedReturn = (Math.random() - 0.3) * 50; // -15% ~ +35%
        
        // 위험도 계산 (1-5)
        const riskLevel = Math.min(5, Math.max(1, Math.floor(5 - (overallScore / 20))));
        
        // 신뢰도 계산
        const confidence = Math.min(100, Math.max(60, overallScore));
        
        // 추천 이유 생성
        const reasons = DashboardController.generateRecommendationReasons(coin, overallScore, expectedReturn);
        
        return {
          coin: {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            currentPrice: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            image: coin.image,
            marketCap: coin.market_cap,
            volume: coin.total_volume
          },
          expectedReturn: Math.round(expectedReturn * 100) / 100,
          riskLevel: riskLevel,
          reasons: reasons,
          confidence: Math.round(confidence),
          timeframe: '1-3일'
        };
      });

      // 신뢰도 순으로 정렬하고 상위 5개만 반환
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      return [];
    }
  }

  /**
   * 추천 이유 생성
   */
  static generateRecommendationReasons(coin, score, expectedReturn) {
    const reasons = [];
    
    if (score > 80) {
      reasons.push('강력한 기술적 분석 신호');
    } else if (score > 60) {
      reasons.push('긍정적인 기술적 분석');
    }
    
    if (expectedReturn > 10) {
      reasons.push('높은 수익 잠재력');
    } else if (expectedReturn > 0) {
      reasons.push('안정적인 수익 기대');
    }
    
    if (coin.price_change_percentage_24h > 5) {
      reasons.push('강한 상승 모멘텀');
    } else if (coin.price_change_percentage_24h < -5) {
      reasons.push('반등 기회');
    }
    
    if (coin.market_cap > 10000000000) { // 100억 달러 이상
      reasons.push('안정적인 시장 지위');
    }
    
    if (reasons.length === 0) {
      reasons.push('AI 분석 기반 추천');
    }
    
    return reasons.slice(0, 4); // 최대 4개 이유
  }

  /**
   * 사용자 프로필 데이터 생성
   */
  static async generateUserProfile(userId) {
    try {
      // 기본 사용자 프로필 (실제로는 DB에서 조회)
      return {
        id: userId,
        investmentStyle: 'moderate',
        riskTolerance: 3,
        experienceLevel: 'intermediate',
        recommendedStrategy: '균형 투자',
        preferences: {
          notifications: true,
          language: 'ko',
          theme: 'light'
        }
      };
    } catch (error) {
      console.error('Failed to generate user profile:', error);
      return {
        id: userId,
        investmentStyle: 'moderate',
        riskTolerance: 3,
        experienceLevel: 'intermediate',
        recommendedStrategy: '균형 투자',
        preferences: {
          notifications: true,
          language: 'ko',
          theme: 'light'
        }
      };
    }
  }

  /**
   * 시장 현황 데이터 생성
   */
  static async generateMarketSummary() {
    try {
      // 글로벌 시장 데이터 가져오기
      const globalData = await CoinGeckoService.getGlobalData();
      
      const totalMarketCap = globalData.data?.total_market_cap?.usd || 0;
      const marketCapChange = globalData.data?.market_cap_change_percentage_24h_usd || 0;
      
      let marketTrend = 'sideways';
      let trendDescription = '시장이 횡보하고 있습니다.';
      
      if (marketCapChange > 2) {
        marketTrend = 'up';
        trendDescription = '시장이 상승세를 보이고 있습니다.';
      } else if (marketCapChange < -2) {
        marketTrend = 'down';
        trendDescription = '시장이 하락세를 보이고 있습니다.';
      }
      
      return {
        totalMarketCap: `$${(totalMarketCap / 1000000000000).toFixed(2)}T`,
        marketTrend: marketTrend,
        trendDescription: trendDescription
      };
      
    } catch (error) {
      console.error('Failed to generate market summary:', error);
      return {
        totalMarketCap: '$2.1T',
        marketTrend: 'sideways',
        trendDescription: '시장 데이터를 불러오는 중입니다.'
      };
    }
  }
}

module.exports = DashboardController;
