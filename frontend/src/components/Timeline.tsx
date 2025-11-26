"use client";

/**
 * Timeline - 작업 타임라인 컴포넌트
 * VIDEO FIRST: 영상 편집을 위한 직관적인 타임라인
 * 
 * ✅ 기능 연동:
 * - 영상 생성 완료시 Video 트랙에 자동 로드
 * - 챗봇 명령시 해당 트랙에 클립 추가
 * - Zustand store와 실시간 동기화
 */

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Image,
  Music2,
  Type,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  Layers,
  Volume2,
} from "lucide-react";
import { useVideoStore, TimelineClip } from "@/lib/store";

interface Track {
  id: string;
  label: string;
  type: "video" | "audio" | "text" | "overlay";
  icon: React.ReactNode;
  locked: boolean;
  visible: boolean;
}

// 기본 트랙 정의
const defaultTracks: Track[] = [
  {
    id: "track-video",
    label: "Video",
    type: "video",
    icon: <Film className="w-4 h-4" />,
    locked: false,
    visible: true,
  },
  {
    id: "track-overlay",
    label: "Overlay",
    type: "overlay",
    icon: <Image className="w-4 h-4" />,
    locked: false,
    visible: true,
  },
  {
    id: "track-text",
    label: "Text",
    type: "text",
    icon: <Type className="w-4 h-4" />,
    locked: false,
    visible: true,
  },
  {
    id: "track-audio",
    label: "Audio",
    type: "audio",
    icon: <Music2 className="w-4 h-4" />,
    locked: false,
    visible: true,
  },
];

export default function Timeline() {
  const [zoom, setZoom] = useState(100); // 100% = 1 second per 60px
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0); // ms
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ✅ Zustand store에서 타임라인 클립 가져오기
  const { timeline, selectedClipId, selectClip, removeClip, currentProject } = useVideoStore();

  // 총 재생 시간 계산 (클립이 있으면 클립 기준, 없으면 기본 15초)
  const totalDuration = useMemo(() => {
    if (timeline.length === 0) return 15000;
    const maxEnd = Math.max(...timeline.map(clip => clip.startTime + clip.duration));
    return Math.max(maxEnd + 5000, 15000); // 최소 15초, 클립 끝 + 5초 여유
  }, [timeline]);

  const pixelsPerSecond = (60 * zoom) / 100;
  const totalWidth = (totalDuration / 1000) * pixelsPerSecond;

  // 시간 마커 생성
  const timeMarkers: number[] = useMemo(() => {
    const markers: number[] = [];
    const markerInterval = zoom > 150 ? 1 : zoom > 50 ? 2 : 5;
    for (let i = 0; i <= totalDuration / 1000; i += markerInterval) {
      markers.push(i);
    }
    return markers;
  }, [totalDuration, zoom]);

  // 트랙별 클립 그룹화
  const clipsByTrack = useMemo(() => {
    const grouped: Record<string, TimelineClip[]> = {
      video: [],
      image: [],
      text: [],
      audio: [],
    };
    
    timeline.forEach(clip => {
      if (grouped[clip.type]) {
        grouped[clip.type].push(clip);
      }
    });
    
    return grouped;
  }, [timeline]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const ms_ = ms % 1000;
    return `${minutes}:${secs.toString().padStart(2, "0")}.${Math.floor(ms_ / 100)}`;
  };

  const getClipColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-500/80 border-blue-400";
      case "image":
        return "bg-purple-500/80 border-purple-400";
      case "audio":
        return "bg-green-500/80 border-green-400";
      case "text":
        return "bg-orange-500/80 border-orange-400";
      default:
        return "bg-gray-500/80 border-gray-400";
    }
  };

  const getTrackClips = (trackType: string): TimelineClip[] => {
    // 트랙 타입에 맞는 클립 필터링
    const typeMapping: Record<string, string[]> = {
      video: ["video"],
      overlay: ["image"],
      text: ["text"],
      audio: ["audio"],
    };
    
    const allowedTypes = typeMapping[trackType] || [];
    return timeline.filter(clip => allowedTypes.includes(clip.type));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / pixelsPerSecond) * 1000;
    setPlayheadPosition(Math.max(0, Math.min(time, totalDuration)));
  };

  const toggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  };

  const handleDeleteClip = () => {
    if (selectedClipId) {
      removeClip(selectedClipId);
    }
  };

  return (
    <div className="bg-juai-night rounded-2xl overflow-hidden border border-juai-gray-800">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-juai-gray-800 bg-juai-gray-900">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-juai-gray-400" />
          <span className="text-white font-medium">타임라인</span>
          <span className="text-juai-gray-500 text-sm">
            {formatTime(playheadPosition)} / {formatTime(totalDuration)}
          </span>
          {timeline.length > 0 && (
            <span className="px-2 py-0.5 bg-juai-green/20 text-juai-green text-xs rounded-full">
              {timeline.length}개 클립
            </span>
          )}
        </div>

        {/* Timeline Controls */}
        <div className="flex items-center gap-2">
          {/* Add Track */}
          <button className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group">
            <Plus className="w-4 h-4 text-juai-gray-400 group-hover:text-white" />
          </button>

          {/* Scissors - Split */}
          <button className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group">
            <Scissors className="w-4 h-4 text-juai-gray-400 group-hover:text-white" />
          </button>

          {/* Copy */}
          <button className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group">
            <Copy className="w-4 h-4 text-juai-gray-400 group-hover:text-white" />
          </button>

          {/* Delete */}
          <button 
            onClick={handleDeleteClip}
            disabled={!selectedClipId}
            className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-juai-gray-400 group-hover:text-red-400" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-juai-gray-700 mx-2" />

          {/* Zoom Controls */}
          <button
            onClick={() => setZoom((z) => Math.max(25, z - 25))}
            className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group"
          >
            <ZoomOut className="w-4 h-4 text-juai-gray-400 group-hover:text-white" />
          </button>
          <span className="text-juai-gray-400 text-sm w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            className="p-2 hover:bg-juai-gray-800 rounded-lg transition-colors group"
          >
            <ZoomIn className="w-4 h-4 text-juai-gray-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex">
        {/* Track Labels */}
        <div className="w-48 flex-shrink-0 border-r border-juai-gray-800">
          {/* Time Ruler Label */}
          <div className="h-8 border-b border-juai-gray-800 bg-juai-gray-900" />

          {/* Track Labels */}
          {tracks.map((track) => {
            const trackClips = getTrackClips(track.type);
            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`h-16 px-4 flex items-center justify-between border-b border-juai-gray-800
                          cursor-pointer transition-colors ${
                            selectedTrackId === track.id
                              ? "bg-juai-gray-800"
                              : "bg-juai-gray-900 hover:bg-juai-gray-850"
                          }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`p-1.5 rounded ${
                      track.type === "video"
                        ? "bg-blue-500/20 text-blue-400"
                        : track.type === "audio"
                        ? "bg-green-500/20 text-green-400"
                        : track.type === "text"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {track.icon}
                  </span>
                  <div>
                    <span className="text-white text-sm font-medium">{track.label}</span>
                    {trackClips.length > 0 && (
                      <span className="text-juai-gray-500 text-xs ml-2">
                        ({trackClips.length})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackLock(track.id);
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      track.locked
                        ? "bg-red-500/20 text-red-400"
                        : "hover:bg-juai-gray-700 text-juai-gray-500"
                    }`}
                  >
                    {track.locked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackVisibility(track.id);
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      !track.visible
                        ? "bg-juai-gray-700 text-juai-gray-500"
                        : "hover:bg-juai-gray-700 text-juai-gray-500"
                    }`}
                  >
                    {track.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-x-auto">
          <div
            ref={timelineRef}
            className="relative"
            style={{ width: `${totalWidth}px`, minWidth: "100%" }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="h-8 border-b border-juai-gray-800 bg-juai-gray-900 relative">
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: `${time * pixelsPerSecond}px` }}
                >
                  <span className="text-juai-gray-500 text-xs px-1">
                    {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
                  </span>
                  <div className="w-px h-2 bg-juai-gray-700" />
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => {
              const trackClips = getTrackClips(track.type);
              
              return (
                <div
                  key={track.id}
                  className={`h-16 border-b border-juai-gray-800 relative ${
                    !track.visible ? "opacity-40" : ""
                  }`}
                >
                  {/* Grid Lines */}
                  {timeMarkers.map((time) => (
                    <div
                      key={time}
                      className="absolute top-0 bottom-0 w-px bg-juai-gray-800/50"
                      style={{ left: `${time * pixelsPerSecond}px` }}
                    />
                  ))}

                  {/* Empty State Hint */}
                  {trackClips.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-juai-gray-600 text-xs">
                        {track.type === "video" && "영상을 생성하면 여기에 표시됩니다"}
                        {track.type === "text" && "\"자막 달아줘\"라고 말해보세요"}
                        {track.type === "audio" && "\"음악 추가해줘\"라고 말해보세요"}
                      </span>
                    </div>
                  )}

                  {/* ✅ Clips from Zustand Store */}
                  {trackClips.map((clip) => (
                    <motion.div
                      key={clip.id}
                      layoutId={clip.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(clip.id);
                      }}
                      className={`absolute top-2 bottom-2 rounded-lg border cursor-pointer
                                transition-all overflow-hidden ${getClipColor(clip.type)}
                                ${selectedClipId === clip.id ? "ring-2 ring-white/50 ring-offset-1 ring-offset-juai-night" : ""}
                                ${track.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
                      style={{
                        left: `${(clip.startTime / 1000) * pixelsPerSecond}px`,
                        width: `${Math.max((clip.duration / 1000) * pixelsPerSecond, 60)}px`,
                      }}
                      whileHover={{ scale: 1.02 }}
                      drag={!track.locked ? "x" : false}
                      dragConstraints={timelineRef}
                      dragElastic={0}
                    >
                      <div className="px-2 py-1 h-full flex items-center gap-2">
                        {clip.type === "audio" && (
                          <Volume2 className="w-3 h-3 text-white/70 flex-shrink-0" />
                        )}
                        {clip.type === "text" && (
                          <Type className="w-3 h-3 text-white/70 flex-shrink-0" />
                        )}
                        {clip.type === "video" && (
                          <Film className="w-3 h-3 text-white/70 flex-shrink-0" />
                        )}
                        <span className="text-white text-xs font-medium truncate">
                          {clip.label}
                        </span>
                      </div>

                      {/* Resize Handles */}
                      {!track.locked && (
                        <>
                          <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              );
            })}

            {/* Playhead */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-juai-green z-10 cursor-ew-resize"
              style={{ left: `${(playheadPosition / 1000) * pixelsPerSecond}px` }}
              drag="x"
              dragConstraints={timelineRef}
              dragElastic={0}
              onDrag={(e, info) => {
                const newPos = (info.point.x / pixelsPerSecond) * 1000;
                setPlayheadPosition(Math.max(0, Math.min(newPos, totalDuration)));
              }}
            >
              {/* Playhead Handle */}
              <div className="absolute -top-1 -left-2 w-5 h-4 bg-juai-green rounded-sm" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Timeline Footer - Quick Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-juai-gray-800 bg-juai-gray-900">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-juai-gray-800 hover:bg-juai-gray-700 
                           text-white text-sm rounded-lg transition-colors">
            <Film className="w-4 h-4" />
            영상 추가
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-juai-gray-800 hover:bg-juai-gray-700 
                           text-white text-sm rounded-lg transition-colors">
            <Music2 className="w-4 h-4" />
            음악 추가
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-juai-gray-800 hover:bg-juai-gray-700 
                           text-white text-sm rounded-lg transition-colors">
            <Type className="w-4 h-4" />
            텍스트 추가
          </button>
        </div>

        <div className="text-juai-gray-500 text-sm">
          {timeline.length > 0 
            ? `총 ${timeline.length}개 클립 · ${formatTime(totalDuration)}`
            : "클립 없음"
          }
        </div>
      </div>
    </div>
  );
}
