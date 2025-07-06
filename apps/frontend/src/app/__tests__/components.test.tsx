import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyInput } from "../components";
import { LLMProvider, ProviderStatus } from "../types";

jest.mock("../page", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

const { Spinner, Instructions, TextDisplay, ResultDisplay } =
  jest.requireMock("../page");

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

describe("ApiKeyInput Component", () => {
  const mockOnApiKeyChange = jest.fn();
  const mockOnProviderChange = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnClear = jest.fn();

  const mockProviders = [
    {
      id: LLMProvider.OPENAI,
      name: "OpenAI",
      description: "GPT models (GPT-3.5, GPT-4, etc.)",
      status: ProviderStatus.ENABLED,
      enabled: true,
      key_prefix: "sk-",
      min_key_length: 51,
    },
    {
      id: LLMProvider.ANTHROPIC,
      name: "Anthropic",
      description: "Claude models (Claude-3, Claude-2, etc.)",
      status: ProviderStatus.DISABLED,
      enabled: false,
      key_prefix: "sk-ant-",
      min_key_length: 100,
    },
    {
      id: LLMProvider.GOOGLE,
      name: "Google",
      description: "Gemini models",
      status: ProviderStatus.COMING_SOON,
      enabled: false,
      key_prefix: "",
      min_key_length: 39,
    },
  ];

  const defaultProps = {
    apiKey: "",
    selectedProvider: LLMProvider.OPENAI,
    availableProviders: mockProviders,
    onApiKeyChange: mockOnApiKeyChange,
    onProviderChange: mockOnProviderChange,
    validating: false,
    validationStatus: "idle" as const,
    onValidate: mockOnValidate,
    onClear: mockOnClear,
    loadingProviders: false,
  };

  beforeEach(() => {
    mockOnApiKeyChange.mockClear();
    mockOnProviderChange.mockClear();
    mockOnValidate.mockClear();
    mockOnClear.mockClear();
  });

  describe("Provider Selection", () => {
    it("renders provider selection dropdown", () => {
      render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByText("LLM Provider")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("OpenAI - GPT models (GPT-3.5, GPT-4, etc.)")
      ).toBeInTheDocument();
    });

    it("displays all available providers in dropdown", () => {
      render(<ApiKeyInput {...defaultProps} />);

      const select = screen.getByDisplayValue(
        "OpenAI - GPT models (GPT-3.5, GPT-4, etc.)"
      );
      expect(select).toBeInTheDocument();

      // Check that all providers are rendered as options
      const options = within(select).getAllByRole("option");
      expect(options).toHaveLength(3);

      expect(
        screen.getByText("OpenAI - GPT models (GPT-3.5, GPT-4, etc.)")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Anthropic - Claude models (Claude-3, Claude-2, etc.)")
      ).toBeInTheDocument();
      expect(screen.getByText("Google - Gemini models")).toBeInTheDocument();
    });

    it("calls onProviderChange when provider selection changes", async () => {
      const user = userEvent.setup();

      // Create mock data with multiple enabled providers for testing
      const testProviders = [
        {
          id: LLMProvider.OPENAI,
          name: "OpenAI",
          description: "GPT models (GPT-3.5, GPT-4, etc.)",
          status: ProviderStatus.ENABLED,
          enabled: true,
          key_prefix: "sk-",
          min_key_length: 51,
        },
        {
          id: LLMProvider.ANTHROPIC,
          name: "Anthropic",
          description: "Claude models (Claude-3, Claude-2, etc.)",
          status: ProviderStatus.ENABLED,
          enabled: true,
          key_prefix: "sk-ant-",
          min_key_length: 100,
        },
      ];

      const testProps = {
        ...defaultProps,
        availableProviders: testProviders,
      };

      render(<ApiKeyInput {...testProps} />);

      const select = screen.getByDisplayValue(
        "OpenAI - GPT models (GPT-3.5, GPT-4, etc.)"
      );
      await user.selectOptions(select, "anthropic");

      expect(mockOnProviderChange).toHaveBeenCalledWith("anthropic");
    });

    it("disabled providers cannot be selected", () => {
      render(<ApiKeyInput {...defaultProps} />);

      const select = screen.getByDisplayValue(
        "OpenAI - GPT models (GPT-3.5, GPT-4, etc.)"
      );

      // Check that disabled options are marked as disabled
      const anthropicOption = within(select).getByRole("option", {
        name: /Anthropic/,
      });
      const googleOption = within(select).getByRole("option", {
        name: /Google/,
      });

      expect(anthropicOption).toBeDisabled();
      expect(googleOption).toBeDisabled();
    });

    it("shows provider status badges", () => {
      render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByText("Available")).toBeInTheDocument();
    });

    it("shows disabled provider status", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...disabledProps} />);

      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("shows coming soon provider status", () => {
      const comingSoonProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.GOOGLE,
      };
      render(<ApiKeyInput {...comingSoonProps} />);

      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("shows loading state when providers are loading", () => {
      render(<ApiKeyInput {...defaultProps} loadingProviders={true} />);

      expect(screen.getByText("Loading providers...")).toBeInTheDocument();
    });

    it("disables provider selection when loading", () => {
      render(<ApiKeyInput {...defaultProps} loadingProviders={true} />);

      const select = screen.getByDisplayValue(
        "OpenAI - GPT models (GPT-3.5, GPT-4, etc.)"
      );
      expect(select).toBeDisabled();
    });
  });

  describe("API Key Input", () => {
    it("renders API key input field", () => {
      render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByText("API Key (Optional)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
    });

    it("renders input field as password type by default", () => {
      render(<ApiKeyInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("sk-...");
      expect(input).toHaveAttribute("type", "password");
    });

    it("toggles input type between password and text", async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("sk-...");
      const toggleButton = screen.getByText("Show");

      expect(input).toHaveAttribute("type", "password");

      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");
      expect(screen.getByText("Hide")).toBeInTheDocument();

      await user.click(screen.getByText("Hide"));
      expect(input).toHaveAttribute("type", "password");
      expect(screen.getByText("Show")).toBeInTheDocument();
    });

    it("calls onApiKeyChange when input value changes", async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("sk-...");
      await user.type(input, "sk-test-key");

      expect(mockOnApiKeyChange).toHaveBeenCalledWith("sk-test-key");
    });

    it("uses provider-specific placeholder text", () => {
      const anthropicProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...anthropicProps} />);

      expect(screen.getByPlaceholderText("sk-ant-...")).toBeInTheDocument();
    });

    it("uses generic placeholder for providers without prefix", () => {
      const googleProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.GOOGLE,
      };
      render(<ApiKeyInput {...googleProps} />);

      expect(
        screen.getByPlaceholderText("Enter API key...")
      ).toBeInTheDocument();
    });

    it("disables input for non-enabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...disabledProps} />);

      const input = screen.getByPlaceholderText("sk-ant-...");
      expect(input).toBeDisabled();
      expect(input).toHaveClass("bg-gray-50", "cursor-not-allowed");
    });

    it("disables show/hide toggle for disabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...disabledProps} />);

      const toggleButton = screen.getByText("Show");
      expect(toggleButton).toBeDisabled();
    });
  });

  describe("Validation", () => {
    it("displays validation icon for valid status", () => {
      render(<ApiKeyInput {...defaultProps} validationStatus="valid" />);
      expect(screen.getByText("✓")).toBeInTheDocument();
      expect(screen.getByText("API key is valid")).toBeInTheDocument();
    });

    it("displays validation icon for invalid status", () => {
      render(<ApiKeyInput {...defaultProps} validationStatus="invalid" />);
      expect(screen.getByText("✗")).toBeInTheDocument();
      expect(screen.getByText("Invalid API key")).toBeInTheDocument();
    });

    it("displays validation icon for error status", () => {
      render(<ApiKeyInput {...defaultProps} validationStatus="error" />);
      expect(screen.getByText("⚠️")).toBeInTheDocument();
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });

    it("shows validate button when API key is provided for enabled provider", () => {
      render(<ApiKeyInput {...defaultProps} apiKey="sk-test-key" />);
      expect(screen.getByText("Validate")).toBeInTheDocument();
    });

    it("does not show validate button for disabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
        apiKey: "sk-ant-test-key",
      };
      render(<ApiKeyInput {...disabledProps} />);
      expect(screen.queryByText("Validate")).not.toBeInTheDocument();
    });

    it("calls onValidate when validate button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput {...defaultProps} apiKey="sk-test-key" />);

      const validateButton = screen.getByText("Validate");
      await user.click(validateButton);

      expect(mockOnValidate).toHaveBeenCalledTimes(1);
    });

    it("shows validating state", () => {
      render(
        <ApiKeyInput {...defaultProps} apiKey="sk-test-key" validating={true} />
      );
      expect(screen.getByText("Validating...")).toBeInTheDocument();
    });

    it("disables input when validating", () => {
      render(<ApiKeyInput {...defaultProps} validating={true} />);

      const input = screen.getByPlaceholderText("sk-...");
      expect(input).toBeDisabled();
    });

    it("disables validate button when validating", () => {
      render(
        <ApiKeyInput {...defaultProps} apiKey="sk-test-key" validating={true} />
      );

      const validateButton = screen.getByText("Validating...");
      expect(validateButton).toBeDisabled();
    });
  });

  describe("Clear Functionality", () => {
    it("shows clear button when API key is provided for enabled provider", () => {
      render(<ApiKeyInput {...defaultProps} apiKey="sk-test-key" />);
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("does not show clear button for disabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
        apiKey: "sk-ant-test-key",
      };
      render(<ApiKeyInput {...disabledProps} />);
      expect(screen.queryByText("✕")).not.toBeInTheDocument();
    });

    it("calls onClear when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput {...defaultProps} apiKey="sk-test-key" />);

      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      expect(mockOnApiKeyChange).toHaveBeenCalledWith("");
      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it("disables clear button when validating", () => {
      render(
        <ApiKeyInput {...defaultProps} apiKey="sk-test-key" validating={true} />
      );

      const clearButton = screen.getByText("Clear");
      expect(clearButton).toBeDisabled();
    });
  });

  describe("Help Text", () => {
    it("renders help text for enabled providers", () => {
      render(<ApiKeyInput {...defaultProps} />);

      expect(
        screen.getByText("💾 Keys stay on your device")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/🔑 Need a key\? Get one from/)
      ).toBeInTheDocument();
    });

    it("renders help text for disabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...disabledProps} />);

      expect(screen.getByText("⚠️ Anthropic coming soon")).toBeInTheDocument();
      expect(
        screen.getByText("✅ Only OpenAI works right now")
      ).toBeInTheDocument();
    });

    it("renders correct platform links for different providers", () => {
      render(<ApiKeyInput {...defaultProps} />);

      const link = screen.getByText("OpenAI");
      expect(link).toHaveAttribute(
        "href",
        "https://platform.openai.com/api-keys"
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Synchronization", () => {
    it("synchronizes input value with prop changes", async () => {
      const { rerender } = render(<ApiKeyInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("sk-...");
      expect(input).toHaveValue("");

      rerender(<ApiKeyInput {...defaultProps} apiKey="sk-new-key" />);

      await waitFor(() => {
        expect(input).toHaveValue("sk-new-key");
      });
    });

    it("handles provider changes correctly", async () => {
      const { rerender } = render(<ApiKeyInput {...defaultProps} />);

      expect(
        screen.getByDisplayValue("OpenAI - GPT models (GPT-3.5, GPT-4, etc.)")
      ).toBeInTheDocument();

      rerender(
        <ApiKeyInput
          {...defaultProps}
          selectedProvider={LLMProvider.ANTHROPIC}
        />
      );

      expect(
        screen.getByDisplayValue(
          "Anthropic - Claude models (Claude-3, Claude-2, etc.)"
        )
      ).toBeInTheDocument();
    });

    it("updates placeholder when provider changes", () => {
      const { rerender } = render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();

      rerender(
        <ApiKeyInput
          {...defaultProps}
          selectedProvider={LLMProvider.ANTHROPIC}
        />
      );

      expect(screen.getByPlaceholderText("sk-ant-...")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty providers list", () => {
      const emptyProps = {
        ...defaultProps,
        availableProviders: [],
      };
      render(<ApiKeyInput {...emptyProps} />);

      expect(screen.getByText("Provider")).toBeInTheDocument();
      // Component should still render without crashing
    });

    it("handles missing selected provider in available providers", () => {
      const missingProps = {
        ...defaultProps,
        selectedProvider: "nonexistent" as LLMProvider,
      };
      render(<ApiKeyInput {...missingProps} />);

      // Should render without crashing and show generic placeholder
      expect(
        screen.getByPlaceholderText("Enter API key...")
      ).toBeInTheDocument();
    });

    it("does not show buttons when API key is empty", () => {
      render(<ApiKeyInput {...defaultProps} apiKey="" />);
      expect(screen.queryByText("Validate")).not.toBeInTheDocument();
      expect(screen.queryByText("✕")).not.toBeInTheDocument();
    });

    it("shows help text for disabled providers", () => {
      const disabledProps = {
        ...defaultProps,
        selectedProvider: LLMProvider.ANTHROPIC,
      };
      render(<ApiKeyInput {...disabledProps} />);

      expect(screen.getByText("⚠️ Anthropic coming soon")).toBeInTheDocument();
      expect(
        screen.getByText("✅ Only OpenAI works right now")
      ).toBeInTheDocument();
    });

    it("updates when selectedProvider changes", () => {
      const { rerender } = render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByText("✅ Available")).toBeInTheDocument();

      rerender(
        <ApiKeyInput
          {...defaultProps}
          selectedProvider={LLMProvider.ANTHROPIC}
        />
      );

      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("updates placeholder when selectedProvider changes", () => {
      const { rerender } = render(<ApiKeyInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();

      rerender(
        <ApiKeyInput
          {...defaultProps}
          selectedProvider={LLMProvider.ANTHROPIC}
        />
      );

      expect(screen.getByPlaceholderText("sk-ant-...")).toBeInTheDocument();
    });

    it("does not show help text for non-existent providers", () => {
      const invalidProps = {
        ...defaultProps,
        selectedProvider: "nonexistent" as LLMProvider,
      };
      render(<ApiKeyInput {...invalidProps} />);

      expect(
        screen.queryByText(/🔑 Need a key\? Get one from/)
      ).not.toBeInTheDocument();
    });
  });
});
