from pydantic import BaseModel, Field, field_validator, ValidationInfo
from typing import Optional, List, Dict, Any, Union
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
    DEPRECATED = "deprecated"


PROVIDER_CONFIG = {
    LLMProvider.OPENAI: {
        "name": "OpenAI",
        "description": "GPT models (GPT-3.5, GPT-4, etc.)",
        "status": ProviderStatus.ENABLED,
        "enabled": True,
        "key_prefix": "sk-",
        "min_key_length": 51,
        "key_pattern": r"^sk-[a-zA-Z0-9]{48}$|^sk-proj-[a-zA-Z0-9]{64}$"
    },
    LLMProvider.ANTHROPIC: {
        "name": "Anthropic",
        "description": "Claude models",
        "status": ProviderStatus.DISABLED,
        "enabled": False,
        "key_prefix": "sk-ant-",
        "min_key_length": 100,
        "key_pattern": r"^sk-ant-[a-zA-Z0-9-_]{95}$"
    },
    LLMProvider.GOOGLE: {
        "name": "Google",
        "description": "Gemini models",
        "status": ProviderStatus.DISABLED,
        "enabled": False,
        "key_prefix": "AI",
        "min_key_length": 30,
        "key_pattern": r"^AI[a-zA-Z0-9-_]{30,}$"
    },
    LLMProvider.MISTRAL: {
        "name": "Mistral",
        "description": "Mistral models",
        "status": ProviderStatus.DISABLED,
        "enabled": False,
        "key_prefix": "api_key",
        "min_key_length": 32,
        "key_pattern": r"^[a-zA-Z0-9]{32}$"
    },
    LLMProvider.COHERE: {
        "name": "Cohere",
        "description": "Cohere models",
        "status": ProviderStatus.DISABLED,
        "enabled": False,
        "key_prefix": "co-",
        "min_key_length": 40,
        "key_pattern": r"^co-[a-zA-Z0-9]{40}$"
    }
}


def is_provider_enabled(provider: LLMProvider) -> bool:
    return PROVIDER_CONFIG.get(provider, {}).get("enabled", False)


class ProviderInfo(BaseModel):
    id: LLMProvider
    name: str
    description: str
    status: ProviderStatus
    enabled: bool
    key_prefix: str
    min_key_length: int


class ProvidersResponse(BaseModel):
    providers: List[ProviderInfo]
    default_provider: LLMProvider
    total: int


class ApiKeyValidationRequest(BaseModel):
    api_key: str
    provider: LLMProvider = LLMProvider.OPENAI

    @field_validator('api_key')
    @classmethod
    def validate_api_key_format(cls, v: str, info: ValidationInfo) -> str:
        if not v or not v.strip():
            raise ValueError("API key cannot be empty")

        provider = info.data.get('provider', LLMProvider.OPENAI)
        config = PROVIDER_CONFIG.get(provider, {})

        if config.get('key_pattern'):
            if not re.match(config['key_pattern'], v):
                raise ValueError(
                    f"Invalid API key format for {config.get('name', provider)}")

        return v.strip()


class ApiKeyValidationResponse(BaseModel):
    valid: bool
    message: str
    provider: LLMProvider


class SummaryRequest(BaseModel):
    text: str
    max_length: int = Field(default=200, ge=50, le=1000)
    api_key: Optional[str] = None
    provider: LLMProvider = LLMProvider.OPENAI

    @field_validator('api_key')
    @classmethod
    def validate_api_key_format(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        if not v:
            return None

        provider = info.data.get('provider', LLMProvider.OPENAI)
        config = PROVIDER_CONFIG.get(provider, {})

        if config.get('key_pattern'):
            if not re.match(config['key_pattern'], v):
                raise ValueError(
                    f"Invalid API key format for {config.get('name', provider)}")

        return v.strip()


class SummaryResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    provider: LLMProvider


class ExampleResponse(BaseModel):
    text: str
    source: str
    description: str


class ErrorResponse(BaseModel):
    detail: str
    error_type: str
    status_code: int


class TextAnalysis(BaseModel):
    word_count: int
    sentence_count: int
    paragraph_count: int
    reading_time_minutes: float
    complexity_score: float
    domain: str
    language: str


class OptimizationStrategy(str, Enum):
    CACHE_HIT = "cache_hit"
    COMPRESS = "compress"
    CHUNK = "chunk"
    TEMPLATE = "template"
    SHALLOW_TRAIN = "shallow_train"


class OptimizationResult(BaseModel):
    strategy: OptimizationStrategy
    original_tokens: int
    optimized_tokens: int
    estimated_cost: float
    confidence: float
    explanation: str


class Analytics(BaseModel):
    total_summaries: int
    cache_hits: int
    cache_misses: int
    average_processing_time: float
    total_cost_saved: float
    strategies_used: Dict[str, int]
    domains_detected: List[str]


class CacheStats(BaseModel):
    total_entries: int
    hit_rate: float
    miss_rate: float
    memory_usage_mb: float


class EnhancedSummaryRequest(BaseModel):
    text: str
    max_length: int = Field(default=200, ge=50, le=1000)
    api_key: Optional[str] = None
    provider: LLMProvider = LLMProvider.OPENAI
    enable_optimization: bool = True
    context_strategy: str = "auto"


class EnhancedSummaryResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    provider: LLMProvider
    optimization_used: OptimizationResult
    analysis: TextAnalysis
    processing_time: float
