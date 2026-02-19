/* ─────────────────────────────────────────────────────────
 * StatusBadge — color-coded status pill
 * ───────────────────────────────────────────────────────── */

const STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "rgba(56,189,248,0.1)",
    text: "var(--color-accent)",
    dot: "var(--color-accent)",
  },
  completed: {
    bg: "rgba(74,222,128,0.1)",
    text: "var(--color-success)",
    dot: "var(--color-success)",
  },
  abandoned: {
    bg: "rgba(248,113,113,0.08)",
    text: "var(--color-error)",
    dot: "var(--color-error)",
  },
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const style = (STYLES[status] ?? STYLES.active)!;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[length:var(--text-xs)] font-medium capitalize"
      style={{ background: style.bg, color: style.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: style.dot }}
      />
      {status}
    </span>
  );
}
