import { useState, lazy, Suspense, Component, type ReactNode } from "react";
import { useLipSyncEvents } from "../../hooks/use-lip-sync-events";
import { useRoomStore } from "../../stores/room.store";
import roomBgUrl from "../../../../assets/room_bg-blur.png";

/* ─────────────────────────────────────────────
 * AvatarPresentation
 * ─────────────────────────────────────────────
 * Displays the 3D avatar inside a circular frame
 * with a background image, glow ring, and inner
 * shadow overlay. Shows a loading spinner while
 * the GLB model loads.
 *
 * The R3F scene is lazy-loaded so the heavy
 * Three.js bundle doesn't block the initial
 * page render or the WebSocket connection.
 *
 * An error boundary isolates WebGL crashes so
 * they don't take down the whole room page.
 * ───────────────────────────────────────────── */

const LazyAvatarScene = lazy(() =>
  import("./avatar-scene").then((m) => ({ default: m.AvatarScene })),
);

/* ── Error boundary for WebGL / Canvas crashes ── */

interface BoundaryState {
  hasError: boolean;
}

class AvatarErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-text-muted">3D unavailable</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Component ── */

interface AvatarPresentationProps {
  isMobile?: boolean;
}

export function AvatarPresentation({
  isMobile = false,
}: AvatarPresentationProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const lipSyncEnabled = useRoomStore(
    (s) => s.agent?.features.lipSync ?? false,
  );
  const lipSync = useLipSyncEvents();

  const frameSize = isMobile
    ? "h-56 w-56"
    : "h-[min(100%,100vh)] w-[min(100%,100vh)] max-h-[600px] max-w-[600px]";

  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${roomBgUrl})` }}
    >
      {/* Circular frame container */}
      <div className={`relative ${frameSize}`}>
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, transparent 45%, rgba(255,255,255,0.1) 48%, rgba(255,255,255,0.05) 50%, transparent 52%)",
            filter: "blur(2px)",
          }}
        />

        {/* Main circular mask */}
        <div
          className="h-full w-full overflow-hidden rounded-full"
          style={{
            border: "3px solid rgba(255,255,255,0.15)",
            boxShadow:
              "0 0 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3), 0 0 60px rgba(100,150,255,0.1)",
          }}
        >
          {/* R3F Canvas (scaled slightly to fill the circle) */}
          <div
            className="h-full w-full"
            style={{ transform: "scale(1.1)", transformOrigin: "center" }}
          >
            <AvatarErrorBoundary>
              <Suspense fallback={null}>
                <LazyAvatarScene
                  lipSync={lipSyncEnabled ? lipSync : null}
                  onLoaded={() => setIsLoaded(true)}
                />
              </Suspense>
            </AvatarErrorBoundary>
          </div>
        </div>

        {/* Inner shadow overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)" }}
        />
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
