"use client";

import { useState, useEffect } from "react";
import { enhancedApiService, Analytics } from "../services/enhancedApiService";

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsDashboard({
  isOpen,
  onClose,
}: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await enhancedApiService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await enhancedApiService.clearCache();
      await fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const getStrategyColor = (strategy: string) => {
    const colors = {
      cache_hit: "bg-green-100 text-green-800",
      compress: "bg-blue-100 text-blue-800",
      chunk: "bg-yellow-100 text-yellow-800",
      template: "bg-purple-100 text-purple-800",
      shallow_train: "bg-indigo-100 text-indigo-800",
    };
    return (
      colors[strategy as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  const getStrategyDescription = (strategy: string) => {
    const descriptions = {
      cache_hit: "Reused cached results for identical content",
      compress: "Compressed long text to reduce token usage",
      chunk: "Split large text into manageable chunks",
      template: "Used domain-specific templates for optimization",
      shallow_train: "Applied few-shot learning from similar examples",
    };
    return (
      descriptions[strategy as keyof typeof descriptions] ||
      "Unknown optimization strategy"
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            AI Optimization Analytics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">
                    Total Summaries
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {analytics.total_summaries}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">
                    Estimated Savings
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(analytics.estimated_cost_savings)}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">
                    Cache Size
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {analytics.cache_size}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-600">
                    Domains Detected
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {analytics.domains_detected.length}
                  </div>
                </div>
              </div>

              {/* Strategies Used */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Optimization Strategies
                  </h3>
                  <span className="text-sm text-gray-500">
                    Distribution of optimization methods
                  </span>
                </div>

                {Object.keys(analytics.strategies_used).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.strategies_used).map(
                      ([strategy, count]) => {
                        const percentage =
                          (count / analytics.total_summaries) * 100;
                        return (
                          <div key={strategy} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${getStrategyColor(
                                    strategy
                                  )}`}
                                >
                                  {strategy.replace("_", " ").toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {getStrategyDescription(strategy)}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {count} ({percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No optimization data available yet. Start summarizing to see
                    analytics!
                  </div>
                )}
              </div>

              {/* Detected Domains */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Detected Domains
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.domains_detected.map((domain) => (
                    <span
                      key={domain}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                    >
                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cache Management */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Cache Management
                  </h3>
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache || analytics.cache_size === 0}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {clearingCache ? "Clearing..." : "Clear Cache"}
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>
                    The cache stores optimization data to improve future
                    performance and reduce costs.
                  </p>
                  <p className="mt-2">
                    <strong>Current cache size:</strong> {analytics.cache_size}{" "}
                    entries
                  </p>
                  {analytics.cache_size > 0 && (
                    <p className="mt-1">
                      <strong>Estimated savings from cache:</strong>{" "}
                      {formatCurrency(analytics.cache_size * 0.001)}
                    </p>
                  )}
                </div>
              </div>

              {/* Cost Optimization Tips */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  💡 Cost Optimization Tips
                </h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>• Use consistent formatting to maximize cache hits</p>
                  <p>• Break down very long texts into smaller sections</p>
                  <p>
                    • Set appropriate cost budgets for automatic optimization
                  </p>
                  <p>• Review domain-specific optimization suggestions</p>
                  <p>• Consider using your own API key for unlimited usage</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No analytics data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
