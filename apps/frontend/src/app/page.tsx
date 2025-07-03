import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Summary App",
  description: "Summarize text using AI",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8 text-center w-full">Smart Summary App</h1>
      </div>

      <div className="w-full max-w-5xl mb-8">
        <p className="text-lg mb-4">
          Welcome to Smart Summary App! This application helps you summarize long texts using AI.
        </p>
        <p className="text-lg mb-8">
          Simply paste your text and get a concise summary instantly.
        </p>
        <div className="flex justify-center">
          <Link
            href="/summarize"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-3 lg:text-left gap-4">
        <div className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Fast Summaries{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Get concise summaries of long articles, emails, or documents in seconds.
          </p>
        </div>

        <div className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            AI-Powered{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Leveraging state-of-the-art language models to provide high-quality summaries.
          </p>
        </div>

        <div className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Real-time{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Watch as your summary is generated in real-time with streaming technology.
          </p>
        </div>
      </div>
    </main>
  );
}
