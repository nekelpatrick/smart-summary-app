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

export interface ApiError {
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

export type ApiKeyValidationStatus = 'idle' | 'valid' | 'invalid' | 'error';

export interface ApiKeyStorage {
  getApiKey: () => string | null;
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  getSelectedProvider: () => LLMProvider;
  setSelectedProvider: (provider: LLMProvider) => void;
} 