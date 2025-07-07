import os
import json
import asyncio
from typing import Dict, Any, Optional, AsyncGenerator, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from fastapi import HTTPException

from ..models import LLMProvider


class SimplifiedSmartSummarizer:
    """Simplified smart summarization service with multi-stage processing."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key required")

        self.llm = ChatOpenAI(
            api_key=self.api_key,
            model="gpt-3.5-turbo",
            temperature=0.1,
            max_tokens=1000
        )

    async def _analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze text to determine optimal summarization strategy."""
        word_count = len(text.split())

        analysis_prompt = f"""Analyze this text and return ONLY a JSON object:
{{
    "text_type": "meeting|article|technical|email|other",
    "complexity": "Low|Medium|High", 
    "optimal_compression": 0.15
}}

For {word_count} words, determine aggressive compression ratio (0.1-0.3) based on content density.

TEXT: {text[:800]}{"..." if len(text) > 800 else ""}"""

        try:
            response = await self.llm.ainvoke([HumanMessage(content=analysis_prompt)])
            analysis = json.loads(response.content.strip())

            # Ensure compression is aggressive enough
            if analysis.get("optimal_compression", 0.3) > 0.3:
                analysis["optimal_compression"] = 0.2

            return analysis
        except:
            return {
                "text_type": "other",
                "complexity": "Medium",
                "optimal_compression": 0.2
            }

    async def _extract_key_points(self, text: str, text_type: str, target_compression: float) -> List[str]:
        """Extract key points based on text type."""
        target_words = max(10, int(len(text.split()) * target_compression))

        # Customize extraction based on text type
        focus_map = {
            "meeting": "decisions, action items, deadlines, responsibilities",
            "article": "main arguments, evidence, conclusions",
            "technical": "core concepts, procedures, requirements",
            "email": "requests, deadlines, important information",
            "other": "main ideas, important facts, key outcomes"
        }

        focus = focus_map.get(text_type, focus_map["other"])

        extraction_prompt = f"""Extract key points from this {text_type} content.

FOCUS ON: {focus}
TARGET: {target_words} words total (be extremely selective)

Return as numbered list. Only absolutely essential information.

TEXT: {text}

KEY POINTS:"""

        try:
            response = await self.llm.ainvoke([HumanMessage(content=extraction_prompt)])

            points = []
            for line in response.content.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    point = line.split(
                        '.', 1)[-1].strip() if '.' in line else line
                    point = point.lstrip('- •').strip()
                    if point:
                        points.append(point)

            return points[:8]  # Limit to top 8 points
        except:
            return ["Unable to extract key points"]

    async def _create_final_summary(self, key_points: List[str], target_words: int, text_type: str) -> str:
        """Create final compressed summary."""
        points_text = '\n'.join(f"• {point}" for point in key_points)

        summary_prompt = f"""Transform these points into an extremely concise summary.

REQUIREMENTS:
- Exactly {target_words} words (strict limit)
- Use active voice, eliminate filler words
- Focus on {text_type} priorities
- One flowing paragraph, no bullet points

POINTS:
{points_text}

SUMMARY ({target_words} words):"""

        try:
            response = await self.llm.ainvoke([HumanMessage(content=summary_prompt)])
            return response.content.strip()
        except:
            return " ".join(key_points[:3])  # Fallback

    async def _calculate_quality_score(self, original: str, summary: str) -> float:
        """Calculate summary quality score."""
        original_words = len(original.split())
        summary_words = len(summary.split())
        compression_ratio = 1 - (summary_words / original_words)

        # Quality heuristics
        if compression_ratio > 0.8:  # Excellent compression
            return min(9.0, 7.0 + (compression_ratio - 0.8) * 10)
        elif compression_ratio > 0.6:  # Good compression
            return 6.0 + (compression_ratio - 0.6) * 5
        else:  # Poor compression
            return max(3.0, compression_ratio * 10)

    async def summarize(self, text: str, max_length: int = 200) -> Dict[str, Any]:
        """Run the complete smart summarization pipeline."""
        if not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            # Stage 1: Analyze text
            analysis = await self._analyze_text(text)

            # Stage 2: Calculate target compression
            original_words = len(text.split())
            target_compression = analysis["optimal_compression"]
            target_words = max(
                15, min(max_length // 5, int(original_words * target_compression)))

            # Stage 3: Extract key points
            key_points = await self._extract_key_points(text, analysis["text_type"], target_compression)

            # Stage 4: Create final summary
            final_summary = await self._create_final_summary(key_points, target_words, analysis["text_type"])

            # Stage 5: Calculate metrics
            summary_words = len(final_summary.split())
            compression_achieved = 1 - (summary_words / original_words)
            quality_score = await self._calculate_quality_score(text, final_summary)

            return {
                "summary": final_summary,
                "analysis": {
                    "text_type": analysis["text_type"],
                    "compression_ratio": compression_achieved,
                    "quality_score": quality_score,
                    "original_words": original_words,
                    "summary_words": summary_words,
                    "target_compression": target_compression
                },
                "key_points": key_points,
                "errors": []
            }

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Smart summarization failed: {str(e)}")

    async def summarize_stream(self, text: str, max_length: int = 200) -> AsyncGenerator[str, None]:
        """Stream the summarization process."""
        try:
            yield f"data: {{\"stage\": \"analyzing\", \"message\": \"Analyzing content type...\"}}\n\n"

            # Stage 1: Analysis
            analysis = await self._analyze_text(text)
            yield f"data: {{\"stage\": \"analysis_complete\", \"text_type\": \"{analysis['text_type']}\", \"target_compression\": {analysis['optimal_compression']}}}\n\n"

            # Stage 2: Key points
            yield f"data: {{\"stage\": \"extracting\", \"message\": \"Extracting key information...\"}}\n\n"
            original_words = len(text.split())
            target_compression = analysis["optimal_compression"]
            target_words = max(
                15, min(max_length // 5, int(original_words * target_compression)))

            key_points = await self._extract_key_points(text, analysis["text_type"], target_compression)
            yield f"data: {{\"stage\": \"points_extracted\", \"count\": {len(key_points)}}}\n\n"

            # Stage 3: Final summary
            yield f"data: {{\"stage\": \"summarizing\", \"message\": \"Creating compressed summary...\"}}\n\n"
            final_summary = await self._create_final_summary(key_points, target_words, analysis["text_type"])

            # Stream the summary word by word
            words = final_summary.split()
            for i, word in enumerate(words):
                yield f"data: {word}{' ' if i < len(words) - 1 else ''}\n\n"
                await asyncio.sleep(0.05)

            # Final metrics
            summary_words = len(final_summary.split())
            compression_achieved = 1 - (summary_words / original_words)
            quality_score = await self._calculate_quality_score(text, final_summary)

            yield f"data: {{\"stage\": \"complete\", \"compression_achieved\": {compression_achieved:.2f}, \"quality_score\": {quality_score:.1f}}}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {{\"stage\": \"error\", \"message\": \"{str(e)}\"}}\n\n"
            yield "data: [DONE]\n\n"


# Global instance
_simplified_smart_summarizer = None


def get_simplified_smart_summarizer(api_key: Optional[str] = None) -> SimplifiedSmartSummarizer:
    """Get or create a SimplifiedSmartSummarizer instance."""
    global _simplified_smart_summarizer
    if _simplified_smart_summarizer is None or api_key:
        _simplified_smart_summarizer = SimplifiedSmartSummarizer(api_key)
    return _simplified_smart_summarizer
