import { useEffect } from "react";

const APP_NAME = "Client Project";

/**
 * Sets the document title. Resets to the app name on unmount.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
