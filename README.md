# 🎬 Studio Juai PRO

**무인 영상 제작 공장** - AI Director Orchestration Platform

> 기획부터 편집, 렌더링까지 전 과정을 AI가 판단하고 실행하는 차세대 영상 제작 플랫폼

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Studio Juai PRO |
| **버전** | 4.0.0 |
| **타겟** | 내부 전문가 전용 (Admin Only) |
| **핵심 가치** | AI Director가 최적의 모델을 자동 배정하고 고화질(4K) 영상 송출 |

---

## 🚀 주요 기능

### 1. AI Director Orchestration (Smart Routing)
| 시나리오 | 선택 모델 | 판단 근거 |
|----------|-----------|-----------|
| 리얼리즘/액션 (자동차, 스포츠, 추격) | **Google Veo 3.1** | 물리 법칙 적용 필수 |
| 인물/제품 일관성 (룩북, 쇼핑몰) | **Midjourney → Kling** | 동일 캐릭터 유지 |
| 정보 전달/뉴스 (리포터, 강의) | **HeyGen** | 스크립트 기반 입모양 동기화 |
| 시네마틱 배경 (영화, 인트로) | **Sora 2** | 긴 호흡의 고화질 배경 |

### 2. Prompt Engineering (Gemini 1.5 Pro)
- **Midjourney**: `studio lighting, 8k, --ar 9:16 --v 6.1 --stylize 750`
- **Veo/Sora**: `Drone view, FPV shot, motion blur, highly detailed, photorealistic`
- **Suno**: `Instrumental only, [Genre], [BPM], high fidelity`

### 3. Auto-Editing (Creatomate)
- 16:9 / 9:16 자동 변환
- 스마트 타이포그래피 (밝기 분석 → 텍스트 색상 자동 결정)
- BGM 자동 트리밍 + 페이드 아웃

### 4. Admin CMS
- 프롬프트 템플릿 관리
- 벤더(API) 관리 - 새 툴 즉시 연결 가능
- 트렌드 주입 - 유행어 반영

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 14 (App Router), TailwindCSS, shadcn/ui |
| **Backend** | Python FastAPI (Async) |
| **Database** | Supabase (PostgreSQL) |
| **AI Brain** | Google Gemini 1.5 Pro |
| **Video Gen** | GoAPI (Kling, Veo, Sora, Hailuo, Luma) + Kling Official |
| **Avatar** | HeyGen Official API |
| **Editing** | Creatomate API |
| **Deployment** | Vercel (Frontend) + Railway (Backend) |

---

## 📁 프로젝트 구조

```
studio-juai-pro/
├── backend/
│   ├── main.py              # FastAPI 서버 (모든 엔드포인트)
│   ├── director.py          # AI Director (Smart Routing + Prompt Engineering)
│   ├── factory_engine.py    # Hybrid API Engine
│   ├── requirements.txt     # Python 의존성
│   └── .env                 # 환경 변수 (gitignore)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/page.tsx  # Video First UI
│   │   │   └── admin/page.tsx      # Admin CMS
│   │   ├── components/             # UI 컴포넌트
│   │   └── lib/                    # 유틸리티
│   ├── package.json
│   └── next.config.js
│
├── database/
│   └── schema.sql           # Supabase 스키마
│
└── README.md
```

---

## 🔐 환경 변수

### Backend (.env)
```env
# Database
SUPABASE_URL=https://ixblsbkrgtkgaefbcbxe.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...

# AI Brain
GOOGLE_GEMINI_API_KEY=AIzaSy...

# Video Generation (Hybrid)
GOAPI_KEY=1b8d22f96bdf9ceb80ffc080b2d2e9c68ffb95210d90671dfb099c71f79349f2
KLING_ACCESS_KEY=(선택적)
KLING_SECRET_KEY=(선택적)

# Editing & Avatar
CREATOMATE_API_KEY=2c427ab8af994acf...
HEYGEN_API_KEY=sk_V2_hgu...

# Admin
ADMIN_PASSWORD=01031593697as!@
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://studio-juai-pro-production.up.railway.app
```

---

## 🚀 배포 가이드

### 1. Railway (Backend)

1. [Railway](https://railway.app) 접속
2. "New Project" → "Deploy from GitHub repo"
3. `ikjoobang/studio-juai-pro` 선택
4. Root Directory: `backend`
5. Variables 탭에서 위 7개 환경변수 설정
6. Deploy → Public Domain 생성 (포트 8000)

### 2. Vercel (Frontend)

1. [Vercel](https://vercel.com) 접속
2. "Add New Project" → GitHub repo 선택
3. Root Directory: `frontend`
4. Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Railway URL
5. Deploy

### 3. Supabase (Database)

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `database/schema.sql` 실행
3. URL과 Anon Key를 Backend 환경변수에 설정

---

## 📡 API 엔드포인트

### Health & Auth
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 서버 상태 |
| GET | `/api/health` | 서비스 상태 상세 |
| POST | `/api/auth/login` | 관리자 로그인 |

### AI Director
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/chat` | AI Director 대화 |
| POST | `/api/director/analyze` | 의도 분석 상세 |
| POST | `/api/prompt/optimize` | 프롬프트 최적화 |

### Video Generation
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/video/generate` | 영상 생성 (Smart Routing) |
| GET | `/api/video/progress/{id}` | 진행률 조회 |
| GET | `/api/models` | 사용 가능한 모델 목록 |
| GET | `/api/presets` | 스타일 프리셋 목록 |

### Avatar & Editing
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/avatar/generate` | HeyGen 아바타 생성 |
| GET | `/api/avatar/list` | 아바타 목록 |
| POST | `/api/creatomate/auto-edit` | 자동 편집 |

### Admin CMS
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET/POST | `/api/admin/templates` | 프롬프트 템플릿 관리 |
| GET/POST | `/api/admin/vendors` | 벤더 관리 |
| GET/POST | `/api/admin/trends` | 트렌드 관리 |

---

## 🎨 UI/UX 디자인 시스템

- **Theme**: Dark Mode Only (`bg-[#111111]`)
- **Accent Color**: `#03C75A` (Juai Green)
- **Font**: Pretendard (한국어 최적화)
- **Layout**: Resizable Panels (Premiere Pro 스타일)

---

## 📱 사용 방법

1. **로그인**: `https://studio-juai-pro.vercel.app` → 비밀번호 입력
2. **프롬프트 입력**: 만들고 싶은 영상 설명
3. **모델 선택**: Auto (AI Director 추천) 또는 수동 선택
4. **생성**: 3-5분 대기 (Kling 기준)
5. **편집**: Timeline에서 클립 조정
6. **내보내기**: Export 버튼

---

## 🔧 개발 환경 설정

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 라이선스

Private - Studio Juai PRO

---

## 👨‍💻 개발자

- **발주자**: 방대표 (Project Owner)
- **빌드**: AI Assistant (Claude)
