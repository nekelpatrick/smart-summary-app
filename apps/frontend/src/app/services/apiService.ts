import { config, endpoints } from "../config";
import { streamingService } from "./streamingService";
import type { 
  SummaryRequest, 
  ExampleResponse, 
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