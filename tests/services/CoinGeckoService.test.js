const { expect } = require('chai');
const CoinGeckoService = require('../../src/services/CoinGeckoService');

// 테스트 설정 파일 import
require('../setup');

describe('CoinGeckoService', () => {
  let coinGeckoService;

  beforeAll(() => {
    coinGeckoService = new CoinGeckoService();
  });

  // 테스트 타임아웃을 2분으로 설정
  jest.setTimeout(120000);

  describe('getAllCoinsList', () => {
    it('should return list of all coins', async () => {
      const coins = await coinGeckoService.getAllCoinsList();
      
      expect(coins).to.be.an('array');
      expect(coins.length).to.be.greaterThan(0);
      
      // 첫 번째 코인이 올바른 구조를 가지는지 확인
      const firstCoin = coins[0];
      expect(firstCoin).to.have.property('id');
      expect(firstCoin).to.have.property('symbol');
      expect(firstCoin).to.have.property('name');
    });

    it('should return coins with correct data types', async () => {
      const coins = await coinGeckoService.getAllCoinsList();
      
      if (coins.length > 0) {
        const coin = coins[0];
        expect(coin.id).to.be.a('string');
        expect(coin.symbol).to.be.a('string');
        expect(coin.name).to.be.a('string');
      }
    });
  });

  describe('getMarketDataBatch', () => {
    it('should return market data for specified coins', async () => {
      const marketData = await coinGeckoService.getMarketDataBatch(1, 10);
      
      expect(marketData).to.be.an('array');
      expect(marketData.length).to.be.at.most(10);
      
      if (marketData.length > 0) {
        const coin = marketData[0];
        expect(coin).to.have.property('id');
        expect(coin).to.have.property('symbol');
        expect(coin).to.have.property('name');
        expect(coin).to.have.property('current_price');
        expect(coin).to.have.property('market_cap');
        expect(coin).to.have.property('market_cap_rank');
        expect(coin).to.have.property('total_volume');
      }
    });

    it('should return data with correct data types', async () => {
      const marketData = await coinGeckoService.getMarketDataBatch(1, 5);
      
      if (marketData.length > 0) {
        const coin = marketData[0];
        expect(coin.id).to.be.a('string');
        expect(coin.symbol).to.be.a('string');
        expect(coin.name).to.be.a('string');
        expect(coin.current_price).to.be.a('number');
        expect(coin.market_cap).to.be.a('number');
        expect(coin.market_cap_rank).to.be.a('number');
        expect(coin.total_volume).to.be.a('number');
      }
    });

    it('should handle different page numbers', async () => {
      const page1 = await coinGeckoService.getMarketDataBatch(1, 5);
      const page2 = await coinGeckoService.getMarketDataBatch(2, 5);
      
      expect(page1).to.be.an('array');
      expect(page2).to.be.an('array');
      
      // 페이지가 다르면 다른 데이터를 반환해야 함
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).to.not.equal(page2[0].id);
      }
    });

    it('should respect limit parameter', async () => {
      const marketData = await coinGeckoService.getMarketDataBatch(1, 3);
      
      expect(marketData).to.be.an('array');
      expect(marketData.length).to.be.at.most(3);
    });
  });

  describe('getCoinDetails', () => {
    it('should return detailed information for specific coin', async () => {
      const coinDetails = await coinGeckoService.getCoinDetails('bitcoin');
      
      expect(coinDetails).to.be.an('object');
      expect(coinDetails).to.have.property('id', 'bitcoin');
      expect(coinDetails).to.have.property('symbol', 'btc');
      expect(coinDetails).to.have.property('name', 'Bitcoin');
      expect(coinDetails).to.have.property('market_data');
    });

    it('should return market data with correct structure', async () => {
      const coinDetails = await coinGeckoService.getCoinDetails('bitcoin');
      
      expect(coinDetails.market_data).to.be.an('object');
      expect(coinDetails.market_data).to.have.property('current_price');
      expect(coinDetails.market_data).to.have.property('market_cap');
      expect(coinDetails.market_data).to.have.property('total_volume');
      expect(coinDetails.market_data).to.have.property('price_change_percentage_24h');
    });

    it('should return price data in USD', async () => {
      const coinDetails = await coinGeckoService.getCoinDetails('bitcoin');
      
      expect(coinDetails.market_data.current_price).to.be.an('object');
      expect(coinDetails.market_data.current_price).to.have.property('usd');
      expect(coinDetails.market_data.current_price.usd).to.be.a('number');
    });

    it('should handle non-existent coin', async () => {
      try {
        await coinGeckoService.getCoinDetails('non-existent-coin');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe('getCoinHistory', () => {
    it('should return price history for specific coin', async () => {
      const history = await coinGeckoService.getCoinHistory('bitcoin', 7);
      
      expect(history).to.be.an('object');
      expect(history).to.have.property('prices');
      expect(history).to.have.property('market_caps');
      expect(history).to.have.property('total_volumes');
      
      expect(history.prices).to.be.an('array');
      expect(history.market_caps).to.be.an('array');
      expect(history.total_volumes).to.be.an('array');
    });

    it('should return data with correct structure', async () => {
      const history = await coinGeckoService.getCoinHistory('bitcoin', 7);
      
      if (history.prices.length > 0) {
        const pricePoint = history.prices[0];
        expect(pricePoint).to.be.an('array');
        expect(pricePoint).to.have.length(2);
        expect(pricePoint[0]).to.be.a('number'); // timestamp
        expect(pricePoint[1]).to.be.a('number'); // price
      }
    });

    it('should handle different time periods', async () => {
      const history1 = await coinGeckoService.getCoinHistory('bitcoin', 1);
      const history7 = await coinGeckoService.getCoinHistory('bitcoin', 7);
      
      expect(history1.prices).to.be.an('array');
      expect(history7.prices).to.be.an('array');
      
      // 7일 데이터가 1일 데이터보다 많아야 함
      expect(history7.prices.length).to.be.greaterThan(history1.prices.length);
    });
  });

  describe('searchCoins', () => {
    it('should return search results for valid query', async () => {
      const results = await coinGeckoService.searchCoins('bitcoin');
      
      expect(results).to.be.an('object');
      expect(results).to.have.property('coins');
      expect(results.coins).to.be.an('array');
      
      if (results.coins.length > 0) {
        const coin = results.coins[0];
        expect(coin).to.have.property('id');
        expect(coin).to.have.property('name');
        expect(coin).to.have.property('symbol');
      }
    });

    it('should return empty results for non-existent query', async () => {
      const results = await coinGeckoService.searchCoins('non-existent-coin-xyz');
      
      expect(results).to.be.an('object');
      expect(results).to.have.property('coins');
      expect(results.coins).to.be.an('array');
      expect(results.coins.length).to.equal(0);
    });

    it('should be case insensitive', async () => {
      const results1 = await coinGeckoService.searchCoins('bitcoin');
      const results2 = await coinGeckoService.searchCoins('BITCOIN');
      
      expect(results1.coins).to.be.an('array');
      expect(results2.coins).to.be.an('array');
      expect(results1.coins.length).to.equal(results2.coins.length);
    });
  });

  describe('API rate limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(coinGeckoService.getMarketDataBatch(1, 1));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).to.be.an('array');
      expect(results.length).to.equal(5);
      
      results.forEach(result => {
        expect(result).to.be.an('array');
      });
    });
  });
});
