import type { AppConfig } from "../types";

export const config: AppConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "",
  defaultMaxLength: 300,
  cacheSize: 50,
  debounceDelay: 500,
  copiedFeedbackDuration: 2000,
  cachedFeedbackDuration: 2000,
};

export const endpoints = {
  summarize: "/summarize/stream",
  example: "/example",
  health: "/health",
  validateApiKey: "/validate-api-key",
  providers: "/providers",
} as const; 