import { useRef } from "react";
import type { PresentationViewerProps } from "../../types";

/* ─────────────────────────────────────────────
 * PresentationViewer
 * ─────────────────────────────────────────────
 * Embeds a Google Slides presentation.
 * An invisible overlay prevents the user from
 * interacting with the iframe (no slide changes).
 * ───────────────────────────────────────────── */

export function PresentationViewer({
  presentationId,
  currentSlide,
  isMobile = false,
}: PresentationViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseUrl = `https://docs.google.com/presentation/d/${presentationId}/embed`;
  const url = `${baseUrl}?start=false&loop=false&delayms=3000&rm=minimal&slide=${currentSlide}&backgroundColor=transparent`;

  const blockInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full overflow-hidden bg-surface">
        <div className="relative h-full w-full">
          {/* Scale trick to hide Slides UI chrome on mobile */}
          <div
            className="absolute inset-0"
            style={{
              transform: "scaleY(1.3) scaleX(1.08) translateY(-25%)",
              transformOrigin: "top",
            }}
          >
            <iframe
              ref={iframeRef}
              src={url}
              title="Presentation"
              className="h-full w-full border-none"
              allowFullScreen
            />
          </div>
          {/* Interaction blocker */}
          <div
            className="absolute inset-0 touch-none bg-transparent"
            onClick={blockInteraction}
            onMouseDown={blockInteraction}
            onTouchStart={blockInteraction}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-border bg-surface-overlay shadow-card">
      <iframe
        ref={iframeRef}
        src={url}
        title="Presentation"
        className="h-full w-full border-none bg-transparent"
        allowFullScreen
      />
      {/* Interaction blocker */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={blockInteraction}
        onMouseDown={blockInteraction}
        onTouchStart={blockInteraction}
      />
    </div>
  );
}
