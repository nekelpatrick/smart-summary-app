from pydantic import BaseModel, Field
from typing import Optional

class TextRequest(BaseModel):
    text: str = Field(..., description="The text to be summarized")
    max_length: Optional[int] = Field(200, description="Maximum length of the summary in characters")
    model: Optional[str] = Field("gpt-3.5-turbo", description="LLM model to use for summarization")

class SummaryResponse(BaseModel):
    summary: str = Field(..., description="The generated summary")
    original_length: int = Field(..., description="Length of the original text in characters")
    summary_length: int = Field(..., description="Length of the summary in characters") 