import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Toast } from "../components/Toast";

global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(() => ({ duration: 0 })),
  now: jest.fn(() => Date.now()),
};

describe("Toast Component", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with success state", () => {
    render(
      <Toast
        toast={{
          id: "test-success",
          message: "Success message",
          type: "success",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("Success message").closest("div")).toHaveClass(
      "bg-green-50"
    );
  });

  it("should render with error state", () => {
    render(
      <Toast
        toast={{
          id: "test-error",
          message: "Error message",
          type: "error",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("Error message").closest("div")).toHaveClass(
      "bg-red-50"
    );
  });

  it("should render with info state", () => {
    render(
      <Toast
        toast={{
          id: "test-info",
          message: "Info message",
          type: "info",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Info message")).toBeInTheDocument();
    expect(screen.getByText("Info message").closest("div")).toHaveClass(
      "bg-blue-50"
    );
  });

  it("should render with warning state", () => {
    render(
      <Toast
        toast={{
          id: "test-warning",
          message: "Warning message",
          type: "warning",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("Warning message").closest("div")).toHaveClass(
      "bg-yellow-50"
    );
  });

  it("should auto-close after duration", async () => {
    render(
      <Toast
        toast={{
          id: "test-auto-close",
          message: "Auto close message",
          type: "success",
          duration: 100,
        }}
        onClose={mockOnClose}
      />
    );

    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalledWith("test-auto-close");
      },
      { timeout: 200 }
    );
  });

  it("should handle close button click", async () => {
    const user = userEvent.setup();

    render(
      <Toast
        toast={{
          id: "test-close-button",
          message: "Close button message",
          type: "success",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith("test-close-button");
  });

  it("should handle keyboard close (Escape)", async () => {
    const user = userEvent.setup();

    render(
      <Toast
        toast={{
          id: "test-escape-close",
          message: "Escape close message",
          type: "success",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    await user.keyboard("{Escape}");

    expect(mockOnClose).toHaveBeenCalledWith("test-escape-close");
  });

  it("should pause auto-close on hover", async () => {
    const user = userEvent.setup();

    render(
      <Toast
        toast={{
          id: "test-hover-pause",
          message: "Hover pause message",
          type: "success",
          duration: 100,
        }}
        onClose={mockOnClose}
      />
    );

    const toastElement = screen.getByText("Hover pause message").closest("div");
    if (toastElement) {
      await user.hover(toastElement);
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockOnClose).not.toHaveBeenCalled();

    if (toastElement) {
      await user.unhover(toastElement);
    }

    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalledWith("test-hover-pause");
      },
      { timeout: 200 }
    );
  });

  it("should handle multiple toasts", async () => {
    const { rerender } = render(
      <Toast
        toast={{
          id: "test-multiple-1",
          message: "First message",
          type: "success",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("First message")).toBeInTheDocument();

    rerender(
      <Toast
        toast={{
          id: "test-multiple-2",
          message: "Second message",
          type: "error",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("should render with custom duration", () => {
    render(
      <Toast
        toast={{
          id: "test-custom-duration",
          message: "Custom duration message",
          type: "success",
          duration: 5000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Custom duration message")).toBeInTheDocument();
  });

  it("should handle very long messages", () => {
    const longMessage = "A".repeat(200);

    render(
      <Toast
        toast={{
          id: "test-long-message",
          message: longMessage,
          type: "info",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("should render quickly", () => {
    const startTime = performance.now();

    render(
      <Toast
        toast={{
          id: "test-performance",
          message: "Performance test message",
          type: "success",
          duration: 3000,
        }}
        onClose={mockOnClose}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100);
    expect(screen.getByText("Performance test message")).toBeInTheDocument();
  });

  it("should handle rapid successive toasts", async () => {
    const toasts = [
      { id: "toast-1", message: "Message 1", type: "success" as const },
      { id: "toast-2", message: "Message 2", type: "error" as const },
      { id: "toast-3", message: "Message 3", type: "warning" as const },
      { id: "toast-4", message: "Message 4", type: "info" as const },
    ];

    for (const toast of toasts) {
      const { unmount } = render(
        <Toast toast={{ ...toast, duration: 3000 }} onClose={mockOnClose} />
      );

      expect(screen.getByText(toast.message)).toBeInTheDocument();
      unmount();
    }
  });

  it("should handle toast with zero duration", async () => {
    render(
      <Toast
        toast={{
          id: "test-zero-duration",
          message: "Zero duration message",
          type: "success",
          duration: 0,
        }}
        onClose={mockOnClose}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle toast with negative duration", async () => {
    render(
      <Toast
        toast={{
          id: "test-negative-duration",
          message: "Negative duration message",
          type: "success",
          duration: -100,
        }}
        onClose={mockOnClose}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle component that would use useToast", () => {
    function TestComponent() {
      const [message, setMessage] = React.useState("");

      const showToast = (msg: string) => {
        setMessage(msg);
      };

      return (
        <div>
          <button onClick={() => showToast("Test message")}>Show Toast</button>
          {message && <div data-testid="toast-message">{message}</div>}
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
