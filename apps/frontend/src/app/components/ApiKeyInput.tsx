"use client";

import { useState, useEffect } from "react";
import { ApiKeyInputProps, LLMProvider, ProviderStatus } from "../types";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onApiKeyChange(value);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as LLMProvider;
    onProviderChange(provider);
  };

  const handleValidate = () => {
    if (inputValue.trim()) {
      onValidate();
    }
  };

  const handleClear = () => {
    setInputValue("");
    onApiKeyChange("");
    onClear();
  };

  const getValidationIcon = () => {
    switch (validationStatus) {
      case "valid":
        return "✓";
      case "invalid":
        return "✗";
      case "error":
        return "!";
      default:
        return "";
    }
  };

  const getValidationColor = () => {
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

  const getValidationMessage = () => {
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

  const getCurrentProvider = () => {
    return availableProviders.find((p) => p.id === selectedProvider);
  };

  const getProviderStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case ProviderStatus.ENABLED:
        return (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Available
          </span>
        );
      case ProviderStatus.DISABLED:
        return (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            Disabled
          </span>
        );
      case ProviderStatus.COMING_SOON:
        return (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Coming Soon
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
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Your API key is stored locally and never saved on our servers</p>
          <p>
            • Get your API key from{" "}
            <a
              href={links[selectedProvider]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {provider.name} Platform
            </a>
          </p>
          <p>• Leave empty to use our default API key (rate limited)</p>
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-500 space-y-1">
        <p>• {provider.name} support is not yet available</p>
        <p>• Only OpenAI is currently supported</p>
        <p>• More providers will be added in future updates</p>
      </div>
    );
  };

  const isProviderEnabled = () => {
    const provider = getCurrentProvider();
    return provider?.enabled ?? false;
  };

  const getPlaceholderText = () => {
    const provider = getCurrentProvider();
    if (!provider) return "Enter API key...";
    return provider.key_prefix
      ? `${provider.key_prefix}...`
      : "Enter API key...";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="provider-select"
            className="text-sm font-medium text-gray-700"
          >
            LLM Provider
          </label>
          {loadingProviders && (
            <span className="text-xs text-gray-500">Loading providers...</span>
          )}
        </div>

        <div className="relative">
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={handleProviderChange}
            disabled={loadingProviders}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getCurrentProvider() &&
              getProviderStatusBadge(getCurrentProvider()!.status)}
            <span className="text-xs text-gray-500">
              {getCurrentProvider()?.description}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="api-key"
            className="text-sm font-medium text-gray-700"
          >
            API Key (Optional)
          </label>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-xs text-blue-600 hover:text-blue-800"
            disabled={!isProviderEnabled()}
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={inputValue}
              onChange={handleInputChange}
              placeholder={getPlaceholderText()}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20 ${
                !isProviderEnabled() ? "bg-gray-50 cursor-not-allowed" : ""
              }`}
              disabled={validating || !isProviderEnabled()}
            />

            {validationStatus !== "idle" && (
              <div
                className={`absolute right-12 top-1/2 transform -translate-y-1/2 ${getValidationColor()}`}
              >
                {getValidationIcon()}
              </div>
            )}

            {inputValue && isProviderEnabled() && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={validating}
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {validationStatus !== "idle" && (
                <span className={`text-xs ${getValidationColor()}`}>
                  {getValidationMessage()}
                </span>
              )}
            </div>

            {inputValue && isProviderEnabled() && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !inputValue.trim()}
                className={`text-xs px-2 py-1 rounded ${
                  validating
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                }`}
              >
                {validating ? "Validating..." : "Validate"}
              </button>
            )}
          </div>
        </div>
      </div>

      {getProviderHelp()}
    </div>
  );
}
