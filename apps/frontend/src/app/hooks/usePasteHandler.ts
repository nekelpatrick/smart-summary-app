import { useEffect, useRef, useCallback } from "react";
import { config } from "../config";
import { isValidText } from "../utils/text";

interface UsePasteHandlerProps {
  onPaste: (content: string) => void;
  onError: (error: string) => void;
  summarize: (content: string) => Promise<void>;
}

export function usePasteHandler({ 
  onPaste, 
  onError, 
  summarize 
}: UsePasteHandlerProps) {
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const content = event.clipboardData?.getData("text");
      if (!content || !isValidText(content)) return;

      onPaste(content);
      onError("");

      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => summarize(content), config.debounceDelay);
    },
    [onPaste, onError, summarize]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [handlePaste]);

  return { timeout };
} 