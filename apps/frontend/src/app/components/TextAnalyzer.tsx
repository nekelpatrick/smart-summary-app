"use client";

import { useState } from "react";
import {
  enhancedApiService,
  TextAnalysis,
} from "../services/enhancedApiService";

interface TextAnalyzerProps {
  text: string;
  apiKey?: string;
  onOptimizationSelect?: (optimization: string) => void;
}

export default function TextAnalyzer({
  text,
  apiKey,
  onOptimizationSelect,
}: TextAnalyzerProps) {
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  const analyzeText = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError("");
    try {
      const result = await enhancedApiService.analyzeText(text, apiKey);
      setAnalysis(result);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const getComplexityColor = (score: number) => {
    if (score < 0.3) return "text-green-600 bg-green-50";
    if (score < 0.7) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getComplexityLabel = (score: number) => {
    if (score < 0.3) return "Simple";
    if (score < 0.7) return "Moderate";
    return "Complex";
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getDomainIcon = (domain: string) => {
    const icons = {
      technical: "⚙️",
      business: "💼",
      academic: "🎓",
      news: "📰",
      legal: "⚖️",
      general: "📄",
    };
    return icons[domain as keyof typeof icons] || "📄";
  };

  const handleOptimizationSelect = (strategy: string) => {
    onOptimizationSelect?.(strategy);
  };

  if (!text.trim()) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
        Enter text to see optimization analysis
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔍</span>
            <h3 className="font-semibold text-gray-800">Smart Analysis</h3>
          </div>
          <button
            onClick={analyzeText}
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {loading ? "Analyzing..." : "Analyze Text"}
          </button>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {loading && (
        <div className="p-6 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">
              Analyzing text complexity and optimization opportunities...
            </span>
          </div>
        </div>
      )}

      {analysis && (
        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Length</div>
              <div className="font-semibold text-gray-900">
                {analysis.analysis.text_length}
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">Tokens</div>
              <div className="font-semibold text-blue-900">
                {analysis.analysis.estimated_tokens}
              </div>
            </div>
            <div
              className={`text-center p-3 rounded ${getComplexityColor(
                analysis.analysis.complexity_score
              )}`}
            >
              <div className="text-sm">Complexity</div>
              <div className="font-semibold">
                {getComplexityLabel(analysis.analysis.complexity_score)}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-sm text-purple-600">Domain</div>
              <div className="font-semibold text-purple-900 flex items-center justify-center space-x-1">
                <span>{getDomainIcon(analysis.analysis.detected_domain)}</span>
                <span className="capitalize">
                  {analysis.analysis.detected_domain}
                </span>
              </div>
            </div>
          </div>

          {/* Optimization Recommendation */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 mb-2">
                  Recommended Optimization
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      {analysis.optimization.recommended_strategy
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                    <span className="text-sm text-green-700">
                      Estimated cost:{" "}
                      {formatCurrency(analysis.optimization.estimated_cost)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-700">
                      Expected tokens: {analysis.optimization.expected_tokens}
                    </span>
                    <span
                      className={`font-medium ${getConfidenceColor(
                        analysis.optimization.confidence_score
                      )}`}
                    >
                      Confidence:{" "}
                      {(analysis.optimization.confidence_score * 100).toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  handleOptimizationSelect(
                    analysis.optimization.recommended_strategy
                  )
                }
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Similar Texts Found */}
          {analysis.similar_texts_found > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span>💡</span>
                <h4 className="font-semibold text-blue-800">
                  Cache Optimization Available
                </h4>
              </div>
              <div className="text-sm text-blue-700">
                Found {analysis.similar_texts_found} similar text
                {analysis.similar_texts_found > 1 ? "s" : ""} in cache. This
                could significantly reduce processing costs!
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">
              Smart Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className={`p-3 rounded-lg border ${
                  analysis.recommendations.use_cache
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>
                    {analysis.recommendations.use_cache ? "✅" : "❌"}
                  </span>
                  <span className="text-sm font-medium">Cache Usage</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {analysis.recommendations.use_cache
                    ? "Reuse available cache"
                    : "No cache available"}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  analysis.recommendations.cost_effective
                    ? "border-green-300 bg-green-50"
                    : "border-yellow-300 bg-yellow-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>
                    {analysis.recommendations.cost_effective ? "✅" : "⚠️"}
                  </span>
                  <span className="text-sm font-medium">Cost Effective</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {analysis.recommendations.cost_effective
                    ? "Within budget"
                    : "Consider optimization"}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  analysis.recommendations.complexity_appropriate
                    ? "border-green-300 bg-green-50"
                    : "border-yellow-300 bg-yellow-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>
                    {analysis.recommendations.complexity_appropriate
                      ? "✅"
                      : "⚠️"}
                  </span>
                  <span className="text-sm font-medium">Complexity</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {analysis.recommendations.complexity_appropriate
                    ? "Appropriate level"
                    : "Consider simplification"}
                </div>
              </div>
            </div>
          </div>

          {/* Optimization Suggestions */}
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              {enhancedApiService.getOptimizationSuggestions(analysis).length >
              0 ? (
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">
                    💡 Optimization Tips:
                  </h5>
                  <ul className="space-y-1">
                    {enhancedApiService
                      .getOptimizationSuggestions(analysis)
                      .map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="text-green-600">
                  ✨ Your text is already well-optimized for processing!
                </div>
              )}
            </div>
          </div>

          {/* Domain-Specific Optimization */}
          {analysis.analysis.detected_domain !== "general" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h5 className="font-medium text-purple-800 mb-2">
                {getDomainIcon(analysis.analysis.detected_domain)}{" "}
                Domain-Specific Optimization
              </h5>
              {(() => {
                const domainOpt = enhancedApiService.getDomainOptimization(
                  analysis.analysis.detected_domain
                );
                return (
                  <div className="text-sm text-purple-700">
                    <div className="font-medium">{domainOpt.description}</div>
                    <div className="mt-1">
                      Expected savings:{" "}
                      {(domainOpt.expectedSavings * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
