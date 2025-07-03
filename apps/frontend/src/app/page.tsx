"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function Spinner({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const cache = useRef<Map<string, string>>(new Map());

  const summarize = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const normalizedContent = content.trim().replace(/\s+/g, " ");

    const cachedSummary = cache.current.get(normalizedContent);
    if (cachedSummary) {
      setIsCached(true);
      setSummary(cachedSummary);
      setError("");
      setTimeout(() => setIsCached(false), 2000);
      return;
    }

    setIsCached(false);
    setError("");
    setSummary("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, max_length: 300 }),
      });

      if (!response.ok) {
        throw new Error(`Unable to summarize (${response.status})`);
      }

      const data = await response.json();

      if (cache.current.size >= 50) {
        const firstKey = cache.current.keys().next().value;
        if (firstKey) cache.current.delete(firstKey);
      }

      cache.current.set(normalizedContent, data.summary);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const content = event.clipboardData?.getData("text");
      if (!content?.trim()) return;

      setText(content);
      setError("");

      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => summarize(content), 500);
    },
    [summarize]
  );

  const copyToClipboard = useCallback(() => {
    if (!summary) return;

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError("Unable to copy"));
  }, [summary]);

  const reset = useCallback(() => {
    setText("");
    setSummary("");
    setError("");
    setLoading(false);
    setCopied(false);
    setIsCached(false);
    cache.current.clear();
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const loadExample = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch(`${API_URL}/example`);
      if (!response.ok) {
        throw new Error(`Failed to load example (${response.status})`);
      }

      const data = await response.json();
      setText(data.text);
      await summarize(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Example failed to load");
      setLoading(false);
    }
  }, [summarize]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [handlePaste]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
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
            words={wordCount}
            chars={charCount}
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
  );
}

function Instructions({
  onExample,
  loading,
}: {
  onExample: () => void;
  loading: boolean;
}) {
  const steps = [
    "Find text you want to summarize",
    "Copy it (Ctrl+C or ⌘+C)",
    "Paste anywhere on this page (Ctrl+V or ⌘+V)",
    "Get your summary instantly!",
  ];

  return (
    <div className="mb-6 md:mb-8 rounded-lg bg-white p-6 md:p-8 shadow-lg transition-all duration-300 hover:shadow-xl">
      <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-semibold text-gray-700">
        How it works
      </h2>
      <ol className="space-y-3 text-base md:text-lg text-gray-600">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start">
            <span className="mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex justify-center">
        <button
          onClick={onExample}
          disabled={loading}
          className="flex items-center justify-center rounded-lg bg-green-500 px-6 py-3 text-white font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
        >
          {loading ? (
            <>
              <Spinner size={20} className="mr-2 text-white" />
              Loading...
            </>
          ) : (
            "Try Example"
          )}
        </button>
      </div>
      <hr className="my-4 md:my-6 border-gray-200" />
      <p className="text-sm text-gray-500 text-center">
        Powered by AI, running securely on our servers
      </p>
    </div>
  );
}

function TextDisplay({
  text,
  words,
  chars,
  onClear,
}: {
  text: string;
  words: number;
  chars: number;
  onClear: () => void;
}) {
  return (
    <div className="mb-6 rounded-lg bg-white p-4 md:p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg md:text-xl font-semibold text-gray-700">
          Your Text
        </h2>
        <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
          <span className="text-sm text-gray-500">
            {chars} characters • {words} words
          </span>
          <button
            onClick={onClear}
            className="text-sm font-medium text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1 transition-all duration-200"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-3 md:p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {text}
        </p>
      </div>
    </div>
  );
}

function ResultDisplay({
  summary,
  loading,
  error,
  copied,
  isCached,
  onCopy,
}: {
  summary: string;
  loading: boolean;
  error: string;
  copied: boolean;
  isCached: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg bg-white p-4 md:p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-700">
            Summary
          </h2>
          {isCached && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full animate-pulse">
              Cached
            </span>
          )}
        </div>
        {summary && (
          <button
            onClick={onCopy}
            className="rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400"
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
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 transition-all duration-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 transition-all duration-300">
          <Spinner size={32} className="text-blue-500" />
        </div>
      )}

      {summary && (
        <div className="rounded-md border bg-gray-50 p-3 md:p-4 transition-all duration-300 hover:bg-gray-100">
          <p className="leading-relaxed text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  );
}
