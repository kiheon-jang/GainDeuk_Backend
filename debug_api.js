require('dotenv').config();
const axios = require('axios');

async function debugAPI() {
  console.log('🔍 CoinGecko API 직접 디버깅...');
  
  try {
    // /coins/bitcoin 엔드포인트 직접 호출
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
    console.log('\n📊 비트코인 데이터 구조:');
    console.log('- name:', data.name);
    console.log('- id:', data.id);
    console.log('- market_data 존재:', !!data.market_data);
    
    if (data.market_data) {
      console.log('- current_price 존재:', !!data.market_data.current_price);
      if (data.market_data.current_price) {
        console.log('- USD 가격:', data.market_data.current_price.usd);
        console.log('- KRW 가격:', data.market_data.current_price.krw);
      } else {
        console.log('❌ current_price가 없습니다');
      }
    } else {
      console.log('❌ market_data가 없습니다');
    }
    
    // 전체 market_data 구조 확인
    console.log('\n🔍 market_data 전체 구조:');
    console.log(JSON.stringify(data.market_data, null, 2));
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

debugAPI();
