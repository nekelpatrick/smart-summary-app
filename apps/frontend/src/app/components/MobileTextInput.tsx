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
      const timer = setTimeout(() => setShowTip(true), 2000);
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
    <div className="mb-4 md:mb-6">
      <div className="max-w-2xl mx-auto">
        <div
          className={`relative rounded-xl bg-white shadow-md border-2 transition-all duration-300 ${
            isFocused ? "border-blue-500 shadow-blue-500/20" : "border-gray-200"
          } ${isSubmitting ? "ring-2 ring-blue-200 ring-opacity-75" : ""}`}
        >
          <div className="p-4 md:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xl">✏️</div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  Paste or type your text
                  {isSubmitting && (
                    <span className="text-xs text-blue-600 animate-pulse font-medium">
                      Processing...
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-600">
                  Articles, emails, documents - anything you want summarized
                </p>
              </div>
            </div>

            {isSubmitting && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-700 text-xs font-medium">
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
                className={`w-full min-h-[80px] max-h-[240px] p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-gray-900 placeholder-gray-500 transition-all duration-200 ${
                  loading ? "bg-gray-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
                aria-label="Text input for summarization"
                aria-describedby="text-stats"
                maxLength={MAX_CHARS}
              />

              {text.length > 0 && (
                <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs border border-gray-200">
                  <span className={charStatus.color}>
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div id="text-stats" className="flex items-center gap-3 text-xs">
                <span className="text-gray-600">
                  {wordCount > 0 ? `${wordCount} words` : "0 words"}
                </span>
                <span className={`font-medium ${charStatus.color}`}>
                  {charStatus.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {text.length > 0 && !loading && (
                  <button
                    onClick={() => setText("")}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
                    aria-label="Clear text"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                  className={`px-4 py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isSubmitDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 focus:ring-blue-500 shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95"
                  }`}
                  aria-label="Submit text for summarization"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded-md animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-1">
                <span>💡</span>
                <span>Try pasting an article</span>
              </div>
              <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-700 rotate-45"></div>
            </div>
          )}
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              ⌘
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              Enter
            </kbd>{" "}
            to submit
          </p>
        </div>
      </div>
    </div>
  );
}
