import os
import json
import asyncio
from typing import AsyncGenerator, Optional, Dict, List, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib

import openai
import tiktoken
from fastapi import HTTPException
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss

load_dotenv()


@dataclass
class SummaryContext:
    """Context for summarization with optimization data"""
    text: str
    text_length: int
    estimated_tokens: int
    complexity_score: float
    domain: str
    language: str
    user_preferences: Dict[str, Any]
    cost_budget: float


@dataclass
class OptimizationResult:
    """Result of context optimization"""
    optimized_prompt: str
    expected_tokens: int
    confidence_score: float
    cost_estimate: float
    strategy_used: str


class ContextOptimizer:
    """Optimizes context and prompts for cost efficiency"""

    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')

        # Initialize FAISS index for similar text retrieval
        self.dimension = 384  # MiniLM dimension
        self.index = faiss.IndexFlatIP(self.dimension)
        self.text_cache = []

        # Cost optimization strategies
        self.strategies = {
            "compress": self._compress_strategy,
            "chunk": self._chunk_strategy,
            "template": self._template_strategy,
            "shallow_train": self._shallow_train_strategy
        }

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))

    def analyze_text_complexity(self, text: str) -> float:
        """Analyze text complexity (0-1 scale)"""
        # Simple complexity analysis based on various factors
        words = text.split()
        sentences = text.split('.')

        avg_word_length = sum(len(word)
                              for word in words) / len(words) if words else 0
        avg_sentence_length = sum(
            len(sent.split()) for sent in sentences) / len(sentences) if sentences else 0

        # Normalize complexity score
        complexity = min(1.0, (avg_word_length / 10 +
                         avg_sentence_length / 20) / 2)
        return complexity

    def detect_domain(self, text: str) -> str:
        """Detect text domain for specialized handling"""
        # Simple keyword-based domain detection
        domains = {
            "technical": ["algorithm", "system", "code", "software", "programming"],
            "business": ["revenue", "profit", "strategy", "market", "sales"],
            "academic": ["research", "study", "analysis", "methodology", "findings"],
            "news": ["reported", "according", "statement", "official", "announced"],
            "legal": ["contract", "agreement", "clause", "legal", "court"]
        }

        text_lower = text.lower()
        domain_scores = {}

        for domain, keywords in domains.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            domain_scores[domain] = score

        return max(domain_scores, key=domain_scores.get) if domain_scores else "general"

    async def find_similar_texts(self, text: str, threshold: float = 0.8) -> List[Dict]:
        """Find similar texts from cache for context reuse"""
        if not self.text_cache:
            return []

        # Encode query text
        query_embedding = self.sentence_model.encode([text])

        # Search for similar texts
        scores, indices = self.index.search(
            query_embedding, min(10, len(self.text_cache)))

        similar_texts = []
        for score, idx in zip(scores[0], indices[0]):
            if score >= threshold and idx < len(self.text_cache):
                similar_texts.append({
                    "text": self.text_cache[idx]["text"],
                    "summary": self.text_cache[idx]["summary"],
                    "similarity": float(score),
                    "strategy": self.text_cache[idx].get("strategy", "unknown")
                })

        return similar_texts

    def add_to_cache(self, text: str, summary: str, strategy: str):
        """Add successful summarization to cache"""
        embedding = self.sentence_model.encode([text])

        # Add to FAISS index
        self.index.add(embedding)

        # Add to text cache
        self.text_cache.append({
            "text": text,
            "summary": summary,
            "strategy": strategy,
            "timestamp": datetime.now()
        })

        # Limit cache size
        if len(self.text_cache) > 1000:
            # Remove oldest entries
            self.text_cache = self.text_cache[-800:]
            # Rebuild FAISS index
            embeddings = self.sentence_model.encode(
                [item["text"] for item in self.text_cache])
            self.index = faiss.IndexFlatIP(self.dimension)
            self.index.add(embeddings)

    def _compress_strategy(self, context: SummaryContext) -> OptimizationResult:
        """Compression strategy for long texts"""
        # Extract key sentences using simple scoring
        sentences = context.text.split('.')
        if len(sentences) <= 3:
            return OptimizationResult(
                optimized_prompt=f"Summarize concisely: {context.text}",
                expected_tokens=self.count_tokens(context.text) // 2,
                confidence_score=0.9,
                cost_estimate=0.001,
                strategy_used="compress"
            )

        # Score sentences by length and position
        scored_sentences = []
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                position_score = 1.0 if i < 2 or i >= len(
                    sentences) - 2 else 0.5
                length_score = min(1.0, len(sentence.split()) / 20)
                scored_sentences.append(
                    (sentence.strip(), position_score + length_score))

        # Select top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        selected_sentences = [s[0]
                              for s in scored_sentences[:min(5, len(scored_sentences))]]
        compressed_text = '. '.join(selected_sentences)

        optimized_prompt = f"Summarize this key information: {compressed_text}"

        return OptimizationResult(
            optimized_prompt=optimized_prompt,
            expected_tokens=self.count_tokens(optimized_prompt) + 100,
            confidence_score=0.8,
            cost_estimate=0.0008,
            strategy_used="compress"
        )

    def _chunk_strategy(self, context: SummaryContext) -> OptimizationResult:
        """Chunking strategy for very long texts"""
        words = context.text.split()
        chunk_size = 300  # words per chunk

        if len(words) <= chunk_size:
            return self._template_strategy(context)

        chunks = [' '.join(words[i:i + chunk_size])
                  for i in range(0, len(words), chunk_size)]
        optimized_prompt = f"Summarize these {len(chunks)} sections separately, then provide an overall summary:\n\n"

        # Limit to 3 chunks for cost control
        for i, chunk in enumerate(chunks[:3]):
            optimized_prompt += f"Section {i+1}: {chunk}\n\n"

        expected_tokens = sum(self.count_tokens(chunk)
                              for chunk in chunks[:3]) + 200

        return OptimizationResult(
            optimized_prompt=optimized_prompt,
            expected_tokens=expected_tokens,
            confidence_score=0.85,
            cost_estimate=expected_tokens * 0.000002,  # Rough OpenAI pricing
            strategy_used="chunk"
        )

    def _template_strategy(self, context: SummaryContext) -> OptimizationResult:
        """Template-based strategy using domain-specific prompts"""
        domain_templates = {
            "technical": "Summarize this technical content, focusing on key concepts, methodologies, and outcomes: {text}",
            "business": "Provide a business summary highlighting main objectives, strategies, and results: {text}",
            "academic": "Summarize this academic content, emphasizing research findings and conclusions: {text}",
            "news": "Create a news summary with key facts and developments: {text}",
            "legal": "Summarize this legal content, focusing on main clauses and implications: {text}",
            "general": "Provide a clear, concise summary of the main points: {text}"
        }

        template = domain_templates.get(
            context.domain, domain_templates["general"])
        optimized_prompt = template.format(text=context.text)

        return OptimizationResult(
            optimized_prompt=optimized_prompt,
            expected_tokens=self.count_tokens(optimized_prompt) + 150,
            confidence_score=0.9,
            cost_estimate=0.0012,
            strategy_used="template"
        )

    def _shallow_train_strategy(self, context: SummaryContext) -> OptimizationResult:
        """Shallow training strategy using few-shot examples"""
        # Use similar texts from cache as few-shot examples
        similar_texts = []
        if hasattr(self, '_cached_similar'):
            similar_texts = self._cached_similar

        if similar_texts:
            # Create few-shot prompt with examples
            examples = ""
            for example in similar_texts[:2]:  # Use top 2 similar examples
                examples += f"Text: {example['text'][:200]}...\nSummary: {example['summary']}\n\n"

            optimized_prompt = f"""Based on these examples:
{examples}
Now summarize this text: {context.text}"""

            confidence_score = 0.95
        else:
            # Fallback to template strategy
            return self._template_strategy(context)

        return OptimizationResult(
            optimized_prompt=optimized_prompt,
            expected_tokens=self.count_tokens(optimized_prompt) + 120,
            confidence_score=confidence_score,
            cost_estimate=0.0015,
            strategy_used="shallow_train"
        )

    async def optimize_context(self, context: SummaryContext) -> OptimizationResult:
        """Optimize context using the best strategy"""
        # Find similar texts for potential reuse
        similar_texts = await self.find_similar_texts(context.text)
        self._cached_similar = similar_texts

        # If we have very similar text, return cached result
        if similar_texts and similar_texts[0]["similarity"] > 0.95:
            return OptimizationResult(
                optimized_prompt="",  # No prompt needed
                expected_tokens=0,
                confidence_score=1.0,
                cost_estimate=0.0,
                strategy_used="cache_hit"
            )

        # Choose strategy based on text characteristics and budget
        if context.estimated_tokens > 2000:
            if context.cost_budget > 0.005:
                return self._chunk_strategy(context)
            else:
                return self._compress_strategy(context)
        elif similar_texts:
            return self._shallow_train_strategy(context)
        else:
            return self._template_strategy(context)


class LangGraphSummaryService:
    """Advanced summarization service using LangGraph with cost optimization"""

    def __init__(self):
        self.default_api_key = os.getenv("OPENAI_API_KEY")
        if not self.default_api_key or self.default_api_key == "your_openai_api_key_here":
            raise ValueError("Please set your OpenAI API key in the .env file")

        self.optimizer = ContextOptimizer()
        self.model_config = {
            "gpt-3.5-turbo": {"cost_per_token": 0.000002, "max_tokens": 4096},
            "gpt-4": {"cost_per_token": 0.00006, "max_tokens": 8192},
            "gpt-4-turbo": {"cost_per_token": 0.00003, "max_tokens": 128000}
        }

        # Initialize the graph
        self.graph = self._create_summary_graph()

    def _get_llm(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo") -> ChatOpenAI:
        """Get LangChain LLM instance"""
        return ChatOpenAI(
            openai_api_key=api_key or self.default_api_key,
            model_name=model,
            temperature=0.3,
            streaming=True
        )

    def _create_summary_graph(self) -> StateGraph:
        """Create LangGraph workflow for summarization"""

        def analyze_input(state: Dict[str, Any]) -> Dict[str, Any]:
            """Analyze input text and create context"""
            text = state["text"]

            context = SummaryContext(
                text=text,
                text_length=len(text),
                estimated_tokens=self.optimizer.count_tokens(text),
                complexity_score=self.optimizer.analyze_text_complexity(text),
                domain=self.optimizer.detect_domain(text),
                language="en",  # Default to English for now
                user_preferences=state.get("preferences", {}),
                cost_budget=state.get("cost_budget", 0.01)
            )

            state["context"] = context
            state["analysis_complete"] = True
            return state

        async def optimize_context(state: Dict[str, Any]) -> Dict[str, Any]:
            """Optimize context for cost efficiency"""
            context = state["context"]
            optimization = await self.optimizer.optimize_context(context)

            state["optimization"] = optimization
            state["optimization_complete"] = True
            return state

        async def check_cache(state: Dict[str, Any]) -> Dict[str, Any]:
            """Check if we can use cached results"""
            optimization = state["optimization"]

            if optimization.strategy_used == "cache_hit":
                # Use cached result
                similar_texts = self.optimizer._cached_similar
                if similar_texts:
                    state["summary"] = similar_texts[0]["summary"]
                    state["cached"] = True
                    state["cost"] = 0.0
                    return state

            state["cached"] = False
            return state

        async def generate_summary(state: Dict[str, Any]) -> Dict[str, Any]:
            """Generate summary using optimized context"""
            if state.get("cached"):
                return state

            optimization = state["optimization"]
            context = state["context"]

            # Choose model based on complexity and budget
            if context.complexity_score > 0.7 and context.cost_budget > 0.005:
                model = "gpt-4-turbo"
            elif context.estimated_tokens > 1000:
                model = "gpt-4"
            else:
                model = "gpt-3.5-turbo"

            llm = self._get_llm(state.get("api_key"), model)

            # Generate summary
            messages = [SystemMessage(
                content="You are an expert summarizer focused on clarity and conciseness.")]
            messages.append(HumanMessage(
                content=optimization.optimized_prompt))

            try:
                response = await llm.ainvoke(messages)
                summary = response.content.strip()

                # Calculate actual cost
                total_tokens = optimization.expected_tokens + \
                    self.optimizer.count_tokens(summary)
                actual_cost = total_tokens * \
                    self.model_config[model]["cost_per_token"]

                # Add to cache for future use
                self.optimizer.add_to_cache(
                    context.text,
                    summary,
                    optimization.strategy_used
                )

                state["summary"] = summary
                state["cost"] = actual_cost
                state["model_used"] = model
                state["tokens_used"] = total_tokens

            except Exception as e:
                state["error"] = str(e)

            return state

        def route_after_cache(state: Dict[str, Any]) -> str:
            """Route after cache check"""
            return "end" if state.get("cached") else "generate_summary"

        # Build the graph
        workflow = StateGraph(dict)

        # Add nodes
        workflow.add_node("analyze_input", analyze_input)
        workflow.add_node("optimize_context", optimize_context)
        workflow.add_node("check_cache", check_cache)
        workflow.add_node("generate_summary", generate_summary)

        # Add edges
        workflow.set_entry_point("analyze_input")
        workflow.add_edge("analyze_input", "optimize_context")
        workflow.add_edge("optimize_context", "check_cache")
        workflow.add_conditional_edges(
            "check_cache",
            route_after_cache,
            {
                "generate_summary": "generate_summary",
                "end": END
            }
        )
        workflow.add_edge("generate_summary", END)

        return workflow.compile()

    async def validate_api_key(self, api_key: str) -> Tuple[bool, str]:
        """Validate API key using LangChain"""
        try:
            llm = self._get_llm(api_key)
            response = await llm.ainvoke([HumanMessage(content="Test")])
            return True, "API key is valid"
        except Exception as e:
            return False, f"API key validation failed: {str(e)}"

    async def summarize(self,
                        text: str,
                        max_length: Optional[int] = 200,
                        api_key: Optional[str] = None,
                        cost_budget: float = 0.01,
                        preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Summarize text using LangGraph workflow"""

        if not text.strip():
            raise ValueError("Text cannot be empty")

        # Prepare initial state
        initial_state = {
            "text": text,
            "max_length": max_length,
            "api_key": api_key,
            "cost_budget": cost_budget,
            "preferences": preferences or {}
        }

        try:
            # Run the graph
            result = await self.graph.ainvoke(initial_state)

            if "error" in result:
                raise HTTPException(status_code=500, detail=result["error"])

            return {
                "summary": result["summary"],
                "cost": result.get("cost", 0.0),
                "model_used": result.get("model_used", "unknown"),
                "tokens_used": result.get("tokens_used", 0),
                "strategy": result.get("optimization", {}).get("strategy_used", "unknown"),
                "cached": result.get("cached", False)
            }

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Summarization failed: {str(e)}")

    async def summarize_stream(self,
                               text: str,
                               max_length: Optional[int] = 200,
                               api_key: Optional[str] = None,
                               cost_budget: float = 0.01,
                               preferences: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Stream summarization using LangGraph workflow"""

        if not text.strip():
            raise ValueError("Text cannot be empty")

        # First, run optimization phase
        context = SummaryContext(
            text=text,
            text_length=len(text),
            estimated_tokens=self.optimizer.count_tokens(text),
            complexity_score=self.optimizer.analyze_text_complexity(text),
            domain=self.optimizer.detect_domain(text),
            language="en",
            user_preferences=preferences or {},
            cost_budget=cost_budget
        )

        optimization = await self.optimizer.optimize_context(context)

        # Check for cache hit
        if optimization.strategy_used == "cache_hit":
            similar_texts = self.optimizer._cached_similar
            if similar_texts:
                summary = similar_texts[0]["summary"]
                # Stream cached result word by word
                words = summary.split()
                for word in words:
                    yield word + " "
                    # Small delay for streaming effect
                    await asyncio.sleep(0.01)
                return

        # Choose model for streaming
        if context.complexity_score > 0.7 and cost_budget > 0.005:
            model = "gpt-4-turbo"
        elif context.estimated_tokens > 1000:
            model = "gpt-4"
        else:
            model = "gpt-3.5-turbo"

        llm = self._get_llm(api_key, model)

        try:
            messages = [SystemMessage(
                content="You are an expert summarizer focused on clarity and conciseness.")]
            messages.append(HumanMessage(
                content=optimization.optimized_prompt))

            # Stream the response
            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield chunk.content

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Stream failed: {str(e)}")


# Global service instance
langgraph_service = LangGraphSummaryService()
