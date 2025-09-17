require('dotenv').config();

console.log('🔍 API 키 확인:');
console.log('COINGECKO_API_KEY:', process.env.COINGECKO_API_KEY ? '설정됨' : '설정되지 않음');

// 간단한 API 호출
const axios = require('axios');

async function checkAPI() {
  try {
    console.log('\n📡 CoinGecko API 호출 중...');
    
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 1,
        page: 1,
        sparkline: false
      },
      headers: process.env.COINGECKO_API_KEY ? {
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
      } : {},
      timeout: 10000
    });
    
    const coin = response.data[0];
    console.log('\n✅ API 호출 성공!');
    console.log('첫 번째 코인:', {
      name: coin.name,
      current_price: coin.current_price,
      market_cap_rank: coin.market_cap_rank,
      symbol: coin.symbol
    });
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
  }
}

checkAPI();
