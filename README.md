# GainDeuk - 암호화폐 신호 분석 MVP 백엔드

## 🎯 프로젝트 개요

**GainDeuk**은 17,000개 이상의 모든 암호화폐를 실시간으로 분석하여 0-100점 신호 스코어와 투자 전략을 제공하는 혁신적인 백엔드 시스템입니다.

## ✨ 주요 기능

### 🔄 실시간 데이터 수집
- **CoinGecko API**를 통한 17,000개+ 암호화폐 데이터 수집
- **뉴스/RSS 피드** 수집 및 감정분석
- **고래 거래 추적** (BTC, ETH 등)
- 실시간 가격, 거래량, 시가총액 데이터

### 🧠 신호 분석 엔진
- **0-100점 신호 스코어링** 시스템
- 가격 모멘텀 분석 (1h, 24h, 7d, 30d)
- 거래량 분석 (거래량/시가총액 비율)
- 시장 포지션 분석 (시가총액 순위 기반)
- 감정분석 (뉴스 기반)
- 고래 활동 분석

### 💡 투자 전략 추천
- **점수 기반 전략 분류**: 점수, 변동성, 거래량 비율을 종합 분석
- **전략별 신호 필터링**: SCALPING, DAY_TRADING, SWING_TRADING, LONG_TERM
- **동적 전략 결정**: 시장 상황에 따른 전략 자동 조정
- 신호 강도별 추천 (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
- 신뢰도 표시 (HIGH, MEDIUM, LOW)

### 🌐 RESTful API
- 신호 조회 API (페이징, 필터링, 검색)
- 코인 정보 API
- 통계 API
- 알림 API

### ⚡ 실시간 처리 시스템
- 스케줄러 기반 자동 업데이트
- 우선순위별 처리 (상위 100개/500개/전체)
- Queue 시스템을 통한 비동기 처리
- Rate limiting 관리

### 🔔 알림 시스템
- 강한 신호 알림 (80점 이상 또는 20점 이하)
- Firebase FCM 푸시 알림
- 알림 설정 및 관리

## 🛠 기술 스택

### Backend
- **Node.js 18+** - 런타임 환경
- **Express.js** - 웹 프레임워크
- **MongoDB** - 데이터 저장소
- **Redis** - 캐싱 및 Queue
- **Firebase** - 알림 서비스

### External APIs
- **CoinGecko API** - 암호화폐 데이터
- **RSS2JSON API** - 뉴스 수집
- **Etherscan API** - 고래 추적
- **BlockCypher API** - BTC 고래 추적

### Infrastructure
- **Docker** - 컨테이너화
- **Railway/Vercel** - 배포
- **Winston** - 로깅
- **Jest** - 테스트

## 📊 성능 요구사항

### 처리량
- 상위 100개 코인: 5분마다 업데이트
- 상위 500개 코인: 15분마다 업데이트
- 전체 코인: 1시간마다 업데이트
- API 응답시간: 200ms 이하

### 확장성
- 수평 확장 가능한 아키텍처
- Queue 시스템을 통한 비동기 처리
- 캐싱을 통한 성능 최적화

## 💰 비용 제약

### 무료 티어 활용
- MongoDB Atlas: 무료 512MB
- Redis Cloud: 무료 30MB
- CoinGecko API: 무료 10,000 calls/month
- Railway/Vercel: 무료 배포

### 예산
- 총 예산: 100만원 이하
- 무료 서비스 최대 활용
- 필요시 유료 서비스 최소화

## 🎯 전략별 신호 분류 시스템

### 전략 분류 로직
새로운 점수 기반 전략 분류 시스템이 구현되어 각 신호를 적절한 투자 전략으로 자동 분류합니다:

#### SCALPING (스켈핑)
- **조건**: 점수 80+ 이고 변동성 10% 미만
- **특징**: 단기 고수익 전략, 빠른 진입/청산
- **대상**: 안정적이면서 강한 신호를 보이는 코인

#### DAY_TRADING (데이트레이딩)
- **조건**: 점수 70-79 이고 변동성 20% 미만
- **특징**: 일일 거래 전략, 하루 내 진입/청산
- **대상**: 중간 수준의 신호와 적당한 변동성

#### SWING_TRADING (스윙트레이딩)
- **조건**: 점수 60-69
- **특징**: 중기 거래 전략, 며칠~몇 주 보유
- **대상**: 변동성이 높으면 매도, 낮으면 매수 신호

#### LONG_TERM (장기투자)
- **조건**: 점수 60 미만
- **특징**: 장기 보유 전략, 수개월~수년 보유
- **대상**: 약한 신호이지만 장기적 가치가 있는 코인

### API 사용 예시
```bash
# 스켈핑 전략 신호 조회
curl "http://localhost:3000/api/signals?strategy=SCALPING&limit=10"

# 데이트레이딩 전략 신호 조회
curl "http://localhost:3000/api/signals?strategy=DAY_TRADING&limit=10"

# 스윙트레이딩 전략 신호 조회
curl "http://localhost:3000/api/signals?strategy=SWING_TRADING&limit=10"

# 장기투자 전략 신호 조회
curl "http://localhost:3000/api/signals?strategy=LONG_TERM&limit=10"
```

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/gaindeuk/gaindeuk-backend.git
cd gaindeuk-backend
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 필요한 환경 변수를 설정하세요
```

### 4. 데이터베이스 설정
```bash
# MongoDB와 Redis가 실행 중인지 확인하세요
# Docker를 사용하는 경우:
docker-compose up -d
```

### 5. 애플리케이션 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 6. API 문서 확인
- Swagger UI: http://localhost:3000/api-docs
- 헬스체크: http://localhost:3000/health

### 7. 전략별 API 테스트
```bash
# 신호 데이터 새로고침
node refresh_signals.js

# 전략별 API 테스트
node test_strategy_api.js
```

## 📁 프로젝트 구조

```
gaindeuk-backend/
├── src/
│   ├── controllers/     # 컨트롤러
│   ├── models/         # 데이터베이스 모델
│   ├── services/       # 비즈니스 로직
│   ├── middleware/     # 미들웨어
│   ├── routes/         # API 라우트
│   ├── utils/          # 유틸리티
│   ├── app.js          # Express 앱 설정
│   └── server.js       # 서버 진입점
├── config/             # 설정 파일
├── tests/              # 테스트 파일
├── logs/               # 로그 파일
├── docker-compose.yml  # Docker Compose 설정
├── Dockerfile          # Docker 설정
└── package.json        # 프로젝트 설정
```

## 🔧 개발 가이드

### 코드 스타일
- ESLint를 사용한 코드 품질 관리
- Prettier를 사용한 코드 포맷팅
- JSDoc을 사용한 API 문서화

### 테스트
```bash
# 유닛 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# 통합 테스트 실행
npm run test:integration
```

### 로깅
- Winston을 사용한 구조화된 로깅
- 로그 레벨: error, warn, info, debug
- 파일 및 콘솔 출력 지원

## 🚀 배포

### Docker를 사용한 배포
```bash
# 이미지 빌드
docker build -t gaindeuk-backend .

# 컨테이너 실행
docker run -p 3000:3000 gaindeuk-backend
```

### Docker Compose를 사용한 배포
```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### PM2를 사용한 프로덕션 배포
```bash
# PM2로 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 로그 확인
pm2 logs gaindeuk-backend
```

### 배포 스크립트 사용
```bash
# 전체 배포
./deploy.sh

# 개별 명령어
./deploy.sh start    # 시작
./deploy.sh stop     # 중지
./deploy.sh restart  # 재시작
./deploy.sh status   # 상태 확인
./deploy.sh logs     # 로그 확인
```

## 📈 모니터링

### 헬스체크
- `/health` - 기본 헬스체크
- `/health/detailed` - 상세 헬스체크
- `/health/ready` - 준비 상태 확인
- `/health/live` - 생존 상태 확인

### 메트릭
- API 응답 시간
- 메모리 사용량
- 데이터베이스 연결 상태
- Queue 상태

## 🧪 테스트

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 특정 테스트 실행
npm test -- --grep "SignalCalculator"

# 테스트 커버리지
npm run test:coverage

# 통합 테스트
npm run test:integration
```

### 테스트 구조
- `tests/unit/` - 유닛 테스트
- `tests/integration/` - 통합 테스트
- `tests/api/` - API 테스트

## 📚 API 문서

### Swagger UI
- 개발 환경: http://localhost:3000/api-docs
- 프로덕션 환경: https://api.gaindeuk.com/api-docs

### 주요 엔드포인트
- `GET /api/coins` - 코인 목록
- `GET /api/signals` - 신호 목록 (전략별 필터링 지원)
- `GET /api/signals?strategy=SCALPING` - 스켈핑 전략 신호
- `GET /api/signals?strategy=DAY_TRADING` - 데이트레이딩 전략 신호
- `GET /api/signals?strategy=SWING_TRADING` - 스윙트레이딩 전략 신호
- `GET /api/signals?strategy=LONG_TERM` - 장기 투자 전략 신호
- `GET /api/alerts` - 알림 목록
- `GET /api/health` - 헬스체크

## 🔒 보안

### 인증 및 권한
- API 키 기반 인증
- Rate limiting 적용
- CORS 설정

### 데이터 보호
- 민감한 정보 암호화
- 안전한 환경 변수 관리
- 로그 데이터 마스킹

## 🚀 성능 최적화

### 캐싱 전략
- Redis를 사용한 다층 캐싱
- API 응답 캐싱
- 데이터베이스 쿼리 최적화

### 비동기 처리
- Queue 시스템을 통한 백그라운드 작업
- 스케줄러를 통한 주기적 업데이트
- 배치 처리 최적화

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

- 이슈 리포트: [GitHub Issues](https://github.com/gaindeuk/gaindeuk-backend/issues)
- 이메일: support@gaindeuk.com
- 웹사이트: https://gaindeuk.com

## 🙏 감사의 말

- CoinGecko API 팀
- MongoDB 팀
- Redis 팀
- 모든 오픈소스 기여자들

---

**GainDeuk** - 암호화폐 투자의 새로운 패러다임을 제시합니다. 🚀