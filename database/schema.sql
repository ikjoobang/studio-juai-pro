-- ============================================
-- Super Agent Platform - Database Schema
-- Supabase (PostgreSQL)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. User Profiles (extends Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    industry TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    credits_balance INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- 2. Projects (프로젝트 및 클라이언트 요구사항)
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    
    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    
    -- Target Settings
    target_channel TEXT[] DEFAULT '{}',
    aspect_ratio TEXT DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1', '4:5', '4:3')),
    duration INTEGER DEFAULT 30, -- seconds
    
    -- Style Settings
    style_preset TEXT DEFAULT 'iphone_korean' CHECK (style_preset IN (
        'iphone_korean', 'professional', 'cinematic', 'minimal', 'trendy'
    )),
    
    -- Client Requirements
    client_requirements TEXT,
    reference_urls TEXT[] DEFAULT '{}',
    brand_guidelines JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'waiting' CHECK (status IN (
        'waiting', 'analyzing', 'generating', 'processing', 'completed', 'failed'
    )),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================
-- 3. Assets (자산 - 결과물)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    
    -- Asset Info
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'thumbnail')),
    name TEXT,
    url TEXT NOT NULL,
    
    -- Generation Info
    prompt_used TEXT,
    vendor TEXT, -- Kling, Midjourney, HeyGen, Creatomate
    model_version TEXT,
    
    -- Technical Details
    width INTEGER,
    height INTEGER,
    duration_seconds NUMERIC(10, 2),
    file_size_bytes BIGINT,
    mime_type TEXT,
    
    -- Status
    status TEXT DEFAULT 'created' CHECK (status IN (
        'created', 'processing', 'ready', 'failed', 'deleted'
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_assets_project_id ON public.assets(project_id);
CREATE INDEX idx_assets_type ON public.assets(type);
CREATE INDEX idx_assets_status ON public.assets(status);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (through project ownership)
CREATE POLICY "Users can view own assets" ON public.assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = assets.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create assets for own projects" ON public.assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = assets.project_id
            AND projects.user_id = auth.uid()
        )
    );


-- ============================================
-- 4. Vendors (API 벤더 설정)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Vendor Info
    service_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('image', 'video', 'audio', 'avatar', 'template')),
    
    -- API Configuration
    api_endpoint TEXT,
    parameter_map JSONB DEFAULT '{}',
    
    -- Rate Limits
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 1000,
    
    -- Pricing
    cost_per_request NUMERIC(10, 4) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'down')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Insert default vendors
INSERT INTO public.vendors (service_name, display_name, description, category, is_active) VALUES
    ('kling', 'Kling AI', 'AI 영상 생성', 'video', TRUE),
    ('midjourney', 'Midjourney', 'AI 이미지 생성', 'image', TRUE),
    ('heygen', 'HeyGen', 'AI 아바타 영상', 'avatar', TRUE),
    ('creatomate', 'Creatomate', '영상 템플릿 렌더링', 'template', TRUE),
    ('elevenlabs', 'ElevenLabs', 'AI 음성 합성', 'audio', TRUE),
    ('runway', 'Runway', 'AI 영상 편집', 'video', TRUE)
ON CONFLICT (service_name) DO NOTHING;


-- ============================================
-- 5. User Actions (사용자 행동 로깅)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    
    -- Action Info
    action TEXT NOT NULL,
    action_category TEXT,
    
    -- Context
    page_path TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_user_actions_user_id ON public.user_actions(user_id);
CREATE INDEX idx_user_actions_action ON public.user_actions(action);
CREATE INDEX idx_user_actions_created_at ON public.user_actions(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own actions" ON public.user_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own actions" ON public.user_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 6. Chat Sessions (채팅 세션)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    
    -- Session Info
    title TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);


-- ============================================
-- 7. Chat Messages (채팅 메시지)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    
    -- Message Info
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Action Cards
    action_cards JSONB DEFAULT '[]',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy (through session ownership)
CREATE POLICY "Users can manage own chat messages" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );


-- ============================================
-- 8. Trends (트렌드 데이터 캐시)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Trend Info
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'google')),
    category TEXT,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Metrics
    growth_rate NUMERIC(10, 2),
    engagement_score NUMERIC(10, 2),
    search_volume INTEGER,
    
    -- Keywords
    keywords TEXT[] DEFAULT '{}',
    
    -- Source
    source_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_trends_platform ON public.trends(platform);
CREATE INDEX idx_trends_category ON public.trends(category);
CREATE INDEX idx_trends_fetched_at ON public.trends(fetched_at DESC);


-- ============================================
-- 9. Payments (결제 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    
    -- Payment Info
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KRW',
    
    -- PortOne Integration
    portone_payment_id TEXT UNIQUE,
    merchant_uid TEXT UNIQUE,
    
    -- Plan Info
    plan_type TEXT CHECK (plan_type IN ('credits', 'subscription')),
    plan_name TEXT,
    credits_amount INTEGER,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'paid', 'failed', 'cancelled', 'refunded'
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- 10. Templates (영상 템플릿)
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Template Info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    industry TEXT[] DEFAULT '{}',
    
    -- Template Settings
    aspect_ratio TEXT DEFAULT '9:16',
    duration_seconds INTEGER,
    
    -- Creatomate Integration
    creatomate_template_id TEXT,
    
    -- Preview
    thumbnail_url TEXT,
    preview_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    
    -- Pricing
    credits_cost INTEGER DEFAULT 10,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_is_active ON public.templates(is_active);


-- ============================================
-- Functions & Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- Views (편의용 뷰)
-- ============================================

-- Project with asset count
CREATE OR REPLACE VIEW public.projects_with_stats AS
SELECT 
    p.*,
    COUNT(a.id) AS asset_count,
    COALESCE(SUM(CASE WHEN a.type = 'video' THEN 1 ELSE 0 END), 0) AS video_count,
    COALESCE(SUM(CASE WHEN a.type = 'image' THEN 1 ELSE 0 END), 0) AS image_count
FROM public.projects p
LEFT JOIN public.assets a ON a.project_id = p.id
GROUP BY p.id;


-- ============================================
-- Sample Data (Development Only)
-- ============================================

-- Uncomment below for development testing
/*
INSERT INTO public.trends (platform, category, title, growth_rate, keywords) VALUES
    ('youtube', 'entertainment', '숏폼 밈 콘텐츠', 245.00, ARRAY['밈', '숏폼', '반복시청']),
    ('instagram', 'product', 'ASMR 제품 리뷰', 180.00, ARRAY['ASMR', '언박싱', '감성']),
    ('tiktok', 'lifestyle', '브이로그 스타일 광고', 156.00, ARRAY['브이로그', '자연스러운', '일상']);
*/

-- ============================================
-- End of Schema
-- ============================================
