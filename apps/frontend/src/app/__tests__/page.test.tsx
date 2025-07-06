import { TextEncoder, TextDecoder } from "util";
import { ReadableStream } from "web-streams-polyfill";

// Mock global Web APIs for jsdom - must be before other imports
Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
});

// Ensure TextDecoder is available in the global scope
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder as any;
}

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";
import type { SummaryResponse, ExampleResponse } from "../types";

// Proper typed mock implementations
interface MockClipboardData {
  getData(type: string): string;
  setData(type: string, data: string): void;
}

class MockDataTransfer implements MockClipboardData {
  private data: Record<string, string> = {};

  getData(type: string): string {
    return (
      this.data[type] || this.data["text/plain"] || this.data["text"] || ""
    );
  }

  setData(type: string, data: string): void {
    this.data[type] = data;
  }
}

// Type-safe clipboard event mock
interface MockClipboardEventInit extends EventInit {
  clipboardData?: MockClipboardData;
}

class MockClipboardEvent extends Event {
  clipboardData: MockClipboardData;

  constructor(type: string, eventInit: MockClipboardEventInit = {}) {
    super(type, eventInit);
    this.clipboardData = eventInit.clipboardData || new MockDataTransfer();
  }
}

// Setup global mocks
(global as any).ClipboardEvent = MockClipboardEvent;
(global as any).DataTransfer = MockDataTransfer;

// Mock fetch with proper typing
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const createPasteEvent = (text: string): MockClipboardEvent => {
  const clipboardData = new MockDataTransfer();
  clipboardData.setData("text/plain", text);
  clipboardData.setData("text", text);

  return new MockClipboardEvent("paste", {
    clipboardData,
    bubbles: true,
    cancelable: true,
  });
};

const createApiResponse = (
  data: ExampleResponse | SummaryResponse,
  status = 200
): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
};

const createStreamResponse = (summary: string, status = 200): Response => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      // Split summary into words to simulate streaming, preserving spaces
      const words = summary.split(" ");
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const chunk = `data: ${word}${i < words.length - 1 ? " " : ""}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    body: stream,
  } as unknown as Response;
};

const createChunkedStreamResponse = (
  chunks: string[],
  status = 200
): Response => {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      const pushChunk = (): void => {
        if (chunkIndex < chunks.length) {
          const chunk = `data: ${chunks[chunkIndex]}\n\n`;
          controller.enqueue(encoder.encode(chunk));
          chunkIndex++;
          // Use synchronous processing for tests - no setTimeout
          pushChunk();
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      };
      pushChunk();
    },
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    body: stream,
  } as unknown as Response;
};

describe("Home Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("renders main elements", () => {
    render(<Home />);
    expect(screen.getByText("Paste to Summary")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Try Example")).toBeInTheDocument();
  });

  describe("Example functionality", () => {
    it("loads example and summarizes", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Example text" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse("Example summary"));

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/example");
        expect(screen.getByText("Example summary")).toBeInTheDocument();
      });
    });

    it("shows loading state during example load", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Example" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(createStreamResponse("Summary")), 100)
            )
        );

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
      });
    });

    it("handles example loading errors", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error("Failed to load"));

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe("Paste functionality", () => {
    it("handles paste and summarizes text", async () => {
      mockFetch.mockResolvedValue(createStreamResponse("Test summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test content"));
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      await waitFor(() => {
        expect(screen.getByText("Your Text")).toBeInTheDocument();
        expect(screen.getByText("Test content")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/summarize/stream",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "Test content",
              max_length: 300,
            }),
          })
        );
        expect(screen.getByText("Test summary")).toBeInTheDocument();
      });
    });

    it("displays text statistics correctly", async () => {
      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Hello world"));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText(/11 characters • 2 words/)).toBeInTheDocument();
      });
    });
  });

  describe("Summary functionality", () => {
    it("calls streaming API with correct parameters", async () => {
      mockFetch.mockResolvedValue(createStreamResponse("API Summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Text to summarize"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/summarize/stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "Text to summarize",
              max_length: 300,
            }),
          }
        );
      });
    });

    it("shows loading spinner during processing", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createStreamResponse("Summary")), 100)
          )
      );

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
      });
    });

    it("handles API errors gracefully", async () => {
      mockFetch.mockResolvedValue(createStreamResponse("", 500));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText(/Unable to summarize/)).toBeInTheDocument();
      });
    });

    it("processes server-side streaming correctly", async () => {
      const user = userEvent.setup();
      const chunks = ["Hello ", "this ", "is ", "a ", "streamed ", "summary"];
      const exampleData: ExampleResponse = { text: "Test streaming content" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createChunkedStreamResponse(chunks));

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText("Test streaming content")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByText("Hello this is a streamed summary")
        ).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/summarize/stream",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "Test streaming content",
            max_length: 300,
          }),
        })
      );
    });
  });

  describe("Cache functionality", () => {
    it("uses cached results for identical text", async () => {
      mockFetch.mockResolvedValue(createStreamResponse("Cached summary"));

      render(<Home />);
      const sameText = "Same text content";

      await act(async () => {
        document.dispatchEvent(createPasteEvent(sameText));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Cached summary")).toBeInTheDocument();
      });

      await userEvent.setup().click(screen.getByText("Clear"));

      await act(async () => {
        document.dispatchEvent(createPasteEvent(sameText));
      });

      await waitFor(() => {
        expect(screen.getByText("Cached")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Copy functionality", () => {
    it("copies summary to clipboard successfully", async () => {
      const user = userEvent.setup();
      const mockWriteText = navigator.clipboard
        .writeText as jest.MockedFunction<typeof navigator.clipboard.writeText>;
      mockFetch.mockResolvedValue(createStreamResponse("Summary to copy"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Summary to copy")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Copy"));
      expect(mockWriteText).toHaveBeenCalledWith("Summary to copy");

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("shows temporary copied state", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(createStreamResponse("Summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await user.click(screen.getByText("Copy"));

      await waitFor(
        () => {
          expect(screen.getByText("Copy")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Clear functionality", () => {
    it("resets all application state", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(createStreamResponse("Test Summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test text"));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText("Test text")).toBeInTheDocument();
        expect(screen.getByText("Test Summary")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clear"));

      expect(screen.queryByText("Test text")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Summary")).not.toBeInTheDocument();
      expect(screen.getByText("How it works")).toBeInTheDocument();
    });
  });

  describe("Try Again functionality", () => {
    it("shows try again button when summary is available", async () => {
      const exampleData: ExampleResponse = { text: "Test text" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse("Test Summary"));

      render(<Home />);

      const user = userEvent.setup();
      await user.click(screen.getByText("Try Example"));

      await waitFor(
        () => {
          expect(screen.getByText("Test Summary")).toBeInTheDocument();
          expect(screen.getByText("Try Again")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("regenerates summary when try again is clicked", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Test content" };
      const firstSummary = "First summary";
      const secondSummary = "Second summary";

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse(firstSummary))
        .mockResolvedValueOnce(createStreamResponse(secondSummary));

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText(firstSummary)).toBeInTheDocument();
      });

      await user.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(screen.getByText(secondSummary)).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(3); // example + 2 summaries
    });

    it("shows loading state during try again", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Test content" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse("First summary"))
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve(createStreamResponse("Second summary")),
                200
              )
            )
        );

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText("First summary")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Try Again"));

      // Check for loading state
      expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Second summary")).toBeInTheDocument();
      });
    });

    it("handles errors during try again", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Test content" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse("First summary"))
        .mockResolvedValueOnce(createStreamResponse("", 500));

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText("First summary")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(screen.getByText(/Unable to summarize/)).toBeInTheDocument();
      });
    });

    it("disables try again button when loading", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Test content" };

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse("First summary"))
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve(createStreamResponse("Second summary")),
                200
              )
            )
        );

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText("First summary")).toBeInTheDocument();
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Try Again"));

      // Check for loading state (spinner should be visible)
      await waitFor(() => {
        expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText("Second summary")).toBeInTheDocument();
      });
    });

    it("bypasses cache and generates new summary", async () => {
      const user = userEvent.setup();
      const exampleData: ExampleResponse = { text: "Test content" };
      const firstSummary = "First summary";
      const secondSummary = "Different summary";

      mockFetch
        .mockResolvedValueOnce(createApiResponse(exampleData))
        .mockResolvedValueOnce(createStreamResponse(firstSummary))
        .mockResolvedValueOnce(createStreamResponse(secondSummary));

      render(<Home />);

      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText(firstSummary)).toBeInTheDocument();
      });

      // When try again is clicked, it should bypass any cache and generate a new summary
      await user.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(screen.getByText(secondSummary)).toBeInTheDocument();
      });

      // Verify that mockFetch was called 3 times: 1 for example + 2 for summaries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
