"use client";

import { useState, useEffect, useRef } from "react";
import Spinner from "../components/Spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Auto-focus the page to capture paste events
  useEffect(() => {
    window.focus();
    document.body.focus();
  }, []);

  // Handle paste events anywhere on the page
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");
      if (pastedText && pastedText.trim()) {
        setInputText(pastedText);
        setError(null);

        // Clear existing timeout
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }

        // Debounce the summarization request
        debounceTimeout.current = setTimeout(() => {
          generateSummary(pastedText);
        }, 500);
      }
    };

    // Add paste event listener to the entire document
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const generateSummary = async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    setSummary("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          max_length: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary) return;

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setError("Failed to copy to clipboard");
      });
  };

  const clearAll = () => {
    setInputText("");
    setSummary("");
    setError(null);
    setIsLoading(false);
    setCopied(false);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-gray-800">
            Paste to Summary
          </h1>
        </div>

        {/* Instructions */}
        {!inputText && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-700">
              Instructions
            </h2>
            <ol className="space-y-3 text-lg text-gray-600">
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </span>
                Find the text to summarize (<em>e.g.</em>, in another browser
                tab)
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </span>
                Copy it to the clipboard (
                <kbd className="bg-gray-200 px-1 rounded">Ctrl+C</kbd>, or{" "}
                <kbd className="bg-gray-200 px-1 rounded">⌘+C</kbd> on Mac)
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </span>
                Paste it anywhere on this page (
                <kbd className="bg-gray-200 px-1 rounded">Ctrl+V</kbd>, or{" "}
                <kbd className="bg-gray-200 px-1 rounded">⌘+V</kbd> on Mac)
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  4
                </span>
                The AI-generated summary will appear!
              </li>
            </ol>
            <hr className="my-6 border-gray-200" />
            <p className="text-sm text-gray-500">
              The summarization is powered by OpenAI&apos;s language models,
              running locally on our servers.
            </p>
          </div>
        )}

        {/* Original Text Display */}
        {inputText && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Original Text
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {charCount} characters • {wordCount} words
                </span>
                <button
                  onClick={clearAll}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-4 max-h-40 overflow-y-auto border">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {inputText}
              </p>
            </div>
          </div>
        )}

        {/* Summary Display */}
        {(inputText || isLoading) && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Summary</h2>
              {summary && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center text-blue-500 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  {copied ? "✓ Copied!" : "📋 Copy to clipboard"}
                </button>
              )}
            </div>

            <div className="bg-gray-50 rounded-md p-4 min-h-32 border">
              {error ? (
                <div className="flex items-center text-red-500">
                  <span className="mr-2">⚠️</span>
                  <p>{error}</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-24 text-gray-500">
                  <Spinner size={24} className="mr-3 text-blue-500" />
                  <p>Generating summary...</p>
                </div>
              ) : summary ? (
                <div>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {summary}
                  </p>
                  <div className="text-xs text-gray-400 border-t pt-2">
                    Summary: {summary.length} characters •{" "}
                    {summary.split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-400">
                  <p>Paste some text above to see the summary here...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>
            Smart Summary • Powered by AI •{" "}
            <a
              href="https://openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              OpenAI
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
