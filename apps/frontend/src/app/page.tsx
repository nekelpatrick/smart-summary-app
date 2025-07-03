"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Spinner from "../components/Spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const generateSummary = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    setSummary("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, max_length: 300 }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");
      if (!pastedText?.trim()) return;

      setInputText(pastedText);
      setError(null);

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        generateSummary(pastedText);
      }, 500);
    },
    [generateSummary]
  );

  const copyToClipboard = useCallback(() => {
    if (!summary) return;

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError("Failed to copy to clipboard"));
  }, [summary]);

  const clearAll = useCallback(() => {
    setInputText("");
    setSummary("");
    setError(null);
    setIsLoading(false);
    setCopied(false);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [handlePaste]);

  const stats = {
    words: inputText.trim() ? inputText.trim().split(/\s+/).length : 0,
    characters: inputText.length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 md:p-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-800">
            Paste to Summary
          </h1>
        </header>

        {!inputText && <WelcomeInstructions />}

        {inputText && (
          <InputTextDisplay text={inputText} stats={stats} onClear={clearAll} />
        )}

        {(inputText || isLoading) && (
          <SummaryDisplay
            summary={summary}
            isLoading={isLoading}
            error={error}
            copied={copied}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </main>
  );
}

function WelcomeInstructions() {
  return (
    <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
      <h2 className="mb-6 text-2xl font-semibold text-gray-700">
        How it works
      </h2>
      <ol className="space-y-3 text-lg text-gray-600">
        {[
          "Find the text you want to summarize",
          "Copy it to your clipboard (Ctrl+C or ⌘+C)",
          "Paste it anywhere on this page (Ctrl+V or ⌘+V)",
          "Get your AI-generated summary instantly!",
        ].map((step, index) => (
          <li key={index} className="flex items-start">
            <span className="mr-3 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <hr className="my-6 border-gray-200" />
      <p className="text-sm text-gray-500">
        Powered by LLM&apos;s, running securely on our servers.
      </p>
    </div>
  );
}

function InputTextDisplay({
  text,
  stats,
  onClear,
}: {
  text: string;
  stats: { words: number; characters: number };
  onClear: () => void;
}) {
  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-700">Original Text</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {stats.characters} characters • {stats.words} words
          </span>
          <button
            onClick={onClear}
            className="text-sm font-medium text-red-500 hover:text-red-700"
          >
            Clear All
          </button>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto rounded-md border bg-gray-50 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {text}
        </p>
      </div>
    </div>
  );
}

function SummaryDisplay({
  summary,
  isLoading,
  error,
  copied,
  onCopy,
}: {
  summary: string;
  isLoading: boolean;
  error: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-700">Summary</h2>
        {summary && (
          <button
            onClick={onCopy}
            className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center py-8">
          <Spinner size={32} className="mb-4 text-blue-500" />
          <p className="text-sm text-gray-500">Generating your summary...</p>
        </div>
      )}

      {summary && (
        <div className="rounded-md border bg-gray-50 p-4">
          <p className="leading-relaxed text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  );
}
