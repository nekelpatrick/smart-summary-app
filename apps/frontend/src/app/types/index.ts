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

export interface ErrorResponse {
  detail: string;
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
} 