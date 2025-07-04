export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  defaultMaxLength: 300,
  cacheSize: 50,
  debounceDelay: 500,
  copiedFeedbackDuration: 2000,
  cachedFeedbackDuration: 2000,
} as const;

export const endpoints = {
  summarize: "/summarize",
  example: "/example",
  health: "/health",
} as const; 