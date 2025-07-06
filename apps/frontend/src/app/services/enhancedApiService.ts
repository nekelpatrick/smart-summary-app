import { config } from '../config';
import type { 
  SummaryRequest, 
  SummaryResponse, 
  ApiKeyValidationRequest, 
  ApiKeyValidationResponse,
  ExampleResponse,
  ApiError
} from '../types';

interface TextAnalysis {
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  reading_time_minutes: number;
  complexity_score: number;
  domain: string;
  language: string;
}

interface OptimizationStrategy {
  strategy: string;
  original_tokens: number;
  optimized_tokens: number;
  estimated_cost: number;
  confidence: number;
  explanation: string;
}

interface Analytics {
  total_summaries: number;
  cache_hits: number;
  cache_misses: number;
  average_processing_time: number;
  estimated_cost_savings: number;
  cache_size: number;
  strategies_used: Record<string, number>;
  domains_detected: string[];
}

interface EnhancedSummaryRequest extends SummaryRequest {
  enable_optimization?: boolean;
  context_strategy?: string;
}

interface EnhancedSummaryResponse extends SummaryResponse {
  optimization_used: OptimizationStrategy;
  analysis: TextAnalysis;
  processing_time: number;
}

class EnhancedApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = config.apiUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        detail: errorData.detail || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  async validateApiKey(request: ApiKeyValidationRequest): Promise<ApiKeyValidationResponse> {
    return this.request<ApiKeyValidationResponse>('/validate-api-key', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getExample(): Promise<ExampleResponse> {
    return this.request<ExampleResponse>('/example');
  }

  async summarizeText(
    request: SummaryRequest,
    onProgress?: (content: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/summarize/stream`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        detail: errorData.detail || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    let fullContent = '';
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') {
              return fullContent;
            }
            fullContent += content;
            onProgress?.(fullContent);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  async enhancedSummarize(request: EnhancedSummaryRequest): Promise<EnhancedSummaryResponse> {
    return this.request<EnhancedSummaryResponse>('/v2/summarize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async enhancedSummarizeStream(
    request: EnhancedSummaryRequest,
    onProgress?: (content: string) => void
  ): Promise<EnhancedSummaryResponse> {
    const response = await fetch(`${this.baseUrl}/v2/summarize/stream`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        detail: errorData.detail || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    let fullContent = '';
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') {
              const finalResponse = JSON.parse(fullContent) as EnhancedSummaryResponse;
              return finalResponse;
            }
            fullContent += content;
            onProgress?.(fullContent);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return JSON.parse(fullContent) as EnhancedSummaryResponse;
  }

  async analyzeText(text: string, apiKey?: string): Promise<TextAnalysis> {
    return this.request<TextAnalysis>('/v2/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, api_key: apiKey }),
    });
  }

  async getAnalytics(): Promise<Analytics> {
    return this.request<Analytics>('/v2/analytics');
  }

  async clearCache(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/v2/cache', {
      method: 'DELETE',
    });
  }

  estimateCost(tokens: number, model: string = 'gpt-3.5-turbo'): number {
    const pricing = {
      'gpt-3.5-turbo': 0.002,
      'gpt-4': 0.06,
      'gpt-4-turbo': 0.01,
    };
    
    const rate = pricing[model as keyof typeof pricing] || 0.002;
    return (tokens / 1000) * rate;
  }

  generateOptimizationSuggestions(analysis: TextAnalysis): OptimizationStrategy[] {
    const suggestions: OptimizationStrategy[] = [];
    
    if (analysis.word_count > 1000) {
      suggestions.push({
        strategy: 'chunk',
        original_tokens: analysis.word_count,
        optimized_tokens: Math.floor(analysis.word_count * 0.7),
        estimated_cost: this.estimateCost(analysis.word_count * 0.7),
        confidence: 0.8,
        explanation: 'Break text into smaller chunks for better processing'
      });
    }
    
    if (analysis.complexity_score > 0.7) {
      suggestions.push({
        strategy: 'compress',
        original_tokens: analysis.word_count,
        optimized_tokens: Math.floor(analysis.word_count * 0.6),
        estimated_cost: this.estimateCost(analysis.word_count * 0.6),
        confidence: 0.9,
        explanation: 'Use compression techniques for complex content'
      });
    }
    
    if (analysis.domain && analysis.domain !== 'general') {
      suggestions.push({
        strategy: 'template',
        original_tokens: analysis.word_count,
        optimized_tokens: Math.floor(analysis.word_count * 0.5),
        estimated_cost: this.estimateCost(analysis.word_count * 0.5),
        confidence: 0.7,
        explanation: `Use domain-specific templates for ${analysis.domain} content`
      });
    }
    
    return suggestions;
  }
}

export const enhancedApiService = new EnhancedApiService();
export type { TextAnalysis, OptimizationStrategy, Analytics, EnhancedSummaryRequest, EnhancedSummaryResponse }; 