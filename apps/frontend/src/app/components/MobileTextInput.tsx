import { useState, useRef } from "react";

interface MobileTextInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

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

  return (
    <div className="mb-6 md:mb-8 rounded-lg bg-white p-4 md:p-6 shadow-lg">
      <h3 className="mb-4 text-lg md:text-xl font-semibold text-gray-700">
        Or type/paste your text here
      </h3>
      <div className="space-y-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type your text here..."
          className="w-full min-h-[120px] p-3 md:p-4 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none resize-y text-sm md:text-base"
          disabled={loading}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-500">
            {text.trim()
              ? `${text.length} characters • ${
                  text.trim().split(/\s+/).length
                } words`
              : "Start typing..."}
          </div>
          <div className="flex gap-2">
            {text.trim() && (
              <button
                onClick={() => setText("")}
                disabled={loading}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded border border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="px-6 py-2 min-h-[44px] text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-700 rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Processing..." : "Summarize"}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400 text-center">
        Tip: Use Cmd+Enter (Mac) or Ctrl+Enter (PC) to quickly submit
      </div>
    </div>
  );
}
