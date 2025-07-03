import os
from typing import AsyncGenerator, Optional
import openai
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
    async def generate_summary(self, text: str, max_length: Optional[int] = 200, model: str = "gpt-3.5-turbo") -> str:
        """Generate a summary of the provided text using the OpenAI API."""
        try:
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": f"You are a helpful assistant that summarizes text. Keep the summary concise and under {max_length} characters if possible."},
                    {"role": "user", "content": f"Please summarize the following text:\n\n{text}"}
                ],
                max_tokens=max_length,
                temperature=0.5
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"Error generating summary: {str(e)}")
    
    async def stream_summary(self, text: str, max_length: Optional[int] = 200, model: str = "gpt-3.5-turbo") -> AsyncGenerator[str, None]:
        """Stream a summary of the provided text using the OpenAI API."""
        try:
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
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
        except Exception as e:
            raise Exception(f"Error streaming summary: {str(e)}") 