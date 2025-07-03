"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SummarizePage() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

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
          text: inputText,
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

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setError(null);
    setSummary("");
    setIsLoading(true);
    setIsStreaming(true);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const fetchController = new AbortController();
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          max_length: 300,
        }),
        signal: fetchController.signal,
      };
      
      fetch(`${API_URL}/summarize/stream`, fetchOptions)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          
          function readStream() {
            reader.read().then(({ done, value }) => {
              if (done) {
                setIsLoading(false);
                setIsStreaming(false);
                return;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              
              const lines = chunk.split('\n\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const content = line.substring(6);
                  
                  if (content === '[DONE]') {
                    setIsLoading(false);
                    setIsStreaming(false);
                    return;
                  } else if (content.startsWith('error:')) {
                    setError(content.substring(6));
                    setIsLoading(false);
                    setIsStreaming(false);
                    return;
                  } else {
                    setSummary(prev => prev + content);
                  }
                }
              }
              
              readStream();
            }).catch(err => {
              setError(err.message);
              setIsLoading(false);
              setIsStreaming(false);
            });
          }
          
          readStream();
        })
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
          setIsStreaming(false);
        });
        
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setError(null);
    setIsLoading(false);
    setCopied(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsStreaming(false);
  };

  const copyToClipboard = () => {
    if (!summary) return;
    
    navigator.clipboard.writeText(summary)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        setError("Failed to copy to clipboard");
      });
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Smart Summary</h1>
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Input Text</h2>
            <form onSubmit={handleStreamSubmit}>
              <textarea
                className="w-full h-64 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your text here to summarize..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
              ></textarea>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <div>
                  <span className="mr-4">Characters: {charCount}</span>
                  <span>Words: {wordCount}</span>
                </div>
                {charCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setInputText("")}
                    className="text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isLoading || !inputText.trim()}
                >
                  {isLoading ? "Summarizing..." : "Summarize (Stream)"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isLoading || !inputText.trim()}
                >
                  Summarize (Regular)
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Summary</h2>
              {summary && (
                <button
                  onClick={copyToClipboard}
                  className="text-blue-500 hover:text-blue-700 flex items-center"
                  disabled={isLoading}
                >
                  {copied ? "Copied!" : "Copy to clipboard"}
                </button>
              )}
            </div>
            <div
              className={`w-full h-64 p-4 border border-gray-300 rounded-md overflow-auto ${
                isStreaming ? "animate-pulse bg-gray-50" : ""
              }`}
            >
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : summary ? (
                <p>{summary}</p>
              ) : (
                <p className="text-gray-400">
                  {isLoading
                    ? "Generating summary..."
                    : "Your summary will appear here..."}
                </p>
              )}
            </div>
            {summary && (
              <div className="mt-4 flex justify-between">
                <p className="text-sm text-gray-500">
                  Characters: {summary.length}
                </p>
                <p className="text-sm text-gray-500">
                  Words: {summary.split(/\s+/).filter(Boolean).length}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 