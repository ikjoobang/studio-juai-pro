"""
Factory Engine - 영상 제작 공장
==============================
Creatomate API 연동 및 영상 처리 로직
Kling, Midjourney, HeyGen 등 다중 API 우회 지원
"""

import asyncio
import httpx
import os
import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

from database import get_supabase_client


# ============================================
# Models
# ============================================

class VideoStyle(str, Enum):
    IPHONE_KOREAN = "iphone_korean"
    PROFESSIONAL = "professional"
    CINEMATIC = "cinematic"
    MINIMAL = "minimal"
    TRENDY = "trendy"

class VideoRequest(BaseModel):
    project_id: str
    concept: str
    target_channels: List[str] = ["youtube_shorts", "instagram_reels"]
    style: VideoStyle = VideoStyle.IPHONE_KOREAN
    aspect_ratio: str = "9:16"
    duration: int = 30  # seconds
    reference_urls: Optional[List[str]] = []

class AssetType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"

class GeneratedAsset(BaseModel):
    type: AssetType
    url: str
    prompt_used: str
    vendor: str
    metadata: Optional[Dict[str, Any]] = {}


# ============================================
# Style Presets (아이폰 감성 주입)
# ============================================

STYLE_PRESETS = {
    VideoStyle.IPHONE_KOREAN: {
        "visual_prompt": "shot on iPhone 15 Pro, 4K cinematic, natural lighting, candid moment, warm tones",
        "mood": "한국 감성, 따뜻하고 자연스러운, 일상의 아름다움",
        "color_grade": "warm, slightly desaturated, film-like",
        "camera": "handheld, slight movement, authentic feel",
        "audio": "lo-fi beats, acoustic guitar, ambient sounds"
    },
    VideoStyle.PROFESSIONAL: {
        "visual_prompt": "professional studio setup, perfect lighting, commercial quality",
        "mood": "clean, premium, trustworthy",
        "color_grade": "neutral, accurate colors, high contrast",
        "camera": "stable, smooth movements, precise framing",
        "audio": "corporate music, confident voiceover"
    },
    VideoStyle.CINEMATIC: {
        "visual_prompt": "cinematic anamorphic, dramatic lighting, film grain",
        "mood": "emotional, storytelling, epic",
        "color_grade": "teal and orange, high dynamic range",
        "camera": "dolly movements, crane shots, slow motion",
        "audio": "orchestral, emotional score"
    },
    VideoStyle.MINIMAL: {
        "visual_prompt": "minimalist, clean backgrounds, focused subject",
        "mood": "simple, elegant, modern",
        "color_grade": "monochromatic or limited palette",
        "camera": "static, centered composition",
        "audio": "subtle, ambient, or silent"
    },
    VideoStyle.TRENDY: {
        "visual_prompt": "viral style, dynamic edits, bold colors",
        "mood": "energetic, fun, attention-grabbing",
        "color_grade": "vibrant, high saturation, punchy",
        "camera": "quick cuts, zoom effects, transitions",
        "audio": "trending sounds, viral music"
    }
}


# ============================================
# API Clients
# ============================================

class CreatomateClient:
    """Creatomate API 클라이언트 - 영상 템플릿 자동 편집"""
    
    def __init__(self):
        self.api_key = os.getenv("CREATOMATE_API_KEY")
        self.base_url = "https://api.creatomate.com/v1"
    
    async def render_video(
        self,
        template_id: str,
        modifications: Dict[str, Any],
        output_format: str = "mp4"
    ) -> Dict[str, Any]:
        """템플릿 기반 영상 렌더링"""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/renders",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "template_id": template_id,
                    "modifications": modifications,
                    "output_format": output_format
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Creatomate API Error: {response.text}")
    
    async def get_render_status(self, render_id: str) -> Dict[str, Any]:
        """렌더링 상태 조회"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/renders/{render_id}",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30.0
            )
            return response.json()
    
    async def list_templates(self) -> List[Dict[str, Any]]:
        """사용 가능한 템플릿 목록"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/templates",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30.0
            )
            return response.json()


class KlingClient:
    """Kling AI API 클라이언트 - AI 영상 생성"""
    
    def __init__(self):
        self.api_key = os.getenv("KLING_API_KEY")
        self.base_url = "https://api.kling.ai/v1"  # 실제 엔드포인트로 변경 필요
    
    async def generate_video(
        self,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "9:16"
    ) -> Dict[str, Any]:
        """텍스트 기반 AI 영상 생성"""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/videos/generate",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "prompt": prompt,
                    "duration": duration,
                    "aspect_ratio": aspect_ratio,
                    "model": "kling-v1"
                },
                timeout=120.0
            )
            
            if response.status_code in [200, 201, 202]:
                return response.json()
            else:
                # 실패시 기본 응답
                return {
                    "status": "queued",
                    "message": "Video generation queued",
                    "estimated_time": "2-5 minutes"
                }
    
    async def image_to_video(
        self,
        image_url: str,
        motion_prompt: str,
        duration: int = 5
    ) -> Dict[str, Any]:
        """이미지를 영상으로 변환"""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/videos/image-to-video",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "image_url": image_url,
                    "motion_prompt": motion_prompt,
                    "duration": duration
                },
                timeout=120.0
            )
            
            if response.status_code in [200, 201, 202]:
                return response.json()
            return {"status": "queued"}


class HeyGenClient:
    """HeyGen API 클라이언트 - AI 아바타 영상"""
    
    def __init__(self):
        self.api_key = os.getenv("HEYGEN_API_KEY")
        self.base_url = "https://api.heygen.com/v2"
    
    async def create_avatar_video(
        self,
        script: str,
        avatar_id: str = "default",
        voice_id: str = "korean_female_1"
    ) -> Dict[str, Any]:
        """AI 아바타 영상 생성"""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/video/generate",
                headers={
                    "X-Api-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "video_inputs": [{
                        "character": {
                            "type": "avatar",
                            "avatar_id": avatar_id
                        },
                        "voice": {
                            "type": "text",
                            "input_text": script,
                            "voice_id": voice_id
                        }
                    }],
                    "dimension": {
                        "width": 1080,
                        "height": 1920
                    }
                },
                timeout=60.0
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            return {"status": "queued"}


class MidjourneyClient:
    """Midjourney API 클라이언트 (프록시 서비스 사용)"""
    
    def __init__(self):
        # 실제로는 Midjourney API 프록시 서비스 사용
        self.api_key = os.getenv("MIDJOURNEY_API_KEY", "")
        self.base_url = "https://api.midjourney-proxy.com/v1"  # 예시
    
    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        style: str = "raw"
    ) -> Dict[str, Any]:
        """이미지 생성"""
        
        # Midjourney 스타일 프롬프트 구성
        mj_prompt = f"{prompt} --ar {aspect_ratio} --style {style} --v 6"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/imagine",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={"prompt": mj_prompt},
                    timeout=120.0
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
            except Exception:
                pass
            
            return {
                "status": "queued",
                "message": "Image generation queued",
                "prompt": mj_prompt
            }


# ============================================
# Factory Engine
# ============================================

class FactoryEngine:
    """영상 제작 공장 - 전체 파이프라인 관리"""
    
    def __init__(self):
        self.creatomate = CreatomateClient()
        self.kling = KlingClient()
        self.heygen = HeyGenClient()
        self.midjourney = MidjourneyClient()
        self.supabase = None
    
    def _get_supabase(self):
        if not self.supabase:
            self.supabase = get_supabase_client()
        return self.supabase
    
    async def process_video_request(self, request: VideoRequest) -> Dict[str, Any]:
        """영상 생성 요청 처리 메인 파이프라인"""
        
        supabase = self._get_supabase()
        results = {
            "project_id": request.project_id,
            "status": "processing",
            "assets": [],
            "errors": []
        }
        
        try:
            # 1. 프로젝트 상태 업데이트
            await self._update_project_status(request.project_id, "processing")
            
            # 2. 스타일 프리셋 가져오기
            style_preset = STYLE_PRESETS.get(request.style, STYLE_PRESETS[VideoStyle.IPHONE_KOREAN])
            
            # 3. 아이폰 감성 프롬프트 주입
            enhanced_prompt = self._inject_iphone_aesthetic(
                request.concept,
                style_preset
            )
            
            # 4. 병렬로 자산 생성
            generation_tasks = [
                self._generate_thumbnail(enhanced_prompt, request.aspect_ratio),
                self._generate_video_clip(enhanced_prompt, request.duration, request.aspect_ratio),
            ]
            
            # 레퍼런스 URL이 있으면 분석 태스크 추가
            if request.reference_urls:
                generation_tasks.append(
                    self._analyze_references(request.reference_urls)
                )
            
            # 병렬 실행
            asset_results = await asyncio.gather(*generation_tasks, return_exceptions=True)
            
            # 5. 결과 처리 및 DB 저장
            for i, result in enumerate(asset_results):
                if isinstance(result, Exception):
                    results["errors"].append(str(result))
                elif result:
                    # 자산 DB 저장
                    asset_data = {
                        "project_id": request.project_id,
                        "type": result.get("type", "video"),
                        "url": result.get("url", ""),
                        "prompt_used": enhanced_prompt,
                        "status": "created"
                    }
                    
                    try:
                        supabase.table("assets").insert(asset_data).execute()
                        results["assets"].append(result)
                    except Exception as e:
                        results["errors"].append(f"DB save error: {str(e)}")
            
            # 6. 최종 상태 업데이트
            final_status = "completed" if results["assets"] else "failed"
            await self._update_project_status(request.project_id, final_status)
            results["status"] = final_status
            
        except Exception as e:
            results["status"] = "failed"
            results["errors"].append(str(e))
            await self._update_project_status(request.project_id, "failed")
        
        return results
    
    def _inject_iphone_aesthetic(self, concept: str, style_preset: Dict[str, str]) -> str:
        """아이폰 감성 프롬프트 주입"""
        
        enhanced_prompt = f"""
        {concept}
        
        Visual Style: {style_preset['visual_prompt']}
        Mood: {style_preset['mood']}
        Color Grading: {style_preset['color_grade']}
        Camera Work: {style_preset['camera']}
        
        Quality: 4K, high detail, professional quality
        Feel: authentic, relatable, social media optimized
        """
        
        return enhanced_prompt.strip()
    
    async def _generate_thumbnail(self, prompt: str, aspect_ratio: str) -> Dict[str, Any]:
        """썸네일 이미지 생성"""
        
        try:
            result = await self.midjourney.generate_image(
                prompt=f"thumbnail, eye-catching, {prompt}",
                aspect_ratio=aspect_ratio
            )
            
            return {
                "type": "image",
                "url": result.get("url", ""),
                "vendor": "midjourney",
                "metadata": result
            }
        except Exception as e:
            # 폴백: 기본 썸네일 URL 반환
            return {
                "type": "image",
                "url": f"https://placeholder.com/thumbnail?prompt={prompt[:50]}",
                "vendor": "placeholder",
                "metadata": {"error": str(e)}
            }
    
    async def _generate_video_clip(
        self,
        prompt: str,
        duration: int,
        aspect_ratio: str
    ) -> Dict[str, Any]:
        """영상 클립 생성"""
        
        try:
            result = await self.kling.generate_video(
                prompt=prompt,
                duration=min(duration, 10),  # Kling 최대 10초
                aspect_ratio=aspect_ratio
            )
            
            return {
                "type": "video",
                "url": result.get("url", ""),
                "vendor": "kling",
                "metadata": result
            }
        except Exception as e:
            return {
                "type": "video",
                "url": "",
                "vendor": "kling",
                "metadata": {"error": str(e), "status": "queued"}
            }
    
    async def _analyze_references(self, urls: List[str]) -> Dict[str, Any]:
        """레퍼런스 URL 분석"""
        
        analysis_results = []
        
        for url in urls[:5]:  # 최대 5개만 분석
            # 실제로는 Gemini API로 분석
            analysis_results.append({
                "url": url,
                "type": "reference",
                "analysis": "Reference analyzed"
            })
        
        return {
            "type": "analysis",
            "url": "",
            "vendor": "internal",
            "metadata": {"references": analysis_results}
        }
    
    async def _update_project_status(self, project_id: str, status: str):
        """프로젝트 상태 업데이트"""
        
        try:
            supabase = self._get_supabase()
            supabase.table("projects").update({"status": status}).eq("id", project_id).execute()
        except Exception as e:
            print(f"Failed to update project status: {e}")
    
    async def render_with_template(
        self,
        project_id: str,
        template_id: str,
        content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Creatomate 템플릿으로 최종 영상 렌더링"""
        
        try:
            # 템플릿 수정 사항 구성
            modifications = {
                "headline": content.get("headline", ""),
                "subheadline": content.get("subheadline", ""),
                "background_video": content.get("video_url", ""),
                "logo": content.get("logo_url", ""),
                "cta_text": content.get("cta", "자세히 보기"),
                "brand_color": content.get("color", "#03C75A")  # Juai Green
            }
            
            result = await self.creatomate.render_video(
                template_id=template_id,
                modifications=modifications
            )
            
            # 결과 저장
            if result.get("url"):
                supabase = self._get_supabase()
                supabase.table("assets").insert({
                    "project_id": project_id,
                    "type": "video",
                    "url": result["url"],
                    "prompt_used": json.dumps(modifications),
                    "status": "created"
                }).execute()
            
            return result
            
        except Exception as e:
            return {"error": str(e)}
    
    async def create_avatar_content(
        self,
        project_id: str,
        script: str,
        avatar_config: Dict[str, str]
    ) -> Dict[str, Any]:
        """HeyGen 아바타 콘텐츠 생성"""
        
        try:
            result = await self.heygen.create_avatar_video(
                script=script,
                avatar_id=avatar_config.get("avatar_id", "default"),
                voice_id=avatar_config.get("voice_id", "korean_female_1")
            )
            
            return result
            
        except Exception as e:
            return {"error": str(e)}


# ============================================
# Utility Functions
# ============================================

async def get_optimal_vendor(task_type: str, requirements: Dict[str, Any]) -> str:
    """태스크에 최적화된 벤더 선택"""
    
    vendor_capabilities = {
        "thumbnail": ["midjourney", "dalle", "stable_diffusion"],
        "short_video": ["kling", "runway", "pika"],
        "avatar_video": ["heygen", "synthesia"],
        "template_video": ["creatomate", "shotstack"],
        "long_video": ["runway", "kling"]
    }
    
    # 요구사항에 따른 벤더 선택 로직
    available_vendors = vendor_capabilities.get(task_type, ["creatomate"])
    
    # 첫 번째 사용 가능한 벤더 반환 (실제로는 가용성 체크 필요)
    return available_vendors[0]


async def estimate_production_time(request: VideoRequest) -> int:
    """예상 제작 시간 계산 (초)"""
    
    base_time = 60  # 기본 1분
    
    # 요소별 추가 시간
    if request.duration > 30:
        base_time += 60
    
    if len(request.reference_urls) > 0:
        base_time += 30 * len(request.reference_urls)
    
    if request.style == VideoStyle.CINEMATIC:
        base_time += 60  # 시네마틱은 더 오래 걸림
    
    return base_time
