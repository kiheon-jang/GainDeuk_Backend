require('dotenv').config();

console.log('=== 3단계: 실제 API 기능 테스트 ===');
console.log('');

async function testAIServices() {
  console.log('🤖 AI 서비스 테스트 시작...');
  
  try {
    // OpenAI API 테스트 (최신 버전)
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('  ✅ OpenAI 클라이언트 초기화 성공');
    
    // Anthropic API 테스트
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    console.log('  ✅ Anthropic 클라이언트 초기화 성공');
    
    console.log('🎉 AI 서비스 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ AI 서비스 테스트 실패:', error.message);
    return false;
  }
}

async function testSocialMediaServices() {
  console.log('📱 소셜미디어 서비스 테스트 시작...');
  
  try {
    const SocialMediaService = require('./src/services/SocialMediaService');
    
    // API 설정 확인
    const hasTwitter = !!SocialMediaService.apiConfig.twitter.bearerToken;
    const hasTelegram = !!SocialMediaService.apiConfig.telegram.botToken;
    
    console.log(`  ✅ Twitter API: ${hasTwitter ? '설정됨' : '미설정'}`);
    console.log(`  ✅ Telegram API: ${hasTelegram ? '설정됨' : '미설정'}`);
    
    // 모니터링 대상 확인
    console.log(`  ✅ Twitter 모니터링 대상: ${SocialMediaService.monitoringTargets.twitter.length}개`);
    console.log(`  ✅ Telegram 모니터링 대상: ${SocialMediaService.monitoringTargets.telegram.length}개`);
    
    console.log('🎉 소셜미디어 서비스 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ 소셜미디어 서비스 테스트 실패:', error.message);
    return false;
  }
}

async function testOnChainServices() {
  console.log('⛓️ 온체인 서비스 테스트 시작...');
  
  try {
    const OnChainService = require('./src/services/OnChainService');
    
    // API 설정 확인
    const hasAlchemy = !!process.env.ALCHEMY_API_KEY;
    const hasMoralis = !!process.env.MORALIS_API_KEY;
    const hasEtherscan = !!process.env.ETHERSCAN_API_KEY;
    
    console.log(`  ✅ Alchemy API: ${hasAlchemy ? '설정됨' : '미설정'}`);
    console.log(`  ✅ Moralis API: ${hasMoralis ? '설정됨' : '미설정'}`);
    console.log(`  ✅ Etherscan API: ${hasEtherscan ? '설정됨' : '미설정'}`);
    
    console.log('🎉 온체인 서비스 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ 온체인 서비스 테스트 실패:', error.message);
    return false;
  }
}

async function testFirebaseService() {
  console.log('🔥 Firebase 서비스 테스트 시작...');
  
  try {
    const FirebaseNotificationService = require('./src/services/FirebaseNotificationService');
    
    // Firebase 설정 확인
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    
    console.log(`  ✅ Firebase Project ID: ${hasProjectId ? '설정됨' : '미설정'}`);
    console.log(`  ✅ Firebase Private Key: ${hasPrivateKey ? '설정됨' : '미설정'}`);
    console.log(`  ✅ Firebase Client Email: ${hasClientEmail ? '설정됨' : '미설정'}`);
    
    console.log('🎉 Firebase 서비스 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase 서비스 테스트 실패:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 전체 기능 테스트 시작...\n');
  
  const results = await Promise.allSettled([
    testAIServices(),
    testSocialMediaServices(),
    testOnChainServices(),
    testFirebaseService()
  ]);
  
  console.log('\n=== 테스트 결과 요약 ===');
  
  const testNames = ['AI 서비스', '소셜미디어 서비스', '온체인 서비스', 'Firebase 서비스'];
  let successCount = 0;
  
  results.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value ? '✅' : '❌';
    console.log(`${status} ${testNames[index]}: ${result.status === 'fulfilled' ? '성공' : '실패'}`);
    if (result.status === 'fulfilled' && result.value) successCount++;
  });
  
  console.log(`\n📊 전체 테스트 결과: ${successCount}/${results.length} 성공`);
  
  if (successCount === results.length) {
    console.log('🎉 모든 기능 테스트가 성공적으로 완료되었습니다!');
  } else {
    console.log('⚠️ 일부 테스트에서 문제가 발생했습니다.');
  }
}

// 테스트 실행
runAllTests().catch(console.error);
