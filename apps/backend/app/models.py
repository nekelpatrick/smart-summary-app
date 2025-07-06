from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    max_length: Optional[int] = Field(200, gt=0, le=1000)
    api_key: Optional[str] = Field(
        None, description="Optional custom OpenAI API key")

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v

    @field_validator('api_key')
    @classmethod
    def validate_api_key(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError('API key cannot be empty or only whitespace')
            # Basic OpenAI API key format validation
            if not re.match(r'^sk-[a-zA-Z0-9]{48,}$', v.strip()):
                raise ValueError('Invalid OpenAI API key format')
        return v.strip() if v else None


class ApiKeyValidationRequest(BaseModel):
    api_key: str = Field(..., description="OpenAI API key to validate")

    @field_validator('api_key')
    @classmethod
    def validate_api_key(cls, v):
        if not v or not v.strip():
            raise ValueError('API key cannot be empty or only whitespace')
        # Basic OpenAI API key format validation
        if not re.match(r'^sk-[a-zA-Z0-9]{48,}$', v.strip()):
            raise ValueError('Invalid OpenAI API key format')
        return v.strip()


class ApiKeyValidationResponse(BaseModel):
    valid: bool
    message: str
    provider: str = "openai"


class SummaryResponse(BaseModel):
    summary: str
