"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Wand2,
  Plus,
  Layers,
  Music,
  Type,
  Image as ImageIcon,
  Film,
  Sparkles,
  Send,
  ChevronRight,
  Clock,
  Zap,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================
// Types
// ============================================

interface TimelineClip {
  id: string;
  type: "video" | "audio" | "text" | "image";
  name: string;
  startTime: number;
  duration: number;
  trackIndex: number;
  url?: string;
  content?: string;
  color?: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  aspectRatio: string;
  preset: string;
  model: string;
  status: string;
  videoUrl?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionCards?: ActionCard[];
  routingInfo?: RoutingInfo;
}

interface ActionCard {
  type: string;
  title: string;
  description: string;
  params: Record<string, unknown>;
}

interface RoutingInfo {
  intent: string;
  selected_model: string;
  confidence: number;
  reasoning: string;
}

interface GenerationStatus {
  isGenerating: boolean;
  progress: number;
  message: string;
  error?: string;
}

// ============================================
// Style Constants
// ============================================

const STYLE_PRESETS = [
  { id: "warm_film", name: "따뜻한 필름", color: "#FFA500" },
  { id: "cool_modern", name: "시원한 모던", color: "#00BFFF" },
  { id: "golden_hour", name: "골든아워", color: "#FFD700" },
  { id: "cinematic_teal_orange", name: "시네마틱", color: "#008080" },
  { id: "noir", name: "느와르", color: "#333333" },
  { id: "vibrant", name: "비비드", color: "#FF1493" },
];

const ASPECT_RATIOS = [
  { id: "9:16", name: "9:16 (세로)", width: 1080, height: 1920 },
  { id: "16:9", name: "16:9 (가로)", width: 1920, height: 1080 },
  { id: "1:1", name: "1:1 (정사각)", width: 1080, height: 1080 },
  { id: "4:5", name: "4:5 (피드)", width: 1080, height: 1350 },
];

const AI_MODELS = [
  { id: "auto", name: "🧠 Auto (AI Director)", description: "자동 최적 선택" },
  { id: "kling", name: "Kling", description: "범용 영상 생성" },
  { id: "veo", name: "Veo 3.1", description: "리얼리즘/액션" },
  { id: "sora", name: "Sora 2", description: "시네마틱" },
  { id: "hailuo", name: "Hailuo", description: "고속 생성" },
  { id: "heygen", name: "HeyGen", description: "AI 아바타" },
];

// ============================================
// Main Dashboard Component
// ============================================

export default function DashboardPage() {
  // Project State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [selectedPreset, setSelectedPreset] = useState("warm_film");
  const [selectedRatio, setSelectedRatio] = useState("9:16");

  // Video Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timeline State
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generation State
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    isGenerating: false,
    progress: 0,
    message: "",
  });

  // Error State
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Video Player Controls
  // ============================================

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ============================================
  // AI Director Chat
  // ============================================

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "admin",
          message: chatInput,
          project_id: currentProject?.id,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        actionCards: data.action_cards,
        routingInfo: data.routing_decision,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      // Auto-fill prompt from routing decision
      if (data.routing_decision?.optimized_prompt) {
        setPrompt(data.routing_decision.optimized_prompt);
      }
      if (data.routing_decision?.selected_model) {
        setSelectedModel(data.routing_decision.selected_model);
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: "죄송합니다, 요청 처리 중 오류가 발생했습니다.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, currentProject]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ============================================
  // Video Generation
  // ============================================

  const generateVideo = useCallback(async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요.");
      return;
    }

    setError(null);
    setGenerationStatus({
      isGenerating: true,
      progress: 0,
      message: "영상 생성 요청 중...",
    });

    const projectId = currentProject?.id || `project_${Date.now()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          prompt: prompt,
          model: selectedModel,
          aspect_ratio: selectedRatio,
          duration: 5,
          style_preset: selectedPreset,
          use_director: selectedModel === "auto",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "영상 생성 요청 실패");
      }

      const data = await response.json();

      // Show routing info if using Director
      if (data.routing_info) {
        setGenerationStatus({
          isGenerating: true,
          progress: 10,
          message: `🧠 AI Director: ${data.routing_info.selected_model.toUpperCase()} 선택 (${Math.round(data.routing_info.confidence * 100)}% 신뢰도)`,
        });
      }

      // Start polling
      await pollVideoProgress(projectId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(errorMsg);
      setGenerationStatus({
        isGenerating: false,
        progress: 0,
        message: "",
        error: errorMsg,
      });
    }
  }, [prompt, selectedModel, selectedRatio, selectedPreset, currentProject]);

  const pollVideoProgress = async (projectId: string) => {
    const maxAttempts = 300; // 5분 (1초 * 300)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/video/progress/${projectId}`
        );

        if (!response.ok) throw new Error("진행률 조회 실패");

        const data = await response.json();

        const remainingTime = Math.ceil((maxAttempts - attempts) / 60);
        setGenerationStatus({
          isGenerating: true,
          progress: data.progress,
          message: data.message || `생성 중... (최대 ${remainingTime}분 남음)`,
        });

        if (data.status === "completed" && data.video_url) {
          setGenerationStatus({
            isGenerating: false,
            progress: 100,
            message: "✅ 영상 생성 완료!",
          });

          // Update video player
          if (videoRef.current) {
            videoRef.current.src = data.video_url;
            videoRef.current.load();
          }

          // Add to timeline
          addClipToTimeline({
            id: `clip_${Date.now()}`,
            type: "video",
            name: "Generated Video",
            startTime: 0,
            duration: data.duration || 5,
            trackIndex: 0,
            url: data.video_url,
            color: "#03C75A",
          });

          return;
        }

        if (data.status === "failed") {
          throw new Error(data.message || "영상 생성 실패");
        }

        await new Promise((r) => setTimeout(r, 1000));
        attempts++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "오류 발생";
        setError(errorMsg);
        setGenerationStatus({
          isGenerating: false,
          progress: 0,
          message: "",
          error: errorMsg,
        });
        return;
      }
    }

    setError("영상 생성 시간 초과 (5분 경과)");
    setGenerationStatus({
      isGenerating: false,
      progress: 0,
      message: "",
      error: "시간 초과",
    });
  };

  // ============================================
  // Timeline Functions
  // ============================================

  const addClipToTimeline = (clip: TimelineClip) => {
    setTimelineClips((prev) => [...prev, clip]);
  };

  const getTrackName = (index: number, type: string) => {
    const trackNames: Record<number, Record<string, string>> = {
      0: { video: "V1", audio: "A1", text: "T1", image: "I1" },
      1: { video: "V2", audio: "A2", text: "T2", image: "I2" },
      2: { video: "V3", audio: "A3", text: "T3", image: "I3" },
    };
    return trackNames[index]?.[type] || `Track ${index + 1}`;
  };

  // ============================================
  // Initialize
  // ============================================

  useEffect(() => {
    // Initialize with welcome message
    setChatMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "안녕하세요! Studio Juai PRO AI Director입니다. 🎬\n\n어떤 영상을 만들어 드릴까요? 원하시는 내용을 자유롭게 말씀해주세요.\n\n예시:\n• \"자동차가 달리는 역동적인 영상\"\n• \"제품 소개 영상을 만들어줘\"\n• \"뉴스 리포터 스타일로 발표해줘\"",
        timestamp: new Date(),
      },
    ]);

    // Create default project
    setCurrentProject({
      id: `project_${Date.now()}`,
      title: "새 프로젝트",
      aspectRatio: "9:16",
      preset: "warm_film",
      model: "auto",
      status: "idle",
    });
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="h-screen bg-[#111111] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-[#03C75A]">Studio Juai PRO</h1>
          <Badge variant="outline" className="border-[#03C75A] text-[#03C75A]">
            AI Director
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {currentProject && (
            <span className="text-sm text-gray-400">
              {currentProject.title}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/admin")}
          >
            <Settings className="w-4 h-4 mr-1" />
            Admin
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Top Section: Player + Controls + Chat */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <ResizablePanelGroup direction="horizontal">
            {/* Video Player */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full bg-[#0a0a0a] flex flex-col">
                {/* Video Container */}
                <div className="flex-1 flex items-center justify-center p-4">
                  <div
                    className={cn(
                      "relative bg-black rounded-lg overflow-hidden",
                      selectedRatio === "9:16"
                        ? "aspect-[9/16] max-h-full"
                        : selectedRatio === "1:1"
                          ? "aspect-square max-h-full"
                          : "aspect-video max-w-full"
                    )}
                    style={{ maxHeight: "calc(100% - 80px)" }}
                  >
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                    />

                    {/* Generation Overlay */}
                    {generationStatus.isGenerating && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-[#03C75A] animate-spin mb-4" />
                        <div className="text-center">
                          <p className="text-lg font-medium mb-2">
                            {generationStatus.message}
                          </p>
                          <div className="w-64 h-2 bg-[#333] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#03C75A] transition-all duration-300"
                              style={{
                                width: `${generationStatus.progress}%`,
                              }}
                            />
                          </div>
                          <p className="text-sm text-gray-400 mt-2">
                            {generationStatus.progress}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No Video Placeholder */}
                    {!videoRef.current?.src && !generationStatus.isGenerating && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <Film className="w-16 h-16 mb-4" />
                        <p>프롬프트를 입력하고 영상을 생성하세요</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Controls */}
                <div className="h-20 bg-[#1a1a1a] border-t border-[#333] p-2">
                  {/* Progress Bar */}
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="mb-2"
                  />

                  <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSeek([0])}
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="bg-[#03C75A] hover:bg-[#02a84d]"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon">
                        <SkipForward className="w-4 h-4" />
                      </Button>

                      <span className="text-sm text-gray-400 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={toggleMute}>
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        max={100}
                        onValueChange={(v) => setVolume(v[0] / 100)}
                        className="w-20"
                      />
                      <Button variant="ghost" size="icon">
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-[#333] hover:bg-[#03C75A]" />

            {/* Right Panel: Controls + Chat */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <ResizablePanelGroup direction="vertical">
                {/* Generation Controls */}
                <ResizablePanel defaultSize={45} minSize={30}>
                  <div className="h-full bg-[#1a1a1a] p-4 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-[#03C75A]" />
                      AI 영상 생성
                    </h3>

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}

                    {/* Prompt Input */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-1 block">
                        프롬프트
                      </label>
                      <Textarea
                        placeholder="만들고 싶은 영상을 자세히 설명해주세요..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-[#0a0a0a] border-[#333] focus:border-[#03C75A] min-h-[100px]"
                      />
                    </div>

                    {/* Model Selection */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-1 block">
                        AI 모델
                      </label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                          {AI_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <span className="flex items-center gap-2">
                                {model.name}
                                <span className="text-xs text-gray-500">
                                  ({model.description})
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aspect Ratio & Preset */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          비율
                        </label>
                        <Select
                          value={selectedRatio}
                          onValueChange={setSelectedRatio}
                        >
                          <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-[#333]">
                            {ASPECT_RATIOS.map((ratio) => (
                              <SelectItem key={ratio.id} value={ratio.id}>
                                {ratio.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          스타일
                        </label>
                        <Select
                          value={selectedPreset}
                          onValueChange={setSelectedPreset}
                        >
                          <SelectTrigger className="bg-[#0a0a0a] border-[#333]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-[#333]">
                            {STYLE_PRESETS.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: preset.color }}
                                  />
                                  {preset.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      className="w-full bg-[#03C75A] hover:bg-[#02a84d] text-white font-semibold"
                      onClick={generateVideo}
                      disabled={generationStatus.isGenerating || !prompt.trim()}
                    >
                      {generationStatus.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중... ({generationStatus.progress}%)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          영상 생성
                        </>
                      )}
                    </Button>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-[#333] hover:bg-[#03C75A]" />

                {/* AI Chat */}
                <ResizablePanel defaultSize={55} minSize={30}>
                  <div className="h-full bg-[#0a0a0a] flex flex-col">
                    <div className="p-3 border-b border-[#333] flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#03C75A]" />
                      <span className="text-sm font-medium">AI Director</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-[#333]"
                      >
                        Gemini 1.5 Pro
                      </Badge>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg p-3",
                              msg.role === "user"
                                ? "bg-[#03C75A] text-white"
                                : "bg-[#1a1a1a] text-gray-200"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.content}
                            </p>

                            {/* Routing Info */}
                            {msg.routingInfo && (
                              <div className="mt-3 pt-3 border-t border-[#333]">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <Zap className="w-3 h-3" />
                                  <span>
                                    {msg.routingInfo.selected_model.toUpperCase()}{" "}
                                    선택됨 (
                                    {Math.round(msg.routingInfo.confidence * 100)}
                                    % 신뢰도)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Action Cards */}
                            {msg.actionCards && msg.actionCards.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.actionCards.map((card, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start border-[#333] hover:bg-[#333]"
                                    onClick={() => {
                                      if (card.params?.prompt) {
                                        setPrompt(card.params.prompt as string);
                                      }
                                      if (card.params?.model) {
                                        setSelectedModel(
                                          card.params.model as string
                                        );
                                      }
                                    }}
                                  >
                                    <ChevronRight className="w-3 h-3 mr-2" />
                                    {card.title}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>

                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <p className="text-sm text-gray-400">
                              분석 중...
                            </p>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-[#333]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && sendChatMessage()
                          }
                          placeholder="AI Director에게 물어보세요..."
                          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-[#03C75A] focus:outline-none"
                        />
                        <Button
                          onClick={sendChatMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                          className="bg-[#03C75A] hover:bg-[#02a84d]"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="bg-[#333] hover:bg-[#03C75A]" />

        {/* Timeline */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="h-full bg-[#1a1a1a] flex flex-col">
            {/* Timeline Header */}
            <div className="h-10 border-b border-[#333] flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Timeline</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Layers className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Zoom</span>
                <Slider
                  value={[timelineZoom]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={(v) => setTimelineZoom(v[0])}
                  className="w-24"
                />
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Track Labels */}
              <div className="w-24 border-r border-[#333] flex-shrink-0">
                {[0, 1, 2].map((trackIndex) => (
                  <div
                    key={trackIndex}
                    className="h-16 border-b border-[#333] flex items-center px-2"
                  >
                    <div className="flex items-center gap-2">
                      {trackIndex === 0 && <Film className="w-4 h-4 text-blue-400" />}
                      {trackIndex === 1 && <Music className="w-4 h-4 text-green-400" />}
                      {trackIndex === 2 && <Type className="w-4 h-4 text-yellow-400" />}
                      <span className="text-xs text-gray-400">
                        {trackIndex === 0 ? "Video" : trackIndex === 1 ? "Audio" : "Text"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Tracks */}
              <div className="flex-1 overflow-x-auto">
                <div
                  className="min-w-full"
                  style={{ width: `${100 * timelineZoom}%` }}
                >
                  {/* Time Ruler */}
                  <div className="h-6 border-b border-[#333] flex items-end px-2 bg-[#0a0a0a]">
                    {Array.from({ length: Math.ceil(duration || 30) }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0"
                          style={{ width: `${100 / (duration || 30)}%` }}
                        >
                          <span className="text-[10px] text-gray-500">
                            {formatTime(i)}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Tracks */}
                  {[0, 1, 2].map((trackIndex) => (
                    <div
                      key={trackIndex}
                      className="h-16 border-b border-[#333] relative"
                    >
                      {timelineClips
                        .filter((clip) => clip.trackIndex === trackIndex)
                        .map((clip) => (
                          <div
                            key={clip.id}
                            className="absolute top-2 bottom-2 rounded cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: `${(clip.startTime / (duration || 30)) * 100}%`,
                              width: `${(clip.duration / (duration || 30)) * 100}%`,
                              backgroundColor: clip.color || "#03C75A",
                            }}
                          >
                            <div className="px-2 py-1 text-xs font-medium truncate">
                              {clip.name}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Footer */}
            <div className="h-8 border-t border-[#333] flex items-center justify-between px-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  Duration: {formatTime(duration)} | Clips:{" "}
                  {timelineClips.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  disabled={timelineClips.length === 0}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
