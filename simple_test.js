require('dotenv').config();
const axios = require('axios');

async function testCoinGeckoDirect() {
  console.log('🔍 CoinGecko API 직접 테스트...');
  console.log('API Key:', process.env.COINGECKO_API_KEY ? '설정됨' : '설정되지 않음');
  
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin', {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      },
      headers: process.env.COINGECKO_API_KEY ? {
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
      } : {}
    });
    
    const data = response.data;
    console.log('\n📊 비트코인 데이터 구조:');
    console.log('- name:', data.name);
    console.log('- current_price (직접):', data.current_price);
    console.log('- market_data.current_price.usd:', data.market_data?.current_price?.usd);
    console.log('- market_cap_rank:', data.market_cap_rank);
    console.log('- market_data.market_cap_rank:', data.market_data?.market_cap_rank);
    
    console.log('\n🔍 market_data 객체:');
    console.log(JSON.stringify(data.market_data, null, 2));
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testCoinGeckoDirect();
