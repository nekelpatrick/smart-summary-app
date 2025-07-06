import pytest
from unittest.mock import Mock, patch, AsyncMock
import os
import openai
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
async def test_summarize_with_custom_api_key(mock_openai_class, mock_env):
    # Setup mock
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "This is a test summary."
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    custom_api_key = "sk-custom-key-123"
    result = await llm_service.summarize("Test text for summarization.", 50, custom_api_key)

    assert result == "This is a test summary."
    # Verify that a new client was created with the custom API key
    mock_openai_class.assert_called_with(api_key=custom_api_key)


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
async def test_summarize_authentication_error(mock_openai_class, mock_env):
    # Setup mock to raise an authentication error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = openai.AuthenticationError(
        "Invalid API key")

    llm_service = LLMService()

    # Test that HTTPException is raised with proper status code
    with pytest.raises(Exception) as exc_info:
        await llm_service.summarize("Test text", 50)

    assert "Invalid API key" in str(exc_info.value)


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


@patch('openai.AsyncOpenAI')
async def test_validate_api_key_success(mock_openai_class, mock_env):
    # Setup mock
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Test"
    mock_client.chat.completions.create.return_value = mock_response

    llm_service = LLMService()

    test_api_key = "sk-test-key-123"
    is_valid, message = await llm_service.validate_api_key(test_api_key)

    assert is_valid is True
    assert message == "API key is valid"
    # Verify that a new client was created with the test API key
    mock_openai_class.assert_called_with(api_key=test_api_key)


@patch('openai.AsyncOpenAI')
async def test_validate_api_key_authentication_error(mock_openai_class, mock_env):
    # Setup mock to raise authentication error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = openai.AuthenticationError(
        "Invalid API key")

    llm_service = LLMService()

    test_api_key = "sk-invalid-key-123"
    is_valid, message = await llm_service.validate_api_key(test_api_key)

    assert is_valid is False
    assert message == "Invalid API key - authentication failed"


@patch('openai.AsyncOpenAI')
async def test_validate_api_key_rate_limit_error(mock_openai_class, mock_env):
    # Setup mock to raise rate limit error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = openai.RateLimitError(
        "Rate limit exceeded")

    llm_service = LLMService()

    test_api_key = "sk-rate-limited-key-123"
    is_valid, message = await llm_service.validate_api_key(test_api_key)

    assert is_valid is False
    assert message == "API key rate limit exceeded - please try again later"


@patch('openai.AsyncOpenAI')
async def test_validate_api_key_permission_denied_error(mock_openai_class, mock_env):
    # Setup mock to raise permission denied error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = openai.PermissionDeniedError(
        "Permission denied")

    llm_service = LLMService()

    test_api_key = "sk-no-permission-key-123"
    is_valid, message = await llm_service.validate_api_key(test_api_key)

    assert is_valid is False
    assert message == "API key does not have the required permissions"


@patch('openai.AsyncOpenAI')
async def test_validate_api_key_general_error(mock_openai_class, mock_env):
    # Setup mock to raise general error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception(
        "General error")

    llm_service = LLMService()

    test_api_key = "sk-error-key-123"
    is_valid, message = await llm_service.validate_api_key(test_api_key)

    assert is_valid is False
    assert "API key validation failed: General error" in message


@patch('openai.AsyncOpenAI')
async def test_summarize_stream_with_custom_api_key(mock_openai_class, mock_env):
    # Setup mock
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    # Mock the streaming response
    async def mock_stream():
        mock_chunk1 = Mock()
        mock_chunk1.choices = [Mock()]
        mock_chunk1.choices[0].delta.content = "This is"
        yield mock_chunk1

        mock_chunk2 = Mock()
        mock_chunk2.choices = [Mock()]
        mock_chunk2.choices[0].delta.content = " a test"
        yield mock_chunk2

        mock_chunk3 = Mock()
        mock_chunk3.choices = [Mock()]
        mock_chunk3.choices[0].delta.content = " summary."
        yield mock_chunk3

    mock_client.chat.completions.create.return_value = mock_stream()

    llm_service = LLMService()

    custom_api_key = "sk-custom-stream-key-123"
    result_generator = llm_service.summarize_stream(
        "Test text for summarization.", 50, custom_api_key)

    # Collect all chunks
    chunks = []
    async for chunk in result_generator:
        chunks.append(chunk)

    assert chunks == ["This is", " a test", " summary."]
    # Verify that a new client was created with the custom API key
    mock_openai_class.assert_called_with(api_key=custom_api_key)


@patch('openai.AsyncOpenAI')
async def test_summarize_stream_authentication_error(mock_openai_class, mock_env):
    # Setup mock to raise authentication error
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = openai.AuthenticationError(
        "Invalid API key")

    llm_service = LLMService()

    # Test that HTTPException is raised with proper status code
    with pytest.raises(Exception) as exc_info:
        result_generator = llm_service.summarize_stream("Test text", 50)
        async for chunk in result_generator:
            pass

    assert "Invalid API key" in str(exc_info.value)
