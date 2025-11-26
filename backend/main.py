"""
Super Agent Platform - Main API Server
=====================================
Active Chatbot, Smart Action Card, Auto-Editing을 위한 FastAPI 백엔드
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
import json
from enum import Enum

from database import get_supabase_client, SupabaseClient
from factory_engine import FactoryEngine, VideoRequest

# FastAPI 앱 초기화
app = FastAPI(
    title="Super Agent Platform API",
    description="AI 네비게이터, 워크스페이스, B2B API 허브 통합 플랫폼",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Pydantic Models
# ============================================

class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    role: ChatRole
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    action_cards: Optional[List[Dict[str, Any]]] = None
    suggestions: Optional[List[str]] = None
    session_id: str

class ProjectCreateRequest(BaseModel):
    user_id: str
    title: str
    industry: Optional[str] = None
    target_channel: Optional[List[str]] = []
    aspect_ratio: str = "9:16"
    client_requirements: Optional[str] = None
    reference_urls: Optional[List[str]] = []
    style_preset: str = "iphone_korean"

class ProjectResponse(BaseModel):
    id: str
    title: str
    status: str
    created_at: datetime

class ActionCardType(str, Enum):
    VIDEO_GENERATION = "video_generation"
    TREND_ANALYSIS = "trend_analysis"
    TEMPLATE_SELECT = "template_select"
    ASSET_PREVIEW = "asset_preview"
    PAYMENT = "payment"

class SmartActionCard(BaseModel):
    type: ActionCardType
    title: str
    description: str
    data: Dict[str, Any]
    actions: List[Dict[str, str]]

# ============================================
# Active Chatbot - Gemini AI 연동
# ============================================

class ActiveChatbot:
    """사용자 행동 분석 후 선제적 질문/리드하는 AI 챗봇"""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
        
    async def analyze_user_intent(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """사용자 의도 분석 및 선제적 응답 생성"""
        
        system_prompt = """
        너는 Studio Juai의 AI 네비게이터다. 
        사용자의 콘텐츠 제작을 돕는 전문가로서:
        
        1. 사용자의 의도를 파악하고 먼저 질문해라
        2. 영상 제작, 트렌드 분석, 마케팅 전략을 제안해라
        3. 항상 실행 가능한 다음 단계를 제시해라
        4. 친근하지만 전문적인 톤을 유지해라
        
        응답 형식:
        - message: 사용자에게 보여줄 메시지
        - action_cards: 실행 가능한 카드 목록 (type, title, description, data, actions)
        - suggestions: 추천 질문/액션 목록
        """
        
        context_str = json.dumps(context, ensure_ascii=False) if context else "{}"
        
        prompt = f"""
        시스템: {system_prompt}
        
        사용자 컨텍스트: {context_str}
        사용자 메시지: {message}
        
        위 내용을 분석하여 JSON 형식으로 응답해줘:
        {{
            "message": "응답 메시지",
            "action_cards": [
                {{
                    "type": "video_generation|trend_analysis|template_select|asset_preview|payment",
                    "title": "카드 제목",
                    "description": "카드 설명",
                    "data": {{}},
                    "actions": [{{"label": "버튼명", "action": "액션ID"}}]
                }}
            ],
            "suggestions": ["추천 질문1", "추천 질문2"]
        }}
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 2048,
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    text = result["candidates"][0]["content"]["parts"][0]["text"]
                    # JSON 추출
                    text = text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    return json.loads(text.strip())
                else:
                    # Fallback 응답
                    return self._get_fallback_response(message)
                    
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return self._get_fallback_response(message)
    
    def _get_fallback_response(self, message: str) -> Dict[str, Any]:
        """API 실패시 기본 응답"""
        return {
            "message": "안녕하세요! Studio Juai 에이전트입니다. 어떤 콘텐츠를 만들어 드릴까요?",
            "action_cards": [
                {
                    "type": "video_generation",
                    "title": "영상 제작 시작하기",
                    "description": "AI가 트렌드를 분석하고 최적의 영상을 제작합니다",
                    "data": {"preset": "iphone_korean"},
                    "actions": [
                        {"label": "새 프로젝트 시작", "action": "create_project"},
                        {"label": "템플릿 둘러보기", "action": "browse_templates"}
                    ]
                },
                {
                    "type": "trend_analysis",
                    "title": "트렌드 분석",
                    "description": "YouTube/Instagram 실시간 트렌드를 확인하세요",
                    "data": {},
                    "actions": [
                        {"label": "트렌드 보기", "action": "view_trends"}
                    ]
                }
            ],
            "suggestions": [
                "쇼츠 영상을 만들고 싶어요",
                "요즘 뜨는 콘텐츠가 뭐예요?",
                "내 브랜드에 맞는 영상 스타일 추천해줘"
            ]
        }

    async def generate_proactive_prompt(self, user_behavior: Dict[str, Any]) -> str:
        """사용자 행동 기반 선제적 프롬프트 생성"""
        
        # 행동 패턴 분석
        page_views = user_behavior.get("page_views", [])
        time_spent = user_behavior.get("time_spent", 0)
        last_action = user_behavior.get("last_action", "")
        
        prompts = {
            "dashboard_long_view": "프로젝트를 둘러보고 계시네요! 새로운 영상을 시작해 볼까요?",
            "template_browsing": "마음에 드는 템플릿을 찾고 계신가요? 업종을 알려주시면 추천해 드릴게요!",
            "trend_viewing": "트렌드를 분석 중이시군요! 이 트렌드를 활용한 영상을 바로 만들어 드릴까요?",
            "idle": "무엇을 도와드릴까요? 영상 제작, 트렌드 분석, 뭐든 물어보세요!"
        }
        
        if time_spent > 60 and "template" in str(page_views):
            return prompts["template_browsing"]
        elif "trend" in str(page_views):
            return prompts["trend_viewing"]
        elif time_spent > 30:
            return prompts["dashboard_long_view"]
        
        return prompts["idle"]


# 챗봇 인스턴스
chatbot = ActiveChatbot()
factory = FactoryEngine()

# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "active",
        "service": "Super Agent Platform",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": "running",
            "gemini": "configured" if os.getenv("GOOGLE_GEMINI_API_KEY") else "not_configured",
            "supabase": "configured" if os.getenv("SUPABASE_URL") else "not_configured"
        }
    }

# ---------- Active Chatbot Endpoints ----------

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Active Chatbot 대화 엔드포인트"""
    
    # 세션 ID 생성/유지
    session_id = request.session_id or f"session_{datetime.utcnow().timestamp()}"
    
    # AI 응답 생성
    ai_response = await chatbot.analyze_user_intent(
        message=request.message,
        context=request.context
    )
    
    return ChatResponse(
        message=ai_response.get("message", ""),
        action_cards=ai_response.get("action_cards", []),
        suggestions=ai_response.get("suggestions", []),
        session_id=session_id
    )

@app.post("/api/chat/proactive")
async def get_proactive_prompt(user_behavior: Dict[str, Any]):
    """사용자 행동 기반 선제적 프롬프트"""
    prompt = await chatbot.generate_proactive_prompt(user_behavior)
    return {"prompt": prompt}

# ---------- Project Endpoints ----------

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(request: ProjectCreateRequest):
    """새 프로젝트 생성"""
    
    supabase = get_supabase_client()
    
    project_data = {
        "user_id": request.user_id,
        "title": request.title,
        "industry": request.industry,
        "target_channel": request.target_channel,
        "aspect_ratio": request.aspect_ratio,
        "client_requirements": request.client_requirements,
        "reference_urls": request.reference_urls,
        "style_preset": request.style_preset,
        "status": "waiting"
    }
    
    try:
        result = supabase.table("projects").insert(project_data).execute()
        project = result.data[0]
        
        return ProjectResponse(
            id=project["id"],
            title=project["title"],
            status=project["status"],
            created_at=project["created_at"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """프로젝트 조회"""
    
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("projects").select("*").eq("id", project_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/user/{user_id}")
async def get_user_projects(user_id: str):
    """사용자 프로젝트 목록"""
    
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("projects").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"projects": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Factory (영상 생성) Endpoints ----------

@app.post("/api/factory/start")
async def start_production(request: VideoRequest, background_tasks: BackgroundTasks):
    """영상 생성 공장 가동"""
    
    # 백그라운드에서 영상 생성 작업 실행
    background_tasks.add_task(factory.process_video_request, request)
    
    return {
        "status": "started",
        "project_id": request.project_id,
        "message": "공장 가동 시작! 영상 생성이 진행 중입니다.",
        "estimated_time": "3-5분"
    }

@app.get("/api/factory/status/{project_id}")
async def get_production_status(project_id: str):
    """영상 생성 상태 조회"""
    
    supabase = get_supabase_client()
    
    try:
        # 프로젝트 상태 조회
        project = supabase.table("projects").select("status").eq("id", project_id).execute()
        
        # 생성된 자산 조회
        assets = supabase.table("assets").select("*").eq("project_id", project_id).execute()
        
        return {
            "project_id": project_id,
            "status": project.data[0]["status"] if project.data else "unknown",
            "assets": assets.data,
            "asset_count": len(assets.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Trend Analysis Endpoints ----------

@app.get("/api/trends")
async def get_trends(category: str = "all", limit: int = 10):
    """트렌드 데이터 조회"""
    
    # 실제로는 크롤링 데이터 또는 캐시된 데이터를 반환
    # 여기서는 샘플 데이터 반환
    trends = [
        {
            "id": 1,
            "title": "숏폼 밈 콘텐츠",
            "platform": "YouTube Shorts",
            "growth": "+245%",
            "category": "entertainment",
            "keywords": ["밈", "숏폼", "반복시청"]
        },
        {
            "id": 2,
            "title": "ASMR 제품 리뷰",
            "platform": "Instagram Reels",
            "growth": "+180%",
            "category": "product",
            "keywords": ["ASMR", "언박싱", "감성"]
        },
        {
            "id": 3,
            "title": "브이로그 스타일 광고",
            "platform": "TikTok",
            "growth": "+156%",
            "category": "advertising",
            "keywords": ["브이로그", "자연스러운", "일상"]
        }
    ]
    
    if category != "all":
        trends = [t for t in trends if t["category"] == category]
    
    return {"trends": trends[:limit]}

# ---------- Vendor (API Hub) Endpoints ----------

@app.get("/api/vendors")
async def get_vendors():
    """활성화된 벤더(API) 목록"""
    
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("vendors").select("*").eq("is_active", True).execute()
        return {"vendors": result.data}
    except Exception as e:
        # 기본 벤더 목록 반환
        return {
            "vendors": [
                {"id": "1", "service_name": "Kling AI", "status": "active"},
                {"id": "2", "service_name": "Midjourney", "status": "active"},
                {"id": "3", "service_name": "HeyGen", "status": "active"},
                {"id": "4", "service_name": "Creatomate", "status": "active"}
            ]
        }

# ---------- Smart Action Card Endpoints ----------

@app.post("/api/action-cards/execute")
async def execute_action_card(card_type: str, action: str, data: Dict[str, Any]):
    """스마트 액션 카드 실행"""
    
    action_handlers = {
        "video_generation": {
            "create_project": lambda d: {"redirect": "/projects/new", "data": d},
            "browse_templates": lambda d: {"redirect": "/templates", "data": d}
        },
        "trend_analysis": {
            "view_trends": lambda d: {"redirect": "/trends", "data": d},
            "apply_trend": lambda d: {"action": "apply_trend_to_project", "data": d}
        },
        "template_select": {
            "select": lambda d: {"action": "template_selected", "data": d},
            "preview": lambda d: {"action": "show_preview", "data": d}
        },
        "payment": {
            "checkout": lambda d: {"redirect": "/checkout", "data": d}
        }
    }
    
    handler = action_handlers.get(card_type, {}).get(action)
    
    if handler:
        return {"success": True, "result": handler(data)}
    else:
        raise HTTPException(status_code=400, detail="Unknown action")


# ============================================
# 프롬프트 생성 (아이폰 감성)
# ============================================

@app.post("/api/prompts/generate")
async def generate_prompt(
    concept: str,
    style: str = "iphone_korean",
    aspect_ratio: str = "9:16"
):
    """아이폰 감성 프롬프트 생성"""
    
    style_presets = {
        "iphone_korean": {
            "base": "shot on iPhone 15 Pro, 4K cinematic, natural lighting, candid moment",
            "mood": "한국 감성, 따뜻한 톤, 자연스러운 일상",
            "technical": "shallow depth of field, film grain, warm color grading"
        },
        "professional": {
            "base": "professional studio lighting, high-end commercial quality",
            "mood": "clean, modern, premium feel",
            "technical": "sharp focus, perfect exposure, color accurate"
        },
        "cinematic": {
            "base": "cinematic 2.39:1 aspect ratio, anamorphic lens flare",
            "mood": "dramatic, emotional, storytelling",
            "technical": "film look, teal and orange color grade, motion blur"
        }
    }
    
    preset = style_presets.get(style, style_presets["iphone_korean"])
    
    full_prompt = f"""
    Concept: {concept}
    
    Visual Style: {preset['base']}
    Mood & Feeling: {preset['mood']}
    Technical Specs: {preset['technical']}
    Aspect Ratio: {aspect_ratio}
    
    Additional: authentic, relatable, trendy, engaging for social media
    """
    
    return {
        "prompt": full_prompt.strip(),
        "style": style,
        "aspect_ratio": aspect_ratio,
        "keywords": concept.split()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
