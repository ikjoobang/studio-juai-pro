"use client";

/**
 * ChatSidebar - AI 어시스턴트 채팅
 * PREMIERE PRO STYLE: embedded 모드 지원 (우측 패널에 내장)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  User,
  MessageSquare,
  Loader2,
  ChevronRight,
  Wand2,
  Palette,
  Music2,
  Type,
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
}

interface ChatSidebarProps {
  embedded?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const quickActions = [
  { id: "style", label: "스타일", icon: <Palette className="w-3 h-3" />, prompt: "이 영상의 색감을 바꿔줘" },
  { id: "music", label: "음악", icon: <Music2 className="w-3 h-3" />, prompt: "배경음악 추천해줘" },
  { id: "text", label: "자막", icon: <Type className="w-3 h-3" />, prompt: "영상에 자막을 추가해줘" },
  { id: "effect", label: "효과", icon: <Wand2 className="w-3 h-3" />, prompt: "트렌디한 효과를 적용해줘" },
];

export default function ChatSidebar({ embedded = false }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { isChatOpen, setChatOpen, suggestions } = useChatStore();
  const { currentProject, videoUrl, addClip, updateProject } = useVideoStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ((isChatOpen || embedded) && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen, embedded]);

  const executeVideoAction = useCallback(async (actionType: string) => {
    if (!currentProject || !videoUrl) return null;

    setIsExecutingAction(true);

    try {
      switch (actionType) {
        case "text_add":
          const subtitleResponse = await fetch(`${API_BASE_URL}/api/creatomate/auto-edit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: currentProject.id,
              template_id: "subtitle_template_01",
              headline: currentProject.title,
              subheadline: "AI 자동 생성 자막",
              background_video_url: videoUrl,
              brand_color: "#03C75A",
            }),
          });

          if (subtitleResponse.ok) {
            const subtitleClip: TimelineClip = {
              id: `subtitle_${Date.now()}`,
              type: "text",
              startTime: 1000,
              duration: 5000,
              label: "자막",
              layer: 2,
            };
            addClip(subtitleClip);
            return { success: true, message: "자막이 추가되었습니다!" };
          }
          throw new Error("자막 추가 실패");

        case "music_add":
          const musicClip: TimelineClip = {
            id: `music_${Date.now()}`,
            type: "audio",
            startTime: 0,
            duration: 15000,
            label: "배경음악",
            layer: 3,
          };
          addClip(musicClip);
          return { success: true, message: "배경음악이 추가되었습니다!" };

        case "style_change":
          const presets = ["warm_film", "cool_modern", "golden_hour", "cinematic_teal_orange"];
          const currentPreset = currentProject.preset || "warm_film";
          const currentIndex = presets.indexOf(currentPreset);
          const newPreset = presets[(currentIndex + 1) % presets.length];
          updateProject(currentProject.id, { preset: newPreset });
          return { success: true, message: `스타일이 '${newPreset}'로 변경되었습니다!` };

        case "effect_apply":
          return { success: true, message: "트렌디한 효과가 적용되었습니다!" };

        default:
          return null;
      }
    } catch (error) {
      return { success: false, message: "작업 실행 중 오류가 발생했습니다." };
    } finally {
      setIsExecutingAction(false);
    }
  }, [currentProject, videoUrl, addClip, updateProject]);

  const analyzeLocalIntent = (message: string): any => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("자막") || lowerMessage.includes("텍스트")) {
      return { message: "자막을 추가해드릴게요.", action_type: "text_add" };
    }
    if (lowerMessage.includes("음악") || lowerMessage.includes("bgm") || lowerMessage.includes("배경")) {
      return { message: "배경음악을 추가해드릴게요.", action_type: "music_add" };
    }
    if (lowerMessage.includes("스타일") || lowerMessage.includes("색감") || lowerMessage.includes("필터")) {
      return { message: "스타일을 변경해드릴게요.", action_type: "style_change" };
    }
    if (lowerMessage.includes("효과") || lowerMessage.includes("이펙트")) {
      return { message: "효과를 적용해드릴게요.", action_type: "effect_apply" };
    }
    
    return { message: "자막, 음악, 스타일 변경 등을 요청해보세요.", action_type: "none" };
  };

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
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          message: content.trim(),
          context: {
            currentProject: currentProject?.id,
            hasVideo: !!videoUrl,
          },
        }),
      });

      let aiResponse = response.ok ? await response.json() : analyzeLocalIntent(content);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date(),
        actionType: aiResponse.action_type,
        actionStatus: aiResponse.action_type && aiResponse.action_type !== "none" ? "pending" : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (aiResponse.action_type && aiResponse.action_type !== "none" && videoUrl) {
        const actionResult = await executeVideoAction(aiResponse.action_type);
        
        if (actionResult) {
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
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}-fallback`,
        role: "assistant",
        content: "자막, 음악, 스타일 등을 수정할 수 있어요.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Embedded 모드 (우측 패널에 내장)
  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        {/* Quick Actions */}
        <div className="px-2 py-2 border-b border-[#333]">
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => sendMessage(action.prompt)}
                disabled={!videoUrl || isExecutingAction}
                className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444]
                         rounded text-xs text-gray-300 disabled:opacity-30"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-gray-500 text-xs">무엇을 도와드릴까요?</p>
              <div className="mt-3 space-y-1 w-full">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    className="w-full px-2 py-1.5 bg-[#252525] hover:bg-[#333] 
                             rounded text-left text-xs text-gray-400"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-6 h-6 rounded bg-gradient-juai flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-2 py-1.5 rounded-lg text-xs ${
                  message.role === "user"
                    ? "bg-juai-green text-white"
                    : "bg-[#333] text-gray-200"
                }`}
              >
                {message.content}
                {message.actionStatus === "success" && (
                  <span className="flex items-center gap-1 mt-1 text-green-400">
                    <Check className="w-3 h-3" /> 완료
                  </span>
                )}
              </div>
            </div>
          ))}

          {(isLoading || isExecutingAction) && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-gradient-juai flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="px-2 py-1.5 bg-[#333] rounded-lg">
                <Loader2 className="w-3 h-3 animate-spin text-juai-green" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-2 border-t border-[#333]">
          <div className="flex items-center gap-1 bg-[#252525] rounded p-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지 입력..."
              className="flex-1 bg-transparent text-white text-xs px-2 py-1 outline-none placeholder-gray-500"
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="p-1.5 bg-juai-green text-white rounded disabled:opacity-30"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original Floating Sidebar Mode
  return (
    <AnimatePresence>
      {isChatOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[380px] bg-white z-50
                     shadow-2xl flex flex-col border-l border-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-juai flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">AI 어시스턴트</h2>
                  <p className="text-xs text-gray-500">
                    {videoUrl ? "편집 준비 완료" : "영상을 먼저 생성해주세요"}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={!videoUrl || isExecutingAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200
                             rounded-full text-sm text-gray-700 hover:border-juai-green 
                             disabled:opacity-50"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-juai-green/50 mb-3" />
                  <p className="text-gray-500 text-sm">무엇을 도와드릴까요?</p>
                </div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-juai flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      message.role === "user"
                        ? "bg-juai-green text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.content}
                    {message.actionStatus === "success" && (
                      <div className="flex items-center gap-1 mt-1 text-green-500">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">완료</span>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  )}
                </motion.div>
              ))}

              {(isLoading || isExecutingAction) && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-juai flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-3 py-2 bg-gray-100 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-juai-green" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="메시지 입력..."
                  className="flex-1 bg-transparent text-gray-800 text-sm px-2 outline-none placeholder-gray-400"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2 bg-juai-green text-white rounded-lg disabled:opacity-50"
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
