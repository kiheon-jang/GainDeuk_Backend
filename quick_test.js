require('dotenv').config();

console.log('🔍 API 키 확인:');
console.log('COINGECKO_API_KEY:', process.env.COINGECKO_API_KEY ? '설정됨' : '설정되지 않음');

// 간단한 API 호출 테스트
const axios = require('axios');

async function quickTest() {
  try {
    console.log('\n📡 CoinGecko API 호출 중...');
    
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
      } : {},
      timeout: 10000
    });
    
    const data = response.data;
    console.log('\n✅ API 호출 성공!');
    console.log('응답 상태:', response.status);
    console.log('\n📊 비트코인 데이터:');
    console.log('- name:', data.name);
    console.log('- id:', data.id);
    console.log('- market_data 존재:', !!data.market_data);
    
    if (data.market_data) {
      console.log('- current_price 존재:', !!data.market_data.current_price);
      if (data.market_data.current_price) {
        console.log('- USD 가격:', data.market_data.current_price.usd);
        console.log('- KRW 가격:', data.market_data.current_price.krw);
      }
      console.log('- market_cap_rank:', data.market_data.market_cap_rank);
    }
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

quickTest();
