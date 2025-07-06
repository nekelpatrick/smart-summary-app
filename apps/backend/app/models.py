from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum
import re


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    MISTRAL = "mistral"
    COHERE = "cohere"


class ProviderStatus(str, Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    COMING_SOON = "coming_soon"


# Provider configuration - only OpenAI is enabled
PROVIDER_CONFIG = {
    LLMProvider.OPENAI: {
        "status": ProviderStatus.ENABLED,
        "name": "OpenAI",
        "description": "GPT models (GPT-3.5, GPT-4, etc.)",
        "key_format": r'^sk-[a-zA-Z0-9]{48,}$',
        "key_prefix": "sk-",
        "min_key_length": 51
    },
    LLMProvider.ANTHROPIC: {
        "status": ProviderStatus.DISABLED,
        "name": "Anthropic",
        "description": "Claude models (Claude-3, Claude-2, etc.)",
        "key_format": r'^sk-ant-[a-zA-Z0-9\-]{95,}$',
        "key_prefix": "sk-ant-",
        "min_key_length": 100
    },
    LLMProvider.GOOGLE: {
        "status": ProviderStatus.COMING_SOON,
        "name": "Google",
        "description": "Gemini models",
        "key_format": r'^[a-zA-Z0-9\-_]{39}$',
        "key_prefix": "",
        "min_key_length": 39
    },
    LLMProvider.MISTRAL: {
        "status": ProviderStatus.COMING_SOON,
        "name": "Mistral AI",
        "description": "Mistral models",
        "key_format": r'^[a-zA-Z0-9]{32}$',
        "key_prefix": "",
        "min_key_length": 32
    },
    LLMProvider.COHERE: {
        "status": ProviderStatus.COMING_SOON,
        "name": "Cohere",
        "description": "Command models",
        "key_format": r'^[a-zA-Z0-9\-]{40}$',
        "key_prefix": "",
        "min_key_length": 40
    }
}


def validate_api_key_format(api_key: str, provider: LLMProvider) -> bool:
    """Validate API key format for the specified provider"""
    if provider not in PROVIDER_CONFIG:
        return False

    config = PROVIDER_CONFIG[provider]
    pattern = config["key_format"]
    return bool(re.match(pattern, api_key))


def is_provider_enabled(provider: LLMProvider) -> bool:
    """Check if a provider is currently enabled"""
    return PROVIDER_CONFIG.get(provider, {}).get("status") == ProviderStatus.ENABLED


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    max_length: Optional[int] = Field(200, gt=0, le=1000)
    api_key: Optional[str] = Field(None, description="Optional custom API key")
    provider: LLMProvider = Field(
        LLMProvider.OPENAI, description="LLM provider to use")

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v

    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v):
        if not is_provider_enabled(v):
            raise ValueError(
                f'Provider {v} is not currently supported. Only OpenAI is available.')
        return v

    @field_validator('api_key')
    @classmethod
    def validate_api_key(cls, v, info):
        if v is not None:
            if not v.strip():
                raise ValueError('API key cannot be empty or only whitespace')

            # Get the provider from the context (if available)
            provider = info.data.get('provider', LLMProvider.OPENAI)

            # Validate key format for the specified provider
            if not validate_api_key_format(v.strip(), provider):
                provider_name = PROVIDER_CONFIG[provider]["name"]
                raise ValueError(f'Invalid {provider_name} API key format')

        return v.strip() if v else None


class ApiKeyValidationRequest(BaseModel):
    api_key: str = Field(..., description="API key to validate")
    provider: LLMProvider = Field(
        LLMProvider.OPENAI, description="LLM provider for the API key")

    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v):
        if not is_provider_enabled(v):
            raise ValueError(
                f'Provider {v} is not currently supported. Only OpenAI is available.')
        return v

    @field_validator('api_key')
    @classmethod
    def validate_api_key(cls, v, info):
        if not v or not v.strip():
            raise ValueError('API key cannot be empty or only whitespace')

        # Get the provider from the context
        provider = info.data.get('provider', LLMProvider.OPENAI)

        # Validate key format for the specified provider
        if not validate_api_key_format(v.strip(), provider):
            provider_name = PROVIDER_CONFIG[provider]["name"]
            raise ValueError(f'Invalid {provider_name} API key format')

        return v.strip()


class ApiKeyValidationResponse(BaseModel):
    valid: bool
    message: str
    provider: str


class ProviderInfo(BaseModel):
    id: str
    name: str
    description: str
    status: ProviderStatus
    enabled: bool
    key_prefix: str
    min_key_length: int


class ProvidersListResponse(BaseModel):
    providers: list[ProviderInfo]
    default_provider: str = LLMProvider.OPENAI


class SummaryResponse(BaseModel):
    summary: str
