import os
from typing import Dict, Any, Optional, AsyncGenerator, List
from datetime import datetime
import asyncio

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage
from typing import TypedDict
from fastapi import HTTPException

from ..models import LLMProvider


class TextAnalysis(TypedDict):
    """Analysis of input text to determine optimal summarization strategy."""
    text_type: str
    complexity: str
    key_elements: List[str]
    optimal_compression: float
    estimated_tokens: int


class SummaryState(TypedDict):
    """State object for the LangGraph summarization pipeline."""
    original_text: str
    max_length: int
    analysis: Optional[TextAnalysis]
    key_points: List[str]
    intermediate_summary: str
    final_summary: str
    compression_achieved: float
    quality_score: float
    token_usage: Dict[str, int]
    errors: List[str]


class SmartSummarizer:
    """LangGraph-powered intelligent summarization service."""

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

        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for intelligent summarization."""
        workflow = StateGraph(SummaryState)

        # Define the workflow nodes
        workflow.add_node("analyze_text", self._analyze_text)
        workflow.add_node("extract_key_points", self._extract_key_points)
        workflow.add_node("create_intermediate_summary",
                          self._create_intermediate_summary)
        workflow.add_node("optimize_final_summary",
                          self._optimize_final_summary)
        workflow.add_node("validate_quality", self._validate_quality)

        # Define the workflow edges
        workflow.set_entry_point("analyze_text")
        workflow.add_edge("analyze_text", "extract_key_points")
        workflow.add_edge("extract_key_points", "create_intermediate_summary")
        workflow.add_edge("create_intermediate_summary",
                          "optimize_final_summary")
        workflow.add_edge("optimize_final_summary", "validate_quality")
        workflow.add_edge("validate_quality", END)

        return workflow.compile()

    async def _analyze_text(self, state: SummaryState) -> SummaryState:
        """Analyze the input text to determine optimal summarization strategy."""
        try:
            word_count = len(state.original_text.split())

            analysis_prompt = f"""Analyze this text and provide a JSON response with the following structure:
{{
    "text_type": "meeting|article|technical|email|other",
    "complexity": "Low|Medium|High",
    "key_elements": ["element1", "element2", ...],
    "optimal_compression": 0.15,
    "estimated_tokens": {word_count * 1.3}
}}

Determine the optimal compression ratio based on:
- Text type (meetings need action items, articles need main points)
- Content density (how much can be safely removed)
- Information hierarchy (what's essential vs nice-to-have)

For {word_count} words, aim for aggressive compression while preserving core value.

TEXT TO ANALYZE:
{state.original_text[:1000]}{"..." if len(state.original_text) > 1000 else ""}

ANALYSIS:"""

            response = await self.llm.ainvoke([HumanMessage(content=analysis_prompt)])

            # Parse the JSON response
            import json
            try:
                analysis_data = json.loads(response.content)
                state["analysis"] = analysis_data
            except json.JSONDecodeError:
                # Fallback analysis
                state["analysis"] = {
                    "text_type": "other",
                    "complexity": "Medium",
                    "key_elements": ["main content"],
                    "optimal_compression": 0.3,
                    "estimated_tokens": word_count
                }

        except Exception as e:
            state["errors"].append(f"Analysis failed: {str(e)}")
            # Provide default analysis
            word_count = len(state["original_text"].split())
            state["analysis"] = {
                "text_type": "other",
                "complexity": "Medium",
                "key_elements": ["content"],
                "optimal_compression": 0.25,
                "estimated_tokens": word_count
            }

        return state

    async def _extract_key_points(self, state: SummaryState) -> SummaryState:
        """Extract key points based on text type analysis."""
        try:
            analysis = state.analysis

            # Customize extraction based on text type
            if analysis.text_type == "meeting":
                extraction_focus = "decisions made, action items, deadlines, responsibilities, key discussions"
            elif analysis.text_type == "article":
                extraction_focus = "main arguments, evidence, conclusions, key insights"
            elif analysis.text_type == "technical":
                extraction_focus = "core concepts, procedures, requirements, specifications"
            elif analysis.text_type == "email":
                extraction_focus = "requests, deadlines, important information, next steps"
            else:
                extraction_focus = "main ideas, important facts, key outcomes"

            extraction_prompt = f"""Extract the most important points from this {analysis.text_type} content.

FOCUS ON: {extraction_focus}

Return as a numbered list of key points. Be ruthless - only include what's absolutely essential.
Target: {int(len(state.original_text.split()) * analysis.optimal_compression)} words maximum.

TEXT:
{state.original_text}

KEY POINTS:"""

            response = await self.llm.ainvoke([HumanMessage(content=extraction_prompt)])

            # Parse the response into individual points
            points = []
            for line in response.content.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    # Clean up the point
                    point = line.split(
                        '.', 1)[-1].strip() if '.' in line else line
                    point = point.lstrip('- •').strip()
                    if point:
                        points.append(point)

            state.key_points = points

        except Exception as e:
            state.errors.append(f"Key point extraction failed: {str(e)}")
            state.key_points = ["Unable to extract key points"]

        return state

    async def _create_intermediate_summary(self, state: SummaryState) -> SummaryState:
        """Create an intermediate summary from key points."""
        try:
            analysis = state.analysis
            target_words = min(state.max_length, int(
                len(state.original_text.split()) * analysis.optimal_compression))

            key_points_text = '\n'.join(
                f"• {point}" for point in state.key_points)

            summary_prompt = f"""Transform these key points into a coherent, flowing summary.

REQUIREMENTS:
- Exactly {target_words} words (strict limit)
- Use active voice and clear language
- Connect ideas smoothly without bullet points
- Focus on {analysis.text_type} content priorities
- Eliminate any redundancy

KEY POINTS:
{key_points_text}

FLOWING SUMMARY ({target_words} words):"""

            response = await self.llm.ainvoke([HumanMessage(content=summary_prompt)])
            state.intermediate_summary = response.content.strip()

        except Exception as e:
            state.errors.append(f"Intermediate summary failed: {str(e)}")
            state.intermediate_summary = " ".join(state.key_points)

        return state

    async def _optimize_final_summary(self, state: SummaryState) -> SummaryState:
        """Optimize the final summary for maximum compression and clarity."""
        try:
            analysis = state.analysis
            current_words = len(state.intermediate_summary.split())
            target_words = min(
                state.max_length // 5, int(len(state.original_text.split()) * analysis.optimal_compression))

            if current_words <= target_words:
                state.final_summary = state.intermediate_summary
                return state

            optimization_prompt = f"""Compress this summary to exactly {target_words} words while preserving all essential information.

OPTIMIZATION RULES:
- Remove filler words and redundancy
- Use precise, concise language
- Maintain all critical information
- Ensure readability and flow

CURRENT SUMMARY ({current_words} words):
{state.intermediate_summary}

OPTIMIZED SUMMARY ({target_words} words):"""

            response = await self.llm.ainvoke([HumanMessage(content=optimization_prompt)])
            state.final_summary = response.content.strip()

        except Exception as e:
            state.errors.append(f"Final optimization failed: {str(e)}")
            state.final_summary = state.intermediate_summary

        return state

    async def _validate_quality(self, state: SummaryState) -> SummaryState:
        """Validate summary quality and calculate metrics."""
        try:
            original_words = len(state.original_text.split())
            summary_words = len(state.final_summary.split())

            # Calculate compression ratio
            state.compression_achieved = 1 - (summary_words / original_words)

            # Quality assessment
            validation_prompt = f"""Rate this summary quality on a scale of 1-10 considering:

ORIGINAL ({original_words} words):
{state.original_text[:500]}...

SUMMARY ({summary_words} words):
{state.final_summary}

Criteria:
- Information preservation (most important)
- Clarity and readability
- Compression efficiency
- Logical flow

Return only a number between 1-10:"""

            response = await self.llm.ainvoke([HumanMessage(content=validation_prompt)])

            try:
                state.quality_score = float(response.content.strip())
            except ValueError:
                state.quality_score = 7.0  # Default if parsing fails

        except Exception as e:
            state.errors.append(f"Quality validation failed: {str(e)}")
            original_words = len(state.original_text.split())
            summary_words = len(state.final_summary.split())
            state.compression_achieved = 1 - (summary_words / original_words)
            state.quality_score = 6.0

        return state

    async def summarize(self, text: str, max_length: int = 200) -> Dict[str, Any]:
        """Run the complete summarization pipeline."""
        if not text.strip():
            raise ValueError("Text cannot be empty")

        # Initialize state
        initial_state = SummaryState(
            original_text=text,
            max_length=max_length
        )

        # Run the graph
        result = await self.graph.ainvoke(initial_state)

        return {
            "summary": result.final_summary,
            "analysis": {
                "text_type": result.analysis.text_type if result.analysis else "unknown",
                "compression_ratio": result.compression_achieved,
                "quality_score": result.quality_score,
                "original_words": len(text.split()),
                "summary_words": len(result.final_summary.split()),
            },
            "key_points": result.key_points,
            "errors": result.errors
        }

    async def summarize_stream(self, text: str, max_length: int = 200) -> AsyncGenerator[str, None]:
        """Stream the summarization process with progress updates."""
        if not text.strip():
            raise ValueError("Text cannot be empty")

        yield f"data: {{\"stage\": \"analyzing\", \"message\": \"Analyzing text type and complexity...\"}}\n\n"

        initial_state = SummaryState(
            original_text=text,
            max_length=max_length
        )

        # Run analysis
        state = await self._analyze_text(initial_state)
        yield f"data: {{\"stage\": \"analysis_complete\", \"text_type\": \"{state.analysis.text_type}\", \"compression_target\": {state.analysis.optimal_compression}}}\n\n"

        # Extract key points
        yield f"data: {{\"stage\": \"extracting\", \"message\": \"Extracting key information...\"}}\n\n"
        state = await self._extract_key_points(state)
        yield f"data: {{\"stage\": \"points_extracted\", \"count\": {len(state.key_points)}}}\n\n"

        # Create intermediate summary
        yield f"data: {{\"stage\": \"summarizing\", \"message\": \"Creating initial summary...\"}}\n\n"
        state = await self._create_intermediate_summary(state)

        # Optimize final summary
        yield f"data: {{\"stage\": \"optimizing\", \"message\": \"Optimizing for compression...\"}}\n\n"
        state = await self._optimize_final_summary(state)

        # Stream the final summary word by word
        words = state.final_summary.split()
        for i, word in enumerate(words):
            yield f"data: {word}{' ' if i < len(words) - 1 else ''}\n\n"
            await asyncio.sleep(0.05)  # Small delay for streaming effect

        # Final validation
        state = await self._validate_quality(state)

        yield f"data: {{\"stage\": \"complete\", \"compression_achieved\": {state.compression_achieved:.2f}, \"quality_score\": {state.quality_score}}}\n\n"
        yield "data: [DONE]\n\n"


# Global instance
_smart_summarizer = None


def get_smart_summarizer(api_key: Optional[str] = None) -> SmartSummarizer:
    """Get or create a SmartSummarizer instance."""
    global _smart_summarizer
    if _smart_summarizer is None or api_key:
        _smart_summarizer = SmartSummarizer(api_key)
    return _smart_summarizer
