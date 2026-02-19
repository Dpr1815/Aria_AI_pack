import { useRef, useEffect, useState, memo } from "react";

interface VideoPreviewProps {
  userName: string;
}

export const VideoPreview = memo(function VideoPreview({
  userName,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error("Error accessing media devices:", err);
        setIsLoading(false);
      });

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Name badge */}
      <span className="absolute left-3 top-3 rounded-button bg-background/70 px-2.5 py-1 text-sm font-medium text-text backdrop-blur-md">
        {userName}
      </span>
    </div>
  );
});
