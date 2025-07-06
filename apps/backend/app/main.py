from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from contextlib import asynccontextmanager
import httpx
from dotenv import load_dotenv

from .models import (
    TextRequest,
    SummaryResponse,
    ApiKeyValidationRequest,
    ApiKeyValidationResponse,
    ProvidersListResponse,
    ProviderInfo,
    PROVIDER_CONFIG,
    LLMProvider,
    is_provider_enabled,
    SummaryRequest,
    ExampleResponse,
    ProvidersResponse,
    ProviderStatus,
)
from .services.llm_service import LLMService
# TODO: Re-enable when LangGraph dependencies are installed
# from .services.langgraph_service import langgraph_service

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Smart Summary API",
    description="A FastAPI backend for text summarization with OpenAI integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize both services
llm = LLMService()  # Legacy service for backward compatibility
# TODO: Re-enable when LangGraph dependencies are installed
# langgraph_llm = langgraph_service  # New LangGraph service


class HealthResponse(BaseModel):
    status: str
    message: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", message="API is running")


@app.get("/")
async def root():
    return {"message": "Smart Summary API"}


@app.get("/example", response_model=ExampleResponse)
async def get_example():
    example_file = os.path.join(os.path.dirname(
        __file__), "..", "example_text.md")
    if os.path.exists(example_file):
        with open(example_file, "r", encoding="utf-8") as f:
            example_text = f.read()
        return ExampleResponse(
            text=example_text,
            source="example file",
            description="Sample text for demonstration"
        )
    else:
        return ExampleResponse(
            text="Your meeting covered several key topics including project timelines, budget allocation, and team responsibilities. The discussion also touched on upcoming milestones and potential challenges that may arise during implementation.",
            source="fallback",
            description="Default example text"
        )


@app.get("/providers", response_model=ProvidersResponse)
async def get_providers():
    providers = [
        ProviderInfo(
            id=LLMProvider.OPENAI,
            name="OpenAI",
            description="GPT models (GPT-3.5, GPT-4, etc.)",
            status=ProviderStatus.ENABLED,
            enabled=True,
            key_prefix="sk-",
            min_key_length=51
        ),
        ProviderInfo(
            id=LLMProvider.ANTHROPIC,
            name="Anthropic",
            description="Claude models",
            status=ProviderStatus.DISABLED,
            enabled=False,
            key_prefix="sk-ant-",
            min_key_length=100
        ),
        ProviderInfo(
            id=LLMProvider.GOOGLE,
            name="Google",
            description="Gemini models",
            status=ProviderStatus.DISABLED,
            enabled=False,
            key_prefix="AI",
            min_key_length=30
        ),
    ]

    return ProvidersResponse(
        providers=providers,
        default_provider=LLMProvider.OPENAI,
        total=len(providers)
    )


@app.post("/validate-api-key", response_model=ApiKeyValidationResponse)
async def validate_api_key(request: ApiKeyValidationRequest):
    try:
        is_valid = await llm.validate_api_key(request.api_key, request.provider)
        return ApiKeyValidationResponse(
            valid=is_valid,
            message="API key is valid" if is_valid else "API key is invalid",
            provider=request.provider
        )
    except Exception as e:
        return ApiKeyValidationResponse(
            valid=False,
            message=str(e),
            provider=request.provider
        )


@app.post("/summarize", response_model=SummaryResponse)
async def summarize_text(request: SummaryRequest):
    try:
        summary = await llm.summarize_text(
            request.text,
            request.max_length,
            request.api_key,
            request.provider
        )
        return SummaryResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary),
            provider=request.provider
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/stream")
async def summarize_text_stream(request: SummaryRequest):
    try:
        stream = llm.summarize_text_stream(
            request.text,
            request.max_length,
            request.api_key,
            request.provider
        )
        return StreamingResponse(
            stream,
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New enhanced endpoints using LangGraph - TODO: Re-enable when dependencies are installed


@app.post("/v2/summarize")
async def enhanced_summarize(
    request: TextRequest,
    cost_budget: Optional[float] = Query(
        0.01, description="Maximum cost budget for summarization"),
    preferences: Optional[Dict[str, Any]] = None
):
    """Enhanced summarization with cost optimization and context analysis"""
    return HTTPException(
        status_code=503,
        detail="Enhanced features temporarily unavailable - LangGraph dependencies being installed"
    )


@app.post("/v2/summarize/stream")
async def enhanced_summarize_stream(
    request: TextRequest,
    cost_budget: Optional[float] = Query(
        0.01, description="Maximum cost budget for summarization"),
    preferences: Optional[Dict[str, Any]] = None
):
    """Enhanced streaming with cost optimization and context analysis"""
    return HTTPException(
        status_code=503,
        detail="Enhanced streaming temporarily unavailable - LangGraph dependencies being installed"
    )


@app.get("/v2/analytics")
async def get_analytics():
    """Get analytics about optimization strategies and cost savings"""
    return HTTPException(
        status_code=503,
        detail="Analytics temporarily unavailable - LangGraph dependencies being installed"
    )


@app.post("/v2/analyze")
async def analyze_text(
    text: str,
    api_key: Optional[str] = None
):
    """Analyze text complexity and provide optimization recommendations"""
    return HTTPException(
        status_code=503,
        detail="Text analysis temporarily unavailable - LangGraph dependencies being installed"
    )


@app.delete("/v2/cache")
async def clear_cache():
    """Clear the optimization cache"""
    return HTTPException(
        status_code=503,
        detail="Cache management temporarily unavailable - LangGraph dependencies being installed"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
