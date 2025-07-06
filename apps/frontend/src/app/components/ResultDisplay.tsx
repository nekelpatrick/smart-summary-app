import { useState, useEffect } from "react";
import { ResultDisplayProps } from "../types";
import { Spinner } from "./Spinner";

export function ResultDisplay({
  summary,
  loading,
  error,
  copied,
  isCached,
  onCopy,
  onTryAgain,
}: ResultDisplayProps) {
  const [progress, setProgress] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  // Animate progress during loading
  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const increment = Math.random() * 15 + 5; // 5-20% increments
          const newProgress = Math.min(prev + increment, 85); // Max 85% during loading
          return newProgress;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [loading]);

  // Animate word count for streaming effect
  useEffect(() => {
    if (summary) {
      const words = summary.split(" ").length;
      setWordCount(words);
      setIsAnimatingIn(true);

      const timer = setTimeout(() => setIsAnimatingIn(false), 300);
      return () => clearTimeout(timer);
    }
  }, [summary]);

  return (
    <div
      className={`rounded-lg bg-white shadow-lg transition-all duration-300 transform ${
        loading || summary || error
          ? "scale-100 opacity-100"
          : "scale-95 opacity-0"
      }`}
    >
      {/* Header with progress bar */}
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-gray-700 flex items-center gap-2">
              📝 Summary
              {loading && (
                <span className="text-xs text-gray-500 animate-pulse">
                  Generating...
                </span>
              )}
            </h2>
            {isCached && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full animate-pulse">
                ⚡ Cached
              </span>
            )}
            {wordCount > 0 && !loading && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {wordCount} words
              </span>
            )}
          </div>

          {summary && !loading && (
            <div className="flex gap-2">
              <button
                onClick={onTryAgain}
                disabled={loading}
                className="group relative rounded-lg bg-gray-100 px-4 py-2 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                aria-label="Generate a new summary"
              >
                <span className="flex items-center gap-2">🔄 Try Again</span>
              </button>
              <button
                onClick={onCopy}
                className={`group relative rounded-lg px-4 py-2 min-h-[44px] text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  copied
                    ? "bg-green-100 text-green-800 border-green-200 focus:ring-green-500"
                    : "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 shadow-lg shadow-blue-500/25"
                }`}
                aria-label={
                  copied ? "Copied to clipboard" : "Copy summary to clipboard"
                }
              >
                {copied ? (
                  <span className="flex items-center gap-2 animate-in fade-in duration-200">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">📋 Copy</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress bar for loading */}
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-3">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div>
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Spinner size={40} className="text-blue-500" />
            <div className="text-center space-y-2">
              <p className="text-gray-600 font-medium">
                Creating your summary...
              </p>
              <p className="text-sm text-gray-500">
                Using AI to extract key insights
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0s" }}
                >
                  ●
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                >
                  ●
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  ●
                </span>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div
            className={`rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 md:p-6 transition-all duration-300 ${
              isAnimatingIn
                ? "animate-in slide-in-from-bottom duration-500"
                : ""
            }`}
          >
            <div className="prose prose-sm max-w-none">
              <p className="leading-relaxed text-gray-700 mb-0">{summary}</p>
            </div>

            {/* Summary stats */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>Generated {isCached ? "from cache" : "by AI"}</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Empty state when no content */}
        {!loading && !summary && !error && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>Your summary will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
