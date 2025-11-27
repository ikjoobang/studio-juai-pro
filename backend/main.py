"""
Studio Juai PRO - Main API Server
=================================
무인 영상 제작 공장 - FastAPI Backend

Features:
- AI Director Orchestration (Smart Routing)
- Hybrid Video Generation (Kling Official + GoAPI)
- HeyGen Avatar Integration
- Creatomate Auto-Editing
- Admin CMS for Prompt/Vendor/Trend Management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
import json
import asyncio
import uuid
import base64
from enum import Enum
from dotenv import load_dotenv
from supabase import create_client, Client

from factory_engine import (
    FactoryEngine, GoAPIClient, CreatomateClient, HeyGenClient,
    VideoRequest, VideoResponse, VideoModel, AspectRatio,
    AvatarRequest, EditRequest, MusicRequest, MusicResponse, STYLE_PRESETS,
    ImageRequest, ImageResponse, ImageModel, AudioModel,
    get_factory
)

from director import (
    AIDirector, IntentCategory, ToolType, RoutingDecision,
    DirectorAnalysis, get_director
)

load_dotenv()

# ============================================
# FastAPI App Configuration
# ============================================

app = FastAPI(
    title="Studio Juai PRO API",
    description="""
    🎬 무인 영상 제작 공장 - AI Director Orchestration
    
    Features:
    - Smart Tool Routing (Veo/Kling/Sora/HeyGen)
    - Prompt Engineering with Gemini
    - Hybrid API Engine
    - Auto-Editing with Creatomate
    """,
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================
# CORS - 모든 도메인 허용 (테스트용)
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=False,  # credentials와 *는 함께 사용 불가
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Preflight 캐싱 24시간
)

# ============================================
# Global State
# ============================================

# In-memory stores (Production: Redis/Supabase)
task_store: Dict[str, Dict[str, Any]] = {}
project_store: Dict[str, Dict[str, Any]] = {}
prompt_templates_store: Dict[str, Dict[str, Any]] = {}
vendor_store: Dict[str, Dict[str, Any]] = {}
trend_store: List[str] = []

# Initialize on startup
factory: FactoryEngine = None
director: AIDirector = None
supabase: Client = None

@app.on_event("startup")
async def startup():
    global factory, director, supabase
    factory = get_factory()
    director = get_director()
    
    # Supabase 클라이언트 초기화
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ [Supabase] 클라이언트 초기화 완료")
    else:
        print("⚠️ [Supabase] 환경 변수 없음 - 업로드 기능 불가")
    
    # 기본 프롬프트 템플릿 로드
    _load_default_templates()
    print("🚀 [Studio Juai PRO v5.0] 서버 시작됨 - Hybrid Engine Active")


def _load_default_templates():
    """기본 프롬프트 템플릿 로드"""
    global prompt_templates_store
    
    prompt_templates_store = {
        "shopping_mall": {
            "id": "shopping_mall",
            "name": "쇼핑몰용 프롬프트",
            "category": "e-commerce",
            "system_instruction": "제품의 특징을 부각시키고, 구매 욕구를 자극하는 영상을 만들어주세요. 깔끔한 배경, 제품 클로즈업, 사용 장면을 포함합니다.",
            "prompt_template": "{product_name}, professional product video, studio lighting, white background, 360 degree rotation, close-up details, lifestyle usage scene",
            "default_model": "kling",
            "default_style": "cool_modern"
        },
        "movie_trailer": {
            "id": "movie_trailer",
            "name": "영화/트레일러용 프롬프트",
            "category": "entertainment",
            "system_instruction": "영화적 분위기와 드라마틱한 연출로 시청자의 감정을 자극하는 영상을 만들어주세요.",
            "prompt_template": "{scene_description}, cinematic, dramatic lighting, anamorphic lens, film grain, epic atmosphere, hollywood quality",
            "default_model": "sora",
            "default_style": "cinematic_teal_orange"
        },
        "news_report": {
            "id": "news_report",
            "name": "뉴스/리포트용 프롬프트",
            "category": "informational",
            "system_instruction": "전문적이고 신뢰감 있는 뉴스 리포터 스타일의 영상을 만들어주세요.",
            "prompt_template": "Professional news presenter, {topic}, broadcast quality, studio setting, teleprompter style delivery",
            "default_model": "heygen",
            "default_style": "cool_modern"
        },
        "action_sports": {
            "id": "action_sports",
            "name": "액션/스포츠용 프롬프트",
            "category": "action",
            "system_instruction": "역동적인 움직임과 속도감을 강조하는 영상을 만들어주세요. 물리적으로 정확한 표현이 중요합니다.",
            "prompt_template": "{action_description}, dynamic movement, high speed, motion blur, FPV shot, tracking shot, photorealistic physics",
            "default_model": "veo",
            "default_style": "vibrant"
        }
    }


# ============================================
# Request/Response Models
# ============================================

class AuthRequest(BaseModel):
    password: str


class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    project_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    action_cards: Optional[List[Dict[str, Any]]] = []
    suggestions: Optional[List[str]] = []
    session_id: str
    action_type: Optional[str] = None
    routing_decision: Optional[Dict[str, Any]] = None


class VideoGenerateRequest(BaseModel):
    project_id: str
    prompt: str
    model: str = "auto"  # auto, kling, veo, sora, hailuo, luma
    aspect_ratio: str = "9:16"
    duration: int = 5
    style_preset: str = "warm_film"
    image_url: Optional[str] = None  # Legacy field
    source_image_url: Optional[str] = None  # 소스 이미지 URL (Image-to-Video용)
    use_director: bool = True  # AI Director 사용 여부


class VideoStatusResponse(BaseModel):
    success: bool
    project_id: str
    task_id: Optional[str] = None
    status: str
    progress: int
    message: str
    video_url: Optional[str] = None
    model: str = ""
    routing_info: Optional[Dict[str, Any]] = None


class ProjectCreateRequest(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    aspect_ratio: str = "9:16"
    preset: str = "warm_film"
    model: str = "auto"


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    aspect_ratio: str
    preset: str
    model: str
    status: str
    created_at: str
    video_url: Optional[str] = None


class AvatarGenerateRequest(BaseModel):
    project_id: str
    script: str
    avatar_id: str = "default"
    voice_id: str = "default"
    aspect_ratio: str = "9:16"


class EditVideoRequest(BaseModel):
    project_id: str
    video_url: str
    headline: str
    subheadline: Optional[str] = ""
    brand_color: str = "#03C75A"
    aspect_ratio: str = "9:16"


class ImageGenerateRequest(BaseModel):
    """이미지 생성 요청"""
    project_id: str
    prompt: str
    model: str = "flux"  # flux, midjourney, dalle
    aspect_ratio: str = "9:16"
    style: str = "realistic"
    negative_prompt: Optional[str] = None


class ImageStatusResponse(BaseModel):
    """이미지 생성 응답"""
    success: bool
    project_id: str
    task_id: Optional[str] = None
    status: str
    progress: int = 0
    message: str
    image_url: Optional[str] = None
    model: str = ""
    template_id: Optional[str] = None


class PromptTemplateRequest(BaseModel):
    id: str
    name: str
    category: str
    system_instruction: str
    prompt_template: str
    default_model: str = "kling"
    default_style: str = "warm_film"


class VendorRequest(BaseModel):
    id: str
    name: str
    api_endpoint: str
    api_key_env: str
    model_type: str
    is_active: bool = True


class TrendRequest(BaseModel):
    trends: List[str]


# ============================================
# Global Exception Handler - 모든 에러를 JSON으로 반환
# ============================================
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """모든 예외를 잡아서 JSON 형태로 반환 (프론트엔드 디버깅용)"""
    error_detail = str(exc)
    print(f"❌ [GLOBAL ERROR] {request.method} {request.url.path}: {error_detail}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": error_detail,
            "path": str(request.url.path),
            "method": request.method,
            "timestamp": datetime.utcnow().isoformat()
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


# ============================================
# Health & Root Endpoints
# ============================================

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Studio Juai PRO",
        "version": "4.0.0",
        "engine": "AI Director + Hybrid Factory",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "director": "active" if director else "inactive",
            "goapi": "configured" if os.getenv("GOAPI_KEY") else "not_configured",
            "kling_official": "configured" if os.getenv("KLING_ACCESS_KEY") else "not_configured",
            "gemini": "configured" if os.getenv("GOOGLE_GEMINI_API_KEY") else "not_configured",
            "creatomate": "configured" if os.getenv("CREATOMATE_API_KEY") else "not_configured",
            "heygen": "configured" if os.getenv("HEYGEN_API_KEY") else "not_configured",
            "supabase": "configured" if os.getenv("SUPABASE_URL") else "not_configured",
        },
        "features": {
            "smart_routing": True,
            "prompt_engineering": True,
            "auto_editing": True,
            "avatar_generation": True
        }
    }


# ============================================
# Authentication
# ============================================

@app.post("/api/auth/login")
async def admin_login(request: AuthRequest):
    admin_password = os.getenv("ADMIN_PASSWORD", "studiojuai2024")
    
    if request.password == admin_password:
        return {
            "success": True,
            "message": "로그인 성공",
            "token": "admin_session_" + str(int(datetime.utcnow().timestamp())),
            "role": "admin"
        }
    else:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")


# ============================================
# File Upload (Supabase Storage)
# ============================================

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    소스 이미지 업로드 (Supabase Storage)
    
    - Image-to-Video 기능을 위한 이미지 업로드
    - Supabase Storage의 source_images 버킷에 저장
    - Public URL 반환
    """
    
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase Storage가 설정되지 않았습니다.")
    
    # 파일 검증
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"허용되지 않는 파일 형식입니다. 허용: {', '.join(allowed_types)}"
        )
    
    # 파일 크기 제한 (10MB)
    max_size = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")
    
    # 파일명 생성 (UUID + 확장자)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{ext}"
    storage_path = f"uploads/{unique_filename}"
    
    try:
        # Supabase Storage 업로드
        bucket_name = "source-images"
        
        # 버킷 존재 여부 확인 및 생성 시도
        try:
            result = supabase.storage.from_(bucket_name).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type}
            )
        except Exception as e:
            # 버킷이 없으면 생성 시도 (첫 업로드 시)
            if "Bucket not found" in str(e) or "not found" in str(e).lower():
                print(f"⚠️ [Upload] 버킷 '{bucket_name}' 없음 - 생성 시도")
                try:
                    supabase.storage.create_bucket(bucket_name, options={"public": True})
                    result = supabase.storage.from_(bucket_name).upload(
                        path=storage_path,
                        file=content,
                        file_options={"content-type": file.content_type}
                    )
                except Exception as create_err:
                    print(f"❌ [Upload] 버킷 생성 실패: {create_err}")
                    raise
            else:
                raise
        
        # Public URL 생성
        supabase_url = os.getenv("SUPABASE_URL")
        public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{storage_path}"
        
        print(f"✅ [Upload] 이미지 업로드 성공: {public_url}")
        
        return {
            "success": True,
            "message": "이미지가 업로드되었습니다.",
            "url": public_url,
            "filename": unique_filename,
            "size": len(content),
            "content_type": file.content_type
        }
        
    except Exception as e:
        print(f"❌ [Upload] 업로드 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")


@app.post("/api/upload/base64")
async def upload_image_base64(data: dict):
    """
    Base64 이미지 업로드 (Supabase Storage)
    
    - Drag & Drop에서 FileReader로 읽은 Base64 데이터 처리
    - data.image: Base64 인코딩된 이미지 데이터
    - data.filename: 파일명 (선택)
    - data.content_type: MIME 타입 (선택)
    """
    
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase Storage가 설정되지 않았습니다.")
    
    image_data = data.get("image")
    if not image_data:
        raise HTTPException(status_code=400, detail="이미지 데이터가 없습니다.")
    
    # Base64 데이터 파싱 (data:image/png;base64,xxxxx 형식 처리)
    if "," in image_data:
        header, encoded = image_data.split(",", 1)
        content_type = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
    else:
        encoded = image_data
        content_type = data.get("content_type", "image/jpeg")
    
    # 허용된 타입 확인
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"허용되지 않는 파일 형식입니다. 허용: {', '.join(allowed_types)}"
        )
    
    # Base64 디코딩
    try:
        content = base64.b64decode(encoded)
    except Exception as e:
        raise HTTPException(status_code=400, detail="잘못된 Base64 인코딩입니다.")
    
    # 파일 크기 제한 (10MB)
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")
    
    # 파일명 생성
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
    ext = ext_map.get(content_type, "jpg")
    unique_filename = f"{uuid.uuid4()}.{ext}"
    storage_path = f"uploads/{unique_filename}"
    
    try:
        bucket_name = "source-images"
        
        try:
            result = supabase.storage.from_(bucket_name).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": content_type}
            )
        except Exception as e:
            if "not found" in str(e).lower():
                supabase.storage.create_bucket(bucket_name, options={"public": True})
                result = supabase.storage.from_(bucket_name).upload(
                    path=storage_path,
                    file=content,
                    file_options={"content-type": content_type}
                )
            else:
                raise
        
        supabase_url = os.getenv("SUPABASE_URL")
        public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{storage_path}"
        
        print(f"✅ [Upload] Base64 이미지 업로드 성공: {public_url}")
        
        return {
            "success": True,
            "message": "이미지가 업로드되었습니다.",
            "url": public_url,
            "filename": unique_filename,
            "size": len(content),
            "content_type": content_type
        }
        
    except Exception as e:
        print(f"❌ [Upload] Base64 업로드 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")


# ============================================
# AI Director & Chat
# ============================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_director(request: ChatRequest):
    """
    AI Director와 대화
    - 의도 분석
    - 최적 툴 추천
    - 프롬프트 최적화
    """
    
    session_id = request.session_id or f"session_{int(datetime.utcnow().timestamp())}"
    
    try:
        # AI Director 분석
        analysis = await director.analyze_intent(request.message, request.context)
        decision = analysis.final_decision
        
        # 응답 메시지 생성
        tool_name = decision.primary_tool.value.upper()
        response_message = f"분석 완료! {tool_name}을 사용하여 영상을 생성하겠습니다.\n\n"
        response_message += f"📌 판단 근거: {decision.reasoning}\n"
        response_message += f"🎯 신뢰도: {decision.confidence:.0%}\n"
        
        if decision.secondary_tool:
            response_message += f"🔄 보조 툴: {decision.secondary_tool.value.upper()}\n"
        
        # 액션 카드 생성
        action_cards = [
            {
                "type": "video_generate",
                "title": f"{tool_name} 영상 생성",
                "description": decision.optimized_prompt[:100] + "...",
                "params": {
                    "model": decision.primary_tool.value,
                    "prompt": decision.optimized_prompt,
                    "style_preset": "warm_film"
                }
            }
        ]
        
        # 제안 목록
        suggestions = [
            "스타일 변경",
            "프롬프트 수정",
            "다른 모델 사용",
            "BGM 추가"
        ]
        
        return ChatResponse(
            message=response_message,
            action_cards=action_cards,
            suggestions=suggestions,
            session_id=session_id,
            action_type="tool_recommendation",
            routing_decision={
                "intent": decision.intent.value,
                "primary_tool": decision.primary_tool.value,
                "secondary_tool": decision.secondary_tool.value if decision.secondary_tool else None,
                "confidence": decision.confidence,
                "optimized_prompt": decision.optimized_prompt
            }
        )
        
    except Exception as e:
        print(f"❌ [Chat Error] {e}")
        return ChatResponse(
            message=f"죄송합니다, 처리 중 오류가 발생했습니다: {str(e)}",
            session_id=session_id,
            action_type="error"
        )


@app.post("/api/director/analyze")
async def analyze_with_director(request: ChatRequest):
    """Director 분석 결과 상세 조회"""
    
    analysis = await director.analyze_intent(request.message, request.context)
    
    return {
        "success": True,
        "analysis": {
            "user_input": analysis.user_input,
            "detected_keywords": analysis.detected_keywords,
            "intent_scores": analysis.intent_scores,
            "decision": {
                "intent": analysis.final_decision.intent.value,
                "primary_tool": analysis.final_decision.primary_tool.value,
                "secondary_tool": analysis.final_decision.secondary_tool.value if analysis.final_decision.secondary_tool else None,
                "confidence": analysis.final_decision.confidence,
                "reasoning": analysis.final_decision.reasoning
            },
            "prompt_variations": analysis.prompt_variations,
            "timestamp": analysis.timestamp
        }
    }


# ============================================
# Video Generation (Smart Routing)
# ============================================

@app.post("/api/video/generate", response_model=VideoStatusResponse)
async def generate_video(request: VideoGenerateRequest, background_tasks: BackgroundTasks):
    """
    스마트 영상 생성 API
    - use_director=True: AI Director가 최적 모델 자동 선택
    - use_director=False: 지정된 모델 사용
    """
    
    routing_info = None
    selected_model = request.model
    optimized_prompt = request.prompt
    
    # AI Director 사용 시 스마트 라우팅
    if request.use_director and request.model == "auto":
        print(f"🧠 [Director] 의도 분석 중...")
        analysis = await director.analyze_intent(request.prompt)
        decision = analysis.final_decision
        
        selected_model = decision.primary_tool.value
        optimized_prompt = decision.optimized_prompt or request.prompt
        
        routing_info = {
            "intent": decision.intent.value,
            "selected_model": selected_model,
            "confidence": decision.confidence,
            "reasoning": decision.reasoning
        }
        
        print(f"🎯 [Director] 선택된 모델: {selected_model} (신뢰도: {decision.confidence:.0%})")
    
    # 모델 변환
    model_map = {
        "kling": VideoModel.KLING,
        "veo": VideoModel.VEO,
        "sora": VideoModel.SORA,
        "hailuo": VideoModel.HAILUO,
        "luma": VideoModel.LUMA,
        "auto": VideoModel.KLING
    }
    
    video_model = model_map.get(selected_model.lower(), VideoModel.KLING)
    
    # 비율 변환
    ratio_map = {
        "16:9": AspectRatio.LANDSCAPE,
        "9:16": AspectRatio.PORTRAIT,
        "1:1": AspectRatio.SQUARE,
        "4:5": AspectRatio.VERTICAL_FEED,
    }
    
    aspect_ratio = ratio_map.get(request.aspect_ratio, AspectRatio.PORTRAIT)
    
    # 소스 이미지 URL 처리 (source_image_url 우선, image_url 폴백)
    source_image = request.source_image_url or request.image_url
    
    # Image-to-Video 모드 감지
    is_image_to_video = bool(source_image)
    
    if is_image_to_video:
        print(f"📸 [IMAGE-TO-VIDEO] 소스 이미지 감지됨")
        print(f"   이미지 URL: {source_image[:80]}...")
        
        # ✅ 2024-11-27 GoAPI 테스트 결과:
        # - Veo3.1: image_to_video task_type 미지원 (400 에러)
        # - Kling: video_generation + image_url 파라미터로 I2V 지원 ✅
        # - Sora2: I2V 미지원 (text-to-video only)
        
        # Image-to-Video는 반드시 Kling 사용
        if video_model != VideoModel.KLING:
            print(f"⚠️ [I2V] {video_model.value}는 I2V 미지원 → Kling으로 변경")
            video_model = VideoModel.KLING
    
    # VideoRequest 생성
    video_request = VideoRequest(
        project_id=request.project_id,
        prompt=optimized_prompt,
        model=video_model,
        aspect_ratio=aspect_ratio,
        duration=request.duration,
        style_preset=request.style_preset,
        image_url=source_image,  # 소스 이미지 전달
    )
    
    mode_str = "IMAGE-TO-VIDEO" if is_image_to_video else "TEXT-TO-VIDEO"
    print(f"🎬 [VIDEO GENERATE] 프로젝트: {request.project_id}")
    print(f"   모드: {mode_str}")
    print(f"   모델: {video_model.value}, 비율: {request.aspect_ratio}")
    print(f"   프롬프트: {optimized_prompt[:100]}...")
    
    # Factory Engine으로 생성
    result = await factory.generate_video(video_request)
    
    # 실패 시 에러 반환
    if not result.success:
        error_msg = result.message or "알 수 없는 오류"
        print(f"❌ [GENERATE ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=f"영상 생성 실패: {error_msg}")
    
    if not result.task_id:
        raise HTTPException(status_code=500, detail="영상 생성 실패: task_id 없음")
    
    # Task 저장
    task_store[request.project_id] = {
        "task_id": result.task_id,
        "model": video_model,
        "status": "processing",
        "progress": 10,
        "video_url": None,
        "error_message": None,
        "routing_info": routing_info,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드 폴링
    background_tasks.add_task(
        poll_video_status, 
        request.project_id, 
        result.task_id, 
        video_model
    )
    
    print(f"✅ [GENERATE SUCCESS] task_id: {result.task_id}")
    
    return VideoStatusResponse(
        success=True,
        project_id=request.project_id,
        task_id=result.task_id,
        status="processing",
        progress=10,
        message=f"{video_model.value.upper()} 영상 생성이 시작되었습니다.",
        model=video_model.value,
        routing_info=routing_info
    )


async def poll_video_status(project_id: str, task_id: str, model: VideoModel):
    """GoAPI/Kling 상태 폴링 - 최대 10분"""
    max_attempts = 200  # 최대 10분 (3초 * 200)
    poll_interval = 3
    
    for attempt in range(max_attempts):
        await asyncio.sleep(poll_interval)
        
        result = await factory.check_video_status(task_id, model)
        
        if project_id in task_store:
            task_store[project_id]["status"] = result.status
            task_store[project_id]["progress"] = result.progress
            task_store[project_id]["video_url"] = result.video_url
            
            elapsed = (attempt + 1) * poll_interval
            task_store[project_id]["message"] = f"생성 중... ({elapsed}초 경과)"
            
            if result.status == "completed" and result.video_url:
                task_store[project_id]["message"] = "영상 생성 완료!"
                print(f"✅ 영상 생성 완료: {project_id} (URL: {result.video_url})")
                break
            elif result.status == "failed":
                error_msg = result.message or "영상 생성 실패"
                task_store[project_id]["error_message"] = error_msg
                task_store[project_id]["message"] = f"❌ {error_msg}"
                print(f"❌ 영상 생성 실패: {project_id} - {error_msg}")
                break


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
        model=str(task_data.get("model", "")),
        routing_info=task_data.get("routing_info")
    )


# ============================================
# Image Generation API
# ============================================

@app.post("/api/image/generate", response_model=ImageStatusResponse)
async def generate_image(request: ImageGenerateRequest, background_tasks: BackgroundTasks):
    """
    이미지 생성 API (Flux.1 / Midjourney / DALL-E via GoAPI)
    
    생성된 이미지는 타임라인의 Overlay 트랙에 사용 가능
    """
    
    # 모델 변환
    model_map = {
        "flux": ImageModel.FLUX,
        "midjourney": ImageModel.MIDJOURNEY,
        "dalle": ImageModel.DALLE,
    }
    
    image_model = model_map.get(request.model.lower(), ImageModel.FLUX)
    
    # 비율 변환
    ratio_map = {
        "16:9": AspectRatio.LANDSCAPE,
        "9:16": AspectRatio.PORTRAIT,
        "1:1": AspectRatio.SQUARE,
    }
    
    aspect_ratio = ratio_map.get(request.aspect_ratio, AspectRatio.PORTRAIT)
    
    # ImageRequest 생성
    image_request = ImageRequest(
        prompt=request.prompt,
        model=image_model,
        aspect_ratio=aspect_ratio,
        style=request.style,
        negative_prompt=request.negative_prompt
    )
    
    print(f"🖼️ [IMAGE GENERATE] 프로젝트: {request.project_id}")
    print(f"   모델: {image_model.value}, 비율: {request.aspect_ratio}")
    print(f"   프롬프트: {request.prompt[:100]}...")
    
    # Factory Engine으로 생성
    result = await factory.generate_image(image_request)
    
    if not result.success:
        raise HTTPException(status_code=500, detail=f"이미지 생성 실패: {result.message}")
    
    # Task 저장
    task_store[f"image_{request.project_id}"] = {
        "task_id": result.task_id,
        "model": image_model.value,
        "status": "processing",
        "progress": 10,
        "image_url": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드 폴링
    background_tasks.add_task(poll_image_status, request.project_id, result.task_id)
    
    return ImageStatusResponse(
        success=True,
        project_id=request.project_id,
        task_id=result.task_id,
        status="processing",
        progress=10,
        message=f"{image_model.value.upper()} 이미지 생성이 시작되었습니다.",
        model=image_model.value
    )


async def poll_image_status(project_id: str, task_id: str):
    """이미지 생성 상태 폴링 - 최대 3분"""
    max_attempts = 60
    poll_interval = 3
    
    for attempt in range(max_attempts):
        await asyncio.sleep(poll_interval)
        
        result = await factory.goapi.check_image_status(task_id)
        
        store_key = f"image_{project_id}"
        if store_key in task_store:
            task_store[store_key]["status"] = result.status
            task_store[store_key]["image_url"] = result.image_url
            
            elapsed = (attempt + 1) * poll_interval
            
            if result.status == "completed" and result.image_url:
                task_store[store_key]["progress"] = 100
                task_store[store_key]["message"] = "이미지 생성 완료!"
                print(f"✅ 이미지 생성 완료: {project_id}")
                break
            elif result.status == "failed":
                task_store[store_key]["progress"] = 0
                task_store[store_key]["message"] = f"실패: {result.message}"
                break
            else:
                task_store[store_key]["progress"] = min(90, 10 + attempt * 3)


@app.get("/api/image/progress/{project_id}", response_model=ImageStatusResponse)
async def get_image_progress(project_id: str):
    """이미지 생성 진행률 조회"""
    
    store_key = f"image_{project_id}"
    task_data = task_store.get(store_key)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="이미지 작업을 찾을 수 없습니다.")
    
    return ImageStatusResponse(
        success=True,
        project_id=project_id,
        task_id=task_data.get("task_id"),
        status=task_data.get("status", "processing"),
        progress=task_data.get("progress", 0),
        message=task_data.get("message", "처리 중..."),
        image_url=task_data.get("image_url"),
        model=task_data.get("model", "")
    )


# ============================================
# Factory Status (Unified Task Status)
# ============================================

class FactoryStatusResponse(BaseModel):
    """통합 작업 상태 응답"""
    success: bool
    task_id: str
    task_type: str  # video, music, avatar, edit, image
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    message: str
    # 결과물 URLs
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    # 메타 정보
    model: Optional[str] = None
    duration: Optional[float] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


@app.get("/api/factory/status/{task_id}", response_model=FactoryStatusResponse)
async def get_factory_status(task_id: str):
    """
    🏭 통합 작업 상태 조회 API
    
    - 모든 작업(video, music, avatar, edit) 상태를 하나의 엔드포인트로 조회
    - 프론트엔드에서 3초 간격으로 폴링하여 사용
    - 상태가 completed가 되면 결과물 URL 반환
    """
    
    # 1. project_id로 저장된 task 찾기 (task_id가 project_id인 경우)
    task_data = task_store.get(task_id)
    task_type = "video"
    
    # 2. task_id로 직접 찾기
    if not task_data:
        for key, data in task_store.items():
            if data.get("task_id") == task_id:
                task_data = data
                # task type 판별
                if key.startswith("music_"):
                    task_type = "music"
                elif key.startswith("edit_"):
                    task_type = "edit"
                elif data.get("model") == "heygen":
                    task_type = "avatar"
                break
    
    # 3. 찾지 못한 경우
    if not task_data:
        raise HTTPException(
            status_code=404, 
            detail=f"작업을 찾을 수 없습니다: {task_id}"
        )
    
    # 상태 정규화
    status = task_data.get("status", "processing")
    progress = task_data.get("progress", 0)
    
    # completed 상태 정규화
    if status in ["succeed", "success"]:
        status = "completed"
        progress = 100
    
    # 결과물 URL 추출
    video_url = task_data.get("video_url")
    audio_url = task_data.get("audio_url")
    
    # 완료 시간 기록
    completed_at = None
    if status == "completed":
        completed_at = datetime.utcnow().isoformat()
    
    return FactoryStatusResponse(
        success=True,
        task_id=task_data.get("task_id", task_id),
        task_type=task_type,
        status=status,
        progress=progress,
        message=task_data.get("message", f"{task_type} 처리 중..."),
        video_url=video_url,
        audio_url=audio_url,
        thumbnail_url=task_data.get("thumbnail_url"),
        model=str(task_data.get("model", "")),
        duration=task_data.get("duration"),
        created_at=task_data.get("created_at"),
        completed_at=completed_at
    )


@app.get("/api/factory/status/project/{project_id}")
async def get_factory_status_by_project(project_id: str):
    """
    프로젝트 ID로 모든 관련 작업 상태 조회
    - 비디오, 음악, 편집 등 모든 작업 상태를 한번에 반환
    """
    
    results = {
        "project_id": project_id,
        "tasks": []
    }
    
    # 비디오 작업
    video_task = task_store.get(project_id)
    if video_task:
        results["tasks"].append({
            "type": "video",
            "task_id": video_task.get("task_id"),
            "status": video_task.get("status"),
            "progress": video_task.get("progress"),
            "video_url": video_task.get("video_url"),
            "model": str(video_task.get("model", ""))
        })
    
    # 음악 작업
    music_task = task_store.get(f"music_{project_id}")
    if music_task:
        results["tasks"].append({
            "type": "music",
            "task_id": music_task.get("task_id"),
            "status": music_task.get("status"),
            "progress": music_task.get("progress"),
            "audio_url": music_task.get("audio_url"),
            "model": "suno"
        })
    
    # 편집 작업
    edit_task = task_store.get(f"edit_{project_id}")
    if edit_task:
        results["tasks"].append({
            "type": "edit",
            "task_id": edit_task.get("task_id"),
            "status": edit_task.get("status"),
            "progress": edit_task.get("progress"),
            "video_url": edit_task.get("video_url"),
            "model": "creatomate"
        })
    
    if not results["tasks"]:
        raise HTTPException(status_code=404, detail="프로젝트에 작업이 없습니다.")
    
    return results


# ============================================
# HeyGen Avatar Generation
# ============================================

@app.post("/api/avatar/generate")
async def generate_avatar(request: AvatarGenerateRequest, background_tasks: BackgroundTasks):
    """HeyGen 아바타 영상 생성"""
    
    ratio_map = {
        "16:9": AspectRatio.LANDSCAPE,
        "9:16": AspectRatio.PORTRAIT,
        "1:1": AspectRatio.SQUARE,
    }
    
    avatar_request = AvatarRequest(
        script=request.script,
        avatar_id=request.avatar_id,
        voice_id=request.voice_id,
        aspect_ratio=ratio_map.get(request.aspect_ratio, AspectRatio.PORTRAIT)
    )
    
    result = await factory.create_avatar(avatar_request)
    
    if not result.success:
        raise HTTPException(status_code=500, detail=f"아바타 생성 실패: {result.message}")
    
    # Task 저장
    task_store[request.project_id] = {
        "task_id": result.task_id,
        "model": "heygen",
        "status": "processing",
        "progress": 10,
        "video_url": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드 폴링
    background_tasks.add_task(poll_avatar_status, request.project_id, result.task_id)
    
    return {
        "success": True,
        "project_id": request.project_id,
        "task_id": result.task_id,
        "status": "processing",
        "message": "HeyGen 아바타 영상 생성이 시작되었습니다."
    }


async def poll_avatar_status(project_id: str, video_id: str):
    """HeyGen 상태 폴링"""
    max_attempts = 120
    
    for _ in range(max_attempts):
        await asyncio.sleep(5)
        
        result = await factory.check_avatar_status(video_id)
        
        if project_id in task_store:
            task_store[project_id]["status"] = result.status
            task_store[project_id]["progress"] = result.progress
            task_store[project_id]["video_url"] = result.video_url
            
            if result.status == "completed":
                break
            elif result.status == "failed":
                break


@app.get("/api/avatar/list")
async def list_avatars():
    """사용 가능한 아바타 목록"""
    heygen = HeyGenClient()
    avatars = await heygen.list_avatars()
    
    return {
        "success": True,
        "avatars": avatars
    }


# ============================================
# Creatomate Auto-Editing
# ============================================

@app.post("/api/creatomate/auto-edit")
async def auto_edit_video(request: EditVideoRequest, background_tasks: BackgroundTasks):
    """Creatomate 자동 편집"""
    
    ratio_map = {
        "16:9": AspectRatio.LANDSCAPE,
        "9:16": AspectRatio.PORTRAIT,
        "1:1": AspectRatio.SQUARE,
    }
    
    aspect_ratio = ratio_map.get(request.aspect_ratio, AspectRatio.PORTRAIT)
    
    result = await factory.creatomate.auto_edit(
        project_id=request.project_id,
        video_url=request.video_url,
        headline=request.headline,
        subheadline=request.subheadline or "",
        brand_color=request.brand_color,
        aspect_ratio=aspect_ratio
    )
    
    if not result.success:
        raise HTTPException(status_code=500, detail=f"편집 실패: {result.message}")
    
    # Task 저장 (video_url이 이미 있으면 저장)
    task_store[f"edit_{request.project_id}"] = {
        "task_id": result.task_id,
        "model": "creatomate",
        "status": result.status,
        "progress": result.progress,
        "video_url": result.video_url,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # completed 상태가 아닐 때만 백그라운드 폴링
    if result.status != "completed":
        background_tasks.add_task(poll_edit_status, request.project_id, result.task_id)
    
    return {
        "success": True,
        "project_id": request.project_id,
        "render_id": result.task_id,
        "status": result.status,
        "progress": result.progress,
        "video_url": result.video_url,
        "message": result.message
    }


async def poll_edit_status(project_id: str, render_id: str):
    """Creatomate 렌더링 상태 폴링"""
    max_attempts = 60
    
    for _ in range(max_attempts):
        await asyncio.sleep(5)
        
        result = await factory.creatomate.check_render_status(render_id)
        
        store_key = f"edit_{project_id}"
        if store_key in task_store:
            task_store[store_key]["status"] = result.status
            task_store[store_key]["progress"] = result.progress
            task_store[store_key]["video_url"] = result.video_url
            
            if result.status in ["completed", "failed"]:
                break


@app.get("/api/creatomate/progress/{project_id}")
async def get_edit_progress(project_id: str):
    """편집 진행률 조회"""
    
    store_key = f"edit_{project_id}"
    task_data = task_store.get(store_key)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="편집 작업을 찾을 수 없습니다.")
    
    return {
        "success": True,
        "project_id": project_id,
        "render_id": task_data.get("task_id"),
        "status": task_data.get("status", "processing"),
        "progress": task_data.get("progress", 0),
        "video_url": task_data.get("video_url")
    }


# ============================================
# Export API
# ============================================

class ExportRequest(BaseModel):
    project_id: str
    video_url: str
    format: str = "mp4"
    filename: Optional[str] = None

@app.post("/api/export/video")
async def export_video(request: ExportRequest):
    """
    영상 내보내기 API
    - 영상 URL을 받아서 다운로드 가능한 링크 반환
    """
    
    if not request.video_url:
        raise HTTPException(status_code=400, detail="video_url이 필요합니다.")
    
    # 파일명 생성
    filename = request.filename or f"studio_juai_{request.project_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{request.format}"
    
    return {
        "success": True,
        "project_id": request.project_id,
        "download_url": request.video_url,
        "filename": filename,
        "format": request.format,
        "message": f"영상이 준비되었습니다. '{filename}'으로 다운로드하세요."
    }

@app.post("/api/export/txt")
async def export_txt(request: dict):
    """텍스트 스크립트 내보내기"""
    
    project_id = request.get("project_id", "unknown")
    content = request.get("content", "")
    
    if not content:
        # 채팅 기록에서 스크립트 추출 시도
        content = f"""# Studio Juai PRO 스크립트
# 프로젝트: {project_id}
# 생성일: {datetime.utcnow().isoformat()}

[영상 스크립트 내용을 여기에 추가하세요]
"""
    
    filename = f"script_{project_id}_{datetime.utcnow().strftime('%Y%m%d')}.txt"
    
    return {
        "success": True,
        "content": content,
        "filename": filename,
        "message": "스크립트가 준비되었습니다."
    }


# ============================================
# Project Management
# ============================================

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(request: ProjectCreateRequest):
    """새 프로젝트 생성"""
    
    project_id = f"project_{int(datetime.utcnow().timestamp() * 1000)}"
    
    project = {
        "id": project_id,
        "user_id": request.user_id,
        "title": request.title,
        "description": request.description,
        "aspect_ratio": request.aspect_ratio,
        "preset": request.preset,
        "model": request.model,
        "status": "idle",
        "video_url": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    project_store[project_id] = project
    
    return ProjectResponse(
        id=project_id,
        title=request.title,
        description=request.description,
        aspect_ratio=request.aspect_ratio,
        preset=request.preset,
        model=request.model,
        status="idle",
        created_at=project["created_at"]
    )


@app.get("/api/projects")
async def list_projects(user_id: Optional[str] = None):
    """프로젝트 목록 조회"""
    
    projects = list(project_store.values())
    
    if user_id:
        projects = [p for p in projects if p.get("user_id") == user_id]
    
    return {
        "success": True,
        "projects": projects,
        "total": len(projects)
    }


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """프로젝트 상세 조회"""
    
    project = project_store.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    
    # 영상 상태 병합
    task_data = task_store.get(project_id, {})
    project["video_status"] = task_data.get("status")
    project["video_progress"] = task_data.get("progress")
    project["video_url"] = task_data.get("video_url") or project.get("video_url")
    
    return {
        "success": True,
        "project": project
    }


# ============================================
# Admin CMS - Prompt Templates
# ============================================

@app.get("/api/admin/templates")
async def list_prompt_templates():
    """프롬프트 템플릿 목록"""
    return {
        "success": True,
        "templates": list(prompt_templates_store.values())
    }


@app.get("/api/admin/templates/{template_id}")
async def get_prompt_template(template_id: str):
    """프롬프트 템플릿 조회"""
    
    template = prompt_templates_store.get(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    
    return {
        "success": True,
        "template": template
    }


@app.post("/api/admin/templates")
async def create_prompt_template(request: PromptTemplateRequest):
    """프롬프트 템플릿 생성/수정"""
    
    template = {
        "id": request.id,
        "name": request.name,
        "category": request.category,
        "system_instruction": request.system_instruction,
        "prompt_template": request.prompt_template,
        "default_model": request.default_model,
        "default_style": request.default_style,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    prompt_templates_store[request.id] = template
    
    return {
        "success": True,
        "message": "템플릿이 저장되었습니다.",
        "template": template
    }


@app.put("/api/admin/templates/{template_id}")
async def update_prompt_template(template_id: str, request: PromptTemplateRequest):
    """프롬프트 템플릿 수정 (PUT)"""
    
    if template_id not in prompt_templates_store:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    
    # 기존 데이터 업데이트
    updated_template = {
        "id": template_id,  # ID는 변경하지 않음
        "name": request.name,
        "category": request.category,
        "system_instruction": request.system_instruction,
        "prompt_template": request.prompt_template,
        "default_model": request.default_model,
        "default_style": request.default_style,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    prompt_templates_store[template_id] = updated_template
    
    print(f"✅ [Admin] 템플릿 수정됨: {template_id}")
    
    return {
        "success": True,
        "message": "템플릿이 수정되었습니다.",
        "template": updated_template
    }


@app.delete("/api/admin/templates/{template_id}")
async def delete_prompt_template(template_id: str):
    """프롬프트 템플릿 삭제"""
    
    if template_id not in prompt_templates_store:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    
    del prompt_templates_store[template_id]
    
    print(f"🗑️ [Admin] 템플릿 삭제됨: {template_id}")
    
    return {
        "success": True,
        "message": "템플릿이 삭제되었습니다."
    }


# ============================================
# Admin CMS - Vendor Management
# ============================================

@app.get("/api/admin/vendors")
async def list_vendors():
    """벤더(API) 목록"""
    
    # 기본 벤더 목록
    default_vendors = [
        {
            "id": "goapi",
            "name": "GoAPI (Universal)",
            "api_endpoint": "https://api.goapi.ai/api/v1",
            "api_key_env": "GOAPI_KEY",
            "model_type": "video_generation",
            "is_active": bool(os.getenv("GOAPI_KEY")),
            "models": ["kling", "veo", "sora", "hailuo", "luma", "midjourney"]
        },
        {
            "id": "kling_official",
            "name": "Kling Official",
            "api_endpoint": "https://api.klingai.com",
            "api_key_env": "KLING_ACCESS_KEY",
            "model_type": "video_generation",
            "is_active": bool(os.getenv("KLING_ACCESS_KEY")),
            "models": ["kling"]
        },
        {
            "id": "heygen",
            "name": "HeyGen",
            "api_endpoint": "https://api.heygen.com",
            "api_key_env": "HEYGEN_API_KEY",
            "model_type": "avatar_generation",
            "is_active": bool(os.getenv("HEYGEN_API_KEY")),
            "models": ["heygen_avatar"]
        },
        {
            "id": "creatomate",
            "name": "Creatomate",
            "api_endpoint": "https://api.creatomate.com/v1",
            "api_key_env": "CREATOMATE_API_KEY",
            "model_type": "video_editing",
            "is_active": bool(os.getenv("CREATOMATE_API_KEY")),
            "models": ["creatomate_editor"]
        },
        {
            "id": "gemini",
            "name": "Google Gemini",
            "api_endpoint": "https://generativelanguage.googleapis.com",
            "api_key_env": "GOOGLE_GEMINI_API_KEY",
            "model_type": "ai_brain",
            "is_active": bool(os.getenv("GOOGLE_GEMINI_API_KEY")),
            "models": ["gemini-1.5-pro"]
        }
    ]
    
    # 사용자 정의 벤더 추가
    all_vendors = default_vendors + list(vendor_store.values())
    
    return {
        "success": True,
        "vendors": all_vendors
    }


@app.post("/api/admin/vendors")
async def add_vendor(request: VendorRequest):
    """새 벤더 추가"""
    
    vendor = {
        "id": request.id,
        "name": request.name,
        "api_endpoint": request.api_endpoint,
        "api_key_env": request.api_key_env,
        "model_type": request.model_type,
        "is_active": request.is_active,
        "created_at": datetime.utcnow().isoformat()
    }
    
    vendor_store[request.id] = vendor
    
    return {
        "success": True,
        "message": "벤더가 추가되었습니다.",
        "vendor": vendor
    }


@app.delete("/api/admin/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str):
    """벤더 삭제"""
    
    if vendor_id not in vendor_store:
        raise HTTPException(status_code=404, detail="벤더를 찾을 수 없습니다.")
    
    del vendor_store[vendor_id]
    
    return {
        "success": True,
        "message": "벤더가 삭제되었습니다."
    }


# ============================================
# Admin CMS - Trend Management
# ============================================

@app.get("/api/admin/trends")
async def get_trends():
    """트렌드 목록"""
    return {
        "success": True,
        "trends": trend_store
    }


@app.post("/api/admin/trends")
async def update_trends(request: TrendRequest):
    """트렌드 업데이트"""
    global trend_store
    
    trend_store = request.trends
    
    return {
        "success": True,
        "message": "트렌드가 업데이트되었습니다.",
        "trends": trend_store
    }


# ============================================
# Models & Presets Info
# ============================================

@app.get("/api/models")
async def list_models():
    """사용 가능한 모델 목록"""
    
    models = factory.get_available_models() if factory else []
    
    return {
        "success": True,
        "models": models
    }


@app.get("/api/presets")
async def list_presets():
    """스타일 프리셋 목록"""
    
    presets = []
    for key, value in STYLE_PRESETS.items():
        presets.append({
            "id": key,
            "name": value["name"],
            "color_grade": value.get("color_grade"),
            "vignette": value.get("vignette")
        })
    
    return {
        "success": True,
        "presets": presets
    }


# ============================================
# Utility Endpoints
# ============================================

@app.post("/api/prompt/optimize")
async def optimize_prompt(prompt: str, tool: str = "kling"):
    """프롬프트 최적화"""
    
    tool_map = {
        "kling": ToolType.KLING,
        "veo": ToolType.VEO,
        "sora": ToolType.SORA,
        "midjourney": ToolType.MIDJOURNEY,
        "heygen": ToolType.HEYGEN,
        "suno": ToolType.SUNO
    }
    
    tool_type = tool_map.get(tool.lower(), ToolType.KLING)
    optimized = await director.optimize_prompt_for_tool(prompt, tool_type)
    
    return {
        "success": True,
        "original": prompt,
        "optimized": optimized,
        "tool": tool
    }


@app.post("/api/script/generate")
async def generate_script(topic: str, style: str = "professional"):
    """아바타용 스크립트 생성"""
    
    script = await director.generate_script_for_avatar(topic, style)
    
    return {
        "success": True,
        "topic": topic,
        "style": style,
        "script": script
    }


@app.post("/api/bgm/suggest")
async def suggest_bgm(video_description: str, mood: str = "auto"):
    """BGM 프롬프트 제안"""
    
    bgm_prompt = await director.suggest_bgm_prompt(video_description, mood)
    
    return {
        "success": True,
        "video_description": video_description,
        "mood": mood,
        "bgm_prompt": bgm_prompt
    }


# ============================================
# Suno Music Generation
# ============================================

class MusicGenerateRequest(BaseModel):
    project_id: str
    prompt: str
    style: str = "pop"  # pop, rock, electronic, classical, ambient, cinematic
    duration: int = 30  # 15-120 seconds
    instrumental: bool = False


@app.post("/api/music/generate")
async def generate_music(request: MusicGenerateRequest, background_tasks: BackgroundTasks):
    """
    Suno AI 음악 생성 (via GoAPI)
    
    - 프롬프트 기반 음악 생성
    - 다양한 스타일 지원
    - 최대 120초 길이
    """
    
    music_request = MusicRequest(
        prompt=request.prompt,
        style=request.style,
        duration=request.duration,
        instrumental=request.instrumental
    )
    
    print(f"🎵 [MUSIC] 음악 생성 요청")
    print(f"   프로젝트: {request.project_id}")
    print(f"   프롬프트: {request.prompt[:80]}...")
    print(f"   스타일: {request.style}")
    
    result = await factory.generate_music(music_request)
    
    if not result.success:
        # Fallback이 모두 실패한 경우 친절한 메시지 표시
        print(f"❌ [MUSIC API] 최종 실패: {result.message}")
        raise HTTPException(
            status_code=503, 
            detail="현재 AI 공급사(GoAPI) 음악 서버 점검 중입니다. 잠시 후 다시 시도해주세요."
        )
    
    # Task 저장 (Fallback으로 Udio가 선택될 수 있음)
    task_store[f"music_{request.project_id}"] = {
        "task_id": result.task_id,
        "model": result.model,  # suno 또는 udio
        "status": "processing",
        "progress": 10,
        "audio_url": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # 백그라운드 폴링
    background_tasks.add_task(poll_music_status, request.project_id, result.task_id)
    
    return {
        "success": True,
        "project_id": request.project_id,
        "task_id": result.task_id,
        "status": "processing",
        "message": "Suno 음악 생성이 시작되었습니다."
    }


async def poll_music_status(project_id: str, task_id: str):
    """Suno 음악 상태 폴링"""
    max_attempts = 60  # 최대 5분
    poll_interval = 5
    
    for attempt in range(max_attempts):
        await asyncio.sleep(poll_interval)
        
        # GoAPI 상태 확인
        url = f"https://api.goapi.ai/api/v1/task/{task_id}"
        headers = {
            "x-api-key": os.getenv("GOAPI_KEY")
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_data = data.get("data", {})
                        status = task_data.get("status", "processing")
                        output = task_data.get("output", {})
                        
                        store_key = f"music_{project_id}"
                        if store_key in task_store:
                            task_store[store_key]["status"] = status
                            
                            if status in ["completed", "succeed"]:
                                # 오디오 URL 추출
                                audio_url = output.get("audio_url") or output.get("url")
                                task_store[store_key]["audio_url"] = audio_url
                                task_store[store_key]["progress"] = 100
                                print(f"✅ [MUSIC] 음악 생성 완료: {audio_url}")
                                break
                            elif status == "failed":
                                task_store[store_key]["progress"] = 0
                                print(f"❌ [MUSIC] 음악 생성 실패")
                                break
                            else:
                                elapsed = (attempt + 1) * poll_interval
                                task_store[store_key]["progress"] = min(90, 10 + attempt * 3)
                                task_store[store_key]["message"] = f"생성 중... ({elapsed}초 경과)"
                                
        except Exception as e:
            print(f"⚠️ [MUSIC] 폴링 오류: {e}")


@app.get("/api/music/progress/{project_id}")
async def get_music_progress(project_id: str):
    """음악 생성 진행률 조회"""
    
    store_key = f"music_{project_id}"
    task_data = task_store.get(store_key)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="음악 작업을 찾을 수 없습니다.")
    
    return {
        "success": True,
        "project_id": project_id,
        "task_id": task_data.get("task_id"),
        "status": task_data.get("status", "processing"),
        "progress": task_data.get("progress", 0),
        "audio_url": task_data.get("audio_url"),
        "message": task_data.get("message", "처리 중...")
    }


# ============================================
# Hybrid Engine Status
# ============================================

@app.get("/api/engine/status")
async def get_engine_status():
    """
    하이브리드 엔진 상태 조회
    - 각 API 연결 상태
    - 사용 가능한 모델 목록
    """
    
    return {
        "success": True,
        "engine": "Hybrid Factory Engine v5.0",
        "status": {
            "kling_official": {
                "active": factory.kling_official.is_available if factory else False,
                "endpoint": "https://api.klingai.com",
                "auth": "JWT (HS256)",
                "features": ["text2video", "image2video"]
            },
            "goapi": {
                "active": factory.goapi.is_available if factory else False,
                "endpoint": "https://api.goapi.ai/api/v1",
                "models": ["veo3.1", "sora2", "suno", "midjourney", "kling", "hailuo", "luma"]
            },
            "heygen": {
                "active": factory.heygen.is_available if factory else False,
                "endpoint": "https://api.heygen.com",
                "features": ["avatar_video"]
            },
            "creatomate": {
                "active": factory.creatomate.is_available if factory else False,
                "endpoint": "https://api.creatomate.com/v1",
                "features": ["video_editing", "template_render"]
            },
            "gemini": {
                "active": bool(os.getenv("GOOGLE_GEMINI_API_KEY")),
                "endpoint": "Google Generative AI",
                "features": ["ai_director", "prompt_optimization"]
            },
            "supabase": {
                "active": supabase is not None,
                "endpoint": os.getenv("SUPABASE_URL", "Not configured"),
                "features": ["image_upload", "storage"]
            }
        },
        "routing": {
            "kling": "Kling Official (JWT) → GoAPI fallback",
            "veo": "GoAPI direct",
            "sora": "GoAPI direct",
            "suno": "GoAPI direct",
            "midjourney": "GoAPI direct",
            "avatar": "HeyGen direct",
            "edit": "Creatomate direct"
        }
    }


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
