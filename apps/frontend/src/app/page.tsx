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
  const [showApiSettings, setShowApiSettings] = useState(false);

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
    console.log("Selected optimization:", optimization);
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="relative z-10 min-h-screen">
          {/* Header with Hero Section */}
          <header className="text-center px-4 pt-8 pb-6 md:pt-12 md:pb-8">
            <div className="mx-auto max-w-4xl">
              {/* Main Title */}
              <div className="mb-8">
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                  Paste to Summary
                </h1>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Turn long, boring text into quick summaries. Just paste and
                  wait a few seconds.
                </p>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => setEnhancedMode(!enhancedMode)}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                    enhancedMode
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 border border-gray-200"
                  }`}
                >
                  {enhancedMode ? "🚀 Enhanced" : "⚡ Standard"}
                </button>

                <button
                  onClick={() => setShowAnalytics(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg shadow-green-500/25"
                >
                  📊 Analytics
                </button>

                <button
                  onClick={() => setShowApiSettings(!showApiSettings)}
                  className="px-4 py-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full hover:bg-white/90 border border-gray-200 transition-all duration-200 font-medium"
                >
                  ⚙️ API Settings
                </button>
              </div>

              {/* Enhanced Mode Info */}
              {enhancedMode && (
                <div className="max-w-2xl mx-auto mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 shadow-lg">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <span className="text-2xl">🧠</span>
                    <h3 className="font-semibold text-purple-800">
                      Smart Mode
                    </h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Uses smarter processing for better results (experimental).
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Smart Caching",
                      "Domain Detection",
                      "Cost Optimization",
                      "Strategy Selection",
                    ].map((feature) => (
                      <span
                        key={feature}
                        className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* API Settings Panel */}
              {showApiSettings && (
                <div className="max-w-md mx-auto mb-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">
                      API Settings
                    </h3>
                    <button
                      onClick={() => setShowApiSettings(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Want to use your own OpenAI key? No rate limits.
                  </p>
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
              )}
            </div>
          </header>

          {/* Main Content */}
          <div className="px-4 pb-8">
            <div className="mx-auto max-w-4xl">
              {/* Instructions Section */}
              {!text && (
                <Instructions onExample={loadExample} loading={loading} />
              )}

              {/* Mobile Text Input */}
              {!text && (
                <MobileTextInput
                  onSubmit={(content) => {
                    setText(content);
                    summarize(content);
                  }}
                  loading={loading}
                />
              )}

              {/* Text Display */}
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
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setShowTextAnalyzer(!showTextAnalyzer)}
                      className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm text-indigo-700 rounded-full hover:bg-white/90 border border-indigo-200 transition-all duration-200"
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

              {/* Results Display */}
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

              {/* Enhanced Features Info */}
              {enhancedMode && (
                <div className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>
                    Smart Mode Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">💰</span>
                        Cost Stuff
                      </h4>
                      <ul className="text-gray-600 space-y-2">
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          Picks the best strategy
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          Compresses text smartly
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          Uses templates for common stuff
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          Saves on API calls
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">🤖</span>
                        Smart Processing
                      </h4>
                      <ul className="text-gray-600 space-y-2">
                        <li className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          Looks at context
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          Finds similar text
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          Checks how complex it is
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          Uses workflow graphs
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 py-8 border-t border-gray-200/50 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
                <span>Built with ❤️ by</span>
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
                    className="text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1"
                  >
                    <span>☕</span>
                    Buy me a coffee
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>

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
