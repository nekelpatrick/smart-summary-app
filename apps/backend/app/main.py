from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional
import os
from dotenv import load_dotenv

from .models import TextRequest, SummaryResponse
from .services.llm_service import LLMService

load_dotenv()

app = FastAPI(
    title="Smart Summary API",
    description="AI-powered text summarization service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_service = LLMService()


@app.get("/")
async def root():
    return {"message": "Smart Summary API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/summarize", response_model=SummaryResponse)
async def summarize_text(request: TextRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty"
        )

    try:
        summary = await llm_service.generate_summary(
            text=request.text,
            max_length=request.max_length
        )
        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )


@app.post("/summarize/stream")
async def summarize_text_stream(request: TextRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty"
        )

    try:
        async def generate():
            async for chunk in llm_service.generate_summary_stream(
                text=request.text,
                max_length=request.max_length
            ):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate streaming summary: {str(e)}"
        )
