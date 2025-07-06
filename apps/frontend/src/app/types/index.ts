export interface SummaryRequest {
  text: string;
  max_length?: number;
}

export interface SummaryResponse {
  summary: string;
}

export interface ExampleResponse {
  text: string;
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
  setText: (text: string) => void;
  summarize: (content: string) => Promise<void>;
  copyToClipboard: () => void;
  reset: () => void;
  loadExample: () => Promise<void>;
  tryAgain: () => Promise<void>;
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