require('dotenv').config();

console.log('=== 1단계: API 키 설정 확인 ===');
console.log('');

// 모든 API 키 확인
const apis = {
  'OpenAI': process.env.OPENAI_API_KEY,
  'Anthropic': process.env.ANTHROPIC_API_KEY,
  'Twitter': process.env.TWITTER_BEARER_TOKEN,
  'Telegram': process.env.TELEGRAM_BOT_TOKEN,
  'Alchemy': process.env.ALCHEMY_API_KEY,
  'Moralis': process.env.MORALIS_API_KEY,
  'CoinGecko': process.env.COINGECKO_API_KEY,
  'Etherscan': process.env.ETHERSCAN_API_KEY,
  'Firebase': process.env.FIREBASE_PROJECT_ID
};

let allKeysSet = true;
Object.entries(apis).forEach(([name, key]) => {
  const status = key ? '✅' : '❌';
  console.log(`  ${status} ${name}: ${key ? '설정됨' : '미설정'}`);
  if (!key) allKeysSet = false;
});

console.log('');
console.log(`📊 전체 API 키 설정 상태: ${allKeysSet ? '✅ 모든 키 설정됨' : '❌ 일부 키 누락'}`);

// 서비스 로드 테스트
console.log('');
console.log('=== 2단계: 서비스 로드 테스트 ===');

try {
  const SocialMediaService = require('./src/services/SocialMediaService');
  console.log('✅ SocialMediaService 로드 성공');
  
  const PersonalizationService = require('./src/services/PersonalizationService');
  console.log('✅ PersonalizationService 로드 성공');
  
  const OnChainService = require('./src/services/OnChainService');
  console.log('✅ OnChainService 로드 성공');
  
  const SignalPersistenceService = require('./src/services/SignalPersistenceService');
  console.log('✅ SignalPersistenceService 로드 성공');
  
  const InvestmentStrategyService = require('./src/services/InvestmentStrategyService');
  console.log('✅ InvestmentStrategyService 로드 성공');
  
  const DataQualityService = require('./src/services/DataQualityService');
  console.log('✅ DataQualityService 로드 성공');
  
  const PerformanceMonitoringService = require('./src/services/PerformanceMonitoringService');
  console.log('✅ PerformanceMonitoringService 로드 성공');
  
  console.log('');
  console.log('🎉 모든 서비스가 성공적으로 로드되었습니다!');
  
} catch (error) {
  console.error('❌ 서비스 로드 실패:', error.message);
  process.exit(1);
}
