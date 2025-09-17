const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseNotificationService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      if (this.initialized) {
        return;
      }

      // Firebase 환경변수 확인
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        logger.warning('Firebase 환경변수가 설정되지 않았습니다. 알림 기능이 비활성화됩니다.');
        this.initialized = false;
        return;
      }

      // Firebase Admin SDK 초기화
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
        universe_domain: "googleapis.com"
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }

      this.initialized = true;
      logger.success('Firebase Admin SDK 초기화 완료');
    } catch (error) {
      logger.error('Firebase 초기화 실패:', error);
      this.initialized = false;
      // Firebase 초기화 실패해도 서버는 계속 실행
    }
  }

  // 단일 디바이스에 알림 전송
  async sendToDevice(token, notification) {
    try {
      await this.init();

      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.success(`알림 전송 성공: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('디바이스 알림 전송 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 여러 디바이스에 알림 전송
  async sendToMultipleDevices(tokens, notification) {
    try {
      await this.init();

      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      logger.success(`다중 알림 전송 성공: ${response.successCount}/${tokens.length}`);
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      logger.error('다중 디바이스 알림 전송 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 토픽 구독
  async subscribeToTopic(tokens, topic) {
    try {
      await this.init();

      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.success(`토픽 구독 성공: ${topic}`);
      return { success: true, response };
    } catch (error) {
      logger.error('토픽 구독 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 토픽 구독 해제
  async unsubscribeFromTopic(tokens, topic) {
    try {
      await this.init();

      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.success(`토픽 구독 해제 성공: ${topic}`);
      return { success: true, response };
    } catch (error) {
      logger.error('토픽 구독 해제 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 토픽에 메시지 전송
  async sendToTopic(topic, notification) {
    try {
      await this.init();

      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.success(`토픽 알림 전송 성공: ${topic}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('토픽 알림 전송 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 암호화폐 신호 알림 생성
  createSignalNotification(signal) {
    const { coinSymbol, signal: signalType, finalScore, recommendation } = signal;
    
    let title, body;
    
    switch (recommendation.action) {
      case 'STRONG_BUY':
        title = `🚀 ${coinSymbol} 강력 매수 신호!`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      case 'BUY':
        title = `📈 ${coinSymbol} 매수 신호`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      case 'HOLD':
        title = `⏸️ ${coinSymbol} 보유 권장`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      case 'WEAK_SELL':
        title = `📉 ${coinSymbol} 약한 매도 신호`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      case 'SELL':
        title = `📉 ${coinSymbol} 매도 신호`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      case 'STRONG_SELL':
        title = `🔻 ${coinSymbol} 강력 매도 신호!`;
        body = `점수: ${finalScore}/100 - ${recommendation.confidence} 신뢰도`;
        break;
      default:
        title = `📊 ${coinSymbol} 신호 업데이트`;
        body = `점수: ${finalScore}/100`;
    }

    return {
      title,
      body,
      data: {
        coinId: signal.coinId,
        coinSymbol: signal.coinSymbol,
        signalType: signalType,
        finalScore: finalScore.toString(),
        recommendation: recommendation.action,
        confidence: recommendation.confidence,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 가격 알림 생성
  createPriceNotification(coin, priceChange) {
    const { symbol, currentPrice } = coin;
    const changePercent = priceChange.toFixed(2);
    const changeEmoji = priceChange >= 0 ? '📈' : '📉';
    
    return {
      title: `${changeEmoji} ${symbol} 가격 변동`,
      body: `현재가: $${currentPrice.toLocaleString()} (${changePercent}%)`,
      data: {
        coinId: coin.coinId,
        coinSymbol: symbol,
        currentPrice: currentPrice.toString(),
        priceChange: changePercent,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 고래 활동 알림 생성
  createWhaleNotification(coin, whaleData) {
    const { symbol } = coin;
    const { transactionCount, totalValue } = whaleData;
    
    return {
      title: `🐋 ${symbol} 고래 활동 감지!`,
      body: `${transactionCount}건의 대량 거래 (총 $${totalValue.toLocaleString()})`,
      data: {
        coinId: coin.coinId,
        coinSymbol: symbol,
        transactionCount: transactionCount.toString(),
        totalValue: totalValue.toString(),
        timestamp: new Date().toISOString()
      }
    };
  }

  // 연결 테스트
  async testConnection() {
    try {
      await this.init();
      return true;
    } catch (error) {
      logger.error('Firebase 연결 테스트 실패:', error);
      return false;
    }
  }
}

module.exports = FirebaseNotificationService;
