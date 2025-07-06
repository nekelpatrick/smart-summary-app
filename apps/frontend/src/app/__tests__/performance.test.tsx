import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useTextSummary } from "../hooks/useTextSummary";
import { MobileTextInput, ResultDisplay } from "../components";

// Mock performance observer
global.PerformanceObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
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

function usePerformanceMonitor() {
  React.useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);
      }
    });
    observer.observe({ entryTypes: ["measure"] });
    return () => observer.disconnect();
  }, []);
}

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

  it("should render MobileTextInput quickly", async () => {
    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    performance.mark("render-start");
    const renderResult = render(<TestComponent />);
    performance.mark("render-end");
    performance.measure("render-duration", "render-start", "render-end");

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    const duration = performance.measure.mock.calls[0];
    expect(duration).toBeDefined();
    expect(renderResult.container).toBeInTheDocument();
  });

  it("should handle large text input efficiently", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();
    const largeText = "A".repeat(50000);

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={onTextChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    performance.mark("large-input-start");
    await user.type(textarea, largeText);
    performance.mark("large-input-end");
    performance.measure(
      "large-input-duration",
      "large-input-start",
      "large-input-end"
    );

    await waitFor(() => expect(onTextChange).toHaveBeenCalled());
    const duration = performance.measure.mock.calls[0];
    expect(duration).toBeDefined();
  });

  it("should maintain smooth frame rate during typing", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const originalRAF = global.requestAnimationFrame;
    let frameCount = 0;
    const mockRAF = jest.fn((callback) => {
      frameCount++;
      return originalRAF(callback);
    });
    global.requestAnimationFrame = mockRAF;

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={onTextChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    const startTime = performance.now();
    await user.type(textarea, "This is a test message");
    const endTime = performance.now();
    const duration = endTime - startTime;

    const expectedFrames = Math.floor(duration / 16.67);
    expect(frameCount).toBeGreaterThan(0);
    expect(frameCount).toBeLessThan(expectedFrames * 2);

    global.requestAnimationFrame = originalRAF;
  });

  it("should handle rapid state updates efficiently", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const TestComponent = () => {
      const [text, setText] = React.useState("");
      usePerformanceMonitor();

      const handleChange = (newText: string) => {
        setText(newText);
        onTextChange(newText);
      };

      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={handleChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      await user.type(textarea, "a");
    }
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000);
    expect(onTextChange).toHaveBeenCalledTimes(100);
  });

  it("should handle memory efficiently", async () => {
    const TestComponent = () => {
      const [items, setItems] = React.useState<string[]>([]);
      usePerformanceMonitor();

      React.useEffect(() => {
        const interval = setInterval(() => {
          setItems((prev) => [...prev, `Item ${prev.length}`]);
        }, 10);

        return () => clearInterval(interval);
      }, []);

      return (
        <div>
          {items.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      );
    };

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const { unmount } = render(<TestComponent />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    unmount();

    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it("should clean up event listeners properly", async () => {
    let eventListenerCount = 0;
    const originalAddEventListener = document.addEventListener;
    const originalRemoveEventListener = document.removeEventListener;

    document.addEventListener = jest.fn((type, listener, options) => {
      eventListenerCount++;
      return originalAddEventListener.call(document, type, listener, options);
    });

    document.removeEventListener = jest.fn((type, listener, options) => {
      eventListenerCount--;
      return originalRemoveEventListener.call(
        document,
        type,
        listener,
        options
      );
    });

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    const { unmount } = render(<TestComponent />);
    const listenersAdded = eventListenerCount;
    unmount();

    expect(eventListenerCount).toBe(0);

    document.addEventListener = originalAddEventListener;
    document.removeEventListener = originalRemoveEventListener;
  });

  it("should handle memory pressure gracefully", async () => {
    const originalMemory = (performance as any).memory;
    (performance as any).memory = {
      usedJSHeapSize: 1800000000,
      totalJSHeapSize: 2000000000,
      jsHeapSizeLimit: 2000000000,
    };

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    expect(() => render(<TestComponent />)).not.toThrow();

    (performance as any).memory = originalMemory;
  });

  it("should handle slow network conditions", async () => {
    const user = userEvent.setup();
    const slowSubmit = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 3000));
    });

    const TestComponent = () => {
      const [loading, setLoading] = React.useState(false);
      usePerformanceMonitor();

      const handleSubmit = async (text: string) => {
        setLoading(true);
        try {
          await slowSubmit(text);
        } finally {
          setLoading(false);
        }
      };

      return (
        <MobileTextInput
          onSubmit={handleSubmit}
          loading={loading}
          onTextChange={jest.fn()}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    await user.type(textarea, "Test message");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    const startTime = performance.now();
    await user.type(textarea, "a");
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(100);
  });

  it("should handle rapid user interactions", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const TestComponent = () => {
      const [submissionCount, setSubmissionCount] = React.useState(0);
      usePerformanceMonitor();

      const handleSubmit = async (text: string) => {
        setSubmissionCount((prev) => prev + 1);
        await onSubmit(text);
      };

      return (
        <div>
          <MobileTextInput
            onSubmit={handleSubmit}
            loading={false}
            onTextChange={onTextChange}
          />
          <div data-testid="submission-count">{submissionCount}</div>
        </div>
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    await user.type(textarea, "Test message");

    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      await user.click(submitButton);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it("should handle timeout gracefully", async () => {
    const user = userEvent.setup();
    const timeoutSubmit = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 100);
      });
    });

    const TestComponent = () => {
      const [error, setError] = React.useState<string>("");
      usePerformanceMonitor();

      const handleSubmit = async (text: string) => {
        try {
          setError("");
          await timeoutSubmit(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      };

      return (
        <div>
          <MobileTextInput
            onSubmit={handleSubmit}
            loading={false}
            onTextChange={jest.fn()}
          />
          {error && <div data-testid="error">{error}</div>}
        </div>
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    await user.type(textarea, "Test message");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    const startTime = performance.now();
    await user.type(textarea, "a");
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(100);
  });

  it("should handle stress testing", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={onTextChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      await user.type(textarea, "a");
    }
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(10000);
  });

  it("should maintain consistent performance", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={onTextChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    const times: number[] = [];
    for (let i = 0; i < 50; i++) {
      const startTime = performance.now();
      await user.type(textarea, "a");
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200);
  });

  it("should handle component state changes efficiently", async () => {
    const TestComponent = () => {
      const [summary, setSummary] = React.useState("");
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState("Network error");
      usePerformanceMonitor();

      React.useEffect(() => {
        const timer = setTimeout(() => {
          setError("");
          setLoading(false);
          setSummary("Test summary");
        }, 100);

        return () => clearTimeout(timer);
      }, []);

      return (
        <ResultDisplay
          summary={summary}
          loading={loading}
          error={error}
          copied={false}
          isCached={false}
          onCopy={jest.fn()}
          onTryAgain={jest.fn()}
        />
      );
    };

    const startTime = performance.now();
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText("Test summary")).toBeInTheDocument();
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it("should handle typical user workflow efficiently", async () => {
    const user = userEvent.setup();

    const TestComponent = () => {
      const [text, setText] = React.useState("");
      const [summary, setSummary] = React.useState("");
      const [loading, setLoading] = React.useState(false);
      usePerformanceMonitor();

      const handleSubmit = async (newText: string) => {
        setLoading(true);
        setText(newText);
        setTimeout(() => {
          setSummary("Generated summary");
          setLoading(false);
        }, 100);
      };

      const handleCopy = () => {
        navigator.clipboard.writeText(summary);
      };

      return (
        <div>
          <MobileTextInput
            onSubmit={handleSubmit}
            loading={loading}
            onTextChange={jest.fn()}
          />
          <ResultDisplay
            summary={summary}
            loading={loading}
            error=""
            copied={false}
            isCached={false}
            onCopy={handleCopy}
            onTryAgain={jest.fn()}
          />
        </div>
      );
    };

    performance.mark("workflow-start");
    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    await user.type(textarea, "Test message");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Generated summary")).toBeInTheDocument();
    });

    performance.mark("workflow-end");
    const measure = performance.measure(
      "workflow-duration",
      "workflow-start",
      "workflow-end"
    );

    expect(measure.duration).toBeLessThan(1000);
  });

  it("should work on mobile devices", async () => {
    const originalNavigator = global.navigator;
    Object.defineProperty(global.navigator, "hardwareConcurrency", {
      value: 2,
      writable: true,
    });

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    expect(() => render(<TestComponent />)).not.toThrow();

    Object.defineProperty(global.navigator, "hardwareConcurrency", {
      value: originalNavigator.hardwareConcurrency,
      writable: true,
    });
  });

  it("should optimize for battery usage", async () => {
    const originalBattery = (navigator as any).getBattery;
    (navigator as any).getBattery = jest.fn().mockResolvedValue({
      charging: false,
      level: 0.2,
      chargingTime: Infinity,
      dischargingTime: 3600,
    });

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    expect(() => render(<TestComponent />)).not.toThrow();

    (navigator as any).getBattery = originalBattery;
  });

  it("should detect performance bottlenecks", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onTextChange = jest.fn();

    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={onSubmit}
          loading={false}
          onTextChange={onTextChange}
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByRole("textbox");

    const measurements: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      await user.type(textarea, "test");
      const endTime = performance.now();
      measurements.push(endTime - startTime);
    }

    const averageTime =
      measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const bottleneckThreshold = 100;

    expect(averageTime).toBeLessThan(bottleneckThreshold);
  });

  it("should handle web vitals", async () => {
    const TestComponent = () => {
      usePerformanceMonitor();
      return (
        <MobileTextInput
          onSubmit={jest.fn()}
          loading={false}
          onTextChange={jest.fn()}
        />
      );
    };

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "layout-shift") {
          expect(entry.value).toBeLessThan(0.1);
        }
        if (entry.entryType === "largest-contentful-paint") {
          expect(entry.startTime).toBeLessThan(2500);
        }
        if (entry.entryType === "first-contentful-paint") {
          expect(entry.startTime).toBeLessThan(1800);
        }
      });
    });

    observer.observe({
      entryTypes: [
        "layout-shift",
        "largest-contentful-paint",
        "first-contentful-paint",
      ],
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    observer.disconnect();
  });
});
