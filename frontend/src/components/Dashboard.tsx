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

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-juai-green/10 text-juai-green";
      case "processing":
        return "bg-juai-orange/10 text-juai-orange";
      case "failed":
        return "bg-red-100 text-red-600";
      default:
        return "bg-juai-gray-100 text-juai-gray-600";
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
    <div className="min-h-screen bg-juai-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-juai-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-juai-gray-600" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-juai-black">워크스페이스</h1>
                <p className="text-sm text-juai-gray-500">프로젝트 관리 및 편집</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-juai-gray-600" />
              </button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNewProjectModal(true)}
                className="btn-juai-primary flex items-center gap-2"
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-juai"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-juai-green/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-juai-green" />
              </div>
              <div>
                <p className="text-sm text-juai-gray-500">전체 프로젝트</p>
                <p className="text-2xl font-bold text-juai-black">
                  {mockStats.totalProjects}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-juai"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-juai-orange/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-juai-orange" />
              </div>
              <div>
                <p className="text-sm text-juai-gray-500">완료된 영상</p>
                <p className="text-2xl font-bold text-juai-black">
                  {mockStats.completedProjects}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-juai"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-juai-gray-500">생성된 자산</p>
                <p className="text-2xl font-bold text-juai-black">
                  {mockStats.totalAssets}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-juai"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-juai-gray-500">크레딧</p>
                <p className="text-2xl font-bold text-juai-black">
                  {mockStats.creditsRemaining.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-juai-gray-400" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-juai pl-10"
            />
          </div>

          {/* Filter & View Toggle */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-juai-gray-100 rounded-xl p-1">
              {["all", "completed", "processing", "waiting"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    selectedFilter === filter
                      ? "bg-white text-juai-black shadow-sm"
                      : "text-juai-gray-500 hover:text-juai-black"
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
            <div className="flex items-center gap-1 bg-juai-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-juai-black shadow-sm"
                    : "text-juai-gray-500 hover:text-juai-black"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white text-juai-black shadow-sm"
                    : "text-juai-gray-500 hover:text-juai-black"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid/List */}
        <AnimatePresence mode="wait">
          {filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <FolderOpen className="w-16 h-16 text-juai-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-juai-gray-600 mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-juai-gray-400 mb-6">
                새 프로젝트를 만들어 콘텐츠 제작을 시작하세요
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="btn-juai-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
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
                  className="card-juai group cursor-pointer hover:border-juai-green/50"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-juai-gray-100 rounded-xl mb-4 overflow-hidden">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-juai-gray-300" />
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
                    <h3 className="font-semibold text-juai-black mb-1 truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-juai-gray-500 mb-3">
                      <Tag className="w-4 h-4" />
                      <span>{project.industry}</span>
                      <span>•</span>
                      <span>{project.aspectRatio}</span>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-juai-gray-400">
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
                  className="card-juai flex items-center gap-4 cursor-pointer hover:border-juai-green/50"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-14 bg-juai-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-juai-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-juai-black truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-juai-gray-500">
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
                    <button className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors">
                      <Play className="w-4 h-4 text-juai-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-juai-gray-600" />
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

// New Project Modal Component
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const industries = ["F&B", "패션", "뷰티", "테크", "여행", "라이프스타일", "교육", "기타"];
  const channelOptions = [
    { id: "youtube_shorts", label: "YouTube Shorts" },
    { id: "instagram_reels", label: "Instagram Reels" },
    { id: "tiktok", label: "TikTok" },
  ];
  const aspectRatios = ["9:16", "16:9", "1:1", "4:5"];

  const handleSubmit = () => {
    console.log({ title, industry, channels, aspectRatio });
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
        className="fixed inset-0 bg-black/50 z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-juai-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-juai flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-juai-black">새 프로젝트</h2>
              <p className="text-sm text-juai-gray-500">AI가 최적의 콘텐츠를 제작합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-juai-gray-600 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-juai-gray-700 mb-2">
              프로젝트 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 신상품 런칭 쇼츠"
              className="input-juai"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-juai-gray-700 mb-2">
              업종
            </label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    industry === ind
                      ? "bg-juai-green text-white"
                      : "bg-juai-gray-100 text-juai-gray-600 hover:bg-juai-gray-200"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-juai-gray-700 mb-2">
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
                      ? "bg-juai-orange text-white"
                      : "bg-juai-gray-100 text-juai-gray-600 hover:bg-juai-gray-200"
                  }`}
                >
                  {channel.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-juai-gray-700 mb-2">
              화면 비율
            </label>
            <div className="flex gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    aspectRatio === ratio
                      ? "bg-juai-black text-white"
                      : "bg-juai-gray-100 text-juai-gray-600 hover:bg-juai-gray-200"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-juai-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-juai-gray-600 hover:bg-juai-gray-100 rounded-xl transition-colors"
          >
            취소
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!title || !industry || channels.length === 0}
            className="btn-juai-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            생성 시작
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
