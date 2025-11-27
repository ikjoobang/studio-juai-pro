# Studio Juai PRO 🎬

AI-Powered Video Creation Platform with Premiere Pro Style Interface

## 🌟 Features

- **Unified GoAPI Engine**: Kling, Veo, Sora, Hailuo, Luma - all in one
- **Premiere Pro Layout**: Professional video editing workspace
- **Resizable Panels**: Drag to customize your workspace
- **AI Assistant**: Chat-based video editing commands
- **Real-time Progress**: Video generation with live progress tracking

## 🚀 Quick Start

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## 🔐 Login

- **Password**: `studiojuai2024`

## 📦 Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Framer Motion
- Zustand
- react-resizable-panels

### Backend
- FastAPI (Python)
- GoAPI Integration
- Creatomate Integration
- Google Gemini AI

## 🌐 Deployment

### Frontend → Vercel
1. Import from GitHub: `ikjoobang/studio-juai-pro`
2. Root Directory: `frontend`
3. Framework: Next.js

### Backend → Railway
1. Import from GitHub: `ikjoobang/studio-juai-pro`
2. Root Directory: `backend`
3. Add environment variables from `.env`

## 🔧 Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
GOAPI_KEY=your_goapi_key
CREATOMATE_API_KEY=your_creatomate_key
HEYGEN_API_KEY=your_heygen_key
ADMIN_PASSWORD=studiojuai2024
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## 📁 Project Structure

```
studio-juai-pro/
├── frontend/           # Next.js 14 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Login page
│   │   │   └── dashboard/       # Main workspace
│   │   ├── components/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── ChatSidebar.tsx
│   │   └── lib/
│   │       └── store.ts         # Zustand store
│   └── package.json
│
├── backend/            # FastAPI Server
│   ├── main.py         # API endpoints
│   ├── factory_engine.py  # GoAPI integration
│   ├── requirements.txt
│   └── Procfile        # Railway deployment
│
└── README.md
```

## 📄 License

MIT License - Studio Juai © 2024
