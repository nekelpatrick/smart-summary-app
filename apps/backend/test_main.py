import pytest
from unittest.mock import patch, Mock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

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


class TestExampleEndpoint:
    def test_example(self):
        response = client.get("/example")
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert isinstance(data["text"], str)
        assert len(data["text"]) > 0
        assert "project meeting notes" in data["text"].lower()


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

    def test_validate_api_key_valid_format_success(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            True, "API key is valid")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["message"] == "API key is valid"
        assert data["provider"] == "openai"

    def test_validate_api_key_invalid_key_authentication_failed(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            False, "Invalid API key - authentication failed")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["message"] == "Invalid API key - authentication failed"
        assert data["provider"] == "openai"

    def test_validate_api_key_rate_limit_exceeded(self, mock_llm_service):
        mock_llm_service.validate_api_key.return_value = (
            False, "API key rate limit exceeded - please try again later")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["message"] == "API key rate limit exceeded - please try again later"
        assert data["provider"] == "openai"

    def test_validate_api_key_service_error(self, mock_llm_service):
        mock_llm_service.validate_api_key.side_effect = Exception(
            "Service error")

        valid_key = "sk-" + "a" * 48
        response = client.post("/validate-api-key",
                               json={"api_key": valid_key})

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "API key validation failed" in data["detail"]


class TestSummarizeEndpoint:
    def test_summarize_empty_text(self, mock_llm_service):
        response = client.post(
            "/summarize", json={"text": "", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_whitespace_only(self, mock_llm_service):
        response = client.post(
            "/summarize", json={"text": "   ", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_invalid_max_length_zero(self, mock_llm_service):
        response = client.post(
            "/summarize", json={"text": "Valid text", "max_length": 0})
        assert response.status_code == 422

    def test_summarize_invalid_max_length_negative(self, mock_llm_service):
        response = client.post(
            "/summarize", json={"text": "Valid text", "max_length": -1})
        assert response.status_code == 422

    def test_summarize_invalid_max_length_too_large(self, mock_llm_service):
        response = client.post(
            "/summarize", json={"text": "Valid text", "max_length": 1001})
        assert response.status_code == 422

    def test_summarize_text_too_long(self, mock_llm_service):
        long_text = "a" * 10001
        response = client.post(
            "/summarize", json={"text": long_text, "max_length": 100})
        assert response.status_code == 422

    def test_summarize_missing_text_field(self, mock_llm_service):
        response = client.post("/summarize", json={"max_length": 100})
        assert response.status_code == 422

    def test_summarize_missing_max_length_field(self, mock_llm_service):
        response = client.post("/summarize", json={"text": "Valid text"})
        assert response.status_code == 200

    def test_summarize_invalid_json(self, mock_llm_service):
        response = client.post("/summarize", data="invalid json")
        assert response.status_code == 422

    def test_summarize_valid_text_success(self, mock_llm_service):
        mock_llm_service.summarize.return_value = "This is a mock summary."

        text = "Test text for summarization."
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50})

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"] == "This is a mock summary."

    def test_summarize_with_custom_api_key(self, mock_llm_service):
        mock_llm_service.summarize.return_value = "This is a mock summary."

        text = "Test text for summarization."
        api_key = "sk-" + "a" * 48
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"] == "This is a mock summary."
        mock_llm_service.summarize.assert_called_once_with(text, 50, api_key)

    def test_summarize_with_invalid_api_key_format(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "invalid-key"
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 422

    def test_summarize_with_empty_api_key(self, mock_llm_service):
        text = "Test text for summarization."
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50, "api_key": ""})

        assert response.status_code == 422

    def test_summarize_service_error(self, mock_llm_service):
        mock_llm_service.summarize.side_effect = Exception("OpenAI API error")

        text = "Valid text for summarization"
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50})

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data

    def test_summarize_empty_response_from_service(self, mock_llm_service):
        mock_llm_service.summarize.return_value = ""

        text = "Valid text for summarization"
        response = client.post(
            "/summarize", json={"text": text, "max_length": 50})

        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == ""


class TestSummarizeStreamEndpoint:
    def test_summarize_stream_empty_text(self, mock_llm_service):
        response = client.post(
            "/summarize/stream", json={"text": "", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_stream_whitespace_only(self, mock_llm_service):
        response = client.post(
            "/summarize/stream", json={"text": "   ", "max_length": 100})
        assert response.status_code == 422

    def test_summarize_stream_with_custom_api_key(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "sk-" + "a" * 48
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        # Verify that summarize_stream was called with the correct arguments
        # Note: We can't easily verify the exact call args due to the async generator nature

    def test_summarize_stream_with_invalid_api_key_format(self, mock_llm_service):
        text = "Test text for summarization."
        api_key = "invalid-key"
        response = client.post(
            "/summarize/stream", json={"text": text, "max_length": 50, "api_key": api_key})

        assert response.status_code == 422


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
