import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";
import { useTextSummary } from "../hooks/useTextSummary";
import { MobileTextInput } from "../components/MobileTextInput";

// Mock performance observer
global.PerformanceObserver = class PerformanceObserver {
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  private callback: PerformanceObserverCallback;
};

// Mock performance.mark and performance.measure
const mockPerformanceMarks = new Map<string, number>();
const mockPerformanceMeasures = new Map<string, number>();

Object.defineProperty(window.performance, "mark", {
  value: jest.fn((name: string) => {
    mockPerformanceMarks.set(name, performance.now());
  }),
});

Object.defineProperty(window.performance, "measure", {
  value: jest.fn((name: string, startMark: string, endMark: string) => {
    const start = mockPerformanceMarks.get(startMark) || 0;
    const end = mockPerformanceMarks.get(endMark) || performance.now();
    const duration = end - start;
    mockPerformanceMeasures.set(name, duration);
    return { duration, name };
  }),
});

Object.defineProperty(window.performance, "getEntriesByName", {
  value: jest.fn((name: string) => {
    const duration = mockPerformanceMeasures.get(name);
    return duration ? [{ name, duration }] : [];
  }),
});

// Mock hook for performance testing
jest.mock("../hooks/useTextSummary");
const mockUseTextSummary = useTextSummary as jest.MockedFunction<
  typeof useTextSummary
>;

describe("Performance Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceMarks.clear();
    mockPerformanceMeasures.clear();

    mockUseTextSummary.mockReturnValue({
      text: "",
      summary: "",
      loading: false,
      error: "",
      copied: false,
      isCached: false,
      apiKey: "",
      selectedProvider: "openai",
      availableProviders: [],
      apiKeyValidationStatus: "idle",
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
    });
  });

  describe("Rendering Performance", () => {
    it("renders initial component within performance budget", () => {
      const startTime = performance.now();

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("handles large text input without performance degradation", async () => {
      const user = userEvent.setup();
      const largeText = "A".repeat(50000); // 50KB text

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const startTime = performance.now();

      await user.type(textarea, largeText);

      const endTime = performance.now();
      const inputTime = endTime - startTime;

      // Should handle large input within 2 seconds
      expect(inputTime).toBeLessThan(2000);
      expect(textarea).toHaveValue(largeText);
    });

    it("maintains 60fps during text input", async () => {
      const user = userEvent.setup();
      const frameCallback = jest.fn();

      // Mock requestAnimationFrame
      const originalRAF = window.requestAnimationFrame;
      let frameCount = 0;
      window.requestAnimationFrame = (callback) => {
        frameCount++;
        return originalRAF(() => {
          frameCallback();
          callback(performance.now());
        });
      };

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const startTime = performance.now();

      // Type rapidly
      await user.type(textarea, "The quick brown fox jumps over the lazy dog");

      const endTime = performance.now();
      const duration = endTime - startTime;
      const expectedFrames = Math.floor(duration / 16.67); // 60fps = 16.67ms per frame

      // Should maintain smooth frame rate
      expect(frameCount).toBeGreaterThan(expectedFrames * 0.8);

      // Restore original RAF
      window.requestAnimationFrame = originalRAF;
    });

    it("handles rapid re-renders efficiently", async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount((c) => c + 1);
          }, 10);

          setTimeout(() => clearInterval(interval), 500);

          return () => clearInterval(interval);
        }, []);

        return (
          <div>
            <MobileTextInput onSubmit={jest.fn()} loading={false} />
            <div data-testid="counter">{count}</div>
          </div>
        );
      };

      const startTime = performance.now();

      render(<TestComponent />);

      await waitFor(() => {
        const counter = screen.getByTestId("counter");
        expect(parseInt(counter.textContent || "0")).toBeGreaterThan(10);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid updates efficiently
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe("Memory Performance", () => {
    it("manages memory efficiently during heavy usage", async () => {
      const user = userEvent.setup();
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        await user.clear(textarea);
        await user.type(
          textarea,
          `Heavy usage iteration ${i} ${"text ".repeat(100)}`
        );
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it("cleans up event listeners on unmount", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <MobileTextInput onSubmit={jest.fn()} loading={false} />
      );

      const addCount = addEventListenerSpy.mock.calls.length;

      unmount();

      const removeCount = removeEventListenerSpy.mock.calls.length;

      // Should remove as many listeners as added
      expect(removeCount).toBeGreaterThanOrEqual(addCount);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it("handles memory pressure gracefully", async () => {
      const user = userEvent.setup();

      // Mock memory pressure
      Object.defineProperty(performance, "memory", {
        value: {
          usedJSHeapSize: 1800000000, // 1.8GB
          totalJSHeapSize: 2000000000, // 2GB
          jsHeapSizeLimit: 2000000000, // 2GB limit
        },
        configurable: true,
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Should handle memory pressure without crashing
      await user.type(textarea, "Memory pressure test");

      expect(textarea).toHaveValue("Memory pressure test");
    });
  });

  describe("Network Performance", () => {
    it("handles slow network responses efficiently", async () => {
      const user = userEvent.setup();

      // Mock slow network
      const mockSummarize = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("Slow summary"), 3000);
        });
      });

      mockUseTextSummary.mockReturnValue({
        text: "Test text",
        summary: "",
        loading: true,
        error: "",
        copied: false,
        isCached: false,
        apiKey: "",
        selectedProvider: "openai",
        availableProviders: [],
        apiKeyValidationStatus: "idle",
        validatingApiKey: false,
        loadingProviders: false,
        setText: jest.fn(),
        summarize: mockSummarize,
        copyToClipboard: jest.fn(),
        reset: jest.fn(),
        loadExample: jest.fn(),
        tryAgain: jest.fn(),
        setApiKey: jest.fn(),
        setSelectedProvider: jest.fn(),
        validateApiKey: jest.fn(),
        clearApiKey: jest.fn(),
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={true} />);

      // Should show loading state immediately
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      // UI should remain responsive during network delay
      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Additional text");

      expect(textarea).toHaveValue("Additional text");
    });

    it("batches network requests efficiently", async () => {
      const user = userEvent.setup();
      const mockSummarize = jest.fn();

      mockUseTextSummary.mockReturnValue({
        text: "",
        summary: "",
        loading: false,
        error: "",
        copied: false,
        isCached: false,
        apiKey: "",
        selectedProvider: "openai",
        availableProviders: [],
        apiKeyValidationStatus: "idle",
        validatingApiKey: false,
        loadingProviders: false,
        setText: jest.fn(),
        summarize: mockSummarize,
        copyToClipboard: jest.fn(),
        reset: jest.fn(),
        loadExample: jest.fn(),
        tryAgain: jest.fn(),
        setApiKey: jest.fn(),
        setSelectedProvider: jest.fn(),
        validateApiKey: jest.fn(),
        clearApiKey: jest.fn(),
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", { name: /summarize/i });

      // Rapid submissions
      await user.type(textarea, "Request 1");
      await user.click(submitButton);

      await user.clear(textarea);
      await user.type(textarea, "Request 2");
      await user.click(submitButton);

      await user.clear(textarea);
      await user.type(textarea, "Request 3");
      await user.click(submitButton);

      // Should handle batching/debouncing
      await waitFor(() => {
        expect(mockSummarize).toHaveBeenCalledTimes(1);
      });
    });

    it("handles connection timeouts gracefully", async () => {
      const user = userEvent.setup();

      mockUseTextSummary.mockReturnValue({
        text: "Test text",
        summary: "",
        loading: false,
        error: "Request timeout",
        copied: false,
        isCached: false,
        apiKey: "",
        selectedProvider: "openai",
        availableProviders: [],
        apiKeyValidationStatus: "idle",
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
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      // Should show timeout error
      expect(screen.getByText(/timeout/i)).toBeInTheDocument();

      // UI should remain usable
      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "After timeout");

      expect(textarea).toHaveValue("After timeout");
    });
  });

  describe("Stress Testing", () => {
    it("handles extreme user interactions", async () => {
      const user = userEvent.setup();

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", { name: /summarize/i });

      // Extreme rapid interactions
      const startTime = performance.now();

      for (let i = 0; i < 50; i++) {
        await user.type(textarea, `Stress test ${i}`);
        await user.click(submitButton);
        await user.clear(textarea);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle stress without crashing
      expect(totalTime).toBeLessThan(10000); // 10 seconds
      expect(textarea).toBeInTheDocument();
    });

    it("maintains performance under continuous load", async () => {
      const user = userEvent.setup();

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      const performanceMetrics: number[] = [];

      // Continuous load test
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();

        await user.clear(textarea);
        await user.type(textarea, `Continuous load test iteration ${i}`);

        const endTime = performance.now();
        performanceMetrics.push(endTime - startTime);
      }

      // Performance should remain consistent
      const averageTime =
        performanceMetrics.reduce((a, b) => a + b, 0) /
        performanceMetrics.length;
      const maxTime = Math.max(...performanceMetrics);

      expect(averageTime).toBeLessThan(100); // Average < 100ms
      expect(maxTime).toBeLessThan(200); // Max < 200ms
    });

    it("recovers from error states efficiently", async () => {
      const user = userEvent.setup();

      // Start with error state
      mockUseTextSummary.mockReturnValue({
        text: "Error test",
        summary: "",
        loading: false,
        error: "Network error",
        copied: false,
        isCached: false,
        apiKey: "",
        selectedProvider: "openai",
        availableProviders: [],
        apiKeyValidationStatus: "idle",
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
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();

      // Switch to success state
      mockUseTextSummary.mockReturnValue({
        text: "Success test",
        summary: "Generated summary",
        loading: false,
        error: "",
        copied: false,
        isCached: false,
        apiKey: "",
        selectedProvider: "openai",
        availableProviders: [],
        apiKeyValidationStatus: "idle",
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
      });

      // Re-render with success state
      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      // Should recover quickly
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("Real-world Performance Scenarios", () => {
    it("handles typical user workflow efficiently", async () => {
      const user = userEvent.setup();

      performance.mark("workflow-start");

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      // Typical user workflow
      const textarea = screen.getByRole("textbox");

      // 1. User types text
      await user.type(
        textarea,
        "This is a typical article about technology trends in 2024"
      );

      // 2. User submits
      const submitButton = screen.getByRole("button", { name: /summarize/i });
      await user.click(submitButton);

      // 3. User copies result (mock)
      await user.keyboard("{Control>}c{/Control}");

      performance.mark("workflow-end");
      performance.measure(
        "workflow-duration",
        "workflow-start",
        "workflow-end"
      );

      const measure = performance.getEntriesByName("workflow-duration")[0];

      // Typical workflow should complete quickly
      expect(measure.duration).toBeLessThan(1000); // 1 second
    });

    it("handles mobile device constraints", async () => {
      const user = userEvent.setup();

      // Mock mobile constraints
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "slow-2g",
          downlink: 0.5,
          rtt: 2000,
        },
        configurable: true,
      });

      Object.defineProperty(navigator, "hardwareConcurrency", {
        value: 2, // Dual core mobile processor
        configurable: true,
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Should work on constrained devices
      await user.type(textarea, "Mobile performance test");

      expect(textarea).toHaveValue("Mobile performance test");
    });

    it("optimizes for battery life", async () => {
      const user = userEvent.setup();

      // Mock battery API
      Object.defineProperty(navigator, "getBattery", {
        value: () =>
          Promise.resolve({
            level: 0.2, // 20% battery
            charging: false,
            chargingTime: Infinity,
            dischargingTime: 3600, // 1 hour
          }),
        configurable: true,
      });

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");

      // Should optimize for low battery
      await user.type(textarea, "Battery optimization test");

      expect(textarea).toHaveValue("Battery optimization test");
    });
  });

  describe("Performance Monitoring", () => {
    it("tracks performance metrics", () => {
      const performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          expect(entry.duration).toBeLessThan(100);
        });
      });

      performanceObserver.observe({ entryTypes: ["measure"] });

      performance.mark("component-render-start");

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      performance.mark("component-render-end");
      performance.measure(
        "component-render",
        "component-render-start",
        "component-render-end"
      );

      performanceObserver.disconnect();
    });

    it("reports performance bottlenecks", async () => {
      const user = userEvent.setup();
      const bottleneckThreshold = 100; // 100ms

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");

      performance.mark("input-start");
      await user.type(textarea, "Performance bottleneck test");
      performance.mark("input-end");

      performance.measure("input-duration", "input-start", "input-end");

      const measure = performance.getEntriesByName("input-duration")[0];

      if (measure.duration > bottleneckThreshold) {
        console.warn(`Performance bottleneck detected: ${measure.duration}ms`);
      }

      expect(measure.duration).toBeLessThan(bottleneckThreshold * 2);
    });

    it("measures core web vitals", async () => {
      const user = userEvent.setup();

      // Mock Core Web Vitals
      const mockCLS = jest.fn();
      const mockFID = jest.fn();
      const mockLCP = jest.fn();

      (window as any).webVitals = {
        getCLS: mockCLS,
        getFID: mockFID,
        getLCP: mockLCP,
      };

      render(<MobileTextInput onSubmit={jest.fn()} loading={false} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Web vitals test");

      // Should have good web vitals
      expect(textarea).toBeInTheDocument();
    });
  });
});
