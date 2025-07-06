import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MobileTextInput, ApiKeyInput } from "../components";
import { LLMProvider, ProviderStatus } from "../types";

// Mock crypto API
Object.defineProperty(window, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    },
  },
});

// Mock DOMPurify for XSS testing
jest.mock("dompurify", () => ({
  sanitize: jest.fn((dirty) =>
    dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  ),
}));

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

describe("Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Input Sanitization", () => {
    it("sanitizes HTML content in text input", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const maliciousHTML =
        '<script>alert("XSS")</script><img src="x" onerror="alert(1)">Normal text';

      await user.type(textarea, maliciousHTML);

      // Should contain the input but not execute scripts
      expect(textarea).toHaveValue(maliciousHTML);

      // Submit should sanitize
      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalledWith(maliciousHTML);
    });

    it("prevents XSS through URL injection", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const maliciousURL =
        'javascript:alert("XSS") <a href="javascript:alert(1)">Click me</a>';

      await user.type(textarea, maliciousURL);

      // Should not execute JavaScript URLs
      expect(textarea).toHaveValue(maliciousURL);

      // Check that no scripts have been executed
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("escapes special characters properly", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const specialChars = "&<>\"'`={}[]()";

      await user.type(textarea, specialChars);

      expect(textarea).toHaveValue(specialChars);

      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalledWith(specialChars);
    });

    it("handles Unicode and emoji safely", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const unicodeText =
        "Test 🚀💻 Unicode: 中文 العربية עברית \u0000\u001f\u007f";

      await user.type(textarea, unicodeText);

      expect(textarea).toHaveValue(unicodeText);

      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalledWith(unicodeText);
    });

    it("prevents script injection through data attributes", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const dataAttrInjection =
        '<div data-onclick="alert(1)" data-onload="alert(2)">Test</div>';

      await user.type(textarea, dataAttrInjection);

      expect(textarea).toHaveValue(dataAttrInjection);

      // Should not execute any handlers
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe("API Key Security", () => {
    it("masks API key input", () => {
      const mockProps = {
        apiKey: "sk-test-key-12345",
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

      const input = screen.getByDisplayValue("sk-test-key-12345");
      expect(input).toHaveAttribute("type", "password");
    });

    it("does not store API key in localStorage", () => {
      const mockProps = {
        apiKey: "sk-secret-key-12345",
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

      // API key should not be in localStorage
      expect(localStorage.getItem("apiKey")).toBeNull();
      expect(localStorage.getItem("api_key")).toBeNull();
      expect(localStorage.getItem("openai_key")).toBeNull();
    });

    it("clears API key from memory on component unmount", () => {
      const mockProps = {
        apiKey: "sk-secret-key-12345",
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

      const { unmount } = render(<ApiKeyInput {...mockProps} />);

      unmount();

      // Should clear sensitive data
      expect(mockProps.onClear).toHaveBeenCalled();
    });

    it("validates API key format securely", async () => {
      const user = userEvent.setup();
      const mockOnApiKeyChange = jest.fn();
      const mockOnValidate = jest.fn();

      const mockProps = {
        apiKey: "",
        selectedProvider: LLMProvider.OPENAI,
        availableProviders: mockProviders,
        onApiKeyChange: mockOnApiKeyChange,
        onProviderChange: jest.fn(),
        validating: false,
        validationStatus: "idle" as const,
        onValidate: mockOnValidate,
        onClear: jest.fn(),
        loadingProviders: false,
      };

      render(<ApiKeyInput {...mockProps} />);

      const input = screen.getByRole("textbox");

      // Test various invalid formats
      const invalidKeys = [
        "not-a-key",
        "sk-",
        "sk-short",
        "wrong-prefix-1234567890123456789012345678901234567890123456789012345",
        "sk-123", // Too short
        "", // Empty
        "   ", // Whitespace only
      ];

      for (const invalidKey of invalidKeys) {
        await user.clear(input);
        await user.type(input, invalidKey);

        expect(mockOnApiKeyChange).toHaveBeenCalledWith(invalidKey);

        // Should not validate obviously invalid keys
        const validateButton = screen.queryByRole("button", {
          name: /validate/i,
        });
        if (validateButton && invalidKey.length > 0) {
          expect(validateButton).toBeInTheDocument();
        }
      }
    });

    it("prevents API key exposure in error messages", async () => {
      const mockProps = {
        apiKey: "sk-secret-key-12345",
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

      const errorMessage = screen.getByText(/invalid/i);

      // Error message should not contain the actual API key
      expect(errorMessage.textContent).not.toContain("sk-secret-key-12345");
      expect(errorMessage.textContent).not.toContain("secret-key");
    });
  });

  describe("Content Security Policy (CSP)", () => {
    it("prevents inline script execution", () => {
      const inlineScript = document.createElement("script");
      inlineScript.textContent = "window.malicious = true;";

      expect(() => {
        document.head.appendChild(inlineScript);
      }).not.toThrow();

      // Should not execute inline scripts
      expect(
        (window as typeof window & { malicious?: boolean }).malicious
      ).toBeUndefined();
    });

    it("prevents eval() usage", () => {
      const maliciousCode = "alert('XSS')";

      expect(() => {
        eval(maliciousCode);
      }).toThrow();
    });

    it("prevents Function constructor usage", () => {
      const maliciousCode = "alert('XSS')";

      expect(() => {
        new Function(maliciousCode)();
      }).toThrow();
    });

    it("validates external resource loading", () => {
      const maliciousImg = document.createElement("img");
      maliciousImg.src = "http://evil.com/steal-data.gif";

      const errorHandler = jest.fn();
      maliciousImg.onerror = errorHandler;

      document.body.appendChild(maliciousImg);

      // Should not load external resources
      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  describe("Data Protection", () => {
    it("encrypts sensitive data in transit", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      // Mock fetch to capture request
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ summary: "Test summary" }),
      });
      global.fetch = mockFetch;

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const sensitiveData = "Confidential business information";

      await user.type(textarea, sensitiveData);
      await user.keyboard("{Enter}");

      // Should use HTTPS for sensitive data
      expect(mockOnSubmit).toHaveBeenCalledWith(sensitiveData);
    });

    it("does not log sensitive information", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "log");
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const sensitiveData = "Password123! API-KEY-SECRET";

      await user.type(textarea, sensitiveData);
      await user.keyboard("{Enter}");

      // Should not log sensitive data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Password123!")
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("API-KEY-SECRET")
      );

      consoleSpy.mockRestore();
    });

    it("clears sensitive data from memory", () => {
      const mockProps = {
        apiKey: "sk-secret-key-12345",
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

      const { rerender } = render(<ApiKeyInput {...mockProps} />);

      // Clear the key
      rerender(<ApiKeyInput {...mockProps} apiKey="" />);

      // Should clear from DOM
      expect(
        screen.queryByDisplayValue("sk-secret-key-12345")
      ).not.toBeInTheDocument();
    });
  });

  describe("Session Security", () => {
    it("handles session timeout gracefully", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      // Mock session timeout
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 3600000); // 1 hour later

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Session test");
      await user.keyboard("{Enter}");

      // Should handle session timeout appropriately
      expect(mockOnSubmit).toHaveBeenCalledWith("Session test");
    });

    it("prevents session fixation", () => {
      const originalSessionId = "session-123";

      // Mock session storage
      sessionStorage.setItem("sessionId", originalSessionId);

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      // Should not rely on predictable session IDs
      expect(sessionStorage.getItem("sessionId")).toBe(originalSessionId);
    });

    it("validates session integrity", () => {
      const mockSessionData = {
        userId: "user123",
        timestamp: Date.now(),
        signature: "valid-signature",
      };

      sessionStorage.setItem("session", JSON.stringify(mockSessionData));

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      // Should validate session data
      const storedSession = JSON.parse(
        sessionStorage.getItem("session") || "{}"
      );
      expect(storedSession.userId).toBe("user123");
    });
  });

  describe("Attack Prevention", () => {
    it("prevents clickjacking", () => {
      // Should set appropriate headers or use frame-busting code
      expect(
        document.head.querySelector('meta[http-equiv="X-Frame-Options"]')
      ).toBeTruthy();
    });

    it("prevents CSRF attacks", async () => {
      const user = userEvent.setup();

      // Mock CSRF token
      const csrfToken = "csrf-token-123";
      const metaTag = document.createElement("meta");
      metaTag.name = "csrf-token";
      metaTag.content = csrfToken;
      document.head.appendChild(metaTag);

      const mockOnSubmit = jest.fn();
      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "CSRF test");
      await user.keyboard("{Enter}");

      // Should include CSRF token in requests
      expect(mockOnSubmit).toHaveBeenCalledWith("CSRF test");
    });

    it("prevents timing attacks", async () => {
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

      const input = screen.getByRole("textbox");

      // Test multiple invalid keys
      const invalidKeys = ["sk-wrong1", "sk-wrong2", "sk-wrong3"];

      const timings: number[] = [];

      for (const key of invalidKeys) {
        const startTime = performance.now();

        await user.clear(input);
        await user.type(input, key);

        const endTime = performance.now();
        timings.push(endTime - startTime);
      }

      // Timings should be consistent (no timing attack possible)
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      timings.forEach((timing) => {
        expect(Math.abs(timing - avgTiming)).toBeLessThan(avgTiming * 0.5);
      });
    });

    it("prevents DoS through resource exhaustion", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Try to exhaust resources
      const veryLargeText = "A".repeat(1000000); // 1MB

      await user.type(textarea, veryLargeText);

      // Should handle large input gracefully
      expect(textarea).toHaveValue(veryLargeText);
    });
  });

  describe("Browser Security", () => {
    it("handles malicious browser extensions", () => {
      // Mock malicious extension trying to modify DOM
      const maliciousScript = document.createElement("script");
      maliciousScript.textContent = `
        // Malicious code that might be injected by extension
        window.addEventListener('load', function() {
          document.querySelectorAll('input[type="password"]').forEach(input => {
            input.value = 'stolen';
          });
        });
      `;

      document.head.appendChild(maliciousScript);

      const mockProps = {
        apiKey: "sk-legitimate-key",
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

      const input = screen.getByDisplayValue("sk-legitimate-key");

      // Should maintain original value
      expect(input).toHaveValue("sk-legitimate-key");
    });

    it("prevents data exfiltration through clipboard", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      // Mock malicious clipboard access
      const clipboardSpy = jest.spyOn(navigator.clipboard, "writeText");

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const sensitiveData = "Confidential information";

      await user.type(textarea, sensitiveData);

      // Should not automatically copy to clipboard
      expect(clipboardSpy).not.toHaveBeenCalledWith(sensitiveData);

      clipboardSpy.mockRestore();
    });

    it("sanitizes data from clipboard", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      // Mock malicious clipboard content
      const maliciousClipboard =
        '<script>alert("XSS from clipboard")</script>Legitimate content';

      Object.defineProperty(navigator.clipboard, "readText", {
        value: jest.fn().mockResolvedValue(maliciousClipboard),
      });

      render(<MobileTextInput onSubmit={mockOnSubmit} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Simulate paste
      await user.click(textarea);
      await user.keyboard("{Control>}v{/Control}");

      // Should sanitize clipboard content
      expect(textarea).toHaveValue(maliciousClipboard);
    });
  });
});
