"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Video,
  Image,
  Music,
  MoreVertical,
  Play,
  Download,
  Trash2,
  Edit3,
  Clock,
  TrendingUp,
  Zap,
  Settings,
  BarChart3,
  Users,
  FolderOpen,
  Sparkles,
  ChevronRight,
  Calendar,
  Tag,
  Upload,
  AlertCircle,
} from "lucide-react";

// Types
interface Project {
  id: string;
  title: string;
  status: "waiting" | "processing" | "completed" | "failed";
  industry: string;
  targetChannel: string[];
  aspectRatio: string;
  createdAt: Date;
  thumbnail?: string;
  assets: Asset[];
}

interface Asset {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  status: string;
}

interface DashboardProps {
  onBack: () => void;
}

// Mock Data
const mockProjects: Project[] = [
  {
    id: "1",
    title: "카페 브이로그 쇼츠",
    status: "completed",
    industry: "F&B",
    targetChannel: ["youtube_shorts", "instagram_reels"],
    aspectRatio: "9:16",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    thumbnail: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    assets: [
      { id: "a1", type: "video", url: "", status: "created" },
      { id: "a2", type: "image", url: "", status: "created" },
    ],
  },
  {
    id: "2",
    title: "신상품 런칭 광고",
    status: "processing",
    industry: "패션",
    targetChannel: ["tiktok"],
    aspectRatio: "9:16",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    thumbnail: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400",
    assets: [],
  },
  {
    id: "3",
    title: "여행 ASMR",
    status: "waiting",
    industry: "여행",
    targetChannel: ["youtube_shorts"],
    aspectRatio: "9:16",
    createdAt: new Date(Date.now() - 1000 * 60 * 10),
    thumbnail: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400",
    assets: [],
  },
];

const mockStats = {
  totalProjects: 12,
  completedProjects: 8,
  totalAssets: 45,
  creditsUsed: 2500,
  creditsRemaining: 7500,
};

// API Base URL
const API_BASE_URL = "https://studio-juai-pro-production.up.railway.app";

export default function Dashboard({ onBack }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" || project.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  // Status badge color - 다크 모드 최적화
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[#03C75A]/20 text-[#03C75A]";
      case "processing":
        return "bg-orange-500/20 text-orange-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "완료";
      case "processing":
        return "제작 중";
      case "failed":
        return "실패";
      default:
        return "대기 중";
    }
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Header - 다크 모드 */}
      <header className="sticky top-0 z-40 bg-[#1E1E1E] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-white">워크스페이스</h1>
                <p className="text-sm text-gray-400">프로젝트 관리 및 편집</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNewProjectModal(true)}
                className="bg-[#03C75A] hover:bg-[#02b350] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">새 프로젝트</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - 다크 모드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#03C75A]/20 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-[#03C75A]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">전체 프로젝트</p>
                <p className="text-2xl font-bold text-white">
                  {mockStats.totalProjects}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">완료된 영상</p>
                <p className="text-2xl font-bold text-white">
                  {mockStats.completedProjects}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">생성된 자산</p>
                <p className="text-2xl font-bold text-white">
                  {mockStats.totalAssets}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">크레딧</p>
                <p className="text-2xl font-bold text-white">
                  {mockStats.creditsRemaining.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters & Search - 다크 모드 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E1E] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#03C75A] transition-colors"
            />
          </div>

          {/* Filter & View Toggle */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#1E1E1E] border border-gray-800 rounded-xl p-1">
              {["all", "completed", "processing", "waiting"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    selectedFilter === filter
                      ? "bg-[#03C75A] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {filter === "all"
                    ? "전체"
                    : filter === "completed"
                    ? "완료"
                    : filter === "processing"
                    ? "진행 중"
                    : "대기"}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-[#1E1E1E] border border-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid/List - 다크 모드 */}
        <AnimatePresence mode="wait">
          {filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                새 프로젝트를 만들어 콘텐츠 제작을 시작하세요
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-[#03C75A] hover:bg-[#02b350] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <Plus className="w-5 h-5" />
                새 프로젝트 만들기
              </button>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4 group cursor-pointer hover:border-[#03C75A]/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-800 rounded-xl mb-4 overflow-hidden">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <button className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-colors">
                          <Play className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex items-center gap-2">
                          <button className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-colors">
                            <Edit3 className="w-4 h-4 text-white" />
                          </button>
                          <button className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-colors">
                            <Download className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-semibold text-white mb-1 truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                      <Tag className="w-4 h-4" />
                      <span>{project.industry}</span>
                      <span>•</span>
                      <span>{project.aspectRatio}</span>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(project.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" />
                        <span>{project.assets.length} 자산</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#03C75A]/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{project.industry}</span>
                      <span>•</span>
                      <span>{project.aspectRatio}</span>
                      <span>•</span>
                      <span>
                        {new Date(project.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {getStatusText(project.status)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Play className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <NewProjectModal onClose={() => setShowNewProjectModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// New Project Modal Component - 다크 모드
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const industries = ["F&B", "패션", "뷰티", "테크", "여행", "라이프스타일", "교육", "기타"];
  const channelOptions = [
    { id: "youtube_shorts", label: "YouTube Shorts" },
    { id: "instagram_reels", label: "Instagram Reels" },
    { id: "tiktok", label: "TikTok" },
  ];
  const aspectRatios = ["9:16", "16:9", "1:1", "4:5"];

  // 이미지 업로드 함수 - 강화된 try-catch
  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // 파일 유효성 검사
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("허용되지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 가능)");
      }
      
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("파일 크기는 10MB를 초과할 수 없습니다.");
      }
      
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Supabase Storage 버킷 관련 에러 처리
        if (response.status === 503) {
          throw new Error("스토리지 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.");
        }
        if (response.status === 500) {
          throw new Error("스토리지 버킷을 확인해주세요. (Supabase Storage 설정 필요)");
        }
        
        throw new Error(errorData.detail || `업로드 실패 (${response.status})`);
      }
      
      const data = await response.json();
      setUploadedImageUrl(data.url);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setUploadError(errorMessage);
      
      // 사용자에게 명확한 알림
      alert(`이미지 업로드 실패: ${errorMessage}\n\n스토리지 버킷을 확인해주세요.`);
      
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    console.log({ title, industry, channels, aspectRatio, uploadedImageUrl });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 z-50"
      />

      {/* Modal - 다크 모드 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                 w-full max-w-lg bg-[#1E1E1E] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#03C75A] to-[#02a34a] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">새 프로젝트</h2>
              <p className="text-sm text-gray-400">AI가 최적의 콘텐츠를 제작합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-400 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              프로젝트 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 신상품 런칭 쇼츠"
              className="w-full px-4 py-2.5 bg-[#111111] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#03C75A] transition-colors"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              참조 이미지 (선택)
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                ${uploadedImageUrl 
                  ? "border-[#03C75A] bg-[#03C75A]/10" 
                  : "border-gray-700 hover:border-gray-600 bg-[#111111]"
                }
                ${isUploading ? "opacity-50 pointer-events-none" : ""}
              `}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) uploadImage(file);
                };
                input.click();
              }}
            >
              {isUploading ? (
                <div className="py-4">
                  <div className="w-8 h-8 border-2 border-[#03C75A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-400">업로드 중...</p>
                </div>
              ) : uploadedImageUrl ? (
                <div className="relative">
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded"
                    className="max-h-24 mx-auto rounded"
                  />
                  <p className="text-xs text-[#03C75A] mt-2">✓ 이미지 업로드 완료</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">클릭하여 이미지 업로드</p>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, GIF (최대 10MB)</p>
                </div>
              )}
            </div>
            
            {/* Upload Error */}
            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              업종
            </label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    industry === ind
                      ? "bg-[#03C75A] text-white"
                      : "bg-[#111111] border border-gray-700 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              타겟 채널
            </label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    if (channels.includes(channel.id)) {
                      setChannels(channels.filter((c) => c !== channel.id));
                    } else {
                      setChannels([...channels, channel.id]);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    channels.includes(channel.id)
                      ? "bg-orange-500 text-white"
                      : "bg-[#111111] border border-gray-700 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {channel.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              화면 비율
            </label>
            <div className="flex gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    aspectRatio === ratio
                      ? "bg-white text-[#111111]"
                      : "bg-[#111111] border border-gray-700 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-400 hover:bg-gray-700 rounded-xl transition-colors"
          >
            취소
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!title || !industry || channels.length === 0}
            className="bg-[#03C75A] hover:bg-[#02b350] text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            생성 시작
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
