/**
 * Zustand Store - 전역 상태 관리
 * Super Agent Platform - VIDEO FIRST Architecture
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  credits: number;
  plan: "free" | "pro" | "enterprise";
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actionCards?: ActionCard[];
}

export interface ActionCard {
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  actions: { label: string; action: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Video First Types
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type RenderStatus = "idle" | "preparing" | "rendering" | "completed" | "failed";

export interface VideoProject {
  id: string;
  title: string;
  description?: string;
  aspectRatio: AspectRatio;
  status: RenderStatus;
  progress: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // seconds
  createdAt: Date;
  updatedAt: Date;
  preset?: string;
  industry?: string;
  sourceImageUrl?: string; // Image-to-Video용 소스 이미지 URL
}

export interface TimelineClip {
  id: string;
  type: "video" | "image" | "audio" | "text";
  startTime: number; // ms
  duration: number; // ms
  sourceUrl?: string;
  label: string;
  layer: number;
}

export interface Project {
  id: string;
  title: string;
  status: "waiting" | "processing" | "completed" | "failed";
  industry: string;
  targetChannel: string[];
  aspectRatio: string;
  createdAt: Date;
  thumbnail?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
}

// ============================================
// User Store
// ============================================

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  updateCredits: (credits: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false 
      }),
      
      updateCredits: (credits) => set((state) => ({
        user: state.user ? { ...state.user, credits } : null
      })),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ============================================
// Video Store (NEW - Video First Architecture)
// ============================================

interface VideoState {
  // Current Video State
  currentProject: VideoProject | null;
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // Render Progress
  renderStatus: RenderStatus;
  renderProgress: number;
  renderMessage: string;
  
  // Timeline
  timeline: TimelineClip[];
  selectedClipId: string | null;
  
  // Projects List
  projects: VideoProject[];
  
  // Actions
  setCurrentProject: (project: VideoProject | null) => void;
  setVideoUrl: (url: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Render Actions
  startRender: (projectId: string) => void;
  updateRenderProgress: (progress: number, message?: string) => void;
  completeRender: (videoUrl: string) => void;
  failRender: (error: string) => void;
  resetRender: () => void;
  
  // Timeline Actions
  addClip: (clip: TimelineClip) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  selectClip: (clipId: string | null) => void;
  
  // Project Actions
  addProject: (project: VideoProject) => void;
  updateProject: (projectId: string, updates: Partial<VideoProject>) => void;
  deleteProject: (projectId: string) => void;
  loadProjects: (projects: VideoProject[]) => void;
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentProject: null,
      videoUrl: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      
      renderStatus: "idle",
      renderProgress: 0,
      renderMessage: "",
      
      timeline: [],
      selectedClipId: null,
      
      projects: [],
      
      // Video Controls
      setCurrentProject: (project) => set({ 
        currentProject: project,
        videoUrl: project?.videoUrl || null,
        renderStatus: project?.status || "idle",
        renderProgress: project?.progress || 0,
      }),
      
      setVideoUrl: (url) => set({ videoUrl: url }),
      
      setPlaying: (playing) => set({ isPlaying: playing }),
      
      setCurrentTime: (time) => set({ currentTime: time }),
      
      setDuration: (duration) => set({ duration }),
      
      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      
      // Render Controls
      startRender: (projectId) => set({
        renderStatus: "preparing",
        renderProgress: 0,
        renderMessage: "영상 제작 준비 중...",
      }),
      
      updateRenderProgress: (progress, message) => set({
        renderStatus: "rendering",
        renderProgress: progress,
        renderMessage: message || `렌더링 중... ${progress}%`,
      }),
      
      completeRender: (videoUrl) => set({
        renderStatus: "completed",
        renderProgress: 100,
        renderMessage: "영상 제작 완료!",
        videoUrl,
        isPlaying: true, // Auto-play on complete
      }),
      
      failRender: (error) => set({
        renderStatus: "failed",
        renderMessage: error,
      }),
      
      resetRender: () => set({
        renderStatus: "idle",
        renderProgress: 0,
        renderMessage: "",
      }),
      
      // Timeline Controls
      addClip: (clip) => set((state) => ({
        timeline: [...state.timeline, clip],
      })),
      
      removeClip: (clipId) => set((state) => ({
        timeline: state.timeline.filter((c) => c.id !== clipId),
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      })),
      
      updateClip: (clipId, updates) => set((state) => ({
        timeline: state.timeline.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      })),
      
      selectClip: (clipId) => set({ selectedClipId: clipId }),
      
      // Project Management
      addProject: (project) => set((state) => ({
        projects: [project, ...state.projects],
      })),
      
      updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
        currentProject: state.currentProject?.id === projectId
          ? { ...state.currentProject, ...updates, updatedAt: new Date() }
          : state.currentProject,
      })),
      
      deleteProject: (projectId) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId
          ? null
          : state.currentProject,
      })),
      
      loadProjects: (projects) => set({ projects }),
    }),
    {
      name: "video-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects.slice(0, 10), // 최근 10개 프로젝트만 저장
        volume: state.volume,
        isMuted: state.isMuted,
      }),
    }
  )
);

// ============================================
// Chat Store (축소 - 보조 역할)
// ============================================

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  suggestions: string[];
  isChatOpen: boolean; // NEW: 사이드바 열림 상태
  
  // Actions
  createSession: () => string;
  setCurrentSession: (sessionId: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  clearSessions: () => void;
  setLoading: (loading: boolean) => void;
  setSuggestions: (suggestions: string[]) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  
  // Getters
  getCurrentSession: () => ChatSession | undefined;
  getCurrentMessages: () => Message[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      isChatOpen: false,
      suggestions: [
        "영상 스타일 추천해줘",
        "이 영상에 자막 추가해줘",
        "배경음악 바꿔줘",
      ],
      
      createSession: () => {
        const newSession: ChatSession = {
          id: `session_${Date.now()}`,
          title: "새 대화",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }));
        
        return newSession.id;
      },
      
      setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
      
      addMessage: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, message],
                updatedAt: new Date(),
                title: session.messages.length === 0 && message.role === "user"
                  ? message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
                  : session.title,
              }
            : session
        ),
      })),
      
      updateSessionTitle: (sessionId, title) => set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId ? { ...session, title } : session
        ),
      })),
      
      deleteSession: (sessionId) => set((state) => {
        const newSessions = state.sessions.filter((s) => s.id !== sessionId);
        return {
          sessions: newSessions,
          currentSessionId: state.currentSessionId === sessionId
            ? newSessions[0]?.id || null
            : state.currentSessionId,
        };
      }),
      
      clearSessions: () => set({ sessions: [], currentSessionId: null }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setSuggestions: (suggestions) => set({ suggestions }),
      
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      
      setChatOpen: (open) => set({ isChatOpen: open }),
      
      getCurrentSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.currentSessionId);
      },
      
      getCurrentMessages: () => {
        const session = get().getCurrentSession();
        return session?.messages || [];
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        sessions: state.sessions.slice(0, 20),
        currentSessionId: state.currentSessionId 
      }),
    }
  )
);

// ============================================
// Project Store
// ============================================

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;
  filter: "all" | "waiting" | "processing" | "completed" | "failed";
  
  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  setFilter: (filter: ProjectState["filter"]) => void;
  setLoading: (loading: boolean) => void;
  
  // Getters
  getFilteredProjects: () => Project[];
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  filter: "all",
  
  setProjects: (projects) => set({ projects }),
  
  addProject: (project) => set((state) => ({
    projects: [project, ...state.projects],
  })),
  
  updateProject: (projectId, updates) => set((state) => ({
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, ...updates } : p
    ),
  })),
  
  deleteProject: (projectId) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== projectId),
    currentProjectId: state.currentProjectId === projectId
      ? null
      : state.currentProjectId,
  })),
  
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
  
  setFilter: (filter) => set({ filter }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  getFilteredProjects: () => {
    const { projects, filter } = get();
    if (filter === "all") return projects;
    return projects.filter((p) => p.status === filter);
  },
}));

// ============================================
// Notification Store
// ============================================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => set((state) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      read: false,
      createdAt: new Date(),
    };
    
    return {
      notifications: [newNotification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    };
  }),
  
  markAsRead: (notificationId) => set((state) => {
    const notification = state.notifications.find((n) => n.id === notificationId);
    if (!notification || notification.read) return state;
    
    return {
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

// ============================================
// UI Store
// ============================================

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  showNewProjectModal: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: UIState["theme"]) => void;
  setShowNewProjectModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: "light",
      showNewProjectModal: false,
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setShowNewProjectModal: (show) => set({ showNewProjectModal: show }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
