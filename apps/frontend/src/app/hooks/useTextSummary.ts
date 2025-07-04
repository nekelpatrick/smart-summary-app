import { useState, useRef, useCallback } from "react";
import { config, endpoints } from "../config";
import { normalizeText, isValidText } from "../utils/text";
import type { 
  SummaryRequest, 
  SummaryResponse, 
  ExampleResponse,
  UseTextSummaryReturn 
} from "../types";

export function useTextSummary(): UseTextSummaryReturn {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, string>>(new Map<string, string>());

  const summarize = useCallback(async (content: string) => {
    if (!isValidText(content)) return;

    const normalizedContent = normalizeText(content);
    const cachedSummary = cacheRef.current.get(normalizedContent);
    
    if (cachedSummary) {
      setIsCached(true);
      setSummary(cachedSummary);
      setError("");
      setTimeout(() => setIsCached(false), config.cachedFeedbackDuration);
      return;
    }

    setIsCached(false);
    setError("");
    setSummary("");
    setLoading(true);

    try {
      const payload: SummaryRequest = { 
        text: content, 
        max_length: config.defaultMaxLength 
      };

      const response = await fetch(`${config.apiUrl}${endpoints.summarize}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Unable to summarize (${response.status})`);
      }

      const data: SummaryResponse = await response.json();

      if (cacheRef.current.size >= config.cacheSize) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      cacheRef.current.set(normalizedContent, data.summary);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!summary) return;

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), config.copiedFeedbackDuration);
      })
      .catch(() => setError("Unable to copy"));
  }, [summary]);

  const reset = useCallback(() => {
    setText("");
    setSummary("");
    setError("");
    setLoading(false);
    setCopied(false);
    setIsCached(false);
    cacheRef.current.clear();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const loadExample = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch(`${config.apiUrl}${endpoints.example}`);
      if (!response.ok) {
        throw new Error(`Failed to load example (${response.status})`);
      }

      const data: ExampleResponse = await response.json();
      setText(data.text);
      await summarize(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Example failed to load");
      setLoading(false);
    }
  }, [summarize]);

  return {
    text,
    summary,
    loading,
    error,
    copied,
    isCached,
    setText,
    summarize,
    copyToClipboard,
    reset,
    loadExample,
  };
} 