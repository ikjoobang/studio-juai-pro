# 🚀 Super Agent Platform

> AI 네비게이터, 워크스페이스, B2B API 허브가 결합된 올인원 콘텐츠 제작 플랫폼

![Super Agent Platform](https://via.placeholder.com/800x400/111111/03C75A?text=Super+Agent+Platform)

---

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [핵심 기능](#핵심-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [환경 변수](#환경-변수)
- [API 엔드포인트](#api-엔드포인트)
- [디자인 시스템](#디자인-시스템)

---

## 프로젝트 개요

**Super Agent Platform**은 AI 기반의 콘텐츠 제작 자동화 플랫폼입니다.

- **Active Chatbot**: 사용자 행동을 분석해 먼저 질문하고 리드하는 AI
- **Smart Action Card**: 텍스트가 아닌 실행 가능한 카드 UI
- **Auto-Editing**: Creatomate API를 활용한 영상 템플릿 자동 편집
- **Multi-Vendor API Hub**: Kling, Midjourney, HeyGen 등 다중 API 연동

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **Active Chatbot** | Google Gemini 기반 선제적 대화형 AI |
| **Smart Action Card** | 실행 가능한 인터랙티브 카드 UI |
| **아이폰 감성 프롬프트** | shot on iPhone 스타일 자동 주입 |
| **영상 자동 편집** | Creatomate 템플릿 기반 렌더링 |
| **트렌드 분석** | YouTube/Instagram 실시간 트렌드 |
| **B2B API Hub** | 다중 벤더 API 통합 관리 |

---

## 기술 스택

### Frontend
```
Next.js 14 (App Router) + TypeScript
Tailwind CSS + Studio Juai Design System
Zustand (상태 관리)
Framer Motion (애니메이션)
Lucide React (아이콘)
```

### Backend
```
Python FastAPI (Async)
Google Gemini 1.5 Pro (AI)
Supabase PostgreSQL (Database)
Celery + Redis (Background Tasks)
```

### External APIs
```
Kling AI - AI 영상 생성
HeyGen - AI 아바타 영상
Creatomate - 영상 템플릿 렌더링
PortOne - 결제 (KG Inicis)
```

---

## 프로젝트 구조

```
super-agent-platform/
├── backend/                          # Python FastAPI
│   ├── main.py                       # 메인 API 서버
│   ├── factory_engine.py             # 영상 제작 엔진
│   ├── database.py                   # Supabase 연결
│   ├── requirements.txt              # Python 의존성
│   └── .env.example                  # 환경변수 예시
│
├── frontend/                         # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # 메인 채팅 인터페이스
│   │   │   ├── layout.tsx            # 루트 레이아웃
│   │   │   └── globals.css           # 전역 스타일
│   │   ├── components/
│   │   │   ├── SmartActionCard.tsx   # 스마트 액션 카드
│   │   │   ├── Dashboard.tsx         # 워크스페이스
│   │   │   ├── Header.tsx            # 헤더
│   │   │   ├── Sidebar.tsx           # 사이드바
│   │   │   └── ChatInput.tsx         # 채팅 입력
│   │   └── lib/
│   │       ├── api.ts                # API 클라이언트
│   │       ├── supabase.ts           # Supabase 클라이언트
│   │       └── store.ts              # Zustand 스토어
│   ├── tailwind.config.ts            # Tailwind 설정
│   ├── package.json                  # Node.js 의존성
│   └── .env.local.example            # 환경변수 예시
│
├── database/
│   └── schema.sql                    # Supabase DB 스키마
│
├── .gitignore
└── README.md
```

---

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/super-agent-platform.git
cd super-agent-platform
```

### 2. Backend 설정

```bash
# 백엔드 디렉토리 이동
cd backend

# 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 API 키 입력

# 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend 설정

```bash
# 프론트엔드 디렉토리 이동
cd frontend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일 편집

# 개발 서버 실행
npm run dev
```

### 4. Database 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `database/schema.sql` 실행
3. `.env` 파일에 Supabase URL과 Key 입력

### 5. 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 환경 변수

### Backend (.env)

```env
# Database
SUPABASE_URL=
SUPABASE_KEY=

# AI Brain
GOOGLE_GEMINI_API_KEY=

# Media Generation APIs
KLING_API_KEY=
HEYGEN_API_KEY=
CREATOMATE_API_KEY=

# Payment
PORTONE_API_KEY=
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## API 엔드포인트

### Chat (Active Chatbot)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | AI 챗봇 대화 |
| `POST` | `/api/chat/proactive` | 선제적 프롬프트 생성 |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects` | 새 프로젝트 생성 |
| `GET` | `/api/projects/{id}` | 프로젝트 조회 |
| `GET` | `/api/projects/user/{user_id}` | 사용자 프로젝트 목록 |

### Creatomate (영상 자동 편집)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/creatomate/templates` | 템플릿 목록 |
| `POST` | `/api/creatomate/render` | 영상 렌더링 |
| `POST` | `/api/creatomate/auto-edit` | 아이폰 감성 자동 편집 |
| `GET` | `/api/creatomate/render/{id}` | 렌더링 상태 조회 |

### Factory (영상 생성)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/factory/start` | 영상 생성 시작 |
| `GET` | `/api/factory/status/{id}` | 생성 상태 조회 |

### Trends

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trends` | 트렌드 데이터 조회 |

### Prompts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/prompts/generate` | 아이폰 감성 프롬프트 생성 |

---

## 디자인 시스템

### Studio Juai Color Palette

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Juai Green** | `#03C75A` | `--juai-green` | Primary, Success, CTA |
| **Juai Orange** | `#FF6B35` | `--juai-orange` | Secondary, Warning |
| **Juai Black** | `#111111` | `--juai-black` | Text, Dark BG |
| **Juai Night** | `#1a1a1a` | `--juai-night` | Dark Mode BG |
| **Juai Paper** | `#ffffff` | `--juai-paper` | Light BG |

### Typography

- **Primary Font**: Pretendard
- **Monospace**: JetBrains Mono

### Button Styles

```css
/* Primary */
.btn-juai-primary { @apply bg-juai-green text-white; }

/* Secondary */
.btn-juai-secondary { @apply bg-juai-orange text-white; }

/* Outline */
.btn-juai-outline { @apply border-2 border-juai-black; }
```

---

## 📄 라이선스

MIT License © Studio Juai

---

<p align="center">
  Made with ❤️ by <strong>Studio Juai</strong>
</p>
