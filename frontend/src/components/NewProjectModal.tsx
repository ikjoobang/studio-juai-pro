"use client";

/**
 * NewProjectModal - 새 프로젝트 생성 모달
 * VIDEO FIRST: Aspect Ratio 선택이 가장 먼저!
 * 
 * v2.0: 소스 이미지 업로드 기능 추가 (Image-to-Video)
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Monitor,
  Smartphone,
  Square,
  RectangleVertical,
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import { AspectRatio, useVideoStore, useUIStore } from "@/lib/store";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  description: string;
  icon: React.ReactNode;
  platforms: string[];
  dimensions: string;
}

const aspectRatioOptions: AspectRatioOption[] = [
  {
    value: "16:9",
    label: "가로형",
    description: "YouTube, 웹사이트",
    icon: <Monitor className="w-8 h-8" />,
    platforms: ["YouTube", "웹"],
    dimensions: "1920 × 1080",
  },
  {
    value: "9:16",
    label: "세로형",
    description: "쇼츠, 릴스, 틱톡",
    icon: <Smartphone className="w-8 h-8" />,
    platforms: ["YouTube Shorts", "Reels", "TikTok"],
    dimensions: "1080 × 1920",
  },
  {
    value: "1:1",
    label: "정사각형",
    description: "인스타그램 피드",
    icon: <Square className="w-8 h-8" />,
    platforms: ["Instagram Feed"],
    dimensions: "1080 × 1080",
  },
  {
    value: "4:5",
    label: "세로 피드",
    description: "인스타그램 피드",
    icon: <RectangleVertical className="w-8 h-8" />,
    platforms: ["Instagram Feed"],
    dimensions: "1080 × 1350",
  },
];

const presetOptions = [
  { id: "warm_film", label: "따뜻한 필름", emoji: "🎞️" },
  { id: "cool_modern", label: "시원한 모던", emoji: "❄️" },
  { id: "golden_hour", label: "골든아워", emoji: "🌅" },
  { id: "cinematic_teal_orange", label: "시네마틱", emoji: "🎬" },
];

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://studio-juai-pro-production.up.railway.app";

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [step, setStep] = useState(1);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("9:16");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("warm_film");
  
  // Image Upload States
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addProject = useVideoStore((state) => state.addProject);
  const setCurrentProject = useVideoStore((state) => state.setCurrentProject);

  // 이미지 업로드 핸들러
  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // 파일 검증
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("JPG, PNG, WebP, GIF 형식만 지원합니다.");
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error("파일 크기는 10MB를 초과할 수 없습니다.");
      }
      
      // Base64로 변환
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // 미리보기 설정
      setSourceImagePreview(base64Data);
      
      // 서버에 업로드
      const response = await fetch(`${API_BASE_URL}/api/upload/base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
          filename: file.name,
          content_type: file.type,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "이미지 업로드에 실패했습니다.");
      }
      
      const data = await response.json();
      console.log("✅ 이미지 업로드 성공:", data.url);
      
      setSourceImageUrl(data.url);
      return data.url;
      
    } catch (error: any) {
      console.error("❌ 이미지 업로드 실패:", error);
      setUploadError(error.message || "이미지 업로드에 실패했습니다.");
      setSourceImagePreview(null);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  // Drag & Drop 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadImage(file);
    } else {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
    }
  }, []);

  // 이미지 삭제
  const handleRemoveImage = () => {
    setSourceImageUrl(null);
    setSourceImagePreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreate = () => {
    const newProject = {
      id: `project_${Date.now()}`,
      title: title || "새 프로젝트",
      description,
      aspectRatio: selectedRatio,
      status: "idle" as const,
      progress: 0,
      preset: selectedPreset,
      sourceImageUrl: sourceImageUrl || undefined, // 소스 이미지 URL 추가
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    addProject(newProject);
    setCurrentProject(newProject);
    
    // Reset form
    setStep(1);
    setSelectedRatio("9:16");
    setTitle("");
    setDescription("");
    setSelectedPreset("warm_film");
    setSourceImageUrl(null);
    setSourceImagePreview(null);
    setUploadError(null);
    
    onClose();
  };

  const handleClose = () => {
    setStep(1);
    setSourceImageUrl(null);
    setSourceImagePreview(null);
    setUploadError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-juai-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-juai flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-juai-black">
                      새 프로젝트 만들기
                    </h2>
                    <p className="text-sm text-juai-gray-500">
                      {step === 1 ? "영상 비율 선택" : "프로젝트 정보 입력"}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-juai-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-juai-gray-500" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-juai-gray-100 flex-shrink-0">
                <motion.div
                  className="h-full bg-gradient-juai"
                  initial={{ width: "50%" }}
                  animate={{ width: step === 1 ? "50%" : "100%" }}
                />
              </div>

              {/* Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {/* Step 1: Aspect Ratio Selection - THE HERO */}
                      <h3 className="text-lg font-semibold text-juai-black mb-2">
                        어떤 비율로 만들까요?
                      </h3>
                      <p className="text-juai-gray-500 mb-6">
                        타겟 플랫폼에 맞는 비율을 선택하세요
                      </p>

                      {/* Aspect Ratio Grid - BIG & VISUAL */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {aspectRatioOptions.map((option) => (
                          <motion.button
                            key={option.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedRatio(option.value)}
                            className={`relative p-6 rounded-2xl border-2 transition-all text-left
                              ${selectedRatio === option.value
                                ? "border-juai-green bg-juai-green/5"
                                : "border-juai-gray-200 hover:border-juai-gray-300 bg-white"
                              }`}
                          >
                            {/* Selection Indicator */}
                            {selectedRatio === option.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 w-6 h-6 bg-juai-green rounded-full
                                         flex items-center justify-center"
                              >
                                <Check className="w-4 h-4 text-white" />
                              </motion.div>
                            )}

                            {/* Visual Preview */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className={`flex items-center justify-center rounded-lg
                                ${selectedRatio === option.value
                                  ? "text-juai-green"
                                  : "text-juai-gray-400"
                                }
                                ${option.value === "16:9" ? "w-16 h-9 bg-current/10" : ""}
                                ${option.value === "9:16" ? "w-9 h-16 bg-current/10" : ""}
                                ${option.value === "1:1" ? "w-12 h-12 bg-current/10" : ""}
                                ${option.value === "4:5" ? "w-10 h-12 bg-current/10" : ""}
                              `}>
                                <div className={`
                                  ${option.value === "16:9" ? "w-14 h-8" : ""}
                                  ${option.value === "9:16" ? "w-7 h-14" : ""}
                                  ${option.value === "1:1" ? "w-10 h-10" : ""}
                                  ${option.value === "4:5" ? "w-8 h-10" : ""}
                                  border-2 rounded ${
                                    selectedRatio === option.value
                                      ? "border-juai-green bg-juai-green/20"
                                      : "border-juai-gray-300 bg-juai-gray-50"
                                  }
                                `} />
                              </div>
                              
                              <div>
                                <div className="font-bold text-juai-black text-lg">
                                  {option.label}
                                </div>
                                <div className="text-sm text-juai-gray-500">
                                  {option.value}
                                </div>
                              </div>
                            </div>

                            {/* Platform Tags */}
                            <div className="flex flex-wrap gap-1.5">
                              {option.platforms.map((platform) => (
                                <span
                                  key={platform}
                                  className={`px-2 py-0.5 text-xs rounded-full
                                    ${selectedRatio === option.value
                                      ? "bg-juai-green/10 text-juai-green"
                                      : "bg-juai-gray-100 text-juai-gray-500"
                                    }`}
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>

                            {/* Dimensions */}
                            <div className="mt-2 text-xs text-juai-gray-400">
                              {option.dimensions}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {/* Step 2: Project Details */}
                      <h3 className="text-lg font-semibold text-juai-black mb-2">
                        프로젝트 정보
                      </h3>
                      <p className="text-juai-gray-500 mb-6">
                        기본 정보를 입력하세요 (나중에 수정 가능)
                      </p>

                      {/* Selected Ratio Display */}
                      <div className="flex items-center gap-3 p-4 bg-juai-gray-50 rounded-xl mb-6">
                        <div className={`flex items-center justify-center rounded-lg text-juai-green
                          ${selectedRatio === "16:9" ? "w-12 h-7" : ""}
                          ${selectedRatio === "9:16" ? "w-7 h-12" : ""}
                          ${selectedRatio === "1:1" ? "w-10 h-10" : ""}
                          ${selectedRatio === "4:5" ? "w-8 h-10" : ""}
                        `}>
                          <div className={`border-2 border-juai-green bg-juai-green/20 rounded
                            ${selectedRatio === "16:9" ? "w-10 h-6" : ""}
                            ${selectedRatio === "9:16" ? "w-5 h-10" : ""}
                            ${selectedRatio === "1:1" ? "w-8 h-8" : ""}
                            ${selectedRatio === "4:5" ? "w-6 h-8" : ""}
                          `} />
                        </div>
                        <div>
                          <div className="font-medium text-juai-black">
                            {aspectRatioOptions.find(o => o.value === selectedRatio)?.label}
                          </div>
                          <div className="text-sm text-juai-gray-500">{selectedRatio}</div>
                        </div>
                        <button
                          onClick={() => setStep(1)}
                          className="ml-auto text-sm text-juai-green hover:underline"
                        >
                          변경
                        </button>
                      </div>

                      {/* ============================================ */}
                      {/* 소스 이미지 업로드 영역 (NEW!) */}
                      {/* ============================================ */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-juai-gray-700 mb-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            소스 이미지 (선택)
                          </div>
                        </label>
                        <p className="text-xs text-juai-gray-500 mb-3">
                          제품/인물 이미지를 업로드하면 Image-to-Video로 움직이는 영상을 만들 수 있습니다
                        </p>
                        
                        {!sourceImagePreview ? (
                          /* 업로드 영역 (Drag & Drop) */
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                              ${isDragging 
                                ? "border-juai-green bg-juai-green/5" 
                                : "border-juai-gray-300 hover:border-juai-green/50 hover:bg-juai-gray-50"
                              }
                              ${isUploading ? "pointer-events-none opacity-60" : ""}
                            `}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            
                            {isUploading ? (
                              <div className="flex flex-col items-center">
                                <Loader2 className="w-10 h-10 text-juai-green animate-spin mb-3" />
                                <p className="text-sm text-juai-gray-600">업로드 중...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-juai-green" : "text-juai-gray-400"}`} />
                                <p className="text-sm text-juai-gray-600 mb-1">
                                  {isDragging ? "여기에 놓으세요!" : "클릭하거나 드래그하여 업로드"}
                                </p>
                                <p className="text-xs text-juai-gray-400">
                                  JPG, PNG, WebP, GIF / 최대 10MB
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          /* 이미지 미리보기 */
                          <div className="relative">
                            <div className="relative rounded-xl overflow-hidden border border-juai-gray-200">
                              <img
                                src={sourceImagePreview}
                                alt="소스 이미지 미리보기"
                                className="w-full h-48 object-contain bg-juai-gray-50"
                              />
                              
                              {/* 업로드 상태 표시 */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <div className="flex items-center gap-2 text-white text-sm">
                                  {sourceImageUrl ? (
                                    <>
                                      <Check className="w-4 h-4 text-green-400" />
                                      <span>업로드 완료</span>
                                    </>
                                  ) : isUploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>업로드 중...</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            
                            {/* 삭제 버튼 */}
                            <button
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg 
                                       hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* 업로드 에러 메시지 */}
                        {uploadError && (
                          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                            <X className="w-4 h-4" />
                            {uploadError}
                          </p>
                        )}
                        
                        {/* Image-to-Video 안내 */}
                        {sourceImageUrl && (
                          <div className="mt-3 p-3 bg-juai-green/5 border border-juai-green/20 rounded-lg">
                            <p className="text-sm text-juai-green font-medium flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Image-to-Video 모드가 활성화됩니다
                            </p>
                            <p className="text-xs text-juai-gray-600 mt-1">
                              이 이미지를 기반으로 AI가 움직임을 생성합니다 (Veo 3.1 / Kling)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Title Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-juai-gray-700 mb-2">
                          프로젝트 제목
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="예: 신제품 홍보 영상"
                          className="w-full px-4 py-3 border border-juai-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-juai-green/20 
                                   focus:border-juai-green transition-all"
                        />
                      </div>

                      {/* Description Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-juai-gray-700 mb-2">
                          간단한 설명 (선택)
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="어떤 내용의 영상을 만들고 싶으신가요?"
                          rows={3}
                          className="w-full px-4 py-3 border border-juai-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-juai-green/20 
                                   focus:border-juai-green transition-all resize-none"
                        />
                      </div>

                      {/* Preset Selection */}
                      <div>
                        <label className="block text-sm font-medium text-juai-gray-700 mb-2">
                          색감 프리셋
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {presetOptions.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => setSelectedPreset(preset.id)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                                ${selectedPreset === preset.id
                                  ? "bg-juai-green text-white"
                                  : "bg-juai-gray-100 text-juai-gray-600 hover:bg-juai-gray-200"
                                }`}
                            >
                              {preset.emoji} {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-juai-gray-200 bg-juai-gray-50 flex-shrink-0">
                {step === 1 ? (
                  <>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2.5 text-juai-gray-600 hover:text-juai-black transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-juai-green text-white 
                               rounded-xl hover:bg-juai-green/90 transition-colors font-medium"
                    >
                      다음
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2.5 text-juai-gray-600 hover:text-juai-black transition-colors"
                    >
                      이전
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-juai-green text-white 
                               rounded-xl hover:bg-juai-green/90 transition-colors font-medium
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      프로젝트 시작
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
