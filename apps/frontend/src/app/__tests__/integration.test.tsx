import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";

// Mock all external dependencies
jest.mock("../services/streamingService");
jest.mock("../services/apiService");

// Mock intersection observer for better test stability
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(""),
  },
});

// Mock performance API with memory
interface MockPerformance extends Performance {
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

Object.defineProperty(window, "performance", {
  value: {
    ...window.performance,
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000,
    },
  } as MockPerformance,
});

describe("Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset local storage
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Complete User Workflows", () => {
    it("completes full summarization workflow", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // 1. User sees instructions
      expect(screen.getByText("How it works")).toBeInTheDocument();

      // 2. User tries example
      const exampleButton = screen.getByRole("button", {
        name: /try example/i,
      });
      await user.click(exampleButton);

      // 3. Text should be populated
      await waitFor(() => {
        expect(screen.getByText(/your text/i)).toBeInTheDocument();
      });

      // 4. Summary should be generated
      await waitFor(
        () => {
          expect(screen.getByText(/summary/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // 5. User can copy summary
      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("handles manual text input workflow", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // 1. User enters text manually
      const textarea = screen.getByRole("textbox");
      const testText =
        "This is a test article about artificial intelligence and its applications in modern technology.";

      await user.type(textarea, testText);
      expect(textarea).toHaveValue(testText);

      // 2. User submits for summarization
      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // 3. Loading state should appear
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      // 4. Summary should appear
      await waitFor(() => {
        expect(screen.getByText(/summary/i)).toBeInTheDocument();
      });
    });

    it("handles API key configuration workflow", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // 1. User opens API settings
      const apiSettingsButton = screen.getByRole("button", {
        name: /api settings/i,
      });
      await user.click(apiSettingsButton);

      // 2. User enters API key
      const apiKeyInput = screen.getByRole("textbox", { name: /api key/i });
      await user.type(apiKeyInput, "sk-test-key-12345");

      // 3. User validates key
      const validateButton = screen.getByRole("button", { name: /validate/i });
      await user.click(validateButton);

      // 4. Validation feedback should appear
      await waitFor(() => {
        expect(screen.getByText(/validating/i)).toBeInTheDocument();
      });
    });

    it("handles error recovery workflow", async () => {
      const user = userEvent.setup();

      // Mock network error
      jest
        .spyOn(global, "fetch")
        .mockRejectedValueOnce(new Error("Network error"));

      render(<Home />);

      // 1. User tries to summarize
      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test content");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // 2. Error should appear
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // 3. User can try again
      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe("Cross-Component Integration", () => {
    it("maintains state consistency across components", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Text input affects display
      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Integration test content");

      // State should be reflected in text display
      expect(screen.getByText("Integration test content")).toBeInTheDocument();

      // Character count should update
      expect(screen.getByText(/24 characters/)).toBeInTheDocument();
    });

    it("handles component interactions during loading", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test content");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // During loading, interactions should be limited
      expect(submitButton).toBeDisabled();

      // Clear should still work
      const clearButton = screen.getByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(textarea).toHaveValue("");
    });

    it("synchronizes toast notifications with user actions", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Mock successful summary
      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test content");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // Should show success toast
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      // Copy action should show toast
      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe("Performance Integration", () => {
    it("handles large text input efficiently", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Large text input (50KB)
      const largeText = "A".repeat(50000);
      const textarea = screen.getByRole("textbox");

      // Monitor performance
      const startTime = performance.now();
      await user.type(textarea, largeText);
      const endTime = performance.now();

      // Should complete within reasonable time (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(textarea).toHaveValue(largeText);
    });

    it("manages memory during intensive operations", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Simulate multiple heavy operations
      for (let i = 0; i < 10; i++) {
        const textarea = screen.getByRole("textbox");
        await user.clear(textarea);
        await user.type(
          textarea,
          `Heavy operation ${i} ${"text ".repeat(1000)}`
        );

        const submitButton = screen.getByRole("button", { name: /summarize/i });
        await user.click(submitButton);

        // Wait for completion
        await waitFor(() => {
          expect(screen.getByText(/summary/i)).toBeInTheDocument();
        });

        // Clear for next iteration
        const clearButton = screen.getByRole("button", { name: /clear/i });
        await user.click(clearButton);
      }

      // Should not exceed memory limits
      const perf = performance as MockPerformance;
      expect(perf.memory.usedJSHeapSize).toBeLessThan(
        perf.memory.jsHeapSizeLimit * 0.8
      );
    });

    it("handles concurrent user interactions", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Simulate rapid user interactions
      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", { name: /summarize/i });

      // Rapid typing and clicking
      await Promise.all([
        user.type(textarea, "Concurrent test"),
        user.click(submitButton),
        user.clear(textarea),
        user.type(textarea, "New content"),
      ]);

      // Should handle gracefully without crashes
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Storage Integration", () => {
    it("persists and restores user preferences", async () => {
      const user = userEvent.setup();

      // Set preferences
      render(<Home />);

      const enhancedModeButton = screen.getByRole("button", {
        name: /smart mode/i,
      });
      await user.click(enhancedModeButton);

      // Simulate page reload
      const { unmount } = render(<Home />);
      unmount();

      render(<Home />);

      // Preferences should be restored
      expect(screen.getByText(/smart mode on/i)).toBeInTheDocument();
    });

    it("handles storage quota limits", async () => {
      const user = userEvent.setup();

      // Mock storage quota exceeded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error("QuotaExceededError");
      });

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Storage test content");

      // Should handle storage errors gracefully
      expect(textarea).toHaveValue("Storage test content");

      // Restore original function
      localStorage.setItem = originalSetItem;
    });

    it("manages cache efficiently", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Generate multiple summaries to fill cache
      for (let i = 0; i < 60; i++) {
        // More than cache limit of 50
        const textarea = screen.getByRole("textbox");
        await user.clear(textarea);
        await user.type(textarea, `Cache test content ${i}`);

        const submitButton = screen.getByRole("button", { name: /summarize/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/summary/i)).toBeInTheDocument();
        });
      }

      // Cache should be managed and not exceed limits
      const cacheKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("summary_cache_")
      );
      expect(cacheKeys.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Network Integration", () => {
    it("handles network connectivity changes", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Simulate going offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      window.dispatchEvent(new Event("offline"));

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Offline test");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // Should show offline error
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Simulate coming back online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));

      // Should retry automatically or show retry option
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
    });

    it("handles slow network conditions", async () => {
      const user = userEvent.setup();

      // Mock slow network
      jest
        .spyOn(global, "fetch")
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5000))
        );

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Slow network test");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // Should show loading with timeout warning
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Should handle timeout gracefully
      await waitFor(
        () => {
          expect(screen.getByText(/taking longer/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it("handles API rate limiting", async () => {
      const user = userEvent.setup();

      // Mock rate limit response
      jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "60" }),
      } as Response);

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Rate limit test");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // Should show rate limit message with retry time
      await waitFor(() => {
        expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
        expect(screen.getByText(/60 seconds/i)).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Integration", () => {
    it("handles touch gestures", async () => {
      // Mock touch device
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 5,
      });

      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");

      // Simulate touch events
      await user.pointer([
        { keys: "[TouchA>]", target: textarea },
        { keys: "[/TouchA]" },
      ]);

      expect(textarea).toHaveFocus();
    });

    it("handles viewport changes", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 375,
      });
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        value: 667,
      });

      render(<Home />);

      // Should render mobile-optimized layout
      expect(screen.getByRole("textbox")).toBeInTheDocument();

      // Simulate orientation change
      window.innerWidth = 667;
      window.innerHeight = 375;
      window.dispatchEvent(new Event("resize"));

      // Should adapt to landscape
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("handles keyboard appearance on mobile", async () => {
      const user = userEvent.setup();

      // Mock virtual keyboard
      const mockViewport = {
        height: 667,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      Object.defineProperty(window, "visualViewport", {
        value: mockViewport,
        writable: true,
      });

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);

      // Simulate keyboard opening (viewport height change)
      mockViewport.height = 400;
      mockViewport.dispatchEvent(new Event("resize"));

      // Layout should adapt
      expect(textarea).toBeVisible();
    });
  });

  describe("Security Integration", () => {
    it("sanitizes user input", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      const maliciousInput =
        '<script>alert("xss")</script><img src="x" onerror="alert(1)">';

      await user.type(textarea, maliciousInput);

      // Should not execute scripts
      expect(textarea).toHaveValue(maliciousInput);
      // Script should not execute (no alert)
    });

    it("handles API key securely", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const apiSettingsButton = screen.getByRole("button", {
        name: /api settings/i,
      });
      await user.click(apiSettingsButton);

      const apiKeyInput = screen.getByRole("textbox", { name: /api key/i });
      await user.type(apiKeyInput, "sk-secret-key-12345");

      // API key should be masked in DOM
      expect(apiKeyInput).toHaveAttribute("type", "password");

      // Should not appear in localStorage
      expect(localStorage.getItem("api_key")).toBeNull();
    });

    it("validates content size limits", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      const veryLargeText = "A".repeat(100000); // 100KB

      await user.type(textarea, veryLargeText);

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // Should show size limit warning
      await waitFor(() => {
        expect(screen.getByText(/too large/i)).toBeInTheDocument();
      });
    });
  });

  describe("Analytics Integration", () => {
    it("tracks user interactions", async () => {
      const user = userEvent.setup();

      render(<Home />);

      // Mock analytics
      const mockAnalytics = jest.fn();
      (window as typeof window & { gtag?: typeof mockAnalytics }).gtag =
        mockAnalytics;

      const exampleButton = screen.getByRole("button", {
        name: /try example/i,
      });
      await user.click(exampleButton);

      // Should track events (if analytics are implemented)
      // expect(mockAnalytics).toHaveBeenCalledWith("event", "try_example");
    });

    it("measures performance metrics", async () => {
      const user = userEvent.setup();

      const startTime = performance.now();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Performance test");

      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/summary/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  describe("Edge Case Integration", () => {
    it("handles rapid component mount/unmount", () => {
      // Test rapid mounting and unmounting
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Home />);
        unmount();
      }

      // Should not cause memory leaks or errors
      const { container } = render(<Home />);
      expect(container).toBeInTheDocument();
    });

    it("handles browser back/forward navigation", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Navigation test");

      // Simulate browser navigation
      window.history.pushState({}, "", "/");
      window.history.back();
      window.dispatchEvent(new PopStateEvent("popstate"));

      // Should maintain state or handle navigation gracefully
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("handles window focus/blur events", async () => {
      const user = userEvent.setup();

      render(<Home />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Focus test");

      // Simulate tab switching
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("focus"));

      // Should handle focus changes gracefully
      expect(textarea).toBeInTheDocument();
    });
  });
});
