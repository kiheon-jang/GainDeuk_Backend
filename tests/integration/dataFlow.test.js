const { expect } = require('chai');
const mongoose = require('mongoose');
const CoinGeckoService = require('../../src/services/CoinGeckoService');
const SignalCalculatorService = require('../../src/services/SignalCalculatorService');
const NewsService = require('../../src/services/NewsService');
const WhaleService = require('../../src/services/WhaleService');
const Coin = require('../../src/models/Coin');
const Signal = require('../../src/models/Signal');

describe('Data Flow Integration Tests', () => {
  let coinGeckoService;
  let signalCalculator;
  let newsService;
  let whaleService;

  before(async () => {
    // 서비스 인스턴스 생성
    coinGeckoService = new CoinGeckoService();
    signalCalculator = new SignalCalculatorService();
    newsService = new NewsService();
    whaleService = new WhaleService();
  });

  describe('End-to-End Data Flow', () => {
    it('should fetch data from CoinGecko and calculate signals', async () => {
      // 1. CoinGecko에서 데이터 가져오기
      const marketData = await coinGeckoService.getMarketDataBatch(1, 10);
      expect(marketData).to.be.an('array');
      expect(marketData.length).to.be.greaterThan(0);

      // 2. 첫 번째 코인 데이터로 신호 계산
      const coinData = marketData[0];
      const signal = await signalCalculator.calculateSignal(
        coinData.id,
        coinData.symbol,
        coinData.name,
        coinData
      );

      // 3. 신호 데이터 검증
      expect(signal).to.have.property('coinId', coinData.id);
      expect(signal).to.have.property('symbol', coinData.symbol.toUpperCase());
      expect(signal).to.have.property('finalScore');
      expect(signal.finalScore).to.be.within(0, 100);
      expect(signal).to.have.property('recommendation');
      expect(signal).to.have.property('timeframe');
      expect(signal).to.have.property('priority');
    });

    it('should save coin data to database', async () => {
      // 1. 테스트용 코인 데이터 생성
      const coinData = {
        id: 'test-coin',
        symbol: 'TEST',
        name: 'Test Coin',
        current_price: 100.50,
        market_cap: 1000000000,
        market_cap_rank: 100,
        total_volume: 50000000,
        price_change_percentage_1h: 2.5,
        price_change_percentage_24h: 5.0,
        price_change_percentage_7d: 10.0,
        price_change_percentage_30d: 20.0
      };

      // 2. 코인 데이터를 데이터베이스에 저장
      const coin = new Coin({
        coinId: coinData.id,
        symbol: coinData.symbol,
        name: coinData.name,
        currentPrice: coinData.current_price,
        marketCap: coinData.market_cap,
        marketCapRank: coinData.market_cap_rank,
        totalVolume: coinData.total_volume,
        priceChange: {
          '1h': coinData.price_change_percentage_1h,
          '24h': coinData.price_change_percentage_24h,
          '7d': coinData.price_change_percentage_7d,
          '30d': coinData.price_change_percentage_30d
        }
      });

      const savedCoin = await coin.save();
      expect(savedCoin).to.have.property('_id');
      expect(savedCoin.coinId).to.equal(coinData.id);

      // 3. 저장된 코인 조회
      const retrievedCoin = await Coin.findByCoinId(coinData.id);
      expect(retrievedCoin).to.not.be.null;
      expect(retrievedCoin.symbol).to.equal(coinData.symbol);
    });

    it('should save signal data to database', async () => {
      // 1. 테스트용 신호 데이터 생성
      const signalData = {
        coinId: 'test-coin',
        symbol: 'TEST',
        name: 'Test Coin',
        finalScore: 85.5,
        breakdown: {
          price: 90,
          volume: 75,
          market: 80,
          sentiment: 85,
          whale: 70
        },
        recommendation: {
          action: 'STRONG_BUY',
          confidence: 'HIGH'
        },
        timeframe: 'DAY_TRADING',
        priority: 'high_priority',
        currentPrice: 100.50,
        marketCap: 1000000000
      };

      // 2. 신호 데이터를 데이터베이스에 저장
      const signal = new Signal(signalData);
      const savedSignal = await signal.save();
      expect(savedSignal).to.have.property('_id');
      expect(savedSignal.coinId).to.equal(signalData.coinId);

      // 3. 저장된 신호 조회
      const retrievedSignal = await Signal.findByCoinId(signalData.coinId);
      expect(retrievedSignal).to.not.be.null;
      expect(retrievedSignal.finalScore).to.equal(signalData.finalScore);
    });

    it('should calculate sentiment score from news', async () => {
      // 1. 뉴스 서비스로 감정분석 수행
      const sentiment = await newsService.getCoinSentiment('bitcoin');
      
      // 2. 감정점수 검증
      expect(sentiment).to.be.a('number');
      expect(sentiment).to.be.within(0, 100);
    });

    it('should calculate whale activity score', async () => {
      // 1. 고래 활동 점수 계산
      const whaleScore = await whaleService.getWhaleActivityScore('BTC');
      
      // 2. 고래 점수 검증
      expect(whaleScore).to.be.a('number');
      expect(whaleScore).to.be.within(0, 100);
    });

    it('should process batch signals', async () => {
      // 1. 테스트용 코인 데이터 배열 생성
      const coinsData = [
        {
          id: 'test-coin-1',
          symbol: 'TEST1',
          name: 'Test Coin 1',
          current_price: 100,
          market_cap: 1000000000,
          market_cap_rank: 50,
          total_volume: 50000000,
          price_change_percentage_1h: 2.0,
          price_change_percentage_24h: 5.0,
          price_change_percentage_7d: 10.0,
          price_change_percentage_30d: 20.0
        },
        {
          id: 'test-coin-2',
          symbol: 'TEST2',
          name: 'Test Coin 2',
          current_price: 200,
          market_cap: 2000000000,
          market_cap_rank: 100,
          total_volume: 100000000,
          price_change_percentage_1h: -1.0,
          price_change_percentage_24h: -3.0,
          price_change_percentage_7d: -5.0,
          price_change_percentage_30d: -10.0
        }
      ];

      // 2. 배치 신호 계산
      const signals = await signalCalculator.calculateBatchSignals(coinsData);
      
      // 3. 결과 검증
      expect(signals).to.be.an('array');
      expect(signals.length).to.equal(2);
      
      signals.forEach((signal, index) => {
        expect(signal).to.have.property('coinId', coinsData[index].id);
        expect(signal).to.have.property('finalScore');
        expect(signal.finalScore).to.be.within(0, 100);
        expect(signal).to.have.property('rank', index + 1);
      });
    });

    it('should filter strong signals', async () => {
      // 1. 테스트용 신호 배열 생성
      const signals = [
        { finalScore: 85, symbol: 'BTC' },
        { finalScore: 75, symbol: 'ETH' },
        { finalScore: 65, symbol: 'ADA' },
        { finalScore: 15, symbol: 'DOGE' },
        { finalScore: 5, symbol: 'SHIB' }
      ];

      // 2. 강한 신호 필터링
      const strongSignals = signalCalculator.filterStrongSignals(signals, 80);
      
      // 3. 결과 검증
      expect(strongSignals).to.have.length(3); // 85, 15, 5
      expect(strongSignals[0].symbol).to.equal('BTC');
      expect(strongSignals[1].symbol).to.equal('DOGE');
      expect(strongSignals[2].symbol).to.equal('SHIB');
    });

    it('should generate signal statistics', async () => {
      // 1. 테스트용 신호 배열 생성
      const signals = [
        { 
          finalScore: 85, 
          recommendation: { action: 'STRONG_BUY' }, 
          timeframe: 'DAY_TRADING', 
          priority: 'high_priority' 
        },
        { 
          finalScore: 75, 
          recommendation: { action: 'BUY' }, 
          timeframe: 'SWING_TRADING', 
          priority: 'medium_priority' 
        },
        { 
          finalScore: 50, 
          recommendation: { action: 'HOLD' }, 
          timeframe: 'LONG_TERM', 
          priority: 'low_priority' 
        },
        { 
          finalScore: 25, 
          recommendation: { action: 'SELL' }, 
          timeframe: 'DAY_TRADING', 
          priority: 'medium_priority' 
        }
      ];

      // 2. 통계 생성
      const stats = signalCalculator.generateSignalStats(signals);
      
      // 3. 통계 검증
      expect(stats).to.have.property('total', 4);
      expect(stats).to.have.property('avgScore', 58.75);
      expect(stats).to.have.property('strongBuy', 1);
      expect(stats).to.have.property('buy', 1);
      expect(stats).to.have.property('hold', 1);
      expect(stats).to.have.property('sell', 1);
      expect(stats).to.have.property('dayTrading', 2);
      expect(stats).to.have.property('highPriority', 1);
    });
  });

  after(async () => {
    // 테스트 데이터 정리
    await Coin.deleteMany({ coinId: { $in: ['test-coin', 'test-coin-1', 'test-coin-2'] } });
    await Signal.deleteMany({ coinId: { $in: ['test-coin', 'test-coin-1', 'test-coin-2'] } });
  });
});
