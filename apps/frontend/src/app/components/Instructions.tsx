import { InstructionsProps } from "../types";
import { Spinner } from "./Spinner";

export function Instructions({ onExample, loading }: InstructionsProps) {
  const steps = [
    {
      title: "Find text to summarize",
      description: "Got a long article? Boring email? Research paper?",
      icon: "🔍",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Copy it",
      description: "Select the text and hit Ctrl+C (or ⌘+C on Mac)",
      icon: "📋",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Paste it here",
      description: "Just paste anywhere on this page or use the box below",
      icon: "📥",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Done!",
      description: "Your summary appears in seconds",
      icon: "⚡",
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="mb-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            How it works
          </h2>
          <p className="text-gray-600 text-lg">
            Takes about 10 seconds to turn walls of text into something readable
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 h-full">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <span className="text-2xl">{step.icon}</span>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm font-bold text-gray-400 mb-1">
                      STEP {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector line for larger screens */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-3 w-6 h-0.5 bg-gradient-to-r from-gray-300 to-gray-200"></div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onExample}
            disabled={loading}
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:from-green-700 active:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-green-500/25 min-h-[56px]"
          >
            {loading ? (
              <>
                <Spinner size={20} className="mr-3 text-white" />
                <span>Loading example...</span>
              </>
            ) : (
              <>
                <span className="mr-2 text-xl">🚀</span>
                <span>Try Example</span>
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>Works with any text • Built by nekeldev</span>
          </div>
        </div>
      </div>
    </div>
  );
}
