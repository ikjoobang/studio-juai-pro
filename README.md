# 🚀 Super Agent Platform

> AI 네비게이터, 워크스페이스, B2B API 허브가 결합된 올인원 콘텐츠 제작 플랫폼

<p align="center">
  <img src="https://via.placeholder.com/800x400/111111/03C75A?text=Super+Agent+Platform" alt="Super Agent Platform Banner" />
</p>

## 📋 프로젝트 개요

Super Agent Platform은 AI 기반의 콘텐츠 제작 자동화 플랫폼입니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| **Active Chatbot** | 사용자 행동을 분석해 먼저 질문하고 리드하는 AI 챗봇 |
| **Smart Action Card** | 텍스트가 아닌 실행 가능한 카드 UI 제공 |
| **Auto-Editing** | Creatomate API를 활용한 영상 템플릿 자동 편집 |
| **Trend Analysis** | YouTube/Google 트렌드 크롤링 및 분석 |
| **Multi-Vendor API Hub** | Kling, Midjourney, HeyGen 등 다중 API 연동 |

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Studio Juai Design System
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Framework**: Python FastAPI (Async)
- **AI**: Google Gemini 1.5 Pro
- **Database**: Supabase (PostgreSQL)
- **Background Tasks**: Celery + Redis

### External APIs
- **Video Generation**: Kling AI, Runway
- **Image Generation**: Midjourney
- **Avatar Video**: HeyGen
- **Template Rendering**: Creatomate
- **Voice Synthesis**: ElevenLabs
- **Payment**: PortOne (KG Inicis)

## 📁 프로젝트 구조

```
super-agent-platform/
├── backend/                    # Python FastAPI 백엔드
│   ├── main.py                # 메인 API 서버
│   ├── factory_engine.py      # 영상 제작 엔진
│   ├── database.py            # Supabase 연결
│   ├── requirements.txt       # Python 의존성
│   └── .env.example           # 환경변수 예시
│
├── frontend/                   # Next.js 14 프론트엔드
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # 메인 채팅 인터페이스
│   │   │   ├── layout.tsx     # 루트 레이아웃
│   │   │   └── globals.css    # 전역 스타일
│   │   ├── components/
│   │   │   ├── SmartActionCard.tsx  # 스마트 액션 카드
│   │   │   └── Dashboard.tsx        # 워크스페이스 대시보드
│   │   └── lib/               # 유틸리티
│   ├── tailwind.config.ts     # Tailwind 설정 (Juai 디자인)
│   ├── package.json           # Node.js 의존성
│   └── .env.local.example     # 환경변수 예시
│
├── database/
│   └── schema.sql             # Supabase 데이터베이스 스키마
│
└── README.md                  # 이 파일
```

## 🎨 Studio Juai Design System

### 컬러 팔레트

| Color | Hex | Usage |
|-------|-----|-------|
| **Juai Green** | `#03C75A` | Primary, Success, CTA |
| **Juai Orange** | `#FF6B35` | Secondary, Warning, Accent |
| **Juai Black** | `#111111` | Text, Dark Background |
| **Juai Night** | `#1a1a1a` | Dark Mode Background |
| **Juai Paper** | `#ffffff` | Light Background |

### 타이포그래피

- **Primary Font**: Pretendard
- **Monospace**: JetBrains Mono

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/super-agent-platform.git
cd super-agent-platform
```

### 2. Backend 설정

```bash
# 백엔드 디렉토리로 이동
cd backend

# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력

# 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend 설정

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 설정 입력

# 개발 서버 실행
npm run dev
```

### 4. Database 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `database/schema.sql` 실행
3. 환경변수에 Supabase URL과 Key 입력

### 5. 접속

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## ⚙️ 환경변수 설정

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Google Gemini AI
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Video Generation APIs
KLING_API_KEY=your-kling-api-key
HEYGEN_API_KEY=your-heygen-api-key
CREATOMATE_API_KEY=your-creatomate-api-key

# Payment
PORTONE_API_KEY=your-portone-api-key
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📚 API 엔드포인트

### Chat (Active Chatbot)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | AI 챗봇 대화 |
| POST | `/api/chat/proactive` | 선제적 프롬프트 생성 |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/user/{user_id}` | 사용자 프로젝트 목록 |
| POST | `/api/projects` | 새 프로젝트 생성 |
| GET | `/api/projects/{project_id}` | 프로젝트 상세 조회 |

### Factory (영상 생성)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/factory/start` | 영상 생성 시작 |
| GET | `/api/factory/status/{project_id}` | 생성 상태 조회 |

### Trends

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | 트렌드 데이터 조회 |

### Prompts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/prompts/generate` | 아이폰 감성 프롬프트 생성 |

## 🔒 보안

- Supabase RLS (Row Level Security) 적용
- API 키는 서버 사이드에서만 사용
- CORS 설정으로 허용된 origin만 접근 가능
- 환경변수로 민감한 정보 관리

## 🧪 테스트

```bash
# Backend 테스트
cd backend
pytest

# Frontend 테스트
cd frontend
npm run test
```

## 📦 배포

### Vercel (Frontend)

```bash
npm run build
vercel deploy
```

### Railway/Render (Backend)

```bash
# Dockerfile 또는 railway.json 참조
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 문의

- **Email**: contact@studiojuai.com
- **Website**: https://studiojuai.com

---

<p align="center">
  Made with ❤️ by <strong>Studio Juai</strong>
</p>
