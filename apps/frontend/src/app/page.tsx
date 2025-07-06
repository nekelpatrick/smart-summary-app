"use client";

import { useMemo, useState } from "react";
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

  const handleSummarize = async (content: string) => {
    try {
      await summarize(content);
      if (summary) {
        showSuccess("Summary generated successfully!");
      }
    } catch {
      showError("Failed to generate summary. Please try again.");
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
      await tryAgain();
      showInfo("Generating a new summary...");
    } catch {
      showError("Failed to generate new summary");
    }
  };

  const handleLoadExample = async () => {
    try {
      await loadExample();
      showInfo("Example loaded! Processing...");
    } catch {
      showError("Failed to load example");
    }
  };

  const wordCount = useMemo(() => getWordCount(text), [text]);
  const charCount = useMemo(() => getCharCount(text), [text]);

  usePasteHandler({
    onPaste: (content: string) => {
      setText(content);
      showInfo("Text pasted! Processing...");
    },
    onError: (error: string) => {
      showError(`Paste failed: ${error}`);
    },
    summarize: handleSummarize,
  });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
        <div className="container mx-auto">
          <div className="relative">
            <div className="pt-8 pb-6 px-4 text-center relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
                <div className="absolute -top-8 -right-8 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  Paste to Summary
                </h1>
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  Transform lengthy text into concise, meaningful summaries with
                  AI-powered intelligence
                </p>

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

            <div className="px-4 pb-12">
              <div className="max-w-4xl mx-auto space-y-6">
                <ErrorBoundary>
                  <Instructions
                    onExample={handleLoadExample}
                    loading={loading}
                  />

                  {text && (
                    <TextDisplay
                      text={text}
                      words={wordCount}
                      chars={charCount}
                      onClear={reset}
                    />
                  )}

                  <div className="flex justify-center">
                    <MobileTextInput
                      onSubmit={handleSummarize}
                      loading={loading}
                    />
                  </div>

                  <ResultDisplay
                    summary={summary}
                    loading={loading}
                    error={error}
                    copied={copied}
                    isCached={isCached}
                    onCopy={handleCopy}
                    onTryAgain={handleTryAgain}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default function Page(): React.ReactElement {
  return <Home />;
}
