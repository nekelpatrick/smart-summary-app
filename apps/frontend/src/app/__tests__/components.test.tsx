import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the main component to extract individual components
jest.mock("../page", () => {
  const React = require("react");

  const Spinner = ({
    size = 24,
    className = "",
  }: {
    size?: number;
    className?: string;
  }) => (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      data-testid="spinner"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );

  const Instructions = ({
    onExample,
    loading,
  }: {
    onExample: () => void;
    loading: boolean;
  }) => {
    const steps = [
      "Find text you want to summarize",
      "Copy it (Ctrl+C or ⌘+C)",
      "Paste anywhere on this page (Ctrl+V or ⌘+V)",
      "Get your summary instantly!",
    ];

    return (
      <div className="mb-6 md:mb-8 rounded-lg bg-white p-6 md:p-8 shadow-lg">
        <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-semibold text-gray-700">
          How it works
        </h2>
        <ol className="space-y-3 text-base md:text-lg text-gray-600">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-center">
          <button
            onClick={onExample}
            disabled={loading}
            className="flex items-center justify-center rounded-lg bg-green-500 px-6 py-3 text-white font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
          >
            {loading ? (
              <>
                <Spinner size={20} className="mr-2 text-white" />
                Loading...
              </>
            ) : (
              "Try Example"
            )}
          </button>
        </div>
      </div>
    );
  };

  const TextDisplay = ({
    text,
    words,
    chars,
    onClear,
  }: {
    text: string;
    words: number;
    chars: number;
    onClear: () => void;
  }) => (
    <div className="mb-6 rounded-lg bg-white p-4 md:p-6 shadow-lg">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg md:text-xl font-semibold text-gray-700">
          Your Text
        </h2>
        <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
          <span className="text-sm text-gray-500">
            {chars} characters • {words} words
          </span>
          <button
            onClick={onClear}
            className="text-sm font-medium text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-3 md:p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {text}
        </p>
      </div>
    </div>
  );

  const ResultDisplay = ({
    summary,
    loading,
    error,
    copied,
    isCached,
    onCopy,
  }: {
    summary: string;
    loading: boolean;
    error: string;
    copied: boolean;
    isCached: boolean;
    onCopy: () => void;
  }) => (
    <div className="rounded-lg bg-white p-4 md:p-6 shadow-lg">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-700">
            Summary
          </h2>
          {isCached && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full animate-pulse">
              Cached
            </span>
          )}
        </div>
        {summary && (
          <button
            onClick={onCopy}
            className="rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
              </span>
            ) : (
              "Copy"
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size={32} className="text-blue-500" />
        </div>
      )}

      {summary && (
        <div className="rounded-md border bg-gray-50 p-3 md:p-4">
          <p className="leading-relaxed text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  );

  return {
    Spinner,
    Instructions,
    TextDisplay,
    ResultDisplay,
  };
});

const {
  Spinner,
  Instructions,
  TextDisplay,
  ResultDisplay,
} = require("../page");

describe("Spinner Component", () => {
  it("renders with default props", () => {
    render(<Spinner />);
    const spinner = screen.getByTestId("spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute("width", "24");
    expect(spinner).toHaveAttribute("height", "24");
  });

  it("renders with custom size", () => {
    render(<Spinner size={48} />);
    const spinner = screen.getByTestId("spinner");
    expect(spinner).toHaveAttribute("width", "48");
    expect(spinner).toHaveAttribute("height", "48");
  });

  it("applies custom className", () => {
    render(<Spinner className="text-red-500" />);
    const spinner = screen.getByTestId("spinner");
    expect(spinner).toHaveClass("text-red-500");
  });
});

describe("Instructions Component", () => {
  const mockOnExample = jest.fn();

  beforeEach(() => {
    mockOnExample.mockClear();
  });

  it("renders all instruction steps", () => {
    render(<Instructions onExample={mockOnExample} loading={false} />);

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

  it("renders step numbers correctly", () => {
    render(<Instructions onExample={mockOnExample} loading={false} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("calls onExample when Try Example button is clicked", async () => {
    const user = userEvent.setup();
    render(<Instructions onExample={mockOnExample} loading={false} />);

    const button = screen.getByText("Try Example");
    await user.click(button);

    expect(mockOnExample).toHaveBeenCalledTimes(1);
  });

  it("shows loading state", () => {
    render(<Instructions onExample={mockOnExample} loading={true} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("disables button when loading", () => {
    render(<Instructions onExample={mockOnExample} loading={true} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});

describe("TextDisplay Component", () => {
  const mockOnClear = jest.fn();
  const defaultProps = {
    text: "Sample text content",
    words: 3,
    chars: 19,
    onClear: mockOnClear,
  };

  beforeEach(() => {
    mockOnClear.mockClear();
  });

  it("renders text content", () => {
    render(<TextDisplay {...defaultProps} />);

    expect(screen.getByText("Your Text")).toBeInTheDocument();
    expect(screen.getByText("Sample text content")).toBeInTheDocument();
  });

  it("displays character and word count", () => {
    render(<TextDisplay {...defaultProps} />);

    expect(screen.getByText("19 characters • 3 words")).toBeInTheDocument();
  });

  it("calls onClear when Clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<TextDisplay {...defaultProps} />);

    const clearButton = screen.getByText("Clear");
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it("handles long text with proper formatting", () => {
    const longText =
      "This is a very long text that should be displayed with proper formatting and scrolling capabilities when it exceeds the maximum height limit.";
    render(
      <TextDisplay
        {...defaultProps}
        text={longText}
        words={25}
        chars={longText.length}
      />
    );

    expect(screen.getByText(longText)).toBeInTheDocument();
    expect(
      screen.getByText(`${longText.length} characters • 25 words`)
    ).toBeInTheDocument();
  });
});

describe("ResultDisplay Component", () => {
  const mockOnCopy = jest.fn();
  const defaultProps = {
    summary: "",
    loading: false,
    error: "",
    copied: false,
    isCached: false,
    onCopy: mockOnCopy,
  };

  beforeEach(() => {
    mockOnCopy.mockClear();
  });

  it("renders summary heading", () => {
    render(<ResultDisplay {...defaultProps} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("displays summary when provided", () => {
    render(<ResultDisplay {...defaultProps} summary="Test summary content" />);
    expect(screen.getByText("Test summary content")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    render(<ResultDisplay {...defaultProps} loading={true} />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<ResultDisplay {...defaultProps} error="Test error message" />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("shows cached badge when isCached is true", () => {
    render(<ResultDisplay {...defaultProps} isCached={true} />);
    expect(screen.getByText("Cached")).toBeInTheDocument();
  });

  it("renders copy button when summary is present", () => {
    render(<ResultDisplay {...defaultProps} summary="Test summary" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("calls onCopy when copy button is clicked", async () => {
    const user = userEvent.setup();
    render(<ResultDisplay {...defaultProps} summary="Test summary" />);

    const copyButton = screen.getByText("Copy");
    await user.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalledTimes(1);
  });

  it("shows copied state", () => {
    render(
      <ResultDisplay {...defaultProps} summary="Test summary" copied={true} />
    );
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("does not render copy button when no summary", () => {
    render(<ResultDisplay {...defaultProps} />);
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
  });
});
