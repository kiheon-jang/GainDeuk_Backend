require('dotenv').config();
const axios = require('axios');

async function debugEtherscan() {
  console.log('=== Etherscan API 디버깅 ===');
  console.log('API Key:', process.env.ETHERSCAN_API_KEY ? '설정됨' : '미설정');
  console.log('API Key 길이:', process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.length : 0);
  console.log('API Key 앞 10자리:', process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.substring(0, 10) + '...' : 'N/A');
  console.log('');
  
  try {
    console.log('1. 기본 ethsupply 요청 테스트...');
    const response1 = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'stats',
        action: 'ethsupply',
        apikey: process.env.ETHERSCAN_API_KEY
      }
    });
    
    console.log('응답 상태:', response1.status);
    console.log('응답 데이터:', JSON.stringify(response1.data, null, 2));
    
  } catch (error) {
    console.error('1번 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
  
  console.log('\n2. 간단한 account balance 요청 테스트...');
  try {
    const response2 = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Vitalik의 주소
        tag: 'latest',
        apikey: process.env.ETHERSCAN_API_KEY
      }
    });
    
    console.log('응답 상태:', response2.status);
    console.log('응답 데이터:', JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    console.error('2번 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
  
  console.log('\n3. API 키 없이 요청 테스트...');
  try {
    const response3 = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'stats',
        action: 'ethsupply'
      }
    });
    
    console.log('응답 상태:', response3.status);
    console.log('응답 데이터:', JSON.stringify(response3.data, null, 2));
    
  } catch (error) {
    console.error('3번 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

debugEtherscan().catch(console.error);
