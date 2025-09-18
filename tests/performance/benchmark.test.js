const request = require('supertest');
const app = require('../../src/app');
const { performance } = require('perf_hooks');

describe('Performance Benchmark Tests', () => {
  let benchmarkResults = {};

  afterAll(() => {
    // 벤치마크 결과 출력
    console.log('\n=== Performance Benchmark Results ===');
    Object.entries(benchmarkResults).forEach(([test, result]) => {
      console.log(`${test}: ${result.averageTime}ms (avg), ${result.minTime}ms (min), ${result.maxTime}ms (max)`);
    });
  });

  describe('API 응답 시간 벤치마크', () => {
    it('헬스 체크 API 응답 시간을 측정해야 함', async () => {
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Health Check API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(100); // 평균 100ms 이내
      expect(maxTime).toBeLessThan(500); // 최대 500ms 이내
    });

    it('암호화폐 데이터 조회 API 응답 시간을 측정해야 함', async () => {
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .get('/api/coins')
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Coins API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(200); // 평균 200ms 이내
      expect(maxTime).toBeLessThan(1000); // 최대 1초 이내
    });

    it('한국 시장 데이터 API 응답 시간을 측정해야 함', async () => {
      const iterations = 30;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .get('/api/korean-market/premium')
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Korean Market API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(300); // 평균 300ms 이내
      expect(maxTime).toBeLessThan(1500); // 최대 1.5초 이내
    });

    it('신호 생성 API 응답 시간을 측정해야 함', async () => {
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .post('/api/signals')
          .send({
            symbol: 'BTC',
            type: 'buy',
            strength: Math.random(),
            source: `benchmark_test_${i}`
          })
          .expect(201);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Signal Creation API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(150); // 평균 150ms 이내
      expect(maxTime).toBeLessThan(800); // 최대 800ms 이내
    });

    it('사용자 프로필 생성 API 응답 시간을 측정해야 함', async () => {
      const iterations = 30;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .post('/api/user-profiles')
          .send({
            userId: `benchmark_user_${i}`,
            investmentStyle: 'balanced',
            experienceLevel: 'intermediate',
            riskTolerance: 0.6
          })
          .expect(201);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['User Profile Creation API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(200); // 평균 200ms 이내
      expect(maxTime).toBeLessThan(1000); // 최대 1초 이내
    });

    it('개인화 추천 API 응답 시간을 측정해야 함', async () => {
      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .post('/api/personalization/recommend')
          .send({
            userId: `benchmark_user_${i}`,
            context: {
              currentPortfolio: ['BTC'],
              marketCondition: 'bullish'
            }
          })
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Personalization API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(300); // 평균 300ms 이내
      expect(maxTime).toBeLessThan(1500); // 최대 1.5초 이내
    });

    it('AI 신호 지속성 예측 API 응답 시간을 측정해야 함', async () => {
      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .post('/api/signal-persistence/predict')
          .send({
            signal: {
              symbol: 'BTC',
              type: 'buy',
              strength: 0.8,
              timestamp: new Date()
            },
            marketData: {
              price: 45000 + Math.random() * 1000,
              volume: 1000000 + Math.random() * 500000,
              volatility: 0.05 + Math.random() * 0.02
            }
          })
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['AI Signal Prediction API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(500); // 평균 500ms 이내
      expect(maxTime).toBeLessThan(2000); // 최대 2초 이내
    });

    it('데이터 품질 검증 API 응답 시간을 측정해야 함', async () => {
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .post('/api/data-quality/validate')
          .send({
            data: 45000 + Math.random() * 1000,
            dataType: 'price'
          })
          .expect(200);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      benchmarkResults['Data Quality Validation API'] = {
        averageTime: Math.round(averageTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      };

      expect(averageTime).toBeLessThan(50); // 평균 50ms 이내
      expect(maxTime).toBeLessThan(200); // 최대 200ms 이내
    });
  });

  describe('동시성 성능 테스트', () => {
    it('동시 요청 처리 성능을 측정해야 함', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .get('/api/health')
          .expect(200)
      );

      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTimePerRequest = totalTime / concurrentRequests;

      benchmarkResults['Concurrent Requests (50)'] = {
        totalTime: Math.round(totalTime * 100) / 100,
        averageTimePerRequest: Math.round(averageTimePerRequest * 100) / 100
      };

      expect(totalTime).toBeLessThan(5000); // 5초 이내에 50개 요청 처리
      expect(averageTimePerRequest).toBeLessThan(100); // 평균 100ms 이내
    });

    it('대량 데이터 처리 성능을 측정해야 함', async () => {
      const batchSize = 100;
      const startTime = performance.now();

      const promises = Array.from({ length: batchSize }, (_, i) =>
        request(app)
          .post('/api/signals')
          .send({
            symbol: 'BTC',
            type: 'buy',
            strength: Math.random(),
            source: `batch_performance_test_${i}`
          })
          .expect(201)
      );

      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTimePerRequest = totalTime / batchSize;

      benchmarkResults['Batch Signal Creation (100)'] = {
        totalTime: Math.round(totalTime * 100) / 100,
        averageTimePerRequest: Math.round(averageTimePerRequest * 100) / 100
      };

      expect(totalTime).toBeLessThan(10000); // 10초 이내에 100개 신호 생성
      expect(averageTimePerRequest).toBeLessThan(100); // 평균 100ms 이내
    });
  });

  describe('메모리 사용량 테스트', () => {
    it('장시간 실행 시 메모리 사용량이 안정적이어야 함', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [];

      // 1000번의 요청을 순차적으로 실행하며 메모리 사용량 모니터링
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);

        // 100번마다 메모리 사용량 기록
        if (i % 100 === 0) {
          memorySnapshots.push(process.memoryUsage());
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      benchmarkResults['Memory Usage (1000 requests)'] = {
        initialMemoryMB: Math.round(initialMemory.heapUsed / (1024 * 1024) * 100) / 100,
        finalMemoryMB: Math.round(finalMemory.heapUsed / (1024 * 1024) * 100) / 100,
        memoryIncreaseMB: Math.round(memoryIncreaseMB * 100) / 100
      };

      expect(memoryIncreaseMB).toBeLessThan(100); // 100MB 이하 증가
    });

    it('대량 데이터 처리 시 메모리 사용량이 안정적이어야 함', async () => {
      const initialMemory = process.memoryUsage();

      // 500개의 사용자 프로필을 생성
      for (let i = 0; i < 500; i++) {
        await request(app)
          .post('/api/user-profiles')
          .send({
            userId: `memory_test_user_${i}`,
            investmentStyle: 'balanced',
            experienceLevel: 'intermediate',
            riskTolerance: 0.6
          })
          .expect(201);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      benchmarkResults['Memory Usage (500 user profiles)'] = {
        initialMemoryMB: Math.round(initialMemory.heapUsed / (1024 * 1024) * 100) / 100,
        finalMemoryMB: Math.round(finalMemory.heapUsed / (1024 * 1024) * 100) / 100,
        memoryIncreaseMB: Math.round(memoryIncreaseMB * 100) / 100
      };

      expect(memoryIncreaseMB).toBeLessThan(50); // 50MB 이하 증가
    });
  });

  describe('데이터베이스 성능 테스트', () => {
    it('대량 데이터 조회 성능을 측정해야 함', async () => {
      // 먼저 테스트 데이터 생성
      const testSignals = Array.from({ length: 1000 }, (_, i) => ({
        symbol: 'BTC',
        type: 'buy',
        strength: Math.random(),
        source: `db_performance_test_${i}`
      }));

      for (const signal of testSignals) {
        await request(app)
          .post('/api/signals')
          .send(signal)
          .expect(201);
      }

      // 대량 데이터 조회 성능 측정
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/signals')
        .query({ limit: 1000 })
        .expect(200);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      benchmarkResults['Database Query (1000 records)'] = {
        queryTime: Math.round(queryTime * 100) / 100,
        recordCount: response.body.data.length
      };

      expect(queryTime).toBeLessThan(1000); // 1초 이내
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('복잡한 쿼리 성능을 측정해야 함', async () => {
      const startTime = performance.now();
      
      // 복잡한 쿼리: 특정 조건으로 신호 조회
      const response = await request(app)
        .get('/api/signals')
        .query({
          symbol: 'BTC',
          type: 'buy',
          limit: 100
        })
        .expect(200);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      benchmarkResults['Complex Database Query'] = {
        queryTime: Math.round(queryTime * 100) / 100,
        recordCount: response.body.data.length
      };

      expect(queryTime).toBeLessThan(500); // 500ms 이내
    });
  });

  describe('네트워크 성능 테스트', () => {
    it('대용량 응답 데이터 처리 성능을 측정해야 함', async () => {
      const startTime = performance.now();
      
      // 대용량 데이터 요청
      const response = await request(app)
        .get('/api/coins')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const dataSize = JSON.stringify(response.body).length;
      const dataSizeKB = dataSize / 1024;

      benchmarkResults['Large Response Data'] = {
        responseTime: Math.round(responseTime * 100) / 100,
        dataSizeKB: Math.round(dataSizeKB * 100) / 100
      };

      expect(responseTime).toBeLessThan(1000); // 1초 이내
      expect(dataSizeKB).toBeGreaterThan(0);
    });
  });
});
