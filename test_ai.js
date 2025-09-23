const SignalCalculatorService = require('./src/services/SignalCalculatorService');

async function test() {
  try {
    console.log('Testing AI analysis...');
    
    const service = new SignalCalculatorService();
    
    // 테스트용 가격 데이터
    const testData = {
      current_price: 50000,
      price_change_percentage_1h: 2.5,
      price_change_percentage_24h: 15.3,
      price_change_percentage_7d: 25.8,
      price_change_percentage_30d: 45.2,
      market_cap: 1000000000,
      market_cap_rank: 15,
      total_volume: 50000000,
      market_cap_change_percentage_24h: 12.5
    };
    
    const signal = await service.calculateSignal('test-coin', 'TEST', 'Test Coin', testData);
    console.log('AI Analysis Result:');
    console.log('Final Score:', signal.finalScore);
    console.log('Breakdown:', signal.breakdown);
    console.log('Recommendation:', signal.recommendation);
    console.log('Timeframe:', signal.timeframe);
    console.log('Priority:', signal.priority);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();

