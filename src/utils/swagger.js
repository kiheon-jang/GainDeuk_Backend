const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GainDeuk API',
      version: '1.0.0',
      description: 'GainDeuk - 암호화폐 신호 분석 MVP 백엔드 API',
      contact: {
        name: 'GainDeuk Team',
        email: 'support@gaindeuk.com',
        url: 'https://gaindeuk.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.gaindeuk.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Coin: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId'
            },
            coinId: {
              type: 'string',
              description: 'CoinGecko 코인 ID',
              example: 'bitcoin'
            },
            symbol: {
              type: 'string',
              description: '코인 심볼',
              example: 'BTC'
            },
            name: {
              type: 'string',
              description: '코인 이름',
              example: 'Bitcoin'
            },
            image: {
              type: 'string',
              format: 'uri',
              description: '코인 이미지 URL'
            },
            currentPrice: {
              type: 'number',
              description: '현재 가격 (USD)',
              example: 45000.50
            },
            marketCap: {
              type: 'number',
              description: '시가총액',
              example: 850000000000
            },
            marketCapRank: {
              type: 'number',
              description: '시가총액 순위',
              example: 1
            },
            totalVolume: {
              type: 'number',
              description: '24시간 거래량',
              example: 25000000000
            },
            priceChange: {
              type: 'object',
              properties: {
                '1h': {
                  type: 'number',
                  description: '1시간 가격 변화율 (%)',
                  example: 2.5
                },
                '24h': {
                  type: 'number',
                  description: '24시간 가격 변화율 (%)',
                  example: 5.2
                },
                '7d': {
                  type: 'number',
                  description: '7일 가격 변화율 (%)',
                  example: 12.8
                },
                '30d': {
                  type: 'number',
                  description: '30일 가격 변화율 (%)',
                  example: -8.3
                }
              }
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              description: '마지막 업데이트 시간'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정 시간'
            }
          }
        },
        Signal: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId'
            },
            coinId: {
              type: 'string',
              description: '코인 ID',
              example: 'bitcoin'
            },
            symbol: {
              type: 'string',
              description: '코인 심볼',
              example: 'BTC'
            },
            name: {
              type: 'string',
              description: '코인 이름',
              example: 'Bitcoin'
            },
            finalScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: '최종 신호 점수',
              example: 85.5
            },
            breakdown: {
              type: 'object',
              properties: {
                price: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '가격 모멘텀 점수',
                  example: 90
                },
                volume: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '거래량 점수',
                  example: 75
                },
                market: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '시장 포지션 점수',
                  example: 95
                },
                sentiment: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '감정분석 점수',
                  example: 80
                },
                whale: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '고래 활동 점수',
                  example: 60
                }
              }
            },
            recommendation: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['STRONG_BUY', 'BUY', 'HOLD', 'WEAK_SELL', 'SELL', 'STRONG_SELL'],
                  description: '추천 액션',
                  example: 'STRONG_BUY'
                },
                confidence: {
                  type: 'string',
                  enum: ['HIGH', 'MEDIUM', 'LOW'],
                  description: '신뢰도',
                  example: 'HIGH'
                }
              }
            },
            timeframe: {
              type: 'string',
              enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM'],
              description: '추천 타임프레임',
              example: 'DAY_TRADING'
            },
            priority: {
              type: 'string',
              enum: ['high_priority', 'medium_priority', 'low_priority'],
              description: '우선순위',
              example: 'high_priority'
            },
            rank: {
              type: 'number',
              description: '신호 순위',
              example: 1
            },
            currentPrice: {
              type: 'number',
              description: '현재 가격',
              example: 45000.50
            },
            marketCap: {
              type: 'number',
              description: '시가총액',
              example: 850000000000
            },
            metadata: {
              type: 'object',
              properties: {
                priceData: {
                  type: 'object',
                  properties: {
                    change_1h: { type: 'number' },
                    change_24h: { type: 'number' },
                    change_7d: { type: 'number' },
                    change_30d: { type: 'number' }
                  }
                },
                volumeRatio: {
                  type: 'number',
                  description: '거래량/시가총액 비율'
                },
                whaleActivity: {
                  type: 'number',
                  description: '고래 활동 점수'
                },
                newsCount: {
                  type: 'number',
                  description: '뉴스 기사 수'
                },
                lastUpdated: {
                  type: 'string',
                  format: 'date-time'
                },
                calculationTime: {
                  type: 'number',
                  description: '계산 시간 (ms)'
                },
                dataQuality: {
                  type: 'string',
                  enum: ['excellent', 'good', 'fair', 'poor'],
                  description: '데이터 품질'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정 시간'
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId'
            },
            userId: {
              type: 'string',
              description: '사용자 ID',
              example: 'user123'
            },
            coinId: {
              type: 'string',
              description: '코인 ID',
              example: 'bitcoin'
            },
            symbol: {
              type: 'string',
              description: '코인 심볼',
              example: 'BTC'
            },
            alertType: {
              type: 'string',
              enum: ['STRONG_SIGNAL', 'PRICE_TARGET', 'VOLUME_SPIKE', 'WHALE_MOVE', 'CUSTOM'],
              description: '알림 타입',
              example: 'STRONG_SIGNAL'
            },
            triggerScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: '트리거 점수',
              example: 85
            },
            isTriggered: {
              type: 'boolean',
              description: '트리거 여부',
              example: false
            },
            triggeredAt: {
              type: 'string',
              format: 'date-time',
              description: '트리거 시간'
            },
            settings: {
              type: 'object',
              properties: {
                minScore: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '최소 점수',
                  example: 80
                },
                maxScore: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: '최대 점수',
                  example: 20
                },
                timeframes: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['SCALPING', 'DAY_TRADING', 'SWING_TRADING', 'LONG_TERM']
                  },
                  description: '타임프레임 필터'
                },
                notificationEnabled: {
                  type: 'boolean',
                  description: '알림 활성화',
                  example: true
                },
                emailEnabled: {
                  type: 'boolean',
                  description: '이메일 알림 활성화',
                  example: false
                },
                pushEnabled: {
                  type: 'boolean',
                  description: '푸시 알림 활성화',
                  example: true
                },
                webhookUrl: {
                  type: 'string',
                  format: 'uri',
                  description: '웹훅 URL'
                },
                cooldownMinutes: {
                  type: 'number',
                  minimum: 0,
                  description: '쿨다운 시간 (분)',
                  example: 60
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                lastTriggered: {
                  type: 'string',
                  format: 'date-time'
                },
                triggerCount: {
                  type: 'number',
                  description: '트리거 횟수'
                },
                message: {
                  type: 'string',
                  description: '알림 메시지'
                },
                data: {
                  type: 'object',
                  description: '추가 데이터'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: '우선순위'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정 시간'
            }
          }
        },
        DashboardData: {
          type: 'object',
          properties: {
            aiRecommendations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CoinRecommendation'
              },
              description: 'AI 추천 코인 목록'
            },
            userProfile: {
              $ref: '#/components/schemas/UserProfile'
            },
            marketSummary: {
              $ref: '#/components/schemas/MarketSummary'
            }
          }
        },
        CoinRecommendation: {
          type: 'object',
          properties: {
            coin: {
              $ref: '#/components/schemas/Coin'
            },
            expectedReturn: {
              type: 'number',
              description: '예상 수익률 (%)',
              example: 15.5
            },
            riskLevel: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: '위험도 (1=안전, 5=위험)',
              example: 3
            },
            reasons: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '추천 이유',
              example: ['강력한 기술적 분석 신호', '높은 수익 잠재력', '안정적인 시장 지위']
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'AI 신뢰도',
              example: 85
            },
            timeframe: {
              type: 'string',
              description: '추천 기간',
              example: '1-3일'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '사용자 ID',
              example: 'user123'
            },
            investmentStyle: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: '투자 스타일',
              example: 'moderate'
            },
            riskTolerance: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: '위험 감수성',
              example: 3
            },
            experienceLevel: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              description: '경험 수준',
              example: 'intermediate'
            },
            recommendedStrategy: {
              type: 'string',
              description: '추천 전략',
              example: '균형 투자'
            },
            preferences: {
              type: 'object',
              properties: {
                notifications: {
                  type: 'boolean',
                  description: '알림 활성화',
                  example: true
                },
                language: {
                  type: 'string',
                  enum: ['ko', 'en'],
                  description: '언어 설정',
                  example: 'ko'
                },
                theme: {
                  type: 'string',
                  enum: ['light', 'dark'],
                  description: '테마 설정',
                  example: 'light'
                }
              }
            }
          }
        },
        MarketSummary: {
          type: 'object',
          properties: {
            totalMarketCap: {
              type: 'string',
              description: '전체 시가총액',
              example: '$2.1T'
            },
            marketTrend: {
              type: 'string',
              enum: ['up', 'down', 'sideways'],
              description: '시장 트렌드',
              example: 'up'
            },
            trendDescription: {
              type: 'string',
              description: '트렌드 설명',
              example: '시장이 상승세를 보이고 있습니다.'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '에러 메시지',
              example: '요청을 처리할 수 없습니다'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              },
              description: '상세 에러 정보'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: '잘못된 요청',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: '리소스를 찾을 수 없음',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: '서버 내부 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: '시스템 헬스체크 관련 API'
      },
      {
        name: 'Coins',
        description: '암호화폐 정보 관련 API'
      },
      {
        name: 'Signals',
        description: '신호 분석 관련 API'
      },
      {
        name: 'Dashboard',
        description: '대시보드 데이터 관련 API'
      },
      {
        name: 'Alerts',
        description: '알림 관련 API'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/app.js'
  ]
};

const specs = swaggerJsdoc(options);

// Swagger UI 설정
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2c3e50 }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0 }
  `,
  customSiteTitle: 'GainDeuk API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

module.exports = {
  swaggerUi,
  specs,
  swaggerUiOptions
};
