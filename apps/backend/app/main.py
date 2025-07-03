from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
from dotenv import load_dotenv

from .models import TextRequest, SummaryResponse
from .services.llm_service import LLMService

load_dotenv()

app = FastAPI(title="Smart Summary API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM service
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize/stream")
async def summarize_stream(request: TextRequest, response: Response):
    response.headers["Content-Type"] = "text/event-stream"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    
    async def event_generator():
        try:
            async for token in llm_service.stream_summary(
                text=request.text,
                max_length=request.max_length,
                model=request.model
            ):
                yield f"data: {token}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: error: {str(e)}\n\n"
    
    return event_generator() 