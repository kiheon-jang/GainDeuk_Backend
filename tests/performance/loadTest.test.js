const request = require('supertest');
const app = require('../../src/app');
const { performance } = require('perf_hooks');

describe('Load Testing', () => {
  let loadTestResults = {};

  afterAll(() => {
    // 부하 테스트 결과 출력
    console.log('\n=== Load Test Results ===');
    Object.entries(loadTestResults).forEach(([test, result]) => {
      console.log(`${test}:`);
      console.log(`  - Total Requests: ${result.totalRequests}`);
      console.log(`  - Successful Requests: ${result.successfulRequests}`);
      console.log(`  - Failed Requests: ${result.failedRequests}`);
      console.log(`  - Success Rate: ${result.successRate}%`);
      console.log(`  - Average Response Time: ${result.averageResponseTime}ms`);
      console.log(`  - Max Response Time: ${result.maxResponseTime}ms`);
      console.log(`  - Requests Per Second: ${result.requestsPerSecond}`);
      console.log('');
    });
  });

  describe('점진적 부하 테스트', () => {
    it('1-10-50-100 동시 사용자 부하 테스트를 수행해야 함', async () => {
      const userLevels = [1, 10, 50, 100];
      
      for (const userCount of userLevels) {
        const result = await performLoadTest(userCount, 100); // 각 레벨당 100개 요청
        loadTestResults[`${userCount} Concurrent Users`] = result;
        
        // 성공률이 95% 이상이어야 함
        expect(result.successRate).toBeGreaterThanOrEqual(95);
        
        // 평균 응답 시간이 1초 이하여야 함
        expect(result.averageResponseTime).toBeLessThan(1000);
      }
    });

    it('지속적인 부하 테스트를 수행해야 함', async () => {
      const duration = 30000; // 30초
      const requestsPerSecond = 10;
      const totalRequests = duration / 1000 * requestsPerSecond;
      
      const result = await performSustainedLoadTest(requestsPerSecond, duration);
      loadTestResults['Sustained Load (30s)'] = result;
      
      // 성공률이 90% 이상이어야 함
      expect(result.successRate).toBeGreaterThanOrEqual(90);
      
      // 평균 응답 시간이 2초 이하여야 함
      expect(result.averageResponseTime).toBeLessThan(2000);
    });
  });

  describe('API별 부하 테스트', () => {
    it('헬스 체크 API 부하 테스트를 수행해야 함', async () => {
      const result = await performAPILoadTest('/api/health', 'GET', 200, 1000);
      loadTestResults['Health Check API Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(99);
      expect(result.averageResponseTime).toBeLessThan(100);
    });

    it('암호화폐 데이터 API 부하 테스트를 수행해야 함', async () => {
      const result = await performAPILoadTest('/api/coins', 'GET', 200, 500);
      loadTestResults['Coins API Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(95);
      expect(result.averageResponseTime).toBeLessThan(500);
    });

    it('신호 생성 API 부하 테스트를 수행해야 함', async () => {
      const result = await performAPILoadTest('/api/signals', 'POST', 201, 300, {
        symbol: 'BTC',
        type: 'buy',
        strength: 0.8,
        source: 'load_test'
      });
      loadTestResults['Signal Creation API Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(90);
      expect(result.averageResponseTime).toBeLessThan(800);
    });

    it('사용자 프로필 API 부하 테스트를 수행해야 함', async () => {
      const result = await performAPILoadTest('/api/user-profiles', 'POST', 201, 200, {
        userId: 'load_test_user',
        investmentStyle: 'balanced',
        experienceLevel: 'intermediate',
        riskTolerance: 0.6
      });
      loadTestResults['User Profile API Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(90);
      expect(result.averageResponseTime).toBeLessThan(1000);
    });

    it('데이터 품질 검증 API 부하 테스트를 수행해야 함', async () => {
      const result = await performAPILoadTest('/api/data-quality/validate', 'POST', 200, 1000, {
        data: 45000,
        dataType: 'price'
      });
      loadTestResults['Data Quality API Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(95);
      expect(result.averageResponseTime).toBeLessThan(200);
    });
  });

  describe('스트레스 테스트', () => {
    it('시스템 한계점을 찾는 스트레스 테스트를 수행해야 함', async () => {
      const maxConcurrentUsers = 200;
      const requestsPerUser = 50;
      
      const result = await performStressTest(maxConcurrentUsers, requestsPerUser);
      loadTestResults['Stress Test (200 users)'] = result;
      
      // 스트레스 테스트에서는 80% 이상 성공률을 목표로 함
      expect(result.successRate).toBeGreaterThanOrEqual(80);
      
      // 시스템이 완전히 다운되지 않아야 함
      expect(result.successfulRequests).toBeGreaterThan(0);
    });

    it('메모리 스트레스 테스트를 수행해야 함', async () => {
      const initialMemory = process.memoryUsage();
      
      // 대량의 데이터를 생성하여 메모리 스트레스 테스트
      const result = await performMemoryStressTest();
      loadTestResults['Memory Stress Test'] = result;
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // 메모리 증가가 200MB 이하여야 함
      expect(memoryIncreaseMB).toBeLessThan(200);
      
      // 시스템이 정상적으로 응답해야 함
      expect(result.successRate).toBeGreaterThanOrEqual(70);
    });
  });

  describe('스파이크 테스트', () => {
    it('갑작스러운 트래픽 증가에 대한 스파이크 테스트를 수행해야 함', async () => {
      // 정상 트래픽 (10 req/s) -> 스파이크 (100 req/s) -> 정상 트래픽
      const result = await performSpikeTest();
      loadTestResults['Spike Test'] = result;
      
      // 스파이크 중에도 80% 이상 성공률을 유지해야 함
      expect(result.successRate).toBeGreaterThanOrEqual(80);
      
      // 시스템이 복구되어야 함
      expect(result.recoveryTime).toBeLessThan(10000); // 10초 이내 복구
    });
  });

  describe('데이터베이스 부하 테스트', () => {
    it('데이터베이스 쓰기 부하 테스트를 수행해야 함', async () => {
      const result = await performDatabaseWriteLoadTest();
      loadTestResults['Database Write Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(90);
      expect(result.averageResponseTime).toBeLessThan(1000);
    });

    it('데이터베이스 읽기 부하 테스트를 수행해야 함', async () => {
      const result = await performDatabaseReadLoadTest();
      loadTestResults['Database Read Load'] = result;
      
      expect(result.successRate).toBeGreaterThanOrEqual(95);
      expect(result.averageResponseTime).toBeLessThan(500);
    });
  });

  // 헬퍼 함수들
  async function performLoadTest(concurrentUsers, requestsPerUser) {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const promises = Array.from({ length: concurrentUsers }, async () => {
      for (let i = 0; i < requestsPerUser; i++) {
        const requestStart = performance.now();
        
        try {
          await request(app)
            .get('/api/health')
            .expect(200);
          
          const requestEnd = performance.now();
          results.successfulRequests++;
          results.responseTimes.push(requestEnd - requestStart);
        } catch (error) {
          results.failedRequests++;
        }
        
        results.totalRequests++;
      }
    });

    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performSustainedLoadTest(requestsPerSecond, duration) {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const interval = 1000 / requestsPerSecond; // 요청 간격 (ms)
    
    while (performance.now() - startTime < duration) {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
      
      // 다음 요청까지 대기
      const elapsed = performance.now() - startTime;
      const nextRequestTime = results.totalRequests * interval;
      if (nextRequestTime > elapsed) {
        await new Promise(resolve => setTimeout(resolve, nextRequestTime - elapsed));
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performAPILoadTest(endpoint, method, expectedStatus, requestCount, data = null) {
    const startTime = performance.now();
    const results = {
      totalRequests: requestCount,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const promises = Array.from({ length: requestCount }, async (_, i) => {
      const requestStart = performance.now();
      
      try {
        let response;
        if (method === 'GET') {
          response = await request(app).get(endpoint);
        } else if (method === 'POST') {
          response = await request(app).post(endpoint).send(data);
        }
        
        if (response.status === expectedStatus) {
          results.successfulRequests++;
        } else {
          results.failedRequests++;
        }
        
        const requestEnd = performance.now();
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
    });

    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performStressTest(maxConcurrentUsers, requestsPerUser) {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    // 점진적으로 사용자 수를 증가시키며 테스트
    const userLevels = [10, 25, 50, 100, 150, maxConcurrentUsers];
    
    for (const userCount of userLevels) {
      const promises = Array.from({ length: userCount }, async () => {
        for (let i = 0; i < requestsPerUser; i++) {
          const requestStart = performance.now();
          
          try {
            await request(app)
              .get('/api/health')
              .expect(200);
            
            const requestEnd = performance.now();
            results.successfulRequests++;
            results.responseTimes.push(requestEnd - requestStart);
          } catch (error) {
            results.failedRequests++;
          }
          
          results.totalRequests++;
        }
      });

      await Promise.all(promises);
      
      // 각 레벨 사이에 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performMemoryStressTest() {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    // 대량의 데이터를 생성하여 메모리 스트레스 테스트
    const stressRequests = 1000;
    
    for (let i = 0; i < stressRequests; i++) {
      const requestStart = performance.now();
      
      try {
        // 대용량 데이터를 포함한 요청
        await request(app)
          .post('/api/signals')
          .send({
            symbol: 'BTC',
            type: 'buy',
            strength: Math.random(),
            source: `memory_stress_test_${i}`,
            metadata: {
              largeData: Array.from({ length: 1000 }, (_, j) => `data_${j}`)
            }
          })
          .expect(201);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performSpikeTest() {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      recoveryTime: 0
    };

    // 1단계: 정상 트래픽 (10 req/s, 10초)
    const normalTrafficStart = performance.now();
    while (performance.now() - normalTrafficStart < 10000) {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
      await new Promise(resolve => setTimeout(resolve, 100)); // 10 req/s
    }

    // 2단계: 스파이크 트래픽 (100 req/s, 5초)
    const spikeStart = performance.now();
    const spikePromises = Array.from({ length: 500 }, async () => {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
    });

    await Promise.all(spikePromises);
    const spikeEnd = performance.now();
    
    // 3단계: 복구 확인 (정상 트래픽, 10초)
    const recoveryStart = performance.now();
    while (performance.now() - recoveryStart < 10000) {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
      await new Promise(resolve => setTimeout(resolve, 100)); // 10 req/s
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    results.recoveryTime = spikeEnd - spikeStart;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000),
      recoveryTime: results.recoveryTime
    };
  }

  async function performDatabaseWriteLoadTest() {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const writeRequests = 500;
    
    for (let i = 0; i < writeRequests; i++) {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .post('/api/signals')
          .send({
            symbol: 'BTC',
            type: 'buy',
            strength: Math.random(),
            source: `db_write_test_${i}`
          })
          .expect(201);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }

  async function performDatabaseReadLoadTest() {
    const startTime = performance.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const readRequests = 1000;
    
    for (let i = 0; i < readRequests; i++) {
      const requestStart = performance.now();
      
      try {
        await request(app)
          .get('/api/signals')
          .query({ limit: 10 })
          .expect(200);
        
        const requestEnd = performance.now();
        results.successfulRequests++;
        results.responseTimes.push(requestEnd - requestStart);
      } catch (error) {
        results.failedRequests++;
      }
      
      results.totalRequests++;
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      averageResponseTime: results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length,
      maxResponseTime: Math.max(...results.responseTimes),
      requestsPerSecond: results.totalRequests / (totalTime / 1000)
    };
  }
});
