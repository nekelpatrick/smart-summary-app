import { TextDisplayProps } from "../types";

export function TextDisplay({
  text,
  words,
  chars,
  onClear,
}: TextDisplayProps): React.ReactElement {
  return (
    <div className="mb-6 rounded-lg bg-white p-4 md:p-6 shadow-lg">
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
            className="text-sm font-medium text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:text-red-800 rounded px-3 py-2 min-h-[44px] min-w-[44px] transition-colors duration-200"
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
