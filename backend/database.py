"""
Database Connection - Supabase PostgreSQL
==========================================
Supabase 연결 설정 및 데이터베이스 유틸리티
"""

import os
from typing import Optional
from functools import lru_cache
from supabase import create_client, Client

# ============================================
# Supabase Client Configuration
# ============================================

class SupabaseClient:
    """Supabase 클라이언트 래퍼"""
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """싱글톤 Supabase 클라이언트 반환"""
        
        if cls._instance is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if not supabase_url or not supabase_key:
                raise ValueError(
                    "SUPABASE_URL and SUPABASE_KEY environment variables must be set"
                )
            
            cls._instance = create_client(supabase_url, supabase_key)
        
        return cls._instance
    
    @classmethod
    def reset_client(cls):
        """클라이언트 리셋 (테스트용)"""
        cls._instance = None


@lru_cache()
def get_supabase_client() -> Client:
    """캐시된 Supabase 클라이언트 반환"""
    return SupabaseClient.get_client()


# ============================================
# Database Helper Functions
# ============================================

class DatabaseHelper:
    """데이터베이스 헬퍼 클래스"""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # ---------- Projects ----------
    
    async def create_project(self, project_data: dict) -> dict:
        """프로젝트 생성"""
        result = self.client.table("projects").insert(project_data).execute()
        return result.data[0] if result.data else None
    
    async def get_project(self, project_id: str) -> dict:
        """프로젝트 조회"""
        result = self.client.table("projects").select("*").eq("id", project_id).execute()
        return result.data[0] if result.data else None
    
    async def get_user_projects(self, user_id: str, limit: int = 50) -> list:
        """사용자 프로젝트 목록"""
        result = (
            self.client.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    
    async def update_project(self, project_id: str, updates: dict) -> dict:
        """프로젝트 업데이트"""
        result = (
            self.client.table("projects")
            .update(updates)
            .eq("id", project_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def delete_project(self, project_id: str) -> bool:
        """프로젝트 삭제"""
        result = self.client.table("projects").delete().eq("id", project_id).execute()
        return len(result.data) > 0
    
    # ---------- Assets ----------
    
    async def create_asset(self, asset_data: dict) -> dict:
        """자산 생성"""
        result = self.client.table("assets").insert(asset_data).execute()
        return result.data[0] if result.data else None
    
    async def get_project_assets(self, project_id: str) -> list:
        """프로젝트 자산 목록"""
        result = (
            self.client.table("assets")
            .select("*")
            .eq("project_id", project_id)
            .execute()
        )
        return result.data
    
    async def update_asset(self, asset_id: str, updates: dict) -> dict:
        """자산 업데이트"""
        result = (
            self.client.table("assets")
            .update(updates)
            .eq("id", asset_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def delete_asset(self, asset_id: str) -> bool:
        """자산 삭제"""
        result = self.client.table("assets").delete().eq("id", asset_id).execute()
        return len(result.data) > 0
    
    # ---------- Vendors ----------
    
    async def get_active_vendors(self) -> list:
        """활성화된 벤더 목록"""
        result = (
            self.client.table("vendors")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        return result.data
    
    async def get_vendor(self, vendor_id: str) -> dict:
        """벤더 조회"""
        result = (
            self.client.table("vendors")
            .select("*")
            .eq("id", vendor_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def update_vendor(self, vendor_id: str, updates: dict) -> dict:
        """벤더 설정 업데이트"""
        result = (
            self.client.table("vendors")
            .update(updates)
            .eq("id", vendor_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    # ---------- Users (Auth) ----------
    
    async def get_user_profile(self, user_id: str) -> dict:
        """사용자 프로필 조회 (Supabase Auth 연동)"""
        result = (
            self.client.table("profiles")
            .select("*")
            .eq("id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def update_user_profile(self, user_id: str, updates: dict) -> dict:
        """사용자 프로필 업데이트"""
        result = (
            self.client.table("profiles")
            .update(updates)
            .eq("id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    
    # ---------- Analytics ----------
    
    async def log_user_action(self, user_id: str, action: str, metadata: dict = None):
        """사용자 행동 로깅"""
        log_data = {
            "user_id": user_id,
            "action": action,
            "metadata": metadata or {}
        }
        self.client.table("user_actions").insert(log_data).execute()
    
    async def get_user_analytics(self, user_id: str, days: int = 30) -> dict:
        """사용자 분석 데이터"""
        # 최근 N일 행동 데이터 조회
        result = (
            self.client.table("user_actions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )
        
        actions = result.data
        
        return {
            "total_actions": len(actions),
            "recent_actions": actions[:10],
            "action_summary": self._summarize_actions(actions)
        }
    
    def _summarize_actions(self, actions: list) -> dict:
        """행동 요약 생성"""
        summary = {}
        for action in actions:
            action_type = action.get("action", "unknown")
            summary[action_type] = summary.get(action_type, 0) + 1
        return summary


# ============================================
# Database Initialization
# ============================================

async def init_database():
    """데이터베이스 초기화 (테이블 생성 확인)"""
    
    client = get_supabase_client()
    
    # 테이블 존재 확인 (RPC 함수 호출)
    # 실제로는 Supabase 대시보드에서 SQL로 테이블 생성
    tables = ["projects", "assets", "vendors", "profiles", "user_actions"]
    
    for table in tables:
        try:
            result = client.table(table).select("id").limit(1).execute()
            print(f"✅ Table '{table}' exists")
        except Exception as e:
            print(f"❌ Table '{table}' check failed: {e}")
    
    return True


# ============================================
# Connection Test
# ============================================

async def test_connection():
    """데이터베이스 연결 테스트"""
    
    try:
        client = get_supabase_client()
        
        # 간단한 쿼리로 연결 확인
        result = client.table("projects").select("id").limit(1).execute()
        
        return {
            "status": "connected",
            "message": "Successfully connected to Supabase"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# ============================================
# Export
# ============================================

__all__ = [
    "get_supabase_client",
    "SupabaseClient", 
    "DatabaseHelper",
    "init_database",
    "test_connection"
]
