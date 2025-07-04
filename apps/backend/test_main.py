import pytest
from unittest.mock import patch, Mock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_llm_service():
    with patch('app.main.llm') as mock_llm:
        mock_llm.summarize = AsyncMock(return_value="Test summary")
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
        assert "urban gardening" in data["text"].lower()


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
