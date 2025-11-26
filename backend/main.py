"""
Super Agent Platform - Main API Server
=====================================
VIDEO FIRST Architecture - Active Chatbot, Smart Action Card, Auto-Editing
모든 영상 생성 API는 video_url을 필수로 반환합니다.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
import json
import asyncio
from enum import Enum

from database import get_supabase_client, SupabaseClient
from factory_engine import FactoryEngine, VideoRequest, CreatomateClient

# FastAPI 앱 초기화
app = FastAPI(
    title="Super Agent Platform API",
    description="VIDEO FIRST - AI 네비게이터, 워크스페이스, B2B API 허브 통합 플랫폼",
    version="2.0.0"
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
# In-Memory Progress Store (For Demo)
# Production에서는 Redis 사용 권장
# ============================================

render_progress_store: Dict[str, Dict[str, Any]] = {}

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
    action_type: Optional[str] = None  # NEW: 액션 타입

class ProjectCreateRequest(BaseModel):
    user_id: str
    title: str
    industry: Optional[str] = None
    target_channel: Optional[List[str]] = []
    aspect_ratio: str = "9:16"
    description: Optional[str] = None
    preset: str = "warm_film"
    
class ProjectResponse(BaseModel):
    id: str
    title: str
    status: str
    created_at: datetime
    video_url: Optional[str] = None

# VIDEO FIRST: 영상 생성 응답 모델 - video_url 필수!
class VideoGenerationResponse(BaseModel):
    """영상 생성 응답 - video_url 필수 포함"""
    success: bool
    project_id: str
    status: str  # idle, preparing, rendering, completed, failed
    progress: int  # 0-100
    message: str
    video_url: Optional[str] = None  # 완료시 필수
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    estimated_time: Optional[str] = None

class VideoGenerationRequest(BaseModel):
    """영상 생성 요청"""
    project_id: str
    title: str
    description: Optional[str] = ""
    aspect_ratio: str = "9:16"  # 16:9, 9:16, 1:1, 4:5
    preset: str = "warm_film"  # warm_film, cool_modern, golden_hour, cinematic_teal_orange
    source_type: str = "ai_generate"  # ai_generate, template, upload
    template_id: Optional[str] = None
    source_urls: Optional[List[str]] = []
    
class ActionCardType(str, Enum):
    VIDEO_GENERATION = "video_generation"
    TREND_ANALYSIS = "trend_analysis"
    TEMPLATE_SELECT = "template_select"
    ASSET_PREVIEW = "asset_preview"
    STYLE_CHANGE = "style_change"
    MUSIC_ADD = "music_add"
    TEXT_ADD = "text_add"
    EFFECT_APPLY = "effect_apply"
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
    """사용자 행동 분석 후 선제적 질문/리드하는 AI 챗봇 (VIDEO FIRST 보조 역할)"""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
        
    async def analyze_user_intent(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """사용자 의도 분석 및 선제적 응답 생성 (VIDEO FIRST 맥락)"""
        
        system_prompt = """
        너는 Studio Juai의 AI 영상 편집 어시스턴트다.
        VIDEO FIRST 플랫폼의 보조 도구로서:
        
        1. 영상 편집 관련 요청에 집중해라 (스타일, 음악, 자막, 효과)
        2. 현재 작업 중인 영상에 대한 조언을 제공해라
        3. 구체적이고 실행 가능한 수정 제안을 해라
        4. 간결하고 명확한 톤을 유지해라
        
        응답 형식:
        - message: 짧고 명확한 응답 (2-3문장)
        - action_type: 실행할 액션 타입 (style_change, music_add, text_add, effect_apply, none)
        - suggestions: 추천 후속 작업 (최대 3개)
        """
        
        # 영상 편집 맥락 추가
        video_context = ""
        if context:
            if context.get("hasVideo"):
                video_context = f"현재 프로젝트: {context.get('currentProject', 'unknown')}, 비율: {context.get('aspectRatio', '9:16')}"
            else:
                video_context = "아직 영상이 없음 - 영상 생성 유도 필요"
        
        prompt = f"""
        시스템: {system_prompt}
        
        현재 상태: {video_context}
        사용자 요청: {message}
        
        JSON 형식으로 응답:
        {{
            "message": "응답 메시지 (간결하게)",
            "action_type": "style_change|music_add|text_add|effect_apply|none",
            "suggestions": ["추천1", "추천2", "추천3"]
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
                            "maxOutputTokens": 1024,
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    text = result["candidates"][0]["content"]["parts"][0]["text"]
                    text = text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    return json.loads(text.strip())
                else:
                    return self._get_fallback_response(message)
                    
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return self._get_fallback_response(message)
    
    def _get_fallback_response(self, message: str) -> Dict[str, Any]:
        """API 실패시 기본 응답 (VIDEO FIRST 맥락)"""
        
        # 메시지 키워드 분석
        keywords_to_action = {
            "스타일": ("style_change", "스타일 변경을 도와드릴게요. 어떤 느낌을 원하시나요?"),
            "색감": ("style_change", "색감을 바꿔드릴게요. 따뜻한 톤? 시원한 톤?"),
            "음악": ("music_add", "배경음악을 추가해드릴게요. 장르나 분위기를 알려주세요."),
            "자막": ("text_add", "자막을 추가해드릴게요. 어떤 내용을 넣을까요?"),
            "텍스트": ("text_add", "텍스트를 추가해드릴게요. 원하는 문구가 있나요?"),
            "효과": ("effect_apply", "어떤 효과를 적용할까요? 트렌디한 효과를 추천해드릴게요."),
            "필터": ("effect_apply", "필터를 적용해드릴게요. 어떤 분위기가 좋을까요?"),
        }
        
        action_type = "none"
        response_message = "네, 어떻게 도와드릴까요? 영상 스타일, 음악, 자막 등을 수정할 수 있어요."
        
        for keyword, (action, msg) in keywords_to_action.items():
            if keyword in message:
                action_type = action
                response_message = msg
                break
        
        return {
            "message": response_message,
            "action_type": action_type,
            "suggestions": [
                "스타일 변경해줘",
                "배경음악 추가해줘", 
                "자막 넣어줘"
            ]
        }


# 챗봇 & 팩토리 인스턴스
chatbot = ActiveChatbot()
factory = FactoryEngine()
creatomate_client = CreatomateClient()

# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "active",
        "service": "Super Agent Platform",
        "version": "2.0.0",
        "architecture": "VIDEO FIRST"
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
            "creatomate": "configured" if os.getenv("CREATOMATE_API_KEY") else "not_configured",
            "supabase": "configured" if os.getenv("SUPABASE_URL") else "not_configured"
        }
    }


# ---------- Active Chatbot Endpoints (VIDEO FIRST: 보조 역할) ----------

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Active Chatbot 대화 엔드포인트 (영상 편집 어시스턴트)"""
    
    session_id = request.session_id or f"session_{datetime.utcnow().timestamp()}"
    
    ai_response = await chatbot.analyze_user_intent(
        message=request.message,
        context=request.context
    )
    
    return ChatResponse(
        message=ai_response.get("message", ""),
        action_cards=ai_response.get("action_cards", []),
        suggestions=ai_response.get("suggestions", []),
        session_id=session_id,
        action_type=ai_response.get("action_type", "none")
    )


# ---------- VIDEO FIRST: 영상 생성 Endpoints ----------

@app.post("/api/video/generate", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """
    VIDEO FIRST: 영상 생성 API
    모든 응답에 video_url을 포함합니다.
    """
    
    project_id = request.project_id
    
    # 진행 상태 초기화
    render_progress_store[project_id] = {
        "status": "preparing",
        "progress": 0,
        "message": "영상 생성 준비 중...",
        "video_url": None,
        "started_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드에서 영상 생성
    background_tasks.add_task(
        process_video_generation,
        project_id=project_id,
        request=request
    )
    
    return VideoGenerationResponse(
        success=True,
        project_id=project_id,
        status="preparing",
        progress=0,
        message="영상 생성이 시작되었습니다. 진행 상황을 확인해주세요.",
        estimated_time="2-5분"
    )

@app.get("/api/video/progress/{project_id}", response_model=VideoGenerationResponse)
async def get_video_progress(project_id: str):
    """
    VIDEO FIRST: 영상 생성 진행률 조회
    완료시 video_url 필수 반환
    """
    
    progress_data = render_progress_store.get(project_id)
    
    if not progress_data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return VideoGenerationResponse(
        success=True,
        project_id=project_id,
        status=progress_data.get("status", "unknown"),
        progress=progress_data.get("progress", 0),
        message=progress_data.get("message", ""),
        video_url=progress_data.get("video_url"),  # 완료시 필수!
        thumbnail_url=progress_data.get("thumbnail_url"),
        duration=progress_data.get("duration")
    )

async def process_video_generation(project_id: str, request: VideoGenerationRequest):
    """
    백그라운드 영상 생성 처리
    완료시 반드시 video_url 설정
    """
    
    try:
        # Stage 1: 준비
        render_progress_store[project_id].update({
            "status": "preparing",
            "progress": 10,
            "message": "AI가 콘텐츠를 분석하고 있습니다..."
        })
        await asyncio.sleep(1)
        
        # Stage 2: 템플릿 선택
        render_progress_store[project_id].update({
            "status": "rendering",
            "progress": 25,
            "message": "최적의 템플릿을 선택하는 중..."
        })
        await asyncio.sleep(1)
        
        # Stage 3: 소스 수집
        render_progress_store[project_id].update({
            "progress": 40,
            "message": "영상 소스를 수집하고 있습니다..."
        })
        await asyncio.sleep(1)
        
        # Stage 4: 색감 보정
        render_progress_store[project_id].update({
            "progress": 55,
            "message": f"{request.preset} 색감 보정 적용 중..."
        })
        await asyncio.sleep(1)
        
        # Stage 5: 효과 적용
        render_progress_store[project_id].update({
            "progress": 70,
            "message": "음악과 효과를 추가하는 중..."
        })
        await asyncio.sleep(1)
        
        # Stage 6: 렌더링
        render_progress_store[project_id].update({
            "progress": 85,
            "message": "최종 렌더링 진행 중..."
        })
        await asyncio.sleep(1)
        
        # Stage 7: 완료 - video_url 필수!
        # Demo video URL (실제로는 Creatomate/Kling 등에서 생성된 URL)
        demo_videos = {
            "9:16": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "16:9": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "1:1": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "4:5": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        }
        
        video_url = demo_videos.get(request.aspect_ratio, demo_videos["9:16"])
        
        render_progress_store[project_id].update({
            "status": "completed",
            "progress": 100,
            "message": "영상 제작 완료!",
            "video_url": video_url,  # 필수!
            "thumbnail_url": f"https://via.placeholder.com/320x180?text={request.title}",
            "duration": 15.0,
            "completed_at": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        render_progress_store[project_id].update({
            "status": "failed",
            "message": f"영상 생성 실패: {str(e)}",
            "video_url": None
        })


# ---------- Project Endpoints ----------

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(request: ProjectCreateRequest):
    """새 프로젝트 생성"""
    
    project_id = f"project_{int(datetime.utcnow().timestamp() * 1000)}"
    
    # In-memory store for demo (production: Supabase)
    project = {
        "id": project_id,
        "user_id": request.user_id,
        "title": request.title,
        "description": request.description,
        "aspect_ratio": request.aspect_ratio,
        "preset": request.preset,
        "status": "idle",
        "created_at": datetime.utcnow(),
        "video_url": None
    }
    
    return ProjectResponse(
        id=project_id,
        title=request.title,
        status="idle",
        created_at=datetime.utcnow(),
        video_url=None
    )


# ---------- Legacy Factory Endpoints (하위 호환) ----------

@app.post("/api/factory/start")
async def start_production(request: VideoRequest, background_tasks: BackgroundTasks):
    """영상 생성 공장 가동 (Legacy - video/generate 권장)"""
    
    # 새 API로 리다이렉트
    gen_request = VideoGenerationRequest(
        project_id=request.project_id,
        title=f"Project {request.project_id}",
        aspect_ratio=request.aspect_ratio,
        preset=request.style_preset or "warm_film"
    )
    
    return await generate_video(gen_request, background_tasks)

@app.get("/api/factory/status/{project_id}")
async def get_production_status(project_id: str):
    """영상 생성 상태 조회 (Legacy - video/progress 권장)"""
    return await get_video_progress(project_id)


# ---------- Trend Analysis Endpoints ----------

@app.get("/api/trends")
async def get_trends(category: str = "all", limit: int = 10):
    """트렌드 데이터 조회"""
    
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
    return {
        "vendors": [
            {"id": "1", "service_name": "Kling AI", "status": "active", "type": "video"},
            {"id": "2", "service_name": "Midjourney", "status": "active", "type": "image"},
            {"id": "3", "service_name": "HeyGen", "status": "active", "type": "avatar"},
            {"id": "4", "service_name": "Creatomate", "status": "active", "type": "template"}
        ]
    }


# ---------- Creatomate Endpoints ----------

class CreatomateAutoEditRequest(BaseModel):
    """Creatomate 자동 편집 요청"""
    project_id: str
    template_id: str
    headline: str
    subheadline: Optional[str] = ""
    background_video_url: Optional[str] = None
    cta_text: Optional[str] = ""
    brand_color: str = "#03C75A"

@app.get("/api/creatomate/templates")
async def list_creatomate_templates():
    """Creatomate 템플릿 목록 조회"""
    try:
        templates = await creatomate_client.list_templates()
        return {"success": True, "templates": templates}
    except Exception as e:
        return {"success": False, "templates": [], "error": str(e)}

@app.post("/api/creatomate/auto-edit")
async def auto_edit_video(request: CreatomateAutoEditRequest):
    """
    ✅ Creatomate 영상 자동 편집 (자막, 효과 추가)
    챗봇에서 "자막 달아줘" 요청시 호출
    """
    
    try:
        # 자막/효과 수정사항 적용
        modifications = {
            "headline": request.headline,
            "subheadline": request.subheadline,
            "cta_text": request.cta_text,
            "brand_color": request.brand_color,
            # 아이폰 감성 필터
            "filter": "warm_film",
            "color_temperature": "warm",
        }
        
        if request.background_video_url:
            modifications["background_video"] = request.background_video_url
        
        # Creatomate API 호출 (실제 환경에서)
        # result = await creatomate_client.render_video(...)
        
        # Demo 응답
        return {
            "success": True,
            "project_id": request.project_id,
            "render_id": f"render_{int(datetime.utcnow().timestamp())}",
            "status": "completed",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "message": "자막이 성공적으로 추가되었습니다.",
            "modifications_applied": modifications
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/creatomate/render")
async def render_creatomate_video(
    project_id: str,
    template_id: str,
    modifications: Dict[str, Any] = {},
    background_tasks: BackgroundTasks = None
):
    """Creatomate 렌더링 - video_url 필수 반환"""
    
    try:
        result = await creatomate_client.render_video(
            template_id=template_id,
            modifications=modifications,
            output_format="mp4"
        )
        
        # VIDEO FIRST: video_url 필수 포함
        return {
            "success": True,
            "project_id": project_id,
            "render_id": result.get("id"),
            "status": result.get("status", "processing"),
            "video_url": result.get("url"),  # 필수!
            "message": "렌더링이 시작되었습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Presets Endpoint ----------

@app.get("/api/presets")
async def get_presets():
    """iPhone 감성 색감 프리셋 목록"""
    return {
        "presets": [
            {
                "id": "warm_film",
                "name": "따뜻한 필름",
                "description": "빈티지 필름 느낌의 따뜻한 색감",
                "emoji": "🎞️",
                "settings": {
                    "temperature": 6500,
                    "tint": 10,
                    "saturation": 1.1,
                    "contrast": 1.05,
                    "grain": 0.15
                }
            },
            {
                "id": "cool_modern",
                "name": "시원한 모던",
                "description": "깔끔하고 시원한 현대적 색감",
                "emoji": "❄️",
                "settings": {
                    "temperature": 5500,
                    "tint": -5,
                    "saturation": 0.95,
                    "contrast": 1.1,
                    "grain": 0.05
                }
            },
            {
                "id": "golden_hour",
                "name": "골든아워",
                "description": "해질녘의 황금빛 색감",
                "emoji": "🌅",
                "settings": {
                    "temperature": 7000,
                    "tint": 15,
                    "saturation": 1.2,
                    "contrast": 1.0,
                    "grain": 0.1
                }
            },
            {
                "id": "cinematic_teal_orange",
                "name": "시네마틱",
                "description": "영화같은 틸 & 오렌지 색감",
                "emoji": "🎬",
                "settings": {
                    "temperature": 6000,
                    "tint": 0,
                    "saturation": 1.15,
                    "contrast": 1.15,
                    "grain": 0.08,
                    "split_toning": {"shadows": "teal", "highlights": "orange"}
                }
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
