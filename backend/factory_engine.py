"""
Studio Juai PRO - Factory Engine
================================
UNIFIED GOAPI ENGINE - 모든 영상 생성을 GoAPI로 통합

지원 모델 (모두 GoAPI 경유):
- Kling (kling-video)
- Veo (veo2) 
- Sora (sora)
- Hailuo (hailuo)
- Luma (luma)
"""

import os
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


# ============================================
# Enums & Models
# ============================================

class VideoModel(str, Enum):
    """지원하는 영상 생성 모델 (모두 GoAPI)"""
    KLING = "kling"
    VEO = "veo"
    SORA = "sora"
    HAILUO = "hailuo"
    LUMA = "luma"


class AspectRatio(str, Enum):
    """지원하는 화면 비율"""
    LANDSCAPE = "16:9"
    PORTRAIT = "9:16"
    SQUARE = "1:1"
    VERTICAL_FEED = "4:5"


class VideoRequest(BaseModel):
    """영상 생성 요청"""
    project_id: str
    prompt: str
    model: VideoModel = VideoModel.KLING
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    duration: int = 5  # seconds (5 or 10)
    style_preset: Optional[str] = "warm_film"
    negative_prompt: Optional[str] = None
    image_url: Optional[str] = None  # for image-to-video


class VideoResponse(BaseModel):
    """영상 생성 응답"""
    success: bool
    task_id: Optional[str] = None
    video_url: Optional[str] = None
    status: str = "pending"
    message: str = ""
    model: str = ""
    progress: int = 0


# ============================================
# GoAPI Unified Engine
# ============================================

class GoAPIEngine:
    """
    통합 GoAPI 엔진 (2024 신규 API 형식)
    - 모든 모델: POST /api/v1/task 통합 엔드포인트 사용
    - task_type으로 작업 종류 구분
    """
    
    BASE_URL = "https://api.goapi.ai/api/v1"
    
    # 모델별 task_type 매핑
    MODEL_TASK_TYPES = {
        VideoModel.KLING: "video_generation",
        VideoModel.VEO: "video_generation",
        VideoModel.SORA: "video_generation",
        VideoModel.HAILUO: "video_generation",
        VideoModel.LUMA: "video_generation",
    }
    
    def __init__(self):
        self.api_key = os.getenv("GOAPI_KEY")
        if not self.api_key:
            print("⚠️ GOAPI_KEY not found in environment")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    def _build_request_body(self, request: VideoRequest) -> Dict[str, Any]:
        """
        GoAPI 신규 통합 형식으로 요청 본문 생성
        """
        
        # 기본 아이폰 감성 프롬프트 보강
        enhanced_prompt = self._enhance_prompt(request.prompt, request.style_preset)
        
        # 통합 요청 형식
        body = {
            "model": request.model.value,  # kling, veo, sora, hailuo, luma
            "task_type": self.MODEL_TASK_TYPES.get(request.model, "video_generation"),
            "input": {
                "prompt": enhanced_prompt,
                "aspect_ratio": request.aspect_ratio.value,
                "duration": request.duration,  # 숫자로 전달 (중요!)
            }
        }
        
        # 선택적 파라미터
        if request.negative_prompt:
            body["input"]["negative_prompt"] = request.negative_prompt
        
        if request.image_url:
            body["input"]["image_url"] = request.image_url
            
        return body
    
    def _enhance_prompt(self, prompt: str, style_preset: Optional[str]) -> str:
        """아이폰 감성 프롬프트 강화"""
        
        style_additions = {
            "warm_film": "shot on iPhone 15 Pro, warm film look, natural lighting, cinematic grain, 4K quality",
            "cool_modern": "shot on iPhone 15 Pro, cool modern tones, clean sharp focus, minimal aesthetic",
            "golden_hour": "shot on iPhone 15 Pro, golden hour lighting, warm orange tones, dreamy atmosphere",
            "cinematic_teal_orange": "cinematic color grading, teal and orange, dramatic lighting, film look",
        }
        
        addition = style_additions.get(style_preset, style_additions["warm_film"])
        return f"{prompt}, {addition}"
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """
        통합 영상 생성 함수 (GoAPI 신규 형식)
        - POST /api/v1/task 엔드포인트 사용
        """
        
        if not self.api_key:
            return VideoResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다.",
                model=request.model.value
            )
        
        url = f"{self.BASE_URL}/task"
        body = self._build_request_body(request)
        
        print(f"🎬 GoAPI 요청: {request.model.value} -> {url}")
        print(f"   프롬프트: {request.prompt[:50]}...")
        print(f"   요청 본문: {body}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=body
                )
                
                print(f"   응답 상태: {response.status_code}")
                print(f"   응답 내용: {response.text[:500]}")
                
                data = response.json()
                
                if data.get("code") == 200:
                    task_id = data.get("data", {}).get("task_id")
                    
                    return VideoResponse(
                        success=True,
                        task_id=task_id,
                        status="processing",
                        message="영상 생성이 시작되었습니다.",
                        model=request.model.value,
                        progress=10
                    )
                else:
                    error_msg = data.get("message", "Unknown error")
                    print(f"   ❌ 오류: {error_msg}")
                    
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"API 오류: {error_msg}",
                        model=request.model.value
                    )
                    
        except Exception as e:
            print(f"   ❌ 예외: {str(e)}")
            return VideoResponse(
                success=False,
                status="error",
                message=str(e),
                model=request.model.value
            )
    
    async def check_status(self, task_id: str, model: VideoModel) -> VideoResponse:
        """
        통합 상태 조회 함수 (GoAPI 신규 형식)
        - GET /api/v1/task/{task_id} 엔드포인트 사용
        """
        
        if not self.api_key or not task_id:
            return VideoResponse(
                success=False,
                status="error",
                message="필수 파라미터 누락"
            )
        
        url = f"{self.BASE_URL}/task/{task_id}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                data = response.json()
                
                if data.get("code") == 200:
                    task_data = data.get("data", {})
                    status = task_data.get("status", "processing")
                    video_url = None
                    progress = 50
                    
                    # 상태별 처리
                    if status == "completed" or status == "succeed":
                        # 비디오 URL 추출
                        output = task_data.get("output", {})
                        works = output.get("works", [])
                        if works:
                            video_url = works[0].get("resource", {}).get("resource")
                        
                        progress = 100
                        status = "completed"
                    elif status == "failed":
                        progress = 0
                    elif status == "processing":
                        progress = 50
                    elif status == "pending":
                        progress = 10
                    
                    return VideoResponse(
                        success=True,
                        task_id=task_id,
                        video_url=video_url,
                        status=status,
                        message=self._get_status_message(status),
                        model=model.value,
                        progress=progress
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"상태 조회 실패: {response.status_code}",
                        model=model.value
                    )
                    
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=str(e),
                model=model.value
            )
    
    def _get_status_message(self, status: str) -> str:
        """상태별 한글 메시지"""
        messages = {
            "processing": "AI가 영상을 생성하고 있습니다...",
            "completed": "영상 생성 완료!",
            "succeed": "영상 생성 완료!",
            "failed": "영상 생성 실패",
            "pending": "대기열에서 처리 중...",
        }
        return messages.get(status, "처리 중...")


# ============================================
# Creatomate Client (편집용)
# ============================================

class CreatomateClient:
    """Creatomate API 클라이언트 - 영상 편집/자막 추가용"""
    
    BASE_URL = "https://api.creatomate.com/v1"
    
    def __init__(self):
        self.api_key = os.getenv("CREATOMATE_API_KEY")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
    
    async def list_templates(self) -> List[Dict]:
        """템플릿 목록 조회"""
        if not self.api_key:
            return []
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/templates",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"Creatomate 템플릿 조회 오류: {e}")
        return []
    
    async def render_video(
        self,
        template_id: str,
        modifications: Dict[str, Any],
        output_format: str = "mp4"
    ) -> Dict[str, Any]:
        """템플릿 기반 영상 렌더링"""
        
        if not self.api_key:
            return {"error": "Creatomate API 키 없음"}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/renders",
                    headers=self._get_headers(),
                    json={
                        "template_id": template_id,
                        "modifications": modifications,
                        "output_format": output_format,
                    }
                )
                
                if response.status_code in [200, 201, 202]:
                    return response.json()
                else:
                    return {"error": f"렌더링 실패: {response.status_code}"}
                    
        except Exception as e:
            return {"error": str(e)}
    
    async def get_render_status(self, render_id: str) -> Dict[str, Any]:
        """렌더링 상태 조회"""
        
        if not self.api_key:
            return {"error": "API 키 없음"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/renders/{render_id}",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            return {"error": str(e)}
        return {"error": "상태 조회 실패"}


# ============================================
# HeyGen Client (아바타용)
# ============================================

class HeyGenClient:
    """HeyGen API 클라이언트 - AI 아바타 영상용"""
    
    BASE_URL = "https://api.heygen.com/v2"
    
    def __init__(self):
        self.api_key = os.getenv("HEYGEN_API_KEY")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
        }
    
    async def create_avatar_video(
        self,
        script: str,
        avatar_id: str = "default",
        voice_id: str = "korean_female_1"
    ) -> Dict[str, Any]:
        """아바타 영상 생성"""
        
        if not self.api_key:
            return {"error": "HeyGen API 키 없음"}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/video/generate",
                    headers=self._get_headers(),
                    json={
                        "video_inputs": [{
                            "character": {"type": "avatar", "avatar_id": avatar_id},
                            "voice": {"type": "text", "input_text": script, "voice_id": voice_id},
                        }],
                        "dimension": {"width": 1080, "height": 1920},
                    }
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    return {"error": f"아바타 생성 실패: {response.status_code}"}
                    
        except Exception as e:
            return {"error": str(e)}


# ============================================
# Factory Engine (통합 인터페이스)
# ============================================

class FactoryEngine:
    """
    Studio Juai PRO Factory Engine
    - GoAPI 통합 영상 생성
    - Creatomate 편집
    - HeyGen 아바타
    """
    
    def __init__(self):
        self.goapi = GoAPIEngine()
        self.creatomate = CreatomateClient()
        self.heygen = HeyGenClient()
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """영상 생성 (GoAPI 통합)"""
        return await self.goapi.generate_video(request)
    
    async def check_video_status(self, task_id: str, model: VideoModel) -> VideoResponse:
        """영상 상태 조회"""
        return await self.goapi.check_status(task_id, model)
    
    async def edit_video(self, template_id: str, modifications: Dict) -> Dict:
        """영상 편집 (Creatomate)"""
        return await self.creatomate.render_video(template_id, modifications)
    
    async def create_avatar(self, script: str, avatar_id: str = "default") -> Dict:
        """아바타 영상 생성 (HeyGen)"""
        return await self.heygen.create_avatar_video(script, avatar_id)
    
    async def process_video_request(self, request: VideoRequest):
        """레거시 호환용"""
        return await self.generate_video(request)
