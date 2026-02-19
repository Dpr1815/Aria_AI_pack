import { useState, useEffect } from "react";
import { useLabels } from "@/i18n";

interface LoadingModalProps {
  locale?: string;
}

export function LoadingModal({ locale = "en-US" }: LoadingModalProps) {
  const { room: l } = useLabels(locale);
  const messages = l.loadingMessages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3_000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 animate-spin">
            <svg
              className="h-full w-full text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>

        <p className="mb-4 text-center font-medium text-gray-700">
          {messages[index] ?? l.room.creatingReport}
        </p>

        {/* Bouncing dots */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-3 w-3 animate-bounce rounded-full bg-blue-600"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
