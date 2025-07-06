import { config } from '../config';

export interface EnhancedSummaryRequest {
  text: string;
  max_length?: number;
  api_key?: string;
  provider?: string;
  cost_budget?: number;
  preferences?: Record<string, unknown>;
}

export interface EnhancedSummaryResponse {
  summary: string;
  metadata: {
    cost: number;
    model_used: string;
    tokens_used: number;
    strategy: string;
    cached: boolean;
    cost_budget: number;
  };
}

export interface TextAnalysis {
  analysis: {
    text_length: number;
    estimated_tokens: number;
    complexity_score: number;
    detected_domain: string;
    language: string;
  };
  optimization: {
    recommended_strategy: string;
    expected_tokens: number;
    confidence_score: number;
    estimated_cost: number;
  };
  similar_texts_found: number;
  recommendations: {
    use_cache: boolean;
    cost_effective: boolean;
    complexity_appropriate: boolean;
  };
}

export interface Analytics {
  total_summaries: number;
  strategies_used: Record<string, number>;
  estimated_cost_savings: number;
  cache_size: number;
  domains_detected: string[];
}

class EnhancedApiService {
  private baseUrl = config.apiUrl;

  async enhancedSummarize(request: EnhancedSummaryRequest): Promise<EnhancedSummaryResponse> {
    const url = new URL(`${this.baseUrl}/v2/summarize`);
    
    if (request.cost_budget) {
      url.searchParams.append('cost_budget', request.cost_budget.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        max_length: request.max_length || 200,
        api_key: request.api_key || '',
        provider: request.provider || 'openai',
        preferences: request.preferences || {}
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Enhanced summarization failed');
    }

    return response.json();
  }

  async enhancedSummarizeStream(
    request: EnhancedSummaryRequest,
    onChunk: (chunk: string) => void,
    onComplete: (metadata?: Record<string, unknown>) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const url = new URL(`${this.baseUrl}/v2/summarize/stream`);
    
    if (request.cost_budget) {
      url.searchParams.append('cost_budget', request.cost_budget.toString());
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          max_length: request.max_length || 200,
          api_key: request.api_key || '',
          provider: request.provider || 'openai',
          preferences: request.preferences || {}
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Enhanced streaming failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            
            if (data.startsWith('[ERROR]')) {
              onError(data.slice(8));
              return;
            }
            
            onChunk(data);
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async analyzeText(text: string, apiKey?: string): Promise<TextAnalysis> {
    const response = await fetch(`${this.baseUrl}/v2/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        ...(apiKey && { api_key: apiKey })
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Text analysis failed');
    }

    return response.json();
  }

  async getAnalytics(): Promise<Analytics> {
    const response = await fetch(`${this.baseUrl}/v2/analytics`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Analytics fetch failed');
    }

    return response.json();
  }

  async clearCache(): Promise<{ message: string; items_removed: number }> {
    const response = await fetch(`${this.baseUrl}/v2/cache`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Cache clear failed');
    }

    return response.json();
  }

  // Cost estimation utilities
  estimateCost(tokens: number, model: string = 'gpt-3.5-turbo'): number {
    const rates = {
      'gpt-3.5-turbo': 0.000002,
      'gpt-4': 0.00006,
      'gpt-4-turbo': 0.00003
    };

    return tokens * (rates[model as keyof typeof rates] || rates['gpt-3.5-turbo']);
  }

  // Optimization suggestions
  getOptimizationSuggestions(analysis: TextAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.analysis.complexity_score > 0.8) {
      suggestions.push('Consider breaking down complex text into smaller sections');
    }

    if (analysis.analysis.estimated_tokens > 2000) {
      suggestions.push('Text is long - compression strategy recommended');
    }

    if (analysis.similar_texts_found > 0) {
      suggestions.push('Similar texts found - cache optimization available');
    }

    if (!analysis.recommendations.cost_effective) {
      suggestions.push('Consider using a smaller model or reducing text length');
    }

    if (analysis.optimization.confidence_score < 0.7) {
      suggestions.push('Low confidence - manual review recommended');
    }

    return suggestions;
  }

  // Domain-specific optimization
  getDomainOptimization(domain: string): {
    strategy: string;
    description: string;
    expectedSavings: number;
  } {
    const optimizations = {
      technical: {
        strategy: 'template',
        description: 'Using technical documentation templates',
        expectedSavings: 0.15
      },
      business: {
        strategy: 'template',
        description: 'Using business report templates',
        expectedSavings: 0.12
      },
      academic: {
        strategy: 'template',
        description: 'Using academic paper templates',
        expectedSavings: 0.18
      },
      news: {
        strategy: 'compress',
        description: 'Using news article compression',
        expectedSavings: 0.20
      },
      legal: {
        strategy: 'template',
        description: 'Using legal document templates',
        expectedSavings: 0.10
      },
      general: {
        strategy: 'compress',
        description: 'Using general text compression',
        expectedSavings: 0.08
      }
    };

    return optimizations[domain as keyof typeof optimizations] || optimizations.general;
  }
}

export const enhancedApiService = new EnhancedApiService(); 