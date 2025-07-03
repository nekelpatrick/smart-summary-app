from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional
import os
from dotenv import load_dotenv
import asyncio

from .models import TextRequest, SummaryResponse
from .services.llm_service import LLMService

load_dotenv()

app = FastAPI(title="Smart Summary API")

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
async def summarize(request: TextRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        await asyncio.sleep(0.1)

        summary = await llm_service.generate_summary(
            text=request.text,
            max_length=request.max_length,
            model=request.model
        )

        return SummaryResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary)
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/stream")
async def summarize_stream(request: TextRequest):
    if not request.text.strip():
        async def error_generator():
            yield "data: error: Text cannot be empty\n\n"

        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )

    async def event_generator():
        try:
            await asyncio.sleep(0.1)

            async for token in llm_service.stream_summary(
                text=request.text,
                max_length=request.max_length,
                model=request.model
            ):
                yield f"data: {token}\n\n"
                await asyncio.sleep(0.01)

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: error: {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )
