const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// 테스트 전 설정
beforeAll(async () => {
  // MongoDB Memory Server 시작
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // MongoDB 연결
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// 테스트 후 정리
afterAll(async () => {
  // MongoDB 연결 종료
  await mongoose.disconnect();
  
  // MongoDB Memory Server 중지
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// 각 테스트 후 데이터베이스 정리
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
