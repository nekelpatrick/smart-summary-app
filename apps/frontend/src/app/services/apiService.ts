import { config, endpoints } from "../config";
import { streamingService } from "./streamingService";
import type { 
  SummaryRequest, 
  ExampleResponse, 
  ApiKeyValidationRequest,
  ApiKeyValidationResponse,
  ProvidersListResponse,
  ProviderInfo,
  ProviderStatus
} from "../types";
import {
  isApiKeyValidationResponse,
  isProvidersListResponse,
  isExampleResponse,
  ApiValidationError,
  ApiError
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
    return new ApiError(message, status);
  }

  private validateApiKeyResponse(data: unknown): ApiKeyValidationResponse {
    if (!isApiKeyValidationResponse(data)) {
      throw new ApiValidationError("Invalid API key validation response format");
    }

    return { 
      valid: data.valid, 
      message: data.message, 
      provider: data.provider 
    };
  }

  private validateProvidersResponse(data: unknown): ProvidersListResponse {
    if (!isProvidersListResponse(data)) {
      throw new ApiValidationError("Invalid providers response format");
    }

    const providers: ProviderInfo[] = data.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      status: provider.status as ProviderStatus,
      enabled: provider.enabled,
      key_prefix: provider.key_prefix,
      min_key_length: provider.min_key_length,
    }));

    return { 
      providers, 
      default_provider: data.default_provider 
    };
  }

  private validateExampleResponse(data: unknown): ExampleResponse {
    if (!isExampleResponse(data)) {
      throw new ApiValidationError("Invalid example response format");
    }

    return { text: data.text };
  }
}

export const apiService = new ApiService(); 