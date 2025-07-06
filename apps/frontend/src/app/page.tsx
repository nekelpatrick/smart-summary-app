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

function Home(): React.ReactElement {
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

  const handleOptimizationSelect = (optimization: string): void => {
    console.log("Selected optimization:", optimization);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="relative">
          <header className="pt-12 pb-16">
            <div className="text-center">
              <div className="mb-8">
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                  Paste to Summary
                </h1>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Turn long, boring text into quick summaries. Just paste and
                  wait a few seconds.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center items-center mb-8">
                <button
                  onClick={loadExample}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 min-h-[48px]"
                >
                  <span className="mr-2 text-lg">⚡</span>
                  <span>Quick Demo</span>
                </button>

                <button
                  onClick={() => setShowApiSettings(!showApiSettings)}
                  className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 font-medium rounded-2xl border border-gray-200/50 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 min-h-[48px]"
                >
                  <span className="mr-2 text-lg">🔧</span>
                  <span>API Settings</span>
                </button>

                <button
                  onClick={() => setEnhancedMode(!enhancedMode)}
                  className={`inline-flex items-center px-6 py-3 font-medium rounded-2xl border transition-all duration-200 min-h-[48px] ${
                    enhancedMode
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                      : "bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200/50 hover:bg-white hover:shadow-md"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                >
                  <span className="mr-2 text-lg">🧠</span>
                  <span>Smart Mode</span>
                </button>
              </div>

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

          <div className="px-4 pb-8">
            <div className="mx-auto max-w-4xl">
              {!text && (
                <Instructions onExample={loadExample} loading={loading} />
              )}

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

              {enhancedMode && text && (
                <div className="mb-6">
                  <TextAnalyzer
                    text={text}
                    apiKey={apiKey}
                    onOptimizationSelect={handleOptimizationSelect}
                  />
                </div>
              )}

              {(loading || summary || error) && (
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

              {enhancedMode && (
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-green-500/25"
                  >
                    <span className="mr-2">📊</span>
                    Analytics
                  </button>
                  <button
                    onClick={() => setShowTextAnalyzer(!showTextAnalyzer)}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-amber-500/25"
                  >
                    <span className="mr-2">🔍</span>
                    Text Analyzer
                  </button>
                </div>
              )}

              {showAnalytics && enhancedMode && (
                <div className="mt-6">
                  <AnalyticsDashboard
                    isOpen={showAnalytics}
                    onClose={() => setShowAnalytics(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <footer className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-200/50 py-8 mt-16">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-600">
                <span>Built by</span>
                <a
                  href="https://patrick-nekel.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  nekeldev
                </a>
                <span>•</span>
                <a
                  href="https://www.linkedin.com/in/nekelpatrick/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  LinkedIn
                </a>
                <span>•</span>
                <a
                  href="https://www.buymeacoffee.com/nekeldev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-600 hover:text-amber-800 transition-colors"
                >
                  ☕ Buy me a coffee
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Home;
