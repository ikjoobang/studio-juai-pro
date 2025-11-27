"""
Studio Juai PRO - AI Director Orchestration
============================================
[핵심 엔진] 상황에 맞게 툴을 골라 쓰는 '판단 로직'

Smart Routing:
- 리얼리즘/액션 → Google Veo 3.1
- 인물/제품 일관성 → Midjourney + Kling
- 정보 전달/뉴스 → HeyGen Avatar
- 시네마틱 배경 → Sora 2

Prompt Engineering:
- Gemini로 각 툴에 최적화된 프롬프트 생성
"""

import os
import json
import httpx
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import google.generativeai as genai

# ============================================
# Enums & Data Classes
# ============================================

class IntentCategory(Enum):
    """사용자 의도 카테고리"""
    REALISM_ACTION = "realism_action"      # 자동차, 스포츠, 추격
    CHARACTER_PRODUCT = "character_product" # 룩북, 쇼핑몰, 인물
    INFORMATIONAL = "informational"         # 리포터, 강의, 뉴스
    CINEMATIC = "cinematic"                 # 영화, 인트로, 배경
    MUSIC_AUDIO = "music_audio"             # BGM, 효과음
    UNKNOWN = "unknown"


class ToolType(Enum):
    """AI 툴 타입"""
    VEO = "veo"           # Google Veo 3.1 - 리얼리즘
    KLING = "kling"       # Kling - 범용 영상
    SORA = "sora"         # Sora 2 - 시네마틱
    MIDJOURNEY = "midjourney"  # 이미지 생성
    HEYGEN = "heygen"     # AI 아바타
    SUNO = "suno"         # 음악 생성
    CREATOMATE = "creatomate"  # 영상 편집


@dataclass
class RoutingDecision:
    """라우팅 결정 결과"""
    intent: IntentCategory
    primary_tool: ToolType
    secondary_tool: Optional[ToolType] = None
    confidence: float = 0.0
    reasoning: str = ""
    optimized_prompt: str = ""
    tool_specific_params: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.tool_specific_params is None:
            self.tool_specific_params = {}


@dataclass
class DirectorAnalysis:
    """Director 분석 결과"""
    user_input: str
    detected_keywords: List[str]
    intent_scores: Dict[str, float]
    final_decision: RoutingDecision
    prompt_variations: Dict[str, str]
    timestamp: str


# ============================================
# AI Director Engine
# ============================================

class AIDirector:
    """
    AI Director - 무인 영상 제작 공장의 두뇌
    사용자의 의도를 파악하고 최적의 AI 툴을 자동 배정
    """
    
    # 의도 감지를 위한 키워드 매핑
    INTENT_KEYWORDS = {
        IntentCategory.REALISM_ACTION: [
            "자동차", "car", "racing", "레이싱", "스포츠", "sports", "추격",
            "chase", "액션", "action", "드론", "drone", "fpv", "물리",
            "physics", "폭발", "explosion", "속도", "speed", "질주"
        ],
        IntentCategory.CHARACTER_PRODUCT: [
            "인물", "character", "person", "모델", "model", "룩북", "lookbook",
            "쇼핑몰", "shopping", "제품", "product", "패션", "fashion",
            "일관성", "consistent", "동일", "same", "캐릭터", "얼굴", "face"
        ],
        IntentCategory.INFORMATIONAL: [
            "리포터", "reporter", "뉴스", "news", "강의", "lecture", "설명",
            "explanation", "아바타", "avatar", "대변인", "spokesperson",
            "발표", "presentation", "안내", "guide", "정보", "information"
        ],
        IntentCategory.CINEMATIC: [
            "영화", "movie", "film", "시네마틱", "cinematic", "인트로", "intro",
            "배경", "background", "풍경", "landscape", "4k", "8k", "epic",
            "dramatic", "스토리", "story", "장면", "scene"
        ],
        IntentCategory.MUSIC_AUDIO: [
            "음악", "music", "bgm", "배경음악", "효과음", "sound", "audio",
            "멜로디", "melody", "비트", "beat", "instrumental"
        ]
    }
    
    # 툴별 최적화 프롬프트 템플릿
    PROMPT_TEMPLATES = {
        ToolType.VEO: {
            "prefix": "",
            "suffix": ", photorealistic, highly detailed, natural lighting, 4K quality",
            "camera_hints": ["Drone view", "FPV shot", "tracking shot", "slow motion", "motion blur"],
            "style": "cinematic realism"
        },
        ToolType.KLING: {
            "prefix": "",
            "suffix": ", shot on iPhone 15 Pro, natural lighting, cinematic grain, 4K quality",
            "camera_hints": ["handheld", "steady cam", "dolly shot"],
            "style": "professional video"
        },
        ToolType.SORA: {
            "prefix": "",
            "suffix": ", cinematic, dramatic lighting, film grain, anamorphic lens, 4K HDR",
            "camera_hints": ["crane shot", "establishing shot", "wide angle", "long take"],
            "style": "hollywood cinematic"
        },
        ToolType.MIDJOURNEY: {
            "prefix": "",
            "suffix": ", studio lighting, 8k, --ar 9:16 --v 6.1 --stylize 750",
            "style": "photographic"
        },
        ToolType.HEYGEN: {
            "prefix": "Professional presenter speaking: ",
            "suffix": "",
            "style": "broadcast quality"
        },
        ToolType.SUNO: {
            "prefix": "Instrumental only, ",
            "suffix": ", high fidelity, professional mix",
            "style": "production music"
        }
    }
    
    def __init__(self):
        """Initialize AI Director with Gemini"""
        self.gemini_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        self.model = None
        
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
            print("✅ [AI Director] Gemini 1.5 Pro 초기화 완료")
        else:
            print("⚠️ [AI Director] Gemini API 키 없음 - 규칙 기반 모드")
    
    async def analyze_intent(self, user_input: str, context: Optional[Dict] = None) -> DirectorAnalysis:
        """
        사용자 의도 분석 및 최적 툴 결정
        
        Args:
            user_input: 사용자 입력 텍스트
            context: 추가 컨텍스트 (이전 대화, 프로젝트 설정 등)
        
        Returns:
            DirectorAnalysis: 분석 결과 및 라우팅 결정
        """
        
        # 1. 키워드 기반 의도 점수 계산
        intent_scores = self._calculate_intent_scores(user_input)
        detected_keywords = self._extract_keywords(user_input)
        
        # 2. Gemini로 정교한 분석 (가능한 경우)
        if self.model:
            gemini_analysis = await self._gemini_analyze(user_input, context)
            # Gemini 결과와 키워드 결과 병합
            intent_scores = self._merge_scores(intent_scores, gemini_analysis.get("scores", {}))
        
        # 3. 최종 의도 결정
        final_intent = max(intent_scores, key=intent_scores.get)
        confidence = intent_scores[final_intent]
        
        # 4. 툴 라우팅
        routing = self._route_to_tool(IntentCategory(final_intent), user_input, confidence)
        
        # 5. 프롬프트 최적화
        prompt_variations = self._generate_prompt_variations(user_input, routing)
        routing.optimized_prompt = prompt_variations.get(routing.primary_tool.value, user_input)
        
        return DirectorAnalysis(
            user_input=user_input,
            detected_keywords=detected_keywords,
            intent_scores=intent_scores,
            final_decision=routing,
            prompt_variations=prompt_variations,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def _calculate_intent_scores(self, text: str) -> Dict[str, float]:
        """키워드 기반 의도 점수 계산"""
        text_lower = text.lower()
        scores = {category.value: 0.0 for category in IntentCategory}
        
        for category, keywords in self.INTENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    scores[category.value] += 1.0
        
        # 정규화
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores[IntentCategory.CINEMATIC.value] = 1.0  # 기본값
        
        return scores
    
    def _extract_keywords(self, text: str) -> List[str]:
        """텍스트에서 키워드 추출"""
        text_lower = text.lower()
        found = []
        
        for keywords in self.INTENT_KEYWORDS.values():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    found.append(keyword)
        
        return list(set(found))
    
    async def _gemini_analyze(self, user_input: str, context: Optional[Dict]) -> Dict:
        """Gemini로 정교한 의도 분석"""
        try:
            prompt = f"""당신은 영상 제작 AI Director입니다. 
사용자의 요청을 분석하여 최적의 AI 툴을 결정해야 합니다.

[사용자 요청]
{user_input}

[사용 가능한 툴]
1. VEO: 리얼리즘, 물리 법칙, 자동차, 스포츠, 액션
2. KLING: 범용 영상, 일반적인 콘텐츠
3. SORA: 시네마틱, 영화적 배경, 드라마틱
4. MIDJOURNEY: 이미지 생성, 캐릭터 디자인
5. HEYGEN: AI 아바타, 발표자, 뉴스 리포터
6. SUNO: 음악, BGM, 효과음

[응답 형식 - JSON만 출력]
{{
  "primary_tool": "VEO|KLING|SORA|MIDJOURNEY|HEYGEN|SUNO",
  "secondary_tool": "null 또는 툴명",
  "intent": "realism_action|character_product|informational|cinematic|music_audio",
  "confidence": 0.0-1.0,
  "reasoning": "선택 이유 한 줄"
}}"""

            response = self.model.generate_content(prompt)
            
            # JSON 추출
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            
            return json.loads(text.strip())
            
        except Exception as e:
            print(f"⚠️ [Gemini Analysis] 오류: {e}")
            return {}
    
    def _merge_scores(self, keyword_scores: Dict, gemini_result: Dict) -> Dict:
        """키워드 점수와 Gemini 결과 병합"""
        if not gemini_result:
            return keyword_scores
        
        gemini_intent = gemini_result.get("intent", "")
        gemini_confidence = gemini_result.get("confidence", 0.5)
        
        if gemini_intent in keyword_scores:
            # Gemini 결과에 가중치 부여 (70%)
            for key in keyword_scores:
                if key == gemini_intent:
                    keyword_scores[key] = keyword_scores[key] * 0.3 + gemini_confidence * 0.7
                else:
                    keyword_scores[key] = keyword_scores[key] * 0.3
        
        return keyword_scores
    
    def _route_to_tool(self, intent: IntentCategory, user_input: str, confidence: float) -> RoutingDecision:
        """
        의도에 따른 툴 라우팅
        
        GoAPI 2024 지원 모델:
        - Kling: text-to-video ✅
        - Veo3.1: image-to-video (이미지 필수) 
        - Sora2: text-to-video ✅
        - Hailuo: text-to-video ✅
        - Luma: text-to-video ✅
        
        ⚠️ Veo3.1은 이미지가 필요하므로 text-to-video인 경우 Kling 사용
        """
        
        # Text-to-video 전용 라우팅 맵
        # Veo3.1은 image-to-video이므로 text 요청시 Kling 사용
        routing_map = {
            IntentCategory.REALISM_ACTION: (ToolType.KLING, None, "액션/리얼리즘 - Kling 고품질 text-to-video"),
            IntentCategory.CHARACTER_PRODUCT: (ToolType.KLING, ToolType.MIDJOURNEY, "인물/제품 일관성 - 이미지 생성 후 영상화"),
            IntentCategory.INFORMATIONAL: (ToolType.HEYGEN, None, "정보 전달 - 스크립트 기반 아바타"),
            IntentCategory.CINEMATIC: (ToolType.SORA, None, "시네마틱 - Sora2 영화적 표현"),
            IntentCategory.MUSIC_AUDIO: (ToolType.SUNO, None, "음악/BGM 생성"),
            IntentCategory.UNKNOWN: (ToolType.KLING, None, "기본 영상 생성 - Kling")
        }
        
        primary, secondary, reasoning = routing_map.get(
            intent, 
            (ToolType.KLING, None, "기본값")
        )
        
        return RoutingDecision(
            intent=intent,
            primary_tool=primary,
            secondary_tool=secondary,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def _generate_prompt_variations(self, user_input: str, routing: RoutingDecision) -> Dict[str, str]:
        """각 툴에 최적화된 프롬프트 생성"""
        variations = {}
        
        for tool_type in [routing.primary_tool, routing.secondary_tool]:
            if tool_type is None:
                continue
            
            template = self.PROMPT_TEMPLATES.get(tool_type, {})
            prefix = template.get("prefix", "")
            suffix = template.get("suffix", "")
            
            # 카메라 힌트 추가 (영상 툴)
            camera_hints = template.get("camera_hints", [])
            hint = ""
            if camera_hints and tool_type in [ToolType.VEO, ToolType.SORA, ToolType.KLING]:
                hint = f", {camera_hints[0]}"
            
            optimized = f"{prefix}{user_input}{hint}{suffix}"
            variations[tool_type.value] = optimized
        
        return variations
    
    async def optimize_prompt_for_tool(self, prompt: str, tool: ToolType) -> str:
        """특정 툴에 최적화된 프롬프트 생성 (Gemini 활용)"""
        
        if not self.model:
            # Gemini 없으면 템플릿 기반
            template = self.PROMPT_TEMPLATES.get(tool, {})
            return f"{template.get('prefix', '')}{prompt}{template.get('suffix', '')}"
        
        tool_instructions = {
            ToolType.VEO: "Google Veo용 프롬프트. 카메라 무빙(Drone view, FPV shot, tracking shot)과 물리적 디테일 강조.",
            ToolType.SORA: "OpenAI Sora용 프롬프트. 시네마틱, 영화적 표현, 긴 호흡의 장면 묘사.",
            ToolType.KLING: "Kling용 프롬프트. iPhone 촬영 스타일, 자연스러운 조명, 4K 품질.",
            ToolType.MIDJOURNEY: "Midjourney용 프롬프트. 반드시 --ar, --v, --stylize 파라미터 포함. studio lighting, 8k 품질.",
            ToolType.HEYGEN: "HeyGen 아바타용 스크립트. 자연스러운 발화, 전문적인 톤.",
            ToolType.SUNO: "Suno 음악용 프롬프트. 장르, BPM, 분위기 명시. Instrumental only."
        }
        
        try:
            gemini_prompt = f"""다음 프롬프트를 {tool.value.upper()}에 최적화해주세요.

[원본 프롬프트]
{prompt}

[최적화 지침]
{tool_instructions.get(tool, "고품질 결과를 위한 최적화")}

[응답]
최적화된 프롬프트만 출력하세요. 설명 없이 프롬프트 텍스트만."""

            response = self.model.generate_content(gemini_prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"⚠️ [Prompt Optimization] 오류: {e}")
            template = self.PROMPT_TEMPLATES.get(tool, {})
            return f"{template.get('prefix', '')}{prompt}{template.get('suffix', '')}"
    
    async def generate_script_for_avatar(self, topic: str, style: str = "professional") -> str:
        """HeyGen 아바타용 스크립트 생성"""
        
        if not self.model:
            return f"안녕하세요. {topic}에 대해 설명드리겠습니다."
        
        try:
            prompt = f"""다음 주제에 대한 AI 아바타 발표 스크립트를 작성해주세요.

[주제] {topic}
[스타일] {style}
[요구사항]
- 30초~1분 분량
- 자연스러운 발화
- 전문적이지만 친근한 톤
- 명확한 정보 전달

[스크립트]"""

            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"⚠️ [Script Generation] 오류: {e}")
            return f"안녕하세요. 오늘은 {topic}에 대해 알아보겠습니다."
    
    async def suggest_bgm_prompt(self, video_description: str, mood: str = "auto") -> str:
        """영상에 어울리는 BGM 프롬프트 제안"""
        
        if not self.model:
            return f"Instrumental only, cinematic, {mood}, high fidelity"
        
        try:
            prompt = f"""다음 영상에 어울리는 BGM 프롬프트를 Suno AI용으로 작성해주세요.

[영상 설명] {video_description}
[원하는 분위기] {mood if mood != "auto" else "영상에 맞게 자동 선택"}

[응답 형식]
Instrumental only, [장르], [BPM 범위], [분위기 키워드], high fidelity

프롬프트만 출력하세요."""

            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"⚠️ [BGM Suggestion] 오류: {e}")
            return f"Instrumental only, cinematic, 90-120 BPM, {mood}, high fidelity"


# ============================================
# Singleton Instance
# ============================================

_director_instance = None

def get_director() -> AIDirector:
    """AI Director 싱글톤 인스턴스"""
    global _director_instance
    if _director_instance is None:
        _director_instance = AIDirector()
    return _director_instance
