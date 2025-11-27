"""
Studio Juai PRO - Factory Engine v5.0
=====================================
Hybrid API Engine: Kling Official (JWT) + GoAPI (Veo, Sora, Suno, MJ)

환경 변수:
- KLING_ACCESS_KEY / KLING_SECRET_KEY (Official JWT 인증)
- GOAPI_KEY (Veo, Sora, Suno, Midjourney 통합)
- HEYGEN_API_KEY (AI Avatar)
- CREATOMATE_API_KEY (Video Editing)
- SUPABASE_URL / SUPABASE_KEY (Storage)
"""

import os
import json
import httpx
import jwt  # PyJWT
import time
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


# ============================================
# Enums
# ============================================

class VideoModel(Enum):
    """지원하는 영상 생성 모델"""
    KLING = "kling"           # Kling Official API (JWT)
    VEO = "veo"               # Google Veo 3.1 (via GoAPI)
    SORA = "sora"             # OpenAI Sora 2 (via GoAPI)
    MIDJOURNEY = "midjourney" # Midjourney (via GoAPI)
    HAILUO = "hailuo"         # Hailuo (via GoAPI)
    LUMA = "luma"             # Luma (via GoAPI)


class AudioModel(Enum):
    """지원하는 음악 생성 모델"""
    SUNO = "suno"             # Suno (via GoAPI)


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
class MusicRequest:
    """음악 생성 요청"""
    prompt: str
    style: str = "pop"
    duration: int = 30
    instrumental: bool = False


@dataclass
class MusicResponse:
    """음악 생성 응답"""
    success: bool
    task_id: Optional[str] = None
    audio_url: Optional[str] = None
    status: str = "pending"
    message: str = ""


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
    },
    "cool_modern": {
        "name": "시원한 모던",
        "prompt_suffix": "clean modern aesthetic, cool blue tones, sharp details, professional lighting, 4K quality",
        "color_grade": "cool",
    },
    "golden_hour": {
        "name": "골든아워",
        "prompt_suffix": "golden hour lighting, warm sunset colors, soft shadows, dreamy atmosphere, cinematic, 4K quality",
        "color_grade": "golden",
    },
    "cinematic_teal_orange": {
        "name": "시네마틱",
        "prompt_suffix": "cinematic teal and orange color grade, dramatic lighting, film grain, anamorphic lens flare, 4K HDR",
        "color_grade": "teal_orange",
    },
    "noir": {
        "name": "느와르",
        "prompt_suffix": "high contrast black and white, dramatic shadows, film noir style, moody atmosphere, 4K quality",
        "color_grade": "noir",
    },
    "vibrant": {
        "name": "비비드",
        "prompt_suffix": "vibrant saturated colors, punchy contrast, energetic mood, professional color grade, 4K quality",
        "color_grade": "vibrant",
    }
}


# ============================================
# Kling Official API Client (JWT Authentication)
# ============================================

class KlingOfficialClient:
    """
    Kling Official API Client
    공식 문서 기준 JWT 토큰 인증 방식 구현
    https://docs.qingque.cn/d/home/eZQBaK7oKEjz-rRM3S8jyaLTr
    """
    
    BASE_URL = "https://api.klingai.com"
    
    def __init__(self):
        self.access_key = os.getenv("KLING_ACCESS_KEY")
        self.secret_key = os.getenv("KLING_SECRET_KEY")
        
        if self.access_key and self.secret_key:
            print(f"✅ [Kling Official] API 키 설정됨: {self.access_key[:8]}...")
        else:
            print("⚠️ [Kling Official] API 키 없음 - GoAPI 폴백 사용")
    
    def _generate_jwt_token(self) -> str:
        """
        Kling Official API JWT 토큰 생성
        공식 문서 기준 HS256 알고리즘 사용
        """
        headers = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        now = int(time.time())
        payload = {
            "iss": self.access_key,
            "exp": now + 1800,  # 30분 유효
            "nbf": now - 5      # 5초 전부터 유효
        }
        
        token = jwt.encode(
            payload,
            self.secret_key,
            algorithm="HS256",
            headers=headers
        )
        
        return token
    
    def _get_headers(self) -> Dict[str, str]:
        """인증 헤더 생성"""
        token = self._generate_jwt_token()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    
    @property
    def is_available(self) -> bool:
        """Official API 사용 가능 여부"""
        return bool(self.access_key and self.secret_key)
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """
        Kling Official API로 영상 생성
        
        - Text-to-Video: /v1/videos/text2video
        - Image-to-Video: /v1/videos/image2video
        """
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Kling Official API 키가 설정되지 않았습니다."
            )
        
        # 프롬프트 최적화
        preset = STYLE_PRESETS.get(request.style_preset, STYLE_PRESETS["warm_film"])
        enhanced_prompt = f"{request.prompt}, {preset['prompt_suffix']}"
        
        # Image-to-Video vs Text-to-Video
        is_image_to_video = bool(request.image_url)
        
        if is_image_to_video:
            path = "/v1/videos/image2video"
            body = {
                "model_name": "kling-v1-5",  # 또는 kling-v1
                "image": request.image_url,
                "prompt": enhanced_prompt,
                "negative_prompt": request.negative_prompt or "blurry, low quality, distorted, watermark",
                "cfg_scale": 0.5,
                "mode": "std",  # std 또는 pro
                "duration": str(request.duration),  # "5" 또는 "10"
                "aspect_ratio": request.aspect_ratio.value
            }
            print(f"📸 [Kling Official] Image-to-Video 요청")
            print(f"   이미지: {request.image_url[:50]}...")
        else:
            path = "/v1/videos/text2video"
            body = {
                "model_name": "kling-v1-5",
                "prompt": enhanced_prompt,
                "negative_prompt": request.negative_prompt or "blurry, low quality, distorted, watermark",
                "cfg_scale": 0.5,
                "mode": "std",
                "duration": str(request.duration),
                "aspect_ratio": request.aspect_ratio.value
            }
            print(f"✏️ [Kling Official] Text-to-Video 요청")
        
        url = f"{self.BASE_URL}{path}"
        
        print(f"🎬 [Kling Official] 영상 생성 시작")
        print(f"   URL: {url}")
        print(f"   프롬프트: {enhanced_prompt[:80]}...")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=body
                )
                
                print(f"📡 [Kling Official] HTTP {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Kling API 응답 구조 처리
                    if data.get("code") == 0:
                        task_data = data.get("data", {})
                        task_id = task_data.get("task_id")
                        
                        print(f"✅ [Kling Official] 작업 생성 성공: {task_id}")
                        
                        return VideoResponse(
                            success=True,
                            task_id=task_id,
                            status="processing",
                            message="Kling Official 영상 생성 시작",
                            model="kling_official",
                            progress=10
                        )
                    else:
                        error_msg = data.get("message", "알 수 없는 오류")
                        print(f"❌ [Kling Official] API 오류: {error_msg}")
                        return VideoResponse(
                            success=False,
                            status="error",
                            message=f"Kling API 오류: {error_msg}"
                        )
                else:
                    error_text = response.text[:200]
                    print(f"❌ [Kling Official] HTTP 오류: {response.status_code}")
                    print(f"   응답: {error_text}")
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"Kling Official API 오류: {response.status_code}"
                    )
                    
        except Exception as e:
            print(f"❌ [Kling Official] 예외: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"Kling Official 연결 오류: {str(e)}"
            )
    
    async def check_status(self, task_id: str) -> VideoResponse:
        """작업 상태 확인"""
        
        if not self.is_available:
            return VideoResponse(success=False, status="error", message="API 키 없음")
        
        # 상태 조회 엔드포인트
        url = f"{self.BASE_URL}/v1/videos/text2video/{task_id}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 0:
                        task_data = data.get("data", {})
                        status = task_data.get("task_status", "processing")
                        
                        # 상태 매핑
                        status_map = {
                            "submitted": "processing",
                            "processing": "processing",
                            "succeed": "completed",
                            "failed": "failed"
                        }
                        
                        mapped_status = status_map.get(status, status)
                        video_url = None
                        progress = 50
                        
                        if mapped_status == "completed":
                            # 비디오 URL 추출
                            works = task_data.get("task_result", {}).get("videos", [])
                            if works:
                                video_url = works[0].get("url")
                            progress = 100
                            print(f"✅ [Kling Official] 완료! URL: {video_url}")
                            
                        elif mapped_status == "failed":
                            progress = 0
                            print(f"❌ [Kling Official] 작업 실패")
                        
                        return VideoResponse(
                            success=True,
                            task_id=task_id,
                            video_url=video_url,
                            status=mapped_status,
                            progress=progress,
                            model="kling_official"
                        )
                    
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
# GoAPI Universal Client (Veo, Sora, Suno, MJ)
# ============================================

class GoAPIClient:
    """
    GoAPI Universal Client
    Veo 3.1, Sora 2, Suno, Midjourney 통합
    """
    
    BASE_URL = "https://api.goapi.ai/api/v1"
    
    # 모델별 task_type 매핑 (2024-11-27 테스트 완료)
    MODEL_CONFIG = {
        VideoModel.VEO: {"task_type": "veo3.1-video", "model": "veo3.1"},
        VideoModel.SORA: {"task_type": "sora2-video", "model": "sora2"},
        VideoModel.MIDJOURNEY: {"task_type": "imagine", "model": "midjourney"},
        VideoModel.HAILUO: {"task_type": "video_generation", "model": "hailuo"},
        VideoModel.LUMA: {"task_type": "video_generation", "model": "luma"},
        VideoModel.KLING: {"task_type": "video_generation", "model": "kling"},  # GoAPI fallback
    }
    
    # Suno 설정
    SUNO_CONFIG = {
        "task_type": "suno_music",
        "model": "suno"
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
    
    @property
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def _build_video_request(self, request: VideoRequest) -> Dict[str, Any]:
        """GoAPI 비디오 요청 본문 생성"""
        
        config = self.MODEL_CONFIG.get(request.model, self.MODEL_CONFIG[VideoModel.VEO])
        
        # 프롬프트 최적화
        preset = STYLE_PRESETS.get(request.style_preset, STYLE_PRESETS["warm_film"])
        enhanced_prompt = f"{request.prompt}, {preset['prompt_suffix']}"
        
        body = {
            "model": config["model"],
            "task_type": config["task_type"],
            "input": {
                "prompt": enhanced_prompt,
            }
        }
        
        # 모델별 파라미터 설정
        if request.model == VideoModel.VEO:
            # Veo 3.1: Text-to-Video only (I2V 미지원)
            body["input"]["aspect_ratio"] = request.aspect_ratio.value
            body["input"]["duration"] = f"{request.duration}s"
            body["input"]["resolution"] = "720p"
            
            if request.image_url:
                print("⚠️ [Veo3.1] Image-to-Video 미지원 - 이미지 무시")
                
        elif request.model == VideoModel.SORA:
            # Sora 2: Text-to-Video only
            body["input"]["aspect_ratio"] = request.aspect_ratio.value
            body["input"]["duration"] = request.duration
            
            if request.image_url:
                print("⚠️ [Sora2] Image-to-Video 미지원 - 이미지 무시")
                
        elif request.model == VideoModel.KLING:
            # Kling via GoAPI: I2V 지원
            body["input"]["aspect_ratio"] = request.aspect_ratio.value
            body["input"]["duration"] = int(request.duration)  # int 필수!
            
            if request.image_url:
                print(f"📸 [GoAPI Kling] Image-to-Video")
                body["input"]["image_url"] = request.image_url
                
        elif request.model == VideoModel.MIDJOURNEY:
            # Midjourney: 이미지 생성
            body["task_type"] = "imagine"
            body["input"]["aspect_ratio"] = request.aspect_ratio.value
            
        else:
            # Hailuo, Luma 등
            body["input"]["aspect_ratio"] = request.aspect_ratio.value
            body["input"]["duration"] = int(request.duration)
            
            if request.image_url:
                body["input"]["image_url"] = request.image_url
        
        # Negative prompt
        if request.negative_prompt:
            body["input"]["negative_prompt"] = request.negative_prompt
        
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
        body = self._build_video_request(request)
        
        print(f"{'='*60}")
        print(f"🎬 [GoAPI] 영상 생성 요청")
        print(f"   Model: {body['model']}")
        print(f"   Task Type: {body['task_type']}")
        print(f"   Prompt: {body['input']['prompt'][:80]}...")
        print(f"{'='*60}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                print(f"📡 [GoAPI] HTTP {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_id = data.get("data", {}).get("task_id")
                        print(f"✅ [GoAPI] 작업 생성: {task_id}")
                        
                        return VideoResponse(
                            success=True,
                            task_id=task_id,
                            status="processing",
                            message="영상 생성이 시작되었습니다.",
                            model=request.model.value,
                            progress=10
                        )
                    else:
                        error_msg = data.get("message", "알 수 없는 오류")
                        print(f"❌ [GoAPI] 오류: {error_msg}")
                        return VideoResponse(
                            success=False,
                            status="error",
                            message=f"GoAPI 오류: {error_msg}",
                            model=request.model.value
                        )
                else:
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"GoAPI HTTP 오류: {response.status_code}",
                        model=request.model.value
                    )
                    
        except Exception as e:
            print(f"❌ [GoAPI] 예외: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"GoAPI 연결 오류: {str(e)}",
                model=request.model.value
            )
    
    async def generate_music(self, request: MusicRequest) -> MusicResponse:
        """GoAPI Suno로 음악 생성"""
        
        if not self.api_key:
            return MusicResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/task"
        body = {
            "model": "suno",
            "task_type": "generate_music",
            "input": {
                "prompt": request.prompt,
                "style": request.style,
                "duration": request.duration,
                "instrumental": request.instrumental
            }
        }
        
        print(f"🎵 [GoAPI Suno] 음악 생성 요청")
        print(f"   프롬프트: {request.prompt[:80]}...")
        print(f"   스타일: {request.style}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_id = data.get("data", {}).get("task_id")
                        print(f"✅ [Suno] 작업 생성: {task_id}")
                        
                        return MusicResponse(
                            success=True,
                            task_id=task_id,
                            status="processing",
                            message="음악 생성이 시작되었습니다."
                        )
                        
                return MusicResponse(
                    success=False,
                    status="error",
                    message=f"Suno API 오류: {response.status_code}"
                )
                
        except Exception as e:
            return MusicResponse(
                success=False,
                status="error",
                message=f"Suno 연결 오류: {str(e)}"
            )
    
    async def check_status(self, task_id: str, model: VideoModel) -> VideoResponse:
        """GoAPI 작업 상태 확인"""
        
        if not self.api_key:
            return VideoResponse(success=False, status="error", message="API 키 없음")
        
        url = f"{self.BASE_URL}/task/{task_id}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_data = data.get("data", {})
                        status = task_data.get("status", "processing")
                        output = task_data.get("output", {})
                        
                        video_url = None
                        progress = 50
                        
                        if status in ["completed", "succeed"]:
                            # 비디오 URL 추출
                            works = output.get("works", [])
                            if works:
                                work = works[0]
                                video_url = (
                                    work.get("video", {}).get("resource") or
                                    work.get("video", {}).get("resource_without_watermark") or
                                    work.get("resource", {}).get("resource") or
                                    output.get("video_url")
                                )
                            
                            # Veo3.1 특수 처리
                            if not video_url and model == VideoModel.VEO:
                                video_url = output.get("video_url") or output.get("url")
                            
                            progress = 100
                            status = "completed"
                            print(f"✅ [GoAPI] 완료! URL: {video_url}")
                            
                        elif status == "failed":
                            progress = 0
                            error = task_data.get("error", {})
                            print(f"❌ [GoAPI] 실패: {error}")
                            
                        elif status == "pending":
                            progress = 10
                            
                        elif status == "processing":
                            progress = min(90, max(20, output.get("status", 0)))
                        
                        return VideoResponse(
                            success=True,
                            task_id=task_id,
                            video_url=video_url,
                            status=status,
                            progress=progress,
                            model=model.value
                        )
                        
                return VideoResponse(
                    success=False,
                    status="error",
                    message=f"상태 조회 실패",
                    model=model.value
                )
                
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}",
                model=model.value
            )


# ============================================
# HeyGen Avatar Client
# ============================================

class HeyGenClient:
    """HeyGen AI Avatar Client"""
    
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
        
        print(f"🎭 [HeyGen] 아바타 영상 생성")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
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
                    
                return VideoResponse(
                    success=False,
                    status="error",
                    message=f"HeyGen API 오류: {response.status_code}"
                )
                
        except Exception as e:
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
# Creatomate Editing Client
# ============================================

class CreatomateClient:
    """Creatomate Video Editing Client"""
    
    BASE_URL = "https://api.creatomate.com/v1"
    
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
    
    async def render_with_template(self, request: EditRequest, aspect_ratio: AspectRatio) -> VideoResponse:
        """템플릿 기반 렌더링"""
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Creatomate API 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/renders"
        
        modifications = {
            "Font-Family": "Pretendard",
            **request.modifications
        }
        
        if request.background_video_url:
            modifications["Background-Video"] = request.background_video_url
        
        body = {
            "template_id": request.template_id,
            "modifications": modifications
        }
        
        print(f"🎨 [Creatomate] 렌더링 요청")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
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
                    
                return VideoResponse(
                    success=False,
                    status="error",
                    message=f"Creatomate API 오류: {response.status_code}"
                )
                
        except Exception as e:
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
# Hybrid Factory Engine (Main Interface)
# ============================================

class FactoryEngine:
    """
    Hybrid Factory Engine - 통합 인터페이스
    
    라우팅 로직:
    1. model == 'kling' → Kling Official API (JWT) 우선, 실패 시 GoAPI 폴백
    2. model == 'veo', 'sora', 'midjourney' → GoAPI
    3. model == 'suno' → GoAPI Suno
    4. Avatar → HeyGen
    5. Edit → Creatomate
    """
    
    def __init__(self):
        self.kling_official = KlingOfficialClient()
        self.goapi = GoAPIClient()
        self.heygen = HeyGenClient()
        self.creatomate = CreatomateClient()
        
        print("\n" + "="*60)
        print("🏭 [HYBRID FACTORY ENGINE] 초기화 완료")
        print("="*60)
        print(f"   Kling Official (JWT): {'✅ 활성' if self.kling_official.is_available else '❌ 비활성'}")
        print(f"   GoAPI (Veo/Sora/Suno/MJ): {'✅ 활성' if self.goapi.is_available else '❌ 비활성'}")
        print(f"   HeyGen (Avatar): {'✅ 활성' if self.heygen.is_available else '❌ 비활성'}")
        print(f"   Creatomate (Edit): {'✅ 활성' if self.creatomate.is_available else '❌ 비활성'}")
        print("="*60 + "\n")
    
    async def generate_video(self, request: VideoRequest) -> VideoResponse:
        """
        영상 생성 (하이브리드 라우팅)
        
        - Kling: Official API 우선 → GoAPI 폴백
        - Veo, Sora, MJ: GoAPI 직접
        """
        
        print(f"\n{'='*60}")
        print(f"🎬 [FACTORY] generate_video 요청")
        print(f"   Model: {request.model.value}")
        print(f"   Image: {'있음' if request.image_url else '없음'}")
        print(f"{'='*60}")
        
        # Kling: Official API 우선
        if request.model == VideoModel.KLING:
            if self.kling_official.is_available:
                print("🎯 [ROUTING] Kling Official API 사용")
                result = await self.kling_official.generate_video(request)
                
                if result.success:
                    result.model = "kling_official"
                    return result
                    
                print("⚠️ [ROUTING] Kling Official 실패, GoAPI 폴백")
            
            # GoAPI 폴백
            if self.goapi.is_available:
                print("🎯 [ROUTING] GoAPI Kling 폴백")
                return await self.goapi.generate_video(request)
            
            return VideoResponse(
                success=False,
                status="error",
                message="Kling API 사용 불가 (Official + GoAPI 모두 실패)"
            )
        
        # Veo, Sora, Midjourney, etc: GoAPI
        if self.goapi.is_available:
            print(f"🎯 [ROUTING] GoAPI {request.model.value}")
            return await self.goapi.generate_video(request)
        
        return VideoResponse(
            success=False,
            status="error",
            message="GoAPI 키가 설정되지 않았습니다."
        )
    
    async def generate_music(self, request: MusicRequest) -> MusicResponse:
        """음악 생성 (Suno via GoAPI)"""
        
        if not self.goapi.is_available:
            return MusicResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다."
            )
        
        print("🎯 [ROUTING] GoAPI Suno")
        return await self.goapi.generate_music(request)
    
    async def check_video_status(self, task_id: str, model: VideoModel, source: str = "auto") -> VideoResponse:
        """영상 상태 확인"""
        
        # Kling Official 상태 확인
        if source == "kling_official" or (source == "auto" and model == VideoModel.KLING and self.kling_official.is_available):
            result = await self.kling_official.check_status(task_id)
            if result.success:
                return result
        
        # GoAPI 상태 확인
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
        models = [
            {
                "id": "kling",
                "name": "Kling (Official)",
                "type": "video",
                "available": self.kling_official.is_available or self.goapi.is_available,
                "source": "kling_official" if self.kling_official.is_available else "goapi",
                "features": ["text2video", "image2video"],
                "description": "고품질 영상 생성, 이미지-투-비디오 지원"
            },
            {
                "id": "veo",
                "name": "Veo 3.1 (Google)",
                "type": "video",
                "available": self.goapi.is_available,
                "source": "goapi",
                "features": ["text2video"],
                "description": "Google의 최신 영상 생성 모델"
            },
            {
                "id": "sora",
                "name": "Sora 2 (OpenAI)",
                "type": "video",
                "available": self.goapi.is_available,
                "source": "goapi",
                "features": ["text2video"],
                "description": "OpenAI의 고품질 영상 생성"
            },
            {
                "id": "midjourney",
                "name": "Midjourney",
                "type": "image",
                "available": self.goapi.is_available,
                "source": "goapi",
                "features": ["text2image"],
                "description": "고품질 이미지 생성"
            },
            {
                "id": "suno",
                "name": "Suno (Music)",
                "type": "audio",
                "available": self.goapi.is_available,
                "source": "goapi",
                "features": ["music_generation"],
                "description": "AI 음악 생성"
            },
            {
                "id": "heygen",
                "name": "HeyGen (Avatar)",
                "type": "avatar",
                "available": self.heygen.is_available,
                "source": "heygen",
                "features": ["avatar_video"],
                "description": "AI 아바타 영상 생성"
            }
        ]
        
        return models
    
    def get_style_presets(self) -> Dict:
        """스타일 프리셋 목록"""
        return STYLE_PRESETS


# ============================================
# Singleton Instance
# ============================================

_factory_instance = None

def get_factory() -> FactoryEngine:
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = FactoryEngine()
    return _factory_instance


# Backward compatibility
GoAPIEngine = GoAPIClient
GoAPIClient = GoAPIClient
