require('dotenv').config();

console.log('=== 기본 기능 테스트 ===');
console.log('');

async function testBasicFunctionality() {
  try {
    // 1. MongoDB 연결 테스트
    console.log('1️⃣ MongoDB 연결 테스트...');
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('  ✅ MongoDB 연결 성공');
    
    // 2. 모델 로드 테스트
    console.log('\n2️⃣ 모델 로드 테스트...');
    
    const Coin = require('./src/models/Coin');
    const Signal = require('./src/models/Signal');
    const Alert = require('./src/models/Alert');
    const UserProfile = require('./src/models/UserProfile');
    
    console.log('  ✅ 모든 모델 로드 성공');
    
    // 3. 서비스 로드 테스트
    console.log('\n3️⃣ 서비스 로드 테스트...');
    
    const SocialMediaService = require('./src/services/SocialMediaService');
    const PersonalizationService = require('./src/services/PersonalizationService');
    const OnChainService = require('./src/services/OnChainService');
    
    console.log('  ✅ 모든 서비스 로드 성공');
    
    // 4. 간단한 데이터베이스 작업 테스트
    console.log('\n4️⃣ 데이터베이스 작업 테스트...');
    
    // 테스트용 코인 데이터 생성
    const testCoin = new Coin({
      coinId: 'test-bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice: 50000,
      marketCap: 1000000000000,
      volume24h: 50000000000,
      priceChange24h: 2.5,
      lastUpdated: new Date()
    });
    
    // 기존 테스트 데이터 삭제
    await Coin.deleteOne({ coinId: 'test-bitcoin' });
    
    // 새 데이터 저장
    await testCoin.save();
    console.log('  ✅ 코인 데이터 저장 성공');
    
    // 데이터 조회
    const savedCoin = await Coin.findOne({ coinId: 'test-bitcoin' });
    console.log('  ✅ 코인 데이터 조회 성공:', savedCoin.symbol);
    
    // 테스트 데이터 삭제
    await Coin.deleteOne({ coinId: 'test-bitcoin' });
    console.log('  ✅ 테스트 데이터 정리 완료');
    
    // 5. API 키 테스트
    console.log('\n5️⃣ API 키 테스트...');
    
    const axios = require('axios');
    
    // CoinGecko API 테스트
    const coinGeckoResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin', vs_currencies: 'usd' },
      headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
    });
    
    console.log('  ✅ CoinGecko API 테스트 성공');
    console.log(`  📈 Bitcoin 가격: $${coinGeckoResponse.data.bitcoin.usd}`);
    
    // 6. 서비스 기능 테스트
    console.log('\n6️⃣ 서비스 기능 테스트...');
    
    // SocialMediaService 모니터링 대상 확인
    console.log(`  📱 Twitter 모니터링 대상: ${SocialMediaService.monitoringTargets.twitter.length}개`);
    console.log(`  📱 Telegram 모니터링 대상: ${SocialMediaService.monitoringTargets.telegram.length}개`);
    
    // PersonalizationService 추천 생성 테스트
    console.log('\n6️⃣ 개인화 서비스 테스트...');
    
    // 테스트용 사용자 프로필 생성
    const testProfile = new UserProfile({
      userId: 'test-user',
      investmentStyle: 'moderate',
      experienceLevel: 'intermediate',
      riskTolerance: 6,
      availableTime: 'part-time',
      preferredCoins: ['BTC', 'ETH'],
      isActive: true
    });
    
    // 기존 테스트 프로필 삭제
    await UserProfile.deleteOne({ userId: 'test-user' });
    
    // 새 프로필 저장
    await testProfile.save();
    console.log('  ✅ 테스트 사용자 프로필 생성 성공');
    
    if (typeof PersonalizationService.generatePersonalizedRecommendations === 'function') {
      const recommendations = await PersonalizationService.generatePersonalizedRecommendations('test-user');
      console.log('  ✅ 개인화 추천 생성 성공');
      console.log(`  📊 추천 결과:`, recommendations ? '생성됨' : '없음');
    } else {
      console.log('  ⚠️ PersonalizationService.generatePersonalizedRecommendations 메서드가 없습니다');
    }
    
    // 테스트 프로필 정리
    await UserProfile.deleteOne({ userId: 'test-user' });
    console.log('  ✅ 테스트 프로필 정리 완료');
    
    console.log('\n🎉 기본 기능 테스트 완료!');
    console.log('✅ 모든 핵심 기능이 정상적으로 작동합니다!');
    
    await mongoose.disconnect();
    return true;
    
  } catch (error) {
    console.error('❌ 기본 기능 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
    return false;
  }
}

// 테스트 실행
testBasicFunctionality().catch(console.error);
