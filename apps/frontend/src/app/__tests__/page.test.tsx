import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream } from "web-streams-polyfill";

// Mock global Web APIs for jsdom
Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
});

// Mock ClipboardEvent for jsdom
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ClipboardEvent = class MockClipboardEvent extends Event {
  clipboardData: DataTransfer;

  constructor(type: string, eventInit: ClipboardEventInit = {}) {
    super(type, eventInit);
    this.clipboardData = (eventInit.clipboardData ||
      new MockDataTransfer()) as DataTransfer;
  }
};

// Mock DataTransfer for jsdom
class MockDataTransfer {
  private data: { [type: string]: string } = {};

  getData(type: string): string {
    // Handle both "text" and "text/plain" for better compatibility
    return (
      this.data[type] || this.data["text/plain"] || this.data["text"] || ""
    );
  }

  setData(type: string, data: string): void {
    this.data[type] = data;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).DataTransfer = MockDataTransfer;

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const createPasteEvent = (text: string) => {
  const mockClipboardData = new DataTransfer();
  mockClipboardData.setData("text/plain", text);
  mockClipboardData.setData("text", text);

  const event = new ClipboardEvent("paste", {
    clipboardData: mockClipboardData,
    bubbles: true,
    cancelable: true,
  });

  return event;
};

const mockApiResponse = (data: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => data,
  } as Response);

const mockStreamResponse = (summary: string, ok = true, status = 200) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      // Send complete summary at once for test simplicity
      const chunk = `data: ${summary}\n\n`;
      controller.enqueue(encoder.encode(chunk));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return {
    ok,
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
      mockFetch
        .mockResolvedValueOnce(mockApiResponse({ text: "Example text" }))
        .mockResolvedValueOnce(mockStreamResponse("Example summary"));

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/example");
        expect(screen.getByText("Example summary")).toBeInTheDocument();
      });
    });

    it("shows loading state", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockApiResponse({ text: "Example" }))
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(mockStreamResponse("Summary")), 100)
            )
        );

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
      });
    });

    it("handles errors", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error("Failed"));

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe("Paste functionality", () => {
    it("handles paste and summarizes", async () => {
      mockFetch.mockResolvedValue(mockStreamResponse("Test summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test content"));
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      await waitFor(() => {
        expect(screen.getByText("Your Text")).toBeInTheDocument();
      });

      await waitFor(() => {
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
      });

      await waitFor(() => {
        expect(screen.getByText("Test summary")).toBeInTheDocument();
      });
    });

    it("shows text stats", async () => {
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
    it("calls API correctly", async () => {
      mockFetch.mockResolvedValue(mockStreamResponse("Summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Text to summarize"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Your Text")).toBeInTheDocument();
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

    it("shows loading spinner", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockStreamResponse("Summary")), 100)
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

    it("handles API errors", async () => {
      mockFetch.mockResolvedValue(mockStreamResponse("", false, 500));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Unable to summarize \(500\)/)
        ).toBeInTheDocument();
      });
    });

    it("uses server-side streaming for summarization", async () => {
      const user = userEvent.setup();
      const encoder = new TextEncoder();
      const chunks = ["Hello ", "this ", "is ", "a ", "streamed ", "summary"];
      let chunkIndex = 0;

      const streamResponse = {
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller: ReadableStreamDefaultController) {
            const pushChunk = () => {
              if (chunkIndex < chunks.length) {
                const chunk = `data: ${chunks[chunkIndex]}\n\n`;
                controller.enqueue(encoder.encode(chunk));
                chunkIndex++;
                setTimeout(pushChunk, 10);
              } else {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              }
            };
            pushChunk();
          },
        }),
      } as unknown as Response;

      mockFetch
        .mockResolvedValueOnce(
          mockApiResponse({ text: "Test streaming content" })
        )
        .mockResolvedValueOnce(streamResponse);

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
    it("uses cached results", async () => {
      mockFetch.mockResolvedValue(mockStreamResponse("Cached summary"));

      render(<Home />);
      const sameText = "Same text";

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
    it("copies summary to clipboard", async () => {
      const user = userEvent.setup();
      const mockWriteText = navigator.clipboard
        .writeText as jest.MockedFunction<typeof navigator.clipboard.writeText>;
      mockFetch.mockResolvedValue(mockStreamResponse("Summary to copy"));

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

    it("shows copy state temporarily", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(mockStreamResponse("Summary"));

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
    it("clears all state", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(mockStreamResponse("Summary"));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test text"));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText("Test text")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Summary")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clear"));

      expect(screen.queryByText("Test text")).not.toBeInTheDocument();
      expect(screen.queryByText("Summary")).not.toBeInTheDocument();
      expect(screen.getByText("How it works")).toBeInTheDocument();
    });
  });
});
