import os
from typing import AsyncGenerator, Optional
import openai
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key or self.api_key == "your_openai_api_key_here":
            raise ValueError("Please set your OpenAI API key in the .env file")

        self.client = openai.AsyncOpenAI(api_key=self.api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    async def summarize(self, text: str, max_length: Optional[int] = 200) -> str:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        prompt = f"Summarize the following text in about {max_length} words:\n\n{text}"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length * 2,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Summarization failed: {str(e)}")

    async def summarize_stream(self, text: str, max_length: Optional[int] = 200) -> AsyncGenerator[str, None]:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        prompt = f"Summarize the following text in about {max_length} words:\n\n{text}"

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length * 2,
                temperature=0.3,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Stream failed: {str(e)}")
