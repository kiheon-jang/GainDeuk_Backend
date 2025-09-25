/**
 * 기본 거래 전략 인터페이스
 * 모든 거래 전략이 구현해야 하는 기본 메서드들을 정의
 */
class BaseStrategy {
  constructor(name, timeframe) {
    this.name = name;
    this.timeframe = timeframe;
    this.riskLevel = 'medium';
    this.minLiquidity = 'C';
    this.maxPositionSize = 0.1; // 기본 최대 포지션 크기 (10%)
  }

  /**
   * 전략 실행 가능 여부 확인
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {boolean} 실행 가능 여부
   */
  canExecute(signalData, marketData) {
    throw new Error('canExecute method must be implemented');
  }

  /**
   * 진입 신호 분석
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 진입 신호 정보
   */
  analyzeEntry(signalData, marketData) {
    throw new Error('analyzeEntry method must be implemented');
  }

  /**
   * 청산 신호 분석
   * @param {Object} position - 현재 포지션 정보
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 청산 신호 정보
   */
  analyzeExit(position, marketData) {
    throw new Error('analyzeExit method must be implemented');
  }

  /**
   * 포지션 사이즈 계산
   * @param {Object} signalData - 시그널 데이터
   * @param {Object} accountData - 계정 데이터
   * @returns {number} 포지션 사이즈 (0-1)
   */
  calculatePositionSize(signalData, accountData) {
    throw new Error('calculatePositionSize method must be implemented');
  }

  /**
   * 리스크 관리 규칙 적용
   * @param {Object} position - 포지션 정보
   * @param {Object} marketData - 시장 데이터
   * @returns {Object} 리스크 관리 신호
   */
  manageRisk(position, marketData) {
    throw new Error('manageRisk method must be implemented');
  }

  /**
   * 전략별 성과 지표 계산
   * @param {Array} trades - 거래 기록
   * @returns {Object} 성과 지표
   */
  calculatePerformance(trades) {
    throw new Error('calculatePerformance method must be implemented');
  }

  /**
   * 전략 설명 반환
   * @returns {string} 전략 설명
   */
  getDescription() {
    return `${this.name} 전략 - ${this.timeframe} 타임프레임`;
  }

  /**
   * 전략 파라미터 설정
   * @param {Object} params - 전략 파라미터
   */
  setParameters(params) {
    Object.assign(this, params);
  }
}

module.exports = BaseStrategy;
