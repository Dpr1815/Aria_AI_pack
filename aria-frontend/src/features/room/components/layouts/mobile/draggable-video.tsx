import { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { VideoPreview } from "../../display/video-preview";

/* ─────────────────────────────────────────────
 * DraggableVideo (Mobile)
 * ─────────────────────────────────────────────
 * Picture-in-picture webcam preview that the user
 * can drag around the screen on mobile.
 * ───────────────────────────────────────────── */

interface DraggableVideoProps {
  userName: string;
}

export function DraggableVideo({ userName }: DraggableVideoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 196,
    y: window.innerHeight * 0.55,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpanded) return;
    setIsDragging(true);
    const touch = e.touches[0];
    if (!touch) return;
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isExpanded) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const newX = touch.clientX - dragStartRef.current.x;
    const newY = touch.clientY - dragStartRef.current.y;

    // Boundaries
    const maxX = window.innerWidth - 192 - 4;
    const maxY = window.innerHeight - 128 - 100;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPosition({
        x: Math.max(4, Math.min(maxX, newX)),
        y: Math.max(20, Math.min(maxY, newY)),
      });
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => {
    if (isExpanded) setPosition({ x: 0, y: 0 });
  }, [isExpanded]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className={`fixed z-[9995] transition-transform duration-200 ease-out will-change-transform ${
        isExpanded ? "inset-0 top-14 bottom-20" : "top-20"
      }`}
      style={
        isExpanded
          ? { width: "100%", height: "calc(100vh - 12rem)" }
          : { transform: `translate3d(${position.x}px, ${position.y}px, 0)` }
      }
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex flex-col overflow-hidden rounded-lg bg-black shadow-xl ${
          isExpanded ? "h-full w-full" : "h-32 w-48 cursor-move"
        } ${isDragging ? "scale-[1.02] shadow-2xl" : ""} transition-[transform,shadow] duration-200`}
        style={{ touchAction: "none" }}
      >
        <div className="relative h-full">
          <VideoPreview userName={userName} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-2 text-white transition-colors hover:bg-black/70"
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
