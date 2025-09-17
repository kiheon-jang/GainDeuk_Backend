const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

class DatabaseConfig {
  static async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gaindeuk';
      
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        retryWrites: true,
        w: 'majority'
      };

      await mongoose.connect(mongoUri, options);
      
      logger.info('✅ MongoDB 연결 성공');
      logger.info(`📊 데이터베이스: ${mongoose.connection.name}`);

      // Connection event listeners
      mongoose.connection.on('error', (err) => {
        logger.error('❌ MongoDB 연결 오류:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB 연결이 끊어졌습니다');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB 재연결 성공');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('📡 MongoDB 연결이 종료되었습니다');
        process.exit(0);
      });

    } catch (error) {
      logger.error('❌ MongoDB 연결 실패:', error);
      process.exit(1);
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('✅ MongoDB 연결이 종료되었습니다');
    } catch (error) {
      logger.error('❌ MongoDB 연결 종료 중 오류:', error);
      throw error;
    }
  }

  static getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      state: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }
}

module.exports = DatabaseConfig;
