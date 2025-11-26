"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
  CreditCard,
} from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    credits: number;
  };
}

export default function Header({ onMenuClick, user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "영상 생성 완료",
      message: "카페 브이로그 쇼츠가 생성되었습니다.",
      time: "5분 전",
      read: false,
    },
    {
      id: 2,
      title: "새로운 트렌드",
      message: "ASMR 콘텐츠가 인기를 끌고 있습니다.",
      time: "1시간 전",
      read: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-juai-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Menu & Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-juai-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-juai flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-juai-black text-lg leading-tight">
                  Super Agent
                </h1>
                <p className="text-xs text-juai-gray-500">by Studio Juai</p>
              </div>
            </div>
          </div>

          {/* Center: Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-juai-gray-400" />
              <input
                type="text"
                placeholder="프로젝트, 템플릿, 트렌드 검색..."
                className="w-full pl-10 pr-4 py-2 bg-juai-gray-50 border border-juai-gray-200 
                         rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-juai-green/50 
                         focus:border-juai-green transition-all"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Credits Badge */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-juai-green/10 rounded-full">
                <Zap className="w-4 h-4 text-juai-green" />
                <span className="text-sm font-medium text-juai-green">
                  {user.credits.toLocaleString()} 크레딧
                </span>
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-juai-gray-600" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-juai-orange rounded-full" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-juai-xl 
                             border border-juai-gray-200 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-juai-gray-100">
                      <h3 className="font-semibold text-juai-black">알림</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-juai-gray-50 cursor-pointer border-b border-juai-gray-50 last:border-0
                                    ${!notification.read ? "bg-juai-green/5" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                notification.read ? "bg-juai-gray-300" : "bg-juai-green"
                              }`}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm text-juai-black">
                                {notification.title}
                              </p>
                              <p className="text-sm text-juai-gray-500">
                                {notification.message}
                              </p>
                              <p className="text-xs text-juai-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-juai-gray-100">
                      <button className="w-full text-center text-sm text-juai-green font-medium hover:underline">
                        모든 알림 보기
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-juai-gray-100 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-juai flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-juai-gray-400 hidden sm:block" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-juai-xl 
                             border border-juai-gray-200 overflow-hidden z-50"
                  >
                    {/* User Info */}
                    <div className="px-4 py-4 border-b border-juai-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-juai flex items-center justify-center">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user?.name || "User"}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-juai-black truncate">
                            {user?.name || "Guest User"}
                          </p>
                          <p className="text-sm text-juai-gray-500 truncate">
                            {user?.email || "guest@example.com"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Credits (Mobile) */}
                    <div className="px-4 py-3 border-b border-juai-gray-100 sm:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-juai-gray-500">크레딧</span>
                        <div className="flex items-center gap-1 text-juai-green font-medium">
                          <Zap className="w-4 h-4" />
                          <span>{user?.credits?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-juai-gray-700 hover:bg-juai-gray-50 transition-colors">
                        <CreditCard className="w-5 h-5" />
                        <span>크레딧 충전</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-juai-gray-700 hover:bg-juai-gray-50 transition-colors">
                        <Settings className="w-5 h-5" />
                        <span>설정</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="py-2 border-t border-juai-gray-100">
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span>로그아웃</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
