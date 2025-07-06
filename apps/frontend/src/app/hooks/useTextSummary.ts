import { useState, useRef, useCallback, useEffect } from "react";
import { config } from "../config";
import { normalizeText, isValidText } from "../utils/text";
import { apiService } from "../services/apiService";
import { LLMProvider, ProviderStatus } from "../types";
import type { 
  SummaryRequest, 
  UseTextSummaryReturn,
  SummaryCache,
  ApiError,
  ApiKeyValidationStatus,
  ApiKeyValidationRequest,
  ProviderInfo
} from "../types";

const API_KEY_STORAGE_KEY = 'openai-api-key';
const PROVIDER_STORAGE_KEY = 'selected-provider';

export function useTextSummary(): UseTextSummaryReturn {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [apiKey, setApiKeyState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    }
    return '';
  });
  const [selectedProvider, setSelectedProviderState] = useState<LLMProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
      return (saved as LLMProvider) || LLMProvider.OPENAI;
    }
    return LLMProvider.OPENAI;
  });
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [apiKeyValidationStatus, setApiKeyValidationStatus] = useState<ApiKeyValidationStatus>('idle');
  const [validatingApiKey, setValidatingApiKey] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
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

  const loadProviders = useCallback(async (): Promise<void> => {
    try {
      setLoadingProviders(true);
      const providersData = await apiService.getProviders();
      setAvailableProviders(providersData.providers);
      
      // If current provider is not in the list or not enabled, switch to default
      const currentProvider = providersData.providers.find(p => p.id === selectedProvider);
      if (!currentProvider || !currentProvider.enabled) {
        setSelectedProviderState(providersData.default_provider as LLMProvider);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(`Failed to load providers: ${errorMessage}`);
      // Fallback to default provider configuration
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
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
    setApiKeyValidationStatus('idle');
  }, []);

  const setSelectedProvider = useCallback((provider: LLMProvider): void => {
    setSelectedProviderState(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    }
    // Reset API key validation when provider changes
    setApiKeyValidationStatus('idle');
  }, []);

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
        api_key: apiKey || undefined,
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
        max_length: config.defaultMaxLength,
        api_key: apiKey || undefined,
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
  }, [text, updateCache, getErrorMessage, apiKey, selectedProvider]);

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

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