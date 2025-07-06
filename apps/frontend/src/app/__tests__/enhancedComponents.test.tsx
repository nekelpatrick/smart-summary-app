import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsDashboard } from "../components";
import { TextAnalyzer } from "../components";
import { enhancedApiService } from "../services/enhancedApiService";

// Mock the enhanced API service
jest.mock("../services/enhancedApiService", () => ({
  enhancedApiService: {
    getAnalytics: jest.fn(),
    clearCache: jest.fn(),
    analyzeText: jest.fn(),
    getOptimizationSuggestions: jest.fn(),
    getDomainOptimization: jest.fn(),
  },
}));

const mockEnhancedApiService = enhancedApiService as jest.Mocked<
  typeof enhancedApiService
>;

describe("AnalyticsDashboard", () => {
  const mockAnalytics = {
    total_summaries: 15,
    strategies_used: {
      template: 8,
      compress: 4,
      cache_hit: 3,
    },
    estimated_cost_savings: 0.025,
    cache_size: 12,
    domains_detected: [
      "general",
      "technical",
      "business",
      "academic",
      "news",
      "legal",
    ],
  };

  beforeEach(() => {
    mockEnhancedApiService.getAnalytics.mockClear();
    mockEnhancedApiService.clearCache.mockClear();
  });

  it("renders closed state correctly", () => {
    render(<AnalyticsDashboard isOpen={false} onClose={() => {}} />);
    expect(
      screen.queryByText("AI Optimization Analytics")
    ).not.toBeInTheDocument();
  });

  it("renders open state and fetches analytics", async () => {
    mockEnhancedApiService.getAnalytics.mockResolvedValue(mockAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("AI Optimization Analytics")).toBeInTheDocument();
    expect(screen.getByText("Loading analytics...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockEnhancedApiService.getAnalytics).toHaveBeenCalled();
    });
  });

  it("displays analytics data correctly", async () => {
    mockEnhancedApiService.getAnalytics.mockResolvedValue(mockAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument(); // Total summaries
      expect(screen.getByText("$0.0250")).toBeInTheDocument(); // Estimated savings
      expect(screen.getByText("12")).toBeInTheDocument(); // Cache size
      expect(screen.getByText("6")).toBeInTheDocument(); // Domains detected
    });

    // Check strategy distribution
    expect(screen.getByText("TEMPLATE")).toBeInTheDocument();
    expect(screen.getByText("COMPRESS")).toBeInTheDocument();
    expect(screen.getByText("CACHE HIT")).toBeInTheDocument();
    expect(screen.getByText("8 (53.3%)")).toBeInTheDocument(); // Template percentage
  });

  it("handles empty analytics data", async () => {
    const emptyAnalytics = {
      total_summaries: 0,
      strategies_used: {},
      estimated_cost_savings: 0,
      cache_size: 0,
      domains_detected: [],
    };

    mockEnhancedApiService.getAnalytics.mockResolvedValue(emptyAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No optimization data available yet. Start summarizing to see analytics!"
        )
      ).toBeInTheDocument();
    });
  });

  it("handles analytics fetch error", async () => {
    mockEnhancedApiService.getAnalytics.mockRejectedValue(
      new Error("Failed to fetch")
    );

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("allows retry on error", async () => {
    mockEnhancedApiService.getAnalytics
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockEnhancedApiService.getAnalytics).toHaveBeenCalledTimes(2);
      expect(screen.getByText("15")).toBeInTheDocument();
    });
  });

  it("handles cache clearing", async () => {
    mockEnhancedApiService.getAnalytics.mockResolvedValue(mockAnalytics);
    mockEnhancedApiService.clearCache.mockResolvedValue({
      message: "Cache cleared successfully",
      items_removed: 12,
    });

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Clear Cache")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Clear Cache");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockEnhancedApiService.clearCache).toHaveBeenCalled();
    });
  });

  it("disables clear cache button when cache is empty", async () => {
    const emptyCacheAnalytics = { ...mockAnalytics, cache_size: 0 };
    mockEnhancedApiService.getAnalytics.mockResolvedValue(emptyCacheAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      const clearButton = screen.getByText("Clear Cache");
      expect(clearButton).toBeDisabled();
    });
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    mockEnhancedApiService.getAnalytics.mockResolvedValue(mockAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByText("×");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("shows optimization tips", async () => {
    mockEnhancedApiService.getAnalytics.mockResolvedValue(mockAnalytics);

    render(<AnalyticsDashboard isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("💡 Cost Optimization Tips")).toBeInTheDocument();
      expect(
        screen.getByText("• Use consistent formatting to maximize cache hits")
      ).toBeInTheDocument();
      expect(
        screen.getByText("• Break down very long texts into smaller sections")
      ).toBeInTheDocument();
    });
  });
});

describe("TextAnalyzer", () => {
  const mockAnalysis = {
    analysis: {
      text_length: 150,
      estimated_tokens: 38,
      complexity_score: 0.4,
      detected_domain: "technical",
      language: "en",
    },
    optimization: {
      recommended_strategy: "template",
      expected_tokens: 35,
      confidence_score: 0.85,
      estimated_cost: 0.0015,
    },
    similar_texts_found: 2,
    recommendations: {
      use_cache: true,
      cost_effective: true,
      complexity_appropriate: true,
    },
  };

  beforeEach(() => {
    mockEnhancedApiService.analyzeText.mockClear();
    mockEnhancedApiService.getOptimizationSuggestions.mockClear();
    mockEnhancedApiService.getDomainOptimization.mockClear();
  });

  it("renders empty state for no text", () => {
    render(<TextAnalyzer text="" />);
    expect(
      screen.getByText("Enter text to see optimization analysis")
    ).toBeInTheDocument();
  });

  it("renders analyzer with text", () => {
    render(<TextAnalyzer text="Sample text for analysis" />);
    expect(screen.getByText("Smart Analysis")).toBeInTheDocument();
    expect(screen.getByText("Analyze Text")).toBeInTheDocument();
  });

  it("analyzes text when button is clicked", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);

    render(<TextAnalyzer text="Sample text for analysis" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockEnhancedApiService.analyzeText).toHaveBeenCalledWith(
        "Sample text for analysis",
        undefined
      );
    });
  });

  it("analyzes text with API key", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);

    render(<TextAnalyzer text="Sample text" apiKey="test-key" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockEnhancedApiService.analyzeText).toHaveBeenCalledWith(
        "Sample text",
        "test-key"
      );
    });
  });

  it("displays analysis results", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);
    mockEnhancedApiService.getOptimizationSuggestions.mockReturnValue([]);
    mockEnhancedApiService.getDomainOptimization.mockReturnValue({
      strategy: "template",
      description: "Using technical documentation templates",
      expectedSavings: 0.15,
    });

    render(<TextAnalyzer text="Sample technical text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      // Check basic stats
      expect(screen.getByText("150")).toBeInTheDocument(); // Length
      expect(screen.getByText("38")).toBeInTheDocument(); // Tokens
      expect(screen.getByText("Moderate")).toBeInTheDocument(); // Complexity
      expect(screen.getByText("Technical")).toBeInTheDocument(); // Domain

      // Check optimization recommendation
      expect(screen.getByText("TEMPLATE")).toBeInTheDocument();
      expect(screen.getByText("$0.0015")).toBeInTheDocument(); // Cost
      expect(screen.getByText("Confidence: 85.0%")).toBeInTheDocument();

      // Check recommendations
      expect(screen.getByText("Cache Usage")).toBeInTheDocument();
      expect(screen.getByText("Cost Effective")).toBeInTheDocument();
      expect(screen.getByText("Complexity")).toBeInTheDocument();
    });
  });

  it("shows cache optimization notice", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);

    render(<TextAnalyzer text="Sample text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(
        screen.getByText("💡 Cache Optimization Available")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Found 2 similar texts in cache.")
      ).toBeInTheDocument();
    });
  });

  it("handles analysis error", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockRejectedValue(
      new Error("Analysis failed")
    );

    render(<TextAnalyzer text="Sample text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    });
  });

  it("shows loading state during analysis", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockImplementation(
      () => new Promise(() => {})
    ); // Never resolves

    render(<TextAnalyzer text="Sample text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Analyzing text complexity and optimization opportunities..."
      )
    ).toBeInTheDocument();
  });

  it("calls onOptimizationSelect when apply button is clicked", async () => {
    const user = userEvent.setup();
    const onOptimizationSelect = jest.fn();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);

    render(
      <TextAnalyzer
        text="Sample text"
        onOptimizationSelect={onOptimizationSelect}
      />
    );

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      const applyButton = screen.getByText("Apply");
      fireEvent.click(applyButton);
      expect(onOptimizationSelect).toHaveBeenCalledWith("template");
    });
  });

  it("shows optimization suggestions", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);
    mockEnhancedApiService.getOptimizationSuggestions.mockReturnValue([
      "Consider using a smaller model",
      "Text is well-optimized",
    ]);

    render(<TextAnalyzer text="Sample text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText("💡 Optimization Tips:")).toBeInTheDocument();
      expect(
        screen.getByText("Consider using a smaller model")
      ).toBeInTheDocument();
      expect(screen.getByText("Text is well-optimized")).toBeInTheDocument();
    });
  });

  it("shows domain-specific optimization for non-general domains", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);
    mockEnhancedApiService.getDomainOptimization.mockReturnValue({
      strategy: "template",
      description: "Using technical documentation templates",
      expectedSavings: 0.15,
    });

    render(<TextAnalyzer text="Sample technical text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(
        screen.getByText("🔧 Domain-Specific Optimization")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Using technical documentation templates")
      ).toBeInTheDocument();
      expect(screen.getByText("Expected savings: 15.0%")).toBeInTheDocument();
    });
  });

  it("shows optimized text message when no suggestions", async () => {
    const user = userEvent.setup();
    mockEnhancedApiService.analyzeText.mockResolvedValue(mockAnalysis);
    mockEnhancedApiService.getOptimizationSuggestions.mockReturnValue([]);

    render(<TextAnalyzer text="Sample text" />);

    const analyzeButton = screen.getByText("Analyze Text");
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "✨ Your text is already well-optimized for processing!"
        )
      ).toBeInTheDocument();
    });
  });
});
