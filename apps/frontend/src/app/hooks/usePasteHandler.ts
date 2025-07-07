import { useEffect, useRef, useCallback } from "react";
import { config } from "../config";
import { isValidText } from "../utils/text";
import type { UsePasteHandlerProps } from "../types";

export function usePasteHandler({ onPaste, onError, summarize, loading }: UsePasteHandlerProps): () => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const clearPendingSummarization = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Only handle paste events that occur outside of text inputs/textareas
      if (
        target && 
        (target.tagName === "INPUT" || 
         target.tagName === "TEXTAREA" || 
         target.isContentEditable ||
         (target.closest && target.closest("input, textarea, [contenteditable]")))
      ) {
        return;
      }

      const content = event.clipboardData?.getData("text");
      if (!content || !isValidText(content)) {
        onError("Invalid text content");
        return;
      }

      // Prevent the default paste behavior since we're handling it
      event.preventDefault();
      
      onPaste(content);
      onError("");

      clearPendingSummarization();

      if (!loading) {
        timeoutRef.current = setTimeout(() => summarize(content), config.debounceDelay);
      }
    },
    [onPaste, onError, summarize, loading, clearPendingSummarization]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      clearPendingSummarization();
    };
  }, [handlePaste, clearPendingSummarization]);

  return clearPendingSummarization;
} 