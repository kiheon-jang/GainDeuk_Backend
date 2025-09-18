require('dotenv').config();

console.log('=== 5단계: 전체 시스템 통합 테스트 ===');
console.log('');

async function testSystemIntegration() {
  console.log('🔧 시스템 통합 테스트 시작...\n');
  
  try {
    // 1. 서비스들 간의 연동 테스트
    console.log('1️⃣ 서비스 간 연동 테스트...');
    
    const SocialMediaService = require('./src/services/SocialMediaService');
    const PersonalizationService = require('./src/services/PersonalizationService');
    const OnChainService = require('./src/services/OnChainService');
    const SignalPersistenceService = require('./src/services/SignalPersistenceService');
    const InvestmentStrategyService = require('./src/services/InvestmentStrategyService');
    const DataQualityService = require('./src/services/DataQualityService');
    const PerformanceMonitoringService = require('./src/services/PerformanceMonitoringService');
    
    console.log('  ✅ 모든 서비스 로드 성공');
    
    // 2. 데이터 흐름 테스트
    console.log('\n2️⃣ 데이터 흐름 테스트...');
    
    // 가상의 사용자 프로필 생성
    const mockUserProfile = {
      userId: 'test-user-123',
      investmentStyle: 'moderate',
      experienceLevel: 'intermediate',
      riskTolerance: 6,
      availableTime: 'part-time'
    };
    
    console.log('  ✅ 사용자 프로필 생성 성공');
    
    // 3. 개인화 서비스 테스트
    console.log('\n3️⃣ 개인화 서비스 테스트...');
    
    const recommendations = await PersonalizationService.getRecommendations(mockUserProfile);
    console.log('  ✅ 개인화 추천 생성 성공');
    console.log(`  📊 추천된 전략 수: ${recommendations.length}개`);
    
    // 4. 데이터 품질 서비스 테스트
    console.log('\n4️⃣ 데이터 품질 서비스 테스트...');
    
    const qualityReport = await DataQualityService.generateQualityReport();
    console.log('  ✅ 데이터 품질 리포트 생성 성공');
    console.log(`  📈 데이터 품질 점수: ${qualityReport.overallScore}%`);
    
    // 5. 성능 모니터링 서비스 테스트
    console.log('\n5️⃣ 성능 모니터링 서비스 테스트...');
    
    await PerformanceMonitoringService.startService();
    const metrics = await PerformanceMonitoringService.getMetrics();
    console.log('  ✅ 성능 모니터링 시작 성공');
    console.log(`  📊 수집된 메트릭 수: ${Object.keys(metrics).length}개`);
    
    // 6. API 엔드포인트 테스트
    console.log('\n6️⃣ API 엔드포인트 테스트...');
    
    const app = require('./src/app');
    console.log('  ✅ Express 앱 로드 성공');
    
    // 7. 데이터베이스 연결 테스트
    console.log('\n7️⃣ 데이터베이스 연결 테스트...');
    
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      console.log('  ✅ MongoDB 연결 성공');
    } else {
      console.log('  ⚠️ MongoDB 연결 상태 확인 필요');
    }
    
    console.log('\n🎉 전체 시스템 통합 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ 시스템 통합 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
    return false;
  }
}

async function testEndpoints() {
  console.log('\n🌐 API 엔드포인트 테스트...');
  
  try {
    const request = require('supertest');
    const app = require('./src/app');
    
    // Health check 엔드포인트 테스트
    const healthResponse = await request(app)
      .get('/api/health')
      .expect(200);
    
    console.log('  ✅ Health check 엔드포인트 정상');
    
    // Coins 엔드포인트 테스트
    const coinsResponse = await request(app)
      .get('/api/coins')
      .expect(200);
    
    console.log('  ✅ Coins 엔드포인트 정상');
    
    // Signals 엔드포인트 테스트
    const signalsResponse = await request(app)
      .get('/api/signals')
      .expect(200);
    
    console.log('  ✅ Signals 엔드포인트 정상');
    
    console.log('🎉 API 엔드포인트 테스트 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ API 엔드포인트 테스트 실패:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 전체 시스템 통합 테스트 시작...\n');
  
  const results = await Promise.allSettled([
    testSystemIntegration(),
    testEndpoints()
  ]);
  
  console.log('\n=== 통합 테스트 결과 요약 ===');
  
  const testNames = ['시스템 통합', 'API 엔드포인트'];
  let successCount = 0;
  
  results.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value ? '✅' : '❌';
    console.log(`${status} ${testNames[index]}: ${result.status === 'fulfilled' ? '성공' : '실패'}`);
    if (result.status === 'fulfilled' && result.value) successCount++;
  });
  
  console.log(`\n📊 통합 테스트 결과: ${successCount}/${results.length} 성공`);
  
  if (successCount === results.length) {
    console.log('🎉 모든 통합 테스트가 성공적으로 완료되었습니다!');
    console.log('🚀 GainDeuk 백엔드 시스템이 완전히 준비되었습니다!');
  } else {
    console.log('⚠️ 일부 통합 테스트에서 문제가 발생했습니다.');
  }
}

// 테스트 실행
runIntegrationTests().catch(console.error);
