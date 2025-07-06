from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from typing import Optional, Dict, Any
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
    is_provider_enabled
)
from .services.llm_service import LLMService
# TODO: Re-enable when LangGraph dependencies are installed
# from .services.langgraph_service import langgraph_service

load_dotenv()

app = FastAPI(title="Smart Summary API", version="2.0.0")

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


@app.get("/")
async def root():
    return {
        "message": "Smart Summary API with LangGraph",
        "version": "2.0.0",
        "features": [
            "Multi-provider support",
            "Context optimization",
            "Cost reduction strategies",
            "Shallow training capabilities",
            "Advanced caching",
            "Real-time streaming"
        ],
        "status": "LangGraph features temporarily disabled - installing dependencies"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "services": {
            "legacy_llm": "active",
            "langgraph_llm": "pending_dependencies",
            "context_optimizer": "pending_dependencies",
            "cache_system": "pending_dependencies"
        }
    }


@app.get("/providers", response_model=ProvidersListResponse)
async def get_providers():
    """Get list of available LLM providers and their status"""
    providers = []

    for provider_id, config in PROVIDER_CONFIG.items():
        provider_info = ProviderInfo(
            id=provider_id,
            name=config["name"],
            description=config["description"],
            status=config["status"],
            enabled=is_provider_enabled(provider_id),
            key_prefix=config["key_prefix"],
            min_key_length=config["min_key_length"]
        )
        providers.append(provider_info)

    return ProvidersListResponse(
        providers=providers,
        default_provider=LLMProvider.OPENAI
    )


@app.post("/validate-api-key", response_model=ApiKeyValidationResponse)
async def validate_api_key(request: ApiKeyValidationRequest):
    """Validate an API key for the specified provider"""
    try:
        # Only OpenAI is currently supported for validation
        if request.provider != LLMProvider.OPENAI:
            return ApiKeyValidationResponse(
                valid=False,
                message=f"{PROVIDER_CONFIG[request.provider]['name']} provider is not currently supported. Only OpenAI is available.",
                provider=request.provider
            )

        # Use legacy service for now
        is_valid, message = await llm.validate_api_key(request.api_key)
        return ApiKeyValidationResponse(
            valid=is_valid,
            message=message,
            provider=request.provider
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"API key validation failed: {str(e)}")


@app.get("/example")
async def example():
    try:
        file_path = os.path.join(os.path.dirname(
            __file__), "..", "example_text.md")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"text": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Example text not found")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading example: {str(e)}")


# Legacy endpoints for backward compatibility
@app.post("/summarize", response_model=SummaryResponse)
async def summarize(request: TextRequest):
    """Legacy summarization endpoint (backward compatibility)"""
    try:
        # Only OpenAI is currently supported for summarization
        if request.provider != LLMProvider.OPENAI:
            raise HTTPException(
                status_code=400,
                detail=f"{PROVIDER_CONFIG[request.provider]['name']} provider is not currently supported. Only OpenAI is available."
            )

        summary = await llm.summarize(request.text, request.max_length, request.api_key)
        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/stream")
async def summarize_stream(request: TextRequest):
    """Legacy streaming endpoint (backward compatibility)"""
    try:
        # Only OpenAI is currently supported for streaming
        if request.provider != LLMProvider.OPENAI:
            raise HTTPException(
                status_code=400,
                detail=f"{PROVIDER_CONFIG[request.provider]['name']} provider is not currently supported. Only OpenAI is available."
            )

        async def generate():
            async for chunk in llm.summarize_stream(request.text, request.max_length, request.api_key):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/plain")
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
