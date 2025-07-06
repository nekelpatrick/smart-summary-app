import { useState, useCallback, useEffect } from "react";
import type { MobileTextInputProps } from "../types";

export function MobileTextInput({
  onSubmit,
  loading,
}: MobileTextInputProps): React.ReactElement {
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_CHARS = 10;
  const MAX_CHARS = 50000;
  const RECOMMENDED_CHARS = 200;

  useEffect(() => {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
  }, [text]);

  useEffect(() => {
    if (isFocused && text.length === 0) {
      const timer = setTimeout(() => setShowTip(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowTip(false);
    }
  }, [isFocused, text.length]);

  useEffect(() => {
    if (loading) {
      setIsSubmitting(true);
    } else {
      setIsSubmitting(false);
    }
  }, [loading]);

  const handleSubmit = useCallback((): void => {
    if (text.trim() && text.length >= MIN_CHARS && !loading) {
      setIsSubmitting(true);
      onSubmit(text.trim());
      setText("");
    }
  }, [text, onSubmit, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const getCharStatus = () => {
    if (charCount === 0)
      return { color: "text-gray-400", label: "Start typing..." };
    if (charCount < MIN_CHARS)
      return { color: "text-red-500", label: "Too short" };
    if (charCount < RECOMMENDED_CHARS)
      return { color: "text-yellow-500", label: "Good" };
    if (charCount < MAX_CHARS)
      return { color: "text-green-500", label: "Great" };
    return { color: "text-red-500", label: "Too long" };
  };

  const isSubmitDisabled =
    !text.trim() || loading || charCount < MIN_CHARS || charCount > MAX_CHARS;
  const charStatus = getCharStatus();

  return (
    <div className="mb-6 md:mb-8">
      <div className="max-w-2xl mx-auto">
        <div
          className={`relative rounded-2xl bg-white shadow-lg border-2 transition-all duration-300 ${
            isFocused ? "border-blue-500 shadow-blue-500/25" : "border-gray-200"
          } ${isSubmitting ? "ring-2 ring-blue-200 ring-opacity-75" : ""}`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">✏️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  Paste or type your text
                  {isSubmitting && (
                    <span className="text-xs text-blue-600 animate-pulse font-medium">
                      Processing...
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  Articles, emails, documents - anything you want summarized
                </p>
              </div>
            </div>

            {isSubmitting && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-700 text-sm font-medium">
                    Your text is being processed...
                  </span>
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Paste your text here or start typing..."
                className={`w-full min-h-[120px] max-h-[300px] p-4 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-gray-900 placeholder-gray-500 transition-all duration-200 ${
                  loading ? "bg-gray-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
                aria-label="Text input for summarization"
                aria-describedby="text-stats"
                maxLength={MAX_CHARS}
              />

              {text.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs border border-gray-200">
                  <span className={charStatus.color}>
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div id="text-stats" className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  {wordCount > 0 ? `${wordCount} words` : "0 words"}
                </span>
                <span className={`font-medium ${charStatus.color}`}>
                  {charStatus.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {text.length > 0 && !loading && (
                  <button
                    onClick={() => setText("")}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Clear text"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                  className={`px-6 py-3 min-h-[48px] text-sm font-semibold rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isSubmitDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 focus:ring-blue-500 shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95"
                  }`}
                  aria-label="Submit text for summarization"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>⚡</span>
                      <span>Summarize</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {showTip && !loading && (
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <span>💡</span>
                <span>Try pasting an article or long email</span>
              </div>
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
            <span>⌨️</span>
            <span>
              Press{" "}
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter
              </kbd>{" "}
              to submit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
