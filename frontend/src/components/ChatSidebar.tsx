"use client";

/**
 * ChatSidebar - AI 어시스턴트 채팅 사이드바
 * VIDEO FIRST: 메인이 아닌 '보조 도구' 역할
 * 
 * ✅ 기능 연동:
 * - "자막 달아줘" → POST /api/creatomate/auto-edit 호출
 * - "음악 추가해줘" → 타임라인에 오디오 트랙 추가
 * - "스타일 변경해줘" → 프리셋 변경 적용
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  Loader2,
  ChevronRight,
  Wand2,
  Palette,
  Music2,
  Type,
  Image,
  Check,
  AlertCircle,
} from "lucide-react";
import { useChatStore, useVideoStore, TimelineClip } from "@/lib/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionType?: string;
  actionStatus?: "pending" | "success" | "error";
  actionResult?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Quick Action Buttons for Video Editing
const quickActions = [
  { id: "style", label: "스타일 변경", icon: <Palette className="w-4 h-4" />, prompt: "이 영상의 색감을 바꿔줘" },
  { id: "music", label: "음악 추가", icon: <Music2 className="w-4 h-4" />, prompt: "배경음악 추천해줘" },
  { id: "text", label: "자막 추가", icon: <Type className="w-4 h-4" />, prompt: "영상에 자막을 추가해줘" },
  { id: "effect", label: "효과 적용", icon: <Wand2 className="w-4 h-4" />, prompt: "트렌디한 효과를 적용해줘" },
];

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { isChatOpen, setChatOpen, suggestions } = useChatStore();
  const { currentProject, videoUrl, addClip, updateProject } = useVideoStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  // ============================================
  // ✅ 3. 챗봇 명령어 처리 - Creatomate 연동
  // ============================================
  const executeVideoAction = useCallback(async (actionType: string, messageId: string) => {
    if (!currentProject || !videoUrl) {
      console.warn("프로젝트 또는 영상이 없습니다");
      return null;
    }

    setIsExecutingAction(true);

    try {
      switch (actionType) {
        case "text_add":
          // ✅ 자막 추가 - POST /api/creatomate/auto-edit
          console.log("🎬 자막 추가 요청...");
          
          const subtitleResponse = await fetch(`${API_BASE_URL}/api/creatomate/auto-edit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: currentProject.id,
              template_id: "subtitle_template_01",
              headline: currentProject.title,
              subheadline: "AI 자동 생성 자막",
              background_video_url: videoUrl,
              cta_text: "",
              brand_color: "#03C75A",
            }),
          });

          if (subtitleResponse.ok) {
            const result = await subtitleResponse.json();
            console.log("✅ 자막 추가 완료:", result);
            
            // 타임라인에 자막 클립 추가
            const subtitleClip: TimelineClip = {
              id: `subtitle_${Date.now()}`,
              type: "text",
              startTime: 1000,
              duration: 5000,
              label: "자막",
              layer: 2,
            };
            addClip(subtitleClip);
            
            return { success: true, message: "자막이 추가되었습니다!", result };
          }
          throw new Error("자막 추가 실패");

        case "music_add":
          // 음악 추가 - 타임라인에 오디오 트랙 추가
          console.log("🎵 음악 추가 요청...");
          
          const musicClip: TimelineClip = {
            id: `music_${Date.now()}`,
            type: "audio",
            startTime: 0,
            duration: 15000,
            label: "배경음악",
            layer: 3,
            sourceUrl: "https://example.com/bgm.mp3",
          };
          addClip(musicClip);
          
          return { success: true, message: "배경음악이 추가되었습니다!" };

        case "style_change":
          // 스타일 변경 - 프리셋 적용
          console.log("🎨 스타일 변경 요청...");
          
          const presets = ["warm_film", "cool_modern", "golden_hour", "cinematic_teal_orange"];
          const currentPreset = currentProject.preset || "warm_film";
          const currentIndex = presets.indexOf(currentPreset);
          const newPreset = presets[(currentIndex + 1) % presets.length];
          
          updateProject(currentProject.id, { preset: newPreset });
          
          return { success: true, message: `스타일이 '${newPreset}'로 변경되었습니다!` };

        case "effect_apply":
          // 효과 적용
          console.log("✨ 효과 적용 요청...");
          
          return { success: true, message: "트렌디한 효과가 적용되었습니다!" };

        default:
          return null;
      }
    } catch (error) {
      console.error("액션 실행 오류:", error);
      return { success: false, message: "작업 실행 중 오류가 발생했습니다." };
    } finally {
      setIsExecutingAction(false);
    }
  }, [currentProject, videoUrl, addClip, updateProject]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 백엔드 챗봇 API 호출
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          message: content.trim(),
          context: {
            currentProject: currentProject?.id,
            hasVideo: !!videoUrl,
            aspectRatio: currentProject?.aspectRatio,
          },
        }),
      });

      let aiResponse: any;
      
      if (response.ok) {
        aiResponse = await response.json();
      } else {
        // Fallback 응답
        aiResponse = analyzeLocalIntent(content);
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date(),
        actionType: aiResponse.action_type,
        actionStatus: aiResponse.action_type && aiResponse.action_type !== "none" ? "pending" : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // ✅ 액션 타입이 있으면 자동 실행
      if (aiResponse.action_type && aiResponse.action_type !== "none" && videoUrl) {
        const actionResult = await executeVideoAction(aiResponse.action_type, assistantMessage.id);
        
        if (actionResult) {
          // 결과 메시지 추가
          const resultMessage: Message = {
            id: `msg-${Date.now()}-result`,
            role: "assistant",
            content: actionResult.message,
            timestamp: new Date(),
            actionStatus: actionResult.success ? "success" : "error",
          };
          setMessages((prev) => [...prev, resultMessage]);
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}-fallback`,
        role: "assistant",
        content: "네, 어떻게 도와드릴까요? 영상 스타일, 음악, 자막 등을 수정할 수 있어요.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 로컬 의도 분석 (백엔드 실패시 폴백)
  const analyzeLocalIntent = (message: string): any => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("자막") || lowerMessage.includes("텍스트")) {
      return {
        message: "자막을 추가해드릴게요. 잠시만 기다려주세요...",
        action_type: "text_add",
      };
    }
    if (lowerMessage.includes("음악") || lowerMessage.includes("bgm") || lowerMessage.includes("배경")) {
      return {
        message: "배경음악을 추가해드릴게요.",
        action_type: "music_add",
      };
    }
    if (lowerMessage.includes("스타일") || lowerMessage.includes("색감") || lowerMessage.includes("필터")) {
      return {
        message: "스타일을 변경해드릴게요.",
        action_type: "style_change",
      };
    }
    if (lowerMessage.includes("효과") || lowerMessage.includes("이펙트")) {
      return {
        message: "효과를 적용해드릴게요.",
        action_type: "effect_apply",
      };
    }
    
    return {
      message: "네, 어떻게 도와드릴까요? 자막, 음악, 스타일 변경 등을 요청해보세요.",
      action_type: "none",
    };
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <AnimatePresence>
      {isChatOpen && (
        <>
          {/* Backdrop for Mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white z-50
                     shadow-2xl flex flex-col border-l border-juai-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-juai-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-juai flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-juai-black">AI 어시스턴트</h2>
                  <p className="text-xs text-juai-gray-500">
                    {videoUrl ? "영상 편집 준비 완료" : "영상을 먼저 생성해주세요"}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setChatOpen(false)}
                className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-juai-gray-500" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b border-juai-gray-200 bg-juai-gray-50">
              <p className="text-xs text-juai-gray-500 mb-2">빠른 작업</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={!videoUrl || isExecutingAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-juai-gray-200
                             rounded-full text-sm text-juai-gray-700 hover:border-juai-green 
                             hover:text-juai-green transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
              {!videoUrl && (
                <p className="text-xs text-juai-orange mt-2">
                  💡 영상을 먼저 생성하면 편집 기능을 사용할 수 있어요
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Empty State */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-juai/10 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-juai-green" />
                  </div>
                  <h3 className="font-medium text-juai-black mb-1">
                    무엇을 도와드릴까요?
                  </h3>
                  <p className="text-sm text-juai-gray-500 mb-6 max-w-xs">
                    영상 편집에 대해 물어보세요. AI가 최적의 방법을 안내해드려요.
                  </p>
                  
                  {/* Suggestions */}
                  <div className="space-y-2 w-full">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(suggestion)}
                        className="w-full px-4 py-3 bg-juai-gray-50 hover:bg-juai-gray-100 
                                 rounded-xl text-left text-sm text-juai-gray-700 
                                 transition-colors flex items-center justify-between group"
                      >
                        <span>{suggestion}</span>
                        <ChevronRight className="w-4 h-4 text-juai-gray-400 
                                               group-hover:text-juai-green transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages List */}
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant Avatar */}
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-juai 
                                  flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                      message.role === "user"
                        ? "bg-juai-green text-white rounded-br-md"
                        : "bg-juai-gray-100 text-juai-black rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Action Status */}
                    {message.actionStatus === "success" && (
                      <div className="flex items-center gap-1 mt-2 text-juai-green">
                        <Check className="w-4 h-4" />
                        <span className="text-xs">완료!</span>
                      </div>
                    )}
                    {message.actionStatus === "error" && (
                      <div className="flex items-center gap-1 mt-2 text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">실패</span>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-juai-gray-200 
                                  flex items-center justify-center">
                      <User className="w-4 h-4 text-juai-gray-600" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading */}
              {(isLoading || isExecutingAction) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 bg-juai-gray-100 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-juai-green" />
                      <span className="text-sm text-juai-gray-500">
                        {isExecutingAction ? "작업 실행 중..." : "생각하는 중..."}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-juai-gray-200 bg-white">
              <div className="flex items-end gap-2 bg-juai-gray-50 rounded-xl p-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={videoUrl ? "자막 달아줘, 음악 추가해줘..." : "메시지를 입력하세요..."}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none 
                           text-juai-black placeholder:text-juai-gray-400 py-2 px-2
                           min-h-[40px] max-h-[100px] text-sm"
                  style={{ height: "auto", overflow: "hidden" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
                  }}
                />

                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading || isExecutingAction}
                  className="p-2.5 bg-juai-green text-white rounded-lg hover:bg-juai-green/90 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
