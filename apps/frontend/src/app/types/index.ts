export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  COHERE = 'cohere',
}

export enum ProviderStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  COMING_SOON = 'coming_soon',
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  status: ProviderStatus;
  enabled: boolean;
  key_prefix: string;
  min_key_length: number;
}

export interface ProvidersListResponse {
  providers: ProviderInfo[];
  default_provider: string;
}

export interface SummaryRequest {
  text: string;
  max_length?: number;
  api_key?: string;
  provider?: LLMProvider;
}

export interface SummaryResponse {
  summary: string;
  originalLength?: number;
  summaryLength?: number;
  provider?: string;
}

export interface ExampleResponse {
  text: string;
}

export interface ApiKeyValidationRequest {
  api_key: string;
  provider: LLMProvider;
}

export interface ApiKeyValidationResponse {
  valid: boolean;
  message: string;
  provider: string;
}

export interface ApiErrorResponse {
  detail: string;
  status?: number;
}

export interface SpinnerProps {
  size?: number;
  className?: string;
}

export interface InstructionsProps {
  onExample: () => void;
  loading: boolean;
}

export interface TextDisplayProps {
  text: string;
  words: number;
  chars: number;
  onClear: () => void;
}

export interface ResultDisplayProps {
  summary: string;
  loading: boolean;
  error: string;
  copied: boolean;
  isCached: boolean;
  onCopy: () => void;
  onTryAgain: () => void;
}

export interface MobileTextInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

export type ApiKeyValidationStatus = 'idle' | 'valid' | 'invalid' | 'error';

export interface ApiKeyInputProps {
  apiKey: string;
  selectedProvider: LLMProvider;
  availableProviders: ProviderInfo[];
  onApiKeyChange: (apiKey: string) => void;
  onProviderChange: (provider: LLMProvider) => void;
  validating: boolean;
  validationStatus: ApiKeyValidationStatus;
  onValidate: () => void;
  onClear: () => void;
  loadingProviders: boolean;
}

export interface UsePasteHandlerProps {
  onPaste: (content: string) => void;
  onError: (error: string) => void;
  summarize: (content: string) => Promise<void>;
}

export interface UseTextSummaryReturn {
  text: string;
  summary: string;
  loading: boolean;
  error: string;
  copied: boolean;
  isCached: boolean;
  apiKey: string;
  selectedProvider: LLMProvider;
  availableProviders: ProviderInfo[];
  apiKeyValidationStatus: ApiKeyValidationStatus;
  validatingApiKey: boolean;
  loadingProviders: boolean;
  setText: (text: string) => void;
  summarize: (content: string) => Promise<void>;
  copyToClipboard: () => void;
  reset: () => void;
  loadExample: () => Promise<void>;
  tryAgain: () => Promise<void>;
  setApiKey: (apiKey: string) => void;
  setSelectedProvider: (provider: LLMProvider) => void;
  validateApiKey: () => Promise<void>;
  clearApiKey: () => void;
}

export interface StreamChunk {
  data: string;
  done: boolean;
}

export type SummaryCache = Map<string, string>;

export interface AppConfig {
  apiUrl: string;
  defaultMaxLength: number;
  debounceDelay: number;
  copiedFeedbackDuration: number;
  cachedFeedbackDuration: number;
  cacheSize: number;
}

export interface TextAnalysis {
  analysis: {
    text_length: number;
    estimated_tokens: number;
    complexity_score: number;
    detected_domain: string;
  };
  optimization: {
    recommended_strategy: string;
    estimated_cost: number;
    expected_tokens: number;
    confidence_score: number;
  };
  similar_texts_found: number;
  recommendations: {
    use_cache: boolean;
    cost_effective: boolean;
    complexity_appropriate: boolean;
  };
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  timestamp?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

export interface ApiKeyStorage {
  getApiKey: () => string | null;
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  getSelectedProvider: () => LLMProvider;
  setSelectedProvider: (provider: LLMProvider) => void;
}

export interface UnknownObject {
  [key: string]: unknown;
}

export type ApiKeyValidationResponseData = {
  valid: boolean;
  message: string;
  provider: string;
};

export type ProvidersListResponseData = {
  providers: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    enabled: boolean;
    key_prefix: string;
    min_key_length: number;
  }>;
  default_provider: string;
};

export type ExampleResponseData = {
  text: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string = "API_ERROR"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, public code: string = "NETWORK_ERROR") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ApiValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

export function isApiKeyValidationResponse(data: unknown): data is ApiKeyValidationResponseData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as UnknownObject;
  return typeof obj.valid === 'boolean' && 
         typeof obj.message === 'string' && 
         typeof obj.provider === 'string';
}

export function isProvidersListResponse(data: unknown): data is ProvidersListResponseData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as UnknownObject;
  
  if (!Array.isArray(obj.providers) || typeof obj.default_provider !== 'string') {
    return false;
  }
  
  return obj.providers.every((provider: unknown) => {
    if (!provider || typeof provider !== 'object') return false;
    const p = provider as UnknownObject;
    return typeof p.id === 'string' && 
           typeof p.name === 'string' && 
           typeof p.description === 'string' && 
           typeof p.status === 'string' && 
           typeof p.enabled === 'boolean' && 
           typeof p.key_prefix === 'string' && 
           typeof p.min_key_length === 'number';
  });
}

export function isExampleResponse(data: unknown): data is ExampleResponseData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as UnknownObject;
  return typeof obj.text === 'string';
}

export function isValidSummaryResponse(data: unknown): data is SummaryResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as UnknownObject;
  return typeof obj.summary === 'string';
}

export function isValidProviderInfo(data: unknown): data is ProviderInfo {
  return (
    typeof data === "object" &&
    data !== null &&
    isValidLLMProvider((data as ProviderInfo).id) &&
    typeof (data as ProviderInfo).name === "string" &&
    typeof (data as ProviderInfo).description === "string" &&
    isValidProviderStatus((data as ProviderInfo).status) &&
    typeof (data as ProviderInfo).enabled === "boolean" &&
    typeof (data as ProviderInfo).key_prefix === "string" &&
    typeof (data as ProviderInfo).min_key_length === "number"
  );
}

export function isValidLLMProvider(value: unknown): value is LLMProvider {
  return Object.values(LLMProvider).includes(value as LLMProvider);
}

export function isValidProviderStatus(value: unknown): value is ProviderStatus {
  return Object.values(ProviderStatus).includes(value as ProviderStatus);
}

export function isValidApiKeyValidationStatus(
  value: unknown
): value is ApiKeyValidationStatus {
  const validStatuses = ['idle', 'valid', 'invalid', 'error'] as const;
  return validStatuses.includes(value as ApiKeyValidationStatus);
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    typeof error.statusCode === "number" &&
    typeof error.errorType === "string"
  );
}

export function isNetworkError(error: unknown): error is NetworkError {
  return (
    error instanceof NetworkError &&
    typeof error.code === "string"
  );
} 