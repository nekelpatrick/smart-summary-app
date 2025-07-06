import { config, endpoints } from "../config";
import { streamingService } from "./streamingService";
import type { 
  SummaryRequest, 
  ExampleResponse, 
  ApiError,
  ApiKeyValidationRequest,
  ApiKeyValidationResponse,
  ProvidersListResponse,
  ProviderInfo,
  ProviderStatus
} from "../types";

class ApiService {
  private baseUrl = config.apiUrl;

  async summarizeText(
    request: SummaryRequest,
    onProgress?: (content: string) => void
  ): Promise<string> {
    const response = await this.makeRequest(endpoints.summarize, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw this.createError(response.status, `Unable to summarize text`);
    }

    if (onProgress) {
      return streamingService.processStreamResponseWithCallback(response, onProgress);
    }

    return streamingService.processStreamResponse(response);
  }

  async validateApiKey(request: ApiKeyValidationRequest): Promise<ApiKeyValidationResponse> {
    const response = await this.makeRequest(endpoints.validateApiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw this.createError(response.status, "API key validation failed");
    }

    const data = await response.json();
    return this.validateApiKeyResponse(data);
  }

  async getProviders(): Promise<ProvidersListResponse> {
    const response = await this.makeRequest(endpoints.providers);

    if (!response.ok) {
      throw this.createError(response.status, "Failed to load providers");
    }

    const data = await response.json();
    return this.validateProvidersResponse(data);
  }

  async getExample(): Promise<ExampleResponse> {
    const response = await this.makeRequest(endpoints.example);

    if (!response.ok) {
      throw this.createError(response.status, "Failed to load example");
    }

    const data = await response.json();
    return this.validateExampleResponse(data);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest(endpoints.health);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async makeRequest(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
        },
      });

      return response;
    } catch (error) {
      throw this.createError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createError(status: number, message: string): ApiError {
    return {
      detail: message,
      status: status || undefined,
    };
  }

  private validateApiKeyResponse(data: unknown): ApiKeyValidationResponse {
    if (!data || typeof data !== 'object') {
      throw this.createError(0, "Invalid response format");
    }

    const response = data as Record<string, unknown>;
    
    if (typeof response.valid !== 'boolean') {
      throw this.createError(0, "Invalid API key validation response: missing valid field");
    }

    if (typeof response.message !== 'string') {
      throw this.createError(0, "Invalid API key validation response: missing message field");
    }

    if (typeof response.provider !== 'string') {
      throw this.createError(0, "Invalid API key validation response: missing provider field");
    }

    return { 
      valid: response.valid, 
      message: response.message, 
      provider: response.provider 
    };
  }

  private validateProvidersResponse(data: unknown): ProvidersListResponse {
    if (!data || typeof data !== 'object') {
      throw this.createError(0, "Invalid response format");
    }

    const response = data as Record<string, unknown>;
    
    if (!Array.isArray(response.providers)) {
      throw this.createError(0, "Invalid providers response: missing providers array");
    }

    if (typeof response.default_provider !== 'string') {
      throw this.createError(0, "Invalid providers response: missing default_provider field");
    }

    const providers: ProviderInfo[] = response.providers.map((provider: unknown) => {
      if (!provider || typeof provider !== 'object') {
        throw this.createError(0, "Invalid provider format");
      }

      const p = provider as Record<string, unknown>;
      
      if (typeof p.id !== 'string' || 
          typeof p.name !== 'string' || 
          typeof p.description !== 'string' || 
          typeof p.status !== 'string' || 
          typeof p.enabled !== 'boolean' || 
          typeof p.key_prefix !== 'string' || 
          typeof p.min_key_length !== 'number') {
        throw this.createError(0, "Invalid provider format: missing required fields");
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as ProviderStatus,
        enabled: p.enabled,
        key_prefix: p.key_prefix,
        min_key_length: p.min_key_length,
      };
    });

    return { 
      providers, 
      default_provider: response.default_provider 
    };
  }

  private validateExampleResponse(data: unknown): ExampleResponse {
    if (!data || typeof data !== 'object') {
      throw this.createError(0, "Invalid response format");
    }

    const response = data as Record<string, unknown>;
    
    if (typeof response.text !== 'string') {
      throw this.createError(0, "Invalid example response: missing text field");
    }

    return { text: response.text };
  }
}

export const apiService = new ApiService(); 