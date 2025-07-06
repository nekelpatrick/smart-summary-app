"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Instructions,
  TextDisplay,
  ResultDisplay,
  MobileTextInput,
  ErrorBoundary,
  ApiKeyInput,
  ToastContainer,
} from "./components";
import { useTextSummary, usePasteHandler, useToast } from "./hooks";
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

  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const [showApiSettings, setShowApiSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const resultDisplayRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    if (resultDisplayRef.current) {
      const offsetTop = resultDisplayRef.current.offsetTop - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (loading && !isProcessing) {
      setIsProcessing(true);
      setTimeout(scrollToResults, 150);
    } else if (!loading && isProcessing) {
      setIsProcessing(false);
    }
  }, [loading, isProcessing]);

  const handleSummarize = async (content: string) => {
    try {
      setIsProcessing(true);
      setTimeout(scrollToResults, 100);
      await summarize(content);
      if (summary) {
        showSuccess("Summary generated successfully!");
      }
    } catch {
      showError("Failed to generate summary. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard();
      showSuccess("Summary copied to clipboard!");
    } catch {
      showError("Failed to copy to clipboard");
    }
  };

  const handleTryAgain = async () => {
    try {
      setIsProcessing(true);
      setTimeout(scrollToResults, 100);
      await tryAgain();
      showInfo("Generating a new summary...");
    } catch {
      showError("Failed to generate new summary");
      setIsProcessing(false);
    }
  };

  const handleLoadExample = async () => {
    try {
      setIsProcessing(true);
      setTimeout(scrollToResults, 100);
      await loadExample();
      showInfo("Example loaded and summarized!");
    } catch {
      showError("Failed to load example");
      setIsProcessing(false);
    }
  };

  const wordCount = useMemo(() => getWordCount(text), [text]);
  const charCount = useMemo(() => getCharCount(text), [text]);

  usePasteHandler({
    onPaste: (content: string) => {
      setText(content);
      showInfo("Text pasted anywhere on the page! Processing...");
    },
    onError: (error: string) => {
      if (error) {
        showError(`Paste failed: ${error}`);
      }
    },
    summarize: handleSummarize,
  });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
        <div className="container mx-auto">
          <div className="relative">
            <div className="pt-6 pb-4 px-4 text-center relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
                <div className="absolute -top-8 -right-8 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Paste to Summary
                </h1>
                <p className="text-base text-gray-600 mb-5 max-w-2xl mx-auto">
                  Transform lengthy text into concise, meaningful summaries with
                  AI-powered intelligence
                </p>

                {(loading || isProcessing) && (
                  <div className="mb-3 animate-in fade-in slide-in-from-top duration-300">
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-700 font-medium text-sm">
                        Processing your text...
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-center items-center gap-4 mb-4">
                  <button
                    onClick={() => setShowApiSettings(!showApiSettings)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      showApiSettings
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/80 text-blue-600 hover:bg-white border border-blue-200"
                    }`}
                  >
                    <span className="text-lg">⚙️</span>
                    <span>API Settings</span>
                  </button>
                </div>

                {showApiSettings && (
                  <div className="max-w-2xl mx-auto mb-6 animate-in slide-in-from-top duration-300">
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
            </div>

            <div className="px-4 pb-8">
              <div className="max-w-4xl mx-auto space-y-4">
                <ErrorBoundary>
                  <Instructions
                    onExample={handleLoadExample}
                    loading={loading || isProcessing}
                  />

                  {text && (
                    <TextDisplay
                      text={text}
                      words={wordCount}
                      chars={charCount}
                      onClear={reset}
                    />
                  )}

                  {!text && (
                    <div className="flex justify-center">
                      <MobileTextInput
                        onSubmit={handleSummarize}
                        loading={loading}
                      />
                    </div>
                  )}

                  <div ref={resultDisplayRef}>
                    <ResultDisplay
                      summary={summary}
                      loading={loading}
                      error={error}
                      copied={copied}
                      isCached={isCached}
                      onCopy={handleCopy}
                      onTryAgain={handleTryAgain}
                    />
                  </div>
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                Made with
                <span className="text-red-500 animate-pulse">❤️</span>
                by
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="https://patrick-nekel.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  nekeldev
                </a>
                <span className="text-gray-400">•</span>
                <a
                  href="https://www.linkedin.com/in/nekelpatrick/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <span className="text-gray-400">•</span>
                <a
                  href="https://www.buymeacoffee.com/nekeldev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-600 hover:text-yellow-700 transition-colors flex items-center gap-1"
                >
                  ☕ Buy me a coffee
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default function Page(): React.ReactElement {
  return <Home />;
}
