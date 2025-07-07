import pytest
from unittest.mock import patch, Mock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.models import LLMProvider, ProviderStatus

client = TestClient(app)


@pytest.fixture
def mock_llm_service():
    with patch('app.main.llm') as mock_llm:
        mock_llm.summarize = AsyncMock(return_value="Test summary")

        # Create a proper async generator mock for streaming
        async def mock_stream(*args, **kwargs):
            yield "Test"
            yield " summary"
            yield " content"

        mock_llm.summarize_stream = mock_stream
        mock_llm.validate_api_key = AsyncMock(
            return_value=(True, "API key is valid"))
        yield mock_llm


class TestHealthEndpoint:
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestRootEndpoint:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "Smart Summary API" in data["message"]
        assert "version" in data


class TestProvidersEndpoint:
    def test_get_providers(self):
        response = client.get("/providers")
        assert response.status_code == 200
        data = response.json()

        assert "providers" in data
        assert "default_provider" in data
        assert isinstance(data["providers"], list)
        assert len(data["providers"]) > 0
        assert data["default_provider"] == LLMProvider.OPENAI

        # Check that OpenAI is in the list and enabled
        openai_provider = next(
            (p for p in data["providers"] if p["id"] == LLMProvider.OPENAI), None)
        assert openai_provider is not None
        assert openai_provider["enabled"] is True
        assert openai_provider["status"] == ProviderStatus.ENABLED
        assert openai_provider["name"] == "OpenAI"
        assert openai_provider["key_prefix"] == "sk-"

        # Check that other providers are disabled
        for provider in data["providers"]:
            if provider["id"] != LLMProvider.OPENAI:
                assert provider["enabled"] is False
                assert provider["status"] in [
                    ProviderStatus.DISABLED, ProviderStatus.COMING_SOON]


class TestExampleEndpoint:
    def test_example(self):
        response = client.get("/example")
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert isinstance(data["text"], str)
        assert len(data["text"]) > 0
        assert "go-horse programming" in data["text"].lower()


class TestApiKeyValidationEndpoint:
    def test_validate_api_key_missing_key(self):
        response = client.post("/validate-api-key", json={})
        assert response.status_code == 422

    def test_validate_api_key_empty_key(self):
        response = client.post("/validate-api-key", json={"api_key": ""})
        assert response.status_code == 422

    def test_validate_api_key_whitespace_only(self):
        response = client.post("/validate-api-key", json={"api_key": "   "})
        assert response.status_code == 422

    def test_validate_api_key_invalid_format(self):
        response = client.post("/validate-api-key",
                               json={"api_key": "invalid-key"})
        assert response.status_code == 422

    def test_validate_api_key_invalid_format_too_short(self):
        response = client.post("/validate-api-key", json={"api_key": "sk-abc"})
        assert response.status_code == 422

    def test_validate_api_key_missing_provider(self):
        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key})
        assert response.status_code == 422

    def test_validate_api_key_openai_provider_success(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            True, "API key is valid")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": LLMProvider.OPENAI})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["message"] == "API key is valid"
        assert data["provider"] == LLMProvider.OPENAI

    def test_validate_api_key_disabled_provider(self):
        valid_key = "sk-ant-" + "a" * 95  # Anthropic format
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": LLMProvider.ANTHROPIC})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "not currently supported" in data["message"]
        assert data["provider"] == LLMProvider.ANTHROPIC

    def test_validate_api_key_wrong_format_for_provider(self):
        # OpenAI key format for Anthropic provider
        openai_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": openai_key, "provider": LLMProvider.ANTHROPIC})

        assert response.status_code == 422

    def test_validate_api_key_anthropic_format_validation(self):
        # Correct Anthropic format but provider not supported
        anthropic_key = "sk-ant-" + "a" * 95
        response = client.post("/validate-api-key",
                               json={"api_key": anthropic_key, "provider": LLMProvider.ANTHROPIC})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "not currently supported" in data["message"]

    def test_validate_api_key_google_format_validation(self):
        # Google format
        google_key = "a" * 39
        response = client.post("/validate-api-key",
                               json={"api_key": google_key, "provider": LLMProvider.GOOGLE})

        assert response.status_code == 422  # Provider validation fails first

    def test_validate_api_key_invalid_provider(self):
        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": "invalid_provider"})

        assert response.status_code == 422

    def test_validate_api_key_invalid_key_authentication_failed(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            False, "Invalid API key - authentication failed")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": LLMProvider.OPENAI})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["message"] == "Invalid API key - authentication failed"
        assert data["provider"] == LLMProvider.OPENAI

    def test_validate_api_key_rate_limit_exceeded(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            False, "API key rate limit exceeded - please try again later")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": LLMProvider.OPENAI})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["message"] == "API key rate limit exceeded - please try again later"
        assert data["provider"] == LLMProvider.OPENAI

    def test_validate_api_key_service_error(self, mock_llm_service):
        mock_llm_service.validate_api_key.side_effect = Exception(
            "Service error")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key, "provider": LLMProvider.OPENAI})

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "API key validation failed" in data["detail"]


class TestSummarizeStreamEndpoint:
    def test_summarize_stream_empty_text(self, mock_llm_service):
        response = client.post(
            "/summarize/stream", json={"text": "", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_stream_whitespace_only(self, mock_llm_service):
        response = client.post(
            "/summarize/stream", json={"text": "   ", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_stream_default_provider(self, mock_llm_service):
        text = "Test text for summarization."
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50})

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_summarize_stream_openai_provider_explicit(self, mock_llm_service):
        text = "Test text for summarization."
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "provider": LLMProvider.OPENAI})

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_summarize_stream_disabled_provider(self, mock_llm_service):
        text = "Test text for summarization."
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "provider": LLMProvider.ANTHROPIC})

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not currently supported" in data["detail"]

    def test_summarize_stream_with_custom_api_key(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "sk-" + "a" * 48
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_summarize_stream_with_custom_api_key_and_provider(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "sk-" + "a" * 48
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": api_key, "provider": LLMProvider.OPENAI})

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_summarize_stream_with_invalid_api_key_format(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "invalid-key"
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 422

    def test_summarize_stream_with_empty_api_key(self, mock_llm_service):
        text = "Test text for summarization."
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": ""})

        assert response.status_code == 422

    def test_summarize_stream_service_error(self, mock_llm_service):
        mock_llm_service.summarize_stream.side_effect = Exception(
            "OpenAI API error")

        text = "Valid text for summarization"
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50})

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data


class TestCORSHeaders:
    def test_cors_preflight_request(self):
        response = client.options("/summarize", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        })
        assert response.status_code == 200

    def test_cors_headers_in_response(self):
        response = client.get(
            "/health", headers={"Origin": "http://localhost:3000"})
        headers = {h.lower(): v for h, v in response.headers.items()}
        assert "access-control-allow-origin" in headers
        assert headers["access-control-allow-origin"] == "*"
