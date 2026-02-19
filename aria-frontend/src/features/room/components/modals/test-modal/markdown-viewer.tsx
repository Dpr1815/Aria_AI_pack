import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/* ─────────────────────────────────────────────
 * MarkdownViewer
 * ─────────────────────────────────────────────
 * Renders markdown content (assessment questions)
 * with styles that match the Pack design system.
 *
 * Uses react-markdown + remark-gfm for full GFM
 * support (tables, strikethrough, task lists).
 *
 * All styles use design-token classes — no
 * hardcoded colors.
 * ───────────────────────────────────────────── */

interface MarkdownViewerProps {
  content: string;
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="mb-4 mt-6 font-display text-2xl font-bold text-text first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-3 mt-5 font-display text-xl font-semibold text-text first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-3 mt-4 font-display text-lg font-semibold text-primary"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="mb-2 mt-3 font-display text-base font-semibold text-primary/80"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-4 leading-relaxed text-text-secondary" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-4 list-disc space-y-1.5 pl-6 text-text-secondary"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-1.5 pl-6 text-text-secondary"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-text" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-text-secondary" {...props}>
      {children}
    </em>
  ),
  hr: (props) => <hr className="my-6 border-border" {...props} />,
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 border-l-3 border-primary/40 pl-4 italic text-text-muted"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary-hover hover:decoration-primary"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-input border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="border-b border-border bg-surface-overlay/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border-t border-border px-4 py-2 text-text-secondary"
      {...props}
    >
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");

    if (isBlock) {
      return (
        <code
          className={`block overflow-x-auto rounded-input bg-surface p-4 font-mono text-sm leading-relaxed text-text ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="rounded bg-primary-light px-1.5 py-0.5 font-mono text-sm text-primary"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-4 overflow-hidden rounded-input border border-border bg-surface"
      {...props}
    >
      {children}
    </pre>
  ),
};

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
