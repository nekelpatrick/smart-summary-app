"use client";

import { useMemo } from "react";
import {
  Instructions,
  TextDisplay,
  ResultDisplay,
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
      </main>
    </ErrorBoundary>
  );
}

export default Home;
