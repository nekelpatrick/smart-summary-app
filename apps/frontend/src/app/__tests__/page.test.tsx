import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../page";

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("Home Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("renders the main heading", () => {
    render(<Home />);
    expect(screen.getByText("Paste to Summary")).toBeInTheDocument();
  });

  it("renders instructions when no text is present", () => {
    render(<Home />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(
      screen.getByText("Find text you want to summarize")
    ).toBeInTheDocument();
    expect(screen.getByText("Copy it (Ctrl+C or ⌘+C)")).toBeInTheDocument();
    expect(
      screen.getByText("Paste anywhere on this page (Ctrl+V or ⌘+V)")
    ).toBeInTheDocument();
    expect(screen.getByText("Get your summary instantly!")).toBeInTheDocument();
  });

  it("renders Try Example button", () => {
    render(<Home />);
    expect(screen.getByText("Try Example")).toBeInTheDocument();
  });

  describe("Try Example functionality", () => {
    it("loads example text when Try Example is clicked", async () => {
      const user = userEvent.setup();

      // Mock the API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Example text for testing" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ summary: "Example summary" }),
        } as Response);

      render(<Home />);

      const tryExampleButton = screen.getByText("Try Example");
      await user.click(tryExampleButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/example");
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/summarize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "Example text for testing",
              max_length: 300,
            }),
          }
        );
      });
    });

    it("shows loading spinner while loading example", async () => {
      const user = userEvent.setup();

      // Mock delayed response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ text: "Example text" }),
                } as Response),
              100
            );
          })
      );

      render(<Home />);

      const tryExampleButton = screen.getByText("Try Example");
      await user.click(tryExampleButton);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("handles example loading error", async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error("Failed to load example"));

      render(<Home />);

      const tryExampleButton = screen.getByText("Try Example");
      await user.click(tryExampleButton);

      await waitFor(() => {
        expect(screen.getByText(/Example failed to load/)).toBeInTheDocument();
      });
    });
  });

  describe("Paste functionality", () => {
    it("handles paste events and shows text display", async () => {
      const mockSummarize = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Test summary" }),
      } as Response);

      render(<Home />);

      // Simulate paste event
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Pasted text content",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Your Text")).toBeInTheDocument();
        expect(screen.getByText("Pasted text content")).toBeInTheDocument();
      });
    });

    it("shows character and word count", async () => {
      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Hello world test",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/15 characters • 3 words/)).toBeInTheDocument();
      });
    });
  });

  describe("Summarization functionality", () => {
    it("calls summarize API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Generated summary" }),
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/summarize",
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

    it("displays summary when API call succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Generated summary" }),
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Generated summary")).toBeInTheDocument();
      });
    });

    it("displays error when API call fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Unable to summarize \(500\)/)
        ).toBeInTheDocument();
      });
    });

    it("shows loading spinner during summarization", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ summary: "Summary" }),
                } as Response),
              100
            );
          })
      );

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      // Should show spinner during loading
      await waitFor(() => {
        expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
      });
    });
  });

  describe("Caching functionality", () => {
    it("uses cached result for duplicate text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Cached summary" }),
      } as Response);

      render(<Home />);

      const sameText = "Same text for caching test";

      // First paste
      const pasteEvent1 = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent1, "clipboardData", {
        value: {
          getData: () => sameText,
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent1);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Cached summary")).toBeInTheDocument();
      });

      // Clear text
      const clearButton = screen.getByText("Clear");
      await userEvent.setup().click(clearButton);

      // Second paste with same text
      const pasteEvent2 = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent2, "clipboardData", {
        value: {
          getData: () => sameText,
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent2);
      });

      await waitFor(() => {
        expect(screen.getByText("Cached summary")).toBeInTheDocument();
        expect(screen.getByText("Cached")).toBeInTheDocument();
      });

      // API should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("shows cached badge for cached results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Cached summary" }),
      } as Response);

      render(<Home />);

      const text = "Text for cache badge test";

      // First request
      const pasteEvent1 = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent1, "clipboardData", {
        value: {
          getData: () => text,
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent1);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Cached summary")).toBeInTheDocument();
      });

      // Clear and paste again
      const clearButton = screen.getByText("Clear");
      await userEvent.setup().click(clearButton);

      const pasteEvent2 = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent2, "clipboardData", {
        value: {
          getData: () => text,
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent2);
      });

      await waitFor(() => {
        expect(screen.getByText("Cached")).toBeInTheDocument();
      });
    });
  });

  describe("Copy functionality", () => {
    it("copies summary to clipboard when copy button is clicked", async () => {
      const user = userEvent.setup();
      const mockWriteText = navigator.clipboard
        .writeText as jest.MockedFunction<typeof navigator.clipboard.writeText>;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Summary to copy" }),
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Summary to copy")).toBeInTheDocument();
      });

      const copyButton = screen.getByText("Copy");
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith("Summary to copy");

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("shows copied state temporarily", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Summary to copy" }),
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to summarize",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Summary to copy")).toBeInTheDocument();
      });

      const copyButton = screen.getByText("Copy");
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      // Wait for copied state to revert
      await waitFor(
        () => {
          expect(screen.getByText("Copy")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Clear functionality", () => {
    it("clears all text and state when clear button is clicked", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "Summary to clear" }),
      } as Response);

      render(<Home />);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          getData: () => "Text to clear",
        },
      });

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Text to clear")).toBeInTheDocument();
        expect(screen.getByText("Summary to clear")).toBeInTheDocument();
      });

      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      expect(screen.queryByText("Text to clear")).not.toBeInTheDocument();
      expect(screen.queryByText("Summary to clear")).not.toBeInTheDocument();
      expect(screen.getByText("How it works")).toBeInTheDocument();
    });
  });
});
