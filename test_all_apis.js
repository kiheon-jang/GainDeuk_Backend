require('dotenv').config();
const axios = require('axios');

async function testAllAPIs() {
  console.log('🔍 모든 API 키 테스트 시작...\n');
  
  // 1. CoinGecko API 테스트
  console.log('1️⃣ CoinGecko API 테스트:');
  console.log('API Key:', process.env.COINGECKO_API_KEY ? '설정됨' : '설정되지 않음');
  
  try {
    const coingeckoResponse = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin', {
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
    
    const btc = coingeckoResponse.data;
    console.log('✅ CoinGecko API 성공!');
    console.log('비트코인 가격:', btc.market_data?.current_price?.usd || '가격 정보 없음');
    
  } catch (error) {
    console.log('❌ CoinGecko API 실패:', error.message);
  }
  
  // 2. Etherscan API 테스트
  console.log('\n2️⃣ Etherscan API 테스트:');
  console.log('API Key:', process.env.ETHERSCAN_API_KEY ? '설정됨' : '설정되지 않음');
  
  try {
    const etherscanResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'stats',
        action: 'ethsupply',
        apikey: process.env.ETHERSCAN_API_KEY
      },
      timeout: 10000
    });
    
    console.log('✅ Etherscan API 성공!');
    console.log('ETH 공급량:', etherscanResponse.data.result || '데이터 없음');
    
  } catch (error) {
    console.log('❌ Etherscan API 실패:', error.message);
  }
  
  // 3. RSS2JSON API 테스트
  console.log('\n3️⃣ RSS2JSON API 테스트:');
  console.log('API Key:', process.env.RSS2JSON_API_KEY ? '설정됨' : '설정되지 않음');
  
  try {
    const rssResponse = await axios.get('https://api.rss2json.com/v1/api.json', {
      params: {
        rss_url: 'https://cointelegraph.com/rss',
        api_key: process.env.RSS2JSON_API_KEY,
        count: 1
      },
      timeout: 10000
    });
    
    console.log('✅ RSS2JSON API 성공!');
    console.log('뉴스 제목:', rssResponse.data.items?.[0]?.title || '뉴스 없음');
    
  } catch (error) {
    console.log('❌ RSS2JSON API 실패:', error.message);
  }
  
  // 4. Firebase API 테스트
  console.log('\n4️⃣ Firebase API 테스트:');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID || '설정되지 않음');
  console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL || '설정되지 않음');
  console.log('Private Key:', process.env.FIREBASE_PRIVATE_KEY ? '설정됨' : '설정되지 않음');
  
  // Firebase는 인증이 필요하므로 간단한 연결 테스트만
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('✅ Firebase 설정 완료!');
  } else {
    console.log('❌ Firebase 설정 불완전');
  }
  
  console.log('\n🎉 모든 API 테스트 완료!');
}

testAllAPIs();
