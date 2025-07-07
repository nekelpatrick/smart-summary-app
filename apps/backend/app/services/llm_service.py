import os
from typing import AsyncGenerator, Optional, Tuple, Dict, Any
import openai
from fastapi import HTTPException
from dotenv import load_dotenv
from openai import AsyncOpenAI
from ..models import LLMProvider
from .simplified_smart_summarizer import get_simplified_smart_summarizer

load_dotenv()


class LLMService:
    def __init__(self):
        self.client = None
        self.api_key = None
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    def _get_client(self, api_key: Optional[str] = None) -> AsyncOpenAI:
        if api_key:
            return AsyncOpenAI(api_key=api_key)

        if not self.client:
            default_key = os.getenv('OPENAI_API_KEY')
            if not default_key:
                raise HTTPException(
                    status_code=400,
                    detail="No OpenAI API key provided. Please provide your own API key."
                )
            self.client = AsyncOpenAI(api_key=default_key)
        return self.client

    def _create_summary_prompt(self, text: str, max_length: int) -> str:
        target_words = max_length // 4 if max_length < 200 else max_length // 3

        return f"""You are an expert at creating concise, high-quality summaries. Your task is to distill the following text into its most essential elements.

REQUIREMENTS:
- Use approximately {target_words} words (strict limit)
- Rewrite completely - don't copy phrases verbatim
- Focus on key insights, decisions, and outcomes
- Use active voice and clear, direct language
- Eliminate all filler words and redundancy
- If it's meeting notes: extract decisions, action items, and key points
- If it's an article: focus on main arguments and conclusions
- If it's a document: highlight critical information and next steps

ORIGINAL TEXT:
{text}

CONCISE SUMMARY:"""

    async def validate_api_key(self, api_key: str, provider: LLMProvider = LLMProvider.OPENAI) -> bool:
        if provider != LLMProvider.OPENAI:
            return False

        try:
            client = AsyncOpenAI(api_key=api_key)
            await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            return True
        except Exception:
            return False

    async def summarize_text(
        self,
        text: str,
        max_length: int = 200,
        api_key: Optional[str] = None,
        provider: LLMProvider = LLMProvider.OPENAI
    ) -> str:
        if provider != LLMProvider.OPENAI:
            raise HTTPException(
                status_code=400,
                detail=f"Provider {provider} is not supported. Only OpenAI is available."
            )

        if not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            # Use the smart summarizer for better results
            smart_summarizer = get_simplified_smart_summarizer(api_key)
            result = await smart_summarizer.summarize(text, max_length)
            return result["summary"]
        except Exception as e:
            if "authentication" in str(e).lower():
                raise HTTPException(
                    status_code=401,
                    detail="Invalid API key. Please check your OpenAI API key."
                )
            # Fallback to simple summarization if smart summarizer fails
            return await self._fallback_summarize(text, max_length, api_key)

    async def _fallback_summarize(self, text: str, max_length: int, api_key: Optional[str] = None) -> str:
        """Fallback to simple summarization if smart summarizer fails."""
        prompt = self._create_summary_prompt(text, max_length)

        try:
            client = self._get_client(api_key)

            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length,
                temperature=0.3,
                presence_penalty=0.6,
                frequency_penalty=0.5
            )

            return response.choices[0].message.content.strip()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Summarization failed: {str(e)}")

    async def summarize_text_stream(
        self,
        text: str,
        max_length: int = 200,
        api_key: Optional[str] = None,
        provider: LLMProvider = LLMProvider.OPENAI
    ) -> AsyncGenerator[str, None]:
        if provider != LLMProvider.OPENAI:
            raise HTTPException(
                status_code=400,
                detail=f"Provider {provider} is not supported. Only OpenAI is available."
            )

        if not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            smart_summarizer = get_simplified_smart_summarizer(api_key)
            async for chunk in smart_summarizer.summarize_stream(text, max_length):
                yield chunk
        except Exception as e:
            if "authentication" in str(e).lower():
                raise HTTPException(
                    status_code=401,
                    detail="Invalid API key. Please check your OpenAI API key."
                )
            async for chunk in self._fallback_stream(text, max_length, api_key):
                yield chunk

    async def _fallback_stream(self, text: str, max_length: int, api_key: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Fallback to simple streaming if smart summarizer fails."""
        prompt = self._create_summary_prompt(text, max_length)

        try:
            client = self._get_client(api_key)

            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length,
                temperature=0.3,
                presence_penalty=0.6,
                frequency_penalty=0.5,
                stream=True
            )

            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield f"data: {chunk.choices[0].delta.content}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Streaming failed: {str(e)}")

    async def summarize(self, text: str, max_length: int = 200, api_key: Optional[str] = None) -> str:
        return await self.summarize_text(text, max_length, api_key, LLMProvider.OPENAI)

    async def summarize_stream(self, text: str, max_length: int = 200, api_key: Optional[str] = None) -> AsyncGenerator[str, None]:
        async for chunk in self.summarize_text_stream(text, max_length, api_key, LLMProvider.OPENAI):
            yield chunk
