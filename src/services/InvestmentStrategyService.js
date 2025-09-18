const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * 개인화된 투자 전략 생성 AI 서비스
 * 사용자 프로필과 시장 상황을 종합하여 맞춤형 투자 전략을 생성하는 AI 시스템
 */
class InvestmentStrategyService {
  constructor() {
    this.isRunning = false;
    this.strategyCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
    
    // AI 모델 설정
    this.modelConfig = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.2
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000
      },
      local: {
        baseUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434',
        model: 'llama2',
        maxTokens: 2000,
        temperature: 0.2
      }
    };

    // 투자 전략 템플릿
    this.strategyTemplates = {
      conservative: {
        name: '보수적 투자 전략',
        riskTolerance: 0.2,
        timeHorizon: 'long',
        allocation: {
          stablecoins: 0.4,
          bluechip: 0.3,
          defi: 0.2,
          altcoins: 0.1
        },
        maxPositionSize: 0.1,
        stopLoss: 0.05,
        takeProfit: 0.15
      },
      moderate: {
        name: '균형 투자 전략',
        riskTolerance: 0.5,
        timeHorizon: 'medium',
        allocation: {
          stablecoins: 0.2,
          bluechip: 0.4,
          defi: 0.25,
          altcoins: 0.15
        },
        maxPositionSize: 0.15,
        stopLoss: 0.08,
        takeProfit: 0.25
      },
      aggressive: {
        name: '공격적 투자 전략',
        riskTolerance: 0.8,
        timeHorizon: 'short',
        allocation: {
          stablecoins: 0.1,
          bluechip: 0.3,
          defi: 0.3,
          altcoins: 0.3
        },
        maxPositionSize: 0.25,
        stopLoss: 0.12,
        takeProfit: 0.4
      },
      scalping: {
        name: '스캘핑 전략',
        riskTolerance: 0.9,
        timeHorizon: 'very_short',
        allocation: {
          stablecoins: 0.05,
          bluechip: 0.2,
          defi: 0.25,
          altcoins: 0.5
        },
        maxPositionSize: 0.3,
        stopLoss: 0.02,
        takeProfit: 0.05
      },
      swing: {
        name: '스윙 트레이딩 전략',
        riskTolerance: 0.7,
        timeHorizon: 'short',
        allocation: {
          stablecoins: 0.15,
          bluechip: 0.35,
          defi: 0.3,
          altcoins: 0.2
        },
        maxPositionSize: 0.2,
        stopLoss: 0.1,
        takeProfit: 0.3
      }
    };

    // 시장 상황별 가중치
    this.marketConditionWeights = {
      bull: {
        riskMultiplier: 1.2,
        positionSizeMultiplier: 1.1,
        altcoinWeight: 1.3
      },
      bear: {
        riskMultiplier: 0.7,
        positionSizeMultiplier: 0.8,
        altcoinWeight: 0.6
      },
      sideways: {
        riskMultiplier: 0.9,
        positionSizeMultiplier: 0.9,
        altcoinWeight: 0.8
      },
      volatile: {
        riskMultiplier: 0.8,
        positionSizeMultiplier: 0.7,
        altcoinWeight: 0.9
      }
    };

    // 사용자 프로필 기반 조정 팩터
    this.profileAdjustments = {
      experience: {
        beginner: { riskReduction: 0.2, positionSizeReduction: 0.3 },
        intermediate: { riskReduction: 0.1, positionSizeReduction: 0.1 },
        advanced: { riskReduction: 0, positionSizeReduction: 0 },
        expert: { riskIncrease: 0.1, positionSizeIncrease: 0.1 }
      },
      timeAvailable: {
        low: { strategyType: 'passive', rebalanceFrequency: 'weekly' },
        medium: { strategyType: 'semi_active', rebalanceFrequency: 'daily' },
        high: { strategyType: 'active', rebalanceFrequency: 'hourly' }
      },
      investmentStyle: {
        hodler: { timeHorizon: 'very_long', rebalanceFrequency: 'monthly' },
        trader: { timeHorizon: 'short', rebalanceFrequency: 'hourly' },
        balanced: { timeHorizon: 'medium', rebalanceFrequency: 'daily' }
      }
    };
  }

  /**
   * 투자 전략 생성 서비스 시작
   */
  async startService() {
    if (this.isRunning) {
      logger.warn('투자 전략 생성 서비스가 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('개인화된 투자 전략 생성 AI 서비스를 시작합니다.');

      // 초기 모델 검증
      await this.validateModels();

      logger.info('개인화된 투자 전략 생성 AI 서비스가 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('투자 전략 생성 서비스 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 투자 전략 생성 서비스 중지
   */
  stopService() {
    if (!this.isRunning) {
      logger.warn('투자 전략 생성 서비스가 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;
    logger.info('개인화된 투자 전략 생성 AI 서비스가 중지되었습니다.');
  }

  /**
   * 개인화된 투자 전략 생성
   * @param {Object} userProfile - 사용자 프로필
   * @param {Object} marketData - 시장 데이터
   * @param {Object} portfolioData - 포트폴리오 데이터
   * @param {Object} preferences - 사용자 선호도
   * @returns {Object} 개인화된 투자 전략
   */
  async generatePersonalizedStrategy(userProfile, marketData = {}, portfolioData = {}, preferences = {}) {
    try {
      // 캐시 확인
      const cacheKey = this.generateCacheKey(userProfile, marketData, preferences);
      const cached = this.strategyCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info('캐시된 투자 전략 반환');
        return cached.data;
      }

      // 기본 전략 템플릿 선택
      const baseStrategy = this.selectBaseStrategy(userProfile);
      
      // 시장 상황 분석
      const marketAnalysis = this.analyzeMarketConditions(marketData);
      
      // 사용자 프로필 기반 조정
      const profileAdjustments = this.calculateProfileAdjustments(userProfile);
      
      // 포트폴리오 분석
      const portfolioAnalysis = this.analyzePortfolio(portfolioData);
      
      // AI 기반 전략 최적화
      const aiOptimizedStrategy = await this.optimizeStrategyWithAI(
        baseStrategy,
        userProfile,
        marketAnalysis,
        profileAdjustments,
        portfolioAnalysis,
        preferences
      );

      // 최종 전략 통합
      const finalStrategy = this.integrateStrategy(
        baseStrategy,
        aiOptimizedStrategy,
        marketAnalysis,
        profileAdjustments,
        portfolioAnalysis
      );

      // 캐시 저장
      this.strategyCache.set(cacheKey, {
        data: finalStrategy,
        timestamp: Date.now()
      });

      logger.info('개인화된 투자 전략 생성 완료');
      return finalStrategy;

    } catch (error) {
      logger.error('투자 전략 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 기본 전략 템플릿 선택
   * @private
   */
  selectBaseStrategy(userProfile) {
    const { investmentStyle, riskTolerance, experienceLevel } = userProfile;
    
    // 투자 스타일 기반 선택
    if (investmentStyle === 'hodler') {
      return this.strategyTemplates.conservative;
    } else if (investmentStyle === 'trader') {
      return this.strategyTemplates.aggressive;
    } else if (investmentStyle === 'balanced') {
      return this.strategyTemplates.moderate;
    }
    
    // 리스크 허용도 기반 선택
    if (riskTolerance <= 0.3) {
      return this.strategyTemplates.conservative;
    } else if (riskTolerance <= 0.7) {
      return this.strategyTemplates.moderate;
    } else {
      return this.strategyTemplates.aggressive;
    }
  }

  /**
   * 시장 상황 분석
   * @private
   */
  analyzeMarketConditions(marketData) {
    const analysis = {
      condition: 'sideways',
      volatility: 0.5,
      trend: 'neutral',
      sentiment: 'neutral',
      riskLevel: 'medium',
      opportunities: [],
      risks: []
    };

    if (!marketData || Object.keys(marketData).length === 0) {
      return analysis;
    }

    // 시장 상황 판단
    if (marketData.volatility > 0.7) {
      analysis.condition = 'volatile';
      analysis.riskLevel = 'high';
      analysis.risks.push('높은 변동성');
    } else if (marketData.trend === 'bullish' && marketData.sentiment > 0.6) {
      analysis.condition = 'bull';
      analysis.riskLevel = 'medium';
      analysis.opportunities.push('상승 추세');
    } else if (marketData.trend === 'bearish' && marketData.sentiment < 0.4) {
      analysis.condition = 'bear';
      analysis.riskLevel = 'high';
      analysis.risks.push('하락 추세');
    }

    // 변동성 분석
    analysis.volatility = marketData.volatility || 0.5;
    
    // 트렌드 분석
    analysis.trend = marketData.trend || 'neutral';
    
    // 감정 분석
    analysis.sentiment = marketData.sentiment || 0.5;

    return analysis;
  }

  /**
   * 사용자 프로필 기반 조정 계산
   * @private
   */
  calculateProfileAdjustments(userProfile) {
    const adjustments = {
      riskMultiplier: 1.0,
      positionSizeMultiplier: 1.0,
      timeHorizonAdjustment: 1.0,
      rebalanceFrequency: 'daily',
      strategyType: 'balanced'
    };

    // 경험 수준 기반 조정
    const experienceAdjustment = this.profileAdjustments.experience[userProfile.experienceLevel] || {};
    if (experienceAdjustment.riskReduction) {
      adjustments.riskMultiplier -= experienceAdjustment.riskReduction;
    }
    if (experienceAdjustment.riskIncrease) {
      adjustments.riskMultiplier += experienceAdjustment.riskIncrease;
    }
    if (experienceAdjustment.positionSizeReduction) {
      adjustments.positionSizeMultiplier -= experienceAdjustment.positionSizeReduction;
    }
    if (experienceAdjustment.positionSizeIncrease) {
      adjustments.positionSizeMultiplier += experienceAdjustment.positionSizeIncrease;
    }

    // 가용 시간 기반 조정
    const timeAdjustment = this.profileAdjustments.timeAvailable[userProfile.availableTime] || {};
    if (timeAdjustment.strategyType) {
      adjustments.strategyType = timeAdjustment.strategyType;
    }
    if (timeAdjustment.rebalanceFrequency) {
      adjustments.rebalanceFrequency = timeAdjustment.rebalanceFrequency;
    }

    // 투자 스타일 기반 조정
    const styleAdjustment = this.profileAdjustments.investmentStyle[userProfile.investmentStyle] || {};
    if (styleAdjustment.timeHorizon) {
      adjustments.timeHorizonAdjustment = this.getTimeHorizonMultiplier(styleAdjustment.timeHorizon);
    }
    if (styleAdjustment.rebalanceFrequency) {
      adjustments.rebalanceFrequency = styleAdjustment.rebalanceFrequency;
    }

    return adjustments;
  }

  /**
   * 포트폴리오 분석
   * @private
   */
  analyzePortfolio(portfolioData) {
    const analysis = {
      totalValue: 0,
      diversification: 0,
      riskLevel: 'medium',
      performance: 'neutral',
      rebalanceNeeded: false,
      recommendations: []
    };

    if (!portfolioData || !portfolioData.holdings) {
      return analysis;
    }

    const holdings = portfolioData.holdings;
    analysis.totalValue = portfolioData.totalValue || 0;

    // 다각화 분석
    const assetTypes = new Set(holdings.map(h => h.type));
    analysis.diversification = assetTypes.size / 4; // 최대 4개 자산 유형

    // 리스크 레벨 분석
    const highRiskAssets = holdings.filter(h => h.riskLevel === 'high').length;
    const riskRatio = highRiskAssets / holdings.length;
    
    if (riskRatio > 0.5) {
      analysis.riskLevel = 'high';
    } else if (riskRatio < 0.2) {
      analysis.riskLevel = 'low';
    }

    // 성과 분석
    const totalReturn = holdings.reduce((sum, h) => sum + (h.return || 0), 0);
    if (totalReturn > 0.1) {
      analysis.performance = 'good';
    } else if (totalReturn < -0.1) {
      analysis.performance = 'poor';
    }

    // 리밸런싱 필요성 분석
    const targetAllocation = this.calculateTargetAllocation(holdings);
    const currentAllocation = this.calculateCurrentAllocation(holdings);
    const deviation = this.calculateAllocationDeviation(targetAllocation, currentAllocation);
    
    if (deviation > 0.1) {
      analysis.rebalanceNeeded = true;
      analysis.recommendations.push('포트폴리오 리밸런싱 필요');
    }

    return analysis;
  }

  /**
   * AI 기반 전략 최적화
   * @private
   */
  async optimizeStrategyWithAI(baseStrategy, userProfile, marketAnalysis, profileAdjustments, portfolioAnalysis, preferences) {
    try {
      // AI 프롬프트 생성
      const prompt = this.generateStrategyPrompt(
        baseStrategy,
        userProfile,
        marketAnalysis,
        profileAdjustments,
        portfolioAnalysis,
        preferences
      );
      
      // AI 모델 호출
      const aiResponse = await this.callAIModel(prompt);
      
      // 응답 파싱
      return this.parseStrategyResponse(aiResponse);

    } catch (error) {
      logger.error('AI 전략 최적화 실패:', error);
      // AI 실패 시 기본 전략 반환
      return {
        adjustments: {},
        reasoning: 'AI 모델 호출 실패로 기본 전략 사용',
        confidence: 0.5,
        recommendations: []
      };
    }
  }

  /**
   * AI 프롬프트 생성
   * @private
   */
  generateStrategyPrompt(baseStrategy, userProfile, marketAnalysis, profileAdjustments, portfolioAnalysis, preferences) {
    return `
당신은 암호화폐 투자 전략 전문가입니다. 다음 정보를 바탕으로 개인화된 투자 전략을 생성해주세요.

사용자 프로필:
- 투자 스타일: ${userProfile.investmentStyle}
- 경험 수준: ${userProfile.experienceLevel}
- 리스크 허용도: ${userProfile.riskTolerance}
- 가용 시간: ${userProfile.availableTime}
- 투자 목표: ${userProfile.investmentGoals || '수익 극대화'}

시장 상황:
- 시장 조건: ${marketAnalysis.condition}
- 변동성: ${marketAnalysis.volatility}
- 트렌드: ${marketAnalysis.trend}
- 감정: ${marketAnalysis.sentiment}
- 리스크 레벨: ${marketAnalysis.riskLevel}

기본 전략:
- 전략명: ${baseStrategy.name}
- 리스크 허용도: ${baseStrategy.riskTolerance}
- 시간 지평: ${baseStrategy.timeHorizon}
- 자산 배분: ${JSON.stringify(baseStrategy.allocation)}
- 최대 포지션 크기: ${baseStrategy.maxPositionSize}
- 손절매: ${baseStrategy.stopLoss}
- 익절매: ${baseStrategy.takeProfit}

포트폴리오 분석:
- 총 가치: ${portfolioAnalysis.totalValue}
- 다각화: ${portfolioAnalysis.diversification}
- 리스크 레벨: ${portfolioAnalysis.riskLevel}
- 성과: ${portfolioAnalysis.performance}
- 리밸런싱 필요: ${portfolioAnalysis.rebalanceNeeded}

다음 형식으로 응답해주세요:
{
  "strategyName": "개인화된 전략명",
  "allocation": {
    "stablecoins": 0.2,
    "bluechip": 0.4,
    "defi": 0.25,
    "altcoins": 0.15
  },
  "riskManagement": {
    "maxPositionSize": 0.15,
    "stopLoss": 0.08,
    "takeProfit": 0.25,
    "maxDrawdown": 0.1
  },
  "tradingRules": {
    "entryConditions": ["조건1", "조건2"],
    "exitConditions": ["조건1", "조건2"],
    "rebalanceFrequency": "daily"
  },
  "reasoning": "전략 선택 근거",
  "confidence": 0.8,
  "recommendations": ["추천1", "추천2"],
  "warnings": ["주의사항1", "주의사항2"]
}
`;
  }

  /**
   * AI 모델 호출
   * @private
   */
  async callAIModel(prompt) {
    // OpenAI API 호출 시도
    if (this.modelConfig.openai.apiKey) {
      try {
        return await this.callOpenAI(prompt);
      } catch (error) {
        logger.warn('OpenAI API 호출 실패:', error);
      }
    }

    // Anthropic API 호출 시도
    if (this.modelConfig.anthropic.apiKey) {
      try {
        return await this.callAnthropic(prompt);
      } catch (error) {
        logger.warn('Anthropic API 호출 실패:', error);
      }
    }

    // 로컬 AI 모델 호출 시도
    try {
      return await this.callLocalAI(prompt);
    } catch (error) {
      logger.warn('로컬 AI 모델 호출 실패:', error);
      throw new Error('모든 AI 모델 호출 실패');
    }
  }

  /**
   * OpenAI API 호출
   * @private
   */
  async callOpenAI(prompt) {
    const response = await axios.post(
      `${this.modelConfig.openai.baseUrl}/chat/completions`,
      {
        model: this.modelConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: '당신은 암호화폐 투자 전략 전문가입니다. 정확하고 신중한 투자 전략을 제공해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.modelConfig.openai.maxTokens,
        temperature: this.modelConfig.openai.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${this.modelConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Anthropic API 호출
   * @private
   */
  async callAnthropic(prompt) {
    const response = await axios.post(
      `${this.modelConfig.anthropic.baseUrl}/messages`,
      {
        model: this.modelConfig.anthropic.model,
        max_tokens: this.modelConfig.anthropic.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.modelConfig.anthropic.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * 로컬 AI 모델 호출
   * @private
   */
  async callLocalAI(prompt) {
    const response = await axios.post(
      `${this.modelConfig.local.baseUrl}/api/generate`,
      {
        model: this.modelConfig.local.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: this.modelConfig.local.temperature,
          max_tokens: this.modelConfig.local.maxTokens
        }
      }
    );

    return response.data.response;
  }

  /**
   * AI 응답 파싱
   * @private
   */
  parseStrategyResponse(response) {
    try {
      // JSON 응답 파싱 시도
      const parsed = JSON.parse(response);
      return {
        strategyName: parsed.strategyName || 'AI 최적화 전략',
        allocation: parsed.allocation || {},
        riskManagement: parsed.riskManagement || {},
        tradingRules: parsed.tradingRules || {},
        reasoning: parsed.reasoning || 'AI 분석 완료',
        confidence: parsed.confidence || 0.5,
        recommendations: parsed.recommendations || [],
        warnings: parsed.warnings || []
      };
    } catch (error) {
      // JSON 파싱 실패 시 텍스트에서 정보 추출
      return this.extractStrategyFromText(response);
    }
  }

  /**
   * 텍스트에서 전략 정보 추출
   * @private
   */
  extractStrategyFromText(text) {
    return {
      strategyName: 'AI 최적화 전략',
      allocation: {
        stablecoins: 0.2,
        bluechip: 0.4,
        defi: 0.25,
        altcoins: 0.15
      },
      riskManagement: {
        maxPositionSize: 0.15,
        stopLoss: 0.08,
        takeProfit: 0.25,
        maxDrawdown: 0.1
      },
      tradingRules: {
        entryConditions: ['기술적 분석 신호'],
        exitConditions: ['손절매/익절매 조건'],
        rebalanceFrequency: 'daily'
      },
      reasoning: text.substring(0, 300) + '...',
      confidence: 0.5,
      recommendations: [],
      warnings: []
    };
  }

  /**
   * 전략 통합
   * @private
   */
  integrateStrategy(baseStrategy, aiStrategy, marketAnalysis, profileAdjustments, portfolioAnalysis) {
    // 시장 상황별 가중치 적용
    const marketWeights = this.marketConditionWeights[marketAnalysis.condition] || {};
    
    // 최종 전략 생성
    const finalStrategy = {
      id: this.generateStrategyId(),
      name: aiStrategy.strategyName || baseStrategy.name,
      type: 'personalized',
      baseStrategy: baseStrategy.name,
      
      // 자산 배분
      allocation: this.adjustAllocation(
        aiStrategy.allocation || baseStrategy.allocation,
        marketWeights,
        profileAdjustments
      ),
      
      // 리스크 관리
      riskManagement: {
        maxPositionSize: this.adjustValue(
          aiStrategy.riskManagement?.maxPositionSize || baseStrategy.maxPositionSize,
          profileAdjustments.positionSizeMultiplier,
          marketWeights.positionSizeMultiplier
        ),
        stopLoss: this.adjustValue(
          aiStrategy.riskManagement?.stopLoss || baseStrategy.stopLoss,
          profileAdjustments.riskMultiplier,
          marketWeights.riskMultiplier
        ),
        takeProfit: this.adjustValue(
          aiStrategy.riskManagement?.takeProfit || baseStrategy.takeProfit,
          profileAdjustments.riskMultiplier,
          marketWeights.riskMultiplier
        ),
        maxDrawdown: aiStrategy.riskManagement?.maxDrawdown || 0.1
      },
      
      // 거래 규칙
      tradingRules: {
        entryConditions: aiStrategy.tradingRules?.entryConditions || ['기본 진입 조건'],
        exitConditions: aiStrategy.tradingRules?.exitConditions || ['기본 청산 조건'],
        rebalanceFrequency: aiStrategy.tradingRules?.rebalanceFrequency || profileAdjustments.rebalanceFrequency
      },
      
      // 메타데이터
      metadata: {
        confidence: aiStrategy.confidence || 0.5,
        reasoning: aiStrategy.reasoning || '전략 생성 완료',
        recommendations: aiStrategy.recommendations || [],
        warnings: aiStrategy.warnings || [],
        marketCondition: marketAnalysis.condition,
        riskLevel: this.calculateOverallRiskLevel(marketAnalysis, profileAdjustments),
        timeHorizon: this.calculateTimeHorizon(baseStrategy, profileAdjustments),
        targetReturn: this.calculateTargetReturn(baseStrategy, marketAnalysis),
        maxVolatility: this.calculateMaxVolatility(baseStrategy, marketAnalysis)
      },
      
      // 생성 정보
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후 만료
      version: '1.0.0'
    };

    return finalStrategy;
  }

  /**
   * 자산 배분 조정
   * @private
   */
  adjustAllocation(allocation, marketWeights, profileAdjustments) {
    const adjusted = { ...allocation };
    
    // 시장 상황에 따른 조정
    if (marketWeights.altcoinWeight) {
      adjusted.altcoins = Math.min(0.5, adjusted.altcoins * marketWeights.altcoinWeight);
    }
    
    // 정규화 (합이 1이 되도록)
    const total = Object.values(adjusted).reduce((sum, val) => sum + val, 0);
    Object.keys(adjusted).forEach(key => {
      adjusted[key] = adjusted[key] / total;
    });
    
    return adjusted;
  }

  /**
   * 값 조정
   * @private
   */
  adjustValue(value, profileMultiplier, marketMultiplier) {
    return Math.min(1, Math.max(0, value * profileMultiplier * (marketMultiplier || 1)));
  }

  /**
   * 전체 리스크 레벨 계산
   * @private
   */
  calculateOverallRiskLevel(marketAnalysis, profileAdjustments) {
    const baseRisk = marketAnalysis.riskLevel === 'high' ? 0.8 : 
                    marketAnalysis.riskLevel === 'low' ? 0.3 : 0.5;
    
    return Math.min(1, Math.max(0, baseRisk * profileAdjustments.riskMultiplier));
  }

  /**
   * 시간 지평 계산
   * @private
   */
  calculateTimeHorizon(baseStrategy, profileAdjustments) {
    const baseHorizon = baseStrategy.timeHorizon;
    const adjustment = profileAdjustments.timeHorizonAdjustment;
    
    if (baseHorizon === 'very_short') return 'very_short';
    if (baseHorizon === 'short') return adjustment > 1.5 ? 'medium' : 'short';
    if (baseHorizon === 'medium') return adjustment > 1.5 ? 'long' : adjustment < 0.5 ? 'short' : 'medium';
    if (baseHorizon === 'long') return adjustment < 0.5 ? 'medium' : 'long';
    return 'medium';
  }

  /**
   * 목표 수익률 계산
   * @private
   */
  calculateTargetReturn(baseStrategy, marketAnalysis) {
    const baseReturn = baseStrategy.riskTolerance * 0.3; // 리스크 허용도 기반
    const marketMultiplier = marketAnalysis.condition === 'bull' ? 1.2 : 
                            marketAnalysis.condition === 'bear' ? 0.8 : 1.0;
    
    return baseReturn * marketMultiplier;
  }

  /**
   * 최대 변동성 계산
   * @private
   */
  calculateMaxVolatility(baseStrategy, marketAnalysis) {
    const baseVolatility = baseStrategy.riskTolerance * 0.5;
    const marketVolatility = marketAnalysis.volatility;
    
    return Math.max(baseVolatility, marketVolatility * 0.8);
  }

  /**
   * 전략 ID 생성
   * @private
   */
  generateStrategyId() {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 캐시 키 생성
   * @private
   */
  generateCacheKey(userProfile, marketData, preferences) {
    const key = JSON.stringify({
      profile: userProfile.investmentStyle + userProfile.experienceLevel + userProfile.riskTolerance,
      market: marketData.condition || 'sideways',
      preferences: preferences.strategyType || 'balanced',
      timestamp: Math.floor(Date.now() / (10 * 60 * 1000)) // 10분 단위로 캐시
    });
    return Buffer.from(key).toString('base64');
  }

  /**
   * 모델 검증
   * @private
   */
  async validateModels() {
    const testPrompt = 'Test prompt for model validation';
    
    try {
      await this.callAIModel(testPrompt);
      logger.info('AI 모델 검증 완료');
    } catch (error) {
      logger.warn('AI 모델 검증 실패:', error);
    }
  }

  /**
   * 시간 지평 배수 계산
   * @private
   */
  getTimeHorizonMultiplier(timeHorizon) {
    const multipliers = {
      very_short: 0.5,
      short: 0.8,
      medium: 1.0,
      long: 1.5,
      very_long: 2.0
    };
    return multipliers[timeHorizon] || 1.0;
  }

  /**
   * 목표 배분 계산
   * @private
   */
  calculateTargetAllocation(holdings) {
    // 기본 목표 배분 (균등 배분)
    return {
      stablecoins: 0.2,
      bluechip: 0.4,
      defi: 0.25,
      altcoins: 0.15
    };
  }

  /**
   * 현재 배분 계산
   * @private
   */
  calculateCurrentAllocation(holdings) {
    const total = holdings.reduce((sum, h) => sum + h.value, 0);
    const allocation = { stablecoins: 0, bluechip: 0, defi: 0, altcoins: 0 };
    
    holdings.forEach(holding => {
      const ratio = holding.value / total;
      allocation[holding.type] = (allocation[holding.type] || 0) + ratio;
    });
    
    return allocation;
  }

  /**
   * 배분 편차 계산
   * @private
   */
  calculateAllocationDeviation(target, current) {
    let totalDeviation = 0;
    Object.keys(target).forEach(key => {
      totalDeviation += Math.abs((target[key] || 0) - (current[key] || 0));
    });
    return totalDeviation / Object.keys(target).length;
  }

  /**
   * 캐시 클리어
   */
  clearCache() {
    this.strategyCache.clear();
    logger.info('투자 전략 캐시가 클리어되었습니다.');
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.strategyCache.size,
      entries: Array.from(this.strategyCache.keys())
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cacheSize: this.strategyCache.size,
      modelConfig: Object.keys(this.modelConfig).filter(key => 
        this.modelConfig[key].apiKey || this.modelConfig[key].baseUrl
      ),
      strategyTemplates: Object.keys(this.strategyTemplates)
    };
  }

  /**
   * 전략 템플릿 조회
   */
  getStrategyTemplates() {
    return this.strategyTemplates;
  }

  /**
   * 특정 전략 템플릿 조회
   */
  getStrategyTemplate(templateName) {
    return this.strategyTemplates[templateName] || null;
  }
}

module.exports = new InvestmentStrategyService();
