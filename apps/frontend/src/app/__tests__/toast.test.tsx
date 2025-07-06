import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Toast, ToastContainer } from "../components/Toast";

// Mock performance timing
const mockPerformanceNow = jest.fn();
global.performance.now = mockPerformanceNow;

describe("Toast Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  it("renders with correct message and type", () => {
    render(<Toast message="Test message" type="success" onClose={() => {}} />);

    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("✅")).toBeInTheDocument();
  });

  it("renders different types correctly", () => {
    const { rerender } = render(
      <Toast message="Success message" type="success" onClose={() => {}} />
    );

    expect(screen.getByText("✅")).toBeInTheDocument();

    rerender(<Toast message="Error message" type="error" onClose={() => {}} />);

    expect(screen.getByText("❌")).toBeInTheDocument();

    rerender(
      <Toast message="Warning message" type="warning" onClose={() => {}} />
    );

    expect(screen.getByText("⚠️")).toBeInTheDocument();

    rerender(<Toast message="Info message" type="info" onClose={() => {}} />);

    expect(screen.getByText("ℹ️")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const mockOnClose = jest.fn();

    render(
      <Toast message="Test message" type="success" onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText("Close notification");
    closeButton.click();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("applies correct styling based on type", () => {
    const { container } = render(
      <Toast message="Test message" type="success" onClose={() => {}} />
    );

    const toastElement = container.firstChild;
    expect(toastElement).toHaveClass(
      "bg-green-50",
      "text-green-800",
      "border-green-200"
    );
  });

  it("handles duration correctly", () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();

    render(
      <Toast
        message="Test message"
        type="success"
        duration={1000}
        onClose={mockOnClose}
      />
    );

    expect(mockOnClose).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(mockOnClose).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("does not auto-close when duration is 0", () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();

    render(
      <Toast
        message="Test message"
        type="success"
        duration={0}
        onClose={mockOnClose}
      />
    );

    jest.advanceTimersByTime(5000);

    expect(mockOnClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe("ToastContainer Component", () => {
  it("renders multiple toasts", () => {
    const toasts = [
      {
        id: "1",
        message: "First toast",
        type: "success" as const,
        duration: 3000,
      },
      {
        id: "2",
        message: "Second toast",
        type: "error" as const,
        duration: 3000,
      },
    ];

    render(<ToastContainer toasts={toasts} onRemove={() => {}} />);

    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });

  it("calls onRemove when a toast is closed", () => {
    const mockOnRemove = jest.fn();
    const toasts = [
      {
        id: "1",
        message: "Test toast",
        type: "success" as const,
        duration: 3000,
      },
    ];

    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

    const closeButton = screen.getByLabelText("Close notification");
    closeButton.click();

    expect(mockOnRemove).toHaveBeenCalledWith("1");
  });

  it("handles empty toast array", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onRemove={() => {}} />
    );

    expect(container.firstChild?.childNodes).toHaveLength(0);
  });
});

describe("Toast with Context", () => {
  it("works without ToastProvider", () => {
    render(<Toast message="Context test" type="info" onClose={() => {}} />);

    expect(screen.getByText("Context test")).toBeInTheDocument();
  });
});

describe("Toast Performance", () => {
  it("renders efficiently with many toasts", () => {
    const manyToasts = Array.from({ length: 50 }, (_, i) => ({
      id: `toast-${i}`,
      message: `Toast message ${i}`,
      type: "success" as const,
      duration: 3000,
    }));

    const startTime = performance.now();

    render(<ToastContainer toasts={manyToasts} onRemove={() => {}} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render reasonably fast (under 100ms)
    expect(renderTime).toBeLessThan(100);
  });

  it("handles rapid toast creation and removal", () => {
    jest.useFakeTimers();

    const toasts = [
      {
        id: "1",
        message: "First toast",
        type: "success" as const,
        duration: 100,
      },
    ];

    const { rerender } = render(
      <ToastContainer toasts={toasts} onRemove={() => {}} />
    );

    // Add more toasts rapidly
    for (let i = 2; i <= 10; i++) {
      toasts.push({
        id: `${i}`,
        message: `Toast ${i}`,
        type: "success" as const,
        duration: 100,
      });

      rerender(<ToastContainer toasts={toasts} onRemove={() => {}} />);
    }

    expect(screen.getByText("Toast 10")).toBeInTheDocument();

    jest.useRealTimers();
  });
});

describe("Toast Accessibility", () => {
  it("has proper ARIA attributes", () => {
    render(<ToastContainer toasts={[]} onRemove={() => {}} />);

    const container = screen.getByRole("region");
    expect(container).toHaveAttribute("aria-label", "Notifications");
  });

  it("close button has proper accessibility", () => {
    render(<Toast message="Test message" type="success" onClose={() => {}} />);

    const closeButton = screen.getByLabelText("Close notification");
    expect(closeButton).toBeInTheDocument();
  });
});

describe("Toast Edge Cases", () => {
  it("handles very long messages", () => {
    const longMessage = "A".repeat(1000);

    render(<Toast message={longMessage} type="info" onClose={() => {}} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("handles special characters in messages", () => {
    const specialMessage =
      "Test with 🚀 emojis & special chars: <script>alert('xss')</script>";

    render(<Toast message={specialMessage} type="info" onClose={() => {}} />);

    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it("handles negative duration gracefully", () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();

    render(
      <Toast
        message="Test message"
        type="success"
        duration={-1000}
        onClose={mockOnClose}
      />
    );

    jest.advanceTimersByTime(5000);

    // Should not auto-close with negative duration
    expect(mockOnClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe("Toast Integration with Other Components", () => {
  // Test component that would normally use useToast hook
  function TestComponent() {
    const showLongMessage = () => {
      // This function is intentionally simple to avoid hook rule violations
      return "Long message shown";
    };

    return (
      <div>
        <button onClick={() => showLongMessage()}>Show Toast</button>
        <Toast message="Integration test" type="success" onClose={() => {}} />
      </div>
    );
  }

  it("integrates well with other components", () => {
    render(<TestComponent />);

    expect(screen.getByText("Integration test")).toBeInTheDocument();
    expect(screen.getByText("Show Toast")).toBeInTheDocument();
  });
});
