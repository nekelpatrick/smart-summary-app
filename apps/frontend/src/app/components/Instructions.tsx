import { InstructionsProps } from "../types";
import { Spinner } from "./Spinner";

export function Instructions({
  onExample,
  loading,
}: InstructionsProps): React.ReactElement {
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
    <div className="mb-6">
      <div
        className={`bg-white/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md border border-gray-200/50 transition-all duration-300 ${
          loading ? "ring-2 ring-green-200 ring-opacity-50" : ""
        }`}
      >
        <div className="text-center mb-5">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            How it works
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Takes about 10 seconds to turn walls of text into something readable
          </p>

          {loading && (
            <div className="mt-3 animate-in fade-in slide-in-from-top duration-300">
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-green-700 font-medium text-xs">
                  Loading example and processing...
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div
                className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 h-full ${
                  loading && index === 3
                    ? "ring-2 ring-orange-200 ring-opacity-75"
                    : ""
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${
                      step.color
                    } rounded-full flex items-center justify-center mb-3 shadow-md ${
                      loading && index === 3 ? "animate-pulse" : ""
                    }`}
                  >
                    <span className="text-lg">{step.icon}</span>
                  </div>
                  <div className="mb-2">
                    <div className="text-xs font-bold text-gray-400 mb-1">
                      STEP {index + 1}
                    </div>
                    <h3
                      className={`font-semibold text-gray-800 text-xs leading-tight ${
                        loading && index === 3 ? "text-orange-600" : ""
                      }`}
                    >
                      {step.title}
                      {loading && index === 3 && (
                        <span className="ml-1 text-xs text-orange-500 animate-pulse">
                          In progress...
                        </span>
                      )}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`hidden lg:block absolute top-6 -right-2 w-4 h-0.5 transition-all duration-300 ${
                    loading && index < 3
                      ? "bg-gradient-to-r from-green-400 to-green-300"
                      : "bg-gradient-to-r from-gray-300 to-gray-200"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onExample}
            disabled={loading}
            className={`inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md min-h-[44px] text-sm ${
              loading
                ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed"
                : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 active:from-green-700 active:to-emerald-700 shadow-green-500/25 transform hover:scale-105 active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <Spinner size={16} className="mr-2 text-white" />
                <span>Loading example...</span>
              </>
            ) : (
              <>
                <span className="mr-2 text-lg">🚀</span>
                <span>Try Example</span>
              </>
            )}
          </button>

          <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span>Works with any text</span>
          </div>
        </div>
      </div>
    </div>
  );
}
