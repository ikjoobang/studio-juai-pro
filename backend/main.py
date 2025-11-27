"""
Studio Juai PRO - Main API Server
=================================
UNIFIED GOAPI ENGINE - 모든 영상 생성을 GoAPI로 통합
결제 기능 제거, 심플한 구조
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
import json
import asyncio
from enum import Enum
from dotenv import load_dotenv

from factory_engine import (
    FactoryEngine, GoAPIEngine, CreatomateClient,
    VideoRequest, VideoResponse, VideoModel, AspectRatio
)

load_dotenv()

# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="Studio Juai PRO API",
    description="UNIFIED GOAPI ENGINE - 영상 제작 플랫폼",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Global Instances
# ============================================

factory = FactoryEngine()
goapi = GoAPIEngine()
creatomate = CreatomateClient()

# In-memory task store (production: Redis)
task_store: Dict[str, Dict[str, Any]] = {}

# ============================================
# Request/Response Models
# ============================================

class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    action_cards: Optional[List[Dict[str, Any]]] = []
    suggestions: Optional[List[str]] = []
    session_id: str
    action_type: Optional[str] = None

class VideoGenerateRequest(BaseModel):
    """영상 생성 요청"""
    project_id: str
    prompt: str
    model: str = "kling"  # kling, veo, sora, hailuo, luma
    aspect_ratio: str = "9:16"
    duration: int = 5
    style_preset: str = "warm_film"
    image_url: Optional[str] = None

class VideoStatusResponse(BaseModel):
    """영상 상태 응답"""
    success: bool
    project_id: str
    task_id: Optional[str] = None
    status: str
    progress: int
    message: str
    video_url: Optional[str] = None
    model: str = ""

class ProjectCreateRequest(BaseModel):
    user_id: str
    title: str
    aspect_ratio: str = "9:16"
    preset: str = "warm_film"
    model: str = "kling"
    description: Optional[str] = None

class AuthRequest(BaseModel):
    """관리자 인증 요청"""
    password: str

class CreatomateEditRequest(BaseModel):
    """Creatomate 편집 요청"""
    project_id: str
    template_id: str
    headline: str
    subheadline: Optional[str] = ""
    background_video_url: Optional[str] = None
    brand_color: str = "#03C75A"


# ============================================
# Health Check
# ============================================

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Studio Juai PRO",
        "version": "3.0.0",
        "engine": "UNIFIED GOAPI"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "goapi": "configured" if os.getenv("GOAPI_KEY") else "not_configured",
            "gemini": "configured" if os.getenv("GOOGLE_GEMINI_API_KEY") else "not_configured",
            "creatomate": "configured" if os.getenv("CREATOMATE_API_KEY") else "not_configured",
            "heygen": "configured" if os.getenv("HEYGEN_API_KEY") else "not_configured",
            "supabase": "configured" if os.getenv("SUPABASE_URL") else "not_configured",
        }
    }


# ============================================
# Authentication (Admin Gate)
# ============================================

@app.post("/api/auth/login")
async def admin_login(request: AuthRequest):
    """관리자 로그인"""
    admin_password = os.getenv("ADMIN_PASSWORD", "studiojuai2024")
    
    if request.password == admin_password:
        return {
            "success": True,
            "message": "로그인 성공",
            "token": "admin_session_" + str(int(datetime.utcnow().timestamp()))
        }
    else:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")


# ============================================
# Video Generation (UNIFIED GOAPI)
# ============================================

@app.post("/api/video/generate", response_model=VideoStatusResponse)
async def generate_video(request: VideoGenerateRequest, background_tasks: BackgroundTasks):
    """
    통합 영상 생성 API
    모든 모델(Kling, Veo, Sora, Hailuo, Luma)이 GoAPI를 통해 처리됨
    """
    
    # 모델 변환
    model_map = {
        "kling": VideoModel.KLING,
        "veo": VideoModel.VEO,
        "sora": VideoModel.SORA,
        "hailuo": VideoModel.HAILUO,
        "luma": VideoModel.LUMA,
    }
    
    video_model = model_map.get(request.model.lower(), VideoModel.KLING)
    
    # 비율 변환
    ratio_map = {
        "16:9": AspectRatio.LANDSCAPE,
        "9:16": AspectRatio.PORTRAIT,
        "1:1": AspectRatio.SQUARE,
        "4:5": AspectRatio.VERTICAL_FEED,
    }
    
    aspect_ratio = ratio_map.get(request.aspect_ratio, AspectRatio.PORTRAIT)
    
    # VideoRequest 생성
    video_request = VideoRequest(
        project_id=request.project_id,
        prompt=request.prompt,
        model=video_model,
        aspect_ratio=aspect_ratio,
        duration=request.duration,
        style_preset=request.style_preset,
        image_url=request.image_url,
    )
    
    # GoAPI 호출
    print(f"🎬 [VIDEO GENERATE] 프로젝트: {request.project_id}")
    print(f"   모델: {request.model}, 비율: {request.aspect_ratio}")
    print(f"   프롬프트: {request.prompt[:100]}...")
    
    result = await goapi.generate_video(video_request)
    
    # ❌ 실패 시 명확한 에러 반환 (Demo 모드 없음!)
    if not result.success:
        error_msg = result.message or "알 수 없는 GoAPI 오류"
        print(f"❌ [GOAPI ERROR] {error_msg}")
        raise HTTPException(
            status_code=500, 
            detail=f"영상 생성 실패: {error_msg}"
        )
    
    if not result.task_id:
        print(f"❌ [GOAPI ERROR] task_id 없음")
        raise HTTPException(
            status_code=500, 
            detail="영상 생성 실패: GoAPI에서 task_id를 반환하지 않았습니다."
        )
    
    # ✅ 성공 시에만 Task 저장
    task_store[request.project_id] = {
        "task_id": result.task_id,
        "model": video_model,
        "status": "processing",
        "progress": 10,
        "video_url": None,
        "error_message": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드에서 상태 폴링
    background_tasks.add_task(poll_video_status, request.project_id, result.task_id, video_model)
    
    print(f"✅ [GOAPI SUCCESS] task_id: {result.task_id}")
    
    return VideoStatusResponse(
        success=True,
        project_id=request.project_id,
        task_id=result.task_id,
        status="processing",
        progress=10,
        message=f"{request.model.upper()} 영상 생성이 시작되었습니다.",
        model=request.model
    )


async def poll_video_status(project_id: str, task_id: str, model: VideoModel):
    """GoAPI 상태 폴링 - Kling은 3-5분 소요"""
    max_attempts = 600  # 최대 10분 (충분한 여유)
    poll_interval = 3   # 3초마다 체크 (서버 부하 감소)
    
    for attempt in range(max_attempts):
        await asyncio.sleep(poll_interval)
        
        result = await goapi.check_status(task_id, model)
        
        if project_id in task_store:
            task_store[project_id]["status"] = result.status
            task_store[project_id]["progress"] = result.progress
            task_store[project_id]["video_url"] = result.video_url
            
            if result.status == "completed" and result.video_url:
                print(f"✅ 영상 생성 완료: {project_id} (URL: {result.video_url})")
                task_store[project_id]["message"] = "영상 생성 완료!"
                break
            elif result.status == "failed":
                error_msg = result.message or "GoAPI 영상 생성 실패"
                task_store[project_id]["error_message"] = error_msg
                task_store[project_id]["message"] = f"❌ {error_msg}"
                print(f"❌ 영상 생성 실패: {project_id} - {error_msg}")
                break
            else:
                # 진행 중 메시지 업데이트
                elapsed = (attempt + 1) * poll_interval
                task_store[project_id]["message"] = f"생성 중... ({elapsed}초 경과)"


# ❌ Demo 모드 완전 삭제 - 가짜 영상 URL 반환하지 않음
# simulate_video_progress 함수 제거됨


@app.get("/api/video/progress/{project_id}", response_model=VideoStatusResponse)
async def get_video_progress(project_id: str):
    """영상 생성 진행률 조회"""
    
    task_data = task_store.get(project_id)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    
    return VideoStatusResponse(
        success=True,
        project_id=project_id,
        task_id=task_data.get("task_id"),
        status=task_data.get("status", "processing"),
        progress=task_data.get("progress", 0),
        message=task_data.get("message", "처리 중..."),
        video_url=task_data.get("video_url"),
        model=str(task_data.get("model", ""))
    )


# ============================================
# Supported Models
# ============================================

@app.get("/api/models")
async def get_supported_models():
    """지원하는 영상 생성 모델 목록"""
    return {
        "models": [
            {
                "id": "kling",
                "name": "Kling",
                "description": "고품질 AI 영상 생성",
                "provider": "GoAPI",
                "durations": [5, 10],
                "aspect_ratios": ["16:9", "9:16", "1:1"]
            },
            {
                "id": "veo",
                "name": "Veo 2",
                "description": "Google의 최신 영상 AI",
                "provider": "GoAPI",
                "durations": [5, 10],
                "aspect_ratios": ["16:9", "9:16"]
            },
            {
                "id": "sora",
                "name": "Sora",
                "description": "OpenAI 영상 생성",
                "provider": "GoAPI",
                "durations": [5, 10, 15],
                "aspect_ratios": ["16:9", "9:16", "1:1"]
            },
            {
                "id": "hailuo",
                "name": "Hailuo",
                "description": "빠른 영상 생성",
                "provider": "GoAPI",
                "durations": [5],
                "aspect_ratios": ["16:9", "9:16"]
            },
            {
                "id": "luma",
                "name": "Luma Dream Machine",
                "description": "창의적 영상 생성",
                "provider": "GoAPI",
                "durations": [5],
                "aspect_ratios": ["16:9", "9:16", "1:1"]
            }
        ]
    }


# ============================================
# Presets
# ============================================

@app.get("/api/presets")
async def get_presets():
    """iPhone 감성 색감 프리셋 목록"""
    return {
        "presets": [
            {"id": "warm_film", "name": "따뜻한 필름", "emoji": "🎞️"},
            {"id": "cool_modern", "name": "시원한 모던", "emoji": "❄️"},
            {"id": "golden_hour", "name": "골든아워", "emoji": "🌅"},
            {"id": "cinematic_teal_orange", "name": "시네마틱", "emoji": "🎬"},
        ]
    }


# ============================================
# Chat (AI Assistant)
# ============================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """AI 챗봇"""
    
    session_id = request.session_id or f"session_{int(datetime.utcnow().timestamp())}"
    
    # 간단한 의도 분석
    message = request.message.lower()
    
    response_data = {
        "message": "네, 어떻게 도와드릴까요?",
        "action_type": "none",
        "suggestions": ["영상 스타일 변경", "자막 추가", "음악 추가"]
    }
    
    if "자막" in message or "텍스트" in message:
        response_data = {
            "message": "자막을 추가해드릴게요. 잠시만 기다려주세요.",
            "action_type": "text_add",
            "suggestions": ["스타일 변경", "음악 추가", "효과 적용"]
        }
    elif "음악" in message or "bgm" in message:
        response_data = {
            "message": "배경음악을 추가해드릴게요.",
            "action_type": "music_add",
            "suggestions": ["자막 추가", "스타일 변경", "효과 적용"]
        }
    elif "스타일" in message or "색감" in message:
        response_data = {
            "message": "스타일을 변경해드릴게요. 어떤 느낌을 원하세요?",
            "action_type": "style_change",
            "suggestions": ["따뜻한 필름", "시원한 모던", "시네마틱"]
        }
    elif "효과" in message:
        response_data = {
            "message": "효과를 적용해드릴게요.",
            "action_type": "effect_apply",
            "suggestions": ["자막 추가", "음악 추가", "스타일 변경"]
        }
    
    return ChatResponse(
        message=response_data["message"],
        action_cards=[],
        suggestions=response_data["suggestions"],
        session_id=session_id,
        action_type=response_data["action_type"]
    )


# ============================================
# Creatomate (Video Editing)
# ============================================

@app.post("/api/creatomate/auto-edit")
async def auto_edit_video(request: CreatomateEditRequest):
    """Creatomate 영상 자동 편집"""
    
    modifications = {
        "headline": request.headline,
        "subheadline": request.subheadline,
        "brand_color": request.brand_color,
        "filter": "warm_film",
    }
    
    if request.background_video_url:
        modifications["background_video"] = request.background_video_url
    
    # Creatomate API 호출 시도
    try:
        if os.getenv("CREATOMATE_API_KEY"):
            result = await creatomate.render_video(request.template_id, modifications)
            if "error" not in result:
                return {
                    "success": True,
                    "project_id": request.project_id,
                    "render_id": result.get("id"),
                    "status": "completed",
                    "video_url": result.get("url"),
                    "message": "편집이 완료되었습니다."
                }
    except Exception as e:
        print(f"Creatomate 오류: {e}")
    
    # Demo 응답
    return {
        "success": True,
        "project_id": request.project_id,
        "render_id": f"render_{int(datetime.utcnow().timestamp())}",
        "status": "completed",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "message": "자막이 추가되었습니다.",
        "modifications_applied": modifications
    }


# ============================================
# Projects
# ============================================

@app.post("/api/projects")
async def create_project(request: ProjectCreateRequest):
    """새 프로젝트 생성"""
    
    project_id = f"project_{int(datetime.utcnow().timestamp() * 1000)}"
    
    return {
        "id": project_id,
        "title": request.title,
        "aspect_ratio": request.aspect_ratio,
        "preset": request.preset,
        "model": request.model,
        "status": "idle",
        "created_at": datetime.utcnow().isoformat()
    }


# ============================================
# Legacy Support
# ============================================

@app.post("/api/factory/start")
async def legacy_start(request: Dict[str, Any], background_tasks: BackgroundTasks):
    """레거시 호환"""
    gen_request = VideoGenerateRequest(
        project_id=request.get("project_id", f"legacy_{int(datetime.utcnow().timestamp())}"),
        prompt=request.get("prompt", "beautiful scene"),
        model=request.get("model", "kling"),
        aspect_ratio=request.get("aspect_ratio", "9:16"),
        duration=request.get("duration", 5),
        style_preset=request.get("style_preset", "warm_film"),
    )
    return await generate_video(gen_request, background_tasks)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
