"use client";

/**
 * Super Agent Platform - Main Page
 * VIDEO FIRST ARCHITECTURE
 * 
 * ✅ 기능 연동 완료:
 * 1. [AI 영상 생성] 버튼 → POST /api/video/generate 호출
 * 2. 영상 생성 완료 → 타임라인 Video 트랙에 자동 로드
 * 3. 챗봇 "자막 달아줘" → /api/creatomate/auto-edit 실행
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Settings,
  FolderOpen,
  Sparkles,
  Video,
  TrendingUp,
  Menu,
  X,
  ChevronDown,
  Play,
  Download,
  Share2,
  MoreHorizontal,
  Clock,
  Layers,
  Wand2,
  Loader2,
} from "lucide-react";

// Components
import VideoPlayer from "@/components/VideoPlayer";
import Timeline from "@/components/Timeline";
import ChatSidebar from "@/components/ChatSidebar";
import NewProjectModal from "@/components/NewProjectModal";

// Store
import { useVideoStore, useChatStore, useUIStore, VideoProject, TimelineClip } from "@/lib/store";

// API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Stores
  const {
    currentProject,
    projects,
    renderStatus,
    renderProgress,
    videoUrl,
    setCurrentProject,
    startRender,
    updateRenderProgress,
    completeRender,
    failRender,
    addClip,
    updateProject,
  } = useVideoStore();
  
  const { isChatOpen, setChatOpen } = useChatStore();
  const { showNewProjectModal, setShowNewProjectModal } = useUIStore();

  // ============================================
  // ✅ 1. AI 영상 생성 - 백엔드 API 연동
  // POST /api/video/generate 호출
  // ============================================
  const handleGenerateVideo = useCallback(async () => {
    if (!currentProject || isGenerating) return;

    setIsGenerating(true);
    startRender(currentProject.id);

    try {
      // Step 1: 영상 생성 요청
      const response = await fetch(`${API_BASE_URL}/api/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProject.id,
          title: currentProject.title,
          description: currentProject.description || "",
          aspect_ratio: currentProject.aspectRatio,
          preset: currentProject.preset || "warm_film",
          source_type: "ai_generate",
        }),
      });

      if (!response.ok) {
        throw new Error("영상 생성 요청 실패");
      }

      const data = await response.json();
      console.log("✅ 영상 생성 시작:", data);

      // Step 2: 진행률 폴링
      await pollVideoProgress(currentProject.id);

    } catch (error) {
      console.error("❌ 영상 생성 오류:", error);
      failRender(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, isGenerating, startRender, failRender]);

  // ============================================
  // ✅ 2. 진행률 폴링 & 타임라인 자동 로드
  // GET /api/video/progress/{project_id}
  // ============================================
  const pollVideoProgress = async (projectId: string) => {
    const maxAttempts = 60; // 최대 60초 (1초 간격)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/video/progress/${projectId}`);
        
        if (!response.ok) {
          throw new Error("진행률 조회 실패");
        }

        const data = await response.json();
        console.log(`📊 진행률: ${data.progress}% - ${data.message}`);

        // 상태 업데이트
        updateRenderProgress(data.progress, data.message);

        // 완료 체크
        if (data.status === "completed" && data.video_url) {
          console.log("🎉 영상 생성 완료:", data.video_url);
          
          // ✅ video_url로 플레이어 업데이트 & 자동 재생
          completeRender(data.video_url);

          // ✅ 타임라인 Video 트랙에 자동 로드
          addVideoToTimeline(data.video_url, data.duration || 15);
          
          // 프로젝트 업데이트
          updateProject(projectId, {
            status: "completed",
            videoUrl: data.video_url,
            thumbnailUrl: data.thumbnail_url,
          });

          return;
        }

        // 실패 체크
        if (data.status === "failed") {
          throw new Error(data.message || "영상 생성 실패");
        }

        // 1초 대기 후 다시 폴링
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;

      } catch (error) {
        console.error("폴링 오류:", error);
        throw error;
      }
    }

    throw new Error("영상 생성 시간 초과");
  };

  // ============================================
  // ✅ 타임라인에 영상 클립 추가
  // ============================================
  const addVideoToTimeline = (videoUrl: string, duration: number) => {
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      type: "video",
      startTime: 0,
      duration: duration * 1000, // ms로 변환
      sourceUrl: videoUrl,
      label: currentProject?.title || "생성된 영상",
      layer: 0,
    };

    addClip(newClip);
    console.log("✅ 타임라인에 영상 추가:", newClip);
  };

  return (
    <div className="flex h-screen bg-juai-paper overflow-hidden">
      {/* Left Sidebar - Navigation */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed lg:relative left-0 top-0 h-full w-[280px] bg-juai-night z-50 
                       flex flex-col border-r border-juai-gray-800"
            >
              {/* Logo */}
              <div className="p-6 flex items-center justify-between border-b border-juai-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-juai flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">Studio Juai</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-juai-gray-400 hover:text-white lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* New Project Button */}
              <div className="p-4">
                <button
                  onClick={() => {
                    setShowNewProjectModal(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 
                           bg-gradient-juai text-white rounded-xl 
                           hover:opacity-90 transition-opacity font-medium"
                >
                  <Plus className="w-5 h-5" />
                  새 프로젝트
                </button>
              </div>

              {/* Recent Projects */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-juai-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
                  최근 프로젝트
                </h3>
                <div className="space-y-2">
                  {projects.length > 0 ? (
                    projects.slice(0, 5).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setCurrentProject(project)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl 
                                  transition-colors text-left ${
                                    currentProject?.id === project.id
                                      ? "bg-juai-gray-800 text-white"
                                      : "text-juai-gray-400 hover:bg-juai-gray-800/50 hover:text-white"
                                  }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                          ${project.aspectRatio === "9:16" ? "bg-purple-500/20" : "bg-blue-500/20"}`}
                        >
                          <Video className={`w-4 h-4 
                            ${project.aspectRatio === "9:16" ? "text-purple-400" : "text-blue-400"}`} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-juai-gray-500">{project.aspectRatio}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-juai-gray-500 text-sm text-center py-4">
                      프로젝트가 없습니다
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="p-4 border-t border-juai-gray-800 space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <FolderOpen className="w-5 h-5" />
                  <span>모든 프로젝트</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <TrendingUp className="w-5 h-5" />
                  <span>트렌드</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>설정</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-juai-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-juai-gray-600" />
            </button>
            
            {/* Project Title */}
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-juai-black">
                {currentProject?.title || "Super Agent Platform"}
              </h1>
              {currentProject && (
                <span className="px-2 py-0.5 bg-juai-gray-100 text-juai-gray-500 
                               text-xs rounded-full">
                  {currentProject.aspectRatio}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Generate Button - ✅ 백엔드 API 연동 */}
            {currentProject && renderStatus === "idle" && (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-juai text-white 
                         rounded-xl hover:opacity-90 transition-opacity font-medium text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI 영상 생성
                  </>
                )}
              </button>
            )}

            {/* Rendering Progress Indicator */}
            {(renderStatus === "preparing" || renderStatus === "rendering") && (
              <div className="flex items-center gap-2 px-4 py-2 bg-juai-gray-100 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-juai-green" />
                <span className="text-sm text-juai-gray-700">{renderProgress}%</span>
              </div>
            )}

            {/* Export Button */}
            {videoUrl && renderStatus === "completed" && (
              <button className="flex items-center gap-2 px-4 py-2 bg-juai-gray-100 
                               text-juai-gray-700 rounded-xl hover:bg-juai-gray-200 
                               transition-colors text-sm">
                <Download className="w-4 h-4" />
                내보내기
              </button>
            )}

            {/* Chat Toggle */}
            <button
              onClick={() => setChatOpen(!isChatOpen)}
              className={`p-2 rounded-lg transition-colors relative ${
                isChatOpen
                  ? "bg-juai-green text-white"
                  : "hover:bg-juai-gray-100 text-juai-gray-600"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* More Options */}
            <button className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-juai-gray-600" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Video Player - THE HERO */}
          <div className="flex-1 p-4 overflow-hidden">
            {currentProject ? (
              <VideoPlayer className="h-full" />
            ) : (
              // Empty State - Prompt to create project
              <div className="h-full flex items-center justify-center bg-juai-night rounded-2xl">
                <div className="text-center px-8 max-w-md">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-juai 
                             flex items-center justify-center"
                  >
                    <Video className="w-12 h-12 text-white" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-3">
                    영상 제작을 시작하세요
                  </h2>
                  <p className="text-white/60 mb-8">
                    AI가 당신의 아이디어를 멋진 영상으로 만들어 드립니다.
                    새 프로젝트를 시작해보세요!
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="flex items-center justify-center gap-2 px-6 py-3 
                               bg-gradient-juai text-white rounded-xl 
                               hover:opacity-90 transition-opacity font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      새 프로젝트 만들기
                    </button>
                    
                    <button
                      onClick={() => setChatOpen(true)}
                      className="flex items-center justify-center gap-2 px-6 py-3 
                               bg-white/10 text-white rounded-xl 
                               hover:bg-white/20 transition-colors font-medium"
                    >
                      <MessageSquare className="w-5 h-5" />
                      AI와 대화하기
                    </button>
                  </div>

                  {/* Quick Start Options */}
                  <div className="mt-10 grid grid-cols-2 gap-3">
                    {[
                      { label: "YouTube 쇼츠", ratio: "9:16", icon: "📱" },
                      { label: "유튜브 영상", ratio: "16:9", icon: "📺" },
                      { label: "인스타 릴스", ratio: "9:16", icon: "📸" },
                      { label: "인스타 피드", ratio: "1:1", icon: "🖼️" },
                    ].map((option) => (
                      <motion.button
                        key={option.label}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowNewProjectModal(true)}
                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 
                                 rounded-xl transition-colors text-left"
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium">{option.label}</p>
                          <p className="text-white/40 text-xs">{option.ratio}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline - Below Video */}
          {currentProject && (
            <div className="h-[240px] px-4 pb-4">
              <Timeline />
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar - Assistant Tool (✅ /api/creatomate/auto-edit 연동) */}
      <ChatSidebar />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />
    </div>
  );
}
