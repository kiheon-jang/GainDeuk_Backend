const { expect } = require('chai');
const SignalCalculatorService = require('../../src/services/SignalCalculatorService');

// 테스트 설정 파일 import
require('../setup');

describe('SignalCalculatorService', () => {
  let signalCalculator;

  beforeEach(() => {
    signalCalculator = new SignalCalculatorService();
  });

  describe('calculatePriceScore', () => {
    it('should calculate high score for strong positive price changes', () => {
      const priceData = {
        price_change_percentage_1h: 5.0,
        price_change_percentage_24h: 15.0,
        price_change_percentage_7d: 25.0,
        price_change_percentage_30d: 50.0
      };

      const score = signalCalculator.calculatePriceScore(priceData);
      expect(score).to.be.above(80);
    });

    it('should calculate low score for strong negative price changes', () => {
      const priceData = {
        price_change_percentage_1h: -5.0,
        price_change_percentage_24h: -15.0,
        price_change_percentage_7d: -25.0,
        price_change_percentage_30d: -50.0
      };

      const score = signalCalculator.calculatePriceScore(priceData);
      expect(score).to.be.below(20);
    });

    it('should calculate neutral score for minimal price changes', () => {
      const priceData = {
        price_change_percentage_1h: 0.5,
        price_change_percentage_24h: 1.0,
        price_change_percentage_7d: 2.0,
        price_change_percentage_30d: 3.0
      };

      const score = signalCalculator.calculatePriceScore(priceData);
      expect(score).to.be.within(40, 60);
    });

    it('should handle missing price data', () => {
      const priceData = {
        price_change_percentage_1h: null,
        price_change_percentage_24h: undefined,
        price_change_percentage_7d: 0,
        price_change_percentage_30d: 0
      };

      const score = signalCalculator.calculatePriceScore(priceData);
      expect(score).to.be.a('number');
      expect(score).to.be.within(0, 100);
    });
  });

  describe('calculateVolumeScore', () => {
    it('should calculate high score for high volume ratio', () => {
      const priceData = {
        market_cap: 1000000000,
        total_volume: 5000000000, // 5x volume ratio
        total_volume_change_24h: 100
      };

      const score = signalCalculator.calculateVolumeScore(priceData);
      expect(score).to.be.above(80);
    });

    it('should calculate low score for low volume ratio', () => {
      const priceData = {
        market_cap: 1000000000,
        total_volume: 50000000, // 0.05x volume ratio
        total_volume_change_24h: -50
      };

      const score = signalCalculator.calculateVolumeScore(priceData);
      expect(score).to.be.below(40);
    });

    it('should handle zero market cap', () => {
      const priceData = {
        market_cap: 0,
        total_volume: 1000000,
        total_volume_change_24h: 0
      };

      const score = signalCalculator.calculateVolumeScore(priceData);
      expect(score).to.be.a('number');
      expect(score).to.be.within(0, 100);
    });
  });

  describe('calculateMarketScore', () => {
    it('should calculate high score for top 10 coins', () => {
      const priceData = {
        market_cap_rank: 5,
        market_cap_change_percentage_24h: 5.0
      };

      const score = signalCalculator.calculateMarketScore(priceData);
      expect(score).to.be.above(85);
    });

    it('should calculate medium score for top 100 coins', () => {
      const priceData = {
        market_cap_rank: 50,
        market_cap_change_percentage_24h: 2.0
      };

      const score = signalCalculator.calculateMarketScore(priceData);
      expect(score).to.be.within(70, 90);
    });

    it('should calculate low score for low rank coins', () => {
      const priceData = {
        market_cap_rank: 1000,
        market_cap_change_percentage_24h: -5.0
      };

      const score = signalCalculator.calculateMarketScore(priceData);
      expect(score).to.be.below(40);
    });
  });

  describe('calculateFinalScore', () => {
    it('should calculate weighted average correctly', () => {
      const scores = {
        price: 80,
        volume: 70,
        market: 90,
        sentiment: 60,
        whale: 50
      };

      const finalScore = signalCalculator.calculateFinalScore(scores);
      expect(finalScore).to.be.a('number');
      expect(finalScore).to.be.within(0, 100);
    });

    it('should handle extreme values', () => {
      const scores = {
        price: 100,
        volume: 100,
        market: 100,
        sentiment: 100,
        whale: 100
      };

      const finalScore = signalCalculator.calculateFinalScore(scores);
      expect(finalScore).to.equal(100);
    });
  });

  describe('getRecommendation', () => {
    it('should return STRONG_BUY for high scores', () => {
      const recommendation = signalCalculator.getRecommendation(90);
      expect(recommendation.action).to.equal('STRONG_BUY');
      expect(recommendation.confidence).to.equal('HIGH');
    });

    it('should return STRONG_SELL for low scores', () => {
      const recommendation = signalCalculator.getRecommendation(10);
      expect(recommendation.action).to.equal('STRONG_SELL');
      expect(recommendation.confidence).to.equal('HIGH');
    });

    it('should return HOLD for medium scores', () => {
      const recommendation = signalCalculator.getRecommendation(50);
      expect(recommendation.action).to.equal('HOLD');
      expect(recommendation.confidence).to.be.oneOf(['MEDIUM', 'LOW']);
    });
  });

  describe('getTimeframe', () => {
    it('should return SCALPING for extreme scores', () => {
      const timeframe = signalCalculator.getTimeframe(95);
      expect(timeframe).to.equal('SCALPING');
    });

    it('should return DAY_TRADING for strong scores', () => {
      const timeframe = signalCalculator.getTimeframe(85);
      expect(timeframe).to.equal('DAY_TRADING');
    });

    it('should return LONG_TERM for weak scores', () => {
      const timeframe = signalCalculator.getTimeframe(45);
      expect(timeframe).to.equal('LONG_TERM');
    });
  });

  describe('getPriority', () => {
    it('should return high priority for top 100 coins with strong signals', () => {
      const priceData = {
        market_cap_rank: 50,
        total_volume: 1000000000,
        market_cap: 10000000000
      };

      const priority = signalCalculator.getPriority(85, priceData);
      expect(priority).to.equal('high_priority');
    });

    it('should return medium priority for top 500 coins with moderate signals', () => {
      const priceData = {
        market_cap_rank: 300,
        total_volume: 100000000,
        market_cap: 1000000000
      };

      const priority = signalCalculator.getPriority(75, priceData);
      expect(priority).to.equal('medium_priority');
    });

    it('should return low priority for low rank coins', () => {
      const priceData = {
        market_cap_rank: 1000,
        total_volume: 1000000,
        market_cap: 10000000
      };

      const priority = signalCalculator.getPriority(60, priceData);
      expect(priority).to.equal('low_priority');
    });
  });

  describe('assessDataQuality', () => {
    it('should return excellent for complete data', () => {
      const priceData = {
        current_price: 50000,
        market_cap: 1000000000,
        total_volume: 100000000,
        price_change_percentage_24h: 5.0
      };

      const quality = signalCalculator.assessDataQuality(priceData);
      expect(quality).to.equal('good');
    });

    it('should return poor for missing essential data', () => {
      const priceData = {
        current_price: null,
        market_cap: 0,
        total_volume: undefined
      };

      const quality = signalCalculator.assessDataQuality(priceData);
      expect(quality).to.equal('poor');
    });
  });

  describe('filterStrongSignals', () => {
    it('should filter signals above minimum score', () => {
      const signals = [
        { finalScore: 85, symbol: 'BTC' },
        { finalScore: 75, symbol: 'ETH' },
        { finalScore: 65, symbol: 'ADA' },
        { finalScore: 15, symbol: 'DOGE' }
      ];

      const strongSignals = signalCalculator.filterStrongSignals(signals, 80);
      expect(strongSignals).to.have.length(2);
      expect(strongSignals[0].symbol).to.equal('BTC');
      expect(strongSignals[1].symbol).to.equal('DOGE');
    });
  });

  describe('generateSignalStats', () => {
    it('should generate correct statistics', () => {
      const signals = [
        { finalScore: 85, recommendation: { action: 'STRONG_BUY' }, timeframe: 'DAY_TRADING', priority: 'high_priority' },
        { finalScore: 75, recommendation: { action: 'BUY' }, timeframe: 'SWING_TRADING', priority: 'medium_priority' },
        { finalScore: 50, recommendation: { action: 'HOLD' }, timeframe: 'LONG_TERM', priority: 'low_priority' },
        { finalScore: 25, recommendation: { action: 'SELL' }, timeframe: 'DAY_TRADING', priority: 'medium_priority' }
      ];

      const stats = signalCalculator.generateSignalStats(signals);
      
      expect(stats.total).to.equal(4);
      expect(stats.avgScore).to.equal(58.75);
      expect(stats.strongBuy).to.equal(1);
      expect(stats.buy).to.equal(1);
      expect(stats.hold).to.equal(1);
      expect(stats.sell).to.equal(1);
      expect(stats.dayTrading).to.equal(2);
      expect(stats.highPriority).to.equal(1);
    });

    it('should handle empty signals array', () => {
      const stats = signalCalculator.generateSignalStats([]);
      
      expect(stats.total).to.equal(0);
      expect(stats.avgScore).to.equal(0);
    });
  });
});
