from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv

from .models import TextRequest, SummaryResponse
from .services.llm_service import LLMService

load_dotenv()

app = FastAPI(title="Smart Summary API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = LLMService()


@app.get("/")
async def root():
    return {"message": "Smart Summary API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


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


@app.post("/summarize", response_model=SummaryResponse)
async def summarize(request: TextRequest):
    try:
        summary = await llm.summarize(request.text, request.max_length)
        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/stream")
async def summarize_stream(request: TextRequest):
    try:
        async def generate():
            async for chunk in llm.summarize_stream(request.text, request.max_length):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
