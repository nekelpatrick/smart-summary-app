import { InstructionsProps } from "../types";
import { Spinner } from "./Spinner";

export function Instructions({ onExample, loading }: InstructionsProps) {
  const steps = [
    "Find text you want to summarize",
    "Copy it (Ctrl+C or ⌘+C)",
    "Paste anywhere on this page (Ctrl+V or ⌘+V) or use the text box below",
    "Get your summary instantly!",
  ];

  return (
    <div className="mb-6 md:mb-8 rounded-lg bg-white p-6 md:p-8 shadow-lg">
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
          className="flex items-center justify-center rounded-lg bg-green-500 px-6 py-3 min-h-[44px] text-white font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
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
