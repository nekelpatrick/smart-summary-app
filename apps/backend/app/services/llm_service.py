import os
from typing import AsyncGenerator, Optional
import openai
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        if self.api_key == "your_openai_api_key_here":
            raise ValueError(
                "Please set your actual OpenAI API key in the .env file")

        self.client = openai.AsyncOpenAI(api_key=self.api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    async def generate_summary(self, text: str, max_length: Optional[int] = 200) -> str:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a helpful assistant that summarizes text. Provide a concise summary in approximately {max_length} words or less."
                    },
                    {
                        "role": "user",
                        "content": f"Please summarize the following text:\n\n{text}"
                    }
                ],
                max_tokens=max_length * 2,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()

        except openai.APIError as e:
            raise HTTPException(
                status_code=500, detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

    async def generate_summary_stream(self, text: str, max_length: Optional[int] = 200) -> AsyncGenerator[str, None]:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a helpful assistant that summarizes text. Provide a concise summary in approximately {max_length} words or less."
                    },
                    {
                        "role": "user",
                        "content": f"Please summarize the following text:\n\n{text}"
                    }
                ],
                max_tokens=max_length * 2,
                temperature=0.3,
                stream=True,
            )

            async for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except openai.APIError as e:
            raise HTTPException(
                status_code=500, detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")
