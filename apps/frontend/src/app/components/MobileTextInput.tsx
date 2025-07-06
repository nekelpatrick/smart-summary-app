import { useState, useRef } from "react";
import type { MobileTextInputProps } from "../types";

export function MobileTextInput({ onSubmit, loading }: MobileTextInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (text.trim() && !loading) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const charCount = text.length;

  return (
    <div className="mb-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-lg border border-gray-200/50">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Or just type it out
          </h3>
          <p className="text-gray-600">Sometimes copy-paste is a pain</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste or type your text here..."
              className="w-full min-h-[160px] p-4 md:p-6 rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 focus:outline-none resize-none text-base md:text-lg transition-all duration-200 bg-white/50 placeholder-gray-400"
              disabled={loading}
            />
            {text.trim() && (
              <div className="absolute top-3 right-3 bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">
                {wordCount} words
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <span>📝</span>
                <span>
                  {text.trim()
                    ? `${charCount} characters • ${wordCount} words`
                    : "Start typing..."}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {text.trim() && (
                <button
                  onClick={() => setText("")}
                  disabled={loading}
                  className="px-4 py-2 min-h-[48px] text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded-xl border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white/80"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                className="px-8 py-2 min-h-[48px] text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:from-blue-700 active:to-purple-700 rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>⚡</span>
                    <span>Summarize</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200/50 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span>💡</span>
            <span>
              Tip: Use Cmd+Enter (Mac) or Ctrl+Enter (PC) to quickly submit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
