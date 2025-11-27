"use client";

/**
 * Studio Juai PRO - Dashboard (워크스페이스)
 * PREMIERE PRO STYLE with RESIZABLE PANELS
 * 
 * 레이아웃 구조:
 * ┌─────────────────────────────────────────────────┐
 * │ Header                                          │
 * ├──────────────────────┬──────────────────────────┤
 * │ Video Player         │ Chat/Properties          │ ← 상단 (드래그로 조절)
 * │ (수평 드래그 조절)    │ (수평 드래그 조절)        │
 * ├──────────────────────┴──────────────────────────┤ ← 수직 핸들
 * │ Timeline (전체 너비)                             │ ← 하단 (드래그로 조절)
 * └─────────────────────────────────────────────────┘
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  Plus,
  MessageSquare,
  Settings,
  FolderOpen,
  Sparkles,
  Video,
  Menu,
  X,
  Download,
  MoreHorizontal,
  Wand2,
  Loader2,
  Sliders,
  Film,
  GripVertical,
  GripHorizontal,
} from "lucide-react";

// Components
import VideoPlayer from "@/components/VideoPlayer";
import Timeline from "@/components/Timeline";
import ChatSidebar from "@/components/ChatSidebar";
import NewProjectModal from "@/components/NewProjectModal";

// Store
import { useVideoStore, useChatStore, useUIStore, TimelineClip } from "@/lib/store";

// API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Custom Resize Handle Component (Horizontal - 수평 방향 패널 사이)
function HorizontalResizeHandle() {
  return (
    <PanelResizeHandle className="w-1.5 bg-[#2a2a2a] hover:bg-juai-green/50 active:bg-juai-green transition-colors relative group">
      <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
    </PanelResizeHandle>
  );
}

// Custom Resize Handle Component (Vertical - 수직 방향 패널 사이)
function VerticalResizeHandle() {
  return (
    <PanelResizeHandle className="h-1.5 bg-[#2a2a2a] hover:bg-juai-green/50 active:bg-juai-green transition-colors relative group cursor-row-resize">
      <div className="absolute inset-x-0 -top-1 -bottom-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal className="w-4 h-4 text-gray-400" />
      </div>
    </PanelResizeHandle>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "properties">("chat");
  
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
  
  const { setChatOpen } = useChatStore();
  const { showNewProjectModal, setShowNewProjectModal } = useUIStore();

  // AI 영상 생성
  const handleGenerateVideo = useCallback(async () => {
    if (!currentProject || isGenerating) return;

    setIsGenerating(true);
    startRender(currentProject.id);

    try {
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

      if (!response.ok) throw new Error("영상 생성 요청 실패");

      const data = await response.json();
      await pollVideoProgress(currentProject.id);

    } catch (error) {
      console.error("❌ 영상 생성 오류:", error);
      failRender(error instanceof Error ? error.message : "알 수 없는 오류");
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, isGenerating, startRender, failRender]);

  const pollVideoProgress = async (projectId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/video/progress/${projectId}`);
        if (!response.ok) throw new Error("진행률 조회 실패");

        const data = await response.json();
        updateRenderProgress(data.progress, data.message);

        if (data.status === "completed" && data.video_url) {
          completeRender(data.video_url);
          addVideoToTimeline(data.video_url, data.duration || 15);
          updateProject(projectId, {
            status: "completed",
            videoUrl: data.video_url,
            thumbnailUrl: data.thumbnail_url,
          });
          return;
        }

        if (data.status === "failed") throw new Error(data.message || "영상 생성 실패");

        await new Promise((r) => setTimeout(r, 1000));
        attempts++;
      } catch (error) {
        throw error;
      }
    }
    throw new Error("영상 생성 시간 초과");
  };

  const addVideoToTimeline = (videoUrl: string, duration: number) => {
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      type: "video",
      startTime: 0,
      duration: duration * 1000,
      sourceUrl: videoUrl,
      label: currentProject?.title || "생성된 영상",
      layer: 0,
    };
    addClip(newClip);
  };

  return (
    <div className="flex h-screen bg-[#1a1a1a] overflow-hidden">
      {/* Left Sidebar - Project Navigator */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              className="fixed left-0 top-0 h-full w-[260px] bg-[#252525] z-50 
                       flex flex-col border-r border-[#333]"
            >
              {/* Logo */}
              <div className="p-4 flex items-center justify-between border-b border-[#333]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold">Studio Juai PRO</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* New Project Button */}
              <div className="p-3">
                <button
                  onClick={() => { setShowNewProjectModal(true); setSidebarOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 
                           bg-gradient-juai text-white rounded-lg text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  새 프로젝트
                </button>
              </div>

              {/* Recent Projects */}
              <div className="flex-1 overflow-y-auto p-3">
                <h3 className="text-gray-500 text-xs font-medium uppercase mb-2">프로젝트</h3>
                <div className="space-y-1">
                  {projects.length > 0 ? (
                    projects.slice(0, 8).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setCurrentProject(project)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm
                          ${currentProject?.id === project.id ? "bg-[#333] text-white" : "text-gray-400 hover:bg-[#2a2a2a]"}`}
                      >
                        <Film className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{project.title}</span>
                        <span className="text-xs text-gray-500 ml-auto">{project.aspectRatio}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-xs text-center py-2">프로젝트 없음</p>
                  )}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="p-3 border-t border-[#333] space-y-1">
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg text-sm">
                  <FolderOpen className="w-4 h-4" />
                  <span>모든 프로젝트</span>
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg text-sm">
                  <Settings className="w-4 h-4" />
                  <span>설정</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Bar */}
        <header className="flex items-center justify-between px-2 h-10 bg-[#252525] border-b border-[#333] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-[#333] rounded">
              <Menu className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-white text-sm font-medium">
                {currentProject?.title || "Studio Juai PRO"}
              </h1>
              {currentProject && (
                <span className="px-1.5 py-0.5 bg-[#333] text-gray-400 text-xs rounded">
                  {currentProject.aspectRatio}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentProject && renderStatus === "idle" && (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-juai text-white 
                         rounded text-xs font-medium disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                AI 영상 생성
              </button>
            )}

            {(renderStatus === "preparing" || renderStatus === "rendering") && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#333] rounded text-xs">
                <Loader2 className="w-3 h-3 animate-spin text-juai-green" />
                <span className="text-gray-300">{renderProgress}%</span>
              </div>
            )}

            {videoUrl && renderStatus === "completed" && (
              <button className="flex items-center gap-1.5 px-3 py-1 bg-[#333] text-gray-300 rounded text-xs">
                <Download className="w-3 h-3" />
                내보내기
              </button>
            )}

            <button className="p-1.5 hover:bg-[#333] rounded">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Main Content - RESIZABLE PANELS */}
        <PanelGroup direction="vertical" className="flex-1">
          {/* Top Section: Player + Side Panel */}
          <Panel defaultSize={55} minSize={30} maxSize={80}>
            <PanelGroup direction="horizontal" className="h-full">
              {/* Left: Video Player */}
              <Panel defaultSize={65} minSize={40} maxSize={85}>
                <div className="h-full p-2">
                  {currentProject ? (
                    <VideoPlayer className="h-full" compact />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-[#1e1e1e] rounded-lg">
                      <div className="text-center">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-juai flex items-center justify-center"
                        >
                          <Video className="w-8 h-8 text-white" />
                        </motion.div>
                        <p className="text-gray-400 text-sm mb-3">프로젝트를 선택하세요</p>
                        <button
                          onClick={() => setShowNewProjectModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-juai text-white rounded-lg text-sm mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          새 프로젝트
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Horizontal Resize Handle */}
              <HorizontalResizeHandle />

              {/* Right: Chat/Properties Panel */}
              <Panel defaultSize={35} minSize={15} maxSize={60}>
                <div className="h-full flex flex-col bg-[#1e1e1e]">
                  {/* Panel Tabs */}
                  <div className="flex border-b border-[#333] flex-shrink-0">
                    <button
                      onClick={() => setRightPanelTab("chat")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                        ${rightPanelTab === "chat" ? "text-white bg-[#252525] border-b-2 border-juai-green" : "text-gray-400 hover:text-white"}`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      AI 어시스턴트
                    </button>
                    <button
                      onClick={() => setRightPanelTab("properties")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                        ${rightPanelTab === "properties" ? "text-white bg-[#252525] border-b-2 border-juai-green" : "text-gray-400 hover:text-white"}`}
                    >
                      <Sliders className="w-3 h-3" />
                      속성
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-hidden">
                    {rightPanelTab === "chat" ? (
                      <ChatSidebar embedded />
                    ) : (
                      <div className="p-3 text-gray-400 text-sm overflow-y-auto h-full">
                        {currentProject ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">프로젝트명</label>
                              <div className="text-white text-sm bg-[#252525] px-2 py-1.5 rounded">{currentProject.title}</div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">화면비</label>
                              <div className="text-white text-sm bg-[#252525] px-2 py-1.5 rounded">{currentProject.aspectRatio}</div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">프리셋</label>
                              <select className="w-full text-white text-sm bg-[#252525] px-2 py-1.5 rounded border border-[#444] outline-none">
                                <option value="warm_film">Warm Film</option>
                                <option value="cool_modern">Cool Modern</option>
                                <option value="golden_hour">Golden Hour</option>
                                <option value="cinematic_teal_orange">Cinematic Teal Orange</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">상태</label>
                              <div className="text-juai-green text-sm">{renderStatus}</div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-gray-500">프로젝트를 선택하세요</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Vertical Resize Handle */}
          <VerticalResizeHandle />

          {/* Bottom Section: Timeline */}
          <Panel defaultSize={45} minSize={20} maxSize={70}>
            <Timeline expanded />
          </Panel>
        </PanelGroup>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />
    </div>
  );
}
