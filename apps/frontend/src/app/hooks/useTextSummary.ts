import { useState, useRef, useCallback, useEffect } from "react";
import { config } from "../config";
import { normalizeText, isValidText } from "../utils/text";
import { apiService } from "../services/apiService";
import { LLMProvider, ProviderStatus, ApiError } from "../types";
import type { 
  SummaryRequest, 
  UseTextSummaryReturn,
  SummaryCache,
  ApiKeyValidationStatus,
  ApiKeyValidationRequest,
  ProviderInfo
} from "../types";

const API_KEY_STORAGE_KEY = 'summarizer_api_key';
const PROVIDER_STORAGE_KEY = 'summarizer_provider';

export function useTextSummary(): UseTextSummaryReturn {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [apiKey, setApiKeyState] = useState('');
  const [selectedProvider, setSelectedProviderState] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [apiKeyValidationStatus, setApiKeyValidationStatus] = useState<ApiKeyValidationStatus>('idle');
  const [validatingApiKey, setValidatingApiKey] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cacheRef = useRef<SummaryCache>(new Map<string, string>());

  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    const savedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY) as LLMProvider || LLMProvider.OPENAI;
    
    setApiKeyState(savedApiKey);
    setSelectedProviderState(savedProvider);
    setIsHydrated(true);
  }, []);

  const getErrorMessage = useCallback((error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof ApiError) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return "An unexpected error occurred";
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

  const loadProviders = useCallback(async (): Promise<void> => {
    try {
      setLoadingProviders(true);
      const providersData = await apiService.getProviders();
      setAvailableProviders(providersData.providers);
      
      const currentProvider = providersData.providers.find(p => p.id === selectedProvider);
      if (!currentProvider || !currentProvider.enabled) {
        setSelectedProviderState(providersData.default_provider as LLMProvider);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(`Failed to load providers: ${errorMessage}`);
      setAvailableProviders([
        {
          id: LLMProvider.OPENAI,
          name: "OpenAI",
          description: "GPT models (GPT-3.5, GPT-4, etc.)",
          status: ProviderStatus.ENABLED,
          enabled: true,
          key_prefix: "sk-",
          min_key_length: 51
        }
      ]);
    } finally {
      setLoadingProviders(false);
    }
  }, [selectedProvider, getErrorMessage]);

  const setApiKey = useCallback((key: string): void => {
    setApiKeyState(key);
    if (isHydrated) {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
    setApiKeyValidationStatus('idle');
  }, [isHydrated]);

  const setSelectedProvider = useCallback((provider: LLMProvider): void => {
    setSelectedProviderState(provider);
    if (isHydrated) {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    }
    setApiKeyValidationStatus('idle');
  }, [isHydrated]);

  const clearApiKey = useCallback((): void => {
    setApiKey('');
    setApiKeyValidationStatus('idle');
  }, [setApiKey]);

  const validateApiKey = useCallback(async (): Promise<void> => {
    if (!apiKey.trim()) {
      setApiKeyValidationStatus('idle');
      return;
    }

    setValidatingApiKey(true);
    setApiKeyValidationStatus('idle');

    try {
      const request: ApiKeyValidationRequest = { 
        api_key: apiKey.trim(),
        provider: selectedProvider
      };
      const result = await apiService.validateApiKey(request);
      
      if (result.valid) {
        setApiKeyValidationStatus('valid');
      } else {
        setApiKeyValidationStatus('invalid');
        setError(result.message);
      }
    } catch (err) {
      setApiKeyValidationStatus('error');
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setValidatingApiKey(false);
    }
  }, [apiKey, selectedProvider, getErrorMessage]);

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
        max_length: config.defaultMaxLength,
        api_key: apiKey?.trim() || undefined,
        provider: selectedProvider
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
  }, [updateCache, getErrorMessage, clearTimeouts, apiKey, selectedProvider]);

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
      
      const exampleData = await apiService.getExample();
      setText(exampleData.text);
      await summarize(exampleData.text);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(`Failed to load example: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [summarize, getErrorMessage]);

  const tryAgain = useCallback(async (): Promise<void> => {
    if (!text) return;

    const normalizedContent = normalizeText(text);
    const cache = cacheRef.current;
    
    if (cache?.has(normalizedContent)) {
      cache.delete(normalizedContent);
    }
    
    setIsCached(false);
    await summarize(text);
  }, [text, summarize]);

  useEffect(() => {
    if (isHydrated) {
      loadProviders();
    }
  }, [isHydrated, loadProviders]);

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    text,
    summary,
    loading,
    error,
    copied,
    isCached,
    apiKey,
    selectedProvider,
    availableProviders,
    apiKeyValidationStatus,
    validatingApiKey,
    loadingProviders,
    setText,
    summarize,
    copyToClipboard,
    reset,
    loadExample,
    tryAgain,
    setApiKey,
    setSelectedProvider,
    validateApiKey,
    clearApiKey,
  };
} 