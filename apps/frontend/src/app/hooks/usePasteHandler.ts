import { useEffect, useRef, useCallback } from "react";
import { config } from "../config";
import { isValidText } from "../utils/text";
import type { UsePasteHandlerProps } from "../types";

export function usePasteHandler({ onPaste, onError, summarize }: UsePasteHandlerProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const content = event.clipboardData?.getData("text");
      if (!content || !isValidText(content)) return;

      onPaste(content);
      onError("");

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => summarize(content), config.debounceDelay);
    },
    [onPaste, onError, summarize]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handlePaste]);
} 