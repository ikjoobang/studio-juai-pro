-- ============================================
-- Studio Juai PRO - Supabase Database Schema
-- ============================================
-- 무인 영상 제작 공장 데이터베이스 스키마
-- Supabase (PostgreSQL) 기반

-- ============================================
-- 1. 프로젝트 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- 영상 설정
    aspect_ratio TEXT DEFAULT '9:16',
    preset TEXT DEFAULT 'warm_film',
    model TEXT DEFAULT 'auto',
    
    -- 상태
    status TEXT DEFAULT 'idle', -- idle, processing, completed, failed
    
    -- 생성된 영상
    video_url TEXT,
    thumbnail_url TEXT,
    duration FLOAT,
    
    -- 메타데이터
    task_id TEXT,
    routing_info JSONB,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);


-- ============================================
-- 2. 프롬프트 템플릿 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e-commerce, entertainment, informational, action
    
    -- 프롬프트 설정
    system_instruction TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    
    -- 기본 설정
    default_model TEXT DEFAULT 'kling',
    default_style TEXT DEFAULT 'warm_film',
    
    -- 메타데이터
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 템플릿 삽입
INSERT INTO prompt_templates (id, name, category, system_instruction, prompt_template, default_model, default_style)
VALUES 
    ('shopping_mall', '쇼핑몰용 프롬프트', 'e-commerce', 
     '제품의 특징을 부각시키고, 구매 욕구를 자극하는 영상을 만들어주세요. 깔끔한 배경, 제품 클로즈업, 사용 장면을 포함합니다.',
     '{product_name}, professional product video, studio lighting, white background, 360 degree rotation, close-up details, lifestyle usage scene',
     'kling', 'cool_modern'),
    
    ('movie_trailer', '영화/트레일러용 프롬프트', 'entertainment',
     '영화적 분위기와 드라마틱한 연출로 시청자의 감정을 자극하는 영상을 만들어주세요.',
     '{scene_description}, cinematic, dramatic lighting, anamorphic lens, film grain, epic atmosphere, hollywood quality',
     'sora', 'cinematic_teal_orange'),
    
    ('news_report', '뉴스/리포트용 프롬프트', 'informational',
     '전문적이고 신뢰감 있는 뉴스 리포터 스타일의 영상을 만들어주세요.',
     'Professional news presenter, {topic}, broadcast quality, studio setting, teleprompter style delivery',
     'heygen', 'cool_modern'),
    
    ('action_sports', '액션/스포츠용 프롬프트', 'action',
     '역동적인 움직임과 속도감을 강조하는 영상을 만들어주세요. 물리적으로 정확한 표현이 중요합니다.',
     '{action_description}, dynamic movement, high speed, motion blur, FPV shot, tracking shot, photorealistic physics',
     'veo', 'vibrant')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 3. 벤더 (API 서비스) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_env TEXT NOT NULL, -- 환경변수명
    model_type TEXT NOT NULL, -- video_generation, image_generation, avatar_generation, video_editing, ai_brain
    models TEXT[], -- 지원하는 모델 목록
    
    -- 설정
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- 우선순위 (높을수록 우선)
    
    -- 사용량 추적
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 벤더 삽입
INSERT INTO vendors (id, name, api_endpoint, api_key_env, model_type, models, priority)
VALUES 
    ('goapi', 'GoAPI (Universal)', 'https://api.goapi.ai/api/v1', 'GOAPI_KEY', 
     'video_generation', ARRAY['kling', 'veo', 'sora', 'hailuo', 'luma', 'midjourney'], 10),
    
    ('kling_official', 'Kling Official', 'https://api.klingai.com', 'KLING_ACCESS_KEY',
     'video_generation', ARRAY['kling'], 20),
    
    ('heygen', 'HeyGen', 'https://api.heygen.com', 'HEYGEN_API_KEY',
     'avatar_generation', ARRAY['heygen_avatar'], 10),
    
    ('creatomate', 'Creatomate', 'https://api.creatomate.com/v1', 'CREATOMATE_API_KEY',
     'video_editing', ARRAY['creatomate_editor'], 10),
    
    ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com', 'GOOGLE_GEMINI_API_KEY',
     'ai_brain', ARRAY['gemini-1.5-pro'], 10)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 4. 트렌드 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS trends (
    id SERIAL PRIMARY KEY,
    keyword TEXT NOT NULL UNIQUE,
    category TEXT, -- optional category
    
    -- 점수/인기도
    score FLOAT DEFAULT 0,
    
    -- 유효기간
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_trends_valid ON trends(valid_until) WHERE valid_until > NOW();


-- ============================================
-- 5. 생성 작업 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 외부 API 정보
    task_id TEXT, -- GoAPI/Kling 등의 task_id
    vendor TEXT NOT NULL, -- goapi, kling_official, heygen, creatomate
    model TEXT NOT NULL,
    
    -- 요청 정보
    prompt TEXT NOT NULL,
    aspect_ratio TEXT,
    duration INTEGER,
    style_preset TEXT,
    
    -- 상태
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    progress INTEGER DEFAULT 0,
    
    -- 결과
    video_url TEXT,
    thumbnail_url TEXT,
    error_message TEXT,
    
    -- AI Director 정보
    routing_info JSONB,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON generation_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON generation_tasks(task_id);


-- ============================================
-- 6. 사용자 세션 테이블 (선택적)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    
    -- 세션 정보
    ip_address TEXT,
    user_agent TEXT,
    
    -- 유효기간
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 만료된 세션 자동 정리 (선택적)
-- CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);


-- ============================================
-- 7. 감사 로그 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL, -- create_project, generate_video, update_template, etc.
    resource_type TEXT, -- project, template, vendor, etc.
    resource_id TEXT,
    
    -- 변경 내용
    old_value JSONB,
    new_value JSONB,
    
    -- 메타데이터
    ip_address TEXT,
    user_agent TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);


-- ============================================
-- 8. 업데이트 트리거 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_templates_updated_at ON prompt_templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 9. Row Level Security (RLS) 정책
-- ============================================
-- Supabase에서 RLS를 활성화하려면 아래 주석을 해제하세요

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own projects" ON projects
--     FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can insert own projects" ON projects
--     FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- CREATE POLICY "Users can update own projects" ON projects
--     FOR UPDATE USING (auth.uid()::text = user_id);


-- ============================================
-- 10. 뷰 (Views)
-- ============================================

-- 프로젝트 + 최신 태스크 뷰
CREATE OR REPLACE VIEW project_with_latest_task AS
SELECT 
    p.*,
    t.task_id AS latest_task_id,
    t.status AS task_status,
    t.progress AS task_progress,
    t.video_url AS task_video_url
FROM projects p
LEFT JOIN LATERAL (
    SELECT *
    FROM generation_tasks gt
    WHERE gt.project_id = p.id
    ORDER BY gt.created_at DESC
    LIMIT 1
) t ON true;


-- 벤더 통계 뷰
CREATE OR REPLACE VIEW vendor_stats AS
SELECT 
    v.id,
    v.name,
    v.is_active,
    v.total_requests,
    v.successful_requests,
    v.failed_requests,
    CASE 
        WHEN v.total_requests > 0 
        THEN ROUND((v.successful_requests::numeric / v.total_requests) * 100, 2)
        ELSE 0 
    END AS success_rate
FROM vendors v;


-- ============================================
-- 완료 메시지
-- ============================================
-- 스키마 생성이 완료되었습니다.
-- Supabase 대시보드에서 이 SQL을 실행하거나,
-- supabase db push 명령어를 사용하세요.
