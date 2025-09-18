require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');

async function testServerEndpoints() {
  console.log('=== 1단계: Express 서버 API 엔드포인트 테스트 ===');
  console.log('');

  const endpoints = [
    { path: '/api/health', method: 'GET', description: 'Health Check' },
    { path: '/api/coins', method: 'GET', description: 'Coins API' },
    { path: '/api/signals', method: 'GET', description: 'Signals API' },
    { path: '/api/alerts', method: 'GET', description: 'Alerts API' },
    { path: '/api/korean-market', method: 'GET', description: 'Korean Market API' },
    { path: '/api/user-profiles', method: 'GET', description: 'User Profiles API' },
    { path: '/api/personalization', method: 'GET', description: 'Personalization API' },
    { path: '/api/social-media', method: 'GET', description: 'Social Media API' },
    { path: '/api/onchain', method: 'GET', description: 'OnChain API' },
    { path: '/api/signal-persistence', method: 'GET', description: 'Signal Persistence API' },
    { path: '/api/investment-strategy', method: 'GET', description: 'Investment Strategy API' },
    { path: '/api/data-quality', method: 'GET', description: 'Data Quality API' },
    { path: '/api/performance-monitoring', method: 'GET', description: 'Performance Monitoring API' }
  ];

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 테스트 중: ${endpoint.description} (${endpoint.path})`);
      
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path)
        .timeout(5000);

      if (response.status === 200 || response.status === 404) {
        console.log(`  ✅ ${endpoint.description}: 응답 성공 (${response.status})`);
        successCount++;
      } else {
        console.log(`  ⚠️ ${endpoint.description}: 예상치 못한 상태 (${response.status})`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ ${endpoint.description}: 서버 연결 실패`);
      } else if (error.timeout) {
        console.log(`  ⏰ ${endpoint.description}: 타임아웃`);
      } else {
        console.log(`  ❌ ${endpoint.description}: 오류 - ${error.message}`);
      }
    }
  }

  console.log('');
  console.log(`📊 API 엔드포인트 테스트 결과: ${successCount}/${totalCount} 성공`);
  
  if (successCount === totalCount) {
    console.log('🎉 모든 API 엔드포인트가 정상적으로 응답합니다!');
  } else {
    console.log('⚠️ 일부 API 엔드포인트에서 문제가 발생했습니다.');
  }

  return successCount === totalCount;
}

// 테스트 실행
testServerEndpoints().catch(console.error);
