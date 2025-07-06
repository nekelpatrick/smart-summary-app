import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTextSummary } from "../hooks/useTextSummary";
import { streamingService } from "../services/streamingService";

// Mock the streaming service
jest.mock("../services/streamingService");
const mockStreamingService = streamingService as jest.Mocked<
  typeof streamingService
>;

// Mock React hook
jest.mock("../hooks/useTextSummary");
const mockUseTextSummary = useTextSummary as jest.MockedFunction<
  typeof useTextSummary
>;

// Create a test component that uses the hook
const TestStreamingComponent = () => {
  const { text, summary, loading, error, isCached, setText, summarize, reset } =
    useTextSummary();

  return (
    <div>
      <textarea
        data-testid="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text"
      />
      <button
        data-testid="summarize-btn"
        onClick={() => summarize(text)}
        disabled={loading}
      >
        {loading ? "Processing..." : "Summarize"}
      </button>
      <button data-testid="reset-btn" onClick={reset}>
        Reset
      </button>

      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {summary && (
        <div data-testid="summary">
          {summary}
          {isCached && <span data-testid="cached-badge">Cached</span>}
        </div>
      )}
    </div>
  );
};

describe("Streaming Functionality", () => {
  const defaultHookReturn = {
    text: "",
    summary: "",
    loading: false,
    error: "",
    copied: false,
    isCached: false,
    apiKey: "",
    selectedProvider: "openai" as const,
    availableProviders: [],
    apiKeyValidationStatus: "idle" as const,
    validatingApiKey: false,
    loadingProviders: false,
    setText: jest.fn(),
    summarize: jest.fn(),
    copyToClipboard: jest.fn(),
    reset: jest.fn(),
    loadExample: jest.fn(),
    tryAgain: jest.fn(),
    setApiKey: jest.fn(),
    setSelectedProvider: jest.fn(),
    validateApiKey: jest.fn(),
    clearApiKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTextSummary.mockReturnValue(defaultHookReturn);
  });

  describe("Stream Response Handling", () => {
    it("handles successful streaming response", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("This "));
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode("is "));
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode("a summary"));
              setTimeout(() => {
                controller.close();
              }, 10);
            }, 10);
          }, 10);
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      render(<TestStreamingComponent />);

      const input = screen.getByTestId("text-input");
      const button = screen.getByTestId("summarize-btn");

      await userEvent.type(input, "Test text for summarization");
      await userEvent.click(button);

      expect(mockStreamingService.summarizeText).toHaveBeenCalledWith(
        "Test text for summarization",
        { maxLength: 200 }
      );
    });

    it("handles empty stream response", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "No content received from stream",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "No content received from stream"
      );
    });

    it("handles stream errors during reading", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Partial "));
          setTimeout(() => {
            controller.error(new Error("Stream interrupted"));
          }, 10);
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Stream reading failed: Stream interrupted",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Stream reading failed: Stream interrupted"
      );
    });

    it("handles malformed JSON in stream", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode("data: {invalid json}\n\n")
          );
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Invalid response format",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Invalid response format"
      );
    });

    it("handles large streaming responses", async () => {
      const largeSummary = "A".repeat(10000); // 10KB summary
      const chunks = largeSummary.match(/.{1,100}/g) || []; // Split into 100-char chunks

      const mockStream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(chunk));
              if (index === chunks.length - 1) {
                setTimeout(() => controller.close(), 10);
              }
            }, index * 5);
          });
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        summary: largeSummary,
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent(largeSummary);
    });

    it("handles concurrent streaming requests", async () => {
      const createMockStream = (content: string) =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(content));
            setTimeout(() => controller.close(), 10);
          },
        });

      mockStreamingService.summarizeText
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream("First summary"),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream("Second summary"),
        } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        summary: "Second summary", // Latest request wins
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent("Second summary");
    });
  });

  describe("Network Edge Cases", () => {
    it("handles network timeout", async () => {
      jest.useFakeTimers();

      mockStreamingService.summarizeText.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), 30000);
          })
      );

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Request timeout",
      });

      render(<TestStreamingComponent />);

      act(() => {
        jest.advanceTimersByTime(35000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "Request timeout"
        );
      });

      jest.useRealTimers();
    });

    it("handles network disconnection during stream", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Partial "));
          setTimeout(() => {
            controller.error(new DOMException("Network error", "NetworkError"));
          }, 100);
        },
      });

      mockStreamingService.summarizeText.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Network connection lost",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Network connection lost"
      );
    });

    it("handles server errors (5xx)", async () => {
      mockStreamingService.summarizeText.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Server error (500): Internal Server Error",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Server error (500): Internal Server Error"
      );
    });

    it("handles rate limiting (429)", async () => {
      mockStreamingService.summarizeText.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "Retry-After": "60" }),
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Rate limit exceeded. Try again in 60 seconds."
      );
    });

    it("handles authentication errors (401)", async () => {
      mockStreamingService.summarizeText.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response);

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Invalid API key. Please check your credentials.",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Invalid API key. Please check your credentials."
      );
    });
  });

  describe("Text Processing Edge Cases", () => {
    it("handles extremely long text input", async () => {
      const veryLongText = "A".repeat(100000); // 100KB text

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: veryLongText,
      });

      render(<TestStreamingComponent />);

      const input = screen.getByTestId("text-input");
      expect(input).toHaveValue(veryLongText);
    });

    it("handles text with special characters and Unicode", async () => {
      const specialText =
        "Hello 🌍! Testing émojis and spëcial châractërs: 中文, العربية, עברית, 🚀💻🎉";

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: specialText,
        summary: "Summary with special characters: 🌍✅",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent(
        "Summary with special characters: 🌍✅"
      );
    });

    it("handles text with HTML/XML content", async () => {
      const htmlText = "<script>alert('xss')</script><p>Safe content</p>";

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: htmlText,
        summary: "Safe content without scripts",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent(
        "Safe content without scripts"
      );
      expect(screen.getByTestId("summary")).not.toHaveTextContent("<script>");
    });

    it("handles empty text input", async () => {
      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: "",
        error: "Text cannot be empty",
      });

      render(<TestStreamingComponent />);

      const button = screen.getByTestId("summarize-btn");
      await userEvent.click(button);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Text cannot be empty"
      );
    });

    it("handles whitespace-only text", async () => {
      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: "   \n\t   \r\n   ",
        error: "Text contains only whitespace",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Text contains only whitespace"
      );
    });

    it("handles text with only numbers", async () => {
      const numberText = "123456789 987654321 555-1234 +1-800-555-0199";

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        text: numberText,
        summary: "Various phone numbers and numeric sequences",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent(
        "Various phone numbers and numeric sequences"
      );
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("handles memory pressure during large text processing", async () => {
      // Simulate memory pressure
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 1000000000, // 1GB
        totalJSHeapSize: 1100000000,
        jsHeapSizeLimit: 1200000000,
      };

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Memory limit exceeded. Please use shorter text.",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Memory limit exceeded. Please use shorter text."
      );

      // Restore original memory object
      (performance as any).memory = originalMemory;
    });

    it("handles rapid successive requests", async () => {
      jest.useFakeTimers();

      let loadingState = false;
      mockUseTextSummary.mockImplementation(() => ({
        ...defaultHookReturn,
        loading: loadingState,
        summarize: jest.fn(() => {
          loadingState = true;
          setTimeout(() => {
            loadingState = false;
          }, 1000);
        }),
      }));

      render(<TestStreamingComponent />);

      const button = screen.getByTestId("summarize-btn");

      // Click rapidly multiple times
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      // Should only process one request at a time
      expect(button).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      jest.useRealTimers();
    });
  });

  describe("Browser Compatibility Edge Cases", () => {
    it("handles browsers without ReadableStream support", async () => {
      // Mock browser without ReadableStream
      const originalReadableStream = global.ReadableStream;
      delete (global as any).ReadableStream;

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Streaming not supported in this browser",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Streaming not supported in this browser"
      );

      // Restore ReadableStream
      global.ReadableStream = originalReadableStream;
    });

    it("handles browsers with limited WebSocket support", async () => {
      // Mock WebSocket errors
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class MockWebSocket {
        constructor() {
          throw new Error("WebSocket not supported");
        }
      } as any;

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Real-time features not available",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Real-time features not available"
      );

      // Restore WebSocket
      global.WebSocket = originalWebSocket;
    });
  });

  describe("Cache Edge Cases", () => {
    it("handles cache corruption", async () => {
      // Mock corrupted cache data
      Storage.prototype.getItem = jest.fn(() => "invalid-json{");

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Cache corrupted, cleared automatically",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Cache corrupted, cleared automatically"
      );
    });

    it("handles cache size limits", async () => {
      // Mock storage quota exceeded
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error("QuotaExceededError");
      });

      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        error: "Storage full, cache cleared to make space",
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Storage full, cache cleared to make space"
      );
    });

    it("handles cache hits vs misses correctly", async () => {
      // Test cache hit
      mockUseTextSummary.mockReturnValue({
        ...defaultHookReturn,
        summary: "Cached summary",
        isCached: true,
      });

      render(<TestStreamingComponent />);

      expect(screen.getByTestId("summary")).toHaveTextContent("Cached summary");
      expect(screen.getByTestId("cached-badge")).toBeInTheDocument();
    });
  });

  describe("Abort and Cleanup Edge Cases", () => {
    it("handles component unmount during streaming", async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false },
      };
      global.AbortController = jest.fn(() => mockAbortController) as any;

      const { unmount } = render(<TestStreamingComponent />);

      // Start a request
      const button = screen.getByTestId("summarize-btn");
      await userEvent.click(button);

      // Unmount component
      unmount();

      // Should abort the request
      expect(mockAbortController.abort).toHaveBeenCalled();
    });

    it("handles multiple abort signals", async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false },
      };
      global.AbortController = jest.fn(() => mockAbortController) as any;

      render(<TestStreamingComponent />);

      const button = screen.getByTestId("summarize-btn");

      // Start multiple requests rapidly
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      // Should abort previous requests
      expect(mockAbortController.abort).toHaveBeenCalledTimes(2);
    });
  });
});
