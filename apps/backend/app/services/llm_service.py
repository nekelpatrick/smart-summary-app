import os
from typing import AsyncGenerator, Optional
import openai
from fastapi import HTTPException
from dotenv import load_dotenv
import asyncio

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        if self.api_key == "your_api_key_here":
            raise ValueError("Please replace the placeholder API key in .env with your actual OpenAI API key")
        
        self.client = openai.OpenAI(api_key=self.api_key)
        
    async def generate_summary(self, text: str, max_length: Optional[int] = 200, model: str = "gpt-3.5-turbo") -> str:
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=model,
                messages=[
                    {"role": "system", "content": f"You are a helpful assistant that summarizes text. Keep the summary concise and under {max_length} characters if possible."},
                    {"role": "user", "content": f"Please summarize the following text:\n\n{text}"}
                ],
                max_tokens=max_length,
                temperature=0.5
            )
            return response.choices[0].message.content.strip()
        except openai.AuthenticationError:
            raise HTTPException(status_code=401, detail="Invalid API key or authentication issue with OpenAI")
        except openai.RateLimitError:
            raise HTTPException(status_code=429, detail="OpenAI API rate limit exceeded")
        except openai.APIError as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")
    
    async def stream_summary(self, text: str, max_length: Optional[int] = 200, model: str = "gpt-3.5-turbo") -> AsyncGenerator[str, None]:
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=model,
                messages=[
                    {"role": "system", "content": f"You are a helpful assistant that summarizes text. Keep the summary concise and under {max_length} characters if possible."},
                    {"role": "user", "content": f"Please summarize the following text:\n\n{text}"}
                ],
                max_tokens=max_length,
                temperature=0.5,
                stream=True
            )
            
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except openai.AuthenticationError:
            yield "error: Invalid API key or authentication issue with OpenAI"
        except openai.RateLimitError:
            yield "error: OpenAI API rate limit exceeded"
        except openai.APIError as e:
            yield f"error: OpenAI API error: {str(e)}"
        except Exception as e:
            yield f"error: Error streaming summary: {str(e)}" 