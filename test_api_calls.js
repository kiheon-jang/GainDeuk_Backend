require('dotenv').config();

console.log('=== 4단계: 실제 API 호출 테스트 ===');
console.log('');

async function testCoinGeckoAPI() {
  console.log('📊 CoinGecko API 테스트...');
  
  try {
    const axios = require('axios');
    
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum',
        vs_currencies: 'usd,krw',
        include_24hr_change: true
      },
      headers: {
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
      }
    });
    
    console.log('  ✅ CoinGecko API 호출 성공');
    console.log(`  📈 Bitcoin: $${response.data.bitcoin.usd} (${response.data.bitcoin.usd_24h_change.toFixed(2)}%)`);
    console.log(`  📈 Ethereum: $${response.data.ethereum.usd} (${response.data.ethereum.usd_24h_change.toFixed(2)}%)`);
    
    return true;
  } catch (error) {
    console.error('  ❌ CoinGecko API 호출 실패:', error.message);
    return false;
  }
}

async function testEtherscanAPI() {
  console.log('⛓️ Etherscan API 테스트...');
  
  try {
    const axios = require('axios');
    
    const response = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'stats',
        action: 'ethsupply',
        apikey: process.env.ETHERSCAN_API_KEY
      }
    });
    
    if (response.data.status === '1') {
      console.log('  ✅ Etherscan API 호출 성공');
      console.log(`  🔗 ETH 총 공급량: ${(parseInt(response.data.result) / 1e18).toFixed(2)} ETH`);
      return true;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('  ❌ Etherscan API 호출 실패:', error.message);
    return false;
  }
}

async function testOpenAIAPI() {
  console.log('🤖 OpenAI API 테스트...');
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: '비트코인에 대해 한 줄로 설명해주세요.'
        }
      ],
      max_tokens: 50
    });
    
    console.log('  ✅ OpenAI API 호출 성공');
    console.log(`  💬 AI 응답: ${response.choices[0].message.content}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ OpenAI API 호출 실패:', error.message);
    return false;
  }
}

async function testAnthropicAPI() {
  console.log('🧠 Anthropic API 테스트...');
  
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: '이더리움에 대해 한 줄로 설명해주세요.'
        }
      ]
    });
    
    console.log('  ✅ Anthropic API 호출 성공');
    console.log(`  💬 AI 응답: ${response.content[0].text}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Anthropic API 호출 실패:', error.message);
    return false;
  }
}

async function testAlchemyAPI() {
  console.log('🔮 Alchemy API 테스트...');
  
  try {
    const axios = require('axios');
    
    const response = await axios.post(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });
    
    if (response.data.result) {
      const blockNumber = parseInt(response.data.result, 16);
      console.log('  ✅ Alchemy API 호출 성공');
      console.log(`  🔗 최신 블록 번호: ${blockNumber.toLocaleString()}`);
      return true;
    } else {
      throw new Error('API 응답에 결과가 없습니다.');
    }
  } catch (error) {
    console.error('  ❌ Alchemy API 호출 실패:', error.message);
    return false;
  }
}

async function runAPITests() {
  console.log('🚀 실제 API 호출 테스트 시작...\n');
  
  const results = await Promise.allSettled([
    testCoinGeckoAPI(),
    testEtherscanAPI(),
    testOpenAIAPI(),
    testAnthropicAPI(),
    testAlchemyAPI()
  ]);
  
  console.log('\n=== API 호출 테스트 결과 ===');
  
  const testNames = ['CoinGecko', 'Etherscan', 'OpenAI', 'Anthropic', 'Alchemy'];
  let successCount = 0;
  
  results.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value ? '✅' : '❌';
    console.log(`${status} ${testNames[index]} API: ${result.status === 'fulfilled' ? '성공' : '실패'}`);
    if (result.status === 'fulfilled' && result.value) successCount++;
  });
  
  console.log(`\n📊 API 호출 테스트 결과: ${successCount}/${results.length} 성공`);
  
  if (successCount === results.length) {
    console.log('🎉 모든 API 호출 테스트가 성공적으로 완료되었습니다!');
  } else {
    console.log('⚠️ 일부 API 호출에서 문제가 발생했습니다.');
  }
}

// 테스트 실행
runAPITests().catch(console.error);
