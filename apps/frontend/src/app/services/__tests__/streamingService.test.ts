import { streamingService } from '../streamingService';

describe('StreamingService', () => {
  describe('metadata filtering', () => {
    const mockMetadataResponses = [
      '{"stage": "analyzing", "message": "Analyzing content type..."}',
      '{"stage": "analysis_complete", "text_type": "meeting", "target_compression": 0.2}',
      '{"stage": "extracting", "message": "Extracting key information..."}',
      '{"stage": "points_extracted", "count": 6}',
      '{"stage": "summarizing", "message": "Creating compressed summary..."}',
      '{"stage": "complete", "compression_achieved": 0.80, "quality_score": 7.0}'
    ];

    const mockContentResponses = [
      'Three major features planned',
      'dashboard redesign',
      'mobile app improvements',
      'Action items assigned'
    ];

    it('should filter out JSON metadata from stream', async () => {
      const encoder = new TextEncoder();
      const allChunks = [...mockMetadataResponses, ...mockContentResponses];
      
      const stream = new ReadableStream({
        start(controller) {
          allChunks.forEach(chunk => {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      const mockResponse = { ok: true, body: stream } as Response;
      const result = await streamingService.processStreamResponse(mockResponse);

      // Should only contain content, not metadata
      expect(result).toBe('Three major features planneddashboard redesignmobile app improvementsAction items assigned');
      expect(result).not.toContain('analyzing');
      expect(result).not.toContain('stage');
      expect(result).not.toContain('compression_achieved');
    });

    it('should handle mixed content and metadata correctly', async () => {
      const encoder = new TextEncoder();
      const mixedChunks = [
        '{"stage": "analyzing"}',
        'Summary text here',
        '{"message": "Processing..."}',
        'more summary content',
        '{"stage": "complete"}'
      ];
      
      const stream = new ReadableStream({
        start(controller) {
          mixedChunks.forEach(chunk => {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      const mockResponse = { ok: true, body: stream } as Response;
      const result = await streamingService.processStreamResponse(mockResponse);

      expect(result).toBe('Summary text heremore summary content');
      expect(result).not.toContain('stage');
      expect(result).not.toContain('Processing');
    });

    it('should handle partial JSON correctly', async () => {
      const encoder = new TextEncoder();
      const chunks = [
        '{"stage"',
        ': "analyzing"}',
        'Real content here',
        '{"incomplete'
      ];
      
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      const mockResponse = { ok: true, body: stream } as Response;
      const result = await streamingService.processStreamResponse(mockResponse);

      expect(result).toBe('Real content here');
    });

    it('should preserve actual summary text with JSON-like content', async () => {
      const encoder = new TextEncoder();
      const chunks = [
        'The configuration uses {"setting": "value"} format',
        'JSON data structure contains key-value pairs',
        '{"stage": "metadata"}', // This should be filtered
        'but regular text mentioning stage should remain'
      ];
      
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      const mockResponse = { ok: true, body: stream } as Response;
      const result = await streamingService.processStreamResponse(mockResponse);

      expect(result).toContain('configuration uses');
      expect(result).toContain('but regular text mentioning stage should remain');
      expect(result).not.toContain('{"stage": "metadata"}');
    });
  });
}); 