import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";

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
    return this.data[type] || "";
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
  return new ClipboardEvent("paste", { clipboardData: mockClipboardData });
};

const mockApiResponse = (data: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => data,
  } as Response);

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
        .mockResolvedValueOnce(mockApiResponse({ summary: "Example summary" }));

      render(<Home />);
      await user.click(screen.getByText("Try Example"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/example");
        expect(screen.getByText("Example summary")).toBeInTheDocument();
      });
    });

    it("shows loading state", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockApiResponse({ text: "Example" })), 100)
          )
      );

      render(<Home />);
      await user.click(screen.getByText("Try Example"));
      expect(screen.getByText("Loading...")).toBeInTheDocument();
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
      mockFetch.mockResolvedValue(mockApiResponse({ summary: "Test summary" }));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test content"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Your Text")).toBeInTheDocument();
        expect(screen.getByText("Test content")).toBeInTheDocument();
        expect(screen.getByText("Test summary")).toBeInTheDocument();
      });
    });

    it("shows text stats", async () => {
      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Hello world"));
      });

      await waitFor(() => {
        expect(screen.getByText(/11 characters • 2 words/)).toBeInTheDocument();
      });
    });
  });

  describe("Summary functionality", () => {
    it("calls API correctly", async () => {
      mockFetch.mockResolvedValue(mockApiResponse({ summary: "Summary" }));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Text to summarize"));
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

    it("shows loading spinner", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(mockApiResponse({ summary: "Summary" })),
              100
            )
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
      mockFetch.mockResolvedValue(mockApiResponse(null, false, 500));

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
  });

  describe("Cache functionality", () => {
    it("uses cached results", async () => {
      mockFetch.mockResolvedValue(
        mockApiResponse({ summary: "Cached summary" })
      );

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
      mockFetch.mockResolvedValue(
        mockApiResponse({ summary: "Summary to copy" })
      );

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
      mockFetch.mockResolvedValue(mockApiResponse({ summary: "Summary" }));

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
      mockFetch.mockResolvedValue(mockApiResponse({ summary: "Summary" }));

      render(<Home />);

      await act(async () => {
        document.dispatchEvent(createPasteEvent("Test text"));
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      await waitFor(() => {
        expect(screen.getByText("Test text")).toBeInTheDocument();
        expect(screen.getByText("Summary")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clear"));

      expect(screen.queryByText("Test text")).not.toBeInTheDocument();
      expect(screen.queryByText("Summary")).not.toBeInTheDocument();
      expect(screen.getByText("How it works")).toBeInTheDocument();
    });
  });
});
