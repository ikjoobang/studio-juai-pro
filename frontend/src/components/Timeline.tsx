"use client";

/**
 * Timeline - 프리미어 프로 스타일 확장 타임라인
 * PREMIERE PRO STYLE: 하단 60% 영역에 전체 너비로 배치
 */

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
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
  Layers,
  Volume2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
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

interface TimelineProps {
  expanded?: boolean;
}

const defaultTracks: Track[] = [
  { id: "track-video", label: "Video", type: "video", icon: <Film className="w-3.5 h-3.5" />, locked: false, visible: true },
  { id: "track-overlay", label: "Overlay", type: "overlay", icon: <Image className="w-3.5 h-3.5" />, locked: false, visible: true },
  { id: "track-text", label: "Text", type: "text", icon: <Type className="w-3.5 h-3.5" />, locked: false, visible: true },
  { id: "track-audio", label: "Audio", type: "audio", icon: <Music2 className="w-3.5 h-3.5" />, locked: false, visible: true },
];

export default function Timeline({ expanded = false }: TimelineProps) {
  const [zoom, setZoom] = useState(100);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { timeline, selectedClipId, selectClip, removeClip } = useVideoStore();

  const totalDuration = useMemo(() => {
    if (timeline.length === 0) return 15000;
    const maxEnd = Math.max(...timeline.map(clip => clip.startTime + clip.duration));
    return Math.max(maxEnd + 5000, 15000);
  }, [timeline]);

  const pixelsPerSecond = (60 * zoom) / 100;
  const totalWidth = (totalDuration / 1000) * pixelsPerSecond;

  const timeMarkers: number[] = useMemo(() => {
    const markers: number[] = [];
    const markerInterval = zoom > 150 ? 1 : zoom > 50 ? 2 : 5;
    for (let i = 0; i <= totalDuration / 1000; i += markerInterval) {
      markers.push(i);
    }
    return markers;
  }, [totalDuration, zoom]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const ms_ = ms % 1000;
    return `${minutes}:${secs.toString().padStart(2, "0")}.${Math.floor(ms_ / 100)}`;
  };

  const getClipColor = (type: string) => {
    switch (type) {
      case "video": return "bg-blue-500/80 border-blue-400";
      case "image": return "bg-purple-500/80 border-purple-400";
      case "audio": return "bg-green-500/80 border-green-400";
      case "text": return "bg-orange-500/80 border-orange-400";
      default: return "bg-gray-500/80 border-gray-400";
    }
  };

  const getTrackClips = (trackType: string): TimelineClip[] => {
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
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, visible: !t.visible } : t)));
  };

  // 확장 모드에서 트랙 높이 증가
  const trackHeight = expanded ? "h-20" : "h-14";
  const labelWidth = expanded ? "w-36" : "w-32";

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] border-t border-[#333]">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#333] bg-[#252525] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 border-r border-[#444] pr-3 mr-2">
            <button className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white">
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 hover:bg-[#333] rounded text-white bg-[#333]"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-white text-sm font-medium">타임라인</span>
          <span className="text-gray-500 text-xs">
            {formatTime(playheadPosition)} / {formatTime(totalDuration)}
          </span>
          {timeline.length > 0 && (
            <span className="px-1.5 py-0.5 bg-juai-green/20 text-juai-green text-xs rounded">
              {timeline.length}
            </span>
          )}
        </div>

        {/* Timeline Tools */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white">
            <Plus className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white">
            <Scissors className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white">
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={() => selectedClipId && removeClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-red-400 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-[#444] mx-1" />

          <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-gray-400 text-xs w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div className={`${labelWidth} flex-shrink-0 border-r border-[#333] bg-[#1e1e1e]`}>
          {/* Time Ruler Label */}
          <div className="h-6 border-b border-[#333] bg-[#252525]" />

          {/* Track Labels */}
          {tracks.map((track) => {
            const trackClips = getTrackClips(track.type);
            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`${trackHeight} px-2 flex items-center justify-between border-b border-[#333]
                          cursor-pointer transition-colors ${
                            selectedTrackId === track.id ? "bg-[#2a2a2a]" : "hover:bg-[#222]"
                          }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded ${
                    track.type === "video" ? "bg-blue-500/20 text-blue-400" :
                    track.type === "audio" ? "bg-green-500/20 text-green-400" :
                    track.type === "text" ? "bg-orange-500/20 text-orange-400" :
                    "bg-purple-500/20 text-purple-400"
                  }`}>
                    {track.icon}
                  </span>
                  <span className="text-white text-xs font-medium">{track.label}</span>
                  {trackClips.length > 0 && (
                    <span className="text-gray-500 text-xs">({trackClips.length})</span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTrackLock(track.id); }}
                    className={`p-1 rounded ${track.locked ? "bg-red-500/20 text-red-400" : "text-gray-500 hover:text-white"}`}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTrackVisibility(track.id); }}
                    className={`p-1 rounded ${!track.visible ? "text-gray-600" : "text-gray-500 hover:text-white"}`}
                  >
                    {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div
            ref={timelineRef}
            className="relative min-h-full"
            style={{ width: `${Math.max(totalWidth, 800)}px` }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="h-6 border-b border-[#333] bg-[#252525] relative sticky top-0 z-10">
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: `${time * pixelsPerSecond}px` }}
                >
                  <span className="text-gray-500 text-xs px-1">
                    {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
                  </span>
                  <div className="w-px h-1.5 bg-[#444]" />
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => {
              const trackClips = getTrackClips(track.type);
              
              return (
                <div
                  key={track.id}
                  className={`${trackHeight} border-b border-[#333] relative ${!track.visible ? "opacity-30" : ""}`}
                >
                  {/* Grid Lines */}
                  {timeMarkers.map((time) => (
                    <div
                      key={time}
                      className="absolute top-0 bottom-0 w-px bg-[#2a2a2a]"
                      style={{ left: `${time * pixelsPerSecond}px` }}
                    />
                  ))}

                  {/* Empty State Hint */}
                  {trackClips.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-gray-600 text-xs">
                        {track.type === "video" && "영상을 생성하면 여기에 표시됩니다"}
                        {track.type === "text" && "\"자막 달아줘\"라고 말해보세요"}
                        {track.type === "audio" && "\"음악 추가해줘\"라고 말해보세요"}
                      </span>
                    </div>
                  )}

                  {/* Clips */}
                  {trackClips.map((clip) => (
                    <motion.div
                      key={clip.id}
                      layoutId={clip.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => { e.stopPropagation(); selectClip(clip.id); }}
                      className={`absolute top-1.5 bottom-1.5 rounded border cursor-pointer
                                transition-all overflow-hidden ${getClipColor(clip.type)}
                                ${selectedClipId === clip.id ? "ring-2 ring-white/50" : ""}
                                ${track.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
                      style={{
                        left: `${(clip.startTime / 1000) * pixelsPerSecond}px`,
                        width: `${Math.max((clip.duration / 1000) * pixelsPerSecond, 50)}px`,
                      }}
                      whileHover={{ scale: 1.02, opacity: 1 }}
                      drag={!track.locked ? "x" : false}
                      dragConstraints={timelineRef}
                      dragElastic={0}
                    >
                      <div className="px-2 py-1 h-full flex items-center gap-1.5">
                        {clip.type === "audio" && <Volume2 className="w-3 h-3 text-white/70 flex-shrink-0" />}
                        {clip.type === "text" && <Type className="w-3 h-3 text-white/70 flex-shrink-0" />}
                        {clip.type === "video" && <Film className="w-3 h-3 text-white/70 flex-shrink-0" />}
                        <span className="text-white text-xs font-medium truncate">{clip.label}</span>
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
              className="absolute top-0 bottom-0 w-0.5 bg-juai-green z-20 cursor-ew-resize"
              style={{ left: `${(playheadPosition / 1000) * pixelsPerSecond}px` }}
              drag="x"
              dragConstraints={timelineRef}
              dragElastic={0}
              onDrag={(e, info) => {
                const newPos = (info.point.x / pixelsPerSecond) * 1000;
                setPlayheadPosition(Math.max(0, Math.min(newPos, totalDuration)));
              }}
            >
              <div className="absolute -top-0 -left-1.5 w-4 h-3 bg-juai-green rounded-b-sm" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-[#333] bg-[#252525] flex-shrink-0">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white text-xs rounded">
            <Film className="w-3 h-3" /> 영상
          </button>
          <button className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white text-xs rounded">
            <Music2 className="w-3 h-3" /> 음악
          </button>
          <button className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white text-xs rounded">
            <Type className="w-3 h-3" /> 텍스트
          </button>
        </div>
        <span className="text-gray-500 text-xs">
          {timeline.length > 0 ? `${timeline.length}개 클립 · ${formatTime(totalDuration)}` : "클립 없음"}
        </span>
      </div>
    </div>
  );
}
