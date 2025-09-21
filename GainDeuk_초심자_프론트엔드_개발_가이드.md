# 🚀 GainDeuk 초심자 친화적 프론트엔드 개발 가이드

## 📋 프로젝트 개요

**GainDeuk**은 암호화폐 초심자를 위한 AI 추천 서비스입니다. 복잡한 차트나 지표 대신 **"왜 이 코인을 추천하는지"**를 쉽게 설명하고, 사용자의 투자 성향에 맞는 맞춤형 추천을 제공합니다.

## 🎯 초심자 중심 설계 원칙

### 1. **단순함 우선**
- 복잡한 차트나 지표 최소화
- 직관적인 아이콘과 색상 사용
- 한글로 된 쉬운 설명

### 2. **근거 중심 설명**
- "왜 이 코인인가?" 명확한 이유 제시
- AI가 분석한 핵심 포인트 3-5개
- 예상 수익률과 위험도 표시

### 3. **단계별 학습**
- 초심자 → 중급자 → 고급자 단계별 정보 제공
- 점진적으로 더 자세한 정보 노출

## 🏗️ 간소화된 프로젝트 구조

```
gaindeuk-frontend/
├── src/
│   ├── components/
│   │   ├── common/           # 공통 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── cards/            # 추천 카드들
│   │   │   ├── CoinRecommendationCard.tsx
│   │   │   ├── SimplePriceCard.tsx
│   │   │   └── ReasonCard.tsx
│   │   └── modals/           # 모달들
│   │       ├── CoinDetailModal.tsx
│   │       └── SettingsModal.tsx
│   ├── pages/                # 페이지들
│   │   ├── Dashboard.tsx     # 메인 대시보드
│   │   ├── MyProfile.tsx     # 내 성향 분석
│   │   ├── CoinList.tsx      # 코인 목록
│   │   └── Settings.tsx      # 설정
│   ├── hooks/                # 커스텀 훅
│   │   ├── useRecommendations.ts
│   │   └── useUserProfile.ts
│   ├── services/             # API 서비스
│   │   └── api.ts
│   └── types/                # 타입 정의
│       └── index.ts
```

## 📱 초심자 친화적 메뉴 구조

### 🏠 **메인 대시보드** (`/`)
- **AI 추천 코인** (3-5개)
- **추천 이유** (간단한 3줄 설명)
- **예상 수익률** (퍼센트로 표시)
- **위험도** (1-5단계, 색상으로 구분)

### 🎯 **실시간 매매 가이드** (`/trading`) ⭐ **NEW!**
- **지금 사세요/팔세요** 실시간 신호
- **스캘핑/스윙/데이트레이딩** 전략별 가이드
- **단계별 매매 체크리스트**
- **전문가가 옆에 있는 느낌** 실시간 조언

### 👤 **내 성향 분석** (`/profile`)
- **투자 성향 테스트** (5-10개 질문)
- **AI 분석 결과** (성향별 설명)
- **맞춤 추천 설정** (간단한 토글)

### 🪙 **코인 목록** (`/coins`)
- **전체 코인** (간단한 카드 형태)
- **검색 기능** (코인명으로)
- **상세 정보** (모달로 표시)

### ⚙️ **설정** (`/settings`)
- **알림 설정** (간단한 토글)
- **언어 설정**
- **테마 설정**

## 🎨 핵심 화면 설계

### 1. 🏠 메인 대시보드 (`/`)

#### 화면 구성
```
┌─────────────────────────────────────────┐
│  🏠 GainDeuk    👤 내성향    ⚙️ 설정     │
├─────────────────────────────────────────┤
│                                         │
│  🤖 AI가 추천하는 오늘의 코인            │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 비트코인 │ │ 이더리움│ │ 바이낸스│   │
│  │ +12.5%  │ │ +8.3%   │ │ +15.2%  │   │
│  │ ⭐⭐⭐⭐  │ │ ⭐⭐⭐   │ │ ⭐⭐⭐⭐⭐ │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  💡 추천 이유:                          │
│  • 비트코인: 기관 투자 증가로 상승세     │
│  • 이더리움: 업그레이드 뉴스로 관심증가  │
│  • 바이낸스: 거래량 급증으로 수익 기대   │
│                                         │
│  📊 내 투자 성향: 안정형 (60%)          │
│  🎯 추천 전략: 중장기 보유              │
│                                         │
└─────────────────────────────────────────┘
```

#### API 연동
```typescript
// 메인 대시보드 데이터
interface DashboardData {
  aiRecommendations: {
    coin: {
      symbol: string;
      name: string;
      currentPrice: number;
      image: string;
    };
    expectedReturn: number;        // 예상 수익률 (%)
    riskLevel: 1 | 2 | 3 | 4 | 5; // 위험도 (1=안전, 5=위험)
    reasons: string[];             // 추천 이유 (3-5개)
    confidence: number;            // AI 신뢰도 (0-100)
    timeframe: string;             // 추천 기간
  }[];
  userProfile: {
    investmentStyle: 'conservative' | 'moderate' | 'aggressive';
    riskTolerance: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    recommendedStrategy: string;
  };
  marketSummary: {
    totalMarketCap: string;
    marketTrend: 'up' | 'down' | 'sideways';
    trendDescription: string;
  };
}
```

### 2. 👤 내 성향 분석 페이지 (`/profile`)

#### 화면 구성
```
┌─────────────────────────────────────────┐
│  ← 뒤로가기    내 투자 성향 분석         │
├─────────────────────────────────────────┤
│                                         │
│  🧠 AI가 분석한 내 투자 성향            │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │ 🛡️ 안정형 투자자 (65%)              │ │
│  │                                     │ │
│  │ • 위험을 피하고 안정적인 수익 선호   │ │
│  │ • 장기 투자보다는 단기 수익 관심     │ │
│  │ • 큰 변동성보다는 꾸준한 상승 선호   │ │
│  │                                     │ │
│  │ 🎯 추천 전략:                       │ │
│  │ • 비트코인, 이더리움 중심            │ │
│  │ • 1-3개월 보유 추천                 │ │
│  │ • 하루 1-2회 체크                   │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  📝 성향 테스트 다시하기                │
│  ⚙️ 맞춤 설정 변경하기                  │
│                                         │
└─────────────────────────────────────────┘
```

#### 투자 성향 테스트 질문 예시
```typescript
interface InvestmentTest {
  questions: {
    id: number;
    question: string;
    options: {
      text: string;
      score: {
        conservative: number;
        moderate: number;
        aggressive: number;
      };
    }[];
  }[];
}

// 예시 질문들
const testQuestions = [
  {
    question: "암호화폐 투자 목적은 무엇인가요?",
    options: [
      { text: "안전한 자산 증식", score: { conservative: 3, moderate: 1, aggressive: 0 } },
      { text: "적당한 수익과 안정성", score: { conservative: 1, moderate: 3, aggressive: 1 } },
      { text: "높은 수익 추구", score: { conservative: 0, moderate: 1, aggressive: 3 } }
    ]
  },
  {
    question: "투자 손실이 발생하면 어떻게 하시겠어요?",
    options: [
      { text: "즉시 매도하고 안전한 곳으로", score: { conservative: 3, moderate: 1, aggressive: 0 } },
      { text: "조금 더 기다려보기", score: { conservative: 1, moderate: 3, aggressive: 1 } },
      { text: "더 많이 사서 평단가 낮추기", score: { conservative: 0, moderate: 1, aggressive: 3 } }
    ]
  }
  // ... 더 많은 질문들
];
```

### 3. 🪙 코인 목록 페이지 (`/coins`)

#### 화면 구성
```
┌─────────────────────────────────────────┐
│  🔍 코인 검색    전체 코인 목록          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │ 🔍 비트코인, 이더리움 검색...        │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ ₿ BTC   │ │ Ξ ETH   │ │ 🟡 BNB  │   │
│  │ ₩45,000 │ │ ₩3,200  │ │ ₩420    │   │
│  │ +2.5%   │ │ -1.2%   │ │ +5.8%   │   │
│  │ ⭐⭐⭐⭐  │ │ ⭐⭐⭐   │ │ ⭐⭐⭐⭐⭐ │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  💡 AI 추천 코인 (내 성향에 맞는)        │
│  ┌─────────────────────────────────────┐ │
│  │ 🎯 비트코인 - 안정형 투자자에게 추천 │ │
│  │ 이유: 시장 리더, 안정성 높음        │ │
│  │ 예상수익: 월 5-10%                  │ │
│  └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 4. 🎯 실시간 매매 가이드 페이지 (`/trading`) ⭐ **핵심 기능!**

#### 화면 구성
```
┌─────────────────────────────────────────┐
│  ← 뒤로가기    🎯 실시간 매매 가이드     │
├─────────────────────────────────────────┤
│                                         │
│  🚨 지금 바로 매매하세요!               │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │ 🟢 비트코인 매수 신호!              │ │
│  │ 현재가: ₩45,000,000                 │ │
│  │ 목표가: ₩47,000,000 (+4.4%)         │ │
│  │ 손절가: ₩43,000,000 (-4.4%)         │ │
│  │                                     │ │
│  │ 💰 AI 추천 포지션: ₩500,000 (10%)   │ │
│  │ ⚠️ 최대 손실: ₩22,000 (4.4%)        │ │
│  │                                     │ │
│  │ ⏰ 유효시간: 2시간 30분 남음         │ │
│  │ 🎯 전략: 스윙 트레이딩 (3-5일)      │ │
│  │                                     │ │
│  │ 💡 AI가 분석한 매수 근거:            │ │
│  │ 📰 뉴스: "비트코인 ETF 승인 확정"    │ │
│  │ 📊 기술분석: 지지선에서 반등 신호    │ │
│  │ 🐋 고래활동: 대량 매수 시작          │ │
│  │ 📈 거래량: 평균 대비 3배 급증        │ │
│  │ 😊 감정분석: 시장 긍정적 분위기      │ │
│  │                                     │ │
│  │ 📋 매매 체크리스트:                 │ │
│  │ ✅ 손절가 설정 완료                  │ │
│  │ ✅ 목표가 설정 완료                  │ │
│  │ ✅ 포지션 크기 계산 완료             │ │
│  │                                     │ │
│  │ [지금 매수하기] [더 자세히 보기]     │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  📊 다른 매매 기회들                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 🔴 이더리움│ │ 🟡 바이낸스│ │ 🟢 도지코인│   │
│  │ 매도 신호│ │ 관망 신호│ │ 매수 신호│   │
│  │ -2.1%   │ │ +0.5%   │ │ +3.2%   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  🎯 내 매매 전략 설정                   │
│  [스캘핑] [데이트레이딩] [스윙] [장기]   │
│                                         │
└─────────────────────────────────────────┘
```

#### 실시간 매매 신호 데이터 구조
```typescript
interface TradingSignal {
  id: string;
  coin: {
    symbol: string;
    name: string;
    currentPrice: number;
    image: string;
  };
  signal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    strength: 'STRONG' | 'MEDIUM' | 'WEAK';
    confidence: number; // 0-100
  };
  targets: {
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;        // AI가 계산한 포지션 크기 (원화 기준)
    positionSizePercentage: number; // 자본금 대비 포지션 비율 (%)
    maxRiskAmount: number;       // 최대 손실 가능 금액
  };
  timeframe: {
    strategy: 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING' | 'LONG_TERM';
    duration: string; // "2시간 30분", "3-5일" 등
    validUntil: string;
  };
  reasons: {
    technical: string[];
    fundamental: string[];
    sentiment: string[];
    news: string[];              // 뉴스 기반 이유
  };
  checklist: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  riskLevel: 1 | 2 | 3 | 4 | 5;
  expectedReturn: number; // 퍼센트
  maxLoss: number; // 퍼센트
}
```

### 5. 🪙 코인 상세 모달

#### 화면 구성
```
┌─────────────────────────────────────────┐
│  ×                                     │
│                                         │
│  ₿ 비트코인 (BTC)                       │
│  현재가: ₩45,000,000 (+2.5%)           │
│                                         │
│  🤖 AI 분석 결과                        │
│                                         │
│  📈 추천도: ⭐⭐⭐⭐ (80점)              │
│  💰 예상수익: 월 5-10%                  │
│  ⏰ 추천기간: 1-3개월                   │
│  ⚠️ 위험도: 낮음 (2/5)                  │
│                                         │
│  💡 추천 이유:                          │
│  • 기관 투자자들의 관심 증가            │
│  • 채택률이 꾸준히 상승 중              │
│  • 시장 리더로서 안정성 확보            │
│                                         │
│  📊 간단한 차트 (7일)                   │
│  ████████████████████████████████       │
│                                         │
│  🎯 내 성향에 맞는 이유:                │
│  안정형 투자자에게 적합한 코인입니다.    │
│  변동성이 상대적으로 낮고 장기적으로     │
│  안정적인 상승이 예상됩니다.             │
│                                         │
│  [알림 설정] [포트폴리오 추가]           │
└─────────────────────────────────────────┘
```

## 🛠️ 기술 스택 (간소화)

### 핵심 라이브러리
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "typescript": "^4.9.0",
    "styled-components": "^5.3.0",
    "axios": "^1.3.0",
    "react-query": "^3.39.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.263.0"
  }
}
```

### UI 컴포넌트 라이브러리
```json
{
  "dependencies": {
    "lucide-react": "^0.263.0",
    "react-spring": "^9.6.0"
  }
}
```

## 🎨 디자인 시스템

### 색상 팔레트
```css
:root {
  /* 메인 색상 */
  --primary: #3B82F6;      /* 파란색 - 신뢰감 */
  --secondary: #10B981;    /* 초록색 - 수익 */
  --danger: #EF4444;       /* 빨간색 - 손실 */
  --warning: #F59E0B;      /* 주황색 - 주의 */
  
  /* 중성 색상 */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-500: #6B7280;
  --gray-900: #111827;
  
  /* 배경 */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-dark: #1F2937;
}
```

### 타이포그래피
```css
/* 한글 폰트 - 가독성 우선 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');

body {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

/* 제목 */
h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 500; }

/* 본문 */
p { font-size: 1rem; font-weight: 400; }
small { font-size: 0.875rem; font-weight: 300; }
```

## 🧩 핵심 컴포넌트

### 1. TradingSignalCard ⭐ **핵심 매매 가이드 컴포넌트**
```typescript
interface TradingSignalCardProps {
  signal: TradingSignal;
  onBuyClick: () => void;
  onSellClick: () => void;
  onDetailClick: () => void;
}

const TradingSignalCard: React.FC<TradingSignalCardProps> = ({
  signal,
  onBuyClick,
  onSellClick,
  onDetailClick
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return '#10B981'; // 초록
      case 'SELL': return '#EF4444'; // 빨강
      case 'HOLD': return '#F59E0B'; // 주황
      default: return '#6B7280';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'BUY': return '🟢 매수 신호!';
      case 'SELL': return '🔴 매도 신호!';
      case 'HOLD': return '🟡 관망 신호';
      default: return '⚪ 대기';
    }
  };

  return (
    <SignalCard>
      <SignalHeader>
        <CoinInfo>
          <CoinImage src={signal.coin.image} alt={signal.coin.name} />
          <CoinName>{signal.coin.name}</CoinName>
          <CoinSymbol>{signal.coin.symbol}</CoinSymbol>
        </CoinInfo>
        <SignalAction color={getActionColor(signal.signal.action)}>
          {getActionText(signal.signal.action)}
        </SignalAction>
      </SignalHeader>

      <PriceInfo>
        <CurrentPrice>현재가: ₩{signal.coin.currentPrice.toLocaleString()}</CurrentPrice>
        <TargetPrice>목표가: ₩{signal.targets.targetPrice.toLocaleString()} ({signal.expectedReturn > 0 ? '+' : ''}{signal.expectedReturn}%)</TargetPrice>
        <StopLoss>손절가: ₩{signal.targets.stopLoss.toLocaleString()} ({signal.maxLoss > 0 ? '+' : ''}{signal.maxLoss}%)</StopLoss>
        <PositionSize>💰 AI 추천 포지션: ₩{signal.targets.positionSize.toLocaleString()} ({signal.targets.positionSizePercentage}%)</PositionSize>
        <MaxRisk>⚠️ 최대 손실: ₩{signal.targets.maxRiskAmount.toLocaleString()}</MaxRisk>
      </PriceInfo>

      <TimeInfo>
        <ValidTime>⏰ 유효시간: {signal.timeframe.duration} 남음</ValidTime>
        <Strategy>🎯 전략: {signal.timeframe.strategy}</Strategy>
      </TimeInfo>

      <ReasonsList>
        <ReasonsTitle>💡 AI가 분석한 {signal.signal.action === 'BUY' ? '매수' : signal.signal.action === 'SELL' ? '매도' : '관망'} 근거:</ReasonsTitle>
        
        {signal.reasons.news && signal.reasons.news.length > 0 && (
          <ReasonCategory>
            <CategoryTitle>📰 뉴스 분석</CategoryTitle>
            {signal.reasons.news.map((reason, index) => (
              <ReasonItem key={`news-${index}`}>• {reason}</ReasonItem>
            ))}
          </ReasonCategory>
        )}
        
        {signal.reasons.technical && signal.reasons.technical.length > 0 && (
          <ReasonCategory>
            <CategoryTitle>📊 기술적 분석</CategoryTitle>
            {signal.reasons.technical.map((reason, index) => (
              <ReasonItem key={`tech-${index}`}>• {reason}</ReasonItem>
            ))}
          </ReasonCategory>
        )}
        
        {signal.reasons.fundamental && signal.reasons.fundamental.length > 0 && (
          <ReasonCategory>
            <CategoryTitle>🐋 고래 활동</CategoryTitle>
            {signal.reasons.fundamental.map((reason, index) => (
              <ReasonItem key={`fund-${index}`}>• {reason}</ReasonItem>
            ))}
          </ReasonCategory>
        )}
        
        {signal.reasons.sentiment && signal.reasons.sentiment.length > 0 && (
          <ReasonCategory>
            <CategoryTitle>😊 감정 분석</CategoryTitle>
            {signal.reasons.sentiment.map((reason, index) => (
              <ReasonItem key={`sent-${index}`}>• {reason}</ReasonItem>
            ))}
          </ReasonCategory>
        )}
      </ReasonsList>

      <Checklist>
        <ChecklistTitle>📋 매매 체크리스트:</ChecklistTitle>
        {signal.checklist.map((item) => (
          <ChecklistItem key={item.id} completed={item.completed}>
            {item.completed ? '✅' : '⭕'} {item.text}
          </ChecklistItem>
        ))}
      </Checklist>

      <ActionButtons>
        {signal.signal.action === 'BUY' && (
          <BuyButton onClick={onBuyClick}>
            🚀 지금 매수하기
          </BuyButton>
        )}
        {signal.signal.action === 'SELL' && (
          <SellButton onClick={onSellClick}>
            💰 지금 매도하기
          </SellButton>
        )}
        <DetailButton onClick={onDetailClick}>
          📊 더 자세히 보기
        </DetailButton>
      </ActionButtons>
    </SignalCard>
  );
};
```

### 2. CoinRecommendationCard
```typescript
interface CoinRecommendationCardProps {
  coin: {
    symbol: string;
    name: string;
    currentPrice: number;
    image: string;
  };
  expectedReturn: number;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  reasons: string[];
  confidence: number;
  timeframe: string;
}

const CoinRecommendationCard: React.FC<CoinRecommendationCardProps> = ({
  coin,
  expectedReturn,
  riskLevel,
  reasons,
  confidence,
  timeframe
}) => {
  return (
    <Card>
      <CoinHeader>
        <CoinImage src={coin.image} alt={coin.name} />
        <CoinInfo>
          <CoinName>{coin.name}</CoinName>
          <CoinSymbol>{coin.symbol}</CoinSymbol>
          <CoinPrice>₩{coin.currentPrice.toLocaleString()}</CoinPrice>
        </CoinInfo>
      </CoinHeader>
      
      <RecommendationInfo>
        <ExpectedReturn positive={expectedReturn > 0}>
          {expectedReturn > 0 ? '+' : ''}{expectedReturn}%
        </ExpectedReturn>
        <RiskLevel level={riskLevel}>
          위험도: {riskLevel}/5
        </RiskLevel>
        <Confidence>
          AI 신뢰도: {confidence}%
        </Confidence>
      </RecommendationInfo>
      
      <ReasonsList>
        {reasons.map((reason, index) => (
          <ReasonItem key={index}>
            💡 {reason}
          </ReasonItem>
        ))}
      </ReasonsList>
      
      <Timeframe>
        ⏰ 추천 기간: {timeframe}
      </Timeframe>
    </Card>
  );
};
```

### 2. SimplePriceCard
```typescript
interface SimplePriceCardProps {
  coin: {
    symbol: string;
    name: string;
    currentPrice: number;
    change24h: number;
    image: string;
  };
  isRecommended?: boolean;
  recommendationReason?: string;
}

const SimplePriceCard: React.FC<SimplePriceCardProps> = ({
  coin,
  isRecommended = false,
  recommendationReason
}) => {
  return (
    <Card recommended={isRecommended}>
      <CoinIcon>{getCoinIcon(coin.symbol)}</CoinIcon>
      <CoinName>{coin.name}</CoinName>
      <CoinPrice>₩{coin.currentPrice.toLocaleString()}</CoinPrice>
      <PriceChange positive={coin.change24h > 0}>
        {coin.change24h > 0 ? '+' : ''}{coin.change24h}%
      </PriceChange>
      
      {isRecommended && (
        <RecommendationBadge>
          🎯 AI 추천
        </RecommendationBadge>
      )}
      
      {recommendationReason && (
        <RecommendationReason>
          {recommendationReason}
        </RecommendationReason>
      )}
    </Card>
  );
};
```

## 🔄 API 연동

### 📚 백엔드 API 문서
**Swagger API 문서**: http://localhost:3000/api-docs

현재 백엔드에서 제공하는 모든 API 엔드포인트를 확인하고 프론트엔드에서 활용할 수 있습니다.

### API 서비스 구조
```typescript
// services/api.ts
const API_BASE_URL = 'http://localhost:3000/api';

export const api = {
  // 메인 대시보드 데이터
  getDashboardData: async (userId?: string) => {
    const response = await axios.get(`${API_BASE_URL}/dashboard`, {
      params: { userId }
    });
    return response.data;
  },
  
  // AI 추천 코인
  getRecommendations: async (userId?: string) => {
    const response = await axios.get(`${API_BASE_URL}/recommendations`, {
      params: { userId }
    });
    return response.data;
  },
  
  // 🎯 실시간 매매 신호 (핵심 기능!)
  getTradingSignals: async (userId?: string, strategy?: string) => {
    const response = await axios.get(`${API_BASE_URL}/trading/signals`, {
      params: { userId, strategy }
    });
    return response.data;
  },
  
  // 매매 신호 상세 정보
  getTradingSignalDetail: async (signalId: string) => {
    const response = await axios.get(`${API_BASE_URL}/trading/signals/${signalId}`);
    return response.data;
  },
  
  // 매매 실행 (실제 거래소 연동)
  executeTrade: async (tradeData: {
    signalId: string;
    action: 'BUY' | 'SELL';
    amount: number;
    price: number;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/trading/execute`, tradeData);
    return response.data;
  },
  
  // 사용자 성향 분석
  analyzeUserProfile: async (testAnswers: any[]) => {
    const response = await axios.post(`${API_BASE_URL}/analyze-profile`, {
      answers: testAnswers
    });
    return response.data;
  },
  
  // 코인 상세 정보
  getCoinDetails: async (coinId: string) => {
    const response = await axios.get(`${API_BASE_URL}/coins/${coinId}`);
    return response.data;
  }
};
```

### React Query 훅
```typescript
// hooks/useRecommendations.ts
export const useRecommendations = (userId?: string) => {
  return useQuery(
    ['recommendations', userId],
    () => api.getRecommendations(userId),
    {
      refetchInterval: 30000, // 30초마다 새로고침
      staleTime: 10000, // 10초간 캐시 유지
    }
  );
};

export const useDashboardData = (userId?: string) => {
  return useQuery(
    ['dashboard', userId],
    () => api.getDashboardData(userId),
    {
      refetchInterval: 60000, // 1분마다 새로고침
    }
  );
};

// 🎯 실시간 매매 신호 훅 (핵심!)
export const useTradingSignals = (userId?: string, strategy?: string) => {
  return useQuery(
    ['tradingSignals', userId, strategy],
    () => api.getTradingSignals(userId, strategy),
    {
      refetchInterval: 10000, // 10초마다 새로고침 (매매는 빠른 판단이 중요!)
      staleTime: 5000, // 5초간 캐시 유지
      refetchOnWindowFocus: true, // 창 포커스 시 즉시 새로고침
    }
  );
};

// 매매 실행 훅
export const useExecuteTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (tradeData: { signalId: string; action: 'BUY' | 'SELL'; amount: number; price: number }) =>
      api.executeTrade(tradeData),
    {
      onSuccess: () => {
        // 매매 성공 시 관련 쿼리들 새로고침
        queryClient.invalidateQueries(['tradingSignals']);
        queryClient.invalidateQueries(['dashboard']);
        toast.success('매매가 성공적으로 실행되었습니다!');
      },
      onError: (error) => {
        toast.error('매매 실행 중 오류가 발생했습니다.');
        console.error('Trade execution error:', error);
      }
    }
  );
};
```

## 📱 반응형 디자인

### 브레이크포인트
```css
/* 모바일 우선 설계 */
.container {
  padding: 1rem;
  max-width: 100%;
}

/* 태블릿 */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 768px;
    margin: 0 auto;
  }
  
  .coin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* 데스크톱 */
@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
  
  .coin-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 🎯 초심자 친화적 기능

### 1. **간단한 설명 텍스트**
```typescript
const getSimpleExplanation = (technicalTerm: string) => {
  const explanations = {
    'marketCap': '전체 시장에서 이 코인이 차지하는 가치',
    'volume': '하루 동안 거래된 코인의 양',
    'volatility': '가격이 얼마나 자주 변하는지',
    'liquidity': '코인을 쉽게 사고팔 수 있는 정도'
  };
  
  return explanations[technicalTerm] || technicalTerm;
};
```

### 2. **단계별 정보 제공**
```typescript
const InformationLevel = {
  BEGINNER: {
    showAdvancedCharts: false,
    showTechnicalIndicators: false,
    showDetailedMetrics: false,
    explanationLevel: 'simple'
  },
  INTERMEDIATE: {
    showAdvancedCharts: false,
    showTechnicalIndicators: true,
    showDetailedMetrics: true,
    explanationLevel: 'moderate'
  },
  ADVANCED: {
    showAdvancedCharts: true,
    showTechnicalIndicators: true,
    showDetailedMetrics: true,
    explanationLevel: 'detailed'
  }
};
```

### 3. **직관적인 아이콘과 색상**
```typescript
const getRiskColor = (level: number) => {
  const colors = {
    1: '#10B981', // 초록 - 안전
    2: '#84CC16', // 연두 - 낮음
    3: '#F59E0B', // 주황 - 보통
    4: '#EF4444', // 빨강 - 높음
    5: '#DC2626'  // 진빨강 - 매우 높음
  };
  return colors[level];
};

const getRiskIcon = (level: number) => {
  const icons = {
    1: '🛡️', // 방패
    2: '✅', // 체크
    3: '⚠️', // 경고
    4: '🚨', // 경보
    5: '💥'  // 폭발
  };
  return icons[level];
};
```

## 🚀 개발 우선순위

### 📋 개발 시작 전 체크리스트
1. **백엔드 서버 실행 확인**: `npm start` (포트 3000)
2. **Swagger API 문서 확인**: http://localhost:3000/api-docs
3. **사용 가능한 API 엔드포인트 파악**: Swagger에서 실제 API 구조 확인
4. **프론트엔드 프로젝트 초기화**: React + TypeScript + Vite

### Phase 1: 기본 구조 (1주)
1. 프로젝트 초기 설정
2. 기본 라우팅 및 레이아웃
3. 메인 대시보드 기본 구조

### Phase 2: 핵심 기능 (2주)
1. **🎯 실시간 매매 가이드 페이지** (최우선!)
2. TradingSignalCard 컴포넌트
3. AI 추천 카드 컴포넌트
4. 사용자 성향 분석 페이지
5. API 연동

### Phase 3: 매매 기능 강화 (1주)
1. **실시간 매매 신호 연동**
2. **매매 실행 기능**
3. **매매 체크리스트 시스템**
4. **알림 및 푸시 기능**

### Phase 4: 개선 및 최적화 (1주)
1. 반응형 디자인
2. 애니메이션 추가
3. 성능 최적화

## 📝 추가 고려사항

### 1. **접근성**
- 큰 터치 영역 (최소 44px)
- 명확한 색상 대비
- 스크린 리더 지원

### 2. **성능**
- 이미지 지연 로딩
- 컴포넌트 메모이제이션
- API 응답 캐싱

### 3. **사용자 경험**
- 로딩 상태 표시
- 에러 처리 및 재시도
- 오프라인 상태 처리

### 4. **🎯 실시간 매매 특화 기능**
- **AI가 모든 것을 자동 설정**: 손절가, 목표가, 포지션 크기, 매매 타이밍
- **매매 신호 우선순위 표시** (긴급도별 색상)
- **매매 타이머** (유효시간 카운트다운)
- **매매 히스토리** (성공/실패 기록)
- **손익 계산기** (실시간 수익률 표시)
- **매매 알림** (브라우저 푸시, 소리 알림)

## 🎯 핵심 차별화 포인트

### 1. **"전문가가 옆에 있는 느낌"**
- 실시간으로 "지금 사세요/팔세요" 신호
- **AI가 모든 것을 자동 계산**: 손절가, 목표가, 포지션 크기
- **구체적인 매수/매도 가격 제시**
- **명확한 손절가/목표가 설정**
- **포지션 크기 자동 계산** (사용자 자본금 대비)

### 2. **초심자도 바로 따라할 수 있는 가이드**
- 단계별 매매 체크리스트
- 쉬운 한글 설명
- 직관적인 색상과 아이콘

### 3. **실시간 업데이트**
- 10초마다 매매 신호 새로고침
- 시장 변화에 즉시 대응
- 유효시간 카운트다운

### 4. **개인화된 매매 전략**
- 사용자 성향에 맞는 전략 추천
- 스캘핑/스윙/데이트레이딩 선택 가능
- 위험도에 따른 포지션 크기 조절

이 가이드를 따라 개발하시면 **초심자도 전문가처럼 매매할 수 있는** 실시간 가이드 서비스를 만들 수 있습니다! 🚀

**핵심은 "복잡한 분석은 AI가 하고, 사용자는 AI의 신호를 따라하기만 하면 되는" 구조입니다!** 💡

## 🤖 AI가 자동으로 설정해주는 것들

### 1. **종합 분석 기반 매매 신호 생성**
- **📰 뉴스 분석**: 실시간 뉴스 감정분석으로 시장 동향 파악
- **📊 기술적 분석**: 지지선/저항선, RSI, MACD 등
- **🐋 고래 활동**: 대용량 거래 및 고래 움직임 추적
- **😊 감정 분석**: 소셜미디어 및 커뮤니티 감정 분석
- **📈 거래량 분석**: 비정상적 거래량 급증 감지
- **위험도 기반**: 사용자 성향에 맞는 손실 한도

### 2. **포지션 크기 자동 계산**
- **자본금 대비 비율**: 사용자 자본금의 5-20% (성향별)
- **리스크 관리**: 최대 손실 금액 제한
- **시장 상황**: 시장 변동성에 따른 포지션 크기 조절

### 3. **실시간 종합 분석 및 매매 타이밍 결정**
- **📰 뉴스 기반 타이밍**: 긴급 뉴스 발생 시 즉시 신호 생성
- **🐋 고래 활동 감지**: 대량 거래 발생 시 즉시 알림
- **📊 기술적 신호**: 차트 패턴 및 지표 변화 감지
- **😊 감정 변화**: 시장 감정 급변 시 신호 생성
- **유효시간 설정**: 신호의 지속 가능 시간 계산
- **우선순위 결정**: 긴급도에 따른 신호 순위

### 4. **개인화된 설정**
- **투자 성향**: 안정형/공격형에 따른 차별화
- **경험 수준**: 초심자/고급자에 따른 복잡도 조절
- **가용 시간**: 스캘핑/스윙/장기에 따른 전략 선택

## 📰 뉴스 분석 기반 매매 신호 예시

### **긴급 뉴스 발생 시**
```
🚨 긴급 매수 신호!
📰 뉴스: "비트코인 ETF 승인 확정 발표"
⏰ 신호 생성: 뉴스 발표 30초 후
🎯 AI 분석: 시장 급등 예상, 즉시 매수 권장
```

### **고래 활동 감지 시**
```
🐋 고래 매수 신호!
📊 분석: 1000 BTC 대량 매수 감지
⏰ 신호 생성: 거래 발생 1분 후
🎯 AI 분석: 기관 투자자 매수 시작, 따라 매수 권장
```

### **기술적 신호 발생 시**
```
📊 기술적 매수 신호!
📈 분석: 지지선에서 반등, RSI 과매도 구간
⏰ 신호 생성: 차트 패턴 확인 즉시
🎯 AI 분석: 단기 반등 예상, 매수 타이밍
```

**결과적으로 사용자는 "지금 사세요/팔세요" 버튼만 누르면 됩니다!** 🚀

---

## 📚 개발 참고 자료

### 백엔드 API 연동 가이드
- **Swagger API 문서**: http://localhost:3000/api-docs
- **백엔드 서버 주소**: http://localhost:3000
- **API Base URL**: http://localhost:3000/api

### 주요 API 엔드포인트 (Swagger에서 확인)
- `/api/health` - 서버 상태 확인
- `/api/coins` - 코인 정보
- `/api/signals` - 신호 분석
- `/api/alerts` - 알림 관리
- `/api/onchain` - 온체인 데이터
- `/api/social-media` - 소셜미디어 분석
- `/api/investment-strategy` - 투자 전략
- `/api/personalization` - 개인화
- `/api/korean-market` - 한국 시장 분석
- `/api/signal-persistence` - 신호 지속성
- `/api/real-time-optimization` - 실시간 최적화
- `/api/performance-monitoring` - 성능 모니터링
- `/api/data-quality` - 데이터 품질
- `/api/user-profiles` - 사용자 프로필

### 개발 팁
1. **Swagger UI에서 API 테스트**: 각 엔드포인트를 직접 테스트해보세요
2. **실제 응답 데이터 확인**: 프론트엔드에서 사용할 데이터 구조를 정확히 파악하세요
3. **에러 처리**: 백엔드 API 응답 형식을 확인하고 적절한 에러 처리를 구현하세요
4. **실시간 업데이트**: WebSocket이나 폴링을 통한 실시간 데이터 업데이트를 고려하세요
