"use client";

/**
 * VideoPlayer - 메인 비디오 플레이어 컴포넌트
 * VIDEO FIRST: 화면의 HERO 영역, 렌더링 프로그레스 바 포함
 */

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Download,
  Share2,
  RefreshCw,
  Sparkles,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useVideoStore, RenderStatus } from "@/lib/store";

interface VideoPlayerProps {
  className?: string;
}

export default function VideoPlayer({ className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    videoUrl,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    renderStatus,
    renderProgress,
    renderMessage,
    currentProject,
    setPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
  } = useVideoStore();

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => setPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [setCurrentTime, setDuration, setPlaying]);

  // Auto-play when video URL changes
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  }, [videoUrl]);

  // Apply volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Controls auto-hide
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  // Playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement?.parentElement;
    if (!container) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  // Render status icon
  const getStatusIcon = () => {
    switch (renderStatus) {
      case "preparing":
        return <RefreshCw className="w-8 h-8 animate-spin" />;
      case "rendering":
        return <Loader2 className="w-8 h-8 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-8 h-8" />;
      case "failed":
        return <AlertCircle className="w-8 h-8" />;
      default:
        return <Video className="w-8 h-8" />;
    }
  };

  // Aspect ratio class
  const getAspectRatioClass = () => {
    switch (currentProject?.aspectRatio) {
      case "9:16":
        return "aspect-[9/16] max-h-[70vh]";
      case "1:1":
        return "aspect-square max-h-[70vh]";
      case "4:5":
        return "aspect-[4/5] max-h-[70vh]";
      default:
        return "aspect-video";
    }
  };

  return (
    <div
      className={`relative bg-juai-night rounded-2xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Container */}
      <div className="flex items-center justify-center bg-black/90 min-h-[400px]">
        {/* Rendering Progress Overlay */}
        <AnimatePresence>
          {(renderStatus === "preparing" || renderStatus === "rendering") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center 
                       bg-gradient-to-b from-juai-night/95 to-black/95"
            >
              <div className="text-center px-8 max-w-md">
                {/* Animated Icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-juai 
                           flex items-center justify-center text-white"
                >
                  {getStatusIcon()}
                </motion.div>

                {/* Progress Bar - THE HERO */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">렌더링 진행률</span>
                    <span className="text-2xl font-bold text-white">
                      {renderProgress}%
                    </span>
                  </div>
                  
                  <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-juai rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${renderProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                    
                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent 
                               via-white/20 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                </div>

                {/* Status Message */}
                <p className="text-white/80 text-lg font-medium mb-2">
                  {renderMessage}
                </p>
                
                <p className="text-white/40 text-sm">
                  잠시만 기다려 주세요. AI가 영상을 제작하고 있습니다.
                </p>

                {/* Estimated Time */}
                {renderProgress > 0 && renderProgress < 100 && (
                  <p className="mt-4 text-white/50 text-xs">
                    예상 소요 시간: 약 {Math.ceil((100 - renderProgress) / 10)} 분
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed State */}
        <AnimatePresence>
          {renderStatus === "failed" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center 
                       bg-gradient-to-b from-juai-night/95 to-black/95"
            >
              <div className="text-center px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 
                             flex items-center justify-center text-red-400">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  렌더링 실패
                </h3>
                <p className="text-white/60 mb-6">{renderMessage}</p>
                <button
                  onClick={() => useVideoStore.getState().resetRender()}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl 
                           hover:bg-white/20 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!videoUrl && renderStatus === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/5 
                         flex items-center justify-center text-white/30"
              >
                <Video className="w-12 h-12" />
              </motion.div>
              <h3 className="text-xl font-medium text-white/60 mb-2">
                영상이 없습니다
              </h3>
              <p className="text-white/40 text-sm mb-6">
                새 프로젝트를 시작하거나 영상을 생성해보세요
              </p>
              <button
                onClick={() => useVideoStore.getState().startRender("test")}
                className="px-6 py-3 bg-gradient-juai text-white rounded-xl 
                         hover:opacity-90 transition-opacity font-medium
                         flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                AI 영상 생성
              </button>
            </div>
          </div>
        )}

        {/* Video Element */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className={`${getAspectRatioClass()} w-auto mx-auto`}
            playsInline
            onClick={togglePlay}
          />
        )}
      </div>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && videoUrl && renderStatus !== "rendering" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">
                  {currentProject?.title || "새 프로젝트"}
                </h3>
                <p className="text-white/60 text-sm">
                  {currentProject?.aspectRatio || "16:9"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Center Play Button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full 
                         flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </motion.div>
            </button>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                onClick={handleSeek}
                className="h-1 bg-white/20 rounded-full mb-4 cursor-pointer 
                         hover:h-2 transition-all group"
              >
                <div
                  className="h-full bg-juai-green rounded-full relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 
                                bg-white rounded-full opacity-0 group-hover:opacity-100 
                                transition-opacity" />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </button>

                  {/* Skip Buttons */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <SkipBack className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 h-1 appearance-none bg-white/20 rounded-full 
                               [&::-webkit-slider-thumb]:appearance-none 
                               [&::-webkit-slider-thumb]:w-3 
                               [&::-webkit-slider-thumb]:h-3 
                               [&::-webkit-slider-thumb]:bg-white 
                               [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>

                  {/* Time */}
                  <span className="text-white/80 text-sm">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                  </span>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
