const logger = require('../utils/logger');
const axios = require('axios');

class TechnicalAnalysisService {
  constructor() {
    this.coinGeckoService = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시
  }

  // 메인 기술적 분석 메서드
  async analyzeTechnicalIndicators(symbol, priceData) {
    try {
      logger.info(`Starting technical analysis for ${symbol}`);
      
      // 과거 가격 데이터 가져오기 (최근 30일)
      const historicalData = await this.getHistoricalPriceData(symbol, 30);
      
      if (!historicalData || historicalData.length < 14) {
        logger.warning(`Insufficient historical data for ${symbol}, using simplified analysis`);
        return this.getSimplifiedTechnicalAnalysis(priceData);
      }

      // 기술적 지표 계산
      const rsi = this.calculateRSI(historicalData);
      const macd = this.calculateMACD(historicalData);
      const bollingerBands = this.calculateBollingerBands(historicalData);
      const movingAverages = this.calculateMovingAverages(historicalData);
      const supportResistance = this.calculateSupportResistance(historicalData);
      const volumeAnalysis = this.analyzeVolume(historicalData, priceData);
      
      // 종합 기술적 점수 계산
      const technicalScore = this.calculateTechnicalScore({
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        supportResistance,
        volumeAnalysis,
        currentPrice: priceData.current_price
      });

      const analysis = {
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        supportResistance,
        volumeAnalysis,
        technicalScore,
        signals: this.generateTechnicalSignals({
          rsi,
          macd,
          bollingerBands,
          movingAverages,
          supportResistance,
          volumeAnalysis
        }),
        timestamp: new Date()
      };

      logger.info(`Technical analysis completed for ${symbol}: Score ${technicalScore.toFixed(2)}`);
      return analysis;

    } catch (error) {
      logger.error(`Technical analysis failed for ${symbol}:`, error);
      return this.getSimplifiedTechnicalAnalysis(priceData);
    }
  }

  // 과거 가격 데이터 가져오기
  async getHistoricalPriceData(symbol, days = 30) {
    try {
      const cacheKey = `historical_${symbol}_${days}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // CoinGecko API를 통해 과거 데이터 가져오기
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: 'daily'
          },
          headers: {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
          },
          timeout: 10000
        }
      );

      const data = response.data;
      const historicalData = data.prices.map((price, index) => ({
        timestamp: price[0],
        price: price[1],
        volume: data.total_volumes[index] ? data.total_volumes[index][1] : 0,
        marketCap: data.market_caps[index] ? data.market_caps[index][1] : 0
      }));

      // 캐시에 저장
      this.cache.set(cacheKey, {
        data: historicalData,
        timestamp: Date.now()
      });

      return historicalData;

    } catch (error) {
      logger.error(`Failed to get historical data for ${symbol}:`, error);
      return null;
    }
  }

  // RSI 계산 (14일)
  calculateRSI(prices, period = 14) {
    try {
      if (prices.length < period + 1) {
        return { value: 50, signal: 'NEUTRAL', strength: 0.5 };
      }

      const gains = [];
      const losses = [];

      for (let i = 1; i < prices.length; i++) {
        const change = prices[i].price - prices[i - 1].price;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }

      let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

      for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      }

      const rs = avgGain / (avgLoss || 0.0001);
      const rsi = 100 - (100 / (1 + rs));

      let signal = 'NEUTRAL';
      let strength = 0.5;

      if (rsi >= 70) {
        signal = 'OVERBOUGHT';
        strength = Math.min((rsi - 70) / 30, 1);
      } else if (rsi <= 30) {
        signal = 'OVERSOLD';
        strength = Math.min((30 - rsi) / 30, 1);
      } else if (rsi > 50) {
        signal = 'BULLISH';
        strength = (rsi - 50) / 20;
      } else {
        signal = 'BEARISH';
        strength = (50 - rsi) / 20;
      }

      return {
        value: Math.round(rsi * 100) / 100,
        signal,
        strength: Math.min(Math.max(strength, 0), 1)
      };

    } catch (error) {
      logger.error('RSI calculation failed:', error);
      return { value: 50, signal: 'NEUTRAL', strength: 0.5 };
    }
  }

  // MACD 계산
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    try {
      if (prices.length < slowPeriod) {
        return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL', strength: 0.5 };
      }

      const ema12 = this.calculateEMA(prices, fastPeriod);
      const ema26 = this.calculateEMA(prices, slowPeriod);
      
      const macdLine = ema12 - ema26;
      
      // MACD 시그널 라인 계산 (MACD의 EMA)
      const macdValues = [];
      for (let i = slowPeriod - 1; i < prices.length; i++) {
        const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
        const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
        macdValues.push(fastEMA - slowEMA);
      }
      
      const signalLine = this.calculateEMAFromValues(macdValues, signalPeriod);
      const histogram = macdLine - signalLine;

      let trend = 'NEUTRAL';
      let strength = 0.5;

      if (macdLine > signalLine && histogram > 0) {
        trend = 'BULLISH';
        strength = Math.min(histogram / Math.abs(macdLine), 1);
      } else if (macdLine < signalLine && histogram < 0) {
        trend = 'BEARISH';
        strength = Math.min(Math.abs(histogram) / Math.abs(macdLine), 1);
      }

      return {
        macd: Math.round(macdLine * 10000) / 10000,
        signal: Math.round(signalLine * 10000) / 10000,
        histogram: Math.round(histogram * 10000) / 10000,
        trend,
        strength: Math.min(Math.max(strength, 0), 1)
      };

    } catch (error) {
      logger.error('MACD calculation failed:', error);
      return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL', strength: 0.5 };
    }
  }

  // EMA 계산
  calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1].price;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0].price;
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i].price * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // 값 배열에서 EMA 계산
  calculateEMAFromValues(values, period) {
    if (values.length < period) return values[values.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // 볼린저 밴드 계산
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    try {
      if (prices.length < period) {
        const currentPrice = prices[prices.length - 1].price;
        return {
          upper: currentPrice * 1.1,
          middle: currentPrice,
          lower: currentPrice * 0.9,
          position: 'MIDDLE',
          strength: 0.5
        };
      }

      const recentPrices = prices.slice(-period);
      const sma = recentPrices.reduce((sum, p) => sum + p.price, 0) / period;
      
      const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p.price - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      const upperBand = sma + (stdDev * standardDeviation);
      const lowerBand = sma - (stdDev * standardDeviation);
      
      const currentPrice = prices[prices.length - 1].price;
      
      let position = 'MIDDLE';
      let strength = 0.5;
      
      if (currentPrice > upperBand) {
        position = 'ABOVE_UPPER';
        strength = Math.min((currentPrice - upperBand) / (upperBand - sma), 1);
      } else if (currentPrice < lowerBand) {
        position = 'BELOW_LOWER';
        strength = Math.min((lowerBand - currentPrice) / (sma - lowerBand), 1);
      } else if (currentPrice > sma) {
        position = 'UPPER_HALF';
        strength = (currentPrice - sma) / (upperBand - sma) * 0.5 + 0.5;
      } else {
        position = 'LOWER_HALF';
        strength = (sma - currentPrice) / (sma - lowerBand) * 0.5;
      }

      return {
        upper: Math.round(upperBand * 100) / 100,
        middle: Math.round(sma * 100) / 100,
        lower: Math.round(lowerBand * 100) / 100,
        position,
        strength: Math.min(Math.max(strength, 0), 1)
      };

    } catch (error) {
      logger.error('Bollinger Bands calculation failed:', error);
      const currentPrice = prices[prices.length - 1].price;
      return {
        upper: currentPrice * 1.1,
        middle: currentPrice,
        lower: currentPrice * 0.9,
        position: 'MIDDLE',
        strength: 0.5
      };
    }
  }

  // 이동평균 계산
  calculateMovingAverages(prices) {
    try {
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      
      const currentPrice = prices[prices.length - 1].price;
      
      let trend = 'NEUTRAL';
      let strength = 0.5;
      
      // 단기 EMA가 장기 EMA보다 위에 있으면 상승 추세
      if (ema12 > ema26 && currentPrice > sma20) {
        trend = 'BULLISH';
        strength = Math.min((ema12 - ema26) / ema26, 1);
      } else if (ema12 < ema26 && currentPrice < sma20) {
        trend = 'BEARISH';
        strength = Math.min((ema26 - ema12) / ema26, 1);
      }

      return {
        sma20: Math.round(sma20 * 100) / 100,
        sma50: Math.round(sma50 * 100) / 100,
        ema12: Math.round(ema12 * 100) / 100,
        ema26: Math.round(ema26 * 100) / 100,
        trend,
        strength: Math.min(Math.max(strength, 0), 1)
      };

    } catch (error) {
      logger.error('Moving averages calculation failed:', error);
      const currentPrice = prices[prices.length - 1].price;
      return {
        sma20: currentPrice,
        sma50: currentPrice,
        ema12: currentPrice,
        ema26: currentPrice,
        trend: 'NEUTRAL',
        strength: 0.5
      };
    }
  }

  // SMA 계산
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    }
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, p) => sum + p.price, 0) / period;
  }

  // 지지/저항 계산
  calculateSupportResistance(prices) {
    try {
      if (prices.length < 20) {
        return { support: 0, resistance: 0, strength: 0.5 };
      }

      const recentPrices = prices.slice(-20);
      const highs = recentPrices.map(p => p.price);
      const lows = recentPrices.map(p => p.price);
      
      // 간단한 지지/저항 계산
      const resistance = Math.max(...highs);
      const support = Math.min(...lows);
      const currentPrice = prices[prices.length - 1].price;
      
      // 지지/저항 강도 계산
      const priceRange = resistance - support;
      const distanceToResistance = resistance - currentPrice;
      const distanceToSupport = currentPrice - support;
      
      let strength = 0.5;
      if (distanceToResistance < priceRange * 0.1) {
        strength = 0.8; // 저항 근처
      } else if (distanceToSupport < priceRange * 0.1) {
        strength = 0.2; // 지지 근처
      } else {
        strength = 0.5; // 중간
      }

      return {
        support: Math.round(support * 100) / 100,
        resistance: Math.round(resistance * 100) / 100,
        strength: Math.min(Math.max(strength, 0), 1)
      };

    } catch (error) {
      logger.error('Support/Resistance calculation failed:', error);
      return { support: 0, resistance: 0, strength: 0.5 };
    }
  }

  // 거래량 분석
  analyzeVolume(historicalData, currentData) {
    try {
      if (historicalData.length < 10) {
        return { trend: 'NEUTRAL', strength: 0.5, ratio: 1 };
      }

      const recentVolumes = historicalData.slice(-10).map(d => d.volume);
      const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
      const currentVolume = currentData.total_volume || 0;
      
      const volumeRatio = currentVolume / (avgVolume || 1);
      
      let trend = 'NEUTRAL';
      let strength = 0.5;
      
      if (volumeRatio > 2) {
        trend = 'HIGH';
        strength = Math.min((volumeRatio - 2) / 3, 1);
      } else if (volumeRatio < 0.5) {
        trend = 'LOW';
        strength = Math.min((0.5 - volumeRatio) / 0.5, 1);
      } else {
        trend = 'NORMAL';
        strength = 0.5;
      }

      return {
        trend,
        strength: Math.min(Math.max(strength, 0), 1),
        ratio: Math.round(volumeRatio * 100) / 100
      };

    } catch (error) {
      logger.error('Volume analysis failed:', error);
      return { trend: 'NEUTRAL', strength: 0.5, ratio: 1 };
    }
  }

  // 종합 기술적 점수 계산
  calculateTechnicalScore(indicators) {
    try {
      const weights = {
        rsi: 0.25,
        macd: 0.25,
        bollinger: 0.20,
        movingAverages: 0.15,
        supportResistance: 0.10,
        volume: 0.05
      };

      let totalScore = 0;
      let totalWeight = 0;

      // RSI 점수
      if (indicators.rsi) {
        const rsiScore = this.getRSIScore(indicators.rsi);
        totalScore += rsiScore * weights.rsi;
        totalWeight += weights.rsi;
      }

      // MACD 점수
      if (indicators.macd) {
        const macdScore = this.getMACDScore(indicators.macd);
        totalScore += macdScore * weights.macd;
        totalWeight += weights.macd;
      }

      // 볼린저 밴드 점수
      if (indicators.bollingerBands) {
        const bollingerScore = this.getBollingerScore(indicators.bollingerBands, indicators.currentPrice);
        totalScore += bollingerScore * weights.bollinger;
        totalWeight += weights.bollinger;
      }

      // 이동평균 점수
      if (indicators.movingAverages) {
        const maScore = this.getMovingAverageScore(indicators.movingAverages, indicators.currentPrice);
        totalScore += maScore * weights.movingAverages;
        totalWeight += weights.movingAverages;
      }

      // 지지/저항 점수
      if (indicators.supportResistance) {
        const srScore = this.getSupportResistanceScore(indicators.supportResistance, indicators.currentPrice);
        totalScore += srScore * weights.supportResistance;
        totalWeight += weights.supportResistance;
      }

      // 거래량 점수
      if (indicators.volumeAnalysis) {
        const volumeScore = this.getVolumeScore(indicators.volumeAnalysis);
        totalScore += volumeScore * weights.volume;
        totalWeight += weights.volume;
      }

      return totalWeight > 0 ? totalScore / totalWeight : 0.5;

    } catch (error) {
      logger.error('Technical score calculation failed:', error);
      return 0.5;
    }
  }

  // RSI 점수 변환
  getRSIScore(rsi) {
    if (rsi.signal === 'OVERSOLD') return 0.8;
    if (rsi.signal === 'OVERBOUGHT') return 0.2;
    if (rsi.signal === 'BULLISH') return 0.6 + (rsi.strength * 0.2);
    if (rsi.signal === 'BEARISH') return 0.4 - (rsi.strength * 0.2);
    return 0.5;
  }

  // MACD 점수 변환
  getMACDScore(macd) {
    if (macd.trend === 'BULLISH') return 0.6 + (macd.strength * 0.3);
    if (macd.trend === 'BEARISH') return 0.4 - (macd.strength * 0.3);
    return 0.5;
  }

  // 볼린저 밴드 점수 변환
  getBollingerScore(bollinger, currentPrice) {
    if (bollinger.position === 'BELOW_LOWER') return 0.8; // 매수 기회
    if (bollinger.position === 'ABOVE_UPPER') return 0.2; // 매도 신호
    if (bollinger.position === 'UPPER_HALF') return 0.6;
    if (bollinger.position === 'LOWER_HALF') return 0.4;
    return 0.5;
  }

  // 이동평균 점수 변환
  getMovingAverageScore(ma, currentPrice) {
    if (ma.trend === 'BULLISH' && currentPrice > ma.sma20) return 0.7 + (ma.strength * 0.2);
    if (ma.trend === 'BEARISH' && currentPrice < ma.sma20) return 0.3 - (ma.strength * 0.2);
    return 0.5;
  }

  // 지지/저항 점수 변환
  getSupportResistanceScore(sr, currentPrice) {
    const range = sr.resistance - sr.support;
    const position = (currentPrice - sr.support) / range;
    
    if (position < 0.2) return 0.8; // 지지 근처 - 매수 기회
    if (position > 0.8) return 0.2; // 저항 근처 - 매도 신호
    return 0.5;
  }

  // 거래량 점수 변환
  getVolumeScore(volume) {
    if (volume.trend === 'HIGH') return 0.7 + (volume.strength * 0.2);
    if (volume.trend === 'LOW') return 0.3 - (volume.strength * 0.2);
    return 0.5;
  }

  // 기술적 신호 생성
  generateTechnicalSignals(indicators) {
    const signals = [];

    // RSI 신호
    if (indicators.rsi.signal === 'OVERSOLD') {
      signals.push({ type: 'BUY', indicator: 'RSI', strength: indicators.rsi.strength });
    } else if (indicators.rsi.signal === 'OVERBOUGHT') {
      signals.push({ type: 'SELL', indicator: 'RSI', strength: indicators.rsi.strength });
    }

    // MACD 신호
    if (indicators.macd.trend === 'BULLISH' && indicators.macd.histogram > 0) {
      signals.push({ type: 'BUY', indicator: 'MACD', strength: indicators.macd.strength });
    } else if (indicators.macd.trend === 'BEARISH' && indicators.macd.histogram < 0) {
      signals.push({ type: 'SELL', indicator: 'MACD', strength: indicators.macd.strength });
    }

    // 볼린저 밴드 신호
    if (indicators.bollingerBands.position === 'BELOW_LOWER') {
      signals.push({ type: 'BUY', indicator: 'BOLLINGER', strength: indicators.bollingerBands.strength });
    } else if (indicators.bollingerBands.position === 'ABOVE_UPPER') {
      signals.push({ type: 'SELL', indicator: 'BOLLINGER', strength: indicators.bollingerBands.strength });
    }

    return signals;
  }

  // 간소화된 기술적 분석 (데이터 부족 시)
  getSimplifiedTechnicalAnalysis(priceData) {
    try {
      const priceChange24h = priceData.price_change_percentage_24h || 0;
      const volumeRatio = this.calculateVolumeRatio(priceData);
      
      // 간단한 RSI 시뮬레이션
      const rsi = this.simulateRSI(priceChange24h);
      
      // 간단한 MACD 시뮬레이션
      const macd = this.simulateMACD(priceChange24h, volumeRatio);
      
      // 간단한 볼린저 밴드 시뮬레이션
      const bollingerBands = this.simulateBollingerBands(priceData);
      
      // 간단한 이동평균 시뮬레이션
      const movingAverages = this.simulateMovingAverages(priceData);
      
      // 간단한 지지/저항 시뮬레이션
      const supportResistance = this.simulateSupportResistance(priceData);
      
      // 간단한 거래량 분석
      const volumeAnalysis = this.simulateVolumeAnalysis(volumeRatio);
      
      const technicalScore = this.calculateTechnicalScore({
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        supportResistance,
        volumeAnalysis,
        currentPrice: priceData.current_price
      });

      return {
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        supportResistance,
        volumeAnalysis,
        technicalScore,
        signals: this.generateTechnicalSignals({
          rsi,
          macd,
          bollingerBands,
          movingAverages,
          supportResistance,
          volumeAnalysis
        }),
        timestamp: new Date(),
        simplified: true
      };

    } catch (error) {
      logger.error('Simplified technical analysis failed:', error);
      return {
        rsi: { value: 50, signal: 'NEUTRAL', strength: 0.5 },
        macd: { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL', strength: 0.5 },
        bollingerBands: { upper: 0, middle: 0, lower: 0, position: 'MIDDLE', strength: 0.5 },
        movingAverages: { sma20: 0, sma50: 0, ema12: 0, ema26: 0, trend: 'NEUTRAL', strength: 0.5 },
        supportResistance: { support: 0, resistance: 0, strength: 0.5 },
        volumeAnalysis: { trend: 'NEUTRAL', strength: 0.5, ratio: 1 },
        technicalScore: 0.5,
        signals: [],
        timestamp: new Date(),
        simplified: true
      };
    }
  }

  // 거래량 비율 계산
  calculateVolumeRatio(priceData) {
    try {
      const marketCap = priceData.market_cap || 0;
      const totalVolume = priceData.total_volume || 0;
      
      if (marketCap === 0) return 0;
      
      return totalVolume / marketCap;
    } catch (error) {
      return 0;
    }
  }

  // RSI 시뮬레이션
  simulateRSI(priceChange24h) {
    const absChange = Math.abs(priceChange24h);
    
    if (priceChange24h > 0) {
      if (absChange >= 15) return { value: 80, signal: 'OVERBOUGHT', strength: 0.8 };
      if (absChange >= 10) return { value: 70, signal: 'BULLISH', strength: 0.6 };
      if (absChange >= 5) return { value: 60, signal: 'BULLISH', strength: 0.4 };
      return { value: 55, signal: 'BULLISH', strength: 0.2 };
    } else {
      if (absChange >= 15) return { value: 20, signal: 'OVERSOLD', strength: 0.8 };
      if (absChange >= 10) return { value: 30, signal: 'BEARISH', strength: 0.6 };
      if (absChange >= 5) return { value: 40, signal: 'BEARISH', strength: 0.4 };
      return { value: 45, signal: 'BEARISH', strength: 0.2 };
    }
  }

  // MACD 시뮬레이션
  simulateMACD(priceChange24h, volumeRatio) {
    const momentum = priceChange24h * volumeRatio;
    
    if (momentum > 10) {
      return { macd: 0.01, signal: 0.005, histogram: 0.005, trend: 'BULLISH', strength: 0.7 };
    } else if (momentum < -10) {
      return { macd: -0.01, signal: -0.005, histogram: -0.005, trend: 'BEARISH', strength: 0.7 };
    } else if (momentum > 0) {
      return { macd: 0.005, signal: 0.002, histogram: 0.003, trend: 'BULLISH', strength: 0.4 };
    } else {
      return { macd: -0.005, signal: -0.002, histogram: -0.003, trend: 'BEARISH', strength: 0.4 };
    }
  }

  // 볼린저 밴드 시뮬레이션
  simulateBollingerBands(priceData) {
    const currentPrice = priceData.current_price || 0;
    const volatility = Math.abs(priceData.price_change_percentage_24h || 0);
    
    const upper = currentPrice * (1 + volatility / 100 * 2);
    const lower = currentPrice * (1 - volatility / 100 * 2);
    const middle = currentPrice;
    
    let position = 'MIDDLE';
    let strength = 0.5;
    
    if (currentPrice > upper * 0.95) {
      position = 'ABOVE_UPPER';
      strength = 0.8;
    } else if (currentPrice < lower * 1.05) {
      position = 'BELOW_LOWER';
      strength = 0.8;
    }
    
    return { upper, middle, lower, position, strength };
  }

  // 이동평균 시뮬레이션
  simulateMovingAverages(priceData) {
    const currentPrice = priceData.current_price || 0;
    const priceChange24h = priceData.price_change_percentage_24h || 0;
    
    const sma20 = currentPrice * (1 - priceChange24h / 100 * 0.5);
    const sma50 = currentPrice * (1 - priceChange24h / 100 * 0.3);
    const ema12 = currentPrice * (1 - priceChange24h / 100 * 0.2);
    const ema26 = currentPrice * (1 - priceChange24h / 100 * 0.1);
    
    let trend = 'NEUTRAL';
    let strength = 0.5;
    
    if (ema12 > ema26 && currentPrice > sma20) {
      trend = 'BULLISH';
      strength = 0.6;
    } else if (ema12 < ema26 && currentPrice < sma20) {
      trend = 'BEARISH';
      strength = 0.6;
    }
    
    return { sma20, sma50, ema12, ema26, trend, strength };
  }

  // 지지/저항 시뮬레이션
  simulateSupportResistance(priceData) {
    const currentPrice = priceData.current_price || 0;
    const volatility = Math.abs(priceData.price_change_percentage_24h || 0);
    
    const support = currentPrice * (1 - volatility / 100 * 1.5);
    const resistance = currentPrice * (1 + volatility / 100 * 1.5);
    
    return { support, resistance, strength: 0.5 };
  }

  // 거래량 분석 시뮬레이션
  simulateVolumeAnalysis(volumeRatio) {
    let trend = 'NEUTRAL';
    let strength = 0.5;
    
    if (volumeRatio > 2) {
      trend = 'HIGH';
      strength = Math.min((volumeRatio - 2) / 3, 1);
    } else if (volumeRatio < 0.5) {
      trend = 'LOW';
      strength = Math.min((0.5 - volumeRatio) / 0.5, 1);
    }
    
    return { trend, strength, ratio: volumeRatio };
  }
}

module.exports = TechnicalAnalysisService;
