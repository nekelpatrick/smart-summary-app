"use client";

import { useState, useEffect } from "react";
import { ApiKeyInputProps } from "../types";

export default function ApiKeyInput({
  apiKey,
  onApiKeyChange,
  validating,
  validationStatus,
  onValidate,
  onClear,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="api-key" className="text-sm font-medium text-gray-700">
          OpenAI API Key (Optional)
        </label>
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="text-xs text-blue-600 hover:text-blue-800"
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
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
            disabled={validating}
          />

          {validationStatus !== "idle" && (
            <div
              className={`absolute right-12 top-1/2 transform -translate-y-1/2 ${getValidationColor()}`}
            >
              {getValidationIcon()}
            </div>
          )}

          {inputValue && (
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

          {inputValue && (
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

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Your API key is stored locally and never saved on our servers</p>
        <p>
          • Get your API key from{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            OpenAI Platform
          </a>
        </p>
        <p>• Leave empty to use our default API key (rate limited)</p>
      </div>
    </div>
  );
}
