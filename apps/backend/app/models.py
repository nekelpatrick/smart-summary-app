from pydantic import BaseModel, Field, field_validator
from typing import Optional


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    max_length: Optional[int] = Field(200, gt=0, le=1000)

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v


class SummaryResponse(BaseModel):
    summary: str
