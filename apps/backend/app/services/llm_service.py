import os
from typing import AsyncGenerator, Optional
import openai
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    def __init__(self):
        self.default_api_key = os.getenv("OPENAI_API_KEY")
        if not self.default_api_key or self.default_api_key == "your_openai_api_key_here":
            raise ValueError("Please set your OpenAI API key in the .env file")

        self.default_client = openai.AsyncOpenAI(api_key=self.default_api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    def _get_client(self, api_key: Optional[str] = None) -> openai.AsyncOpenAI:
        """Get OpenAI client with custom API key or default"""
        if api_key:
            return openai.AsyncOpenAI(api_key=api_key)
        return self.default_client

    async def validate_api_key(self, api_key: str) -> tuple[bool, str]:
        """Validate an OpenAI API key by making a test request"""
        try:
            client = openai.AsyncOpenAI(api_key=api_key)
            # Make a minimal test request to validate the key
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Test"}],
                max_tokens=1,
                temperature=0.3,
            )
            return True, "API key is valid"
        except openai.AuthenticationError:
            return False, "Invalid API key - authentication failed"
        except openai.RateLimitError:
            return False, "API key rate limit exceeded - please try again later"
        except openai.PermissionDeniedError:
            return False, "API key does not have the required permissions"
        except Exception as e:
            return False, f"API key validation failed: {str(e)}"

    async def summarize(self, text: str, max_length: Optional[int] = 200, api_key: Optional[str] = None) -> str:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        prompt = f"Summarize the following text in about {max_length} words:\n\n{text}"
        client = self._get_client(api_key)

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length * 2,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()
        except openai.AuthenticationError:
            raise HTTPException(status_code=401, detail="Invalid API key")
        except openai.RateLimitError:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        except openai.PermissionDeniedError:
            raise HTTPException(
                status_code=403, detail="API key does not have required permissions")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Summarization failed: {str(e)}")

    async def summarize_stream(self, text: str, max_length: Optional[int] = 200, api_key: Optional[str] = None) -> AsyncGenerator[str, None]:
        if not text.strip():
            raise ValueError("Text cannot be empty")

        prompt = f"Summarize the following text in about {max_length} words:\n\n{text}"
        client = self._get_client(api_key)

        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length * 2,
                temperature=0.3,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except openai.AuthenticationError:
            raise HTTPException(status_code=401, detail="Invalid API key")
        except openai.RateLimitError:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        except openai.PermissionDeniedError:
            raise HTTPException(
                status_code=403, detail="API key does not have required permissions")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Stream failed: {str(e)}")
