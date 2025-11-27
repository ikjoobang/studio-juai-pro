"use client";

/**
 * VideoPlayer - 컴팩트 비디오 플레이어 컴포넌트
 * PREMIERE PRO STYLE: 좌측 상단 영역에 배치
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
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useVideoStore } from "@/lib/store";

interface VideoPlayerProps {
  className?: string;
  compact?: boolean;
}

export default function VideoPlayer({ className = "", compact = false }: VideoPlayerProps) {
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
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2000);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play().catch(console.error);
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
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  };

  const getStatusIcon = () => {
    switch (renderStatus) {
      case "preparing": return <RefreshCw className="w-6 h-6 animate-spin" />;
      case "rendering": return <Loader2 className="w-6 h-6 animate-spin" />;
      case "completed": return <CheckCircle2 className="w-6 h-6" />;
      case "failed": return <AlertCircle className="w-6 h-6" />;
      default: return <Video className="w-6 h-6" />;
    }
  };

  return (
    <div
      className={`relative bg-[#0d0d0d] rounded-lg overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Container */}
      <div className="flex items-center justify-center h-full bg-black">
        
        {/* Rendering Progress Overlay */}
        <AnimatePresence>
          {(renderStatus === "preparing" || renderStatus === "rendering") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/90"
            >
              <div className="text-center px-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-juai 
                           flex items-center justify-center text-white"
                >
                  {getStatusIcon()}
                </motion.div>

                {/* Compact Progress Bar */}
                <div className="w-48 mx-auto mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">렌더링</span>
                    <span className="text-sm font-bold text-white">{renderProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-juai rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>

                <p className="text-white/60 text-xs">{renderMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed State */}
        {renderStatus === "failed" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
            <div className="text-center px-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-red-500/20 
                           flex items-center justify-center text-red-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-white text-sm mb-1">렌더링 실패</p>
              <p className="text-gray-400 text-xs mb-3">{renderMessage}</p>
              <button
                onClick={() => useVideoStore.getState().resetRender()}
                className="px-3 py-1.5 bg-white/10 text-white rounded text-xs"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!videoUrl && renderStatus === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 
                           flex items-center justify-center text-white/30">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-gray-500 text-sm">영상이 없습니다</p>
            </div>
          </div>
        )}

        {/* Video Element */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-full max-w-full object-contain"
            playsInline
            onClick={togglePlay}
          />
        )}
      </div>

      {/* Compact Controls Overlay */}
      <AnimatePresence>
        {showControls && videoUrl && renderStatus !== "rendering" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
          >
            {/* Center Play Button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full 
                         flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </motion.div>
            </button>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                onClick={handleSeek}
                className="h-1 bg-white/20 rounded-full mb-2 cursor-pointer hover:h-1.5 transition-all"
              >
                <div
                  className="h-full bg-juai-green rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-1">
                  <button onClick={togglePlay} className="p-1 hover:bg-white/10 rounded">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => skip(-5)} className="p-1 hover:bg-white/10 rounded">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button onClick={() => skip(5)} className="p-1 hover:bg-white/10 rounded">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button onClick={toggleMute} className="p-1 hover:bg-white/10 rounded">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-gray-300 ml-1">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                  </span>
                </div>
                <button onClick={toggleFullscreen} className="p-1 hover:bg-white/10 rounded">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
