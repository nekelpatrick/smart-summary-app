import pytest
from unittest.mock import Mock, patch, AsyncMock
import os
from app.services.llm_service import LLMService


@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-3.5-turbo")


@patch('openai.AsyncOpenAI')
async def test_summarize_success(mock_openai_class, mock_env):
    # Setup mock
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "This is a test summary."
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    result = await llm_service.summarize("Test text for summarization.", 50)

    assert result == "This is a test summary."
    mock_client.chat.completions.create.assert_called_once()

    call_args = mock_client.chat.completions.create.call_args
    assert call_args[1]['model'] == "gpt-3.5-turbo"
    assert call_args[1]['max_tokens'] == 100
    assert "summarize" in call_args[1]['messages'][0]['content'].lower()


@patch('openai.AsyncOpenAI')
async def test_summarize_api_error(mock_openai_class, mock_env):
    # Setup mock to raise an exception
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    llm_service = LLMService()

    # Test that HTTPException is raised
    with pytest.raises(Exception) as exc_info:
        await llm_service.summarize("Test text", 50)

    assert "Summarization failed" in str(exc_info.value)


@patch('openai.AsyncOpenAI')
async def test_summarize_empty_response(mock_openai_class, mock_env):
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = ""
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    result = await llm_service.summarize("Test text", 50)

    assert result == ""


@patch('openai.AsyncOpenAI')
async def test_summarize_different_max_tokens(mock_openai_class, mock_env):
    # Setup mock
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Summary"
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    # Test with different max_tokens
    await llm_service.summarize("Test text", 100)

    call_args = mock_client.chat.completions.create.call_args
    assert call_args[1]['max_tokens'] == 200  # 100 * 2


@patch('openai.AsyncOpenAI')
async def test_summarize_prompt_contains_text(mock_openai_class, mock_env):
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Summary"
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    test_text = "This is my specific test text to summarize"
    await llm_service.summarize(test_text, 50)

    call_args = mock_client.chat.completions.create.call_args
    user_message = call_args[1]['messages'][0]['content']
    assert test_text in user_message
