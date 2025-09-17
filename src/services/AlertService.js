const FirebaseNotificationService = require('./FirebaseNotificationService');
const Alert = require('../models/Alert');
const Signal = require('../models/Signal');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.firebaseService = new FirebaseNotificationService();
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      await this.firebaseService.init();
      this.isInitialized = this.firebaseService.initialized;
      if (this.isInitialized) {
        logger.success('AlertService 초기화 완료');
      } else {
        logger.warning('AlertService 초기화 완료 (Firebase 비활성화)');
      }
    } catch (error) {
      logger.error('AlertService 초기화 실패:', error);
      this.isInitialized = false;
    }
  }

  // 신호 기반 알림 처리
  async processSignalAlert(signal) {
    try {
      await this.init();

      // 해당 코인에 대한 활성 알림 조회
      const alerts = await Alert.find({
        coinId: signal.coinId,
        alertType: 'STRONG_SIGNAL',
        isActive: true
      });

      if (alerts.length === 0) {
        return { processed: 0, sent: 0 };
      }

      let sentCount = 0;
      const notification = this.firebaseService.createSignalNotification(signal);

      for (const alert of alerts) {
        // 알림 조건 확인
        if (this.shouldTriggerAlert(alert, signal)) {
          try {
            // Firebase 알림 전송
            if (alert.fcmToken) {
              const result = await this.firebaseService.sendToDevice(alert.fcmToken, notification);
              if (result.success) {
                sentCount++;
                logger.success(`알림 전송 성공: ${alert.userId || 'anonymous'}`);
              }
            }

            // 알림 기록 업데이트
            await this.updateAlertHistory(alert, signal, notification);
          } catch (error) {
            logger.error(`알림 전송 실패 (${alert.userId}):`, error);
          }
        }
      }

      return { processed: alerts.length, sent: sentCount };
    } catch (error) {
      logger.error('신호 알림 처리 실패:', error);
      return { processed: 0, sent: 0, error: error.message };
    }
  }

  // 가격 기반 알림 처리
  async processPriceAlert(coin, priceChange) {
    try {
      await this.init();

      const alerts = await Alert.find({
        coinId: coin.coinId,
        alertType: 'PRICE_TARGET',
        isActive: true
      });

      if (alerts.length === 0) {
        return { processed: 0, sent: 0 };
      }

      let sentCount = 0;
      const notification = this.firebaseService.createPriceNotification(coin, priceChange);

      for (const alert of alerts) {
        if (this.shouldTriggerPriceAlert(alert, coin, priceChange)) {
          try {
            if (alert.fcmToken) {
              const result = await this.firebaseService.sendToDevice(alert.fcmToken, notification);
              if (result.success) {
                sentCount++;
                logger.success(`가격 알림 전송 성공: ${alert.userId || 'anonymous'}`);
              }
            }

            await this.updateAlertHistory(alert, coin, notification);
          } catch (error) {
            logger.error(`가격 알림 전송 실패 (${alert.userId}):`, error);
          }
        }
      }

      return { processed: alerts.length, sent: sentCount };
    } catch (error) {
      logger.error('가격 알림 처리 실패:', error);
      return { processed: 0, sent: 0, error: error.message };
    }
  }

  // 고래 활동 알림 처리
  async processWhaleAlert(coin, whaleData) {
    try {
      await this.init();

      const alerts = await Alert.find({
        coinId: coin.coinId,
        alertType: 'WHALE_MOVE',
        isActive: true
      });

      if (alerts.length === 0) {
        return { processed: 0, sent: 0 };
      }

      let sentCount = 0;
      const notification = this.firebaseService.createWhaleNotification(coin, whaleData);

      for (const alert of alerts) {
        if (this.shouldTriggerWhaleAlert(alert, whaleData)) {
          try {
            if (alert.fcmToken) {
              const result = await this.firebaseService.sendToDevice(alert.fcmToken, notification);
              if (result.success) {
                sentCount++;
                logger.success(`고래 알림 전송 성공: ${alert.userId || 'anonymous'}`);
              }
            }

            await this.updateAlertHistory(alert, coin, notification);
          } catch (error) {
            logger.error(`고래 알림 전송 실패 (${alert.userId}):`, error);
          }
        }
      }

      return { processed: alerts.length, sent: sentCount };
    } catch (error) {
      logger.error('고래 알림 처리 실패:', error);
      return { processed: 0, sent: 0, error: error.message };
    }
  }

  // 신호 알림 트리거 조건 확인
  shouldTriggerAlert(alert, signal) {
    const { settings } = alert;
    const { finalScore, recommendation } = signal;

    // 최소 점수 조건
    if (settings.minScore && finalScore < settings.minScore) {
      return false;
    }

    // 최대 점수 조건
    if (settings.maxScore && finalScore > settings.maxScore) {
      return false;
    }

    // 신호 타입 조건
    if (settings.signalTypes && !settings.signalTypes.includes(recommendation.action)) {
      return false;
    }

    // 신뢰도 조건
    if (settings.minConfidence && recommendation.confidence !== settings.minConfidence) {
      return false;
    }

    // 마지막 알림 시간 확인 (스팸 방지)
    if (alert.lastTriggered) {
      const timeSinceLastAlert = Date.now() - new Date(alert.lastTriggered).getTime();
      const minInterval = (settings.minInterval || 30) * 60 * 1000; // 기본 30분
      
      if (timeSinceLastAlert < minInterval) {
        return false;
      }
    }

    return true;
  }

  // 가격 알림 트리거 조건 확인
  shouldTriggerPriceAlert(alert, coin, priceChange) {
    const { settings } = alert;
    const { currentPrice } = coin;

    // 가격 변동률 조건
    if (settings.priceChangeThreshold) {
      const absChange = Math.abs(priceChange);
      if (absChange < settings.priceChangeThreshold) {
        return false;
      }
    }

    // 목표 가격 조건
    if (settings.targetPrice) {
      const priceReached = settings.priceDirection === 'above' 
        ? currentPrice >= settings.targetPrice
        : currentPrice <= settings.targetPrice;
      
      if (!priceReached) {
        return false;
      }
    }

    return true;
  }

  // 고래 알림 트리거 조건 확인
  shouldTriggerWhaleAlert(alert, whaleData) {
    const { settings } = alert;
    const { totalValue, transactionCount } = whaleData;

    // 최소 거래 금액 조건
    if (settings.minValue && totalValue < settings.minValue) {
      return false;
    }

    // 최소 거래 수 조건
    if (settings.minTransactions && transactionCount < settings.minTransactions) {
      return false;
    }

    return true;
  }

  // 알림 기록 업데이트
  async updateAlertHistory(alert, data, notification) {
    try {
      alert.lastTriggered = new Date();
      alert.triggerCount = (alert.triggerCount || 0) + 1;
      
      // 알림 히스토리 추가
      if (!alert.history) {
        alert.history = [];
      }
      
      alert.history.push({
        timestamp: new Date(),
        data: data,
        notification: notification,
        status: 'sent'
      });

      // 히스토리 최대 100개로 제한
      if (alert.history.length > 100) {
        alert.history = alert.history.slice(-100);
      }

      await alert.save();
    } catch (error) {
      logger.error('알림 기록 업데이트 실패:', error);
    }
  }

  // 알림 생성
  async createAlert(alertData) {
    try {
      await this.init();

      const alert = new Alert({
        ...alertData,
        createdAt: new Date(),
        isActive: true,
        triggerCount: 0
      });

      await alert.save();
      logger.success(`알림 생성 완료: ${alert.alertType} - ${alert.coinId}`);
      
      return { success: true, alert };
    } catch (error) {
      logger.error('알림 생성 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 알림 업데이트
  async updateAlert(alertId, updateData) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );

      if (!alert) {
        return { success: false, error: '알림을 찾을 수 없습니다' };
      }

      logger.success(`알림 업데이트 완료: ${alertId}`);
      return { success: true, alert };
    } catch (error) {
      logger.error('알림 업데이트 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 알림 삭제
  async deleteAlert(alertId) {
    try {
      const alert = await Alert.findByIdAndDelete(alertId);
      
      if (!alert) {
        return { success: false, error: '알림을 찾을 수 없습니다' };
      }

      logger.success(`알림 삭제 완료: ${alertId}`);
      return { success: true };
    } catch (error) {
      logger.error('알림 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 사용자 알림 목록 조회
  async getUserAlerts(userId) {
    try {
      const alerts = await Alert.find({ userId }).sort({ createdAt: -1 });
      return { success: true, alerts };
    } catch (error) {
      logger.error('사용자 알림 조회 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 알림 통계 조회
  async getAlertStats() {
    try {
      const stats = await Alert.aggregate([
        {
          $group: {
            _id: '$alertType',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            totalTriggers: { $sum: '$triggerCount' }
          }
        }
      ]);

      const totalAlerts = await Alert.countDocuments();
      const activeAlerts = await Alert.countDocuments({ isActive: true });

      return {
        success: true,
        stats: {
          total: totalAlerts,
          active: activeAlerts,
          byType: stats
        }
      };
    } catch (error) {
      logger.error('알림 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AlertService;
