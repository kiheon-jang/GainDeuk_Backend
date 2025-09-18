const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * AI 신호 지속성 예측 서비스
 * 현재 신호가 얼마나 지속될지 예측하는 AI 모델을 통한 신호 분석 및 예측
 */
class SignalPersistenceService {
  constructor() {
    this.isRunning = false;
    this.predictionCache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2분 캐시
    
    // AI 모델 설정
    this.modelConfig = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 1000
      },
      local: {
        baseUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434',
        model: 'llama2',
        maxTokens: 1000,
        temperature: 0.3
      }
    };

    // 신호 지속성 예측을 위한 가중치
    this.predictionWeights = {
      technical: {
        rsi: 0.15,
        macd: 0.20,
        bollinger: 0.15,
        volume: 0.25,
        support_resistance: 0.25
      },
      fundamental: {
        news_sentiment: 0.30,
        social_sentiment: 0.25,
        whale_activity: 0.20,
        defi_activity: 0.15,
        market_cap: 0.10
      },
      market: {
        volatility: 0.20,
        trend_strength: 0.25,
        correlation: 0.15,
        liquidity: 0.20,
        time_of_day: 0.20
      }
    };

    // 신호 강도 임계값
    this.signalThresholds = {
      weak: 0.3,
      moderate: 0.6,
      strong: 0.8,
      very_strong: 0.9
    };

    // 지속성 예측 모델 파라미터
    this.persistenceModel = {
      shortTerm: { // 1-4시간
        factors: ['technical', 'volume', 'volatility'],
        weight: 0.4
      },
      mediumTerm: { // 4-24시간
        factors: ['technical', 'fundamental', 'market'],
        weight: 0.35
      },
      longTerm: { // 1-7일
        factors: ['fundamental', 'market', 'correlation'],
        weight: 0.25
      }
    };
  }

  /**
   * 신호 지속성 예측 시작
   */
  async startPrediction() {
    if (this.isRunning) {
      logger.warn('신호 지속성 예측이 이미 실행 중입니다.');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('AI 신호 지속성 예측을 시작합니다.');

      // 초기 모델 검증
      await this.validateModels();

      logger.info('AI 신호 지속성 예측이 성공적으로 시작되었습니다.');

    } catch (error) {
      this.isRunning = false;
      logger.error('AI 신호 지속성 예측 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 신호 지속성 예측 중지
   */
  stopPrediction() {
    if (!this.isRunning) {
      logger.warn('신호 지속성 예측이 실행 중이 아닙니다.');
      return;
    }

    this.isRunning = false;
    logger.info('AI 신호 지속성 예측이 중지되었습니다.');
  }

  /**
   * 신호 지속성 예측
   * @param {Object} signalData - 신호 데이터
   * @param {Object} marketData - 시장 데이터
   * @param {Object} contextData - 컨텍스트 데이터
   * @returns {Object} 지속성 예측 결과
   */
  async predictSignalPersistence(signalData, marketData = {}, contextData = {}) {
    try {
      // 캐시 확인
      const cacheKey = this.generateCacheKey(signalData, marketData);
      const cached = this.predictionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info('캐시된 신호 지속성 예측 반환');
        return cached.data;
      }

      // 신호 강도 계산
      const signalStrength = this.calculateSignalStrength(signalData, marketData);
      
      // 지속성 예측 계산
      const persistencePrediction = await this.calculatePersistencePrediction(
        signalData, 
        marketData, 
        contextData, 
        signalStrength
      );

      // AI 모델을 통한 예측 보정
      const aiPrediction = await this.getAIPrediction(
        signalData, 
        marketData, 
        contextData, 
        persistencePrediction
      );

      // 최종 예측 결과 통합
      const finalPrediction = this.integratePredictions(
        persistencePrediction, 
        aiPrediction, 
        signalStrength
      );

      // 캐시 저장
      this.predictionCache.set(cacheKey, {
        data: finalPrediction,
        timestamp: Date.now()
      });

      logger.info('신호 지속성 예측 완료');
      return finalPrediction;

    } catch (error) {
      logger.error('신호 지속성 예측 실패:', error);
      throw error;
    }
  }

  /**
   * 신호 강도 계산
   * @private
   */
  calculateSignalStrength(signalData, marketData) {
    const strength = {
      technical: 0,
      fundamental: 0,
      market: 0,
      overall: 0
    };

    // 기술적 분석 강도
    if (signalData.technical) {
      const tech = signalData.technical;
      strength.technical = (
        (tech.rsi || 0) * this.predictionWeights.technical.rsi +
        (tech.macd || 0) * this.predictionWeights.technical.macd +
        (tech.bollinger || 0) * this.predictionWeights.technical.bollinger +
        (tech.volume || 0) * this.predictionWeights.technical.volume +
        (tech.support_resistance || 0) * this.predictionWeights.technical.support_resistance
      );
    }

    // 펀더멘털 분석 강도
    if (signalData.fundamental) {
      const fund = signalData.fundamental;
      strength.fundamental = (
        (fund.news_sentiment || 0) * this.predictionWeights.fundamental.news_sentiment +
        (fund.social_sentiment || 0) * this.predictionWeights.fundamental.social_sentiment +
        (fund.whale_activity || 0) * this.predictionWeights.fundamental.whale_activity +
        (fund.defi_activity || 0) * this.predictionWeights.fundamental.defi_activity +
        (fund.market_cap || 0) * this.predictionWeights.fundamental.market_cap
      );
    }

    // 시장 분석 강도
    if (marketData) {
      strength.market = (
        (marketData.volatility || 0) * this.predictionWeights.market.volatility +
        (marketData.trend_strength || 0) * this.predictionWeights.market.trend_strength +
        (marketData.correlation || 0) * this.predictionWeights.market.correlation +
        (marketData.liquidity || 0) * this.predictionWeights.market.liquidity +
        (marketData.time_of_day || 0) * this.predictionWeights.market.time_of_day
      );
    }

    // 전체 강도 계산
    strength.overall = (
      strength.technical * 0.4 +
      strength.fundamental * 0.35 +
      strength.market * 0.25
    );

    return strength;
  }

  /**
   * 지속성 예측 계산
   * @private
   */
  async calculatePersistencePrediction(signalData, marketData, contextData, signalStrength) {
    const prediction = {
      shortTerm: { // 1-4시간
        probability: 0,
        confidence: 0,
        factors: []
      },
      mediumTerm: { // 4-24시간
        probability: 0,
        confidence: 0,
        factors: []
      },
      longTerm: { // 1-7일
        probability: 0,
        confidence: 0,
        factors: []
      }
    };

    // 단기 예측 (1-4시간)
    prediction.shortTerm = this.calculateTimeframePrediction(
      signalData, 
      marketData, 
      contextData, 
      signalStrength, 
      'shortTerm'
    );

    // 중기 예측 (4-24시간)
    prediction.mediumTerm = this.calculateTimeframePrediction(
      signalData, 
      marketData, 
      contextData, 
      signalStrength, 
      'mediumTerm'
    );

    // 장기 예측 (1-7일)
    prediction.longTerm = this.calculateTimeframePrediction(
      signalData, 
      marketData, 
      contextData, 
      signalStrength, 
      'longTerm'
    );

    return prediction;
  }

  /**
   * 특정 시간대 예측 계산
   * @private
   */
  calculateTimeframePrediction(signalData, marketData, contextData, signalStrength, timeframe) {
    const model = this.persistenceModel[timeframe];
    let probability = 0;
    let confidence = 0;
    const factors = [];

    // 기술적 분석 요소
    if (model.factors.includes('technical') && signalData.technical) {
      const techScore = this.analyzeTechnicalFactors(signalData.technical, timeframe);
      probability += techScore * 0.4;
      confidence += 0.3;
      factors.push({
        type: 'technical',
        score: techScore,
        weight: 0.4
      });
    }

    // 펀더멘털 분석 요소
    if (model.factors.includes('fundamental') && signalData.fundamental) {
      const fundScore = this.analyzeFundamentalFactors(signalData.fundamental, timeframe);
      probability += fundScore * 0.35;
      confidence += 0.3;
      factors.push({
        type: 'fundamental',
        score: fundScore,
        weight: 0.35
      });
    }

    // 시장 분석 요소
    if (model.factors.includes('market') && marketData) {
      const marketScore = this.analyzeMarketFactors(marketData, timeframe);
      probability += marketScore * 0.25;
      confidence += 0.2;
      factors.push({
        type: 'market',
        score: marketScore,
        weight: 0.25
      });
    }

    // 볼륨 분석
    if (model.factors.includes('volume') && signalData.technical?.volume) {
      const volumeScore = this.analyzeVolumeFactor(signalData.technical.volume, timeframe);
      probability += volumeScore * 0.2;
      confidence += 0.1;
      factors.push({
        type: 'volume',
        score: volumeScore,
        weight: 0.2
      });
    }

    // 변동성 분석
    if (model.factors.includes('volatility') && marketData.volatility) {
      const volatilityScore = this.analyzeVolatilityFactor(marketData.volatility, timeframe);
      probability += volatilityScore * 0.15;
      confidence += 0.1;
      factors.push({
        type: 'volatility',
        score: volatilityScore,
        weight: 0.15
      });
    }

    // 상관관계 분석
    if (model.factors.includes('correlation') && marketData.correlation) {
      const correlationScore = this.analyzeCorrelationFactor(marketData.correlation, timeframe);
      probability += correlationScore * 0.1;
      confidence += 0.1;
      factors.push({
        type: 'correlation',
        score: correlationScore,
        weight: 0.1
      });
    }

    return {
      probability: Math.min(1, Math.max(0, probability)),
      confidence: Math.min(1, Math.max(0, confidence)),
      factors
    };
  }

  /**
   * 기술적 분석 요소 분석
   * @private
   */
  analyzeTechnicalFactors(technicalData, timeframe) {
    let score = 0;
    let count = 0;

    // RSI 분석
    if (technicalData.rsi !== undefined) {
      const rsiScore = this.analyzeRSI(technicalData.rsi, timeframe);
      score += rsiScore;
      count++;
    }

    // MACD 분석
    if (technicalData.macd !== undefined) {
      const macdScore = this.analyzeMACD(technicalData.macd, timeframe);
      score += macdScore;
      count++;
    }

    // 볼린저 밴드 분석
    if (technicalData.bollinger !== undefined) {
      const bollingerScore = this.analyzeBollingerBands(technicalData.bollinger, timeframe);
      score += bollingerScore;
      count++;
    }

    // 지지/저항 분석
    if (technicalData.support_resistance !== undefined) {
      const srScore = this.analyzeSupportResistance(technicalData.support_resistance, timeframe);
      score += srScore;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * 펀더멘털 분석 요소 분석
   * @private
   */
  analyzeFundamentalFactors(fundamentalData, timeframe) {
    let score = 0;
    let count = 0;

    // 뉴스 감정 분석
    if (fundamentalData.news_sentiment !== undefined) {
      const newsScore = this.analyzeNewsSentiment(fundamentalData.news_sentiment, timeframe);
      score += newsScore;
      count++;
    }

    // 소셜 감정 분석
    if (fundamentalData.social_sentiment !== undefined) {
      const socialScore = this.analyzeSocialSentiment(fundamentalData.social_sentiment, timeframe);
      score += socialScore;
      count++;
    }

    // 고래 활동 분석
    if (fundamentalData.whale_activity !== undefined) {
      const whaleScore = this.analyzeWhaleActivity(fundamentalData.whale_activity, timeframe);
      score += whaleScore;
      count++;
    }

    // DeFi 활동 분석
    if (fundamentalData.defi_activity !== undefined) {
      const defiScore = this.analyzeDeFiActivity(fundamentalData.defi_activity, timeframe);
      score += defiScore;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * 시장 분석 요소 분석
   * @private
   */
  analyzeMarketFactors(marketData, timeframe) {
    let score = 0;
    let count = 0;

    // 트렌드 강도 분석
    if (marketData.trend_strength !== undefined) {
      const trendScore = this.analyzeTrendStrength(marketData.trend_strength, timeframe);
      score += trendScore;
      count++;
    }

    // 유동성 분석
    if (marketData.liquidity !== undefined) {
      const liquidityScore = this.analyzeLiquidity(marketData.liquidity, timeframe);
      score += liquidityScore;
      count++;
    }

    // 시간대 분석
    if (marketData.time_of_day !== undefined) {
      const timeScore = this.analyzeTimeOfDay(marketData.time_of_day, timeframe);
      score += timeScore;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * AI 모델을 통한 예측 보정
   * @private
   */
  async getAIPrediction(signalData, marketData, contextData, persistencePrediction) {
    try {
      // 프롬프트 생성
      const prompt = this.generateAIPrompt(signalData, marketData, contextData, persistencePrediction);
      
      // AI 모델 호출
      const aiResponse = await this.callAIModel(prompt);
      
      // 응답 파싱
      return this.parseAIResponse(aiResponse);

    } catch (error) {
      logger.error('AI 예측 실패:', error);
      // AI 실패 시 기본 예측 반환
      return {
        adjustment: 0,
        reasoning: 'AI 모델 호출 실패로 기본 예측 사용',
        confidence: 0.5
      };
    }
  }

  /**
   * AI 프롬프트 생성
   * @private
   */
  generateAIPrompt(signalData, marketData, contextData, persistencePrediction) {
    return `
당신은 암호화폐 신호 지속성 예측 전문가입니다. 다음 데이터를 분석하여 신호가 얼마나 지속될지 예측해주세요.

신호 데이터:
- 기술적 분석: ${JSON.stringify(signalData.technical || {})}
- 펀더멘털 분석: ${JSON.stringify(signalData.fundamental || {})}
- 신호 타입: ${signalData.type || 'unknown'}
- 신호 강도: ${signalData.strength || 0}

시장 데이터:
- 변동성: ${marketData.volatility || 0}
- 트렌드 강도: ${marketData.trend_strength || 0}
- 유동성: ${marketData.liquidity || 0}

현재 예측:
- 단기 (1-4시간): ${persistencePrediction.shortTerm.probability}
- 중기 (4-24시간): ${persistencePrediction.mediumTerm.probability}
- 장기 (1-7일): ${persistencePrediction.longTerm.probability}

다음 형식으로 응답해주세요:
{
  "adjustment": 예측 조정값 (-0.2 ~ 0.2),
  "reasoning": "예측 근거",
  "confidence": 신뢰도 (0-1),
  "risk_factors": ["위험 요소1", "위험 요소2"],
  "opportunity_factors": ["기회 요소1", "기회 요소2"]
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
            content: '당신은 암호화폐 신호 지속성 예측 전문가입니다. 정확하고 신중한 분석을 제공해주세요.'
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
  parseAIResponse(response) {
    try {
      // JSON 응답 파싱 시도
      const parsed = JSON.parse(response);
      return {
        adjustment: parsed.adjustment || 0,
        reasoning: parsed.reasoning || 'AI 분석 완료',
        confidence: parsed.confidence || 0.5,
        riskFactors: parsed.risk_factors || [],
        opportunityFactors: parsed.opportunity_factors || []
      };
    } catch (error) {
      // JSON 파싱 실패 시 텍스트에서 정보 추출
      return this.extractInfoFromText(response);
    }
  }

  /**
   * 텍스트에서 정보 추출
   * @private
   */
  extractInfoFromText(text) {
    // 간단한 텍스트 분석으로 정보 추출
    const adjustment = this.extractAdjustmentFromText(text);
    const confidence = this.extractConfidenceFromText(text);
    
    return {
      adjustment,
      reasoning: text.substring(0, 200) + '...',
      confidence,
      riskFactors: [],
      opportunityFactors: []
    };
  }

  /**
   * 예측 결과 통합
   * @private
   */
  integratePredictions(persistencePrediction, aiPrediction, signalStrength) {
    const adjustment = aiPrediction.adjustment || 0;
    const aiConfidence = aiPrediction.confidence || 0.5;
    
    // AI 예측의 신뢰도에 따라 조정값 적용
    const finalAdjustment = adjustment * aiConfidence;
    
    const result = {
      signalStrength: this.categorizeSignalStrength(signalStrength.overall),
      predictions: {
        shortTerm: {
          probability: Math.min(1, Math.max(0, persistencePrediction.shortTerm.probability + finalAdjustment)),
          confidence: (persistencePrediction.shortTerm.confidence + aiConfidence) / 2,
          duration: '1-4시간',
          factors: persistencePrediction.shortTerm.factors
        },
        mediumTerm: {
          probability: Math.min(1, Math.max(0, persistencePrediction.mediumTerm.probability + finalAdjustment)),
          confidence: (persistencePrediction.mediumTerm.confidence + aiConfidence) / 2,
          duration: '4-24시간',
          factors: persistencePrediction.mediumTerm.factors
        },
        longTerm: {
          probability: Math.min(1, Math.max(0, persistencePrediction.longTerm.probability + finalAdjustment)),
          confidence: (persistencePrediction.longTerm.confidence + aiConfidence) / 2,
          duration: '1-7일',
          factors: persistencePrediction.longTerm.factors
        }
      },
      aiAnalysis: {
        reasoning: aiPrediction.reasoning,
        confidence: aiConfidence,
        riskFactors: aiPrediction.riskFactors || [],
        opportunityFactors: aiPrediction.opportunityFactors || []
      },
      overallConfidence: this.calculateOverallConfidence(persistencePrediction, aiConfidence),
      timestamp: new Date(),
      modelVersion: '1.0.0'
    };

    return result;
  }

  /**
   * 신호 강도 분류
   * @private
   */
  categorizeSignalStrength(strength) {
    if (strength >= this.signalThresholds.very_strong) {
      return 'very_strong';
    } else if (strength >= this.signalThresholds.strong) {
      return 'strong';
    } else if (strength >= this.signalThresholds.moderate) {
      return 'moderate';
    } else {
      return 'weak';
    }
  }

  /**
   * 전체 신뢰도 계산
   * @private
   */
  calculateOverallConfidence(persistencePrediction, aiConfidence) {
    const avgConfidence = (
      persistencePrediction.shortTerm.confidence +
      persistencePrediction.mediumTerm.confidence +
      persistencePrediction.longTerm.confidence
    ) / 3;
    
    return (avgConfidence + aiConfidence) / 2;
  }

  /**
   * 캐시 키 생성
   * @private
   */
  generateCacheKey(signalData, marketData) {
    const key = JSON.stringify({
      signal: signalData.type,
      strength: signalData.strength,
      market: marketData.volatility,
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5분 단위로 캐시
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
   * 캐시 클리어
   */
  clearCache() {
    this.predictionCache.clear();
    logger.info('신호 지속성 예측 캐시가 클리어되었습니다.');
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.predictionCache.size,
      entries: Array.from(this.predictionCache.keys())
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cacheSize: this.predictionCache.size,
      modelConfig: Object.keys(this.modelConfig).filter(key => 
        this.modelConfig[key].apiKey || this.modelConfig[key].baseUrl
      )
    };
  }

  // 개별 분석 메서드들 (간단한 구현)
  analyzeRSI(rsi, timeframe) {
    // RSI 기반 지속성 분석
    if (rsi < 30) return 0.8; // 과매도
    if (rsi > 70) return 0.2; // 과매수
    return 0.5; // 중립
  }

  analyzeMACD(macd, timeframe) {
    // MACD 기반 지속성 분석
    return macd > 0 ? 0.7 : 0.3;
  }

  analyzeBollingerBands(bollinger, timeframe) {
    // 볼린저 밴드 기반 지속성 분석
    return bollinger;
  }

  analyzeSupportResistance(sr, timeframe) {
    // 지지/저항 기반 지속성 분석
    return sr;
  }

  analyzeNewsSentiment(sentiment, timeframe) {
    // 뉴스 감정 기반 지속성 분석
    return sentiment;
  }

  analyzeSocialSentiment(sentiment, timeframe) {
    // 소셜 감정 기반 지속성 분석
    return sentiment;
  }

  analyzeWhaleActivity(activity, timeframe) {
    // 고래 활동 기반 지속성 분석
    return activity;
  }

  analyzeDeFiActivity(activity, timeframe) {
    // DeFi 활동 기반 지속성 분석
    return activity;
  }

  analyzeTrendStrength(strength, timeframe) {
    // 트렌드 강도 기반 지속성 분석
    return strength;
  }

  analyzeLiquidity(liquidity, timeframe) {
    // 유동성 기반 지속성 분석
    return liquidity;
  }

  analyzeTimeOfDay(timeOfDay, timeframe) {
    // 시간대 기반 지속성 분석
    return timeOfDay;
  }

  analyzeVolumeFactor(volume, timeframe) {
    // 볼륨 기반 지속성 분석
    return volume;
  }

  analyzeVolatilityFactor(volatility, timeframe) {
    // 변동성 기반 지속성 분석
    return 1 - volatility; // 낮은 변동성이 높은 지속성
  }

  analyzeCorrelationFactor(correlation, timeframe) {
    // 상관관계 기반 지속성 분석
    return correlation;
  }

  extractAdjustmentFromText(text) {
    // 텍스트에서 조정값 추출
    const match = text.match(/adjustment[:\s]*([+-]?\d*\.?\d+)/i);
    return match ? parseFloat(match[1]) : 0;
  }

  extractConfidenceFromText(text) {
    // 텍스트에서 신뢰도 추출
    const match = text.match(/confidence[:\s]*(\d*\.?\d+)/i);
    return match ? parseFloat(match[1]) : 0.5;
  }
}

module.exports = new SignalPersistenceService();
