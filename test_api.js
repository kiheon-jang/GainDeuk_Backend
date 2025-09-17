require('dotenv').config();
const CoinGeckoService = require('./src/services/CoinGeckoService');

async function testCoinGeckoAPI() {
  console.log('🔍 CoinGecko API 테스트 시작...');
  console.log('API Key:', process.env.COINGECKO_API_KEY ? '설정됨' : '설정되지 않음');
  
  const coinGeckoService = new CoinGeckoService();
  
  try {
    // 간단한 코인 목록 가져오기 테스트
    console.log('\n📊 코인 목록 가져오기 테스트...');
    const coins = await coinGeckoService.getMarketDataBatch(1, 5);
    console.log('✅ 성공! 가져온 코인 수:', coins.length);
    console.log('첫 번째 코인 정보:', {
      name: coins[0]?.name,
      current_price: coins[0]?.current_price,
      market_cap_rank: coins[0]?.market_cap_rank,
      symbol: coins[0]?.symbol
    });
    
    // 특정 코인 상세 정보 테스트
    console.log('\n💰 비트코인 상세 정보 테스트...');
    const btc = await coinGeckoService.getCoinDetails('bitcoin');
    console.log('✅ 성공! 비트코인 정보:');
    console.log('가격 관련 필드들:', {
      name: btc.name,
      current_price_usd: btc.market_data?.current_price?.usd,
      current_price_krw: btc.market_data?.current_price?.krw,
      market_cap_rank: btc.market_data?.market_cap_rank
    });
    
    // 디버깅을 위해 전체 구조 확인
    console.log('market_data 존재:', !!btc.market_data);
    if (btc.market_data) {
      console.log('current_price 존재:', !!btc.market_data.current_price);
      if (btc.market_data.current_price) {
        console.log('USD 가격:', btc.market_data.current_price.usd);
        console.log('KRW 가격:', btc.market_data.current_price.krw);
      }
    }
    
    // 디버깅을 위해 전체 구조 확인
    console.log('market_data 존재:', !!btc.market_data);
    if (btc.market_data) {
      console.log('current_price 존재:', !!btc.market_data.current_price);
      if (btc.market_data.current_price) {
        console.log('USD 가격:', btc.market_data.current_price.usd);
        console.log('KRW 가격:', btc.market_data.current_price.krw);
      }
    }
    
    // 실제 가격이 있는지 확인
    if (btc.market_data?.current_price?.usd) {
      console.log('✅ USD 가격:', btc.market_data.current_price.usd);
      console.log('✅ KRW 가격:', btc.market_data.current_price.krw);
    } else {
      console.log('❌ USD 가격을 찾을 수 없습니다');
      console.log('market_data 구조:', JSON.stringify(btc.market_data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testCoinGeckoAPI();
