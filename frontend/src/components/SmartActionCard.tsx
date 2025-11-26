"use client";

import { motion } from "framer-motion";
import {
  Video,
  TrendingUp,
  Layout,
  Image,
  CreditCard,
  Play,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";

// Types
interface ActionCard {
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  actions: { label: string; action: string }[];
}

interface SmartActionCardProps {
  card: ActionCard;
  onAction: (cardType: string, action: string, data: any) => void;
}

// Card Type Config
const cardTypeConfig: Record<
  string,
  {
    icon: typeof Video;
    gradient: string;
    accentColor: string;
    bgPattern: string;
  }
> = {
  video_generation: {
    icon: Video,
    gradient: "from-juai-green/10 to-juai-green/5",
    accentColor: "text-juai-green",
    bgPattern: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]",
  },
  trend_analysis: {
    icon: TrendingUp,
    gradient: "from-juai-orange/10 to-juai-orange/5",
    accentColor: "text-juai-orange",
    bgPattern: "bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]",
  },
  template_select: {
    icon: Layout,
    gradient: "from-blue-500/10 to-blue-500/5",
    accentColor: "text-blue-500",
    bgPattern: "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))]",
  },
  asset_preview: {
    icon: Image,
    gradient: "from-purple-500/10 to-purple-500/5",
    accentColor: "text-purple-500",
    bgPattern: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]",
  },
  payment: {
    icon: CreditCard,
    gradient: "from-juai-green/10 to-juai-orange/5",
    accentColor: "text-juai-green",
    bgPattern: "bg-[linear-gradient(135deg,_var(--tw-gradient-stops))]",
  },
};

// Default config
const defaultConfig = {
  icon: Sparkles,
  gradient: "from-juai-gray-100 to-juai-gray-50",
  accentColor: "text-juai-gray-600",
  bgPattern: "bg-gradient-to-br",
};

export default function SmartActionCard({ card, onAction }: SmartActionCardProps) {
  const config = cardTypeConfig[card.type] || defaultConfig;
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`
        relative overflow-hidden rounded-2xl border border-juai-gray-200
        ${config.bgPattern} ${config.gradient}
        hover:border-juai-green/30 hover:shadow-juai-lg
        transition-all duration-300
      `}
    >
      {/* Content */}
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 w-12 h-12 rounded-xl 
              flex items-center justify-center
              bg-white shadow-juai-sm border border-juai-gray-100
            `}
          >
            <IconComponent className={`w-6 h-6 ${config.accentColor}`} />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-juai-black text-lg mb-1 truncate">
              {card.title}
            </h3>
            <p className="text-sm text-juai-gray-500 line-clamp-2">
              {card.description}
            </p>
          </div>
        </div>

        {/* Data Preview (if available) */}
        {card.data && Object.keys(card.data).length > 0 && (
          <div className="mb-4 p-3 bg-white/60 rounded-xl border border-juai-gray-100">
            <div className="flex flex-wrap gap-2">
              {Object.entries(card.data).slice(0, 3).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-juai-gray-100 rounded-full text-xs"
                >
                  <span className="text-juai-gray-500 capitalize">{key}:</span>
                  <span className="text-juai-black font-medium">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar (for certain card types) */}
        {card.type === "video_generation" && card.data?.progress !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-juai-gray-500">진행률</span>
              <span className="text-juai-green font-medium">{card.data.progress}%</span>
            </div>
            <div className="h-2 bg-juai-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${card.data.progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-juai rounded-full"
              />
            </div>
          </div>
        )}

        {/* Status Badge (for certain card types) */}
        {card.data?.status && (
          <div className="mb-4 flex items-center gap-2">
            {card.data.status === "completed" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-juai-green/10 text-juai-green rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                완료됨
              </span>
            ) : card.data.status === "processing" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-juai-orange/10 text-juai-orange rounded-full text-sm font-medium">
                <Clock className="w-4 h-4 animate-spin" />
                처리 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-juai-gray-100 text-juai-gray-600 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                대기 중
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {card.actions.map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction(card.type, action.action, card.data)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl
                font-medium text-sm transition-all duration-200
                ${
                  index === 0
                    ? "bg-juai-green text-white hover:bg-juai-green/90 shadow-sm hover:shadow-juai-glow-green"
                    : "bg-white text-juai-black border border-juai-gray-200 hover:border-juai-green/50 hover:bg-juai-gray-50"
                }
              `}
            >
              {index === 0 ? (
                <>
                  <Play className="w-4 h-4" />
                  {action.label}
                </>
              ) : (
                <>
                  {action.label}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <IconComponent className="w-full h-full" />
      </div>
    </motion.div>
  );
}

// Export additional card variants
export function SmartActionCardCompact({
  card,
  onAction,
}: SmartActionCardProps) {
  const config = cardTypeConfig[card.type] || defaultConfig;
  const IconComponent = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAction(card.type, card.actions[0]?.action || "", card.data)}
      className={`
        w-full p-4 rounded-xl border border-juai-gray-200
        ${config.bgPattern} ${config.gradient}
        hover:border-juai-green/30 hover:shadow-juai-md
        transition-all duration-200 text-left
      `}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
          <IconComponent className={`w-5 h-5 ${config.accentColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-juai-black truncate">{card.title}</h4>
          <p className="text-xs text-juai-gray-500 truncate">{card.description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-juai-gray-400" />
      </div>
    </motion.button>
  );
}

export function SmartActionCardList({
  cards,
  onAction,
}: {
  cards: ActionCard[];
  onAction: SmartActionCardProps["onAction"];
}) {
  return (
    <div className="space-y-3">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <SmartActionCardCompact card={card} onAction={onAction} />
        </motion.div>
      ))}
    </div>
  );
}
