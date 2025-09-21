# 🚀 GainDeuk 프론트엔드 개발 프롬프트

## 📋 프로젝트 개요

**GainDeuk**은 AI가 암호화폐 호재/악재를 분석하여 개인 맞춤형 투자 타임프레임까지 추천해주는 실시간 알림 서비스입니다. 넷플릭스 웹페이지의 톤앤매너를 참고하여 모던하고 직관적인 UI/UX를 구현해주세요.



## 🏗️ 프로젝트 구조

```
gaindeuk-frontend/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   ├── common/         # 공통 컴포넌트
│   │   ├── charts/         # 차트 컴포넌트
│   │   ├── cards/          # 카드 컴포넌트
│   │   └── modals/         # 모달 컴포넌트
│   ├── pages/              # 페이지 컴포넌트
│   ├── hooks/              # 커스텀 훅
│   ├── services/           # API 서비스
│   ├── utils/              # 유틸리티 함수
│   ├── styles/             # 스타일 파일
│   └── types/              # TypeScript 타입 정의
├── public/
└── package.json
```

## 📱 화면별 상세 스펙

### 1. 🏠 메인 대시보드 (`/`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/signals?limit=20&sort=finalScore&order=desc
GET /api/coins?limit=10&sort=marketCapRank&order=asc
GET /api/korean-market/stats
GET /api/personalization/recommendations/{userId}
```

#### 화면 구성
- **상단 네비게이션**: 로고, 메뉴, 사용자 프로필
- **히어로 섹션**: 실시간 시장 현황 (김치프리미엄, 상위 코인)
- **추천 신호 섹션**: 개인화된 신호 카드 (가로 스크롤)
- **타임프레임별 전략**: 스켈핑/데이트레이딩/스윙/장기
- **실시간 알림**: 강한 신호 알림 배너

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface DashboardData {
  topSignals: Signal[];
  topCoins: Coin[];
  koreanMarketStats: {
    kimchiPremium: number;
    totalVolume: number;
    activeUsers: number;
  };
  personalizedRecommendations: {
    suggestedTimeframes: string[];
    suggestedCoins: string[];
    riskLevel: number; // 1-10
    maxDailySignals: number;
    tradingStrategy: object;
    signalFilters: object;
    positionSizing: object;
    alertSettings: object;
    marketAdaptation: object;
    confidence: number;
    lastUpdated: string;
    profileCompleteness: number;
  };
}
```

### 2. 📊 신호 분석 페이지 (`/signals`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/signals?page=1&limit=50&sort=finalScore&order=desc
GET /api/signals?minScore=80&action=STRONG_BUY
GET /api/signals?timeframe=SCALPING
GET /api/signal-persistence/predict
```

#### 화면 구성
- **필터 섹션**: 점수 범위, 액션 타입, 타임프레임
- **신호 카드 그리드**: 각 신호의 상세 정보
- **실시간 업데이트**: WebSocket 연결
- **상세 모달**: 신호 분석 상세 정보

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface Signal {
  _id: string;
  coinId: string;
  symbol: string;
  name: string;
  finalScore: number;
  breakdown: {
    price: number;
    volume: number;
    market: number;
    sentiment: number;
    whale: number;
  };
  recommendation: {
    action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'WEAK_SELL' | 'SELL' | 'STRONG_SELL';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  timeframe: 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING' | 'LONG_TERM';
  priority: 'high_priority' | 'medium_priority' | 'low_priority';
  rank: number;
  currentPrice: number;
  marketCap: number;
  metadata: {
    priceData: {
      change_1h: number;
      change_24h: number;
      change_7d: number;
      change_30d: number;
    };
    volumeRatio: number;
    whaleActivity: number;
    newsCount: number;
    lastUpdated: string;
    calculationTime: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  createdAt: string;
  updatedAt: string;
  // 가상 필드
  isStrongSignal: boolean;
  isBuySignal: boolean;
  isSellSignal: boolean;
  signalStrength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'neutral';
}
```

### 3. 🪙 코인 분석 페이지 (`/coins`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/coins?page=1&limit=50&sort=marketCapRank&order=asc
GET /api/coins/{coinId}
GET /api/korean-market/kimchi-premium/{symbol}
GET /api/onchain/data?network=ethereum
```

#### 화면 구성
- **코인 리스트**: 시가총액 순위별 정렬
- **검색 기능**: 코인명/심볼 검색
- **상세 카드**: 가격, 거래량, 김치프리미엄
- **차트 섹션**: 가격 차트, 거래량 차트

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface Coin {
  _id: string;
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  priceChange: {
    '1h': number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
  lastUpdated: string;
  metadata: {
    circulatingSupply: number;
    totalSupply: number;
    maxSupply: number;
    ath: number;
    athChangePercentage: number;
    atl: number;
    atlChangePercentage: number;
    priceChange24h: number;
    marketCapChange24h: number;
    priceChangePercentage24h: number;
    marketCapChangePercentage24h: number;
    totalVolumeChange24h: number;
    totalVolumeChangePercentage24h: number;
  };
  createdAt: string;
  updatedAt: string;
  // 가상 필드
  volumeToMarketCapRatio: number;
  priceChange24hPercentage: number;
}
```

### 4. 👤 개인화 설정 페이지 (`/profile`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/user-profiles/{userId}
PUT /api/user-profiles/{userId}
GET /api/personalization/recommendations/{userId}
POST /api/investment-strategy/generate
```

#### 화면 구성
- **프로필 설정**: 투자 스타일, 경험 수준, 가용 시간
- **선호도 설정**: 타임프레임, 코인 선호도
- **알림 설정**: 푸시 알림, 이메일 알림
- **포트폴리오 관리**: 보유 코인, 투자 이력

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface UserProfile {
  _id: string;
  userId: string;
  investmentStyle: 'conservative' | 'moderate' | 'aggressive' | 'speculative';
  riskTolerance: number; // 1-10
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tradingExperience: number; // 거래 경험 년수
  availableTime: 'minimal' | 'part-time' | 'full-time';
  preferredTimeframes: string[];
  activeHours: {
    start: string;
    end: string;
    timezone: string;
  };
  preferredCoins: string[];
  maxPositionSize: number;
  notificationSettings: {
    email: {
      enabled: boolean;
      frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    };
    push: {
      enabled: boolean;
      highPriorityOnly: boolean;
    };
    discord: {
      enabled: boolean;
      webhookUrl: string;
    };
  };
  personalizationSettings: {
    signalSensitivity: number; // 1-10
    preferredSignalTypes: string[];
    autoTradingEnabled: boolean;
    maxDailySignals: number;
  };
  learningData: {
    successfulTrades: number;
    totalTrades: number;
    averageHoldTime: number;
    preferredStrategies: string[];
  };
  lastActive: string;
  profileCompleteness: number; // 0-100
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 가상 필드
  successRate: number;
  calculatedCompleteness: number;
}
```

### 5. 📈 투자 전략 페이지 (`/strategy`)

#### API 연동
```typescript
// API 엔드포인트
POST /api/investment-strategy/generate
GET /api/investment-strategy/{strategyId}
GET /api/real-time-optimization/status
```

#### 화면 구성
- **전략 생성**: AI 기반 개인화 전략 생성
- **전략 카드**: 타임프레임별 추천 전략
- **실시간 최적화**: 시장 상황에 따른 전략 조정
- **백테스팅**: 과거 데이터 기반 전략 검증

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface InvestmentStrategy {
  _id: string;
  userId: string;
  strategyType: 'scalping' | 'dayTrading' | 'swingTrading' | 'longTerm';
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  maxDrawdown: number;
  recommendedCoins: string[];
  entryConditions: string[];
  exitConditions: string[];
  stopLoss: number;
  takeProfit: number;
  aiAnalysis: {
    reasoning: string;
    confidence: number;
    riskFactors: string[];
    opportunityFactors: string[];
  };
  performanceMetrics: {
    winRate: number;
    averageReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 6. 🔔 알림 센터 (`/alerts`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/alerts?userId={userId}
POST /api/alerts
PUT /api/alerts/{alertId}
DELETE /api/alerts/{alertId}
```

#### 화면 구성
- **알림 목록**: 최근 알림 내역
- **알림 설정**: 신호 강도, 코인별 알림
- **알림 통계**: 알림 성공률, 반응률
- **알림 테스트**: 알림 기능 테스트

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface Alert {
  _id: string;
  userId: string;
  type: 'signal' | 'price' | 'volume' | 'news' | 'whale' | 'social';
  title: string;
  message: string;
  coinSymbol: string;
  signalScore?: number;
  price?: number;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  isDelivered: boolean;
  deliveryMethod: 'push' | 'email' | 'discord';
  metadata: {
    signalId?: string;
    coinId?: string;
    originalData?: object;
  };
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}
```

### 7. 📊 분석 도구 페이지 (`/analytics`)

#### API 연동
```typescript
// API 엔드포인트
GET /api/onchain/data
GET /api/social-media/sentiment
GET /api/korean-market/community-sentiment/{symbol}
GET /api/data-quality/status
```

#### 화면 구성
- **온체인 분석**: 고래 움직임, 대용량 거래
- **소셜미디어 감정**: Twitter, Telegram 감정 분석
- **한국 커뮤니티**: 디시인사이드, 네이버카페 분석
- **데이터 품질**: 실시간 데이터 품질 모니터링

#### 데이터 구조 (실제 API 응답 구조)
```typescript
interface AnalyticsData {
  onchainData: {
    largeTransactions: {
      hash: string;
      from: string;
      to: string;
      value: string;
      timestamp: string;
      network: string;
    }[];
    whaleMovements: {
      address: string;
      amount: number;
      type: 'inflow' | 'outflow';
      timestamp: string;
      network: string;
    }[];
    tokenUnlocks: {
      tokenAddress: string;
      tokenSymbol: string;
      unlockDate: string;
      unlockAmount: string;
      unlockPercentage: number;
      description: string;
      daysUntilUnlock: number;
    }[];
  };
  socialSentiment: {
    platform: 'twitter' | 'telegram' | 'discord' | 'reddit';
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    volume: number;
    keywords: string[];
    lastUpdate: string;
  };
  koreanCommunity: {
    platform: string;
    sentiment: number;
    activity: number;
    keywords: string[];
    kimchiPremium: number;
    lastUpdate: string;
  };
  dataQuality: {
    score: number;
    lastUpdate: string;
    issues: string[];
    validationResults: object[];
    anomalyDetection: object[];
  };
  performanceMetrics: {
    system: {
      cpu: { usage: number; loadAverage: number[] };
      memory: { used: number; free: number; total: number; usage: number };
      disk: { used: number; free: number; total: number; usage: number };
    };
    application: {
      responseTime: { average: number; min: number; max: number; p95: number; p99: number };
      requestCount: { total: number; perSecond: number; errors: number };
      errorRate: number;
    };
  };
}
```

## 🛠️ 기술 스택

### 프론트엔드 프레임워크
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "typescript": "^4.9.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

### UI 라이브러리
```json
{
  "dependencies": {
    "styled-components": "^5.3.0",
    "@emotion/react": "^11.10.0",
    "@emotion/styled": "^11.10.0",
    "framer-motion": "^10.0.0",
    "react-spring": "^9.6.0"
  }
}
```

### 차트 라이브러리
```json
{
  "dependencies": {
    "recharts": "^2.5.0",
    "chart.js": "^4.2.0",
    "react-chartjs-2": "^5.2.0"
  }
}
```

### 상태 관리
```json
{
  "dependencies": {
    "@tanstack/react-query": "^4.24.0",
    "zustand": "^4.3.0",
    "axios": "^1.3.0"
  }
}
```

### 유틸리티
```json
{
  "dependencies": {
    "date-fns": "^2.29.0",
    "lodash": "^4.17.0",
    "react-hot-toast": "^2.4.0",
    "react-intersection-observer": "^9.4.0"
  }
}
```

## 🎯 핵심 컴포넌트 요구사항

### 1. SignalCard 컴포넌트
- **기능**: 신호 데이터를 카드 형태로 표시
- **포함 요소**: 코인 정보, AI 점수, 추천 액션, 타임프레임
- **상호작용**: 클릭 시 상세 정보 모달 표시
- **스타일**: 넷플릭스 스타일의 카드 디자인

### 2. PriceChart 컴포넌트
- **기능**: 실시간 가격 차트 표시
- **지원 타임프레임**: 1h, 4h, 1d, 1w
- **업데이트**: 30초마다 자동 새로고침
- **라이브러리**: Recharts 또는 Chart.js 사용

### 3. KimchiPremium 컴포넌트
- **기능**: 김치프리미엄 정보 표시
- **표시 데이터**: 프리미엄 비율, 한국/글로벌 가격, 트렌드
- **업데이트**: 1분마다 자동 새로고침
- **시각화**: 프리미엄 비율에 따른 색상 변화

## 🔄 실시간 업데이트 요구사항

### WebSocket 연결
- **기능**: 실시간 데이터 수신을 위한 WebSocket 연결
- **연결 URL**: `ws://localhost:3000/ws/signals`
- **상태 관리**: 연결 상태, 메시지 수신 상태 추적
- **에러 처리**: 연결 실패 시 재연결 로직

### 실시간 신호 업데이트
- **기능**: 신호 데이터 실시간 업데이트
- **업데이트 방식**: React Query 캐시 업데이트
- **성능**: 불필요한 리렌더링 방지
- **사용자 경험**: 부드러운 데이터 전환

## 📱 반응형 디자인 요구사항

### 브레이크포인트
- **모바일**: 768px 이하
  - 신호 그리드: 1열
  - 네비게이션: 세로 배치
  - 패딩: 최소화
- **태블릿**: 769px - 1024px
  - 신호 그리드: 2열
  - 적절한 간격 유지
- **데스크톱**: 1025px 이상
  - 신호 그리드: 3열
  - 넓은 간격과 여백

## 🎨 애니메이션 요구사항

### 애니메이션 효과
- **페이지 전환**: 부드러운 fadeIn/fadeOut 효과
- **카드 호버**: 미묘한 scale 변화 (1.02배)
- **로딩 상태**: 스켈레톤 애니메이션
- **데이터 업데이트**: 부드러운 전환 효과
- **라이브러리**: Framer Motion 또는 React Spring 사용

## 🔧 API 서비스

### API 클라이언트 설정
- **베이스 URL**: `http://localhost:3000/api`
- **타임아웃**: 10초
- **인증**: Bearer 토큰 방식
- **에러 처리**: 401 오류 시 로그인 페이지 리다이렉트
- **라이브러리**: Axios 사용

### API 서비스 함수들
- **signalsApi**: 신호 관련 API 호출
- **coinsApi**: 코인 정보 API 호출
- **koreanMarketApi**: 한국 시장 데이터 API 호출
- **userProfilesApi**: 사용자 프로필 API 호출
- **alertsApi**: 알림 관련 API 호출

## 🚀 개발 시작 가이드

### 1. 프로젝트 초기화
- React + TypeScript 프로젝트 생성
- 필요한 패키지 설치 (UI 라이브러리, 차트, 상태관리, HTTP 클라이언트)
- 개발 의존성 설치

### 2. 환경 변수 설정
- API URL 설정
- WebSocket URL 설정
- 환경별 설정 분리

### 3. 기본 구조 생성
- 컴포넌트, 페이지, 훅, 서비스 디렉토리 구조
- 공통 컴포넌트, 차트, 카드, 모달 분류

### 4. 개발 서버 실행
- 개발 서버 시작
- 핫 리로드 설정

## 📝 추가 요구사항

### 성능 최적화
- React.memo를 사용한 컴포넌트 최적화
- useMemo, useCallback을 사용한 계산 최적화
- 가상화를 사용한 대용량 리스트 렌더링
- 이미지 지연 로딩 (lazy loading)

### 접근성 (A11y)
- ARIA 라벨 및 역할 설정
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 색상 대비 준수

### SEO 최적화
- 메타 태그 설정
- Open Graph 태그
- 구조화된 데이터 (JSON-LD)
- 사이트맵 생성

### 보안
- XSS 방지
- CSRF 토큰 처리
- 민감한 데이터 암호화
- API 키 보안

## 🎯 완성 목표

1. **반응형 웹 애플리케이션** - 모바일, 태블릿, 데스크톱 지원
2. **실시간 데이터 업데이트** - WebSocket을 통한 실시간 신호 업데이트
3. **개인화된 사용자 경험** - 사용자 프로필 기반 맞춤 추천
4. **직관적인 UI/UX** - 넷플릭스 스타일의 모던한 디자인
5. **고성능 애플리케이션** - 최적화된 렌더링 및 데이터 처리

이 프롬프트를 기반으로 GainDeuk 프론트엔드를 개발해주세요. 각 화면별로 상세한 API 연동과 데이터 구조가 명시되어 있으니, 이를 참고하여 구현하시면 됩니다.
