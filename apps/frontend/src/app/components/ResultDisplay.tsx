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
  return (
    <div className="rounded-lg bg-white p-4 md:p-6 shadow-lg">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-700">
            Summary
          </h2>
          {isCached && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              Cached
            </span>
          )}
        </div>
        {summary && (
          <div className="flex gap-2">
            <button
              onClick={onTryAgain}
              disabled={loading}
              className="rounded bg-gray-500 px-4 py-2 min-h-[44px] text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:bg-gray-700 disabled:bg-gray-400 transition-colors duration-200"
            >
              Try Again
            </button>
            <button
              onClick={onCopy}
              className="rounded bg-blue-500 px-4 py-2 min-h-[44px] text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200"
            >
              {copied ? (
                <span className="flex items-center gap-1">
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
                "Copy"
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size={32} className="text-blue-500" />
        </div>
      )}

      {summary && (
        <div className="rounded-md border bg-gray-50 p-3 md:p-4">
          <p className="leading-relaxed text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  );
}
