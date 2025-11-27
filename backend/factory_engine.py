"""
Studio Juai PRO - Factory Engine
================================
Hybrid API Engine: Kling Official + GoAPI (Veo, Sora, MJ) + HeyGen + Creatomate

환경 변수:
- KLING_ACCESS_KEY / KLING_SECRET_KEY (Official)
- GOAPI_KEY (Universal Wrapper)
- HEYGEN_API_KEY
- CREATOMATE_API_KEY
"""

import os
import json
import httpx
import hashlib
import hmac
import time
import base64
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


# ============================================
# Enums
# ============================================

class VideoModel(Enum):
    """지원하는 영상 생성 모델"""
    KLING = "kling"       # Kling Official API
    VEO = "veo"           # Google Veo (via GoAPI)
    SORA = "sora"         # OpenAI Sora (via GoAPI)
    HAILUO = "hailuo"     # Hailuo (via GoAPI)
    LUMA = "luma"         # Luma (via GoAPI)
    MIDJOURNEY = "midjourney"  # Midjourney (via GoAPI)


class AspectRatio(Enum):
    """비디오 비율"""
    LANDSCAPE = "16:9"
    PORTRAIT = "9:16"
    SQUARE = "1:1"
    VERTICAL_FEED = "4:5"


class VideoQuality(Enum):
    """비디오 품질"""
    SD = "sd"
    HD = "hd"
    FHD = "1080p"
    UHD = "4k"


# ============================================
# Data Classes
# ============================================

@dataclass
class VideoRequest:
    """영상 생성 요청"""
    project_id: str
    prompt: str
    model: VideoModel = VideoModel.KLING
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    duration: int = 5
    style_preset: str = "warm_film"
    image_url: Optional[str] = None
    negative_prompt: Optional[str] = None
    quality: VideoQuality = VideoQuality.FHD


@dataclass
class VideoResponse:
    """영상 생성 응답"""
    success: bool
    task_id: Optional[str] = None
    video_url: Optional[str] = None
    status: str = "pending"
    message: str = ""
    model: str = ""
    progress: int = 0
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None


@dataclass
class AvatarRequest:
    """HeyGen 아바타 요청"""
    script: str
    avatar_id: str = "default"
    voice_id: str = "default"
    background: str = "green_screen"
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT


@dataclass
class EditRequest:
    """Creatomate 편집 요청"""
    project_id: str
    template_id: str
    modifications: Dict[str, Any] = field(default_factory=dict)
    background_video_url: Optional[str] = None


# ============================================
# Style Presets
# ============================================

STYLE_PRESETS = {
    "warm_film": {
        "name": "따뜻한 필름",
        "prompt_suffix": "shot on iPhone 15 Pro, warm film look, natural lighting, cinematic grain, 4K quality",
        "color_grade": "warm",
        "vignette": True
    },
    "cool_modern": {
        "name": "시원한 모던",
        "prompt_suffix": "clean modern aesthetic, cool blue tones, sharp details, professional lighting, 4K quality",
        "color_grade": "cool",
        "vignette": False
    },
    "golden_hour": {
        "name": "골든아워",
        "prompt_suffix": "golden hour lighting, warm sunset colors, soft shadows, dreamy atmosphere, cinematic, 4K quality",
        "color_grade": "golden",
        "vignette": True
    },
    "cinematic_teal_orange": {
        "name": "시네마틱",
        "prompt_suffix": "cinematic teal and orange color grade, dramatic lighting, film grain, anamorphic lens flare, 4K HDR",
        "color_grade": "teal_orange",
        "vignette": True
    },
    "noir": {
        "name": "느와르",
        "prompt_suffix": "high contrast black and white, dramatic shadows, film noir style, moody atmosphere, 4K quality",
        "color_grade": "noir",
        "vignette": True
    },
    "vibrant": {
        "name": "비비드",
        "prompt_suffix": "vibrant saturated colors, punchy contrast, energetic mood, professional color grade, 4K quality",
        "color_grade": "vibrant",
        "vignette": False
    }
}


# ============================================
# Kling Official API Client
# ============================================

class KlingOfficialClient:
    """
    Kling Official API Client
    공식 API를 통한 고품질 영상 생성
    """
    
    BASE_URL = "https://api.klingai.com"
    
    def __init__(self):
        self.access_key = os.getenv("KLING_ACCESS_KEY")
        self.secret_key = os.getenv("KLING_SECRET_KEY")
        
        if self.access_key and self.secret_key:
            print("✅ [Kling Official] API 키 설정됨")
        else:
            print("⚠️ [Kling Official] API 키 없음 - GoAPI 폴백 사용")
    
    def _generate_signature(self, method: str, path: str, timestamp: str) -> str:
        """API 서명 생성"""
        string_to_sign = f"{method}\n{path}\n{timestamp}"
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def _get_headers(self, method: str, path: str) -> Dict[str, str]:
        """인증 헤더 생성"""
        timestamp = str(int(time.time() * 1000))
        signature = self._generate_signature(method, path, timestamp)
        
        return {
            "Content-Type": "application/json",
            "X-Access-Key": self.access_key,
            "X-Timestamp": timestamp,
            "X-Signature": signature
        }
    
    @property
    def is_available(self) -> bool:
        """Official API 사용 가능 여부"""
        return bool(self.access_key and self.secret_key)
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """Kling Official API로 영상 생성"""
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Kling Official API 키가 설정되지 않았습니다."
            )
        
        path = "/v1/videos/text2video"
        url = f"{self.BASE_URL}{path}"
        
        # 프롬프트 최적화
        preset = STYLE_PRESETS.get(request.style_preset, STYLE_PRESETS["warm_film"])
        enhanced_prompt = f"{request.prompt}, {preset['prompt_suffix']}"
        
        body = {
            "prompt": enhanced_prompt,
            "negative_prompt": request.negative_prompt or "blurry, low quality, distorted",
            "aspect_ratio": request.aspect_ratio.value,
            "duration": request.duration,
            "cfg_scale": 0.5
        }
        
        if request.image_url:
            body["image_url"] = request.image_url
        
        print(f"🎬 [Kling Official] 영상 생성 요청")
        print(f"   프롬프트: {enhanced_prompt[:100]}...")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers("POST", path),
                    json=body
                )
                
                print(f"📡 [Kling Official] 응답: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    task_id = data.get("data", {}).get("task_id")
                    
                    return VideoResponse(
                        success=True,
                        task_id=task_id,
                        status="processing",
                        message="Kling Official 영상 생성 시작",
                        model="kling_official",
                        progress=10
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"Kling Official API 오류: {response.status_code}"
                    )
                    
        except Exception as e:
            print(f"❌ [Kling Official] 오류: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"Kling Official 연결 오류: {str(e)}"
            )
    
    async def check_status(self, task_id: str) -> VideoResponse:
        """작업 상태 확인"""
        
        if not self.is_available:
            return VideoResponse(success=False, status="error", message="API 키 없음")
        
        path = f"/v1/videos/text2video/{task_id}"
        url = f"{self.BASE_URL}{path}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self._get_headers("GET", path)
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    status = data.get("status", "processing")
                    video_url = data.get("video_url")
                    
                    progress = 50
                    if status == "completed":
                        progress = 100
                    elif status == "failed":
                        progress = 0
                    
                    return VideoResponse(
                        success=True,
                        task_id=task_id,
                        video_url=video_url,
                        status=status,
                        progress=progress,
                        model="kling_official"
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"상태 조회 실패: {response.status_code}"
                    )
                    
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}"
            )


# ============================================
# GoAPI Universal Client
# ============================================

class GoAPIClient:
    """
    GoAPI Universal Client
    Veo, Sora, Kling, Hailuo, Luma, Midjourney 통합
    """
    
    BASE_URL = "https://api.goapi.ai/api/v1"
    
    # 모델별 task_type 매핑
    MODEL_CONFIG = {
        VideoModel.KLING: {"task_type": "video_generation", "model": "kling"},
        VideoModel.VEO: {"task_type": "video_generation", "model": "veo"},
        VideoModel.SORA: {"task_type": "video_generation", "model": "sora"},
        VideoModel.HAILUO: {"task_type": "video_generation", "model": "hailuo"},
        VideoModel.LUMA: {"task_type": "video_generation", "model": "luma"},
        VideoModel.MIDJOURNEY: {"task_type": "image_generation", "model": "midjourney"},
    }
    
    def __init__(self):
        self.api_key = os.getenv("GOAPI_KEY")
        
        if self.api_key:
            masked = self.api_key[:8] + "..." if len(self.api_key) > 8 else "***"
            print(f"✅ [GoAPI] API 키 설정됨: {masked}")
        else:
            print("⚠️ [GoAPI] API 키 없음")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }
    
    def _build_request_body(self, request: VideoRequest) -> Dict[str, Any]:
        """GoAPI 요청 본문 생성"""
        
        config = self.MODEL_CONFIG.get(request.model, self.MODEL_CONFIG[VideoModel.KLING])
        
        # 프롬프트 최적화
        preset = STYLE_PRESETS.get(request.style_preset, STYLE_PRESETS["warm_film"])
        enhanced_prompt = f"{request.prompt}, {preset['prompt_suffix']}"
        
        body = {
            "model": config["model"],
            "task_type": config["task_type"],
            "input": {
                "prompt": enhanced_prompt,
                "aspect_ratio": request.aspect_ratio.value,
                "duration": request.duration
            }
        }
        
        if request.negative_prompt:
            body["input"]["negative_prompt"] = request.negative_prompt
        
        if request.image_url:
            body["input"]["image_url"] = request.image_url
        
        return body
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """GoAPI로 영상 생성"""
        
        if not self.api_key:
            return VideoResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다.",
                model=request.model.value
            )
        
        url = f"{self.BASE_URL}/task"
        body = self._build_request_body(request)
        
        # 상세 로그
        masked_key = self.api_key[:8] + "..." if self.api_key else "NOT_SET"
        print(f"{'='*60}")
        print(f"🎬 [GOAPI REQUEST]")
        print(f"   URL: {url}")
        print(f"   API Key: {masked_key}")
        print(f"   Model: {request.model.value}")
        print(f"   Prompt: {request.prompt[:80]}...")
        print(f"   Aspect Ratio: {request.aspect_ratio.value}")
        print(f"   Duration: {request.duration}s")
        print(f"{'='*60}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=body
                )
                
                print(f"📡 [GOAPI RESPONSE]")
                print(f"   HTTP Status: {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                
                # HTTP 에러 체크
                if response.status_code == 401:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message="GoAPI 인증 실패: API 키가 유효하지 않습니다.",
                        model=request.model.value
                    )
                
                if response.status_code == 402:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message="GoAPI 크레딧 부족: 대시보드에서 충전하세요.",
                        model=request.model.value
                    )
                
                if response.status_code == 404:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"GoAPI 엔드포인트를 찾을 수 없습니다.",
                        model=request.model.value
                    )
                
                if response.status_code >= 500:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"GoAPI 서버 오류 ({response.status_code})",
                        model=request.model.value
                    )
                
                data = response.json()
                
                if data.get("code") == 200:
                    task_id = data.get("data", {}).get("task_id")
                    print(f"✅ [GOAPI SUCCESS] task_id: {task_id}")
                    
                    return VideoResponse(
                        success=True,
                        task_id=task_id,
                        status="processing",
                        message="영상 생성이 시작되었습니다.",
                        model=request.model.value,
                        progress=10
                    )
                else:
                    error_code = data.get("code", "UNKNOWN")
                    error_msg = data.get("message", "알 수 없는 오류")
                    print(f"❌ [GOAPI ERROR] Code: {error_code}, Message: {error_msg}")
                    
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"GoAPI 오류 [{error_code}]: {error_msg}",
                        model=request.model.value
                    )
                    
        except httpx.TimeoutException:
            print(f"❌ [GOAPI TIMEOUT] 60초 타임아웃")
            return VideoResponse(
                success=False,
                status="error",
                message="GoAPI 요청 타임아웃",
                model=request.model.value
            )
        except Exception as e:
            print(f"❌ [GOAPI EXCEPTION] {type(e).__name__}: {str(e)}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"GoAPI 연결 오류: {str(e)}",
                model=request.model.value
            )
    
    async def check_status(self, task_id: str, model: VideoModel) -> VideoResponse:
        """GoAPI 작업 상태 확인"""
        
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
                    
                    output = task_data.get("output", {})
                    
                    if status in ["completed", "succeed"]:
                        # 비디오 URL 추출 (다양한 형식 지원)
                        works = output.get("works", [])
                        if works:
                            work = works[0]
                            video_url = (
                                work.get("video", {}).get("resource") or
                                work.get("video", {}).get("resource_without_watermark") or
                                work.get("resource", {}).get("resource")
                            )
                        
                        progress = 100
                        status = "completed"
                        print(f"✅ [VIDEO COMPLETE] URL: {video_url}")
                        
                    elif status == "failed":
                        error_info = task_data.get("error", {})
                        print(f"❌ [VIDEO FAILED] {error_info}")
                        progress = 0
                        
                    elif status == "processing":
                        output_status = output.get("status", 0)
                        progress = min(90, max(20, output_status))
                        
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
                        message=f"상태 조회 실패: {data.get('message', 'Unknown')}",
                        model=model.value
                    )
                    
        except Exception as e:
            print(f"❌ [STATUS CHECK ERROR] {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}",
                model=model.value
            )
    
    def _get_status_message(self, status: str) -> str:
        """상태별 메시지"""
        messages = {
            "pending": "대기 중...",
            "processing": "영상 생성 중...",
            "completed": "영상 생성 완료!",
            "failed": "영상 생성 실패"
        }
        return messages.get(status, "처리 중...")


# ============================================
# HeyGen Avatar Client
# ============================================

class HeyGenClient:
    """
    HeyGen Official API Client
    AI 아바타 영상 생성
    """
    
    BASE_URL = "https://api.heygen.com"
    
    def __init__(self):
        self.api_key = os.getenv("HEYGEN_API_KEY")
        
        if self.api_key:
            print("✅ [HeyGen] API 키 설정됨")
        else:
            print("⚠️ [HeyGen] API 키 없음")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Api-Key": self.api_key
        }
    
    @property
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def create_avatar_video(self, request: AvatarRequest) -> VideoResponse:
        """AI 아바타 영상 생성"""
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="HeyGen API 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/v2/video/generate"
        
        body = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": request.avatar_id,
                    "avatar_style": "normal"
                },
                "voice": {
                    "type": "text",
                    "input_text": request.script,
                    "voice_id": request.voice_id
                },
                "background": {
                    "type": request.background
                }
            }],
            "dimension": {
                "width": 1080 if request.aspect_ratio == AspectRatio.PORTRAIT else 1920,
                "height": 1920 if request.aspect_ratio == AspectRatio.PORTRAIT else 1080
            }
        }
        
        print(f"🎭 [HeyGen] 아바타 영상 생성 요청")
        print(f"   스크립트: {request.script[:100]}...")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=body
                )
                
                print(f"📡 [HeyGen] 응답: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    video_id = data.get("data", {}).get("video_id")
                    
                    return VideoResponse(
                        success=True,
                        task_id=video_id,
                        status="processing",
                        message="HeyGen 아바타 영상 생성 시작",
                        model="heygen",
                        progress=10
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"HeyGen API 오류: {response.status_code}"
                    )
                    
        except Exception as e:
            print(f"❌ [HeyGen] 오류: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"HeyGen 연결 오류: {str(e)}"
            )
    
    async def check_status(self, video_id: str) -> VideoResponse:
        """HeyGen 영상 상태 확인"""
        
        if not self.is_available:
            return VideoResponse(success=False, status="error", message="API 키 없음")
        
        url = f"{self.BASE_URL}/v1/video_status.get"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    params={"video_id": video_id}
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    status = data.get("status", "processing")
                    video_url = data.get("video_url")
                    
                    progress = 50
                    if status == "completed":
                        progress = 100
                    elif status == "failed":
                        progress = 0
                    
                    return VideoResponse(
                        success=True,
                        task_id=video_id,
                        video_url=video_url,
                        status=status,
                        progress=progress,
                        model="heygen"
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"상태 조회 실패: {response.status_code}"
                    )
                    
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}"
            )
    
    async def list_avatars(self) -> List[Dict]:
        """사용 가능한 아바타 목록"""
        
        if not self.is_available:
            return []
        
        url = f"{self.BASE_URL}/v2/avatars"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("avatars", [])
                return []
                
        except Exception as e:
            print(f"⚠️ [HeyGen] 아바타 목록 조회 실패: {e}")
            return []


# ============================================
# Creatomate Editing Client
# ============================================

class CreatomateClient:
    """
    Creatomate API Client
    영상 편집 및 템플릿 렌더링
    """
    
    BASE_URL = "https://api.creatomate.com/v1"
    
    # 템플릿 매핑
    TEMPLATES = {
        "vertical_v1": "YOUR_VERTICAL_TEMPLATE_ID",
        "horizontal_v1": "YOUR_HORIZONTAL_TEMPLATE_ID",
        "square_v1": "YOUR_SQUARE_TEMPLATE_ID"
    }
    
    def __init__(self):
        self.api_key = os.getenv("CREATOMATE_API_KEY")
        
        if self.api_key:
            print("✅ [Creatomate] API 키 설정됨")
        else:
            print("⚠️ [Creatomate] API 키 없음")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    @property
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def _select_template(self, aspect_ratio: AspectRatio) -> str:
        """비율에 맞는 템플릿 선택"""
        if aspect_ratio == AspectRatio.PORTRAIT:
            return self.TEMPLATES["vertical_v1"]
        elif aspect_ratio == AspectRatio.LANDSCAPE:
            return self.TEMPLATES["horizontal_v1"]
        else:
            return self.TEMPLATES["square_v1"]
    
    def _analyze_brightness(self, video_url: str) -> str:
        """영상 밝기 분석 (심플 버전)"""
        # 실제 구현에서는 영상 프레임 분석 필요
        # 여기서는 기본값 반환
        return "dark"  # "dark" or "light"
    
    def _get_text_color(self, brightness: str) -> str:
        """배경 밝기에 따른 텍스트 색상"""
        return "#FFFFFF" if brightness == "dark" else "#000000"
    
    async def render_with_template(
        self, 
        request: EditRequest,
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    ) -> VideoResponse:
        """템플릿 기반 렌더링"""
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Creatomate API 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/renders"
        
        # 템플릿 선택
        template_id = request.template_id or self._select_template(aspect_ratio)
        
        # 밝기 분석 및 텍스트 색상 결정
        brightness = "dark"
        if request.background_video_url:
            brightness = self._analyze_brightness(request.background_video_url)
        text_color = self._get_text_color(brightness)
        
        # 기본 수정사항
        modifications = {
            "Text-Color": text_color,
            "Font-Family": "Pretendard",
            **request.modifications
        }
        
        if request.background_video_url:
            modifications["Background-Video"] = request.background_video_url
        
        body = {
            "template_id": template_id,
            "modifications": modifications
        }
        
        print(f"🎨 [Creatomate] 렌더링 요청")
        print(f"   템플릿: {template_id}")
        print(f"   텍스트 색상: {text_color}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=body
                )
                
                print(f"📡 [Creatomate] 응답: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    render_id = data[0].get("id") if isinstance(data, list) else data.get("id")
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        status="processing",
                        message="Creatomate 렌더링 시작",
                        model="creatomate",
                        progress=10
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"Creatomate API 오류: {response.status_code}"
                    )
                    
        except Exception as e:
            print(f"❌ [Creatomate] 오류: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"Creatomate 연결 오류: {str(e)}"
            )
    
    async def check_render_status(self, render_id: str) -> VideoResponse:
        """렌더링 상태 확인"""
        
        if not self.is_available:
            return VideoResponse(success=False, status="error", message="API 키 없음")
        
        url = f"{self.BASE_URL}/renders/{render_id}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status", "rendering")
                    video_url = data.get("url")
                    
                    progress = 50
                    if status == "succeeded":
                        status = "completed"
                        progress = 100
                    elif status == "failed":
                        progress = 0
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        video_url=video_url,
                        status=status,
                        progress=progress,
                        model="creatomate"
                    )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"상태 조회 실패: {response.status_code}"
                    )
                    
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}"
            )
    
    async def auto_edit(
        self,
        project_id: str,
        video_url: str,
        headline: str,
        subheadline: str = "",
        brand_color: str = "#03C75A",
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    ) -> VideoResponse:
        """자동 편집 (스마트 타이포그래피)"""
        
        request = EditRequest(
            project_id=project_id,
            template_id=self._select_template(aspect_ratio),
            modifications={
                "Headline": headline,
                "Subheadline": subheadline,
                "Brand-Color": brand_color
            },
            background_video_url=video_url
        )
        
        return await self.render_with_template(request, aspect_ratio)


# ============================================
# Factory Engine (Unified Interface)
# ============================================

class FactoryEngine:
    """
    Factory Engine - 통합 인터페이스
    Director의 결정에 따라 적절한 클라이언트 호출
    """
    
    def __init__(self):
        self.kling_official = KlingOfficialClient()
        self.goapi = GoAPIClient()
        self.heygen = HeyGenClient()
        self.creatomate = CreatomateClient()
        
        print("🏭 [Factory Engine] 초기화 완료")
        print(f"   Kling Official: {'✅' if self.kling_official.is_available else '❌'}")
        print(f"   GoAPI: {'✅' if self.goapi.api_key else '❌'}")
        print(f"   HeyGen: {'✅' if self.heygen.is_available else '❌'}")
        print(f"   Creatomate: {'✅' if self.creatomate.is_available else '❌'}")
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """
        영상 생성 (자동 라우팅)
        1. Kling 모델 + Official API 가능 → Kling Official 사용
        2. 그 외 → GoAPI 사용
        """
        
        # Kling Official 우선 시도
        if request.model == VideoModel.KLING and self.kling_official.is_available:
            print("🎯 [Factory] Kling Official API 사용")
            result = await self.kling_official.generate_video(request)
            if result.success:
                return result
            print("⚠️ [Factory] Kling Official 실패, GoAPI로 폴백")
        
        # GoAPI 사용
        print(f"🎯 [Factory] GoAPI 사용 (모델: {request.model.value})")
        return await self.goapi.generate_video(request)
    
    async def check_video_status(self, task_id: str, model: VideoModel, source: str = "auto") -> VideoResponse:
        """영상 상태 확인"""
        
        if source == "kling_official" or (source == "auto" and self.kling_official.is_available and model == VideoModel.KLING):
            return await self.kling_official.check_status(task_id)
        
        return await self.goapi.check_status(task_id, model)
    
    async def create_avatar(self, request: AvatarRequest) -> VideoResponse:
        """HeyGen 아바타 생성"""
        return await self.heygen.create_avatar_video(request)
    
    async def check_avatar_status(self, video_id: str) -> VideoResponse:
        """아바타 영상 상태 확인"""
        return await self.heygen.check_status(video_id)
    
    async def edit_video(self, request: EditRequest, aspect_ratio: AspectRatio) -> VideoResponse:
        """Creatomate 영상 편집"""
        return await self.creatomate.render_with_template(request, aspect_ratio)
    
    async def check_edit_status(self, render_id: str) -> VideoResponse:
        """편집 상태 확인"""
        return await self.creatomate.check_render_status(render_id)
    
    def get_available_models(self) -> List[Dict]:
        """사용 가능한 모델 목록"""
        models = []
        
        for model in VideoModel:
            available = True
            source = "goapi"
            
            if model == VideoModel.KLING and self.kling_official.is_available:
                source = "kling_official"
            elif not self.goapi.api_key:
                available = False
            
            models.append({
                "id": model.value,
                "name": model.value.upper(),
                "available": available,
                "source": source
            })
        
        return models
    
    def get_style_presets(self) -> Dict:
        """스타일 프리셋 목록"""
        return STYLE_PRESETS


# ============================================
# Singleton Instances
# ============================================

_factory_instance = None
_goapi_instance = None
_creatomate_instance = None

def get_factory() -> FactoryEngine:
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = FactoryEngine()
    return _factory_instance

def get_goapi() -> GoAPIClient:
    global _goapi_instance
    if _goapi_instance is None:
        _goapi_instance = GoAPIClient()
    return _goapi_instance

def get_creatomate() -> CreatomateClient:
    global _creatomate_instance
    if _creatomate_instance is None:
        _creatomate_instance = CreatomateClient()
    return _creatomate_instance


# Backward compatibility exports
GoAPIEngine = GoAPIClient
