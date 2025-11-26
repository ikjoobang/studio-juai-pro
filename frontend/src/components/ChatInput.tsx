"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Image,
  Mic,
  Paperclip,
  X,
  FileText,
  Video,
  Smile,
  Sparkles,
  StopCircle,
} from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onStopGeneration?: () => void;
}

interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: "image" | "video" | "document";
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
  isLoading = false,
  onStopGeneration,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Handle send
  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || disabled || isLoading) return;
    
    onSend(
      message.trim(),
      attachments.map((a) => a.file)
    );
    setMessage("");
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Handle key press
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      let type: Attachment["type"] = "document";
      let preview: string | undefined;

      if (file.type.startsWith("image/")) {
        type = "image";
        preview = URL.createObjectURL(file);
      } else if (file.type.startsWith("video/")) {
        type = "video";
        preview = URL.createObjectURL(file);
      }

      newAttachments.push({ id, file, preview, type });
    });

    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5)); // Max 5 files
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  // Get file icon
  const getFileIcon = (type: Attachment["type"]) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      default:
        return FileText;
    }
  };

  // Quick prompts
  const quickPrompts = [
    "쇼츠 영상 만들어줘",
    "트렌드 분석해줘",
    "템플릿 추천해줘",
  ];

  return (
    <div className="border-t border-juai-gray-200 bg-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Attachments Preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {attachments.map((attachment) => {
                const FileIcon = getFileIcon(attachment.type);
                
                return (
                  <motion.div
                    key={attachment.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    {attachment.type === "image" && attachment.preview ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-juai-gray-200">
                        <img
                          src={attachment.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-juai-gray-100 border border-juai-gray-200 
                                    flex flex-col items-center justify-center gap-1">
                        <FileIcon className="w-6 h-6 text-juai-gray-500" />
                        <span className="text-xs text-juai-gray-500 truncate max-w-[70px] px-1">
                          {attachment.file.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-juai-black text-white 
                               rounded-full flex items-center justify-center opacity-0 
                               group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Prompts (when empty) */}
        {!message && attachments.length === 0 && !isLoading && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setMessage(prompt)}
                className="px-3 py-1.5 bg-juai-gray-100 hover:bg-juai-gray-200 
                         text-juai-gray-600 text-sm rounded-full transition-colors
                         flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-juai-green" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-end gap-2 bg-juai-gray-50 rounded-2xl p-2 
                        border border-juai-gray-200 focus-within:border-juai-green 
                        focus-within:ring-2 focus-within:ring-juai-green/20 transition-all">
            {/* Action Buttons */}
            <div className="flex items-center gap-1 pb-1">
              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isLoading}
                className="p-2 text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100 
                         rounded-lg transition-colors disabled:opacity-50"
                title="파일 첨부"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Image Upload */}
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*";
                    fileInputRef.current.click();
                    fileInputRef.current.accept = "image/*,video/*,.pdf,.doc,.docx";
                  }
                }}
                disabled={disabled || isLoading}
                className="p-2 text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100 
                         rounded-lg transition-colors disabled:opacity-50"
                title="이미지 첨부"
              >
                <Image className="w-5 h-5" />
              </button>

              {/* Voice Recording */}
              <button
                onClick={toggleRecording}
                disabled={disabled || isLoading}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isRecording
                    ? "text-red-500 bg-red-50 hover:bg-red-100"
                    : "text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100"
                }`}
                title="음성 입력"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none 
                       text-juai-black placeholder:text-juai-gray-400 py-2 px-1
                       min-h-[40px] max-h-[150px] disabled:opacity-50"
            />

            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled || isLoading}
              className="p-2 text-juai-gray-400 hover:text-juai-green hover:bg-juai-gray-100 
                       rounded-lg transition-colors disabled:opacity-50 pb-1"
              title="이모지"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Send / Stop Button */}
          {isLoading ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStopGeneration}
              className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 
                       transition-colors flex-shrink-0"
              title="생성 중지"
            >
              <StopCircle className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={(!message.trim() && attachments.length === 0) || disabled}
              className="p-3 bg-juai-green text-white rounded-xl hover:bg-juai-green/90 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all
                       flex-shrink-0 shadow-lg shadow-juai-green/20"
              title="전송"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-xs text-center text-juai-gray-400 mt-2">
          Enter로 전송, Shift+Enter로 줄바꿈 • 
          <span className="text-juai-green"> AI가 최적의 콘텐츠를 제안합니다</span>
        </p>
      </div>
    </div>
  );
}
