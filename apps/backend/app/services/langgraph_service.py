import os
import json
import asyncio
from typing import AsyncGenerator, Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import hashlib
import logging
import re

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
from openai import AsyncOpenAI
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class TextContext:
    text: str
    length: int
    complexity: float
    domain: str
    similar_texts: List[str] = field(default_factory=list)
    budget: float = 1.0


@dataclass
class OptimizationResult:
    strategy: str
    original_tokens: int
    optimized_tokens: int
    cost_estimate: float
    confidence: float
    optimized_prompt: str
    similar_examples: List[str] = field(default_factory=list)


@dataclass
class ProcessingState:
    context: TextContext
    optimization: Optional[OptimizationResult] = None
    final_summary: str = ""
    processing_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class SmartLangGraphService:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384
        self.index = faiss.IndexFlatIP(self.dimension)
        self.text_cache: Dict[str, str] = {}
        self.embeddings_cache: List[np.ndarray] = []

        self.strategies = {
            'cache_hit': self._cache_strategy,
            'compress': self._compression_strategy,
            'chunk': self._chunking_strategy,
            'template': self._template_strategy,
            'shallow_train': self._shallow_training_strategy,
        }

    def analyze_complexity(self, text: str) -> float:
        factors = {
            'sentence_length': min(len(text.split('.')) / len(text.split()) * 10, 1.0),
            'word_variety': len(set(text.lower().split())) / len(text.split()) if text.split() else 0,
            'technical_terms': len(re.findall(r'\b[A-Z]{2,}\b|\b\w+ly\b|\b\w+tion\b', text)) / len(text.split()) if text.split() else 0,
            'punctuation_density': sum(1 for c in text if c in '.,;:!?') / len(text) if text else 0,
        }

        complexity = sum(factors.values()) / len(factors)
        return min(max(complexity, 0.0), 1.0)

    def detect_domain(self, text: str) -> str:
        domain_keywords = {
            'technical': ['algorithm', 'software', 'system', 'technology', 'programming', 'API', 'database'],
            'business': ['revenue', 'profit', 'market', 'strategy', 'company', 'sales', 'customer'],
            'academic': ['research', 'study', 'analysis', 'methodology', 'hypothesis', 'conclusion'],
            'legal': ['contract', 'agreement', 'clause', 'legal', 'court', 'law', 'regulation'],
            'medical': ['patient', 'treatment', 'diagnosis', 'medical', 'health', 'clinical'],
            'news': ['reported', 'according', 'said', 'announced', 'breaking', 'update']
        }

        text_lower = text.lower()
        domain_scores = {}

        for domain, keywords in domain_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            domain_scores[domain] = score

        return max(domain_scores, key=domain_scores.get) if domain_scores else 'general'

    def find_similar_texts(self, query_text: str, top_k: int = 3) -> List[str]:
        if len(self.embeddings_cache) == 0:
            return []

        query_embedding = self.model.encode([query_text])

        distances, indices = self.index.search(
            query_embedding, min(top_k, len(self.embeddings_cache)))

        similar_texts = []
        for idx in indices[0]:
            if idx < len(list(self.text_cache.keys())):
                similar_texts.append(list(self.text_cache.keys())[idx])

        return similar_texts

    def add_to_cache(self, text: str, summary: str):
        text_embedding = self.model.encode([text])

        self.index.add(text_embedding)
        self.embeddings_cache.append(text_embedding[0])
        self.text_cache[text] = summary

        if len(self.text_cache) > 100:
            oldest_keys = list(self.text_cache.keys())[:20]
            for key in oldest_keys:
                del self.text_cache[key]

            self.embeddings_cache = self.embeddings_cache[20:]
            self.index = faiss.IndexFlatIP(self.dimension)
            if self.embeddings_cache:
                self.index.add(np.array(self.embeddings_cache))

    def _extract_key_sentences(self, text: str, max_sentences: int = 5) -> str:
        sentences = text.split('. ')
        if len(sentences) <= max_sentences:
            return text

        sentence_scores = []
        for i, sentence in enumerate(sentences):
            score = len(sentence.split())
            if i == 0 or i == len(sentences) - 1:
                score *= 1.5
            if any(word in sentence.lower() for word in ['important', 'key', 'main', 'significant']):
                score *= 1.3
            sentence_scores.append((score, sentence))

        sentence_scores.sort(reverse=True)

        top_sentences = [sent for _, sent in sentence_scores[:max_sentences]]

        return '. '.join(top_sentences)

    def _compression_strategy(self, context: TextContext) -> OptimizationResult:
        compressed_text = self._extract_key_sentences(context.text)
        original_tokens = self.count_tokens(context.text)
        optimized_tokens = self.count_tokens(compressed_text)

        return OptimizationResult(
            strategy="compress",
            original_tokens=original_tokens,
            optimized_tokens=optimized_tokens,
            cost_estimate=optimized_tokens * 0.000002,
            confidence=0.8,
            optimized_prompt=f"Summarize this compressed text: {compressed_text}"
        )

    def _chunking_strategy(self, context: TextContext) -> OptimizationResult:
        words = context.text.split()
        chunk_size = 300
        chunks = []

        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)

        if len(chunks) > 3:
            chunks = chunks[:3]

        combined_text = ' '.join(chunks)
        expected_tokens = self.count_tokens(combined_text)

        return OptimizationResult(
            strategy="chunk",
            original_tokens=self.count_tokens(context.text),
            optimized_tokens=expected_tokens,
            cost_estimate=expected_tokens * 0.000002,
            confidence=0.9,
            optimized_prompt=f"Summarize these key sections: {combined_text}"
        )

    def _template_strategy(self, context: TextContext) -> OptimizationResult:
        domain_templates = {
            'technical': "Provide a technical summary focusing on: methods, results, implications.",
            'business': "Provide a business summary focusing on: objectives, metrics, outcomes.",
            'academic': "Provide an academic summary focusing on: research question, methodology, findings.",
            'legal': "Provide a legal summary focusing on: key provisions, obligations, implications.",
            'medical': "Provide a medical summary focusing on: condition, treatment, outcomes.",
            'news': "Provide a news summary focusing on: who, what, when, where, why."
        }

        template = domain_templates.get(
            context.domain, "Provide a comprehensive summary.")
        optimized_prompt = f"{template}\n\nText: {context.text}"

        return OptimizationResult(
            strategy="template",
            original_tokens=self.count_tokens(context.text),
            optimized_tokens=self.count_tokens(optimized_prompt),
            cost_estimate=self.count_tokens(optimized_prompt) * 0.000002,
            confidence=0.7,
            optimized_prompt=optimized_prompt
        )

    def _shallow_training_strategy(self, context: TextContext) -> OptimizationResult:
        similar_texts = self.find_similar_texts(context.text, top_k=2)

        if similar_texts:
            examples_prompt = "Based on these similar examples:\n"
            for i, similar_text in enumerate(similar_texts, 1):
                cached_summary = self.text_cache.get(similar_text, "")
                examples_prompt += f"Example {i}: {similar_text[:200]}...\nSummary: {cached_summary}\n\n"

            optimized_prompt = f"{examples_prompt}Now summarize: {context.text}"
        else:
            optimized_prompt = f"Summarize the following text: {context.text}"

        return OptimizationResult(
            strategy="shallow_train",
            original_tokens=self.count_tokens(context.text),
            optimized_tokens=self.count_tokens(optimized_prompt),
            cost_estimate=self.count_tokens(optimized_prompt) * 0.000002,
            confidence=0.6,
            optimized_prompt=optimized_prompt,
            similar_examples=similar_texts
        )

    def _cache_strategy(self, context: TextContext) -> OptimizationResult:
        similar_texts = self.find_similar_texts(context.text, top_k=1)

        if similar_texts and similar_texts[0] in self.text_cache:
            cached_summary = self.text_cache[similar_texts[0]]

            return OptimizationResult(
                strategy="cache_hit",
                original_tokens=self.count_tokens(context.text),
                optimized_tokens=0,
                cost_estimate=0.0,
                confidence=1.0,
                optimized_prompt="",
                similar_examples=[cached_summary]
            )

        return self._compression_strategy(context)

    def choose_strategy(self, context: TextContext) -> str:
        similar_texts = self.find_similar_texts(context.text)
        if similar_texts and similar_texts[0] in self.text_cache:
            return 'cache_hit'

        if context.length > 2000:
            return 'chunk'
        elif context.complexity > 0.7:
            return 'compress'
        elif context.domain != 'general':
            return 'template'
        else:
            return 'shallow_train'

    def count_tokens(self, text: str) -> int:
        return len(text.split())

    def create_graph(self) -> StateGraph:
        graph = StateGraph(ProcessingState)

        def analyze_node(state: ProcessingState) -> ProcessingState:
            return state

        def optimize_node(state: ProcessingState) -> ProcessingState:
            strategy_name = self.choose_strategy(state.context)
            strategy_func = self.strategies[strategy_name]
            state.optimization = strategy_func(state.context)
            return state

        def summarize_node(state: ProcessingState) -> ProcessingState:
            return state

        graph.add_node("analyze", analyze_node)
        graph.add_node("optimize", optimize_node)
        graph.add_node("summarize", summarize_node)

        graph.add_edge("analyze", "optimize")
        graph.add_edge("optimize", "summarize")
        graph.add_edge("summarize", END)

        graph.set_entry_point("analyze")

        return graph.compile()

    async def process_with_langgraph(
        self,
        text: str,
        max_length: int = 200,
        api_key: Optional[str] = None,
        budget: float = 1.0
    ) -> Dict[str, Any]:

        context = TextContext(
            text=text,
            length=len(text.split()),
            complexity=self.analyze_complexity(text),
            domain=self.detect_domain(text),
            budget=budget
        )

        initial_state = ProcessingState(
            context=context,
            metadata={
                "timestamp": datetime.now().isoformat(),
                "max_length": max_length,
                "has_api_key": api_key is not None,
                "budget": budget,
                "domain": context.domain,
                "complexity": context.complexity,
                "length": context.length,
                "language": "en",
            }
        )

        graph = self.create_graph()

        final_state = await graph.ainvoke(initial_state)

        return {
            "summary": final_state.final_summary,
            "metadata": final_state.metadata,
            "optimization": {
                "strategy": final_state.optimization.strategy if final_state.optimization else "none",
                "cost_saved": 0.0,
                "tokens_saved": 0
            }
        }

    async def process_with_streaming(
        self,
        text: str,
        max_length: int = 200,
        api_key: Optional[str] = None,
        budget: float = 1.0
    ) -> AsyncGenerator[str, None]:

        context = TextContext(
            text=text,
            length=len(text.split()),
            complexity=self.analyze_complexity(text),
            domain=self.detect_domain(text),
            budget=budget
        )

        strategy_name = self.choose_strategy(context)
        optimization = self.strategies[strategy_name](context)

        if strategy_name == 'cache_hit' and optimization.similar_examples:
            cached_summary = optimization.similar_examples[0]
            words = cached_summary.split()
            for i, word in enumerate(words):
                yield f"data: {word}"
                if i < len(words) - 1:
                    yield f"data: "
                await asyncio.sleep(0.05)
            return

        model = "gpt-3.5-turbo"
        if context.complexity > 0.8 and budget > 0.5:
            model = "gpt-4"
        elif context.length > 1000 and budget > 0.3:
            model = "gpt-3.5-turbo-16k"

        client = AsyncOpenAI(api_key=api_key) if api_key else AsyncOpenAI()

        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": optimization.optimized_prompt}],
                max_tokens=max_length * 2,
                temperature=0.7,
                stream=True
            )

            full_summary = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_summary += content
                    yield f"data: {content}"

            self.add_to_cache(text, full_summary)

        except Exception as e:
            yield f"data: Error: {str(e)}"


langgraph_service = SmartLangGraphService()


async def test_all_strategies():
    service = SmartLangGraphService()
    test_text = "This is a test document for validating optimization strategies."

    context = TextContext(
        text=test_text,
        length=len(test_text.split()),
        complexity=0.5,
        domain="general"
    )

    results = {}
    for strategy_name, strategy_func in service.strategies.items():
        try:
            result = strategy_func(context)
            results[strategy_name] = result
            print(f"{strategy_name}: {result.confidence:.2f} confidence")
        except Exception as e:
            print(f"{strategy_name} failed: {e}")

    return results
