"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Mic,
  Image,
  Video,
  TrendingUp,
  Zap,
  ChevronRight,
  Menu,
  X,
  Plus,
  Settings,
  LogOut,
} from "lucide-react";
import SmartActionCard from "@/components/SmartActionCard";
import Dashboard from "@/components/Dashboard";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionCards?: ActionCard[];
}

interface ActionCard {
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  actions: { label: string; action: string }[];
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  suggestions: string[];
}

// API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  // State
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    suggestions: [
      "쇼츠 영상을 만들고 싶어요",
      "요즘 뜨는 콘텐츠가 뭐예요?",
      "내 브랜드에 맞는 영상 스타일 추천해줘",
    ],
  });
  const [inputValue, setInputValue] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatState.messages]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || chatState.isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      suggestions: [],
    }));

    setInputValue("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          message: content.trim(),
          context: { previousMessages: chatState.messages.slice(-5) },
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        actionCards: data.action_cards,
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        suggestions: data.suggestions || [],
      }));
    } catch (error) {
      console.error("Chat error:", error);
      
      // Fallback response
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}-fallback`,
        role: "assistant",
        content: "안녕하세요! Studio Juai 에이전트입니다. 어떤 콘텐츠를 만들어 드릴까요?",
        timestamp: new Date(),
        actionCards: [
          {
            type: "video_generation",
            title: "영상 제작 시작하기",
            description: "AI가 트렌드를 분석하고 최적의 영상을 제작합니다",
            data: { preset: "iphone_korean" },
            actions: [
              { label: "새 프로젝트 시작", action: "create_project" },
              { label: "템플릿 둘러보기", action: "browse_templates" },
            ],
          },
          {
            type: "trend_analysis",
            title: "트렌드 분석",
            description: "YouTube/Instagram 실시간 트렌드를 확인하세요",
            data: {},
            actions: [{ label: "트렌드 보기", action: "view_trends" }],
          },
        ],
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, fallbackMessage],
        isLoading: false,
        suggestions: [
          "쇼츠 영상을 만들고 싶어요",
          "요즘 뜨는 콘텐츠가 뭐예요?",
          "내 브랜드에 맞는 영상 스타일 추천해줘",
        ],
      }));
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Handle action card click
  const handleActionClick = (cardType: string, action: string, data: any) => {
    console.log("Action clicked:", { cardType, action, data });
    
    if (action === "create_project") {
      setShowDashboard(true);
    } else if (action === "view_trends") {
      sendMessage("요즘 트렌드 분석해줘");
    } else if (action === "browse_templates") {
      sendMessage("영상 템플릿 보여줘");
    }
  };

  // Render Dashboard
  if (showDashboard) {
    return <Dashboard onBack={() => setShowDashboard(false)} />;
  }

  return (
    <div className="flex h-screen bg-juai-paper">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            
            {/* Sidebar Content */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 h-full w-[280px] bg-juai-night z-50 
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
              
              {/* New Chat Button */}
              <div className="p-4">
                <button
                  onClick={() => {
                    setChatState({
                      messages: [],
                      isLoading: false,
                      suggestions: [
                        "쇼츠 영상을 만들고 싶어요",
                        "요즘 뜨는 콘텐츠가 뭐예요?",
                        "내 브랜드에 맞는 영상 스타일 추천해줘",
                      ],
                    });
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-juai-gray-800 
                           hover:bg-juai-gray-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>새 대화</span>
                </button>
              </div>
              
              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                <button
                  onClick={() => {
                    setShowDashboard(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                           hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors"
                >
                  <Video className="w-5 h-5" />
                  <span>워크스페이스</span>
                </button>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <TrendingUp className="w-5 h-5" />
                  <span>트렌드</span>
                </button>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <Zap className="w-5 h-5" />
                  <span>API Hub</span>
                </button>
              </nav>
              
              {/* Bottom Actions */}
              <div className="p-4 border-t border-juai-gray-800 space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>설정</span>
                </button>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-juai-gray-400 
                                 hover:text-white hover:bg-juai-gray-800 rounded-xl transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span>로그아웃</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-juai-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-juai-gray-600" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-juai-black text-sm">Super Agent</h1>
                <p className="text-xs text-juai-gray-500">Active Chatbot</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="badge-juai-green text-xs">
              <span className="w-2 h-2 bg-juai-green rounded-full mr-1.5 animate-pulse"></span>
              Online
            </span>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Welcome Message */}
          {chatState.messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-juai flex items-center justify-center mb-6 animate-float">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-juai-black mb-2">
                안녕하세요! <span className="text-gradient-juai">Studio Juai</span>입니다
              </h2>
              
              <p className="text-juai-gray-500 mb-8 max-w-md">
                AI 기반 콘텐츠 제작 플랫폼에 오신 것을 환영합니다.
                어떤 영상을 만들어 드릴까요?
              </p>
              
              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage("쇼츠 영상을 만들고 싶어요")}
                  className="action-card text-left group"
                >
                  <Video className="w-8 h-8 text-juai-green mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-juai-black mb-1">영상 제작</h3>
                  <p className="text-sm text-juai-gray-500">AI로 쇼츠/릴스 영상 만들기</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage("요즘 뜨는 콘텐츠가 뭐예요?")}
                  className="action-card text-left group"
                >
                  <TrendingUp className="w-8 h-8 text-juai-orange mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-juai-black mb-1">트렌드 분석</h3>
                  <p className="text-sm text-juai-gray-500">실시간 인기 콘텐츠 확인</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDashboard(true)}
                  className="action-card text-left group sm:col-span-2 lg:col-span-1"
                >
                  <Zap className="w-8 h-8 text-juai-green mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-juai-black mb-1">워크스페이스</h3>
                  <p className="text-sm text-juai-gray-500">프로젝트 관리 및 편집</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Chat Messages */}
          <AnimatePresence mode="popLayout">
            {chatState.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Avatar */}
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Message Content */}
                <div className={`max-w-[80%] space-y-3`}>
                  <div
                    className={
                      message.role === "user"
                        ? "chat-message-user"
                        : "chat-message-assistant"
                    }
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Action Cards */}
                  {message.actionCards && message.actionCards.length > 0 && (
                    <div className="space-y-3">
                      {message.actionCards.map((card, cardIndex) => (
                        <SmartActionCard
                          key={cardIndex}
                          card={card}
                          onAction={handleActionClick}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-juai-green flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator */}
          {chatState.isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="chat-message-assistant">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {chatState.suggestions.length > 0 && chatState.messages.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {chatState.suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => sendMessage(suggestion)}
                  className="px-4 py-2 bg-juai-gray-100 hover:bg-juai-gray-200 
                           text-juai-gray-700 text-sm rounded-full transition-colors
                           flex items-center gap-2"
                >
                  {suggestion}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-juai-gray-200 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3 bg-juai-gray-50 rounded-2xl p-2">
              {/* Attachment Buttons */}
              <div className="flex items-center gap-1 pb-2">
                <button className="p-2 text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100 rounded-lg transition-colors">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-2 text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100 rounded-lg transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none 
                         text-juai-black placeholder:text-juai-gray-400 py-2 px-2
                         min-h-[40px] max-h-[120px]"
                style={{
                  height: "auto",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || chatState.isLoading}
                className="p-3 bg-juai-green text-white rounded-xl hover:bg-juai-green/90 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all
                         flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-center text-juai-gray-400 mt-2">
              Super Agent는 AI 기반으로 최적의 콘텐츠를 제안합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
