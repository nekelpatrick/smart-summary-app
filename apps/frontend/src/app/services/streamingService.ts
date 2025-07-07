import type { StreamChunk } from "../types";

class StreamingService {
  private decoder = new TextDecoder();

  async processStreamResponse(response: Response): Promise<string> {
    if (!response.body) {
      throw new Error("Response body is not available");
    }

    const reader = response.body.getReader();
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunks = this.parseStreamChunks(value);
        
        for (const chunk of chunks) {
          if (chunk.done) {
            return fullContent;
          }
          
          if (chunk.data && !this.isMetadata(chunk.data)) {
            fullContent += chunk.data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  processStreamResponseWithCallback(
    response: Response,
    onChunk: (content: string) => void
  ): Promise<string> {
    if (!response.body) {
      throw new Error("Response body is not available");
    }

    const reader = response.body.getReader();
    let fullContent = "";

    const processChunk = async (): Promise<string> => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunks = this.parseStreamChunks(value);
          
          for (const chunk of chunks) {
            if (chunk.done) {
              return fullContent;
            }
            
            if (chunk.data && !this.isMetadata(chunk.data)) {
              fullContent += chunk.data;
              onChunk(fullContent);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullContent;
    };

    return processChunk();
  }

  private parseStreamChunks(value: Uint8Array): StreamChunk[] {
    const chunk = this.decoder.decode(value);
    const lines = chunk.split('\n');
    const chunks: StreamChunk[] = [];
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          chunks.push({ data: '', done: true });
        } else if (data.trim()) {
          chunks.push({ data, done: false });
        }
      }
    }
    
    return chunks;
  }

  private isMetadata(data: string): boolean {
    const trimmed = data.trim();
    
    if (!trimmed) return true;
    
    if (trimmed.startsWith('{') || trimmed.endsWith('}') ||
        trimmed.includes('"stage"') || trimmed.includes('"message"') || 
        trimmed.includes('"text_type"') || trimmed.includes('"count"') || 
        trimmed.includes('"compression_achieved"') || trimmed.includes('"quality_score"') ||
        trimmed.includes(': "analyzing"') || trimmed.includes(': "extracting"') ||
        trimmed.includes(': "complete"') || trimmed.includes(': "summarizing"')) {
      return true;
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      return !!(parsed.stage || parsed.message || parsed.text_type || parsed.count || 
               parsed.compression_achieved || parsed.quality_score);
    } catch {
      return false;
    }
  }
}

export const streamingService = new StreamingService(); 