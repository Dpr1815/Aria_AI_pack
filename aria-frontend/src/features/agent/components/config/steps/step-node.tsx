/* ─────────────────────────────────────────────────────────
 * StepNode — custom React Flow node for pipeline steps
 *
 * Each step gets a unique accent color from a curated
 * palette based on its index. Icons are general-purpose.
 * Assessment node is always last and unnumbered.
 * ───────────────────────────────────────────────────────── */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Hexagon,
  Circle,
  Triangle,
  Diamond,
  Pentagon,
  Star,
  Octagon,
  Square,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/utils";

/* ── Node accent palette ─────────────────────────────────── */

const ACCENT_PALETTE = [
  {
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.5)",
    text: "#f97316",
    glow: "rgba(249,115,22,0.2)",
  },
  {
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.5)",
    text: "#8b5cf6",
    glow: "rgba(139,92,246,0.2)",
  },
  {
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.5)",
    text: "#38bdf8",
    glow: "rgba(56,189,248,0.2)",
  },
  {
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.5)",
    text: "#4ade80",
    glow: "rgba(74,222,128,0.2)",
  },
  {
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.5)",
    text: "#fbbf24",
    glow: "rgba(251,191,36,0.2)",
  },
  {
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.5)",
    text: "#f87171",
    glow: "rgba(248,113,113,0.2)",
  },
  {
    bg: "rgba(232,121,249,0.12)",
    border: "rgba(232,121,249,0.5)",
    text: "#e879f9",
    glow: "rgba(232,121,249,0.2)",
  },
  {
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.5)",
    text: "#60a5fa",
    glow: "rgba(96,165,250,0.2)",
  },
] as const;

const ASSESSMENT_ACCENT = {
  bg: "rgba(251,191,36,0.10)",
  border: "rgba(251,191,36,0.45)",
  text: "#fbbf24",
  glow: "rgba(251,191,36,0.2)",
};

function getAccent(index: number, isAssessment: boolean) {
  if (isAssessment) return ASSESSMENT_ACCENT;
  return ACCENT_PALETTE[index % ACCENT_PALETTE.length]!;
}

/* ── General-purpose icons cycled by index ───────────────── */

const ICONS = [
  Hexagon,
  Circle,
  Triangle,
  Diamond,
  Pentagon,
  Star,
  Octagon,
  Square,
] as const;

function getIcon(index: number, isAssessment: boolean) {
  if (isAssessment) return ClipboardCheck;
  return ICONS[index % ICONS.length]!;
}

/* ── Types ───────────────────────────────────────────────── */

export type StepNodeData = {
  label: string;
  stepKey: string;
  order: number;
  colorIndex: number;
  isFirst: boolean;
  isLast: boolean;
  isAssessment: boolean;
  isSelected: boolean;
  onSelect: (key: string) => void;
};

/* ── Component ───────────────────────────────────────────── */

function StepNodeComponent({ data }: NodeProps & { data: StepNodeData }) {
  const {
    label,
    stepKey,
    colorIndex,
    isFirst,
    isLast,
    isAssessment,
    isSelected,
    onSelect,
  } = data;

  const accent = getAccent(colorIndex, isAssessment);
  const Icon = getIcon(colorIndex, isAssessment);

  return (
    <>
      {!isFirst && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-0"
          style={{ background: accent.border }}
        />
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isAssessment ? "__assessment__" : stepKey);
        }}
        className={cn(
          "group flex w-64 items-center gap-3.5 rounded-card px-4 py-3.5",
          "border-[1.5px] transition-all duration-200",
          "cursor-pointer select-none",
        )}
        style={{
          borderColor: isSelected ? accent.border : "rgba(255,255,255,0.08)",
          background: isSelected ? accent.bg : "rgba(51,50,84,0.95)",
          boxShadow: isSelected
            ? `0 0 24px ${accent.glow}, 0 4px 12px rgba(0,0,0,0.3)`
            : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            "transition-all duration-200",
          )}
          style={{
            background: isSelected ? accent.text : accent.bg,
            color: isSelected ? "#2a2944" : accent.text,
          }}
        >
          <Icon size={17} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-text">{label}</p>
          <p className="truncate text-[11px] text-text-muted">
            {isAssessment ? "Test module" : stepKey}
          </p>
        </div>

        {/* Order badge — assessment gets a ✦ instead of a number */}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
          style={{ background: accent.bg, color: accent.text }}
        >
          {isAssessment ? "✦" : colorIndex + 1}
        </span>
      </button>

      {!isLast && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-0"
          style={{ background: accent.border }}
        />
      )}
    </>
  );
}

export const StepNode = memo(StepNodeComponent);
