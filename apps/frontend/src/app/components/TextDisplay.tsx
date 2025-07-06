import { TextDisplayProps } from "../types";

export function TextDisplay({
  text,
  words,
  chars,
  onClear,
}: TextDisplayProps): React.ReactElement {
  const getOptimalHeight = () => {
    const lines = text.split("\n").length;
    const estimatedLines = Math.ceil(text.length / 80) + lines;
    if (estimatedLines <= 3) return "max-h-20";
    if (estimatedLines <= 6) return "max-h-32";
    return "max-h-40";
  };

  return (
    <div className="mb-4 rounded-lg bg-white p-3 md:p-4 shadow-md">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base md:text-lg font-semibold text-gray-700">
          Your Text
        </h2>
        <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
          <span className="text-xs text-gray-500">
            {chars} characters • {words} words
          </span>
          <button
            onClick={onClear}
            className="text-xs font-medium text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:text-red-800 rounded px-2 py-1 min-h-[36px] min-w-[44px] transition-colors duration-200"
          >
            Clear
          </button>
        </div>
      </div>
      <div
        className={`${getOptimalHeight()} overflow-y-auto rounded-md border bg-gray-50 p-2 md:p-3`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {text}
        </p>
      </div>
    </div>
  );
}
