import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException

from app.services.langgraph_service import (
    LangGraphSummaryService,
    ContextOptimizer,
    SummaryContext,
    OptimizationResult,
    langgraph_service
)


class TestContextOptimizer:
    """Test the ContextOptimizer class"""

    def setup_method(self):
        """Setup test fixtures"""
        self.optimizer = ContextOptimizer()
        self.sample_text = "This is a sample text for testing purposes. It contains multiple sentences and should be analyzed properly."
        self.long_text = "This is a very long text. " * 100  # 500 words
        self.short_text = "Short text."
        self.technical_text = "The algorithm uses machine learning to optimize the system performance through software engineering best practices."
        self.business_text = "Our revenue increased by 25% this quarter due to strategic market expansion and improved sales performance."

    def test_count_tokens(self):
        """Test token counting functionality"""
        count = self.optimizer.count_tokens(self.sample_text)
        assert isinstance(count, int)
        assert count > 0
        # Should be more than word count
        assert count > len(self.sample_text.split())

    def test_analyze_text_complexity(self):
        """Test text complexity analysis"""
        complexity = self.optimizer.analyze_text_complexity(self.sample_text)
        assert isinstance(complexity, float)
        assert 0 <= complexity <= 1

        # Short text should have lower complexity
        short_complexity = self.optimizer.analyze_text_complexity(
            self.short_text)
        assert short_complexity < complexity

        # Technical text should have higher complexity
        tech_complexity = self.optimizer.analyze_text_complexity(
            self.technical_text)
        assert tech_complexity >= complexity

    def test_detect_domain(self):
        """Test domain detection"""
        assert self.optimizer.detect_domain(self.technical_text) == "technical"
        assert self.optimizer.detect_domain(self.business_text) == "business"
        assert self.optimizer.detect_domain(
            "Just some regular text") == "general"

    def test_add_to_cache(self):
        """Test adding items to cache"""
        initial_size = len(self.optimizer.text_cache)
        self.optimizer.add_to_cache(
            self.sample_text, "Sample summary", "template")

        assert len(self.optimizer.text_cache) == initial_size + 1
        assert self.optimizer.text_cache[-1]["text"] == self.sample_text
        assert self.optimizer.text_cache[-1]["summary"] == "Sample summary"
        assert self.optimizer.text_cache[-1]["strategy"] == "template"

    @pytest.mark.asyncio
    async def test_find_similar_texts(self):
        """Test finding similar texts in cache"""
        # Add some texts to cache
        self.optimizer.add_to_cache("Test text one", "Summary one", "template")
        self.optimizer.add_to_cache("Test text two", "Summary two", "compress")

        # Find similar texts
        similar = await self.optimizer.find_similar_texts("Test text one")
        assert isinstance(similar, list)

        # Should find the exact match
        if similar:
            assert similar[0]["text"] == "Test text one"
            assert similar[0]["summary"] == "Summary one"

    def test_compress_strategy(self):
        """Test compression strategy"""
        context = SummaryContext(
            text=self.long_text,
            text_length=len(self.long_text),
            estimated_tokens=self.optimizer.count_tokens(self.long_text),
            complexity_score=0.5,
            domain="general",
            language="en",
            user_preferences={},
            cost_budget=0.01
        )

        result = self.optimizer._compress_strategy(context)
        assert isinstance(result, OptimizationResult)
        assert result.strategy_used == "compress"
        assert result.expected_tokens < context.estimated_tokens
        assert result.confidence_score > 0

    def test_chunk_strategy(self):
        """Test chunking strategy"""
        context = SummaryContext(
            text=self.long_text,
            text_length=len(self.long_text),
            estimated_tokens=self.optimizer.count_tokens(self.long_text),
            complexity_score=0.5,
            domain="general",
            language="en",
            user_preferences={},
            cost_budget=0.01
        )

        result = self.optimizer._chunk_strategy(context)
        assert isinstance(result, OptimizationResult)
        assert result.strategy_used == "chunk"
        assert result.expected_tokens > 0
        assert result.confidence_score > 0

    def test_template_strategy(self):
        """Test template strategy"""
        context = SummaryContext(
            text=self.technical_text,
            text_length=len(self.technical_text),
            estimated_tokens=self.optimizer.count_tokens(self.technical_text),
            complexity_score=0.5,
            domain="technical",
            language="en",
            user_preferences={},
            cost_budget=0.01
        )

        result = self.optimizer._template_strategy(context)
        assert isinstance(result, OptimizationResult)
        assert result.strategy_used == "template"
        assert "technical" in result.optimized_prompt.lower()
        assert result.confidence_score > 0

    def test_shallow_train_strategy(self):
        """Test shallow training strategy"""
        # Add similar text to cache first
        self.optimizer.add_to_cache(
            self.technical_text, "Technical summary", "template")
        self.optimizer._cached_similar = [
            {"text": self.technical_text, "summary": "Technical summary"}]

        context = SummaryContext(
            text=self.technical_text,
            text_length=len(self.technical_text),
            estimated_tokens=self.optimizer.count_tokens(self.technical_text),
            complexity_score=0.5,
            domain="technical",
            language="en",
            user_preferences={},
            cost_budget=0.01
        )

        result = self.optimizer._shallow_train_strategy(context)
        assert isinstance(result, OptimizationResult)
        assert result.strategy_used == "shallow_train"
        assert result.confidence_score > 0

    @pytest.mark.asyncio
    async def test_optimize_context(self):
        """Test context optimization"""
        context = SummaryContext(
            text=self.sample_text,
            text_length=len(self.sample_text),
            estimated_tokens=self.optimizer.count_tokens(self.sample_text),
            complexity_score=0.5,
            domain="general",
            language="en",
            user_preferences={},
            cost_budget=0.01
        )

        result = await self.optimizer.optimize_context(context)
        assert isinstance(result, OptimizationResult)
        assert result.strategy_used in [
            "compress", "chunk", "template", "shallow_train", "cache_hit"]
        assert result.confidence_score > 0
        assert result.cost_estimate >= 0


class TestLangGraphSummaryService:
    """Test the LangGraphSummaryService class"""

    def setup_method(self):
        """Setup test fixtures"""
        self.service = langgraph_service
        self.sample_text = "This is a sample text for testing the LangGraph service."

    @pytest.mark.asyncio
    async def test_validate_api_key_success(self):
        """Test successful API key validation"""
        with patch.object(self.service, '_get_llm') as mock_get_llm:
            mock_llm = AsyncMock()
            mock_response = AsyncMock()
            mock_response.content = "Test response"
            mock_llm.ainvoke.return_value = mock_response
            mock_get_llm.return_value = mock_llm

            is_valid, message = await self.service.validate_api_key("test-key")

            assert is_valid is True
            assert "valid" in message.lower()
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_api_key_failure(self):
        """Test API key validation failure"""
        with patch.object(self.service, '_get_llm') as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.ainvoke.side_effect = Exception("Invalid API key")
            mock_get_llm.return_value = mock_llm

            is_valid, message = await self.service.validate_api_key("invalid-key")

            assert is_valid is False
            assert "failed" in message.lower()

    @pytest.mark.asyncio
    async def test_summarize_success(self):
        """Test successful summarization"""
        with patch.object(self.service, 'graph') as mock_graph:
            mock_result = {
                "summary": "This is a test summary",
                "cost": 0.002,
                "model_used": "gpt-3.5-turbo",
                "tokens_used": 150,
                "optimization": {"strategy_used": "template"},
                "cached": False
            }
            mock_graph.ainvoke.return_value = mock_result

            result = await self.service.summarize(self.sample_text)

            assert isinstance(result, dict)
            assert "summary" in result
            assert "cost" in result
            assert "model_used" in result
            assert "tokens_used" in result
            assert "strategy" in result
            assert "cached" in result

            assert result["summary"] == "This is a test summary"
            assert result["cost"] == 0.002
            assert result["model_used"] == "gpt-3.5-turbo"
            assert result["tokens_used"] == 150
            assert result["strategy"] == "template"
            assert result["cached"] is False

    @pytest.mark.asyncio
    async def test_summarize_empty_text(self):
        """Test summarization with empty text"""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await self.service.summarize("")

    @pytest.mark.asyncio
    async def test_summarize_with_error(self):
        """Test summarization with error in graph"""
        with patch.object(self.service, 'graph') as mock_graph:
            mock_result = {"error": "Processing failed"}
            mock_graph.ainvoke.return_value = mock_result

            with pytest.raises(HTTPException) as exc_info:
                await self.service.summarize(self.sample_text)

            assert exc_info.value.status_code == 500
            assert "Processing failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_summarize_with_custom_parameters(self):
        """Test summarization with custom parameters"""
        with patch.object(self.service, 'graph') as mock_graph:
            mock_result = {
                "summary": "Custom summary",
                "cost": 0.005,
                "model_used": "gpt-4",
                "tokens_used": 300,
                "optimization": {"strategy_used": "chunk"},
                "cached": False
            }
            mock_graph.ainvoke.return_value = mock_result

            result = await self.service.summarize(
                text=self.sample_text,
                max_length=300,
                api_key="custom-key",
                cost_budget=0.02,
                preferences={"style": "technical"}
            )

            assert result["summary"] == "Custom summary"
            assert result["cost"] == 0.005
            assert result["model_used"] == "gpt-4"
            assert result["strategy"] == "chunk"

            # Check that parameters were passed to graph
            mock_graph.ainvoke.assert_called_once()
            call_args = mock_graph.ainvoke.call_args[0][0]
            assert call_args["text"] == self.sample_text
            assert call_args["max_length"] == 300
            assert call_args["api_key"] == "custom-key"
            assert call_args["cost_budget"] == 0.02
            assert call_args["preferences"] == {"style": "technical"}

    @pytest.mark.asyncio
    async def test_summarize_stream_success(self):
        """Test successful streaming summarization"""
        with patch.object(self.service, 'optimizer') as mock_optimizer:
            with patch.object(self.service, '_get_llm') as mock_get_llm:
                # Setup optimizer mock
                mock_context = SummaryContext(
                    text=self.sample_text,
                    text_length=len(self.sample_text),
                    estimated_tokens=50,
                    complexity_score=0.3,
                    domain="general",
                    language="en",
                    user_preferences={},
                    cost_budget=0.01
                )
                mock_optimizer.count_tokens.return_value = 50
                mock_optimizer.analyze_text_complexity.return_value = 0.3
                mock_optimizer.detect_domain.return_value = "general"
                mock_optimizer.optimize_context.return_value = OptimizationResult(
                    optimized_prompt="Test prompt",
                    expected_tokens=50,
                    confidence_score=0.8,
                    cost_estimate=0.001,
                    strategy_used="template"
                )

                # Setup LLM mock
                mock_llm = AsyncMock()

                async def mock_stream():
                    chunks = ["This ", "is ", "a ", "test ", "summary."]
                    for chunk in chunks:
                        mock_chunk = Mock()
                        mock_chunk.content = chunk
                        yield mock_chunk

                mock_llm.astream.return_value = mock_stream()
                mock_get_llm.return_value = mock_llm

                # Collect streaming results
                chunks = []
                async for chunk in self.service.summarize_stream(self.sample_text):
                    chunks.append(chunk)

                # Verify results
                assert len(chunks) > 0
                full_text = "".join(chunks)
                assert "This is a test summary." in full_text
                mock_llm.astream.assert_called_once()

    @pytest.mark.asyncio
    async def test_summarize_stream_empty_text(self):
        """Test streaming with empty text"""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            async for chunk in self.service.summarize_stream(""):
                pass

    @pytest.mark.asyncio
    async def test_summarize_stream_cache_hit(self):
        """Test streaming with cache hit"""
        with patch.object(self.service, 'optimizer') as mock_optimizer:
            # Setup cache hit scenario
            mock_optimizer.count_tokens.return_value = 50
            mock_optimizer.analyze_text_complexity.return_value = 0.3
            mock_optimizer.detect_domain.return_value = "general"
            mock_optimizer.optimize_context.return_value = OptimizationResult(
                optimized_prompt="",
                expected_tokens=0,
                confidence_score=1.0,
                cost_estimate=0.0,
                strategy_used="cache_hit"
            )
            mock_optimizer._cached_similar = [{"summary": "Cached summary"}]

            # Collect streaming results
            chunks = []
            async for chunk in self.service.summarize_stream(self.sample_text):
                chunks.append(chunk)

            # Verify cached results are streamed
            assert len(chunks) > 0
            full_text = "".join(chunks)
            assert "Cached summary" in full_text


class TestIntegration:
    """Integration tests for the complete system"""

    @pytest.mark.asyncio
    async def test_end_to_end_summarization(self):
        """Test complete end-to-end summarization flow"""
        # This test would require actual API keys and is more suitable for
        # integration testing environment
        pass

    def test_service_initialization(self):
        """Test service initialization"""
        assert langgraph_service is not None
        assert isinstance(langgraph_service, LangGraphSummaryService)
        assert langgraph_service.optimizer is not None
        assert langgraph_service.graph is not None

    def test_model_configuration(self):
        """Test model configuration"""
        assert "gpt-3.5-turbo" in langgraph_service.model_config
        assert "gpt-4" in langgraph_service.model_config
        assert "gpt-4-turbo" in langgraph_service.model_config

        for model, config in langgraph_service.model_config.items():
            assert "cost_per_token" in config
            assert "max_tokens" in config
            assert isinstance(config["cost_per_token"], float)
            assert isinstance(config["max_tokens"], int)

    def test_optimization_strategies(self):
        """Test optimization strategies are properly configured"""
        optimizer = ContextOptimizer()
        assert "compress" in optimizer.strategies
        assert "chunk" in optimizer.strategies
        assert "template" in optimizer.strategies
        assert "shallow_train" in optimizer.strategies

        # Test that all strategies are callable
        for strategy_name, strategy_func in optimizer.strategies.items():
            assert callable(strategy_func)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
