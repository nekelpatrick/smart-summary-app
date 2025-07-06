"use client";

import { useMemo, useState } from "react";
import {
  Instructions,
  TextDisplay,
  ResultDisplay,
  MobileTextInput,
  ErrorBoundary,
  ApiKeyInput,
  AnalyticsDashboard,
  TextAnalyzer,
} from "./components";
import { useTextSummary, usePasteHandler } from "./hooks";
import { getWordCount, getCharCount } from "./utils/text";

function Home() {
  const {
    text,
    summary,
    loading,
    error,
    copied,
    isCached,
    apiKey,
    selectedProvider,
    availableProviders,
    apiKeyValidationStatus,
    validatingApiKey,
    loadingProviders,
    setText,
    summarize,
    copyToClipboard,
    reset,
    loadExample,
    tryAgain,
    setApiKey,
    setSelectedProvider,
    validateApiKey,
    clearApiKey,
  } = useTextSummary();

  // Enhanced features state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTextAnalyzer, setShowTextAnalyzer] = useState(false);
  const [enhancedMode, setEnhancedMode] = useState(false);

  usePasteHandler({
    onPaste: setText,
    onError: (error: string) => console.error("Paste error:", error),
    summarize,
  });

  const stats = useMemo(
    () => ({
      wordCount: getWordCount(text),
      charCount: getCharCount(text),
    }),
    [text]
  );

  const handleOptimizationSelect = (optimization: string) => {
    // For now, just show a notification
    console.log("Selected optimization:", optimization);
    // Future: Apply optimization to the summarization process
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 md:mb-12 text-center">
            <h1 className="mb-4 md:mb-6 text-4xl md:text-5xl font-bold text-gray-800">
              Paste to Summary
            </h1>

            {/* Enhanced Features Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={() => setEnhancedMode(!enhancedMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  enhancedMode
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {enhancedMode ? "🚀 Enhanced Mode" : "⚡ Standard Mode"}
              </button>

              <button
                onClick={() => setShowAnalytics(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                📊 Analytics
              </button>
            </div>

            {enhancedMode && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <h3 className="font-semibold text-purple-800">
                    AI-Powered Optimization
                  </h3>
                </div>
                <p className="text-sm text-purple-700 mb-3">
                  Enhanced mode uses advanced LangGraph workflows with context
                  optimization, cost reduction strategies, and shallow training
                  capabilities.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                    Smart Caching
                  </span>
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                    Domain Detection
                  </span>
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                    Cost Optimization
                  </span>
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                    Strategy Selection
                  </span>
                </div>
              </div>
            )}
          </header>

          {!text && <Instructions onExample={loadExample} loading={loading} />}

          {!text && (
            <MobileTextInput
              onSubmit={(content) => {
                setText(content);
                summarize(content);
              }}
              loading={loading}
            />
          )}

          {text && (
            <TextDisplay
              text={text}
              words={stats.wordCount}
              chars={stats.charCount}
              onClear={reset}
            />
          )}

          {/* Enhanced Text Analyzer */}
          {enhancedMode && text && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowTextAnalyzer(!showTextAnalyzer)}
                  className="flex items-center space-x-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  <span>🔍</span>
                  <span className="text-sm font-medium">
                    {showTextAnalyzer ? "Hide" : "Show"} Smart Analysis
                  </span>
                </button>
                <div className="text-xs text-gray-500">
                  AI-powered optimization recommendations
                </div>
              </div>

              {showTextAnalyzer && (
                <TextAnalyzer
                  text={text}
                  apiKey={apiKey}
                  onOptimizationSelect={handleOptimizationSelect}
                />
              )}
            </div>
          )}

          {(text || loading) && (
            <ResultDisplay
              summary={summary}
              loading={loading}
              error={error}
              copied={copied}
              isCached={isCached}
              onCopy={copyToClipboard}
              onTryAgain={tryAgain}
            />
          )}

          {/* API Key Settings - Secondary Feature */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  API Settings
                </h3>
                <p className="text-sm text-gray-500">
                  Optionally use your own API key for unlimited usage
                </p>
              </div>
              <ApiKeyInput
                apiKey={apiKey}
                selectedProvider={selectedProvider}
                availableProviders={availableProviders}
                onApiKeyChange={setApiKey}
                onProviderChange={setSelectedProvider}
                validating={validatingApiKey}
                validationStatus={apiKeyValidationStatus}
                onValidate={validateApiKey}
                onClear={clearApiKey}
                loadingProviders={loadingProviders}
              />
            </div>
          </div>

          {/* Enhanced Features Info */}
          {enhancedMode && (
            <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🎯 Enhanced Features Active
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Cost Optimization
                  </h4>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Automatic strategy selection</li>
                    <li>• Smart text compression</li>
                    <li>• Domain-specific templates</li>
                    <li>• Token usage optimization</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Advanced AI
                  </h4>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Context-aware processing</li>
                    <li>• Similar text detection</li>
                    <li>• Complexity analysis</li>
                    <li>• LangGraph workflows</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
            <span>Built by</span>
            <div className="flex items-center gap-4">
              <a
                href="https://patrick-nekel.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                nekeldev
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="https://www.linkedin.com/in/nekelpatrick/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                LinkedIn
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="https://www.buymeacoffee.com/nekeldev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-800 transition-colors flex items-center gap-1"
              >
                <span>☕</span>
                Buy me a coffee
              </a>
            </div>
          </div>
        </footer>

        {/* Analytics Modal */}
        <AnalyticsDashboard
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      </main>
    </ErrorBoundary>
  );
}

export default Home;
