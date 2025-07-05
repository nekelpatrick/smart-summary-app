import { useState, useRef, useCallback } from "react";
import { config } from "../config";
import { normalizeText, isValidText } from "../utils/text";
import { apiService } from "../services/apiService";
import type { 
  SummaryRequest, 
  UseTextSummaryReturn,
  SummaryCache,
  ApiError
} from "../types";

export function useTextSummary(): UseTextSummaryReturn {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>();
  const cacheRef = useRef<SummaryCache>(new Map<string, string>());

  const getErrorMessage = useCallback((error: unknown): string => {
    if (error && typeof error === 'object' && 'detail' in error) {
      const apiError = error as ApiError;
      return apiError.detail;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return "An unexpected error occurred. Please try again.";
  }, []);

  const updateCache = useCallback((key: string, value: string): void => {
    const cache = cacheRef.current;
    if (!cache) return;

    if (cache.size >= config.cacheSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    cache.set(key, value);
  }, []);

  const clearTimeouts = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const summarize = useCallback(async (content: string): Promise<void> => {
    if (!isValidText(content)) {
      setError("Please enter valid text to summarize");
      return;
    }

    const normalizedContent = normalizeText(content);
    const cache = cacheRef.current;
    const cachedSummary = cache?.get(normalizedContent);
    
    if (cachedSummary) {
      setIsCached(true);
      setSummary(cachedSummary);
      setError("");
      
      clearTimeouts();
      timeoutRef.current = setTimeout(() => {
        setIsCached(false);
      }, config.cachedFeedbackDuration);
      
      return;
    }

    setIsCached(false);
    setError("");
    setSummary("");
    setLoading(true);

    try {
      const request: SummaryRequest = { 
        text: content, 
        max_length: config.defaultMaxLength 
      };

      const result = await apiService.summarizeText(request, (progressContent) => {
        setSummary(progressContent);
      });

      setSummary(result);
      updateCache(normalizedContent, result);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setSummary("");
    } finally {
      setLoading(false);
    }
  }, [updateCache, getErrorMessage, clearTimeouts]);

  const copyToClipboard = useCallback(async (): Promise<void> => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      
      clearTimeouts();
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, config.copiedFeedbackDuration);
    } catch {
      setError("Unable to copy to clipboard");
    }
  }, [summary, clearTimeouts]);

  const reset = useCallback((): void => {
    setText("");
    setSummary("");
    setError("");
    setLoading(false);
    setCopied(false);
    setIsCached(false);
    cacheRef.current?.clear();
    clearTimeouts();
  }, [clearTimeouts]);

  const loadExample = useCallback(async (): Promise<void> => {
    try {
      setError("");
      setLoading(true);

      const example = await apiService.getExample();
      setText(example.text);
      await summarize(example.text);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [summarize, getErrorMessage]);

  const tryAgain = useCallback(async (): Promise<void> => {
    if (!text || !isValidText(text)) {
      setError("No text available to retry");
      return;
    }

    const normalizedContent = normalizeText(text);
    const cache = cacheRef.current;
    
    if (cache) {
      cache.delete(normalizedContent);
    }

    setIsCached(false);
    setError("");
    setSummary("");
    setLoading(true);

    try {
      const request: SummaryRequest = { 
        text: text, 
        max_length: config.defaultMaxLength 
      };

      const result = await apiService.summarizeText(request, (progressContent) => {
        setSummary(progressContent);
      });

      setSummary(result);
      updateCache(normalizedContent, result);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setSummary("");
    } finally {
      setLoading(false);
    }
  }, [text, updateCache, getErrorMessage]);

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
    tryAgain,
  };
} 