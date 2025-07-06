import { enhancedApiService } from '../services/enhancedApiService';

// Mock fetch globally
global.fetch = jest.fn();

describe('EnhancedApiService', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('enhancedSummarize', () => {
    it('should make POST request to /v2/summarize endpoint', async () => {
      const mockResponse = {
        summary: 'Test summary',
        metadata: {
          cost: 0.002,
          model_used: 'gpt-3.5-turbo',
          tokens_used: 150,
          strategy: 'template',
          cached: false,
          cost_budget: 0.01
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await enhancedApiService.enhancedSummarize({
        text: 'Test text',
        max_length: 200,
        api_key: 'test-key',
        provider: 'openai',
        cost_budget: 0.01,
        preferences: { style: 'technical' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/summarize?cost_budget=0.01'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'Test text',
            max_length: 200,
            api_key: 'test-key',
            provider: 'openai',
            preferences: { style: 'technical' }
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'API Error' }),
      } as Response);

      await expect(enhancedApiService.enhancedSummarize({
        text: 'Test text'
      })).rejects.toThrow('API Error');
    });

    it('should handle missing cost budget', async () => {
      const mockResponse = {
        summary: 'Test summary',
        metadata: {
          cost: 0.002,
          model_used: 'gpt-3.5-turbo',
          tokens_used: 150,
          strategy: 'template',
          cached: false,
          cost_budget: 0.01
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await enhancedApiService.enhancedSummarize({
        text: 'Test text'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('cost_budget'),
        expect.any(Object)
      );
    });
  });

  describe('enhancedSummarizeStream', () => {
    it('should handle streaming responses', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: Test\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: streaming\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n\n')
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined
          })
      };

      const mockBody = {
        getReader: jest.fn().mockReturnValue(mockReader)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      } as unknown as Response);

      const chunks: string[] = [];
      const onChunk = jest.fn((chunk: string) => chunks.push(chunk));
      const onComplete = jest.fn();
      const onError = jest.fn();

      await enhancedApiService.enhancedSummarizeStream({
        text: 'Test text'
      }, onChunk, onComplete, onError);

      expect(onChunk).toHaveBeenCalledWith('Test');
      expect(onChunk).toHaveBeenCalledWith('streaming');
      expect(onComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [ERROR] Something went wrong\n\n')
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined
          })
      };

      const mockBody = {
        getReader: jest.fn().mockReturnValue(mockReader)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      } as unknown as Response);

      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await enhancedApiService.enhancedSummarizeStream({
        text: 'Test text'
      }, onChunk, onComplete, onError);

      expect(onError).toHaveBeenCalledWith('Something went wrong');
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await enhancedApiService.enhancedSummarizeStream({
        text: 'Test text'
      }, onChunk, onComplete, onError);

      expect(onError).toHaveBeenCalledWith('Network error');
    });

    it('should handle no response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      } as Response);

      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await enhancedApiService.enhancedSummarizeStream({
        text: 'Test text'
      }, onChunk, onComplete, onError);

      expect(onError).toHaveBeenCalledWith('No response body');
    });
  });

  describe('analyzeText', () => {
    it('should analyze text and return analysis data', async () => {
      const mockAnalysis = {
        analysis: {
          text_length: 100,
          estimated_tokens: 25,
          complexity_score: 0.5,
          detected_domain: 'general',
          language: 'en'
        },
        optimization: {
          recommended_strategy: 'template',
          expected_tokens: 20,
          confidence_score: 0.8,
          estimated_cost: 0.001
        },
        similar_texts_found: 2,
        recommendations: {
          use_cache: true,
          cost_effective: true,
          complexity_appropriate: true
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      } as Response);

      const result = await enhancedApiService.analyzeText('Test text', 'test-key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/analyze'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams)
        })
      );

      expect(result).toEqual(mockAnalysis);
    });

    it('should handle analysis without API key', async () => {
      const mockAnalysis = {
        analysis: {
          text_length: 100,
          estimated_tokens: 25,
          complexity_score: 0.5,
          detected_domain: 'general',
          language: 'en'
        },
        optimization: {
          recommended_strategy: 'template',
          expected_tokens: 20,
          confidence_score: 0.8,
          estimated_cost: 0.001
        },
        similar_texts_found: 0,
        recommendations: {
          use_cache: false,
          cost_effective: true,
          complexity_appropriate: true
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      } as Response);

      const result = await enhancedApiService.analyzeText('Test text');

      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics data', async () => {
      const mockAnalytics = {
        total_summaries: 10,
        strategies_used: {
          'template': 5,
          'compress': 3,
          'cache_hit': 2
        },
        estimated_cost_savings: 0.015,
        cache_size: 8,
        domains_detected: ['general', 'technical', 'business']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await enhancedApiService.getAnalytics();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/analytics')
      );

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and return confirmation', async () => {
      const mockResponse = {
        message: 'Cache cleared successfully',
        items_removed: 8
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await enhancedApiService.clearCache();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/cache'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs correctly', () => {
      expect(enhancedApiService.estimateCost(1000, 'gpt-3.5-turbo')).toBe(0.002);
      expect(enhancedApiService.estimateCost(1000, 'gpt-4')).toBe(0.06);
      expect(enhancedApiService.estimateCost(1000, 'gpt-4-turbo')).toBe(0.03);
      expect(enhancedApiService.estimateCost(1000, 'unknown-model')).toBe(0.002); // fallback
    });
  });

  describe('Optimization Suggestions', () => {
    it('should provide optimization suggestions based on analysis', () => {
      const mockAnalysis = {
        analysis: {
          text_length: 5000,
          estimated_tokens: 2500,
          complexity_score: 0.9,
          detected_domain: 'technical',
          language: 'en'
        },
        optimization: {
          recommended_strategy: 'chunk',
          expected_tokens: 1800,
          confidence_score: 0.6,
          estimated_cost: 0.008
        },
        similar_texts_found: 1,
        recommendations: {
          use_cache: false,
          cost_effective: false,
          complexity_appropriate: false
        }
      };

      const suggestions = enhancedApiService.getOptimizationSuggestions(mockAnalysis);

      expect(suggestions).toContain('Consider breaking down complex text into smaller sections');
      expect(suggestions).toContain('Text is long - compression strategy recommended');
      expect(suggestions).toContain('Similar texts found - cache optimization available');
      expect(suggestions).toContain('Consider using a smaller model or reducing text length');
      expect(suggestions).toContain('Low confidence - manual review recommended');
    });

    it('should provide no suggestions for optimized text', () => {
      const mockAnalysis = {
        analysis: {
          text_length: 200,
          estimated_tokens: 50,
          complexity_score: 0.3,
          detected_domain: 'general',
          language: 'en'
        },
        optimization: {
          recommended_strategy: 'template',
          expected_tokens: 40,
          confidence_score: 0.9,
          estimated_cost: 0.001
        },
        similar_texts_found: 0,
        recommendations: {
          use_cache: false,
          cost_effective: true,
          complexity_appropriate: true
        }
      };

      const suggestions = enhancedApiService.getOptimizationSuggestions(mockAnalysis);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Domain Optimization', () => {
    it('should provide domain-specific optimization strategies', () => {
      const domains = ['technical', 'business', 'academic', 'news', 'legal', 'general'];
      
      domains.forEach(domain => {
        const optimization = enhancedApiService.getDomainOptimization(domain);
        
        expect(optimization).toHaveProperty('strategy');
        expect(optimization).toHaveProperty('description');
        expect(optimization).toHaveProperty('expectedSavings');
        expect(typeof optimization.expectedSavings).toBe('number');
        expect(optimization.expectedSavings).toBeGreaterThan(0);
        expect(optimization.expectedSavings).toBeLessThan(1);
      });
    });

    it('should fallback to general optimization for unknown domains', () => {
      const optimization = enhancedApiService.getDomainOptimization('unknown-domain');
      const generalOptimization = enhancedApiService.getDomainOptimization('general');
      
      expect(optimization).toEqual(generalOptimization);
    });
  });
}); 