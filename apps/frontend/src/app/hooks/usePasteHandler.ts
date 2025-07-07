import { useEffect, useCallback } from "react";
import { isValidText } from "../utils/text";
import type { UsePasteHandlerProps } from "../types";

export function usePasteHandler({ onPaste, onError, summarize }: UsePasteHandlerProps): () => void {
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      
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

      event.preventDefault();
      
      onPaste(content);
      onError("");

      setTimeout(() => {
        summarize(content);
      }, 0);
    },
    [onPaste, onError, summarize]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  return () => {};
} 