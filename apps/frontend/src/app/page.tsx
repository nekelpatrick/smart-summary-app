"use client";

import { useMemo } from "react";
import {
  Instructions,
  TextDisplay,
  ResultDisplay,
  MobileTextInput,
  ErrorBoundary,
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
    setText,
    summarize,
    copyToClipboard,
    reset,
    loadExample,
  } = useTextSummary();

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

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 md:mb-12 text-center">
            <h1 className="mb-4 md:mb-6 text-4xl md:text-5xl font-bold text-gray-800">
              Paste to Summary
            </h1>
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

          {(text || loading) && (
            <ResultDisplay
              summary={summary}
              loading={loading}
              error={error}
              copied={copied}
              isCached={isCached}
              onCopy={copyToClipboard}
            />
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
      </main>
    </ErrorBoundary>
  );
}

export default Home;
