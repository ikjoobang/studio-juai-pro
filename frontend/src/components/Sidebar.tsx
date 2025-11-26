"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X,
  Plus,
  MessageSquare,
  Video,
  TrendingUp,
  Zap,
  Settings,
  LogOut,
  FolderOpen,
  Sparkles,
  Layout,
  Image,
  Music,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  currentPath?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof MessageSquare;
  href: string;
  badge?: string;
  badgeColor?: string;
}

interface RecentProject {
  id: string;
  title: string;
  status: "completed" | "processing" | "waiting";
  time: string;
}

export default function Sidebar({ isOpen, onClose, onNewChat, currentPath = "/" }: SidebarProps) {
  const [activeSection, setActiveSection] = useState<string>("main");

  const mainNavItems: NavItem[] = [
    { id: "chat", label: "AI 챗봇", icon: MessageSquare, href: "/" },
    { id: "workspace", label: "워크스페이스", icon: FolderOpen, href: "/workspace" },
    { id: "trends", label: "트렌드", icon: TrendingUp, href: "/trends", badge: "Hot", badgeColor: "bg-juai-orange" },
    { id: "templates", label: "템플릿", icon: Layout, href: "/templates" },
    { id: "api-hub", label: "API Hub", icon: Zap, href: "/api-hub", badge: "New", badgeColor: "bg-juai-green" },
  ];

  const createNavItems: NavItem[] = [
    { id: "video", label: "영상 생성", icon: Video, href: "/create/video" },
    { id: "image", label: "이미지 생성", icon: Image, href: "/create/image" },
    { id: "audio", label: "음성 합성", icon: Music, href: "/create/audio" },
  ];

  const recentProjects: RecentProject[] = [
    { id: "1", title: "카페 브이로그 쇼츠", status: "completed", time: "2시간 전" },
    { id: "2", title: "신상품 런칭 광고", status: "processing", time: "30분 전" },
    { id: "3", title: "여행 ASMR", status: "waiting", time: "10분 전" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-juai-green";
      case "processing":
        return "bg-juai-orange animate-pulse";
      default:
        return "bg-juai-gray-400";
    }
  };

  const isActive = (href: string) => currentPath === href;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Sidebar Content */}
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-[280px] bg-juai-night z-50 
                     flex flex-col border-r border-juai-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-juai-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-juai flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-lg">Studio Juai</span>
                  <p className="text-xs text-juai-gray-500">Super Agent Platform</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-juai-gray-400 hover:text-white hover:bg-juai-gray-800 
                         rounded-lg transition-colors lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                         bg-gradient-juai text-white font-medium rounded-xl
                         hover:opacity-90 transition-opacity shadow-lg shadow-juai-green/20"
              >
                <Plus className="w-5 h-5" />
                <span>새 대화 시작</span>
              </motion.button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {/* Main Section */}
              <div className="mb-4">
                <p className="px-3 py-2 text-xs font-semibold text-juai-gray-500 uppercase tracking-wider">
                  메인
                </p>
                {mainNavItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                              ${isActive(item.href)
                                ? "bg-juai-green/20 text-juai-green"
                                : "text-juai-gray-400 hover:text-white hover:bg-juai-gray-800"
                              }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Create Section */}
              <div className="mb-4">
                <p className="px-3 py-2 text-xs font-semibold text-juai-gray-500 uppercase tracking-wider">
                  생성하기
                </p>
                {createNavItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                              ${isActive(item.href)
                                ? "bg-juai-orange/20 text-juai-orange"
                                : "text-juai-gray-400 hover:text-white hover:bg-juai-gray-800"
                              }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
              </div>

              {/* Recent Projects */}
              <div>
                <p className="px-3 py-2 text-xs font-semibold text-juai-gray-500 uppercase tracking-wider">
                  최근 프로젝트
                </p>
                <div className="space-y-1">
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={onClose}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left
                               text-juai-gray-400 hover:text-white hover:bg-juai-gray-800 
                               rounded-xl transition-all group"
                    >
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate group-hover:text-white transition-colors">
                          {project.title}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-juai-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{project.time}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-juai-gray-800 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-juai-gray-400 
                               hover:text-white hover:bg-juai-gray-800 rounded-xl transition-all">
                <Star className="w-5 h-5" />
                <span>Pro로 업그레이드</span>
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-juai-orange text-white rounded-full">
                  50% OFF
                </span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-juai-gray-400 
                               hover:text-white hover:bg-juai-gray-800 rounded-xl transition-all">
                <Settings className="w-5 h-5" />
                <span>설정</span>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-juai-gray-400 
                               hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                <LogOut className="w-5 h-5" />
                <span>로그아웃</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
