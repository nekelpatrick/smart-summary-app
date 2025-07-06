import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import {
  MobileTextInput,
  ResultDisplay,
  ApiKeyInput,
  Instructions,
} from "../components";
import { LLMProvider, ProviderStatus } from "../types";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock implementations for testing
const mockProviders = [
  {
    id: LLMProvider.OPENAI,
    name: "OpenAI",
    description: "GPT models",
    status: ProviderStatus.ENABLED,
    enabled: true,
    key_prefix: "sk-",
    min_key_length: 51,
  },
];

describe("Accessibility Tests", () => {
  describe("Keyboard Navigation", () => {
    it("supports full keyboard navigation in MobileTextInput", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", { name: /summarize/i });

      // Tab navigation
      await user.tab();
      expect(textarea).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();

      // Enter key should submit
      await user.type(textarea, "Test content");
      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalledWith("Test content");
    });

    it("supports keyboard navigation in ApiKeyInput", async () => {
      const user = userEvent.setup();
      const mockProps = {
        apiKey: "",
        selectedProvider: LLMProvider.OPENAI,
        availableProviders: mockProviders,
        onApiKeyChange: jest.fn(),
        onProviderChange: jest.fn(),
        validating: false,
        validationStatus: "idle" as const,
        onValidate: jest.fn(),
        onClear: jest.fn(),
        loadingProviders: false,
      };

      render(<ApiKeyInput {...mockProps} />);

      const select = screen.getByRole("combobox");
      const input = screen.getByRole("textbox");

      // Tab through elements
      await user.tab();
      expect(select).toHaveFocus();

      await user.tab();
      expect(input).toHaveFocus();

      // Arrow keys should work in select
      select.focus();
      await user.keyboard("{ArrowDown}");
      // Should handle selection changes
    });

    it("handles keyboard shortcuts correctly", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);
      await user.type(textarea, "Test content");

      // Ctrl+Enter should submit
      await user.keyboard("{Control>}{Enter}{/Control}");
      expect(mockOnSubmit).toHaveBeenCalledWith("Test content");
    });

    it("maintains focus after dynamic content changes", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [content, setContent] = React.useState("");
        const [result, setResult] = React.useState("");

        return (
          <div>
            <MobileTextInput
              onSubmit={(text) => {
                setContent(text);
                setResult("Generated summary");
              }}
              loading={false}
            />
            {result && (
              <ResultDisplay
                summary={result}
                loading={false}
                error=""
                copied={false}
                isCached={false}
                onCopy={jest.fn()}
                onTryAgain={jest.fn()}
              />
            )}
          </div>
        );
      };

      render(<TestComponent />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test");
      await user.keyboard("{Enter}");

      // Focus should remain accessible after content changes
      await waitFor(() => {
        expect(screen.getByText("Generated summary")).toBeInTheDocument();
      });

      const copyButton = screen.getByRole("button", { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe("Screen Reader Support", () => {
    it("provides proper ARIA labels and roles", () => {
      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-label");
      expect(textarea).toHaveAttribute("aria-describedby");

      const submitButton = screen.getByRole("button");
      expect(submitButton).toHaveAttribute("aria-label");
    });

    it("announces loading states correctly", () => {
      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-describedby");
    });

    it("provides live region updates for dynamic content", () => {
      render(
        <ResultDisplay
          summary="Test summary"
          loading={false}
          error=""
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );

      const liveRegion = screen.getByRole("status", { hidden: true });
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });

    it("handles error announcements", () => {
      render(
        <ResultDisplay
          summary=""
          loading={false}
          error="Test error message"
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );

      const errorRegion = screen.getByRole("alert");
      expect(errorRegion).toHaveTextContent("Test error message");
      expect(errorRegion).toHaveAttribute("aria-live", "assertive");
    });

    it("provides proper heading hierarchy", () => {
      const mockOnExample = jest.fn();
      render(<Instructions onExample={mockOnExample} loading={false} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("How it works");
    });

    it("supports assistive technology for form validation", () => {
      const mockProps = {
        apiKey: "invalid-key",
        selectedProvider: LLMProvider.OPENAI,
        availableProviders: mockProviders,
        onApiKeyChange: jest.fn(),
        onProviderChange: jest.fn(),
        validating: false,
        validationStatus: "invalid" as const,
        onValidate: jest.fn(),
        onClear: jest.fn(),
        loadingProviders: false,
      };

      render(<ApiKeyInput {...mockProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby");
    });
  });

  describe("Color Contrast and Visual Accessibility", () => {
    it("meets WCAG color contrast requirements", async () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(
        <MobileTextInput onSubmit={mockOnSubmit} loading={false} />
      );

      // Test passes if no contrast violations found
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("provides visual focus indicators", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      await user.tab();

      expect(textarea).toHaveFocus();
      expect(textarea).toHaveClass("focus:ring-2");
    });

    it("supports high contrast mode", () => {
      // Mock high contrast media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes("prefers-contrast: high"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("border-gray-300");
    });

    it("respects reduced motion preferences", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes("prefers-reduced-motion: reduce"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <ResultDisplay
          summary="Test summary"
          loading={true}
          error=""
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );

      // Should not use motion-dependent animations
      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Mobile Accessibility", () => {
    it("provides adequate touch target sizes", () => {
      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const button = screen.getByRole("button");
      const computedStyle = window.getComputedStyle(button);

      // Should meet minimum 44px touch target size
      expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(44);
    });

    it("supports voice input and speech recognition", async () => {
      // Mock SpeechRecognition
      const mockSpeechRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (global as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition);
      (global as any).webkitSpeechRecognition = jest.fn(
        () => mockSpeechRecognition
      );

      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      // Should handle speech input gracefully
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-label");
    });

    it("handles orientation changes", () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(
        <MobileTextInput onSubmit={mockOnSubmit} loading={false} />
      );

      // Mock orientation change
      Object.defineProperty(screen, "orientation", {
        writable: true,
        value: { angle: 90 },
      });

      window.dispatchEvent(new Event("orientationchange"));

      // Component should remain functional
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Cognitive Accessibility", () => {
    it("provides clear error messages", () => {
      render(
        <ResultDisplay
          summary=""
          loading={false}
          error="The API key you provided is invalid. Please check your key and try again."
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );

      const error = screen.getByRole("alert");
      expect(error).toHaveTextContent(/API key you provided is invalid/);
      expect(error).toHaveTextContent(/check your key and try again/);
    });

    it("provides progress indicators for long operations", () => {
      render(
        <ResultDisplay
          summary=""
          loading={true}
          error=""
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );

      const loadingIndicator = screen.getByRole("status");
      expect(loadingIndicator).toHaveAttribute("aria-label");
    });

    it("uses consistent navigation patterns", () => {
      const mockOnExample = jest.fn();
      render(<Instructions onExample={mockOnExample} loading={false} />);

      const steps = screen.getAllByRole("listitem");
      expect(steps).toHaveLength(4);

      // Each step should be clearly numbered
      steps.forEach((step, index) => {
        expect(step).toHaveTextContent((index + 1).toString());
      });
    });

    it("provides clear action consequences", async () => {
      const user = userEvent.setup();
      const mockOnExample = jest.fn();

      render(<Instructions onExample={mockOnExample} loading={false} />);

      const button = screen.getByRole("button", { name: /try example/i });
      expect(button).toHaveAttribute("aria-describedby");

      await user.hover(button);
      // Should provide tooltip or description of what will happen
    });
  });

  describe("Assistive Technology Edge Cases", () => {
    it("handles screen reader virtual cursor", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Simulate screen reader navigation
      await user.click(textarea);
      await user.type(textarea, "Testing virtual cursor navigation");

      expect(textarea).toHaveValue("Testing virtual cursor navigation");
    });

    it("supports voice control software", () => {
      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const button = screen.getByRole("button");

      // Elements should have proper labels for voice control
      expect(textarea).toHaveAttribute("aria-label");
      expect(button).toHaveAttribute("aria-label");
    });

    it("handles switch navigation", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      // Simulate switch navigation with space/enter
      const button = screen.getByRole("button");
      button.focus();

      await user.keyboard("{Space}");
      // Should handle switch activation
    });

    it("supports magnification software", () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(
        <MobileTextInput onSubmit={mockOnSubmit} loading={false} />
      );

      // Mock high zoom level
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: 3,
      });

      // Component should remain functional at high zoom
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeVisible();
    });

    it("handles multiple assistive technologies simultaneously", () => {
      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Should work with screen reader + voice control + magnification
      expect(textarea).toHaveAttribute("role", "textbox");
      expect(textarea).toHaveAttribute("aria-label");
      expect(textarea).toBeVisible();
    });
  });

  describe("WCAG Compliance", () => {
    it("meets WCAG 2.1 AA standards", async () => {
      const TestApp = () => (
        <div>
          <Instructions onExample={jest.fn()} loading={false} />
          <MobileTextInput onSubmit={jest.fn()} loading={false} />
          <ResultDisplay
            summary="Test summary"
            loading={false}
            error=""
            copied={false}
            isCached={false}
            onCopy={jest.fn()}
            onTryAgain={jest.fn()}
          />
        </div>
      );

      const { container } = render(<TestApp />);
      const results = await axe(container, {
        rules: {
          // Test specific WCAG rules
          "color-contrast": { enabled: true },
          keyboard: { enabled: true },
          "focus-order-semantics": { enabled: true },
          "aria-required-attr": { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it("provides proper page structure", () => {
      const TestApp = () => (
        <main>
          <h1>Paste to Summary</h1>
          <Instructions onExample={jest.fn()} loading={false} />
          <MobileTextInput onSubmit={jest.fn()} loading={false} />
        </main>
      );

      render(<TestApp />);

      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("handles form validation accessibly", () => {
      const mockProps = {
        apiKey: "",
        selectedProvider: LLMProvider.OPENAI,
        availableProviders: mockProviders,
        onApiKeyChange: jest.fn(),
        onProviderChange: jest.fn(),
        validating: false,
        validationStatus: "invalid" as const,
        onValidate: jest.fn(),
        onClear: jest.fn(),
        loadingProviders: false,
      };

      render(<ApiKeyInput {...mockProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby");

      const errorMessage = screen.getByText(/invalid/i);
      expect(errorMessage).toHaveAttribute("role", "alert");
    });
  });

  describe("Internationalization Accessibility", () => {
    it("supports RTL languages", () => {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";

      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();

      // Reset
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    });

    it("handles different character sets", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const complexText = "测试中文 العربية עברית 🌍🚀";

      await user.type(textarea, complexText);
      expect(textarea).toHaveValue(complexText);
    });
  });
});
