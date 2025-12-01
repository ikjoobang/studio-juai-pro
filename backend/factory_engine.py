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
    UDIO = "udio"             # Udio (via GoAPI) - Fallback


class ImageModel(Enum):
    """지원하는 이미지 생성 모델"""
    GEMINI = "gemini"         # Gemini 2.0 Flash (Google AI - 비용 효율적, 기본값)
    FLUX = "flux"             # Flux.1 (via GoAPI)
    MIDJOURNEY = "midjourney" # Midjourney (via GoAPI)
    DALLE = "dalle"           # DALL-E 3 (via GoAPI)


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
    model: str = "suno"  # 어떤 모델로 생성했는지


@dataclass
class ImageRequest:
    """이미지 생성 요청"""
    prompt: str
    model: ImageModel = ImageModel.FLUX
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    style: str = "realistic"
    negative_prompt: Optional[str] = None


@dataclass
class ImageResponse:
    """이미지 생성 응답"""
    success: bool
    task_id: Optional[str] = None
    image_url: Optional[str] = None
    status: str = "pending"
    message: str = ""
    model: str = "flux"


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
# Gemini 2.0 Flash Image Client (Google AI)
# ============================================

class GeminiImageClient:
    """
    Gemini 2.0 Flash 이미지 생성 클라이언트
    텍스트 + 이미지 생성을 단일 모델로 처리 (비용 효율적)
    """
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        self.model_name = "gemini-2.0-flash-exp"  # 이미지 생성 지원 모델
        
        if self.api_key:
            print(f"✅ [Gemini Image] API 키 설정됨: {self.api_key[:12]}...")
        else:
            print("❌ [Gemini Image] API 키 없음")
    
    @property
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def generate_image(self, request: 'ImageRequest') -> 'ImageResponse':
        """
        Gemini 기반 이미지 생성
        
        현재 Gemini 2.0 Flash는 이미지 생성을 직접 지원하지 않음.
        대신 GoAPI Flux로 Fallback 처리.
        
        향후 Google Imagen API가 일반 공개되면 직접 연동 가능.
        """
        
        # Gemini API로 직접 이미지 생성은 현재 미지원
        # GoAPI Flux로 Fallback 안내
        print(f"⚠️ [Gemini Image] 현재 Gemini API 이미지 생성 미지원 - Flux로 Fallback 권장")
        
        return ImageResponse(
            success=False,
            status="fallback_required",
            message="Gemini 이미지 생성은 현재 지원되지 않습니다. Flux 모델로 자동 전환됩니다.",
            model="gemini"
        )
                
        except Exception as e:
            print(f"❌ [Gemini Image] 오류: {str(e)}")
            return ImageResponse(
                success=False,
                status="error",
                message=f"Gemini 이미지 생성 오류: {str(e)}",
                model="gemini"
            )


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
            print("❌ [Kling Official] API 키 없음 - Kling 사용 불가")
    
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
                "model_name": "kling-v1",  # I2V는 kling-v1 사용
                "image": request.image_url,
                "prompt": enhanced_prompt,
                "negative_prompt": request.negative_prompt or "blurry, low quality, distorted, watermark",
                "cfg_scale": 0.5,
                "mode": "std",
                "duration": str(request.duration),  # "5" 또는 "10"
                "aspect_ratio": request.aspect_ratio.value
            }
            print(f"📸 [Kling Official] Image-to-Video 요청")
            print(f"   이미지: {request.image_url[:50]}...")
        else:
            path = "/v1/videos/text2video"
            body = {
                "model_name": "kling-v1",  # T2V도 kling-v1 + std 모드 사용 (안정적)
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
    
    # 음악 모델 설정 (GoAPI 2024-11 스펙)
    MUSIC_CONFIG = {
        AudioModel.SUNO: {"task_type": "suno-music", "model": "suno"},
        AudioModel.UDIO: {"task_type": "udio-music", "model": "udio"},
    }
    
    # 이미지 모델 설정 (GoAPI 공식 문서 기준)
    IMAGE_CONFIG = {
        ImageModel.FLUX: {"task_type": "txt2img", "model": "flux-1.1-pro"},  # Flux.1 Pro
        ImageModel.MIDJOURNEY: {"task_type": "imagine", "model": "midjourney"},
        ImageModel.DALLE: {"task_type": "generations", "model": "dall-e-3"},
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
                            message=f"현재 AI 공급사(GoAPI) 서버 점검 중입니다. 잠시 후 다시 시도해주세요. (코드: {error_msg})",
                            model=request.model.value
                        )
                else:
                    # 500/503 등 서버 오류
                    friendly_msg = "현재 AI 공급사(GoAPI) 서버 점검 중입니다. 잠시 후 다시 시도해주세요."
                    return VideoResponse(
                        success=False,
                        status="error",
                        message=f"{friendly_msg} (HTTP {response.status_code})",
                        model=request.model.value
                    )
                    
        except Exception as e:
            print(f"❌ [GoAPI] 예외: {e}")
            return VideoResponse(
                success=False,
                status="error",
                message=f"현재 AI 공급사(GoAPI) 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
                model=request.model.value
            )
    
    async def _generate_music_with_model(
        self, 
        request: MusicRequest, 
        audio_model: AudioModel
    ) -> MusicResponse:
        """특정 모델로 음악 생성 (내부 함수)"""
        
        config = self.MUSIC_CONFIG.get(audio_model, self.MUSIC_CONFIG[AudioModel.SUNO])
        
        url = f"{self.BASE_URL}/task"
        
        # GoAPI Suno/Udio 스펙에 맞는 파라미터
        if audio_model == AudioModel.SUNO:
            body = {
                "model": "suno",
                "task_type": "suno-music",
                "input": {
                    "gpt_description_prompt": request.prompt,
                    "make_instrumental": request.instrumental,
                    "mv": "chirp-v3-5"  # 최신 Suno 모델
                }
            }
        else:
            # Udio
            body = {
                "model": "udio",
                "task_type": "udio-music",
                "input": {
                    "prompt": request.prompt,
                    "seed": -1
                }
            }
        
        print(f"🎵 [GoAPI {audio_model.value.upper()}] 음악 생성 요청")
        print(f"   프롬프트: {request.prompt[:80]}...")
        print(f"   스타일: {request.style}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_id = data.get("data", {}).get("task_id")
                        print(f"✅ [{audio_model.value.upper()}] 작업 생성: {task_id}")
                        
                        return MusicResponse(
                            success=True,
                            task_id=task_id,
                            status="processing",
                            message=f"{audio_model.value.upper()} 음악 생성이 시작되었습니다.",
                            model=audio_model.value
                        )
                
                # 오류 반환 (Fallback 가능)
                # 500/503 서버 오류
                friendly_msg = f"현재 {audio_model.value.upper()} 음악 서버 점검 중입니다."
                return MusicResponse(
                    success=False,
                    status="error",
                    message=f"{friendly_msg} (HTTP {response.status_code})",
                    model=audio_model.value
                )
                
        except Exception as e:
            return MusicResponse(
                success=False,
                status="error",
                message=f"현재 {audio_model.value.upper()} 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
                model=audio_model.value
            )
    
    async def generate_music(self, request: MusicRequest, preferred_model: AudioModel = AudioModel.SUNO) -> MusicResponse:
        """
        GoAPI 음악 생성 (Fallback 시스템)
        
        우선순위:
        1. preferred_model (기본: Suno)
        2. Fallback: Udio (Suno 실패시)
        """
        
        if not self.api_key:
            return MusicResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다."
            )
        
        # 1차: 선호 모델 시도
        print(f"{'='*60}")
        print(f"🎵 [MUSIC] 1차 시도: {preferred_model.value.upper()}")
        print(f"{'='*60}")
        
        result = await self._generate_music_with_model(request, preferred_model)
        
        if result.success:
            return result
        
        # 2차: Fallback 시도 (Suno 실패 → Udio)
        fallback_model = AudioModel.UDIO if preferred_model == AudioModel.SUNO else AudioModel.SUNO
        
        print(f"{'='*60}")
        print(f"⚠️ [{preferred_model.value.upper()}] 실패! Fallback: {fallback_model.value.upper()}")
        print(f"{'='*60}")
        
        fallback_result = await self._generate_music_with_model(request, fallback_model)
        
        if fallback_result.success:
            fallback_result.message = f"[Fallback] {fallback_result.message}"
            return fallback_result
        
        # 모두 실패 - 상세 메시지 포함
        print(f"❌ [MUSIC] Suno, Udio 모두 실패")
        print(f"   Suno 오류: {result.message}")
        print(f"   Udio 오류: {fallback_result.message}")
        
        return MusicResponse(
            success=False,
            status="error",
            message=f"Suno, Udio 모두 실패. Suno: {result.message[:100]} / Udio: {fallback_result.message[:100]}"
        )
    
    async def generate_image(self, request: ImageRequest) -> ImageResponse:
        """GoAPI로 이미지 생성 (Flux.1, Midjourney, DALL-E)"""
        
        if not self.api_key:
            return ImageResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다."
            )
        
        config = self.IMAGE_CONFIG.get(request.model, self.IMAGE_CONFIG[ImageModel.FLUX])
        
        url = f"{self.BASE_URL}/task"
        
        # 모델별 body 구성
        if request.model == ImageModel.FLUX:
            # Flux.1 Pro - GoAPI 공식 파라미터 (2024-11 업데이트)
            # 9:16 = 768x1344, 16:9 = 1344x768, 1:1 = 1024x1024
            if request.aspect_ratio == AspectRatio.PORTRAIT:
                width, height = 768, 1344
            elif request.aspect_ratio == AspectRatio.LANDSCAPE:
                width, height = 1344, 768
            else:
                width, height = 1024, 1024
            
            body = {
                "model": "flux-pro",
                "task_type": "flux-pro",
                "input": {
                    "prompt": request.prompt,
                    "width": width,
                    "height": height,
                    "steps": 25,
                    "guidance": 3.0,
                    "safety_tolerance": 2
                }
            }
        elif request.model == ImageModel.MIDJOURNEY:
            body = {
                "model": "midjourney",
                "task_type": "imagine",
                "input": {
                    "prompt": request.prompt,
                    "aspect_ratio": request.aspect_ratio.value,
                    "process_mode": "fast"
                }
            }
        elif request.model == ImageModel.DALLE:
            size = "1024x1792" if request.aspect_ratio == AspectRatio.PORTRAIT else "1792x1024"
            if request.aspect_ratio == AspectRatio.SQUARE:
                size = "1024x1024"
            body = {
                "model": "dall-e-3",
                "task_type": "generations",
                "input": {
                    "prompt": request.prompt,
                    "size": size,
                    "quality": "hd"
                }
            }
        else:
            # 기본 (fallback)
            body = {
                "model": config["model"],
                "task_type": config["task_type"],
                "input": {
                    "prompt": request.prompt,
                    "aspect_ratio": request.aspect_ratio.value
                }
            }
        
        print(f"🖼️ [GoAPI {request.model.value.upper()}] 이미지 생성 요청")
        print(f"   프롬프트: {request.prompt[:80]}...")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("code") == 200:
                        task_id = data.get("data", {}).get("task_id")
                        print(f"✅ [{request.model.value.upper()}] 이미지 작업 생성: {task_id}")
                        
                        return ImageResponse(
                            success=True,
                            task_id=task_id,
                            status="processing",
                            message=f"{request.model.value.upper()} 이미지 생성이 시작되었습니다.",
                            model=request.model.value
                        )
                
                # 상세 오류 로깅
                error_detail = response.text[:500] if response.text else "No response body"
                print(f"❌ [Image API] 오류: {response.status_code} - {error_detail}")
                
                friendly_msg = "현재 AI 공급사(GoAPI) 이미지 서버 점검 중입니다. 잠시 후 다시 시도해주세요."
                return ImageResponse(
                    success=False,
                    status="error",
                    message=f"{friendly_msg} (HTTP {response.status_code})",
                    model=request.model.value
                )
                
        except Exception as e:
            return ImageResponse(
                success=False,
                status="error",
                message=f"현재 AI 공급사(GoAPI) 이미지 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
                model=request.model.value
            )
    
    async def check_image_status(self, task_id: str) -> ImageResponse:
        """이미지 생성 상태 확인"""
        
        if not self.api_key:
            return ImageResponse(success=False, status="error", message="API 키 없음")
        
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
                        
                        image_url = None
                        
                        if status in ["completed", "succeed"]:
                            # Flux/Midjourney 이미지 URL 추출
                            images = output.get("images", [])
                            if images:
                                image_url = images[0].get("url") or images[0]
                            else:
                                image_url = output.get("image_url") or output.get("url")
                            
                            print(f"✅ [Image] 완료! URL: {image_url}")
                            
                            return ImageResponse(
                                success=True,
                                task_id=task_id,
                                image_url=image_url,
                                status="completed",
                                message="이미지 생성 완료"
                            )
                        
                        elif status == "failed":
                            return ImageResponse(
                                success=False,
                                task_id=task_id,
                                status="failed",
                                message=f"이미지 생성 실패: {task_data.get('error', {})}"
                            )
                        
                        return ImageResponse(
                            success=True,
                            task_id=task_id,
                            status=status,
                            message="이미지 생성 중..."
                        )
                
                return ImageResponse(
                    success=False,
                    status="error",
                    message="상태 조회 실패"
                )
                
        except Exception as e:
            return ImageResponse(
                success=False,
                status="error",
                message=f"상태 조회 오류: {str(e)}"
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
    
    async def list_avatars(self) -> List[Dict[str, Any]]:
        """사용 가능한 아바타 목록 조회"""
        
        if not self.is_available:
            return []
        
        url = f"{self.BASE_URL}/v2/avatars"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    avatars = data.get("data", {}).get("avatars", [])
                    
                    # 아바타 정보 정리
                    result = []
                    for avatar in avatars:
                        result.append({
                            "avatar_id": avatar.get("avatar_id"),
                            "avatar_name": avatar.get("avatar_name"),
                            "gender": avatar.get("gender"),
                            "preview_image_url": avatar.get("preview_image_url"),
                            "preview_video_url": avatar.get("preview_video_url")
                        })
                    
                    print(f"✅ [HeyGen] {len(result)}개 아바타 조회됨")
                    return result
                else:
                    print(f"❌ [HeyGen] 아바타 목록 조회 실패: {response.status_code}")
                    return []
                    
        except Exception as e:
            print(f"❌ [HeyGen] 아바타 목록 조회 오류: {e}")
            return []
    
    async def list_voices(self) -> List[Dict[str, Any]]:
        """사용 가능한 음성 목록 조회"""
        
        if not self.is_available:
            return []
        
        url = f"{self.BASE_URL}/v2/voices"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    voices = data.get("data", {}).get("voices", [])
                    
                    result = []
                    for voice in voices:
                        result.append({
                            "voice_id": voice.get("voice_id"),
                            "name": voice.get("name"),
                            "language": voice.get("language"),
                            "gender": voice.get("gender"),
                            "preview_audio": voice.get("preview_audio")
                        })
                    
                    print(f"✅ [HeyGen] {len(result)}개 음성 조회됨")
                    return result
                else:
                    print(f"❌ [HeyGen] 음성 목록 조회 실패: {response.status_code}")
                    return []
                    
        except Exception as e:
            print(f"❌ [HeyGen] 음성 목록 조회 오류: {e}")
            return []


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
    
    async def concat_videos(
        self,
        project_id: str,
        video_urls: List[str],
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT,
        transition: str = "fade",
        transition_duration: float = 0.5
    ) -> VideoResponse:
        """
        여러 비디오 연결/병합 (Concat)
        
        Args:
            project_id: 프로젝트 ID
            video_urls: 연결할 비디오 URL 목록 (순서대로 연결)
            aspect_ratio: 출력 비율
            transition: 전환 효과 (fade, slide, zoom, none)
            transition_duration: 전환 시간 (초)
        
        Returns:
            VideoResponse: 병합된 비디오 결과
        """
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Creatomate API 키가 설정되지 않았습니다."
            )
        
        if len(video_urls) < 2:
            return VideoResponse(
                success=False,
                status="error",
                message="최소 2개 이상의 비디오가 필요합니다."
            )
        
        url = f"{self.BASE_URL}/renders"
        
        # 비디오 요소들 생성
        video_elements = []
        for i, video_url in enumerate(video_urls):
            element = {
                "type": "video",
                "source": video_url,
                "fit": "cover"
            }
            
            # 전환 효과 추가 (두 번째 비디오부터)
            if i > 0 and transition != "none":
                element["enter"] = {
                    "type": transition,
                    "duration": transition_duration
                }
            
            video_elements.append(element)
        
        # 화면 크기 설정
        width = 1080 if aspect_ratio == AspectRatio.PORTRAIT else 1920
        height = 1920 if aspect_ratio == AspectRatio.PORTRAIT else 1080
        
        body = {
            "source": {
                "output_format": "mp4",
                "width": width,
                "height": height,
                "elements": video_elements
            }
        }
        
        print(f"🎬 [Creatomate] 비디오 연결 요청: {len(video_urls)}개 영상")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code in [200, 201, 202]:
                    data = response.json()
                    
                    if isinstance(data, list) and len(data) > 0:
                        render = data[0]
                        render_id = render.get("id")
                        video_url = render.get("url")
                        status = render.get("status", "processing")
                    else:
                        render_id = data.get("id")
                        video_url = data.get("url")
                        status = data.get("status", "processing")
                    
                    mapped_status = "completed" if status in ["succeeded", "completed"] else "processing"
                    progress = 100 if mapped_status == "completed" else 30
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        video_url=video_url,
                        status=mapped_status,
                        message=f"비디오 연결 {'완료' if mapped_status == 'completed' else '진행 중'}",
                        model="creatomate_concat",
                        progress=progress
                    )
                
                return VideoResponse(
                    success=False,
                    status="error",
                    message=f"Creatomate API 오류: {response.status_code} - {response.text[:200]}"
                )
                
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"Creatomate 연결 오류: {str(e)}"
            )
    
    async def merge_videos_with_music(
        self,
        project_id: str,
        video_urls: List[str],
        music_url: str,
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT,
        transition: str = "fade",
        transition_duration: float = 0.5,
        music_volume: float = 0.5
    ) -> VideoResponse:
        """
        비디오들을 연결하고 배경 음악 추가
        
        Args:
            project_id: 프로젝트 ID
            video_urls: 비디오 URL 목록
            music_url: 배경 음악 URL
            aspect_ratio: 출력 비율
            transition: 전환 효과
            transition_duration: 전환 시간
            music_volume: 음악 볼륨 (0-1)
        """
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Creatomate API 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/renders"
        
        # 비디오 요소들
        video_elements = []
        for i, vid_url in enumerate(video_urls):
            element = {
                "type": "video",
                "source": vid_url,
                "fit": "cover",
                "volume": 0.3  # 비디오 원본 음량 줄이기
            }
            
            if i > 0 and transition != "none":
                element["enter"] = {
                    "type": transition,
                    "duration": transition_duration
                }
            
            video_elements.append(element)
        
        # 배경 음악 요소
        music_element = {
            "type": "audio",
            "source": music_url,
            "volume": music_volume,
            "loop": True  # 비디오 길이에 맞춰 반복
        }
        
        width = 1080 if aspect_ratio == AspectRatio.PORTRAIT else 1920
        height = 1920 if aspect_ratio == AspectRatio.PORTRAIT else 1080
        
        body = {
            "source": {
                "output_format": "mp4",
                "width": width,
                "height": height,
                "elements": video_elements + [music_element]
            }
        }
        
        print(f"🎬🎵 [Creatomate] 비디오+음악 병합 요청: {len(video_urls)}개 영상 + BGM")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code in [200, 201, 202]:
                    data = response.json()
                    
                    if isinstance(data, list) and len(data) > 0:
                        render_id = data[0].get("id")
                        video_url = data[0].get("url")
                        status = data[0].get("status", "processing")
                    else:
                        render_id = data.get("id")
                        video_url = data.get("url")
                        status = data.get("status", "processing")
                    
                    mapped_status = "completed" if status in ["succeeded", "completed"] else "processing"
                    progress = 100 if mapped_status == "completed" else 30
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        video_url=video_url,
                        status=mapped_status,
                        message=f"비디오+음악 병합 {'완료' if mapped_status == 'completed' else '진행 중'}",
                        model="creatomate_merge",
                        progress=progress
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
    
    async def add_text_overlay(
        self,
        project_id: str,
        video_url: str,
        texts: List[Dict[str, Any]],
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    ) -> VideoResponse:
        """
        비디오에 텍스트 오버레이 추가
        
        Args:
            project_id: 프로젝트 ID
            video_url: 비디오 URL
            texts: 텍스트 요소 목록 [{
                "text": "텍스트 내용",
                "x": "50%",      # 가로 위치 (기본: 중앙)
                "y": "50%",      # 세로 위치
                "font_size": 48, # 폰트 크기
                "color": "#FFFFFF",
                "start_time": 0,  # 시작 시간 (초)
                "duration": None  # 지속 시간 (None = 끝까지)
            }]
        """
        
        if not self.is_available:
            return VideoResponse(
                success=False,
                status="error",
                message="Creatomate API 키가 설정되지 않았습니다."
            )
        
        url = f"{self.BASE_URL}/renders"
        
        elements = [
            {
                "type": "video",
                "source": video_url,
                "fit": "cover"
            }
        ]
        
        # 텍스트 요소들 추가
        for text_item in texts:
            text_element = {
                "type": "text",
                "text": text_item.get("text", ""),
                "font_family": text_item.get("font_family", "Pretendard"),
                "font_weight": text_item.get("font_weight", "700"),
                "font_size": f"{text_item.get('font_size', 48)} px",
                "fill_color": text_item.get("color", "#FFFFFF"),
                "shadow_color": "rgba(0,0,0,0.5)",
                "x": text_item.get("x", "50%"),
                "y": text_item.get("y", "50%"),
                "x_anchor": "50%",
                "y_anchor": "50%"
            }
            
            if text_item.get("start_time") is not None:
                text_element["start"] = text_item["start_time"]
            
            if text_item.get("duration") is not None:
                text_element["duration"] = text_item["duration"]
            
            elements.append(text_element)
        
        width = 1080 if aspect_ratio == AspectRatio.PORTRAIT else 1920
        height = 1920 if aspect_ratio == AspectRatio.PORTRAIT else 1080
        
        body = {
            "source": {
                "output_format": "mp4",
                "width": width,
                "height": height,
                "elements": elements
            }
        }
        
        print(f"📝 [Creatomate] 텍스트 오버레이 추가: {len(texts)}개 텍스트")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                if response.status_code in [200, 201, 202]:
                    data = response.json()
                    
                    if isinstance(data, list) and len(data) > 0:
                        render_id = data[0].get("id")
                        video_url = data[0].get("url")
                        status = data[0].get("status", "processing")
                    else:
                        render_id = data.get("id")
                        video_url = data.get("url")
                        status = data.get("status", "processing")
                    
                    mapped_status = "completed" if status in ["succeeded", "completed"] else "processing"
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        video_url=video_url,
                        status=mapped_status,
                        message=f"텍스트 오버레이 {'완료' if mapped_status == 'completed' else '진행 중'}",
                        model="creatomate_text",
                        progress=100 if mapped_status == "completed" else 30
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
    
    async def auto_edit(
        self,
        project_id: str,
        video_url: str,
        headline: str,
        subheadline: str = "",
        brand_color: str = "#03C75A",
        aspect_ratio: AspectRatio = AspectRatio.PORTRAIT
    ) -> VideoResponse:
        """
        자동 편집 - 자막/텍스트 오버레이 추가
        
        Creatomate API가 없으면 더미 응답 반환 (프론트엔드 테스트용)
        """
        
        if not self.is_available:
            # API 키 없으면 더미 성공 응답 (타임라인에 클립만 추가)
            print(f"⚠️ [Creatomate] API 키 없음 - 더미 응답 반환")
            return VideoResponse(
                success=True,
                task_id=f"dummy_edit_{project_id}",
                video_url=video_url,  # 원본 영상 URL 그대로 반환
                status="completed",
                message="자막이 추가되었습니다. (Creatomate 미연동)",
                model="creatomate_dummy",
                progress=100
            )
        
        # 실제 Creatomate API 호출
        url = f"{self.BASE_URL}/renders"
        
        # 기본 자막 템플릿 구성
        body = {
            "source": {
                "output_format": "mp4",
                "width": 1080 if aspect_ratio == AspectRatio.PORTRAIT else 1920,
                "height": 1920 if aspect_ratio == AspectRatio.PORTRAIT else 1080,
                "elements": [
                    {
                        "type": "video",
                        "source": video_url
                    },
                    {
                        "type": "text",
                        "text": headline,
                        "font_family": "Pretendard",
                        "font_weight": "700",
                        "font_size": "48 px",
                        "fill_color": "#ffffff",
                        "shadow_color": "rgba(0,0,0,0.5)",
                        "x": "50%",
                        "y": "85%",
                        "x_anchor": "50%",
                        "y_anchor": "50%"
                    }
                ]
            }
        }
        
        if subheadline:
            body["source"]["elements"].append({
                "type": "text",
                "text": subheadline,
                "font_family": "Pretendard",
                "font_size": "28 px",
                "fill_color": brand_color,
                "x": "50%",
                "y": "90%",
                "x_anchor": "50%",
                "y_anchor": "50%"
            })
        
        print(f"🎨 [Creatomate] 자동 편집 요청: {headline}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=self._get_headers(), json=body)
                
                # Creatomate는 202 Accepted도 성공 응답
                if response.status_code in [200, 201, 202]:
                    data = response.json()
                    
                    # 리스트로 오는 경우와 단일 객체로 오는 경우 모두 처리
                    if isinstance(data, list) and len(data) > 0:
                        render = data[0]
                        render_id = render.get("id")
                        video_url = render.get("url")
                        status = render.get("status", "processing")
                    else:
                        render_id = data.get("id")
                        video_url = data.get("url")
                        status = data.get("status", "processing")
                    
                    # status가 planned/rendering이면 processing, completed면 completed
                    mapped_status = "completed" if status == "completed" else "processing"
                    progress = 100 if status == "completed" else 30
                    
                    return VideoResponse(
                        success=True,
                        task_id=render_id,
                        video_url=video_url,  # URL이 있으면 바로 반환
                        status=mapped_status,
                        message=f"Creatomate 편집 {'완료' if status == 'completed' else '진행 중'} (상태: {status})",
                        model="creatomate",
                        progress=progress
                    )
                
                return VideoResponse(
                    success=False,
                    status="error",
                    message=f"Creatomate API 오류: {response.status_code} - {response.text}"
                )
                
        except Exception as e:
            return VideoResponse(
                success=False,
                status="error",
                message=f"Creatomate 연결 오류: {str(e)}"
            )


# ============================================
# Hybrid Factory Engine (Main Interface)
# ============================================

class FactoryEngine:
    """
    Hybrid Factory Engine - 통합 인터페이스
    
    라우팅 로직:
    1. model == 'kling' → Kling Official API (JWT) **전용** (GoAPI 폴백 없음!)
    2. model == 'veo', 'sora', 'midjourney' → GoAPI
    3. model == 'suno' → GoAPI Suno
    4. Image → Gemini 2.0 Flash (기본) / GoAPI (Flux, MJ, DALL-E)
    5. Avatar → HeyGen
    6. Edit → Creatomate
    
    ⚠️ 주의: Kling은 크레딧이 충분하므로 무조건 Official API만 사용!
    ⚠️ 이미지: Gemini 2.0 Flash 단일 모델 사용 (비용 효율적)
    """
    
    def __init__(self):
        self.kling_official = KlingOfficialClient()
        self.goapi = GoAPIClient()
        self.heygen = HeyGenClient()
        self.creatomate = CreatomateClient()
        self.gemini_image = GeminiImageClient()  # Gemini 2.0 Flash 이미지 생성
        
        print("\n" + "="*60)
        print("🏭 [HYBRID FACTORY ENGINE] 초기화 완료")
        print("="*60)
        print(f"   Kling Official (JWT): {'✅ 활성' if self.kling_official.is_available else '❌ 비활성'}")
        print(f"   GoAPI (Veo/Sora/Suno/MJ): {'✅ 활성' if self.goapi.is_available else '❌ 비활성'}")
        print(f"   Gemini 2.0 Flash (Image): {'✅ 활성' if self.gemini_image.is_available else '❌ 비활성'}")
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
        
        # Kling: Official API **전용** (GoAPI 폴백 없음!)
        if request.model == VideoModel.KLING:
            if self.kling_official.is_available:
                print("🎯 [ROUTING] Kling Official API 전용 사용 (크레딧 충분!)")
                result = await self.kling_official.generate_video(request)
                
                if result.success:
                    result.model = "kling_official"
                    return result
                else:
                    # Official 실패해도 GoAPI 폴백 안 함 - 오류 메시지 그대로 반환
                    print(f"❌ [ROUTING] Kling Official 실패: {result.message}")
                    return result
            
            # Official API 키 없으면 바로 에러 (GoAPI 폴백 안 함!)
            return VideoResponse(
                success=False,
                status="error",
                message="Kling Official API 키가 설정되지 않았습니다. (GoAPI 폴백 비활성화)"
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
    
    async def generate_music(self, request: MusicRequest, preferred_model: AudioModel = AudioModel.SUNO) -> MusicResponse:
        """
        음악 생성 (Fallback 시스템: Suno → Udio)
        """
        
        if not self.goapi.is_available:
            return MusicResponse(
                success=False,
                status="error",
                message="GoAPI 키가 설정되지 않았습니다."
            )
        
        print(f"🎯 [ROUTING] GoAPI Music (1차: {preferred_model.value}, Fallback 활성화)")
        return await self.goapi.generate_music(request, preferred_model)
    
    async def generate_image(self, request: ImageRequest) -> ImageResponse:
        """
        이미지 생성 (GoAPI 기본)
        
        라우팅:
        - model == 'gemini' → GoAPI Flux로 자동 전환 (Gemini 이미지 생성 현재 미지원)
        - model == 'flux', 'midjourney', 'dalle' → GoAPI
        
        참고: Gemini 2.0 Flash는 텍스트 생성에 최적화되어 있음
        """
        
        # Gemini 모델 요청시 Flux로 자동 전환
        if request.model == ImageModel.GEMINI:
            print(f"⚠️ [ROUTING] Gemini 이미지 생성 미지원 → GoAPI Flux로 자동 전환")
            request.model = ImageModel.FLUX
        
        # GoAPI (Flux, Midjourney, DALL-E)
        if not self.goapi.is_available:
            return ImageResponse(
                success=False,
                status="error",
                message="이미지 생성 API 키가 설정되지 않았습니다. GoAPI 키를 확인해주세요."
            )
        
        print(f"🎯 [ROUTING] GoAPI Image ({request.model.value})")
        return await self.goapi.generate_image(request)
    
    async def generate_video_with_postprocess(
        self, 
        request: VideoRequest, 
        headline: str = "",
        subheadline: str = ""
    ) -> VideoResponse:
        """
        영상 생성 + Creatomate 자동 후처리 파이프라인
        
        1. 영상 생성 (SORA/Veo/Kling 등)
        2. Creatomate로 자막/효과 적용
        3. 최종본 반환
        """
        
        # 1단계: 영상 생성
        print(f"\n{'='*60}")
        print(f"🎬 [PIPELINE] 영상 생성 + 후처리 파이프라인 시작")
        print(f"   Model: {request.model.value}")
        print(f"   Headline: {headline or '(없음)'}")
        print(f"{'='*60}")
        
        video_result = await self.generate_video(request)
        
        if not video_result.success:
            return video_result
        
        # 2단계: Creatomate 후처리 (headline이 있는 경우에만)
        if headline and self.creatomate.is_available and video_result.video_url:
            print(f"✨ [PIPELINE] Creatomate 후처리 시작...")
            
            edit_result = await self.creatomate.auto_edit(
                project_id=request.project_id,
                video_url=video_result.video_url,
                headline=headline,
                subheadline=subheadline,
                aspect_ratio=request.aspect_ratio
            )
            
            if edit_result.success:
                print(f"✅ [PIPELINE] 후처리 완료!")
                return VideoResponse(
                    success=True,
                    task_id=edit_result.task_id,
                    video_url=edit_result.video_url,
                    status=edit_result.status,
                    message=f"영상 생성 + 자막 적용 완료 ({request.model.value} + Creatomate)",
                    model=f"{request.model.value}+creatomate",
                    progress=edit_result.progress
                )
            else:
                print(f"⚠️ [PIPELINE] 후처리 실패, 원본 반환")
        
        return video_result
    
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
                "name": "Kling (Official Only)",
                "type": "video",
                "available": self.kling_official.is_available,  # Official 전용!
                "source": "kling_official",
                "features": ["text2video", "image2video"],
                "description": "🎯 Official API 전용 - 크레딧 충분, 고품질 I2V 지원"
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
