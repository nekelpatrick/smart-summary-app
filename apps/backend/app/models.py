from pydantic import BaseModel, Field
from typing import Optional


class TextRequest(BaseModel):
    text: str = Field(...,
                      description="The text to be summarized", min_length=1)
    max_length: Optional[int] = Field(
        200, description="Maximum length of the summary in words", gt=0, le=1000)


class SummaryResponse(BaseModel):
    summary: str = Field(..., description="The generated summary")
