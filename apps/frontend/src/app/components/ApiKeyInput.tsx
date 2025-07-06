"use client";

import { useState, useEffect } from "react";
import {
  ApiKeyInputProps,
  LLMProvider,
  ProviderStatus,
  ProviderInfo,
} from "../types";

export default function ApiKeyInput({
  apiKey,
  selectedProvider,
  availableProviders,
  onApiKeyChange,
  onProviderChange,
  validating,
  validationStatus,
  onValidate,
  onClear,
  loadingProviders,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setInputValue(value);
    onApiKeyChange(value);
  };

  const handleProviderChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const provider = e.target.value as LLMProvider;
    onProviderChange(provider);
  };

  const handleValidate = (): void => {
    if (inputValue.trim()) {
      onValidate();
    }
  };

  const handleClear = (): void => {
    setInputValue("");
    onApiKeyChange("");
    onClear();
  };

  const getValidationIcon = (): string => {
    switch (validationStatus) {
      case "valid":
        return "✅";
      case "invalid":
        return "❌";
      case "error":
        return "⚠️";
      default:
        return "";
    }
  };

  const getValidationColor = (): string => {
    switch (validationStatus) {
      case "valid":
        return "text-green-600";
      case "invalid":
        return "text-red-600";
      case "error":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getValidationMessage = (): string => {
    switch (validationStatus) {
      case "valid":
        return "API key is valid";
      case "invalid":
        return "Invalid API key";
      case "error":
        return "Validation failed";
      default:
        return "";
    }
  };

  const getCurrentProvider = (): ProviderInfo | undefined => {
    return availableProviders.find((p) => p.id === selectedProvider);
  };

  const getProviderStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case ProviderStatus.ENABLED:
        return (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            ✅ Available
          </span>
        );
      case ProviderStatus.DISABLED:
        return (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            ❌ Disabled
          </span>
        );
      case ProviderStatus.COMING_SOON:
        return (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            🔄 Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  const getProviderHelp = () => {
    const provider = getCurrentProvider();
    if (!provider) return null;

    const links = {
      [LLMProvider.OPENAI]: "https://platform.openai.com/api-keys",
      [LLMProvider.ANTHROPIC]: "https://console.anthropic.com/",
      [LLMProvider.GOOGLE]: "https://makersuite.google.com/app/apikey",
      [LLMProvider.MISTRAL]: "https://console.mistral.ai/",
      [LLMProvider.COHERE]: "https://dashboard.cohere.com/api-keys",
    };

    if (provider.status === ProviderStatus.ENABLED) {
      return (
        <div className="text-xs text-gray-500 space-y-1 mt-2">
          <p>
            🔑 Need a key? Get one from{" "}
            <a
              href={links[selectedProvider]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              {provider.name}
            </a>
          </p>
          <p>💾 Keys stay on your device</p>
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-500 space-y-1 mt-2">
        <p>⚠️ {provider.name} coming soon</p>
        <p>✅ Only OpenAI works right now</p>
      </div>
    );
  };

  const isProviderEnabled = (): boolean => {
    const provider = getCurrentProvider();
    return provider?.enabled ?? false;
  };

  const getPlaceholderText = (): string => {
    const provider = getCurrentProvider();
    if (!provider) return "Enter API key...";
    return provider.key_prefix
      ? `${provider.key_prefix}...`
      : "Enter API key...";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="provider-select"
          className="text-sm font-medium text-gray-700"
        >
          Provider
        </label>
        <div className="relative">
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={handleProviderChange}
            disabled={loadingProviders}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm text-gray-900"
          >
            {availableProviders.map((provider) => (
              <option
                key={provider.id}
                value={provider.id}
                disabled={!provider.enabled}
              >
                {provider.name} - {provider.description}
              </option>
            ))}
          </select>
          {loadingProviders && (
            <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {getCurrentProvider()?.name || "Select a provider"}
          </div>
          {getCurrentProvider() &&
            getProviderStatusBadge(getCurrentProvider()!.status)}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="api-key" className="text-sm font-medium text-gray-700">
          API Key (Optional)
        </label>
        <div className="relative">
          <input
            id="api-key"
            type={showKey ? "text" : "password"}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={getPlaceholderText()}
            disabled={!isProviderEnabled() || validating}
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-10 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showKey ? "🙈" : "👁️"}
            </button>
          )}
          {validationStatus && (
            <div className="absolute right-3 top-2.5 text-sm">
              {getValidationIcon()}
            </div>
          )}
        </div>
        {validationStatus && (
          <div className={`text-xs ${getValidationColor()}`}>
            {getValidationMessage()}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {inputValue.trim() && (
          <button
            onClick={handleValidate}
            disabled={!isProviderEnabled() || validating}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {validating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Validating...</span>
              </div>
            ) : (
              "Validate"
            )}
          </button>
        )}
        {inputValue.trim() && (
          <button
            onClick={handleClear}
            disabled={validating}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {getProviderHelp()}
    </div>
  );
}
